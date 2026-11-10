/* The course AI as a drawer, opened from the top bar's "Ask" button and from each figure's
 * "Ask about this figure" link (../assets/ask-figures.js calls window.EC224Ask.open).
 * A variant of ../assets/ask-widget.js for x/: same chat (EC224Bot.mountThread from
 * ../assets/chatbot.js, same worker, same starters), but no floating button: the AI is asked
 * for from where the question comes up. "Full page" goes to x/ask.html. */
(function () {
  'use strict';
  if (window.__ec224Fab) return;
  window.__ec224Fab = true;   // keeps the main site's floating widget out if something loads it

  var FULL_PAGE = 'ask.html';
  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var STARTERS = {
    1: ['What does the MRS measure?', 'Why is a sunk cost ignored in a decision?'],
    2: ["Why can't indifference curves cross?", 'What does the MRS measure?'],
    3: ['What is the difference between Slutsky and Hicks?', 'How can I tell a shift in demand from a movement along it?'],
    4: ['When does raising the price raise revenue?', 'What is the difference between point and arc elasticity?'],
    5: ['Why does the MRTS diminish along an isoquant?', 'How do returns to scale differ from diminishing marginal product?'],
    6: ['Why is the long-run average cost curve an envelope?', 'How does a firm pick the cheapest mix of labor and capital?'],
    7: ['When should a competitive firm shut down?', "Why is the firm's supply curve part of its marginal cost curve?"],
    8: ['When is marginal revenue less than price?', 'What causes deadweight loss under monopoly?'],
    9: ['How does a two-part tariff capture consumer surplus?', 'Why is a natural monopoly hard to regulate?'],
    10: ['How does Stackelberg differ from Cournot?', 'Why do Hotelling competitors cluster in the middle?'],
    11: ['How does a Pigouvian tax fix an externality?', 'What does the Coase theorem say?'],
    12: ['Why can lemons drive good cars out of a market?', 'How does signaling separate worker types?'],
    all: ['What is the difference between Slutsky and Hicks?', 'Why does the MRTS diminish along an isoquant?', 'When is marginal revenue less than price?'],
  };
  var FIGURE_STARTERS = ['Explain the idea behind this figure', 'Give me a hint, not the answer'];

  function weekStarters() {
    var m = location.pathname.match(/week(\d+)/);
    return (m && STARTERS[+m[1]]) || STARTERS.all;
  }

  function build() {
    var Bot = window.EC224Bot;
    if (!Bot) { console.warn('[x] ask-drawer: EC224Bot not found'); return; }
    var scrim = document.createElement('div'); scrim.className = 'scrim';
    var d = document.createElement('aside');
    d.className = 'ask-drawer'; d.id = 'ask-drawer';
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'false'); d.setAttribute('aria-labelledby', 'ask-drawer-t');
    d.innerHTML =
      '<div class="dh"><span class="ea-mark">' + Bot.MARK + '</span>' +
      '<div><h2 id="ask-drawer-t">Ask the course AI</h2><p class="sub">Answers from the course pages and textbook</p></div>' +
      '<span class="sp"></span><a class="top-link full" href="' + FULL_PAGE + '">Full page</a>' +
      '<button type="button" class="x" aria-label="Close">' + X_ICON + '</button></div>' +
      '<div class="db"></div>';
    document.body.appendChild(scrim); document.body.appendChild(d);
    var full = d.querySelector('.full');
    var handle = Bot.mountThread(d.querySelector('.db'), { bare: true, starters: weekStarters(), placeholder: 'Ask about the course' });
    handle.input.addEventListener('input', function () { var q = handle.input.value.trim(); full.setAttribute('href', FULL_PAGE + (q ? '?q=' + encodeURIComponent(q) : '')); });

    var open = false, opener = null;
    function setOpen(v, o) {
      if (v === open) { if (v) handle.focus(); return; }
      open = v;
      d.classList.toggle('open', v); scrim.classList.toggle('on', v);
      document.querySelectorAll('[data-ask]').forEach(function (b) { b.setAttribute('aria-expanded', v ? 'true' : 'false'); });
      if (v) { opener = o || document.activeElement; setTimeout(function () { handle.focus(); }, 60); }
      else { var back = opener && document.contains(opener) ? opener : null; opener = null; if (back) back.focus(); }
    }
    d.querySelector('.x').addEventListener('click', function () { setOpen(false); });
    scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); } });
    document.querySelectorAll('[data-ask]').forEach(function (b) {
      b.setAttribute('aria-controls', 'ask-drawer'); b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function (e) { e.preventDefault(); if (open) { setOpen(false); return; } handle.setContext(null); if (!handle.hasTurns()) handle.setStarters(weekStarters()); setOpen(true, b); });
    });

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
