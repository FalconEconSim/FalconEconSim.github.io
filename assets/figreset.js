/* figreset.js
 * A way back to the starting point, on every figure that has controls.
 *
 * A student drags four sliders, flips two modes, and now has no idea what the
 * figure looked like when they arrived. Some figures already had a Reset of
 * their own; most did not, and several of the ones that did only reset part of
 * themselves ("Reset steps", "Reset (P* = $12)").
 *
 * So: one control per figure, doing the same thing everywhere. It records what
 * every control in the section held once the page had finished setting itself
 * up, and puts them all back.
 *
 * WHAT IT RESTORES
 *   - every slider, number box, text box, select, checkbox and radio in the
 *     section, including the slider's min and max, because some figures
 *     re-range their own sliders as other controls move
 *   - mode and toggle buttons, by clicking the one that needs clicking rather
 *     than by setting a class, so the figure's own handler runs and redraws
 *
 * STATE WITH NO CONTROL
 *   Some figures keep state in their own variables that no control exposes:
 *   week 5's bakery hires, week 8's step counters, week 3's dragged point.
 *   Those have a Reset of their own, and this presses it as part of the job.
 *   Pressing it first and restoring the controls afterwards, because two of
 *   those buttons animate the sliders to their own defaults on the way.
 *
 *   The reverse gap is why this file exists at all: several of those bespoke
 *   resets never touch the sliders. Fig 5.9's clears the hires and leaves the
 *   wage where the reader dragged it, and Fig 7.7's restarts the walkthrough
 *   and leaves the scenario. Neither figure had a way back before this.
 */
(function () {
  'use strict';
  if (window.__ec224FigReset) return;
  window.__ec224FigReset = true;

  /* the classes the pages use to mark a mode button as the chosen one */
  var STATE_CLASSES = ['on', 'active', 'revealed', 'selected', 'active-rate'];

  function isControl(el) {
    var t = el.tagName.toLowerCase();
    if (t === 'select' || t === 'textarea') return true;
    if (t !== 'input') return false;
    return ['range', 'number', 'text', 'checkbox', 'radio'].indexOf(el.type) >= 0;
  }

  function buttonOn(b) {
    for (var i = 0; i < STATE_CLASSES.length; i++) {
      if (b.classList.contains(STATE_CLASSES[i])) return true;
    }
    return false;
  }

  /* The figure's own reset, if it has one. Pressed as part of a full reset,
     because it clears the state no control exposes. */
  function ownReset(sec) {
    var found = null;
    sec.querySelectorAll('button').forEach(function (b) {
      if (found || b.classList.contains('fig-reset')) return;
      if (/reset/i.test(b.textContent || '')) found = b;
    });
    return found;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function snapshot(sec) {
    var controls = [];
    sec.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!isControl(el)) return;
      controls.push({
        el: el,
        value: el.value,
        checked: el.checked,
        min: el.getAttribute('min'),
        max: el.getAttribute('max')
      });
    });
    var buttons = [];
    sec.querySelectorAll('button').forEach(function (b) {
      if (b.classList.contains('fig-reset')) return;
      buttons.push({ el: b, on: buttonOn(b) });
    });
    return { controls: controls, buttons: buttons };
  }

  function putBack(state) {
    state.controls.forEach(function (c) {
      var el = c.el;
      if (el.type === 'checkbox' || el.type === 'radio') { el.checked = c.checked; return; }
      /* the range first: a value outside the current range would be clamped */
      if (c.min !== null) el.setAttribute('min', c.min);
      if (c.max !== null) el.setAttribute('max', c.max);
      el.value = c.value;
    });
    state.controls.forEach(function (c) { try { fire(c.el); } catch (e) {} });
  }

  function restore(state, sec, done) {
    /* The figure's own reset first, where it has one: it clears the state no
       control exposes, and two of them animate the sliders to their own
       defaults on the way, which would otherwise land on top of this. */
    var own = ownReset(sec);
    if (own) { try { own.click(); } catch (e) {} }

    /* Twice. Some figures re-range one slider from another: week 8's market
       price takes its min and max from the demand intercept, so restoring the
       intercept rewrites the price slider after it was already put back. A
       second round settles it. */
    putBack(state);
    putBack(state);

    /* Then the mode buttons. Click rather than set a class, so the page's own
       handler runs. Re-check between clicks: in a group where one button is
       the chosen one, clicking the original clears its siblings, and clicking
       them too would toggle them straight back on. */
    for (var pass = 0; pass < 3; pass++) {
      var acted = false;
      for (var i = 0; i < state.buttons.length; i++) {
        var b = state.buttons[i];
        if (buttonOn(b.el) === b.on) continue;
        try { b.el.click(); acted = true; } catch (e) {}
      }
      if (!acted) break;
    }

    /* A button that tweens its sliders is still moving them. Put them back
       once more when it has finished. */
    if (own) setTimeout(function () { putBack(state); settle(state); if (done) done(); }, 900);
    else { settle(state); if (done) done(); }
  }

  /* Take the mode buttons as they now stand as the new baseline.

     A few of these cannot be returned to how they loaded, because how they
     loaded is not a state clicking can reach: Fig 8.4 shows step 0 with no
     step button highlighted until something is pressed, and pressing its own
     "Reset steps" correctly shows step 0 AND highlights it. The figure is at
     its starting point; the highlight is an improvement on it. Without this
     the control would read "still changed" for the rest of the session and
     never go quiet again. The control VALUES are never re-baselined: those are
     the starting point and stay the starting point. */
  function settle(state) {
    state.buttons.forEach(function (b) { b.on = buttonOn(b.el); });
  }

  /* Is the figure already as it started? Used to keep the control quiet until
     there is something to undo, which is also how a student discovers it. */
  function changed(state) {
    try {
      for (var i = 0; i < state.controls.length; i++) {
        var c = state.controls[i];
        if (c.el.type === 'checkbox' || c.el.type === 'radio') {
          if (c.el.checked !== c.checked) return true;
        } else if (String(c.el.value) !== String(c.value)) return true;
      }
      for (var j = 0; j < state.buttons.length; j++) {
        if (buttonOn(state.buttons[j].el) !== state.buttons[j].on) return true;
      }
      return false;
    } catch (e) { return true; }   /* fail open: an enabled button is harmless */
  }

  function whereToPut(sec) {
    var rows = sec.querySelectorAll('.ctrl-row');
    if (rows.length) return rows[rows.length - 1];
    var inner = sec.querySelector('.fig-bay-inner');
    return inner || sec.querySelector('.fig-bay') || null;
  }

  function mount(sec) {
    var state = snapshot(sec);
    if (!state.controls.length) return;
    var host = whereToPut(sec);
    if (!host) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn fig-reset';
    btn.textContent = 'Reset figure';
    btn.title = 'Put every control on this figure back to where it started';
    btn.setAttribute('aria-label', 'Reset this figure to its starting values');
    btn.addEventListener('click', function () {
      restore(state, sec, sync);
      sync();
      btn.blur();
    });
    host.appendChild(btn);

    function sync() { btn.disabled = !changed(state); }
    sync();

    /* Anything the reader does inside this figure may change the answer. */
    ['input', 'change', 'click'].forEach(function (ev) {
      sec.addEventListener(ev, function () { setTimeout(sync, 0); }, true);
    });
  }

  function start() {
    document.querySelectorAll('section.sec').forEach(function (sec) {
      try { mount(sec); } catch (e) {}
    });
  }

  /* After the figures have set themselves up: several assign slider values in
     their own init, and those are the starting point, not whatever the markup
     happened to say. */
  function whenReady() {
    if (document.readyState === 'complete') setTimeout(start, 500);
    else window.addEventListener('load', function () { setTimeout(start, 500); });
  }
  whenReady();
})();
