/* polish.js - pointer reactivity for the EC224 hub pages.
 *
 * Publishes the pointer's position INSIDE a card as CSS custom properties
 * (--mx / --my, in %), so shared.css can paint a soft spotlight that follows
 * the cursor across the card. This is the "reactivity with the cursor" from the
 * reference portfolio, minus the part that would hurt here.
 *
 * DELIBERATELY NOT a custom cursor. The reference site replaces the native
 * cursor with a dot and a lerping ring. On a course site that would be actively
 * harmful: the figures rely on native cursor changes (grab, ew-resize, pointer)
 * to tell a student that a dot, a slider handle or a curve is draggable.
 * Replacing the cursor destroys that affordance. So the native cursor stays,
 * and the reactivity is expressed by the surface instead of the pointer.
 *
 * Scoped to hub chrome only (.week-card on index, .hub-btn on week hubs).
 * Neither class exists on a *-viz page, so figure interaction is untouched.
 *
 * Respects prefers-reduced-motion: no tracking is attached at all.
 * Pointer-coarse (touch) devices are skipped too: there is no hover there, so
 * the listeners would only cost battery.
 *
 * Self-contained, no deps. Safe on pages with no cards.
 */
(function () {
  'use strict';

  var SEL = '.week-card:not(.upcoming), .hub-btn';

  function init() {
    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coarse = window.matchMedia &&
                 window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (reduce || coarse) return;

    var cards = document.querySelectorAll(SEL);
    if (!cards.length) return;

    cards.forEach(function (card) {
      var raf = 0, px = 50, py = 50;

      function paint() {
        raf = 0;
        card.style.setProperty('--mx', px + '%');
        card.style.setProperty('--my', py + '%');
      }

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        px = ((e.clientX - r.left) / r.width) * 100;
        py = ((e.clientY - r.top) / r.height) * 100;
        // Coalesce to one write per frame. pointermove fires far faster than
        // the compositor paints, and each write invalidates the gradient.
        if (!raf) raf = requestAnimationFrame(paint);
      });

      card.addEventListener('pointerleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        // Park the spotlight back at centre so the next hover fades in from
        // the middle instead of snapping from wherever the pointer last left.
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
