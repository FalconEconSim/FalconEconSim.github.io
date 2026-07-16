/* deltabar.js - shared "old / new / change" readout for shift figures.
 *
 * Shows where a value STARTED, where it is NOW, and how far it moved, e.g.
 *     Equilibrium price   was 52.60   now 59.70   (up 7.10)
 * This is the readout Prof. Sunder liked on the supply-demand-explorer
 * reference figure. Pairs with the D'/dashed-original curve convention:
 * the dashed curve shows where it started, this shows by how much it moved.
 *
 * Usage (one line of markup, one call per redraw):
 *     <div id="v3-delta" class="delta-bar"></div>
 *
 *     ecDelta('v3-delta', [
 *       { label: 'Quantity demanded X*', old: 20, now: 25, dp: 2 },
 *       { label: 'Equilibrium price',    old: 52.6, now: 59.7, dp: 2, prefix: '$' },
 *     ]);
 *
 * Item fields:
 *   label   required, what moved
 *   old     required, baseline value
 *   now     required, current value
 *   dp      decimals to display (default 2)
 *   prefix  unit prefix, e.g. '$' (default '')
 *   suffix  unit suffix, e.g. '%' (default '')
 *   eps     treat |now-old| below this as "no change" (default 0.005)
 *   invert  true if a DECREASE is the good/expected direction (colour only)
 *
 * When old and now are equal the row renders in a neutral "no change yet"
 * state rather than showing "up 0.00", so a figure at its baseline does not
 * look like it moved.
 *
 * Self-contained: injects its own CSS on first use, reads the site's theme
 * variables so it follows light/dark automatically. No build step, no deps.
 */
(function () {
  'use strict';

  var STYLE_ID = 'ec-deltabar-css';

  function ensureCss() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.delta-bar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.8rem;}',
      '.delta-item{flex:1 1 200px;min-width:0;border:1px solid var(--rule);',
      '  border-radius:6px;padding:0.5rem 0.65rem;background:var(--off-white);}',
      '.delta-label{font-size:0.7rem;font-weight:600;letter-spacing:0.06em;',
      '  text-transform:uppercase;color:var(--muted);margin-bottom:0.3rem;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.delta-nums{font-family:var(--mono);font-size:0.9rem;display:flex;',
      '  align-items:baseline;gap:0.35rem;flex-wrap:wrap;}',
      '.delta-was{color:var(--muted);text-decoration:line-through;',
      '  text-decoration-thickness:1px;opacity:0.75;}',
      '.delta-arrow{color:var(--muted);font-size:0.8rem;}',
      '.delta-now{color:var(--text);font-weight:700;}',
      '.delta-chg{font-family:var(--mono);font-size:0.78rem;font-weight:600;',
      '  margin-top:0.2rem;display:flex;align-items:center;gap:0.25rem;}',
      /* Use the site's semantic tokens rather than inventing another red.
         Fallbacks keep this working if shared.css is ever not loaded, and the
         dark-mode values come free because the tokens are re-declared under
         html[data-theme="dark"]. */
      '.delta-up{color:var(--green,#16a34a);}',
      '.delta-down{color:var(--red,#c0392b);}',
      '.delta-flat{color:var(--muted);font-weight:500;}',
      /* Stack to one column on phones so the mono numbers never overflow. */
      '@media (max-width:480px){.delta-item{flex:1 1 100%;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* The sign belongs OUTSIDE the unit prefix: a loss is "-$1.47", never
     "$-1.47". Matters on figures where a value can go negative, e.g. firm
     profit during the long-run exit phase. */
  function fmt(v, dp, prefix, suffix) {
    var n = Number(v);
    var sign = n < 0 ? '-' : '';
    return sign + prefix + Math.abs(n).toFixed(dp) + suffix;
  }

  function row(it) {
    var dp = it.dp == null ? 2 : it.dp;
    var prefix = it.prefix || '';
    var suffix = it.suffix || '';
    var eps = it.eps == null ? 0.005 : it.eps;
    var diff = Number(it.now) - Number(it.old);
    var flat = Math.abs(diff) < eps;

    /* Nothing moved: show the value once. Rendering "$3.00 -> $3.00" with the
       old value struck through says "this changed" in the exact case where it
       did not. */
    if (flat) {
      return '<div class="delta-item">' +
               '<div class="delta-label" title="' + esc(it.label) + '">' + esc(it.label) + '</div>' +
               '<div class="delta-nums"><span class="delta-now">' + fmt(it.now, dp, prefix, suffix) + '</span></div>' +
               '<div class="delta-chg delta-flat">no change yet</div>' +
             '</div>';
    }

    var chg;
    {
      var up = diff > 0;
      // "good direction" only drives colour, never the words
      var good = it.invert ? !up : up;
      var cls = good ? 'delta-up' : 'delta-down';
      var arrow = up ? '▲' : '▼';
      var word = up ? 'up' : 'down';
      chg = '<div class="delta-chg ' + cls + '">' +
            '<span aria-hidden="true">' + arrow + '</span>' +
            '<span>' + word + ' ' + fmt(Math.abs(diff), dp, prefix, suffix) + '</span>' +
            '</div>';
    }

    return '<div class="delta-item">' +
             '<div class="delta-label" title="' + esc(it.label) + '">' + esc(it.label) + '</div>' +
             '<div class="delta-nums">' +
               '<span class="delta-was">' + fmt(it.old, dp, prefix, suffix) + '</span>' +
               '<span class="delta-arrow" aria-hidden="true">→</span>' +
               '<span class="delta-now">' + fmt(it.now, dp, prefix, suffix) + '</span>' +
             '</div>' + chg +
           '</div>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* el: element id string or the element itself. items: array (see header). */
  window.ecDelta = function (el, items) {
    ensureCss();
    var node = typeof el === 'string' ? document.getElementById(el) : el;
    if (!node) return;
    node.classList.add('delta-bar');
    // Screen readers should hear the change, but not on every slider tick.
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    node.innerHTML = (items || []).map(row).join('');
  };
})();
