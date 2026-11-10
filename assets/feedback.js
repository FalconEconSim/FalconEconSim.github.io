/* ============================================================================
 * EC224 feedback: "Suggest or report" on every figure, "Feedback" in every
 * page footer, and the small form they open.
 *
 * Loaded by assets/ask-widget.js (which already runs on every student page), so
 * no page links this file. It adds:
 *  - a "Suggest or report" link beside "Ask about this figure" on each kit
 *    figure (.kfig). At click time it reads the figure's number, title and the
 *    question it is asking right now, so "Try a new one" is followed;
 *  - a "Feedback" link in the page footer (or a one-line strip at the end of
 *    the page when it has no footer).
 *
 * Each note goes to the feedback worker (C:\MicroSite\feedback-worker, outside
 * this repo), which files it as an issue in the course team's private repo. No
 * name, email or IP address is sent or kept. Styles: assets/feedback.css, which
 * this script links itself.
 *
 * window.EC224Feedback.open({ figure, figureTitle, question, section, anchor, opener })
 * opens the form from elsewhere.
 * ==========================================================================*/
(function () {
  "use strict";
  if (window.__ec224Feedback) return;
  window.__ec224Feedback = true;


  // Change it here if your workers.dev subdomain differs (see C:\MicroSite\feedback-worker\README.md).
  var ENDPOINT = "https://ec224-feedback.zachtwinship.workers.dev/";
  var TIMEOUT_MS = 15000;
  var MIN = 5, MAX = 3000;
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";

  // local testing: on localhost an endpoint can be set without editing this file,
  // e.g. localStorage.setItem("ec224-feedback-endpoint", "http://127.0.0.1:8787/")
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try { ENDPOINT = window.EC224_FEEDBACK_ENDPOINT || localStorage.getItem("ec224-feedback-endpoint") || ENDPOINT; } catch (e) {}
  }

  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var FLAG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 21V3.5"/><path d="M5 4h12.5l-2.6 4.5 2.6 4.5H5"/></svg>';

  var KINDS = [
    { v: "problem", t: "Something's wrong", s: "A bug, a typo, a wrong number",
      label: "What went wrong?", help: "What did you do, and what did you see instead?" },
    { v: "confusing", t: "It's confusing", s: "A step or idea that lost you",
      label: "What is confusing?", help: "Which step, sentence or label lost you? A short note is fine." },
    { v: "suggestion", t: "A suggestion", s: "An idea to make it better",
      label: "What would make it better?", help: "Tell us the idea. Rough is fine." },
    { v: "other", t: "Something else", s: "Anything we should know",
      label: "What's on your mind?", help: "Anything about this page or the course site." },
  ];

  function text(node) { return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- stylesheet ---------- */
  var cssReady = null;
  function ensureCss() {
    if (cssReady) return cssReady;
    cssReady = new Promise(function (resolve) {
      if (document.querySelector('link[rel="stylesheet"][href$="feedback.css"]')) { resolve(); return; }
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SCRIPT_SRC ? SCRIPT_SRC.replace(/feedback\.js(\?.*)?$/, "feedback.css") : "assets/feedback.css";
      link.onload = link.onerror = function () { resolve(); };
      setTimeout(resolve, 3000);
      document.head.appendChild(link);
    });
    return cssReady;
  }

  /* ---------- what the page is showing ---------- */
  function pageLabel() {
    return (document.title || "this page").replace(/\s*[·|]\s*EC224.*$/, "").trim() || "this page";
  }

  function figureContext(fig) {
    var num = fig.querySelector(".fig-num");
    var topic = text(num && num.querySelector("span"));
    var number = text(num).replace(topic, "").replace(/^Figure\s*/i, "").trim();
    var sec = fig.closest("section");
    var h = null;
    if (sec) {
      var hs = sec.querySelectorAll("h1, h2, h3");
      for (var i = 0; i < hs.length && !h; i++) if (!fig.contains(hs[i])) h = hs[i];
    }
    return {
      figure: number, figureTitle: topic, question: text(fig.querySelector(".q")),
      section: text(h), anchor: fig.id || (sec && sec.id) || "",
    };
  }

  function pageContext() {
    // a flashcard page: the card on screen is the useful context
    var card = document.querySelector("#fc-inner .fc-front .fc-q") || document.querySelector("#fc-inner .fc-front");
    return { figure: "", figureTitle: "", question: card ? text(card).slice(0, 300) : "", section: "", anchor: "" };
  }

  /* ---------- the dialog ---------- */
  var dlg = null, els = {}, ctx = {}, opener = null, sending = false, kindIdx = -1;

  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "ecfb";
    dlg.setAttribute("aria-labelledby", "ecfb-title");
    var kinds = KINDS.map(function (k, i) {
      return '<label class="ecfb-kind"><input type="radio" name="ecfb-kind" value="' + k.v + '" data-i="' + i + '">' +
        '<span class="ecfb-kbox"><b>' + esc(k.t) + '</b><small>' + esc(k.s) + "</small></span></label>";
    }).join("");
    dlg.innerHTML =
      '<div class="ecfb-card">' +
        '<div class="ecfb-head">' +
          '<h2 class="ecfb-title" id="ecfb-title">Suggest or report</h2>' +
          '<button class="ecfb-x" type="button" aria-label="Close">' + X_ICON + "</button>" +
        "</div>" +
        '<form class="ecfb-form" novalidate>' +
          '<div class="ecfb-scroll">' +
            '<p class="ecfb-about" id="ecfb-about"></p>' +
            '<fieldset class="ecfb-kinds"><legend class="ecfb-lbl">What kind of note is it?</legend>' +
              '<div class="ecfb-grid">' + kinds + "</div>" +
              '<p class="ecfb-err" id="ecfb-kind-err" hidden></p>' +
            "</fieldset>" +
            '<label class="ecfb-lbl" for="ecfb-msg" id="ecfb-msg-lbl">Tell us more</label>' +
            '<p class="ecfb-help" id="ecfb-help">Pick a kind above, then write a few words.</p>' +
            '<textarea class="ecfb-msg" id="ecfb-msg" name="message" rows="5" maxlength="' + MAX + '" ' +
              'aria-describedby="ecfb-help ecfb-msg-err ecfb-count"></textarea>' +
            '<div class="ecfb-under"><p class="ecfb-err" id="ecfb-msg-err" hidden></p><p class="ecfb-count" id="ecfb-count" aria-live="polite"></p></div>' +
            '<div class="ecfb-hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          "</div>" +
          '<div class="ecfb-foot">' +
            '<div class="ecfb-status" id="ecfb-status" role="status" aria-live="polite"></div>' +
            '<div class="ecfb-actions"><button class="ecfb-send" type="submit">Send</button></div>' +
            '<p class="ecfb-privacy">Goes to the course team. Don\'t include personal information.</p>' +
            '<p class="ecfb-sent-with">Sent along with it: the page, the figure and its question, your screen size and browser type.</p>' +
          "</div>" +
        "</form>" +
        '<div class="ecfb-done" hidden>' +
          '<h2 class="ecfb-done-title" tabindex="-1">Thanks. Your note is on its way.</h2>' +
          '<p>The course team reads every note. Notes are anonymous, so there is no reply.</p>' +
          '<div class="ecfb-actions"><button class="ecfb-close2" type="button">Close</button>' +
          '<button class="ecfb-again" type="button">Send another</button></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(dlg);

    els.form = dlg.querySelector(".ecfb-form");
    els.about = dlg.querySelector("#ecfb-about");
    els.radios = [].slice.call(dlg.querySelectorAll('input[name="ecfb-kind"]'));
    els.kindErr = dlg.querySelector("#ecfb-kind-err");
    els.msg = dlg.querySelector("#ecfb-msg");
    els.msgLbl = dlg.querySelector("#ecfb-msg-lbl");
    els.help = dlg.querySelector("#ecfb-help");
    els.msgErr = dlg.querySelector("#ecfb-msg-err");
    els.count = dlg.querySelector("#ecfb-count");
    els.hp = dlg.querySelector('input[name="website"]');
    els.status = dlg.querySelector("#ecfb-status");
    els.send = dlg.querySelector(".ecfb-send");
    els.done = dlg.querySelector(".ecfb-done");
    els.doneTitle = dlg.querySelector(".ecfb-done-title");

    els.radios.forEach(function (r) {
      r.addEventListener("change", function () { setKind(+r.getAttribute("data-i")); });
    });
    els.msg.addEventListener("input", function () { updateCount(); if (!els.msgErr.hidden) showErr(els.msgErr, ""); });
    els.form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    dlg.querySelector(".ecfb-x").addEventListener("click", close);
    dlg.querySelector(".ecfb-close2").addEventListener("click", close);
    dlg.querySelector(".ecfb-again").addEventListener("click", function () { reset(true); focusFirst(); });

    // Esc: the browser fires "cancel"; close our way so focus goes back where it came from
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    // a click on the dim backdrop closes, unless there is unsent writing
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg && !(els.msg.value.trim() && els.done.hidden)) close();
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Tab") trapTab(e);
      // page shortcuts (flashcards flip on Space, rate on 1 to 3; figures have keys too) must not fire while typing here
      e.stopPropagation();
    });
    dlg.addEventListener("keyup", function (e) { e.stopPropagation(); });
    dlg.addEventListener("keypress", function (e) { e.stopPropagation(); });
  }

  function focusables() {
    return [].slice.call(dlg.querySelectorAll("button, input, select, textarea, [tabindex]")).filter(function (el) {
      if (el.disabled || el.tabIndex < 0 || el.closest("[hidden]") || el.closest(".ecfb-hp")) return false;
      if (el.type === "radio" && !el.checked && els.radios.some(function (r) { return r.checked; })) return false;
      if (el.type === "radio" && !el.checked && el !== els.radios[0]) return false;
      return el.getClientRects().length > 0;
    });
  }
  function trapTab(e) {
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  function setKind(i) {
    kindIdx = i;
    var k = KINDS[i];
    els.msgLbl.textContent = k.label;
    els.help.textContent = k.help;
    showErr(els.kindErr, "");
  }

  function updateCount() {
    var n = els.msg.value.length;
    els.count.textContent = n > MAX - 300 ? n + " of " + MAX + " characters" : "";
  }

  function showErr(el, msg) {
    el.textContent = msg;
    el.hidden = !msg;
    if (el === els.msgErr) els.msg.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function setStatus(kind, html) {
    els.status.className = "ecfb-status" + (kind ? " is-" + kind : "");
    els.status.innerHTML = html || "";
  }

  function setSending(v) {
    sending = v;
    els.send.disabled = v;
    els.send.textContent = v ? "Sending..." : (els.status.className.indexOf("is-error") >= 0 || els.status.className.indexOf("is-wait") >= 0 ? "Try again" : "Send");
    els.form.setAttribute("aria-busy", v ? "true" : "false");
    els.msg.readOnly = v;
  }

  function reset(clearText) {
    els.form.hidden = false;
    els.done.hidden = true;
    setStatus("", "");
    showErr(els.kindErr, ""); showErr(els.msgErr, "");
    if (clearText) {
      els.msg.value = "";
      els.radios.forEach(function (r) { r.checked = false; });
      kindIdx = -1;
      els.msgLbl.textContent = "Tell us more";
      els.help.textContent = "Pick a kind above, then write a few words.";
    }
    sending = false;
    els.send.disabled = false;
    els.send.textContent = "Send";
    els.msg.readOnly = false;
    updateCount();
  }

  function focusFirst() {
    var checked = els.radios.filter(function (r) { return r.checked; })[0];
    (checked || els.radios[0]).focus();
  }

  function aboutText(c) {
    if (c.figure) return "About <b>Figure " + esc(c.figure) + (c.figureTitle ? ": " + esc(c.figureTitle) : "") + "</b>";
    return "About <b>" + esc(pageLabel()) + "</b>";
  }

  function open(o) {
    o = o || {};
    if (!dlg) build();
    ensureCss();
    if (window.EC224Ask && window.EC224Ask.isOpen && window.EC224Ask.isOpen()) window.EC224Ask.close();
    var c = o.figure != null || o.question != null ? o : pageContext();
    ctx = { figure: c.figure || "", figureTitle: c.figureTitle || "", question: c.question || "", section: c.section || "", anchor: c.anchor || "" };
    opener = o.opener || document.activeElement;
    // a fresh form, unless the last attempt failed and its text is still there
    if (!els.done.hidden) reset(true); else if (!sending) { setStatus("", ""); setSending(false); }
    els.about.innerHTML = aboutText(ctx);
    if (!dlg.open) {
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
    }
    focusFirst();
  }

  function close() {
    if (!dlg) return;
    if (dlg.open) { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
    var back = opener && document.contains(opener) ? opener : null;
    opener = null;
    if (back && back.focus) back.focus();
    if (!els.done.hidden) reset(true);
  }

  /* ---------- sending ---------- */
  function payload() {
    var anchor = ctx.anchor && /^[A-Za-z][\w:.-]*$/.test(ctx.anchor) ? "#" + ctx.anchor : "";
    return {
      kind: KINDS[kindIdx].v,
      message: els.msg.value.trim(),
      role: "",
      page: location.origin + location.pathname + anchor,
      section: ctx.section, figure: ctx.figure, figureTitle: ctx.figureTitle, question: ctx.question,
      viewport: window.innerWidth + "x" + window.innerHeight,
      ua: navigator.userAgent,
      hp: els.hp.value,
    };
  }

  function submit() {
    if (sending) return;
    var bad = false;
    if (kindIdx < 0) { showErr(els.kindErr, "Pick the kind of note first."); bad = true; }
    var n = els.msg.value.trim().length;
    if (n < MIN) { showErr(els.msgErr, n ? "Please write a little more, at least " + MIN + " characters." : "Please write a few words first."); bad = bad || "msg"; }
    else if (n > MAX) { showErr(els.msgErr, "That is over " + MAX + " characters. Please shorten it."); bad = bad || "msg"; }
    if (bad) { (bad === true && kindIdx < 0 ? els.radios[0] : els.msg).focus(); return; }

    setStatus("", "");
    setSending(true);
    setStatus("busy", "Sending your note...");
    var ctl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
      signal: ctl ? ctl.signal : undefined,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, ok: res.ok, j: j || {} }; });
    }).then(function (r) {
      clearTimeout(timer);
      if (r.ok && r.j.ok) return sent();
      if (r.status === 429) return failed("wait", "<b>You have sent a few notes in a short time.</b> Please wait a minute, then try again.");
      if (r.status === 400 && r.j.error === "message_too_short") { failed("", ""); showErr(els.msgErr, "Please write a little more, at least " + MIN + " characters."); els.msg.focus(); return; }
      if (r.status === 400 && r.j.error === "message_too_long") { failed("", ""); showErr(els.msgErr, "That is over " + MAX + " characters. Please shorten it."); els.msg.focus(); return; }
      failed("error", "<b>Couldn't send. Please try again later.</b> Your note is still here.");
    }, function () {
      clearTimeout(timer);
      failed("error", "<b>Couldn't send. Please try again later.</b> Your note is still here.");
    });
  }

  function failed(kind, html) {
    setStatus(kind, html);
    setSending(false);
    if (kind) els.send.focus();
  }

  function sent() {
    setSending(false);
    setStatus("", "");
    els.form.hidden = true;
    els.done.hidden = false;
    els.doneTitle.focus();
  }

  /* ---------- entry points ---------- */
  function figLink(fig) {
    var head = fig.querySelector(".fig-head");
    if (!head) return;
    var ask = head.querySelector(".ecask-fig");
    var b = head.querySelector(".ecfb-fig");
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "ecfb-fig";
      b.innerHTML = '<span class="ecfb-ic">' + FLAG_ICON + "</span><span>Suggest or report</span>";
      var c0 = figureContext(fig);
      b.setAttribute("aria-label", "Suggest a change or report a problem with Figure " + c0.figure);
      b.setAttribute("aria-haspopup", "dialog");
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var c = figureContext(fig);   // read now: the question changes with "Try a new one"
        c.opener = b;
        open(c);
      });
      if (ask) ask.insertAdjacentElement("afterend", b); else head.appendChild(b);
    } else if (ask && b.previousElementSibling !== ask) {
      ask.insertAdjacentElement("afterend", b);
    }
  }

  function scanFigs() {
    var figs = document.querySelectorAll(".kfig");
    for (var i = 0; i < figs.length; i++) figLink(figs[i]);
  }

  function footerLink() {
    if (document.querySelector(".ecfb-footlink")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ecfb-footlink";
    b.textContent = "Feedback";
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-label", "Feedback: suggest a change or report a problem on this page");
    b.addEventListener("click", function () { var c = pageContext(); c.opener = b; open(c); });

    var foots = [].slice.call(document.querySelectorAll("footer")).filter(function (f) { return !f.closest(".kfig, dialog, .ecfab-wrap"); });
    var foot = foots[foots.length - 1];
    if (foot) {
      var row = foot.querySelector(":scope > div") || foot;
      var hasSep = !!row.querySelector(".foot-sep");
      if (hasSep) { var sep = document.createElement("span"); sep.className = "foot-sep"; row.appendChild(sep); row.appendChild(document.createTextNode(" ")); }
      else if (row.lastChild) row.appendChild(document.createTextNode(" "));
      row.appendChild(b);
      return;
    }
    // no footer on this page: one quiet line at the end
    var strip = document.createElement("div");
    strip.className = "ecfb-strip";
    strip.setAttribute("role", "contentinfo");
    var p = document.createElement("p");
    p.appendChild(document.createTextNode("Something wrong or unclear on this page? "));
    p.appendChild(b);
    strip.appendChild(p);
    var main = document.querySelector("main");
    (main || document.body).appendChild(strip);
  }

  function start() {
    ensureCss();
    footerLink();
    scanFigs();
    // the kit mounts its figures at the end of <body>, and ask-figures.js adds its link then; follow for a while
    if ("MutationObserver" in window) {
      var queued = false;
      var mo = new MutationObserver(function () {
        if (queued) return; queued = true;
        requestAnimationFrame(function () { queued = false; scanFigs(); });
      });
      mo.observe(document.body, { subtree: true, childList: true });
      setTimeout(function () { mo.disconnect(); }, 10000);
    }
  }

  window.EC224Feedback = { open: open, close: close, endpoint: function () { return ENDPOINT; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
