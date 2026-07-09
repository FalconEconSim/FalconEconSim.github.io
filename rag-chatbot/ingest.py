#!/usr/bin/env python3
"""
EC224 RAG ingest — run once locally.

Crawls https://falconeconsim.github.io, extracts meaningful page text (skipping
nav/footer/script/etc.), chunks it (~500 words, 50-word overlap), embeds each
chunk with Google text-embedding-004, and upserts the vectors + {text,url,title}
metadata into the Pinecone index `ec224`.

Secrets are read from the environment (or a local .env file) — never hardcode them:
    GEMINI_API_KEY, PINECONE_API_KEY

Usage:
    pip install -r requirements.txt
    # put your keys in .env (see .env.example), then:
    python ingest.py
"""

import os
import re
import sys
import time
import json
import hashlib
from collections import deque
from urllib.parse import urljoin, urldefrag, urlparse

import requests
from bs4 import BeautifulSoup

# ─────────────────────────── config ───────────────────────────
BASE_URL       = "https://falconeconsim.github.io/"
ALLOWED_HOST   = "falconeconsim.github.io"
PINECONE_HOST  = "https://ec224-rfj22rt.svc.aped-4627-b74a.pinecone.io"
PINECONE_INDEX = "ec224"          # informational; data-plane calls use the host
NAMESPACE      = ""               # "" = default namespace
EMBED_MODEL    = "gemini-embedding-001"   # 768-dim output (see EMBED_DIM); matches the index
EMBED_DIM      = 768

CHUNK_WORDS    = 500
CHUNK_OVERLAP  = 50
MAX_PAGES      = 200              # safety cap
REQUEST_PAUSE  = 0.3             # politeness between page fetches (seconds)
UPSERT_BATCH   = 100

# Pages whose path matches any of these are skipped (dev / experimental / non-content).
EXCLUDE_PATTERNS = [
    "dev.html", "-dev.html", "testing.html", "notebooklm-dev.html",
]
# Only follow links ending in these (plus directory URLs). External links are ignored.
HTML_SUFFIXES = (".html", "/")

GEMINI_API_KEY   = None  # filled from env in main()
PINECONE_API_KEY = None

HEADERS_HTML = {"User-Agent": "ec224-rag-ingest/1.0 (+course site indexer)"}


# ─────────────────────── tiny .env loader (no dep) ───────────────────────
def load_dotenv(path=".env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# ─────────────────────────── crawling ───────────────────────────
def normalize(url):
    url, _ = urldefrag(url)            # drop #fragment
    if url.endswith("index.html"):
        url = url[: -len("index.html")]
    return url


def is_crawlable(url):
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return False
    if p.netloc != ALLOWED_HOST:
        return False
    path = p.path.lower()
    if any(pat in path for pat in EXCLUDE_PATTERNS):
        return False
    # follow .html pages and directory roots only (skip .png/.pdf/.mp4/.css/.js …)
    if path.endswith("/") or path == "":
        return True
    return path.endswith(".html")


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS_HTML, timeout=20)
    except requests.RequestException as e:
        print(f"    ! fetch error: {e}")
        return None
    if r.status_code != 200:
        print(f"    ! HTTP {r.status_code}")
        return None
    ctype = r.headers.get("Content-Type", "")
    if "text/html" not in ctype:
        return None
    return r.text


def extract(html):
    """Return (title, clean_text)."""
    soup = BeautifulSoup(html, "html.parser")

    # drop non-content elements entirely
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header", "iframe", "svg"]):
        tag.decompose()
    # drop elements by class/id that are chrome, not content
    CHROME = ["top-bar", "left-nav", "sidebar", "breadcrumb", "dev-banner",
              "hub-footer", "site-footer", "footer", "nav", "skip-link"]
    for el in soup.find_all(attrs={"class": True}):
        if el.attrs is None:          # already removed as a descendant of a decomposed node
            continue
        cls = " ".join(el.get("class") or []).lower()
        if any(c in cls for c in CHROME):
            el.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)

    root = soup.find("main") or soup.body or soup
    text = root.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return title, text


def crawl():
    """BFS the site; return list of {url, title, text}."""
    seen, queue, pages = set(), deque([normalize(BASE_URL)]), []
    while queue and len(pages) < MAX_PAGES:
        url = queue.popleft()
        if url in seen:
            continue
        seen.add(url)
        print(f"[crawl] {url}")
        html = fetch(url)
        time.sleep(REQUEST_PAUSE)
        if not html:
            continue

        title, text = extract(html)
        if len(text.split()) >= 30:          # skip near-empty pages
            pages.append({"url": url, "title": title, "text": text})
            print(f"    + {len(text.split())} words  |  {title[:60]}")
        else:
            print(f"    - skipped (only {len(text.split())} words of content)")

        # enqueue same-site links
        for a in BeautifulSoup(html, "html.parser").find_all("a", href=True):
            link = normalize(urljoin(url, a["href"]))
            if is_crawlable(link) and link not in seen:
                queue.append(link)

    print(f"\n[crawl] done — {len(pages)} content pages\n")
    return pages


def path_to_url(rel_path):
    """Map a repo-relative HTML path to its live URL under BASE_URL.
    e.g. 'index.html' -> BASE_URL ; 'week2.html' -> BASE_URL+'week2.html'."""
    rel = rel_path.replace(os.sep, "/").lstrip("./")
    return normalize(urljoin(BASE_URL, rel))


def crawl_local(root):
    """Read the repo's own *.html from disk instead of crawling over HTTP.

    Used by CI so we embed exactly what was just pushed — no waiting for the
    GitHub Pages redeploy, no stale-content race. Applies the SAME exclude
    filters as the live crawl so the embedded set matches production."""
    pages = []
    for dirpath, dirnames, filenames in os.walk(root):
        # never descend into VCS / tooling / asset dirs
        dirnames[:] = [d for d in dirnames if d not in
                       (".git", ".github", "node_modules", "__pycache__", "assets", "media", "review")]
        for fn in sorted(filenames):
            if not fn.lower().endswith(".html"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            url = path_to_url(rel)
            if not is_crawlable(url):          # honor EXCLUDE_PATTERNS / dev pages
                print(f"[local] skip (excluded)  {rel}")
                continue
            with open(full, "r", encoding="utf-8") as f:
                html = f.read()
            title, text = extract(html)
            if len(text.split()) >= 30:
                pages.append({"url": url, "title": title, "text": text})
                print(f"[local] + {len(text.split()):5d} words  {rel}  ->  {url}")
            else:
                print(f"[local] - skipped (only {len(text.split())} words)  {rel}")
    print(f"\n[local] done — {len(pages)} content pages from {root}\n")
    return pages


# ─────────────────────────── chunking ───────────────────────────
def chunk_words(text, size=CHUNK_WORDS, overlap=CHUNK_OVERLAP):
    words, chunks, i = text.split(), [], 0
    step = max(1, size - overlap)
    while i < len(words):
        chunks.append(" ".join(words[i: i + size]))
        if i + size >= len(words):
            break
        i += step
    return chunks


def build_chunks(pages):
    out = []
    for pg in pages:
        for idx, ch in enumerate(chunk_words(pg["text"])):
            slug = re.sub(r"[^a-z0-9]+", "-", pg["url"].lower()).strip("-")
            vid = f"{slug}-{idx}"
            if len(vid) > 100:               # Pinecone id length safety
                vid = hashlib.md5(pg["url"].encode()).hexdigest() + f"-{idx}"
            out.append({
                "id": vid,
                "text": ch,
                "url": pg["url"],
                "title": pg["title"],
                "chunk": idx,
            })
    print(f"[chunk] {len(out)} chunks from {len(pages)} pages\n")
    return out


# ─────────────────────────── embedding ───────────────────────────
def embed(text, task_type="RETRIEVAL_DOCUMENT", title=None, retries=4):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{EMBED_MODEL}:embedContent?key={GEMINI_API_KEY}")
    body = {
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": task_type,
        "outputDimensionality": EMBED_DIM,   # truncate to 768 to match the Pinecone index
    }
    if title:
        body["title"] = title
    for attempt in range(retries):
        r = requests.post(url, json=body, timeout=30)
        if r.status_code == 200:
            return r.json()["embedding"]["values"]
        if r.status_code in (429, 500, 503):
            wait = 2 ** attempt
            print(f"    … embed {r.status_code}, retry in {wait}s")
            time.sleep(wait)
            continue
        raise RuntimeError(f"Embed failed {r.status_code}: {r.text[:200]}")
    raise RuntimeError("Embed failed after retries")


# ─────────────────────────── pinecone upsert ───────────────────────────
def upsert(vectors):
    url = f"{PINECONE_HOST}/vectors/upsert"
    headers = {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json",
        "X-Pinecone-API-Version": "2024-10",
    }
    body = {"vectors": vectors}
    if NAMESPACE:
        body["namespace"] = NAMESPACE
    r = requests.post(url, headers=headers, json=body, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Upsert failed {r.status_code}: {r.text[:300]}")
    return r.json()


# ─────────────────────────── main ───────────────────────────
def main():
    global GEMINI_API_KEY, PINECONE_API_KEY
    load_dotenv()

    # ---- args: --local [DIR] embeds files on disk; --dry stops after crawl ----
    argv = sys.argv[1:]
    dry = "--dry" in argv
    local_dir = None
    if "--local" in argv:
        i = argv.index("--local")
        local_dir = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("-") else "."
    elif os.environ.get("INGEST_LOCAL_DIR"):
        local_dir = os.environ["INGEST_LOCAL_DIR"]

    # --dry only crawls/enumerates, so it needs no API keys.
    if not dry:
        GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY")
        PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
        if not GEMINI_API_KEY or not PINECONE_API_KEY:
            sys.exit("ERROR: set GEMINI_API_KEY and PINECONE_API_KEY (env or .env file).")

    pages = crawl_local(local_dir) if local_dir else crawl()
    if dry:
        print(f"[dry] would embed+upsert {len(pages)} pages "
              f"({sum(len(p['text'].split()) for p in pages)} words total). Exiting (no API calls).")
        return
    if not pages:
        sys.exit("No pages crawled — check the base URL / network.")
    chunks = build_chunks(pages)

    print("[embed+upsert] starting…")
    batch, done = [], 0
    for i, c in enumerate(chunks):
        values = embed(c["text"], "RETRIEVAL_DOCUMENT", title=c["title"])
        batch.append({
            "id": c["id"],
            "values": values,
            "metadata": {"text": c["text"], "url": c["url"], "title": c["title"], "chunk": c["chunk"]},
        })
        print(f"  embedded {i + 1}/{len(chunks)}  ({c['url']})")
        time.sleep(0.1)                      # gentle on the rate limit
        if len(batch) >= UPSERT_BATCH:
            upsert(batch); done += len(batch)
            print(f"  ↑ upserted {done}/{len(chunks)}")
            batch = []
    if batch:
        upsert(batch); done += len(batch)
        print(f"  ↑ upserted {done}/{len(chunks)}")

    print(f"\n✅ Done. {done} vectors in index '{PINECONE_INDEX}'"
          f"{(' namespace ' + NAMESPACE) if NAMESPACE else ''}.")


if __name__ == "__main__":
    main()
