/* ============================================================================
 * EC224 course AI: the "Ask" button in the corner of every student page.
 *
 * A small labelled button (the course AI's mark plus "Ask") opens a popover with
 * the question-and-answer transcript from assets/chatbot.js. "Full page" goes to
 * ask.html, carrying any half-typed question along, for the side-by-side source
 * preview. Styles: assets/ask.css (linked by chatbot.js).
 *
 * Two rules keep it out of the way:
 *  - while a figure (a kit plot, its controls, a film, an older canvas figure)
 *    sits under the button, the button steps aside. Each kit figure has its own
 *    "Ask about this figure" link (assets/ask-figures.js), so nothing is lost;
 *  - it never animates for attention. A first-time visitor sees one short hint
 *    beside it, once, and never again.
 *
 * window.EC224Ask.open({ context, starters, opener }) opens the popover from
 * elsewhere on the page (the figure links use it). Requires assets/chatbot.js.
 * ==========================================================================*/
(function () {
  "use strict";

  if (window.__ec224Fab) return;            // guard against a double inject
  window.__ec224Fab = true;

  var FULL_PAGE = "ask.html";
  var SEEN_KEY = "ec224-fab-seen";
  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Two questions per week that the course pages answer well; other pages get the general set.
  var STARTERS = {
    2: ["Why can't indifference curves cross?", "What does the MRS measure?"],
    3: ["What is the difference between Slutsky and Hicks?", "How can I tell a shift in demand from a movement along it?"],
    4: ["When does raising the price raise revenue?", "What is the difference between point and arc elasticity?"],
    5: ["Why does the MRTS diminish along an isoquant?", "How do returns to scale differ from diminishing marginal product?"],
    6: ["Why is the long-run average cost curve an envelope?", "How does a firm pick the cheapest mix of labor and capital?"],
    7: ["When should a competitive firm shut down?", "Why is the firm's supply curve part of its marginal cost curve?"],
    8: ["When is marginal revenue less than price?", "What causes deadweight loss under monopoly?"],
    9: ["How does a two-part tariff capture consumer surplus?", "Why is a natural monopoly hard to regulate?"],
    10: ["How does Stackelberg differ from Cournot?", "Why do Hotelling competitors cluster in the middle?"],
    11: ["How does a Pigouvian tax fix an externality?", "What does the Coase theorem say?"],
    12: ["Why can lemons drive good cars out of a market?", "How does signaling separate worker types?"],
    all: ["What is the difference between Slutsky and Hicks?", "Why does the MRTS diminish along an isoquant?", "When is marginal revenue less than price?"],
  };
  var FIGURE_STARTERS = ["Explain the idea behind this figure", "Give me a hint, not the answer"];

  // the parts of a page the button must never cover
  var FIGURE_SEL = ".kfig .stage, .kfig .panel, .kfig .ecask-fig, figure.film, video, .fig-bay, .fig-plot, .jxgbox, canvas, .fc-btn-row, .fc-card-inner";

  function weekStarters() {
    var m = location.pathname.match(/week(\d+)/);
    return (m && STARTERS[+m[1]]) || STARTERS.all;
  }

  function build() {
    var Bot = window.EC224Bot;
    if (!Bot) { console.warn("[ec224] ask-widget: EC224Bot not found (load assets/chatbot.js first)"); return; }

    var wrap = document.createElement("div");
    wrap.className = "ecfab-wrap";
    wrap.style.visibility = "hidden";     // until assets/ask.css has loaded
    wrap.innerHTML =
      '<p class="ecfab-hint" aria-hidden="true"><b>Stuck on something?</b> Ask the course AI. It answers from these pages and the textbook.</p>' +
      '<button class="ecfab-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="ecfab-pop">' +
        '<span class="ea-mark">' + Bot.MARK + '</span><span class="ecfab-lbl">Ask</span>' +
        '<span class="ecfab-sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"> the course AI</span></button>' +
      '<div class="ecfab-pop" id="ecfab-pop" role="dialog" aria-modal="false" aria-labelledby="ecfab-title">' +
        '<div class="ecfab-head">' +
          '<span class="ea-mark">' + Bot.MARK + '</span>' +
          '<div class="ecfab-htxt"><p class="ecfab-title" id="ecfab-title">Ask the Course AI</p>' +
          '<p class="ecfab-sub">From the course materials</p></div>' +
          '<div class="ecfab-actions">' +
            '<a class="ecfab-full" href="' + FULL_PAGE + '" title="The full page shows each source next to the answer">Full page</a>' +
            '<button class="ecfab-close" type="button" aria-label="Close">' + X_ICON + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="ecfab-body"><div class="ecfab-mount"></div></div>' +
      '</div>';
    document.body.appendChild(wrap);
    Bot.ensureCss().then(function () { wrap.style.visibility = ""; });

    var btn = wrap.querySelector(".ecfab-btn");
    var lbl = wrap.querySelector(".ecfab-lbl");
    var pop = wrap.querySelector(".ecfab-pop");
    var hint = wrap.querySelector(".ecfab-hint");
    var full = wrap.querySelector(".ecfab-full");
    var handle = Bot.mountThread(wrap.querySelector(".ecfab-mount"), {
      bare: true,
      starters: weekStarters(),
      placeholder: "Ask about the course",
    });

    // carry a half-typed question to the full page
    function syncFull() {
      var q = handle.input.value.trim();
      full.setAttribute("href", FULL_PAGE + (q ? "?q=" + encodeURIComponent(q) : ""));
    }
    handle.input.addEventListener("input", syncFull);

    var open = false, opener = null;
    function setOpen(v, o) {
      if (v === open) { if (v) handle.focus(); return; }
      open = v;
      wrap.classList.toggle("ecfab-open", v);
      btn.setAttribute("aria-expanded", v ? "true" : "false");
      lbl.textContent = v ? "Close" : "Ask";
      if (v) {
        opener = o || btn;
        hideHint();
        markSeen();
        syncFull();
        setTimeout(function () { handle.focus(); }, 40);
      } else {
        var back = opener && document.contains(opener) ? opener : btn;
        opener = null;
        if (wrap.contains(document.activeElement) || document.activeElement === document.body) back.focus();
      }
      queueAway();
    }

    btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!open); });
    wrap.querySelector(".ecfab-close").addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); }
    });
    // a click outside closes it (but not a click in the source preview it opened)
    document.addEventListener("click", function (e) {
      if (!open || !e.target.isConnected) return;
      if (wrap.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".ecbot-lb, .ecask-fig")) return;
      setOpen(false);
    });

    // ---- step aside while a figure is under the button ----
    var awayQueued = false;
    function overlaps(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
    function checkAway() {
      awayQueued = false;
      var away = false;
      if (!open) {
        var cs = getComputedStyle(btn);
        var W = window.innerWidth, H = window.innerHeight;
        var right = parseFloat(cs.right) || 0, bottom = parseFloat(cs.bottom) || 0;
        var r = { right: W - right + 4, bottom: H - bottom + 4 };
        r.left = r.right - btn.offsetWidth - 8; r.top = r.bottom - btn.offsetHeight - 8;
        var figs = document.querySelectorAll(FIGURE_SEL);
        for (var i = 0; i < figs.length && !away; i++) {
          if (wrap.contains(figs[i])) continue;
          var fr = figs[i].getBoundingClientRect();
          if (fr.width && fr.height && overlaps(r, fr)) away = true;
        }
      }
      wrap.classList.toggle("ecfab-away", away);
    }
    function queueAway() { if (!awayQueued) { awayQueued = true; requestAnimationFrame(checkAway); } }
    window.addEventListener("scroll", queueAway, { passive: true });
    window.addEventListener("resize", queueAway);
    if ("ResizeObserver" in window) new ResizeObserver(queueAway).observe(document.body);
    setTimeout(checkAway, 300);

    // ---- one hint for a first-time visitor ----
    function markSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {} }
    function hideHint() { hint.classList.remove("show"); }
    var seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
    if (!seen) {
      setTimeout(function () {
        if (open || wrap.classList.contains("ecfab-away")) return;   // try again on the next visit
        hint.classList.add("show");
        // never cover a control: if the hint lands on a button, link or field, drop it
        requestAnimationFrame(function () {
          var hr = hint.getBoundingClientRect(), els = document.querySelectorAll(FIGURE_SEL + ", button, a, input, textarea, select");
          for (var i = 0; i < els.length; i++) { if (wrap.contains(els[i])) continue; var er = els[i].getBoundingClientRect(); if (er.width && er.height && overlaps(hr, er)) { hideHint(); return; } }
        });
        markSeen();
        var y0 = window.scrollY;
        var onScroll = function () {
          if (Math.abs(window.scrollY - y0) > 80) { hideHint(); window.removeEventListener("scroll", onScroll); }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        setTimeout(hideHint, 7000);
      }, 1500);
    }

    // ---- open from elsewhere on the page (the figure links) ----
    window.EC224Ask = {
      open: function (o) {
        o = o || {};
        handle.setContext(o.context || null);
        if (!handle.hasTurns()) handle.setStarters(o.context ? (o.starters || FIGURE_STARTERS) : weekStarters());
        setOpen(true, o.opener);
      },
      close: function () { setOpen(false); },
      isOpen: function () { return open; },
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
