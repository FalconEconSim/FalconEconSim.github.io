# rag-chatbot (CI ingest)

This folder holds **only** what the GitHub Action needs to keep the course
chatbot's search index in sync with the site:

- `ingest.py` — crawls/embeds the site's page text into the Pinecone `ec224`
  index. In CI it runs with `--local .` so it embeds the HTML that was just
  pushed (no waiting on the Pages redeploy).
- `requirements.txt` — the two Python deps it needs.

**What the Action does:** on every push to `main` that touches an `.html`
file, `.github/workflows/embed-site.yml` re-embeds the site pages so the live
chatbot answers from the latest content. See that workflow file for details.

**What it does NOT touch:** the private instructor-textbook vectors
(`textbook-*` ids). Those are embedded from PDFs that are deliberately kept out
of this public repo, so they must still be refreshed by running the local
`ingest_pdfs.py` (in the private working copy) when the textbook changes. The
site ids and `textbook-*` ids never collide, and this script only *upserts*
(never deletes), so the Action leaves the textbook vectors alone.

> Do not add secrets here. The Action reads `GEMINI_API_KEY` and
> `PINECONE_API_KEY` from GitHub repository **Secrets**, never from a file.
