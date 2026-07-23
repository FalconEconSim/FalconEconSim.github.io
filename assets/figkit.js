/* figkit.js - shared figure motion helpers (DESIGN 6).
 *
 * A button that moves a curve tweens it. A slider does not: nothing animates
 * during a drag, because a transition fights the pointer (DESIGN 6.3).
 *
 * Extracted from week5-viz, which is where these were first built for Fig 5.6's
 * "substitute along the isoquant" versus "shift the isoquant" pair, so the
 * other figure pages do not each carry a copy that can drift.
 *
 * Everything here honours prefers-reduced-motion by jumping straight to the
 * final state.
 */
(function () {
  'use strict';

  var DUR_VALUE = 450;   // --dur-value: a data value changed
  var DUR_STEP  = 700;   // --dur-step:  a narrative step in a sequenced figure

  // Polynomial stand-ins for the CSS beziers; canvas cannot use a CSS easing.
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  var running = {};

  /* Drives onStep(p) with p going 0 -> 1 over dur ms, then once more at exactly
     1 so the final state is never a rounding error. `key` makes a second press
     of the same button supersede the first rather than running two tweens over
     one variable. */
  function ecTween(key, dur, onStep, ease) {
    if (running[key]) cancelAnimationFrame(running[key]);
    if (reduced()) { onStep(1); return; }
    var e = ease || easeInOut;
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      onStep(e(p));
      if (p < 1) running[key] = requestAnimationFrame(frame);
      else { delete running[key]; onStep(1); }
    }
    running[key] = requestAnimationFrame(frame);
  }

  /* Move one or more range/number inputs to new values over --dur-value,
     calling redraw() every frame. This is the common shape of a Reset or a
     Solve button: it used to snap, so the reader never saw which way the
     figure moved or how far.

     targets: { inputId: finalValue, ... }
     Any input that is missing is skipped rather than throwing, so a shared
     handler can list ids that only exist on some figures. */
  function ecSetSliders(key, targets, redraw) {
    var ids = Object.keys(targets);
    var from = {};
    var live = [];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      var a = parseFloat(el.value);
      var b = parseFloat(targets[ids[i]]);
      if (!isFinite(a) || !isFinite(b)) { el.value = targets[ids[i]]; continue; }
      from[ids[i]] = a;
      live.push(ids[i]);
    }
    if (!live.length) { if (redraw) redraw(); return; }
    ecTween(key, DUR_VALUE, function (p) {
      for (var j = 0; j < live.length; j++) {
        var id = live[j];
        var el2 = document.getElementById(id);
        if (!el2) continue;
        var v = from[id] + (parseFloat(targets[id]) - from[id]) * p;
        // Keep the input's own step: a whole-number control should not show
        // fractions mid-tween.
        var step = parseFloat(el2.step);
        el2.value = (isFinite(step) && step >= 1) ? Math.round(v) : v;
      }
      if (redraw) redraw();
    });
  }

  window.ecTween = ecTween;
  window.ecSetSliders = ecSetSliders;
  window.ecEaseInOut = easeInOut;
  window.ecEaseOut = easeOut;
  window.EC_DUR_VALUE = DUR_VALUE;
  window.EC_DUR_STEP = DUR_STEP;
})();
