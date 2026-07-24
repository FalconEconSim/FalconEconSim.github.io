/* ============================================================================
 * EC224: floating "Ask the Course AI" button (24/7).
 *
 * Drops a quirky, econ-themed floating button (a supply & demand cross inside a
 * chat bubble) into the bottom-right of any page it's loaded on. Click it for a
 * small popover chat, perfect for a quick question. A ↗ button expands to the
 * full assistant page (ask.html), carrying whatever you've typed along with it,
 * for longer questions where you want the side-by-side page preview.
 *
 * Requires assets/chatbot.js (window.EC224Bot) to be loaded first.
 * ==========================================================================*/
(function () {
  "use strict";

  if (window.__ec224Fab) return;            // guard against double-inject
  window.__ec224Fab = true;

  var FULL_PAGE = "ask.html";

  // supply & demand cross in a chat bubble: white, for the round button
  // A little supply-and-demand cross, matching the week covers on the landing
  // page rather than the old chat bubble. White line art on the blue button.
  var FAB_ICON =
    '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 7 V29 H33" stroke-opacity="0.85"/>' +
    '<path d="M14.5 12 L30 26.5"/>' +
    '<path d="M14.5 26.5 L30 12"/>' +
    '<circle cx="22.25" cy="19.25" r="2.4" fill="currentColor" stroke="none"/></svg>';

  // chevron-down, shown while the popover is open
  var CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  // colored logo for the popover header
  // The same diagram in the site's data palette (blue demand, orange-red
  // supply) on a tinted card, matching the week covers.
  var MINI_LOGO =
    '<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="42" height="42" rx="9" fill="#eaf2f8"/>' +
    '<path d="M14 11 V34 H37" stroke="#1c2433" stroke-opacity="0.35" stroke-width="1.8"/>' +
    '<path d="M17 15 L34 31" stroke="#c85a3c" stroke-width="2.6"/>' +
    '<path d="M17 31 L34 15" stroke="#1f6fb2" stroke-width="2.6"/>' +
    '<circle cx="25.5" cy="23" r="2.4" fill="#2f5c3a"/></svg>';

  var EXPAND_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/>' +
    '<path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>';

  function injectCss() {
    var css =
".ecfab-btn{position:fixed;right:22px;bottom:22px;z-index:9998;width:60px;height:60px;border-radius:50%;border:none;" +
"cursor:pointer;color:#fff;background:linear-gradient(135deg,#2563eb,#0b3aa0);box-shadow:0 10px 26px rgba(26,86,219,.42);" +
"display:flex;align-items:center;justify-content:center;transition:transform .16s,box-shadow .16s;-webkit-tap-highlight-color:transparent;}" +
".ecfab-btn:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 14px 32px rgba(26,86,219,.5);}" +
".ecfab-btn svg{width:32px;height:32px;}" +
".ecfab-btn::after{content:'';position:absolute;inset:0;border-radius:50%;animation:ecfabpulse 2.8s infinite;}" +
"@keyframes ecfabpulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.45);}70%{box-shadow:0 0 0 15px rgba(37,99,235,0);}100%{box-shadow:0 0 0 0 rgba(37,99,235,0);}}" +
".ecfab-seen .ecfab-btn::after,.ecfab-open .ecfab-btn::after{animation:none;}" +
".ecfab-badge{position:absolute;top:-3px;right:-4px;background:#16a34a;color:#fff;font-size:.56rem;font-weight:800;" +
"padding:2px 5px;border-radius:999px;border:2px solid #fff;letter-spacing:.02em;pointer-events:none;}" +
".ecfab-open .ecfab-badge{display:none;}" +
".ecfab-label{position:fixed;right:92px;bottom:37px;z-index:9998;background:#111827;color:#fff;font-size:.78rem;font-weight:600;" +
"padding:7px 12px;border-radius:10px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.22);opacity:0;transform:translateX(8px);" +
"pointer-events:none;transition:opacity .16s,transform .16s;}" +
".ecfab-label::after{content:'';position:absolute;right:-5px;top:50%;margin-top:-5px;border:5px solid transparent;border-left-color:#111827;}" +
".ecfab-wrap:hover .ecfab-label,.ecfab-label.peek{opacity:1;transform:none;}" +
".ecfab-open .ecfab-label{opacity:0 !important;}" +
".ecfab-pop{position:fixed;right:22px;bottom:92px;z-index:9998;width:372px;max-width:calc(100vw - 32px);height:526px;" +
"max-height:calc(100vh - 130px);background:#fff;border:1px solid #e4e4e4;border-radius:16px;box-shadow:0 18px 50px rgba(15,23,42,.28);" +
"display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;" +
"transition:opacity .18s,transform .18s;font-family:'DM Sans',system-ui,-apple-system,sans-serif;}" +
".ecfab-open .ecfab-pop{opacity:1;transform:none;pointer-events:auto;}" +
".ecfab-head{display:flex;align-items:center;gap:.6rem;padding:.7rem .85rem;border-bottom:1px solid #eee;" +
"background:linear-gradient(180deg,#f8faff,#fff);}" +
".ecfab-mini{width:32px;height:32px;flex:0 0 auto;}" +
".ecfab-htxt{line-height:1.15;min-width:0;}" +
".ecfab-title{font-weight:600;font-size:.95rem;color:#1a1a1a;}" +
".ecfab-sub{font-size:.7rem;color:#8a8a8a;}" +
".ecfab-actions{margin-left:auto;display:flex;gap:.3rem;flex:0 0 auto;}" +
".ecfab-iconbtn{border:1px solid #e5e7eb;background:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;color:#374151;" +
"display:inline-flex;align-items:center;justify-content:center;transition:all .12s;}" +
".ecfab-iconbtn:hover{border-color:#2563eb;color:#2563eb;background:#f5f8ff;}" +
".ecfab-iconbtn svg{width:16px;height:16px;}" +
".ecfab-iconbtn.x{font-size:1.15rem;line-height:1;font-weight:400;}" +
".ecfab-body{flex:1;min-height:0;display:flex;}" +
".ecfab-body>.ecbot{flex:1;min-width:0;}" +
".ecfab-foot{padding:.5rem .8rem;border-top:1px solid #f0f0f0;font-size:.72rem;color:#6b7280;text-align:center;background:#fafafa;}" +
".ecfab-foot a{color:#2563eb;text-decoration:none;font-weight:600;}" +
".ecfab-foot a:hover{text-decoration:underline;}" +
/* Dark mode for the popup chrome (the inner .ecbot themes itself in
   chatbot.js). Without this the popup was a white card on a near-black page.
   Colours match shared.css dark tokens. */
'html[data-theme="dark"] .ecfab-pop{background:#15171c;border-color:#2c313a;box-shadow:0 18px 50px rgba(0,0,0,.6);}' +
'html[data-theme="dark"] .ecfab-head{background:linear-gradient(180deg,#1d2027,#15171c);border-bottom-color:#2c313a;}' +
'html[data-theme="dark"] .ecfab-title{color:#e7e9ee;}' +
'html[data-theme="dark"] .ecfab-sub{color:#9aa3b2;}' +
'html[data-theme="dark"] .ecfab-iconbtn{background:#1d2027;border-color:#2c313a;color:#c3c8d2;}' +
'html[data-theme="dark"] .ecfab-iconbtn:hover{border-color:#6ea0ff;color:#6ea0ff;background:#22304a;}' +
'html[data-theme="dark"] .ecfab-foot{background:#1d2027;border-top-color:#2c313a;color:#9aa3b2;}' +
'html[data-theme="dark"] .ecfab-foot a{color:#6ea0ff;}' +
/* On phones the figures fill the width, so the floating button sat on top of
   figure content (a slider value at the bottom-right of week6 Fig 6.1, for
   one). Keep the button, it is a headline feature, but shrink it from 60 to
   48px (still above the 44px tap-target minimum), tuck it lower into the
   corner, and drop the pulse ring, whose expanding shadow is visually noisy
   right next to a figure. The peek label was already hidden here. */
"@media (max-width:480px){.ecfab-pop{right:12px;left:12px;width:auto;bottom:82px;height:auto;top:66px;max-height:none;}" +
".ecfab-label{display:none;}" +
".ecfab-btn{right:12px;bottom:12px;width:48px;height:48px;}" +
".ecfab-btn svg{width:26px;height:26px;}" +
".ecfab-btn::after{display:none;}" +
".ecfab-badge{font-size:.5rem;padding:1px 4px;}}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function build() {
    if (!window.EC224Bot) { // module missing: fail quietly, no broken UI
      console.warn("[ec224] ask-widget: EC224Bot not found (load assets/chatbot.js first)");
      return;
    }
    injectCss();

    var wrap = document.createElement("div");
    wrap.className = "ecfab-wrap";
    wrap.innerHTML =
      '<div class="ecfab-label">Stuck? Ask the Econ&nbsp;AI (24/7)</div>' +
      '<button class="ecfab-btn" type="button" aria-label="Ask the Course AI" aria-expanded="false">' +
      '<span class="ecfab-badge">24/7</span><span class="ecfab-ico">' + FAB_ICON + '</span></button>' +
      '<div class="ecfab-pop" role="dialog" aria-label="Ask the Course AI">' +
        '<div class="ecfab-head">' +
          '<span class="ecfab-mini">' + MINI_LOGO + '</span>' +
          '<div class="ecfab-htxt"><div class="ecfab-title">Ask the Course AI</div>' +
          '<div class="ecfab-sub">answers from the course pages</div></div>' +
          '<div class="ecfab-actions">' +
            '<a class="ecfab-iconbtn ecfab-expand" href="' + FULL_PAGE + '" ' +
              'title="Open the full assistant (bigger, with page preview)" aria-label="Open the full assistant">' + EXPAND_ICON + '</a>' +
            '<button class="ecfab-iconbtn x ecfab-close" type="button" title="Close" aria-label="Close">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="ecfab-body"><div class="ecfab-mount"></div></div>' +
        '<div class="ecfab-foot">Longer question? <a class="ecfab-full" href="' + FULL_PAGE + '">Open the full assistant &#8599;</a></div>' +
      '</div>';
    document.body.appendChild(wrap);

    var btn = wrap.querySelector(".ecfab-btn");
    var ico = wrap.querySelector(".ecfab-ico");
    var pop = wrap.querySelector(".ecfab-pop");
    var closeBtn = wrap.querySelector(".ecfab-close");
    var mount = wrap.querySelector(".ecfab-mount");
    var expandLinks = wrap.querySelectorAll(".ecfab-expand,.ecfab-full");

    // mount the compact chat (bare: the popover supplies the header)
    var handle = window.EC224Bot.mountCompact(mount, {
      bare: true,
      intro: "Hi! Quick econ question? Ask away: I answer from the EC224 course pages and can show you the exact spot. For a longer dig, hit the ↗ up top.",
      placeholder: "Ask a quick question…",
    });

    // carry the in-progress question to the full page
    function syncExpandHref() {
      var q = handle && handle.input ? handle.input.value.trim() : "";
      var href = FULL_PAGE + (q ? "?q=" + encodeURIComponent(q) : "");
      expandLinks.forEach(function (a) { a.setAttribute("href", href); });
    }
    if (handle && handle.input) handle.input.addEventListener("input", syncExpandHref);

    var open = false;
    function setOpen(v) {
      open = v;
      wrap.classList.toggle("ecfab-open", v);
      btn.setAttribute("aria-expanded", v ? "true" : "false");
      ico.innerHTML = v ? CLOSE_ICON : FAB_ICON;
      if (v) {
        wrap.classList.add("ecfab-seen");
        try { localStorage.setItem("ec224-fab-seen", "1"); } catch (e) {}
        syncExpandHref();
        setTimeout(function () { if (handle && handle.focus) handle.focus(); }, 60);
      }
    }
    btn.addEventListener("click", function () { setOpen(!open); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) setOpen(false); });
    // click outside closes (but not clicks inside the citation lightbox)
    document.addEventListener("click", function (e) {
      if (!open) return;
      if (wrap.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".ecbot-lb")) return;
      setOpen(false);
    });

    // one-time gentle nudge for first-time visitors
    var seen = false;
    try { seen = !!localStorage.getItem("ec224-fab-seen"); } catch (e) {}
    if (seen) {
      wrap.classList.add("ecfab-seen");
    } else {
      var label = wrap.querySelector(".ecfab-label");
      setTimeout(function () {
        if (open) return;
        label.classList.add("peek");
        var drop = function () { label.classList.remove("peek"); window.removeEventListener("scroll", drop); };
        // Dismiss the nudge the moment the reader starts scrolling, so it never
        // lingers over a figure they have scrolled to. Otherwise it clears on
        // its own after a few seconds.
        window.addEventListener("scroll", drop, { passive: true, once: true });
        setTimeout(drop, 4200);
      }, 1400);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
