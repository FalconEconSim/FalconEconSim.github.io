/* ============================================================================
 * EC224 course AI: shared module (window.EC224Bot).
 *
 *   .ask(workerUrl, question)        -> Promise<{answer, answered, sources, matches, suggestions}>
 *                                       rejects with err.kind = "busy" | "slow" | "offline" | "server"
 *   .mountThread(rootEl, opts)       -> the question-and-answer transcript with its question box
 *   .mountCompact(rootEl, opts)      -> same thing (older name, kept for the dev pages)
 *   .locateInFrame(frame, chunkText) -> bool   (scroll to and highlight a passage; same-origin only)
 *   .openPreview(match)              -> the source page in a lightbox, jumped to the passage
 *   .prettyLabel(url)                -> "Week 3 visualizations"
 *   .renderRich(el, text, onDone)    -> Markdown + KaTeX into el
 *   .MARK                            -> the assistant's mark (inline SVG, currentColor)
 *
 * The live-preview trick: this script is served from falconeconsim.github.io and so are
 * the course pages, so an <iframe> of a course page is SAME-ORIGIN, which lets us reach
 * into it to scroll to, and highlight, the exact sentence the answer came from.
 * Off the live origin that is blocked, and the preview falls back to a plain page.
 *
 * Styles live in assets/ask.css, which this script links itself (most pages only load
 * the scripts). See the header of that file for the visual rules.
 * ==========================================================================*/
(function () {
  "use strict";

  var DEFAULT_WORKER = "https://ec224-chatbot.zachtwinship.workers.dev/";
  var TIMEOUT_MS = 40000;
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";

  /* The mark: the axes of a figure, a convex curve and a point on it. It is the
     figures' own picture (a point you find on a curve), not a chat bubble or a
     sparkle, and it is drawn in currentColor so it sits on any ground. */
  var MARK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4 3.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V5A1.5 1.5 0 0 1 4 3.5z" stroke-width="2.2"/>' +
    '<path d="M6.5 7C7.2 11 9.8 12.8 17.5 13" stroke-width="2.2"/></svg>';

  var LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
  var BOOK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19h14"/></svg>';
  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // ---- stylesheet ------------------------------------------------------------
  var cssReady = null;
  function ensureCss() {
    if (cssReady) return cssReady;
    cssReady = new Promise(function (resolve) {
      var have = document.querySelector('link[rel="stylesheet"][href$="ask.css"]');
      if (have) {
        if (have.sheet) resolve();
        else { have.addEventListener("load", resolve); have.addEventListener("error", resolve); setTimeout(resolve, 3000); }
        return;
      }
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SCRIPT_SRC ? SCRIPT_SRC.replace(/chatbot\.js(\?.*)?$/, "ask.css") : "assets/ask.css";
      link.setAttribute("data-ea-css", "1");
      link.onload = link.onerror = function () { resolve(); };
      setTimeout(resolve, 3000);   // never leave the widget hidden on a slow network
      document.head.appendChild(link);
    });
    return cssReady;
  }
  ensureCss();

  // ---- API call ------------------------------------------------------------
  function failure(kind, detail) {
    var e = new Error(detail || kind);
    e.kind = kind;
    return e;
  }

  // The worker answers {answer, answered, sources, matches, suggestions}. Besides real
  // HTTP errors, it reports a Gemini quota hit as a 200 whose only content is a
  // "rate limit" sentence (no `answered` field): that is treated as "busy" too.
  async function ask(workerUrl, question) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    var res;
    try {
      res = await fetch(workerUrl || DEFAULT_WORKER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question }),
        signal: ctrl ? ctrl.signal : undefined,
      });
    } catch (e) {
      throw failure(e && e.name === "AbortError" ? "slow" : "offline", String(e));
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (res.status === 429 || res.status === 503) throw failure("busy", "HTTP " + res.status);
    var data;
    try { data = await res.json(); } catch (e) { throw failure("server", "HTTP " + res.status + " (not JSON)"); }
    if (!res.ok && !(data && data.answer)) throw failure("server", (data && data.error) || ("HTTP " + res.status));
    var srcs = data.sources || [];
    if (typeof data.answered === "undefined") {
      if (!srcs.length && /rate limit|too many requests/i.test(data.answer || "")) throw failure("busy", "quota");
      data.answered = !!srcs.length;     // tolerate the old response shape
    }
    if (!data.matches) data.matches = srcs.map(function (u) { return { url: u, title: u, text: "" }; });
    if (!data.suggestions) data.suggestions = [];
    return data;
  }

  // ---- source labels ---------------------------------------------------------
  function prettyLabel(url) {
    var path = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/[?#].*$/, "").replace(/\.html$/, "");
    if (!path || path === "index") return "Course home";
    var m = path.match(/^week(\d+)(?:-(.*))?$/);
    if (m) {
      var kind = { "": "overview", "viz": "visualizations", "viz-classic": "visualizations (classic)",
        "viz-claude-dev": "visualizations (Claude dev)", "viz-dev": "visualizations (dev)", "practice": "practice",
        "slides": "slides", "videos": "videos", "flashcards": "flashcards" }[m[2] || ""];
      return "Week " + m[1] + " " + (kind || (m[2] || "").replace(/-/g, " "));
    }
    return path.replace(/-/g, " ");
  }
  // "Textbook · Ch. 3" from the worker reads as "Textbook, chapter 3"
  function bookLabel(m) {
    var l = String(m.label || m.title || "Course textbook");
    var ch = l.match(/ch(?:apter)?\.?\s*(\d+)/i);
    return ch ? "Textbook, chapter " + ch[1] : l.replace(/\s*·\s*/g, ", ");
  }

  // ---- answer renderer: Markdown + KaTeX ------------------------------------
  /* The model returns Markdown plus math in mixed delimiters ($...$, $$...$$,
     \(...\), \[...\]). Each math span goes through katex.renderToString (which
     safely handles < and >), and the prose around it is HTML-escaped and given a
     small Markdown pass (bold, italic, code, headings, bullets, line breaks).

     Currency vs math: a $...$ span is math only when the opening $ is NOT
     followed by a space or a digit, so $I$ and $P_X$ render while "$5.99" and
     "between $5 and $10" stay plain text. */
  function _ensureKatex() {
    if (window.__ecKatexReady) return window.__ecKatexReady;
    window.__ecKatexReady = new Promise(function (resolve) {
      if (window.katex && window.katex.renderToString) { resolve(); return; }
      var base = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/";
      if (!document.querySelector("link[data-ec-katex]")) {
        var css = document.createElement("link");
        css.rel = "stylesheet"; css.href = base + "katex.min.css";
        css.setAttribute("data-ec-katex", "1");
        document.head.appendChild(css);
      }
      var core = document.createElement("script");
      core.src = base + "katex.min.js";
      core.onload = function () { resolve(); };
      core.onerror = function () { resolve(); };
      document.head.appendChild(core);
    });
    return window.__ecKatexReady;
  }

  function _escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
    });
  }

  function _proseToHtml(s) {
    s = _escHtml(s);
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+?)`/g, "<code>$1</code>");
    s = s.replace(/(^|[\s(>])\*([^*\s][^*]*?)\*(?=[\s).,;:<]|$)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[\s(>])_([^_\s][^_]*?)_(?=[\s).,;:<]|$)/g, "$1<em>$2</em>");
    return s.split("\n").map(function (ln) {
      var h = ln.match(/^\s*(#{1,4})\s+(.*)$/);
      if (h) return '<span class="ecbot-h">' + h[2] + "</span>";
      var b = ln.match(/^\s*[\*\-]\s+(.*)$/);
      if (b) return "&bull;&nbsp;" + b[1];
      return ln;   // numbered "1." lines keep their number
    }).join("<br>");
  }

  function _richToHtml(text) {
    if (!window.katex || !window.katex.renderToString) return _proseToHtml(text);
    var re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$(?![\s\d])([^$\n]*?[^\s])\$|\\\(([\s\S]+?)\\\)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(text))) {
      out += _proseToHtml(text.slice(last, m.index));
      var display = m[1] !== undefined || m[2] !== undefined;
      var latex = m[1] || m[2] || m[3] || m[4] || "";
      try {
        out += window.katex.renderToString(latex, { displayMode: display, throwOnError: false, errorColor: "#93301f" });
      } catch (e) { out += _escHtml(m[0]); }
      last = re.lastIndex;
    }
    out += _proseToHtml(text.slice(last));
    return out;
  }

  // el: target element. text: raw answer. onDone: optional callback after paint.
  function renderRich(el, text, onDone) {
    _ensureKatex().then(function () {
      try { el.innerHTML = _richToHtml(text); }
      catch (e) { el.textContent = text; }
      if (onDone) onDone();
    });
  }

  // ---- locate + highlight a passage inside a same-origin iframe -------------
  function injectFrameStyles(doc) {
    if (doc.getElementById("ec224-hl-style")) return;
    var s = doc.createElement("style");
    s.id = "ec224-hl-style";
    s.textContent =
      ".ec224-hl{background:#f0d9a8 !important;box-shadow:0 0 0 4px #f0d9a8;border-radius:3px;}" +
      "::selection{background:#f0d9a8;color:#14181b;}" +
      /* The preview is a reading pane, not a working page: hide the site chrome
         (top bar, section rail, week nav, footer) and the floating Ask button, and
         give the content the full width. */
      ".topbar,.top-bar,.rail,.left-nav,.left-nav-overlay,.left-nav-toggle," +
      ".site-foot,.home-foot,.hub-footer,.site-footer,.ecfab-wrap,.ecask-fig{display:none !important;}" +
      ".layout{display:block !important;max-width:none !important;padding:1.25rem 1.5rem 3rem !important;}" +
      "body{padding-top:0 !important;}";
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

  // true if it found and highlighted the passage; false if not found.
  // Throws on cross-origin (the caller treats that as "preview limited").
  function locateInFrame(frame, chunkText) {
    var win = frame.contentWindow;
    var doc = frame.contentDocument || (win && win.document);
    if (!win || !doc) throw new Error("no frame document");
    injectFrameStyles(doc); // throws SecurityError when cross-origin

    if (!win.find) return false;
    var phrases = candidatePhrases(chunkText);
    for (var i = 0; i < phrases.length; i++) {
      try {
        win.getSelection().removeAllRanges();
        if (win.find(phrases[i], false, false, true)) { highlightSelection(win, doc); return true; }
      } catch (e) { /* try the next phrase */ }
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
      range.surroundContents(mark); // works when the range sits inside one text node
      el = mark;
      sel.removeAllRanges();
    } catch (e) { /* multi-node range: keep the native selection highlight */ }
    // scroll the frame itself, never the page around it (scrollIntoView would move both)
    if (el && el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      win.scrollTo({ top: Math.max(0, win.scrollY + r.top - win.innerHeight / 2 + r.height / 2), behavior: "smooth" });
    }
  }

  // Status line for a preview frame once it has loaded.
  function previewStatus(frame, match) {
    try {
      return locateInFrame(frame, match.text || "")
        ? "Highlighted the passage the answer came from"
        : "The page is open; the exact passage could not be pinpointed";
    } catch (err) {
      return "Open the page on the live site to jump to the passage";
    }
  }

  // ---- source lightbox (one per page) ---------------------------------------
  var lb = null;
  function ensureLightbox() {
    if (lb) return lb;
    var el = document.createElement("div");
    el.className = "ecbot-lb";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Source page preview");
    el.innerHTML =
      '<div class="ecbot-lb-card">' +
      '<div class="ecbot-lb-bar"><b class="ecbot-lb-title"></b>' +
      '<span class="ecbot-lb-status" aria-live="polite"></span>' +
      '<a class="ecbot-lb-open" target="_blank" rel="noopener">Open in a new tab</a>' +
      '<button type="button" class="ecbot-lb-x" aria-label="Close the preview">' + X_ICON + "</button></div>" +
      '<iframe class="ecbot-lb-frame" title="Course page preview"></iframe>' +
      "</div>";
    document.body.appendChild(el);
    var frame = el.querySelector(".ecbot-lb-frame");
    var opener = null;
    function close() {
      if (el.hidden) return;
      el.hidden = true; frame.src = "about:blank";
      if (opener && opener.focus) opener.focus();
      opener = null;
    }
    el.querySelector(".ecbot-lb-x").addEventListener("click", close);
    el.addEventListener("click", function (e) { if (e.target === el) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !el.hidden) { e.stopPropagation(); close(); }
    }, true);
    lb = { el: el, frame: frame, status: el.querySelector(".ecbot-lb-status"), title: el.querySelector(".ecbot-lb-title"),
      open: el.querySelector(".ecbot-lb-open"), close: close, setOpener: function (o) { opener = o; } };
    return lb;
  }

  function openPreview(match, openerEl) {
    var L = ensureLightbox();
    L.title.textContent = prettyLabel(match.url);
    L.open.href = match.url;
    L.status.textContent = "Loading the page";
    L.setOpener(openerEl || document.activeElement);
    L.el.hidden = false;
    L.frame.onload = function () { L.status.textContent = previewStatus(L.frame, match); };
    L.frame.src = match.url;
    setTimeout(function () { L.el.querySelector(".ecbot-lb-x").focus(); }, 30);
  }

  // ---- the transcript ---------------------------------------------------------
  var STATUS = {
    busy:    ["The course AI is busy right now.", "Lots of people are asking at once. Wait a minute, then try again."],
    slow:    ["The course AI is taking too long to answer.", "Try again in a minute."],
    offline: ["Could not reach the course AI.", "Check your connection, then try again."],
    server:  ["The course AI hit a problem with that question.", "Try again, or ask it a different way."],
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* opts:
       workerUrl, bare (no own header: fills a popover), title, subtitle,
       intro (text above the starters), starters ([question, ...]), placeholder,
       logHeight, fill (the log grows to fill its parent),
       onAnswer(data, turn)                 called after an answer is shown
       onSourceClick(match, button, buttons) replaces the default lightbox preview
     returns { ask(q), input, focus(), prefill(q), setContext(ctx|null), setStarters([..]) }
       ctx = { label: "Figure 8.1, CS/PS triangle anatomy", prompt: "text sent before the question" } */
  function mountThread(root, opts) {
    opts = opts || {};
    ensureCss();
    var workerUrl = opts.workerUrl || DEFAULT_WORKER;

    root.classList.add("ecbot");
    if (opts.bare) root.classList.add("ecbot-bare");
    if (opts.fill) root.classList.add("ecbot-fill");
    root.innerHTML = (opts.bare ? "" :
      '<div class="ecbot-head"><span class="ea-mark">' + MARK + "</span>" + _escHtml(opts.title || "Ask the Course AI") +
      (opts.subtitle ? '<span class="ecbot-sub">' + _escHtml(opts.subtitle) + "</span>" : "") + "</div>") +
      '<div class="ecbot-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="-1"></div>' +
      '<form class="ecbot-form" autocomplete="off">' +
      '<p class="ecbot-ctx" hidden><span>About</span><b></b><button type="button">Ask in general</button></p>' +
      '<div class="ecbot-row">' +
      '<input class="ecbot-input" type="text" enterkeyhint="send" maxlength="500" aria-label="Your question" placeholder="' +
      _escHtml(opts.placeholder || "Ask about the course") + '">' +
      '<button class="ecbot-send" type="submit">Ask</button></div></form>';

    var log = root.querySelector(".ecbot-log");
    var form = root.querySelector(".ecbot-form");
    var input = root.querySelector(".ecbot-input");
    var send = root.querySelector(".ecbot-send");
    var ctxRow = root.querySelector(".ecbot-ctx");
    var ctxName = ctxRow.querySelector("b");
    if (opts.logHeight) log.style.height = opts.logHeight;

    var context = null, busy = false, basePlaceholder = input.placeholder;

    // empty state: one line of what this is, and a few questions to start with
    var intro = el("div", "ecbot-empty");
    function drawIntro(starters) {
      intro.innerHTML = "";
      intro.appendChild(el("p", "ecbot-intro", opts.intro ||
        "Ask about anything in EC224. Answers come from the course pages and textbook, with a link to the passage they came from."));
      if (starters && starters.length) {
        var box = el("div", "ecbot-starters");
        starters.forEach(function (q) {
          var b = el("button", "ecbot-chip", q);
          b.type = "button";
          b.addEventListener("click", function () { submit(q); });
          box.appendChild(b);
        });
        intro.appendChild(box);
      }
    }
    drawIntro(opts.starters);
    log.appendChild(intro);

    function scrollToTurn(turn) {
      var top = turn.offsetTop - log.offsetTop - 8;
      if (top > log.scrollTop || turn.offsetTop - log.offsetTop + turn.offsetHeight > log.scrollTop + log.clientHeight) log.scrollTop = Math.max(0, top);
    }

    function addCites(turn, matches) {
      if (!matches || !matches.length) return;
      var row = el("div", "ecbot-from");
      row.appendChild(el("span", null, "From"));
      var buttons = [];
      matches.forEach(function (m) {
        if (m.kind === "textbook" || !m.url) {
          // the course textbook: named, never linked (it is not published online)
          var s = el("span", "ecbot-cite ecbot-cite-book");
          s.innerHTML = BOOK_ICON + _escHtml(bookLabel(m));
          s.title = "From the course textbook, which is not online";
          row.appendChild(s);
          return;
        }
        var b = el("button", "ecbot-cite");
        b.type = "button";
        b.innerHTML = LINK_ICON + _escHtml(prettyLabel(m.url));
        b.title = "Show the passage on " + prettyLabel(m.url);
        b.addEventListener("click", function () {
          if (opts.onSourceClick) opts.onSourceClick(m, b, buttons);
          else openPreview(m, b);
        });
        buttons.push(b);
        row.appendChild(b);
      });
      turn.appendChild(row);
      return buttons;
    }

    function addNext(turn, q, suggestions) {
      var list = (suggestions && suggestions.length)
        ? suggestions.slice(0, 3).map(function (s) { return [s, s]; })
        : [["Explain it more simply", "Explain more simply, for a beginner: " + q],
           ["Give me an example", "Give a concrete worked example for: " + q],
           ["Show the formula", "What is the key formula or definition for: " + q]];
      var box = el("div", "ecbot-next");
      list.forEach(function (a) {
        var c = el("button", "ecbot-chip", a[0]);
        c.type = "button";
        c.addEventListener("click", function () { submit(a[1], a[0]); });
        box.appendChild(c);
      });
      turn.appendChild(box);
    }

    function setBusy(v) {
      busy = v;
      send.disabled = v;
      input.setAttribute("aria-busy", v ? "true" : "false");
    }

    // ask the worker for one turn; on failure, offer to try the same question again
    async function run(turn, payload, shownQ) {
      var slot = el("div", "ecbot-slot");
      turn.appendChild(slot);
      slot.appendChild(el("p", "ecbot-wait", "Reading the course pages"));
      setBusy(true);
      try {
        var data = await ask(workerUrl, payload);
        slot.innerHTML = "";
        if (data.answered) {
          var body = el("div", "ecbot-a ecbot-body");
          body.textContent = data.answer || "";      // shown until KaTeX is ready
          slot.appendChild(body);
          renderRich(body, data.answer || "", function () { scrollToTurn(turn); });
          var buttons = addCites(slot, data.matches);
          addNext(slot, shownQ, data.suggestions);
          if (opts.onAnswer) opts.onAnswer(data, turn, buttons || []);
        } else {
          slot.appendChild(el("p", "ecbot-note", data.answer ||
            "That is not in the EC224 course materials, so the course AI can't answer it."));
          if (opts.onAnswer) opts.onAnswer(data, turn, []);
        }
      } catch (err) {
        var kind = (err && err.kind) || "server";
        var words = STATUS[kind] || STATUS.server;
        slot.innerHTML = "";
        var st = el("div", "ecbot-status" + (kind === "busy" || kind === "slow" ? "" : " is-error"));
        st.setAttribute("role", "status");
        st.appendChild(el("b", null, words[0]));
        st.appendChild(document.createTextNode(words[1]));
        var again = el("button", "ecbot-retry", "Try again");
        again.type = "button";
        again.addEventListener("click", function () {
          if (busy) return;
          slot.remove();
          run(turn, payload, shownQ);
        });
        slot.appendChild(st);
        slot.appendChild(again);
        if (window.console && console.warn) console.warn("[ec224] course AI: " + kind + " (" + (err && err.message) + ")");
      } finally {
        setBusy(false);
        scrollToTurn(turn);
      }
    }

    function submit(question, displayAs) {
      question = String(question || "").trim();
      if (!question || busy) return;
      if (intro.parentNode) intro.remove();
      var turn = el("section", "ecbot-turn");
      if (context) turn.appendChild(el("p", "ecbot-about", "About " + context.label));
      turn.appendChild(el("p", "ecbot-q", displayAs || question));
      log.appendChild(turn);
      input.value = "";
      input.dispatchEvent(new Event("input"));
      var payload = context ? context.prompt + "\n\nMy question: " + question : question;
      scrollToTurn(turn);
      return run(turn, payload, question);
    }

    function setContext(ctx) {
      context = ctx || null;
      ctxRow.hidden = !context;
      ctxName.textContent = context ? context.label : "";
      input.placeholder = context && context.placeholder ? context.placeholder : basePlaceholder;
    }
    ctxRow.querySelector("button").addEventListener("click", function () { setContext(null); input.focus(); });

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(input.value); });

    return {
      ask: function (q) { return submit(q); },
      input: input,
      log: log,
      focus: function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } },
      prefill: function (q) { input.value = q || ""; input.dispatchEvent(new Event("input")); },
      setContext: setContext,
      setStarters: function (list) { drawIntro(list); },
      hasTurns: function () { return !!log.querySelector(".ecbot-turn"); },
    };
  }

  window.EC224Bot = {
    DEFAULT_WORKER: DEFAULT_WORKER,
    MARK: MARK,
    ask: ask,
    prettyLabel: prettyLabel,
    bookLabel: bookLabel,
    locateInFrame: locateInFrame,
    injectFrameStyles: injectFrameStyles,
    previewStatus: previewStatus,
    openPreview: openPreview,
    mountThread: mountThread,
    mountCompact: mountThread,
    renderRich: renderRich,
    richToHtml: _richToHtml,
    ensureCss: ensureCss,
  };
})();
