/* tangle.js: live equations for the EC224 studio (dev).
 *
 * Numbers inside a formula or a sentence that you drag left and right; everything that depends on them
 * (other numbers, a small chart) recomputes as you drag. The idea comes from Bret Victor's Tangle and from
 * wigglystuff's TangleLatex widget for marimo (MIT, Vincent Warmerdam); this is a small rewrite for plain
 * pages: no Python, no build step, KaTeX for the math.
 *
 *   Tangle.mount(el, {
 *     title: 'Monopoly in one line',
 *     params: { a: { value: 10, min: 4, max: 20, step: 0.5, dp: 1, label: 'demand intercept', pre: '$' } },
 *     derive: v => ({ Q: (v.a - v.c) / (2 * v.b) }),           // outputs, recomputed on every change
 *     outs:   { Q: { dp: 2, label: 'quantity', c: 'blue' } },   // how to show each output
 *     tex:    ['Q^{*} = \\frac{\\tangle{a} - \\tangle{c}}{2\\tangle{b}} = \\out{Q}'],
 *     prose:  'At {a} the firm sells {=Q} units.',               // {p} draggable, {=o} output (HTML allowed)
 *     chart:  { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', draw: (g, v, v0, dragging) => { ... } },
 *     notes:  'one line under the block'
 *   });
 *
 * Interaction: drag a plum number sideways (one step per few pixels), or focus it and use the arrow keys
 * (Shift for ten steps, Home / End for the limits), or click it to type a value. While you drag, the chart
 * keeps the picture from before the drag as a dashed ghost, so you can see what your change did.
 */
(function () {
  'use strict';
  var C = { blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800', purple: '#6b52a8',
    grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257', line: '#d3d8d4', plum: '#7a1f5c',
    tBlue: '#14568c', tOrange: '#a8431f', tGreen: '#256647', tRed: '#93301f', tGold: '#7d5a00', tPurple: '#5a4590' };
  var INK = { blue: C.tBlue, orange: C.tOrange, green: C.tGreen, red: C.tRed, gold: C.tGold, purple: C.tPurple, ink: C.ink };
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function decimals(step) { var s = String(step); return s.indexOf('.') < 0 ? 0 : s.length - s.indexOf('.') - 1; }
  function snap(v, p) { var n = Math.round((v - p.min) / p.step); return +clamp(p.min + n * p.step, p.min, p.max).toFixed(decimals(p.step) + 2); }
  function fmt(v, o) {
    o = o || {}; var dp = o.dp == null ? 2 : o.dp;
    if (typeof v === 'string') return v;   // a derived word ("elastic", "buy more X")
    if (!isFinite(v)) return 'n/a';
    var r = Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp); if (Object.is(r, -0)) r = 0;
    var neg = r < 0, s = Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: o.fixed ? dp : 0, maximumFractionDigits: dp });
    return (neg ? '−' : '') + (o.pre || '') + s + (o.post || '');
  }
  function texNum(s) { return s.replace(/\$/g, '\\$').replace(/−/g, '-').replace(/,/g, '{,}').replace(/%/g, '\\%'); }

  /* ---------- a very small SVG chart: data coordinates in, pixels out ---------- */
  function Chart(svg, spec, W, H) {
    var m = { l: 46, r: 18, t: 14, b: 38 };
    var X = typeof spec.x === 'function' ? spec.x : function () { return spec.x; };
    var Y = typeof spec.y === 'function' ? spec.y : function () { return spec.y; };
    var g = { C: C };
    g.reset = function (v) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      g.x = X(v); g.y = Y(v);
      g.px = function (x) { return m.l + (x - g.x[0]) / (g.x[1] - g.x[0]) * (W - m.l - m.r); };
      g.py = function (y) { return H - m.b - (y - g.y[0]) / (g.y[1] - g.y[0]) * (H - m.t - m.b); };
      g.layers = { back: add('g'), mid: add('g'), front: add('g') };
      axes(v);
    };
    function add(tag, attrs, parent) {
      var e = document.createElementNS(SVGNS, tag);
      for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e); return e;
    }
    function ticks(a, b) {
      var span = b - a, raw = span / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
      var st = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p, out = [];
      for (var t = Math.ceil(a / st) * st; t <= b + 1e-9; t += st) out.push(+t.toFixed(10));
      return out;
    }
    function axes() {
      var ax = add('g', { 'class': 'tg-axes' });
      ticks(g.x[0], g.x[1]).forEach(function (t) {
        add('line', { x1: g.px(t), x2: g.px(t), y1: H - m.b, y2: H - m.b + 4 }, ax);
        add('text', { x: g.px(t), y: H - m.b + 17, 'text-anchor': 'middle' }, ax).textContent = fmt(t, { dp: 2 });
      });
      ticks(g.y[0], g.y[1]).forEach(function (t) {
        add('line', { x1: m.l - 4, x2: m.l, y1: g.py(t), y2: g.py(t) }, ax);
        add('text', { x: m.l - 8, y: g.py(t) + 4, 'text-anchor': 'end' }, ax).textContent = fmt(t, { dp: 2 });
      });
      add('path', { d: 'M' + m.l + ' ' + m.t + 'V' + (H - m.b) + 'H' + (W - m.r), 'class': 'tg-axis' }, ax);
      if (spec.xl) add('text', { x: W - m.r, y: H - 6, 'text-anchor': 'end', 'class': 'tg-axl' }, ax).textContent = spec.xl;
      if (spec.yl) add('text', { x: m.l + 6, y: m.t + 4, 'class': 'tg-axl' }, ax).textContent = spec.yl;
    }
    function col(c) { return C[c] || c || C.ink; }
    function path(pts) {
      var d = '', on = false;
      pts.forEach(function (p) {
        if (p == null || !isFinite(p[0]) || !isFinite(p[1])) { on = false; return; }
        d += (on ? 'L' : 'M') + g.px(p[0]).toFixed(1) + ' ' + g.py(p[1]).toFixed(1); on = true;
      });
      return d;
    }
    // a curve from a function of x, sampled across the x range (or [a, b])
    g.fn = function (f, o) {
      o = o || {}; var a = o.from != null ? o.from : g.x[0], b = o.to != null ? o.to : g.x[1], pts = [];
      for (var i = 0; i <= 160; i++) { var x = a + (b - a) * i / 160, y = f(x); pts.push(y >= g.y[0] - (g.y[1] - g.y[0]) && y <= g.y[1] * 3 ? [x, y] : null); }
      return g.line(pts, o);
    };
    g.line = function (pts, o) {
      o = o || {};
      return add('path', { d: path(pts), fill: 'none', stroke: col(o.c), 'stroke-width': o.w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        'stroke-dasharray': o.dash ? (o.dash === true ? '6 6' : o.dash) : 'none', opacity: o.op == null ? 1 : o.op, 'clip-path': 'url(#' + g.clip + ')' }, g.layers[o.layer || 'mid']);
    };
    g.area = function (pts, o) {
      o = o || {};
      return add('path', { d: path(pts) + 'Z', fill: col(o.c), 'fill-opacity': o.op == null ? 0.22 : o.op, stroke: 'none', 'clip-path': 'url(#' + g.clip + ')' }, g.layers.back);
    };
    g.guide = function (x, y, o) {   // dashed drop lines from (x, y) to both axes
      o = o || {};
      return add('path', { d: 'M' + g.px(g.x[0]) + ' ' + g.py(y) + 'H' + g.px(x) + 'V' + g.py(g.y[0]), fill: 'none', stroke: col(o.c || 'grey'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, g.layers.back);
    };
    g.dot = function (x, y, o) {
      o = o || {};
      return add('circle', { cx: g.px(x), cy: g.py(y), r: o.r || 6, fill: col(o.c), stroke: '#fff', 'stroke-width': 2 }, g.layers.front);
    };
    g.text = function (x, y, s, o) {
      o = o || {};
      var t = add('text', { x: g.px(x) + (o.dx || 0), y: g.py(y) + (o.dy || 0), 'text-anchor': o.anchor || 'start', fill: INK[o.c] || col(o.c), 'class': 'tg-lab' + (o.small ? ' sm' : '') }, g.layers.front);
      t.textContent = s; return t;
    };
    g.clip = 'tgc' + Math.random().toString(36).slice(2, 8);
    var defs = function () { var d = add('defs'), cp = add('clipPath', { id: g.clip }, d); add('rect', { x: m.l, y: m.t - 2, width: W - m.l - m.r + 2, height: H - m.t - m.b + 2 }, cp); };
    var reset0 = g.reset; g.reset = function (v) { reset0(v); defs(); };
    return g;
  }

  /* ---------- the block ---------- */
  function mount(host, spec) {
    var P = spec.params, names = Object.keys(P);
    var v = {}, v0 = {}, init = {};
    names.forEach(function (k) { var p = P[k]; p.dp = p.dp == null ? decimals(p.step) : p.dp; v[k] = v0[k] = init[k] = p.value; });
    var outs = spec.outs || {}, d = {};
    var drag = null, editing = null;

    host.classList.add('tg', 'mathjax_ignore', 'tex2jax_ignore');
    var head = el('div', 'tg-hd');
    if (spec.title) head.appendChild(el('h3', 'tg-title', spec.title));
    var reset = el('button', 'tg-reset', 'Reset'); reset.type = 'button';
    head.appendChild(reset);
    host.appendChild(head);
    if (spec.lede) host.appendChild(el('p', 'tg-lede', spec.lede));
    var body = el('div', 'tg-body' + (spec.chart ? '' : ' no-chart'));
    // equations get a full-width row; the sentence sits beside the chart
    var eqs = el('div', 'tg-eqs');
    var texEls = (spec.tex || []).map(function () { var e = el('div', 'tg-eq'); eqs.appendChild(e); return e; });
    if (texEls.length) body.appendChild(eqs);
    var text = el('div', 'tg-text');
    var proseEl = spec.prose ? text.appendChild(el('p', 'tg-prose')) : null;
    body.appendChild(text);
    var svg = null, chart = null;
    if (spec.chart) {
      var W = 480, H = spec.chart.h || 330;
      var fig = el('div', 'tg-chart');
      svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', spec.chart.alt || 'Chart that redraws as you change the numbers');
      fig.appendChild(svg); body.appendChild(fig);
      chart = Chart(svg, spec.chart, W, H);
    }
    host.appendChild(body);
    if (spec.notes) host.appendChild(el('p', 'tg-notes', spec.notes));
    var live = el('div', 'tg-sr'); live.setAttribute('aria-live', 'polite'); host.appendChild(live);

    function paramHTML(k, inTex) {
      var p = P[k], s = fmt(v[k], { dp: p.dp, pre: p.pre, post: p.post, fixed: p.fixed });
      return inTex ? '\\htmlData{tp=' + k + '}{' + texNum(s) + '}' : '<span data-tp="' + k + '">' + s + '</span>';
    }
    function outHTML(k, inTex) {
      var o = outs[k] || {}, s = fmt(d[k], o);
      return inTex ? '\\htmlData{to=' + k + '}{' + texNum(s) + '}' : '<span data-to="' + k + '">' + s + '</span>';
    }
    function render() {
      d = spec.derive ? spec.derive(v) : {};
      texEls.forEach(function (e, i) {
        var src = spec.tex[i].replace(/\\tangle\{(\w+)\}/g, function (_, k) { return paramHTML(k, true); })
                             .replace(/\\out\{(\w+)\}/g, function (_, k) { return outHTML(k, true); });
        if (window.katex) {
          try { katex.render(src, e, { displayMode: true, throwOnError: true, trust: function (c) { return c.command === '\\htmlData'; }, strict: function (code) { return code === 'htmlExtension' ? 'ignore' : 'warn'; } }); }
          catch (err) { e.textContent = 'formula error: ' + err.message; }
        } else e.textContent = src;
      });
      if (proseEl) proseEl.innerHTML = spec.prose.replace(/\{=(\w+)\}/g, function (_, k) { return outHTML(k); }).replace(/\{(\w+)\}/g, function (_, k) { return P[k] ? paramHTML(k) : '{' + k + '}'; });
      decorate();
      if (chart) { chart.reset(v); spec.chart.draw(chart, v, d, drag && drag.moved ? v0 : null, drag && drag.moved ? spec.derive(v0) : null); }
    }
    function decorate() {
      host.querySelectorAll('[data-tp]').forEach(function (e) {
        var k = e.getAttribute('data-tp'), p = P[k];
        e.classList.add('tg-p'); e.tabIndex = 0; e.setAttribute('role', 'slider');
        e.setAttribute('aria-label', p.label || k); e.setAttribute('aria-valuemin', p.min); e.setAttribute('aria-valuemax', p.max);
        e.setAttribute('aria-valuenow', v[k]); e.setAttribute('aria-valuetext', fmt(v[k], { dp: p.dp, pre: p.pre, post: p.post }));
        e.title = (p.label ? p.label + ': ' : '') + 'drag sideways, or click to type';
        if (drag && drag.k === k) e.classList.add('on');
      });
      host.querySelectorAll('[data-to]').forEach(function (e) {
        var o = outs[e.getAttribute('data-to')] || {};
        e.classList.add('tg-o'); if (o.c) e.style.color = INK[o.c] || o.c;
        if (o.label) e.title = o.label;
      });
    }
    function set(k, val, announce) {
      var p = P[k], nv = snap(val, p);
      if (nv === v[k]) return false;
      v[k] = nv; render();
      if (spec.onChange) spec.onChange(v, k);
      if (announce) live.textContent = (p.label || k) + ' ' + fmt(nv, { dp: p.dp, pre: p.pre, post: p.post });
      return true;
    }
    function commit() { names.forEach(function (k) { v0[k] = v[k]; }); }

    host.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-tp]'); if (!t || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      var k = t.getAttribute('data-tp'), p = P[k], steps = (p.max - p.min) / p.step;
      drag = { k: k, id: e.pointerId, x: e.clientX, start: v[k], moved: false, pps: clamp(260 / steps, 1.5, 9) };
      host.classList.add('dragging'); try { host.setPointerCapture(e.pointerId); } catch (er) {}
      showRange(t, k);
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 3) return;
      drag.moved = true;
      var p = P[drag.k];
      set(drag.k, drag.start + Math.trunc(dx / drag.pps) * p.step);
      var t = host.querySelector('[data-tp="' + drag.k + '"]'); if (t) showRange(t, drag.k);
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var was = drag; drag = null; host.classList.remove('dragging'); hideRange();
      commit(); render();
      if (!was.moved) openEditor(was.k);
      else { var t = host.querySelector('[data-tp="' + was.k + '"]'); if (t) t.focus({ preventScroll: true }); }
    }
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
    host.addEventListener('keydown', function (e) {
      var t = e.target.closest && e.target.closest('[data-tp]'); if (!t) return;
      var k = t.getAttribute('data-tp'), p = P[k], big = e.shiftKey ? 10 : 1, nv = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nv = v[k] + p.step * big;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nv = v[k] - p.step * big;
      else if (e.key === 'Home') nv = p.min; else if (e.key === 'End') nv = p.max;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(k); return; }
      if (nv == null) return;
      e.preventDefault(); set(k, nv, true); commit();
      var n = host.querySelector('[data-tp="' + k + '"]'); if (n) n.focus({ preventScroll: true });
    });
    reset.addEventListener('click', function () { names.forEach(function (k) { v[k] = init[k]; }); commit(); render(); if (spec.onChange) spec.onChange(v, null); live.textContent = 'Reset to the starting numbers'; });

    // a little track under the number while you drag: where you are between the limits
    var range = el('div', 'tg-range'); range.innerHTML = '<span class="tg-range-lo"></span><span class="tg-range-bar"><i></i></span><span class="tg-range-hi"></span>';
    function showRange(t, k) {
      var p = P[k], r = t.getBoundingClientRect(), hr = host.getBoundingClientRect();
      range.querySelector('.tg-range-lo').textContent = fmt(p.min, { dp: p.dp, pre: p.pre, post: p.post });
      range.querySelector('.tg-range-hi').textContent = fmt(p.max, { dp: p.dp, pre: p.pre, post: p.post });
      range.querySelector('i').style.left = ((v[k] - p.min) / (p.max - p.min) * 100) + '%';
      if (!range.parentNode) host.appendChild(range);
      range.style.left = clamp(r.left - hr.left + r.width / 2, 90, hr.width - 90) + 'px';
      range.style.top = (r.bottom - hr.top + 6) + 'px';
    }
    function hideRange() { if (range.parentNode) range.parentNode.removeChild(range); }

    function openEditor(k) {
      var t = host.querySelector('[data-tp="' + k + '"]'); if (!t) return;
      var p = P[k], r = t.getBoundingClientRect(), hr = host.getBoundingClientRect();
      var box = el('div', 'tg-edit');
      var inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.value = String(v[k]); inp.setAttribute('aria-label', (p.label || k) + ', type a value');
      var hint = el('span', 'tg-edit-hint', fmt(p.min, { dp: p.dp }) + ' to ' + fmt(p.max, { dp: p.dp }));
      box.appendChild(inp); box.appendChild(hint);
      box.style.left = clamp(r.left - hr.left, 0, hr.width - 170) + 'px'; box.style.top = (r.bottom - hr.top + 6) + 'px';
      host.appendChild(box); editing = box; inp.focus(); inp.select();
      function close(ok) {
        if (!editing) return; editing = null;
        if (ok) { var n = parseFloat(inp.value.replace(/[$,%\s]/g, '').replace('−', '-')); if (isFinite(n)) { set(k, n, true); commit(); } }
        box.remove(); var n2 = host.querySelector('[data-tp="' + k + '"]'); if (n2) n2.focus({ preventScroll: true });
      }
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); close(true); } else if (e.key === 'Escape') { e.preventDefault(); close(false); } });
      inp.addEventListener('blur', function () { setTimeout(function () { close(true); }, 0); });
    }
    render();
    return { values: v, set: set, render: render };
  }

  window.Tangle = { mount: mount, fmt: fmt, C: C };
})();
