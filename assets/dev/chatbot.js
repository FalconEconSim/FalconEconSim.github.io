/* ============================================================================
 * EC224 course chatbot — shared dev module.
 *
 * window.EC224Bot:
 *   .ask(workerUrl, question)        -> Promise<{answer, answered, sources, matches}>
 *   .locateInFrame(frame, chunkText) -> bool   (scroll+highlight a passage; same-origin only)
 *   .prettyLabel(url)                -> "Week 3 · demand"
 *   .mountCompact(rootEl, opts)      -> builds the compact widget (chat + "show on page" lightbox)
 *
 * The live-preview trick: this script is served from falconeconsim.github.io and so are
 * the course pages, so an <iframe> of a course page is SAME-ORIGIN — which lets us reach
 * into it with JS to scroll to, and highlight, the exact sentence the answer came from.
 * (Off the live origin, e.g. file://, that's blocked; we fall back to a plain link.)
 * ==========================================================================*/
(function () {
  "use strict";

  var DEFAULT_WORKER = "https://ec224-chatbot.zachtwinship.workers.dev/";

  var LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">' +
    '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/>' +
    '<path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
  var BOOK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
    '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19h14"/></svg>';

  // ---- API call ------------------------------------------------------------
  async function ask(workerUrl, question) {
    var res = await fetch(workerUrl || DEFAULT_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    });
    var data = await res.json();
    if (!res.ok && !data.answer) throw new Error(data.error || ("HTTP " + res.status));
    // tolerate the old response shape (no `answered` field)
    if (typeof data.answered === "undefined") data.answered = !!(data.sources && data.sources.length);
    if (!data.matches) {
      data.matches = (data.sources || []).map(function (u) { return { url: u, title: u, text: "" }; });
    }
    return data;
  }

  // ---- pretty source labels ------------------------------------------------
  function prettyLabel(url) {
    var path = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/\.html$/, "");
    if (!path || path === "index") return "Home";
    var m = path.match(/^week(\d+)(?:-(.*))?$/);
    if (m) {
      var kind = { "": "overview", "viz": "visualizations", "viz-claude-dev": "viz (Claude)",
        "viz-dev": "viz (Gemini)", "practice": "practice", "slides": "slides",
        "videos": "videos", "flashcards": "flashcards" }[m[2] || ""] || (m[2] || "");
      return "Week " + m[1] + (kind ? " · " + kind : "");
    }
    return path;
  }

  // ---- locate + highlight a passage inside a same-origin iframe -------------
  function injectFrameStyles(doc) {
    if (doc.getElementById("ec224-hl-style")) return;
    var s = doc.createElement("style");
    s.id = "ec224-hl-style";
    s.textContent =
      ".ec224-hl{background:#fde68a !important;box-shadow:0 0 0 4px #fde68a;border-radius:3px;" +
      "transition:background .4s;} ::selection{background:#fde68a;color:#1a1a1a;}";
    (doc.head || doc.documentElement).appendChild(s);
  }

  function candidatePhrases(chunkText) {
    var words = String(chunkText || "").replace(/\s+/g, " ").trim().split(" ");
    var out = [];
    [11, 8, 6, 5].forEach(function (len) {
      if (words.length < len) return;
      var step = Math.max(1, Math.floor(len / 2));
      for (var i = 0; i + len <= words.length; i += step) {
        var p = words.slice(i, i + len).join(" ");
        if (p.length >= 14) out.push(p);
      }
    });
    return out;
  }

  // Returns true if it found + highlighted the passage; false if not found.
  // Throws on cross-origin (caller should treat as "preview unavailable").
  function locateInFrame(frame, chunkText) {
    var win = frame.contentWindow;
    var doc = frame.contentDocument || (win && win.document);
    if (!win || !doc) throw new Error("no frame document");
    injectFrameStyles(doc); // will throw SecurityError if cross-origin

    if (!win.find) return false; // window.find unsupported
    var phrases = candidatePhrases(chunkText);
    for (var i = 0; i < phrases.length; i++) {
      try {
        win.getSelection().removeAllRanges();
        // find(text, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog)
        if (win.find(phrases[i], false, false, true)) {
          highlightSelection(win, doc);
          return true;
        }
      } catch (e) { /* try next phrase */ }
    }
    return false;
  }

  function highlightSelection(win, doc) {
    var sel = win.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var node = range.startContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    try {
      var mark = doc.createElement("span");
      mark.className = "ec224-hl";
      range.surroundContents(mark); // works when the range is inside one text node
      el = mark;
      sel.removeAllRanges();
    } catch (e) { /* multi-node range: keep the native selection highlight */ }
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---- compact embeddable widget ------------------------------------------
  var CSS_INJECTED = false;
  function injectWidgetCss() {
    if (CSS_INJECTED) return; CSS_INJECTED = true;
    var css =
".ecbot{--ec:#1a56db;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1a1a1a;" +
"border:1px solid #e4e4e4;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);max-width:600px;}" +
".ecbot-head{padding:.8rem 1.05rem;border-bottom:1px solid #eee;font-weight:600;font-size:.96rem;display:flex;align-items:center;gap:.5rem;}" +
".ecbot-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex:0 0 auto;}" +
".ecbot-sub{margin-left:auto;font-weight:400;font-size:.72rem;color:#8a8a8a;}" +
".ecbot-log{height:330px;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.65rem;background:#fafafa;}" +
".ecbot-msg{padding:.6rem .85rem;border-radius:12px;font-size:.9rem;line-height:1.5;max-width:90%;white-space:pre-wrap;word-wrap:break-word;}" +
".ecbot-msg.user{align-self:flex-end;background:var(--ec);color:#fff;border-bottom-right-radius:4px;}" +
".ecbot-msg.bot{align-self:flex-start;background:#fff;border:1px solid #e8e8e8;border-bottom-left-radius:4px;}" +
".ecbot-msg.note{align-self:flex-start;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:.86rem;}" +
".ecbot-msg.error{align-self:flex-start;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}" +
".ecbot-cites{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem;}" +
".ecbot-cite{font-size:.74rem;font-weight:600;color:var(--ec);background:#eef2ff;border:1px solid #dbe3ff;" +
"border-radius:999px;padding:3px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;}" +
".ecbot-cite:hover{background:#dbe3ff;}.ecbot-cite svg{width:11px;height:11px;}" +
".ecbot-cite-book{color:#6b7280;background:#f3f4f6;border-color:#e5e7eb;cursor:default;}" +
".ecbot-cite-book:hover{background:#f3f4f6;}" +
".ecbot-follow{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem;}" +
".ecbot-chip{font-size:.74rem;color:#444;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:3px 10px;cursor:pointer;}" +
".ecbot-chip:hover{background:#e5e7eb;}" +
".ecbot-typing{display:inline-flex;gap:3px;}.ecbot-typing span{width:6px;height:6px;border-radius:50%;background:#bbb;animation:ecbot-blink 1.2s infinite both;}" +
".ecbot-typing span:nth-child(2){animation-delay:.2s;}.ecbot-typing span:nth-child(3){animation-delay:.4s;}" +
"@keyframes ecbot-blink{0%,80%,100%{opacity:.25;}40%{opacity:1;}}" +
".ecbot-form{display:flex;gap:.5rem;padding:.7rem;border-top:1px solid #eee;}" +
".ecbot-input{flex:1;border:1px solid #ddd;border-radius:8px;padding:.55rem .8rem;font:inherit;font-size:.9rem;outline:none;}" +
".ecbot-input:focus{border-color:var(--ec);}" +
".ecbot-send{border:none;background:var(--ec);color:#fff;font-weight:600;font-size:.9rem;padding:0 1.1rem;border-radius:8px;cursor:pointer;}" +
".ecbot-send:disabled{opacity:.55;cursor:default;}" +
/* lightbox */
".ecbot-lb{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:2.5vh 2vw;}" +
".ecbot-lb[hidden]{display:none;}" +
".ecbot-lb-card{background:#fff;border-radius:14px;width:min(1000px,96vw);height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);}" +
".ecbot-lb-bar{display:flex;align-items:center;gap:.6rem;padding:.6rem .9rem;border-bottom:1px solid #eee;font-size:.85rem;}" +
".ecbot-lb-bar b{font-weight:600;}.ecbot-lb-status{color:#6b7280;font-size:.78rem;}" +
".ecbot-lb-bar a{margin-left:auto;color:var(--ec);font-size:.8rem;text-decoration:none;}" +
".ecbot-lb-x{border:none;background:#f3f4f6;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:1.1rem;line-height:1;}" +
".ecbot-lb-frame{flex:1;border:0;width:100%;background:#fff;}" +
".ecbot-fallback{padding:2rem;text-align:center;color:#6b7280;font-size:.9rem;}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  // shared lightbox (one per page)
  var lb = null;
  function ensureLightbox() {
    if (lb) return lb;
    var el = document.createElement("div");
    el.className = "ecbot-lb";
    el.hidden = true;
    el.innerHTML =
      '<div class="ecbot-lb-card">' +
      '<div class="ecbot-lb-bar"><b class="ecbot-lb-title"></b>' +
      '<span class="ecbot-lb-status"></span>' +
      '<a class="ecbot-lb-open" target="_blank" rel="noopener">open in new tab ↗</a>' +
      '<button class="ecbot-lb-x" aria-label="Close">×</button></div>' +
      '<iframe class="ecbot-lb-frame" title="Course page preview"></iframe>' +
      "</div>";
    document.body.appendChild(el);
    var frame = el.querySelector(".ecbot-lb-frame");
    var status = el.querySelector(".ecbot-lb-status");
    function close() { el.hidden = true; frame.src = "about:blank"; }
    el.querySelector(".ecbot-lb-x").addEventListener("click", close);
    el.addEventListener("click", function (e) { if (e.target === el) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.hidden) close(); });
    lb = { el: el, frame: frame, status: status,
      title: el.querySelector(".ecbot-lb-title"), open: el.querySelector(".ecbot-lb-open"), close: close };
    return lb;
  }

  function openPreview(match) {
    injectWidgetCss();
    var L = ensureLightbox();
    L.title.textContent = prettyLabel(match.url);
    L.open.href = match.url;
    L.status.textContent = "loading…";
    L.el.hidden = false;
    L.frame.onload = function () {
      try {
        var found = locateInFrame(L.frame, match.text || "");
        L.status.textContent = found ? "✓ jumped to the relevant passage"
                                      : "loaded (couldn't auto-locate the exact line)";
      } catch (err) {
        // cross-origin (off the live site) — can't reach into the frame
        L.status.textContent = "preview limited (open from the live site to auto-highlight)";
      }
    };
    L.frame.src = match.url;
  }

  // build one compact widget into rootEl
  function mountCompact(root, opts) {
    opts = opts || {};
    injectWidgetCss();
    var workerUrl = opts.workerUrl || DEFAULT_WORKER;
    var intro = opts.intro ||
      "Ask me anything about the EC224 course material — I answer only from the course pages, " +
      "and I can show you the exact spot on the page.";

    root.classList.add("ecbot");
    root.innerHTML =
      '<div class="ecbot-head"><span class="ecbot-dot"></span>' + (opts.title || "Ask the Course AI") +
      '<span class="ecbot-sub">' + (opts.subtitle || "answers from the course site") + "</span></div>" +
      '<div class="ecbot-log" aria-live="polite"></div>' +
      '<form class="ecbot-form" autocomplete="off">' +
      '<input class="ecbot-input" type="text" placeholder="Type your question…" aria-label="Your question">' +
      '<button class="ecbot-send" type="submit">Send</button></form>';

    var log = root.querySelector(".ecbot-log");
    var form = root.querySelector(".ecbot-form");
    var input = root.querySelector(".ecbot-input");
    var send = root.querySelector(".ecbot-send");

    addMsg(intro, "bot");

    function addMsg(text, cls) {
      var el = document.createElement("div");
      el.className = "ecbot-msg " + cls;
      el.textContent = text;
      log.appendChild(el); log.scrollTop = log.scrollHeight;
      return el;
    }
    function addTyping() {
      var el = document.createElement("div");
      el.className = "ecbot-msg bot";
      el.innerHTML = '<span class="ecbot-typing"><span></span><span></span><span></span></span>';
      log.appendChild(el); log.scrollTop = log.scrollHeight;
      return el;
    }
    function addCites(parent, matches) {
      if (!matches || !matches.length) return;
      var wrap = document.createElement("div");
      wrap.className = "ecbot-cites";
      matches.forEach(function (m) {
        if (m.kind === "textbook" || !m.url) {
          // instructor textbook: non-clickable placeholder (no link yet)
          var s = document.createElement("span");
          s.className = "ecbot-cite ecbot-cite-book";
          s.innerHTML = BOOK_ICON + (m.label || "Course textbook");
          s.title = "From the course textbook — not published online yet";
          wrap.appendChild(s);
          return;
        }
        var b = document.createElement("button");
        b.type = "button"; b.className = "ecbot-cite";
        b.innerHTML = LINK_ICON + prettyLabel(m.url);
        b.title = "Show me where on " + prettyLabel(m.url);
        b.addEventListener("click", function () { openPreview(m); });
        wrap.appendChild(b);
      });
      parent.appendChild(wrap);
      log.scrollTop = log.scrollHeight;
    }
    function addFollowups(parent, q) {
      var actions = [
        ["Explain more simply", "Explain more simply, for a beginner: " + q],
        ["Give an example", "Give a concrete worked example for: " + q],
        ["Show the formula", "What is the key formula or definition for: " + q],
      ];
      var wrap = document.createElement("div");
      wrap.className = "ecbot-follow";
      actions.forEach(function (a) {
        var c = document.createElement("button");
        c.type = "button"; c.className = "ecbot-chip"; c.textContent = a[0];
        c.addEventListener("click", function () { submit(a[1], a[0]); });
        wrap.appendChild(c);
      });
      parent.appendChild(wrap);
      log.scrollTop = log.scrollHeight;
    }

    async function submit(question, displayAs) {
      addMsg(displayAs || question, "user");
      input.value = "";
      input.disabled = send.disabled = true;
      var typing = addTyping();
      try {
        var data = await ask(workerUrl, question);
        typing.remove();
        var cls = data.answered ? "bot" : "note";
        var bubble = addMsg(data.answer, cls);
        if (data.answered) {
          addCites(bubble, data.matches);   // sources ONLY when actually answered
          addFollowups(bubble, question);
        }
      } catch (err) {
        typing.remove();
        addMsg("Network error — couldn't reach the assistant. Please try again.", "error");
      } finally {
        input.disabled = send.disabled = false;
        input.focus();
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q) submit(q);
    });

    return { ask: function (q) { return submit(q); } };
  }

  window.EC224Bot = {
    DEFAULT_WORKER: DEFAULT_WORKER,
    ask: ask,
    prettyLabel: prettyLabel,
    locateInFrame: locateInFrame,
    injectFrameStyles: injectFrameStyles,
    openPreview: openPreview,
    mountCompact: mountCompact,
  };
})();
