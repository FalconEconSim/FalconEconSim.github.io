/* living.js: the reactive-document kit behind v4.
   Scrubbable numbers (drag, tap for a stepper, arrow keys), inline choices,
   two-way hover links between words and geometry, and a tiny SVG chart helper.
   Plain JS, no dependencies. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- formatting ---------------- */
  function money(v) {
    var s = Math.round(Math.abs(v)).toLocaleString('en-US');
    return (v < 0 ? '−' : '') + '$' + s;
  }
  function num(v) { return Math.round(v).toLocaleString('en-US'); }
  var FMT = { money: money, num: num };

  /* An output number in the prose: coloured, linked to geometry. */
  function out(link, text, color) {
    return '<b class="out c-' + (color || 'ink') + '" data-link="' + link + '">' + text + '</b>';
  }

  /* ---------------- the hint ---------------- */
  var hintEl = null, hintSeen = false;
  try { hintSeen = localStorage.getItem('lv4-hint-seen') === '1'; } catch (e) { /* storage blocked */ }
  function markUsed() {
    if (hintSeen) return;
    hintSeen = true;
    try { localStorage.setItem('lv4-hint-seen', '1'); } catch (e) { /* ignore */ }
    if (hintEl) { hintEl.classList.remove('on'); setTimeout(function () { if (hintEl) hintEl.remove(); hintEl = null; }, 300); }
  }
  function showHint(span) {
    if (hintSeen || !span) return;
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.setAttribute('aria-hidden', 'true');
    hintEl.innerHTML = touch
      ? 'Tap a dotted number, or slide it <span class="arrows">↔</span>'
      : 'Drag a dotted number sideways <span class="arrows">↔</span>';
    document.body.appendChild(hintEl);
    function place() {
      if (!hintEl) return;
      var r = span.getBoundingClientRect();
      var w = hintEl.offsetWidth, h = hintEl.offsetHeight;
      var cx = r.left + r.width / 2 + window.scrollX;
      var left = Math.max(8 + window.scrollX, Math.min(cx - w / 2, window.scrollX + document.documentElement.clientWidth - w - 8));
      hintEl.style.left = left + 'px';
      hintEl.style.top = (r.bottom + window.scrollY + 12) + 'px';
      hintEl.style.setProperty('--ax', (cx - left) + 'px');
    }
    place();
    window.addEventListener('resize', place);
    // Show it only while its number sits in the upper part of the screen, clear of
    // the phone's docked graph; hide it again if the reader scrolls away.
    if ('IntersectionObserver' in window) {
      var timer = null;
      new IntersectionObserver(function (en) {
        if (!hintEl) return;
        clearTimeout(timer);
        if (en[0].isIntersecting) { place(); timer = setTimeout(function () { if (hintEl) hintEl.classList.add('on'); }, 600); }
        else hintEl.classList.remove('on');
      }, { rootMargin: window.innerWidth <= 860 ? '0px 0px -50% 0px' : '0px 0px -8% 0px' }).observe(span);
    } else setTimeout(function () { if (hintEl) hintEl.classList.add('on'); }, 700);
  }

  /* ---------------- stepper popover ---------------- */
  var stepper = null, stepperFor = null;
  function buildStepper() {
    stepper = document.createElement('div');
    stepper.className = 'stepper';
    stepper.hidden = true;
    stepper.innerHTML = '<button type="button" data-d="-1" aria-label="Decrease">−</button>' +
      '<span class="sbox" aria-hidden="true"><span class="sl"></span><span class="sv"></span></span>' +
      '<button type="button" data-d="1" aria-label="Increase">+</button>';
    document.body.appendChild(stepper);
    var held = null;
    function bump(d) { if (stepperFor) stepperFor._nudge(d); }
    stepper.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      e.preventDefault();
      var d = +b.dataset.d;
      bump(d);
      var t0 = setTimeout(function () { held = setInterval(function () { bump(d); }, 90); }, 420);
      function stop() { clearTimeout(t0); clearInterval(held); held = null; window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); }
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    });
    stepper.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var b = e.target.closest('button');
        if (b) { e.preventDefault(); bump(+b.dataset.d); }
      }
      if (e.key === 'Escape') { var s = stepperFor; closeStepper(); if (s) s.focus(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (!stepper.hidden && !stepper.contains(e.target) && e.target !== stepperFor) closeStepper();
    });
    window.addEventListener('resize', function () { if (stepperFor) placeStepper(); });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!stepperFor || ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; if (stepperFor) placeStepper(); });
    }, { passive: true });
  }
  function placeStepper() {
    var r = stepperFor.getBoundingClientRect();
    if (window.innerWidth <= 860) {
      // Phone: park the buttons just above the docked graph, so they cover
      // neither the number's sentence nor the picture it drives.
      var plot = stepperFor.closest('.fig').querySelector('.fig-plot').getBoundingClientRect();
      var hh = stepper.offsetHeight, ww = stepper.offsetWidth;
      stepper.classList.add('docked');
      stepper.style.left = Math.round((document.documentElement.clientWidth - ww) / 2) + 'px';
      stepper.style.top = Math.round(Math.min(plot.top, window.innerHeight) - hh - 10) + 'px';
      return;
    }
    stepper.classList.remove('docked');
    var w = stepper.offsetWidth;
    var cx = r.left + r.width / 2 + window.scrollX;
    var left = Math.max(8 + window.scrollX, Math.min(cx - w / 2, window.scrollX + document.documentElement.clientWidth - w - 8));
    stepper.style.left = left + 'px';
    var h = stepper.offsetHeight;
    stepper.style.top = (r.top - h - 10 > 0 ? r.top + window.scrollY - h - 10 : r.bottom + window.scrollY + 10) + 'px';
  }
  function syncStepper() {
    if (!stepperFor || stepper.hidden) return;
    var s = stepperFor;
    stepper.querySelector('.sv').textContent = s.textContent;
    stepper.querySelector('.sl').textContent = s.getAttribute('aria-label');
    stepper.querySelector('.sv').className = 'sv ' + s.className.split(' ').filter(function (c) { return c.indexOf('c-') === 0; }).join(' ');
    stepper.querySelector('[data-d="-1"]').disabled = s._value() <= s._min;
    stepper.querySelector('[data-d="1"]').disabled = s._value() >= s._max;
    placeStepper();
  }
  function openStepper(span) {
    if (!stepper) buildStepper();
    stepperFor = span;
    stepper.hidden = false;
    stepper.querySelector('[data-d="-1"]').setAttribute('aria-label', 'Decrease ' + span.getAttribute('aria-label'));
    stepper.querySelector('[data-d="1"]').setAttribute('aria-label', 'Increase ' + span.getAttribute('aria-label'));
    syncStepper();
    placeStepper();
  }
  function closeStepper() { if (stepper) stepper.hidden = true; stepperFor = null; }

  /* ---------------- figure ---------------- */
  function Figure(root, opts) {
    var fig = this;
    fig.root = root;
    fig.defaults = JSON.parse(JSON.stringify(opts.state));
    fig.state = JSON.parse(JSON.stringify(opts.state));
    fig.update = opts.update;          // (fig) -> void: fills clauses, draws chart
    fig.actions = opts.actions || {};
    fig.chart = opts.chart ? new Chart(root.querySelector('.plot'), opts.chart, fig) : null;
    fig.lit = null;

    root.querySelectorAll('.scrub').forEach(function (s) { bindScrub(fig, s); });
    root.querySelectorAll('.choice').forEach(function (c) { bindChoice(fig, c); });

    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (a && fig.actions[a.dataset.act]) { markUsed(); fig.actions[a.dataset.act](fig); }
      var r = e.target.closest('.reset');
      if (r) { closeStepper(); fig.state = JSON.parse(JSON.stringify(fig.defaults)); fig.render(); }
    });
    // Two-way hover: words <-> geometry. Pointer and keyboard focus both light links.
    function setLit(link) {
      if (link === fig.lit) return;
      fig.lit = link;
      fig.applyLit();
    }
    root.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return;
      var t = e.target.closest('[data-link]');
      setLit(t && root.contains(t) ? t.getAttribute('data-link') : null);
    });
    root.addEventListener('pointerleave', function () { if (!fig.dragging) setLit(null); });
    root.addEventListener('focusin', function (e) {
      var t = e.target.closest('[data-link]');
      setLit(t ? t.getAttribute('data-link') : null);
    });
    root.addEventListener('focusout', function () { setLit(null); });

    if (fig.chart && 'ResizeObserver' in window) {
      var lastW = 0;
      new ResizeObserver(function (en) {
        var w = Math.round(en[0].contentRect.width);
        if (w && w !== lastW) { lastW = w; fig.render(); }
      }).observe(root.querySelector('.plot'));
    }
    fig.render();
  }
  Figure.prototype.render = function () {
    var fig = this;
    fig.root.querySelectorAll('.scrub').forEach(function (s) { s._show(); });
    fig.root.querySelectorAll('.choice').forEach(function (c) { c._show(); });
    fig.update(fig);
    fig.applyLit();
    syncStepper();
  };
  Figure.prototype.clause = function (name, html) {
    var el = this.root.querySelector('[data-clause="' + name + '"]');
    if (el && el.innerHTML !== html) el.innerHTML = html;
  };
  Figure.prototype.applyLit = function () {
    var lit = this.lit, any = false, root = this.root;
    var keys = lit ? lit.split(' ') : [];
    this.root.querySelectorAll('[data-link]').forEach(function (el) {
      var mine = el.getAttribute('data-link').split(' ');
      var on = keys.length > 0 && mine.some(function (k) { return keys.indexOf(k) >= 0; });
      el.classList.toggle('lit', on);
      if (on && el.closest('svg') && !el.classList.contains('hit')) any = true;
    });
    this.root.classList.toggle('has-lit', any);
  };
  /* Animate one state key toward a target, stepping through legal values. */
  Figure.prototype.tween = function (key, target, ms) {
    var fig = this, from = fig.state[key];
    if (fig._tw) cancelAnimationFrame(fig._tw);
    if (reduceMotion || from === target) { fig.state[key] = target; fig.render(); return; }
    var step = fig.steps && fig.steps[key] || 1, t0 = null;
    ms = ms || Math.min(900, 180 + Math.abs(target - from) / step * 40);
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var v = Math.round((from + (target - from) * e) / step) * step;
      if (v !== fig.state[key]) { fig.state[key] = v; fig.render(); }
      if (p < 1) fig._tw = requestAnimationFrame(frame); else { fig.state[key] = target; fig.render(); fig._tw = null; }
    }
    fig._tw = requestAnimationFrame(frame);
  };

  function bindScrub(fig, span) {
    var k = span.dataset.k;
    var min = +span.dataset.min, max = +span.dataset.max, step = +span.dataset.step || 1;
    var fmt = FMT[span.dataset.fmt || 'num'];
    var unit = span.dataset.unit || '';
    fig.steps = fig.steps || {};
    fig.steps[k] = step;
    span._min = min; span._max = max;
    span._value = function () { return fig.state[k]; };
    span.tabIndex = 0;
    span.setAttribute('role', 'slider');
    span.setAttribute('aria-valuemin', min);
    span.setAttribute('aria-valuemax', max);
    if (!span.getAttribute('aria-label')) span.setAttribute('aria-label', k);
    span.setAttribute('aria-describedby', 'how-to');
    // Hold width at the widest value so the sentence does not jump while dragging.
    span.textContent = fmt(max).length >= fmt(min).length ? fmt(max) : fmt(min);
    span._show = function () {
      var v = fig.state[k];
      span.textContent = fmt(v);
      span.setAttribute('aria-valuenow', v);
      span.setAttribute('aria-valuetext', fmt(v) + (unit ? ' ' + unit : ''));
    };
    function set(v) {
      v = Math.round(v / step) * step;
      v = Math.max(min, Math.min(max, v));
      v = +v.toFixed(6);
      if (v !== fig.state[k]) { fig.state[k] = v; fig.render(); }
    }
    span._nudge = function (d) { markUsed(); set(fig.state[k] + d * step); };
    // Full range spans roughly 280px of drag, never finer than 6px a step.
    var pxPer = Math.max(6, Math.min(26, 280 / ((max - min) / step)));
    var sx = 0, sv = 0, moved = false, pid = null;
    span.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      pid = e.pointerId; sx = e.clientX; sv = fig.state[k]; moved = false;
      if (e.pointerType !== 'touch') { e.preventDefault(); span.focus({ preventScroll: true }); }
      try { span.setPointerCapture(pid); } catch (err) { /* ignore */ }
    });
    span.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 4) {
        moved = true; fig.dragging = true;
        span.classList.add('dragging');
        document.body.classList.add('is-dragging');
        closeStepper(); markUsed();
      }
      if (moved) set(sv + Math.round(dx / pxPer) * step);
    });
    function end(e) {
      if (e.pointerId !== pid) return;
      pid = null;
      if (moved) {
        span.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        fig.dragging = false;
      } else if (e.type === 'pointerup') {
        markUsed();
        if (stepperFor === span && !stepper.hidden) closeStepper(); else openStepper(span);
      }
    }
    span.addEventListener('pointerup', end);
    span.addEventListener('pointercancel', end);
    span.addEventListener('keydown', function (e) {
      var big = Math.max(step, Math.round((max - min) / step / 5) * step);
      var d = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = e.shiftKey ? big : step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -(e.shiftKey ? big : step);
      else if (e.key === 'PageUp') d = big;
      else if (e.key === 'PageDown') d = -big;
      else if (e.key === 'Home') { e.preventDefault(); markUsed(); set(min); return; }
      else if (e.key === 'End') { e.preventDefault(); markUsed(); set(max); return; }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); markUsed();
        openStepper(span); var up = stepper.querySelector('[data-d="1"]'); (up.disabled ? stepper.querySelector('[data-d="-1"]') : up).focus(); return;
      } else if (e.key === 'Escape') { closeStepper(); return; }
      if (d !== null) { e.preventDefault(); markUsed(); set(fig.state[k] + d); }
    });
  }

  function bindChoice(fig, el) {
    var k = el.dataset.k;
    var btns = el.querySelectorAll('button');
    el.setAttribute('role', 'group');
    btns.forEach(function (b) {
      b.type = 'button';
      b.addEventListener('click', function () {
        markUsed();
        if (fig.state[k] === b.dataset.v) return;
        fig.state[k] = b.dataset.v;
        if (fig.actions['choose:' + k]) fig.actions['choose:' + k](fig, b.dataset.v); else fig.render();
      });
    });
    el._show = function () {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(fig.state[k] === b.dataset.v)); });
    };
  }

  /* ---------------- chart ---------------- */
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) if (attrs[a] !== undefined && attrs[a] !== null) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var COL = {
    blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800',
    purple: '#6b52a8', grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257', plum: '#7a1f5c',
    'blue-ink': '#14568c', 'orange-ink': '#a8431f', 'green-ink': '#256647', 'red-ink': '#93301f',
    'gold-ink': '#7d5a00', 'purple-ink': '#5a4590'
  };
  var uid = 0;
  function Chart(host, spec, fig) {
    this.host = host; this.spec = spec; this.fig = fig; this.id = 'clip' + (++uid);
  }
  Chart.prototype.draw = function (paint) {
    var host = this.host, spec = this.spec;
    var W = Math.max(280, Math.round(host.clientWidth || 600));
    var narrow = W < 520;
    var H = narrow
      ? Math.round(Math.max(280, Math.min(W * 0.86, (window.innerHeight || 800) * 0.44)))
      : Math.round(Math.max(380, Math.min(680, W * (spec.aspect || 0.86))));
    var m = narrow ? { l: 52, r: 12, t: 40, b: 56 } : { l: 70, r: 22, t: 46, b: 70 };
    if (spec.margin) m = Object.assign(m, narrow ? spec.margin.narrow || {} : spec.margin.wide || {});
    var x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
    var xd = typeof spec.x === 'function' ? spec.x(this.fig.state) : spec.x;
    var yd = typeof spec.y === 'function' ? spec.y(this.fig.state) : spec.y;
    var X = function (v) { return x0 + (v - xd[0]) / (xd[1] - xd[0]) * (x1 - x0); };
    var Y = function (v) { return y0 - (v - yd[0]) / (yd[1] - yd[0]) * (y0 - y1); };

    var svg = host.querySelector('svg');
    if (!svg) {
      svg = svgEl('svg', { role: 'img' }, host);
      if (spec.title) svgEl('title', {}, svg).textContent = spec.title;
    }
    while (svg.lastChild && svg.lastChild.nodeName !== 'title') svg.removeChild(svg.lastChild);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.style.setProperty('--tick', narrow ? '14px' : '16px');
    svg.style.setProperty('--axt', narrow ? '15px' : '18px');
    svg.style.setProperty('--lbl', narrow ? '17px' : '21px');

    var defs = svgEl('defs', {}, svg);
    var cp = svgEl('clipPath', { id: this.id }, defs);
    svgEl('rect', { x: x0, y: y1 - 2, width: x1 - x0 + 2, height: y0 - y1 + 2 }, cp);

    // axes
    var ax = svgEl('g', { class: 'axis' }, svg);
    svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y0 }, ax);
    svgEl('line', { x1: x0, y1: y0, x2: x0, y2: y1 - 14 }, ax);
    var ticksX = typeof spec.xTicks === 'function' ? spec.xTicks(this.fig.state) : (spec.xTicks || []);
    var ticksY = typeof spec.yTicks === 'function' ? spec.yTicks(this.fig.state) : (spec.yTicks || []);
    var yFmt = spec.yFmt || function (v) { return String(v); };
    ticksX.forEach(function (v) {
      var g = svgEl('g', { class: 'tick' }, ax);
      svgEl('line', { x1: X(v), y1: y0, x2: X(v), y2: y0 + 7 }, g);
      svgEl('text', { x: X(v), y: y0 + 26, 'text-anchor': 'middle' }, g).textContent = v;
    });
    ticksY.forEach(function (v) {
      var g = svgEl('g', { class: 'tick' }, ax);
      svgEl('line', { x1: x0 - 7, y1: Y(v), x2: x0, y2: Y(v) }, g);
      svgEl('text', { x: x0 - 11, y: Y(v) + 5, 'text-anchor': 'end' }, g).textContent = yFmt(v);
    });
    if (spec.xLabel) svgEl('text', { class: 'axis-title', x: x1, y: H - 10, 'text-anchor': 'end' }, ax).textContent = spec.xLabel;
    if (spec.yLabel) svgEl('text', { class: 'axis-title', x: x0 - (narrow ? 44 : 60), y: y1 - 22, 'text-anchor': 'start' }, ax).textContent = spec.yLabel;

    var geo = svgEl('g', { class: 'geo' }, svg);
    var clipped = svgEl('g', { 'clip-path': 'url(#' + this.id + ')' }, geo);
    var top = svgEl('g', {}, geo);
    var labels = svgEl('g', { class: 'labels' }, svg);
    var hits = svgEl('g', { class: 'hits' }, svg);
    var placed = [];

    function color(c) { return COL[c] || c; }
    var api = {
      W: W, H: H, X: X, Y: Y, narrow: narrow, box: { x0: x0, x1: x1, y0: y0, y1: y1 }, xd: xd, yd: yd,
      color: color,
      line: function (a, b, c, d, o) {
        o = o || {};
        var e = svgEl('line', {
          x1: X(a), y1: Y(b), x2: X(c), y2: Y(d), stroke: color(o.color || 'ink'),
          'stroke-width': o.w || 4, 'stroke-dasharray': o.dash, 'stroke-linecap': o.cap || 'round',
          class: o.curve === false ? null : 'curve', 'data-link': o.link
        }, o.top ? top : clipped);
        if (o.link && o.hit !== false) svgEl('line', { x1: X(a), y1: Y(b), x2: X(c), y2: Y(d), class: 'hit', 'data-link': o.link }, hits);
        return e;
      },
      poly: function (pts, o) {
        o = o || {};
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join('') + 'Z';
        return svgEl('path', {
          d: d, fill: color(o.fill || 'grey'), 'fill-opacity': o.opacity == null ? 0.28 : o.opacity,
          stroke: o.stroke ? color(o.stroke) : 'none', 'stroke-width': o.sw || 0, 'data-link': o.link,
          'stroke-linejoin': 'round'
        }, o.top ? top : clipped);
      },
      rect: function (xa, ya, xb, yb, o) {
        o = o || {};
        return svgEl('rect', {
          x: Math.min(X(xa), X(xb)), y: Math.min(Y(ya), Y(yb)), width: Math.abs(X(xb) - X(xa)), height: Math.abs(Y(yb) - Y(ya)),
          fill: color(o.fill || 'grey'), 'fill-opacity': o.opacity == null ? 1 : o.opacity,
          stroke: o.stroke ? color(o.stroke) : 'none', 'stroke-width': o.sw || 0, 'data-link': o.link, rx: o.rx || 0
        }, top);
      },
      dot: function (a, b, o) {
        o = o || {};
        return svgEl('circle', {
          cx: X(a), cy: Y(b), r: o.r || (narrow ? 7 : 9), fill: color(o.color || 'ink'),
          stroke: '#eff1ee', 'stroke-width': 3, 'data-link': o.link
        }, top);
      },
      /* vertical bracket with arrowheads at data x, from y=a to y=b */
      vArrow: function (x, a, b, o) {
        o = o || {};
        var g = svgEl('g', { 'data-link': o.link }, top);
        var px = X(x), pa = Y(a), pb = Y(b), c = color(o.color || 'ink');
        if (Math.abs(pa - pb) < 6) return g;
        var dir = pb < pa ? 1 : -1, hs = 8;
        svgEl('line', { x1: px, y1: pa, x2: px, y2: pb + dir * hs * 0.6, stroke: c, 'stroke-width': o.w || 3.5 }, g);
        svgEl('path', { d: 'M' + (px - hs * 0.75) + ',' + (pb + dir * hs * 1.3) + 'L' + px + ',' + pb + 'L' + (px + hs * 0.75) + ',' + (pb + dir * hs * 1.3) + 'Z', fill: c }, g);
        if (o.both) svgEl('path', { d: 'M' + (px - hs * 0.75) + ',' + (pa - dir * hs * 1.3) + 'L' + px + ',' + pa + 'L' + (px + hs * 0.75) + ',' + (pa - dir * hs * 1.3) + 'Z', fill: c }, g);
        return g;
      },
      hArrow: function (y, a, b, o) {
        o = o || {};
        var g = svgEl('g', { 'data-link': o.link }, top);
        var py = Y(y), pa = X(a), pb = X(b), c = color(o.color || 'ink');
        if (Math.abs(pa - pb) < 10) return g;
        var dir = pb > pa ? 1 : -1, hs = 9;
        svgEl('line', { x1: pa, y1: py, x2: pb - dir * hs, y2: py, stroke: c, 'stroke-width': o.w || 4, 'stroke-linecap': 'round' }, g);
        svgEl('path', { d: 'M' + (pb - dir * hs * 1.5) + ',' + (py - hs * 0.8) + 'L' + pb + ',' + py + 'L' + (pb - dir * hs * 1.5) + ',' + (py + hs * 0.8) + 'Z', fill: c }, g);
        return g;
      },
      /* text label in data coords, or pixel coords with o.px; dx/dy in px */
      text: function (a, b, str, o) {
        o = o || {};
        var px = (o.px ? a : X(a)) + (o.dx || 0), py = (o.px ? b : Y(b)) + (o.dy || 0);
        var e = svgEl('text', {
          x: px, y: py, 'text-anchor': o.anchor || 'start', fill: color(o.color || 'ink'),
          class: 'lbl' + (o.soft ? ' soft' : ''), 'data-link': o.link,
          'font-size': o.size, 'dominant-baseline': o.baseline
        }, labels);
        e.textContent = str;
        var b0 = e.getBBox();
        if (b0.x < 2) { px += 2 - b0.x; e.setAttribute('x', px); }
        else if (b0.x + b0.width > W - 2) { px -= b0.x + b0.width - W + 2; e.setAttribute('x', px); }
        if (o.drop) {
          // optional label: leave it out rather than collide
          var bd = e.getBBox();
          if (placed.some(function (p) { return overlap(p, bd); })) { e.remove(); return null; }
          placed.push(bd);
        } else if (o.avoid !== false) {
          // nudge vertically away from labels already placed in this frame
          var bb = e.getBBox(), tries = 0, dir = o.nudge || -1;
          while (tries < 8 && placed.some(function (p) { return overlap(p, bb); })) {
            py += dir * (bb.height * 0.55);
            e.setAttribute('y', py); bb = e.getBBox(); tries++;
          }
          placed.push(bb);
        }
        return e;
      },
      /* hide x tick numbers that sit under the given labels */
      hideTicksUnder: function (els) {
        var boxes = els.filter(Boolean).map(function (e) { return e.getBBox(); });
        ax.querySelectorAll('.tick text').forEach(function (t) {
          var b = t.getBBox();
          if (boxes.some(function (q) { return overlap(q, b); })) t.style.display = 'none';
        });
      },
      raw: function (tag, attrs, layer) { return svgEl(tag, attrs, layer === 'labels' ? labels : top); }
    };
    paint(api);
  };
  function overlap(a, b) {
    return a.x < b.x + b.width + 4 && b.x < a.x + a.width + 4 && a.y < b.y + b.height && b.y < a.y + a.height;
  }

  window.LV = { Figure: Figure, money: money, num: num, out: out, showHint: showHint, COL: COL, reduceMotion: reduceMotion };
})();
