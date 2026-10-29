/* kit.js: a tiny direct-manipulation plotting kit for the v2 "Touch the economics" lab.
 *
 * Plot: pixel-true SVG (no viewBox scaling, so type stays the size we set at every width),
 *   redrawn from state on every change. Everything except the handles lives in one
 *   dynamic layer that is rebuilt; handles are persistent so pointer capture survives.
 * Labels: deterministic placement. Each label tries a ranked list of positions around its
 *   anchor and takes the first that clears every drawn line, every placed label and every
 *   handle. No physics, no jitter: the same state always gives the same picture.
 * Handles: big round grips that ride a path (any function value -> point). Dragging projects
 *   the pointer onto that path, rounds to the step, then a small magnet pulls the value onto
 *   meaningful points (optimum, market outcome) and the figure says so in a pill.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = {
    paper: '#eff1ee', raised: '#ffffff', ink: '#14181b', soft: '#4a5257', plum: '#7a1f5c',
    blue: '#1f6fb2', blueT: '#14568c', orange: '#c85a3c', orangeT: '#a8431f',
    green: '#2f7d55', greenT: '#256647', red: '#b03a2e', redT: '#93301f',
    gold: '#a07800', goldT: '#7d5a00', purple: '#6b52a8', purpleT: '#5a4590', grey: '#9aa3b0',
    fGreen: 'rgba(47,125,85,0.20)', fRed: 'rgba(176,58,46,0.26)', fBlue: 'rgba(31,111,178,0.14)',
    fOrange: 'rgba(200,90,60,0.16)', fGold: 'rgba(160,120,0,0.16)'
  };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function money(v) {
    var r = Math.round(v);
    return (r < 0 ? '-$' : '$') + Math.abs(r).toLocaleString('en-US');
  }
  function num(v, d) {
    var f = Math.pow(10, d == null ? 1 : d);
    return String(Math.round(v * f) / f);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Segment vs axis-aligned rectangle (Liang-Barsky clip test).
  function segHitsRect(x1, y1, x2, y2, r) {
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1;
    var p = [-dx, dx, -dy, dy], q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
    for (var i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else {
        var t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
        else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
    }
    return true;
  }
  function rectsHit(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }
  function inflate(r, p) { return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p }; }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ Plot */
  function Plot(host, cfg) {
    this.host = host;
    this.cfg = cfg;
    this.state = cfg.state;
    this.handles = [];
    this.touched = false;
    this.toast = null;
    this.svg = el('svg', { class: 'plot', role: 'group', 'aria-label': cfg.ariaLabel || '' }, host);
    var defs = el('defs', null, this.svg);
    this.clipId = 'clip-' + Math.random().toString(36).slice(2, 8);
    this.clipRect = el('rect', null, el('clipPath', { id: this.clipId }, defs));
    var hatch = el('pattern', { id: this.clipId + '-hatch', width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 9, height: 9, fill: 'rgba(47,125,85,0.07)' }, hatch);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 9, stroke: 'rgba(47,125,85,0.55)', 'stroke-width': 3 }, hatch);
    this.hatchUrl = 'url(#' + this.clipId + '-hatch)';
    this.gDyn = el('g', null, this.svg);
    this.gHandles = el('g', { class: 'handles' }, this.svg);
    this.gTop = el('g', { 'pointer-events': 'none' }, this.svg);
    this.caption = cfg.caption || null;
    var self = this;
    (cfg.handles || []).forEach(function (h) { self.addHandle(h); });
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(host);
    this.resize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.W = 0; self.resize(); });
  }

  Plot.prototype.resize = function () {
    var W = Math.floor(this.host.clientWidth);
    if (!W || W === this.W) return;
    this.W = W;
    var phone = this.phone = W < 600;
    var cfg = this.cfg;
    var H = phone ? Math.round(clamp(W * (cfg.phoneAspect || 1.3), 400, 600))
                  : Math.round(clamp(W * (cfg.aspect || 0.66), 420, 640));
    this.H = H;
    var m = cfg.margin ? cfg.margin(phone) : {};
    this.L = m.l != null ? m.l : (phone ? 58 : 70);
    this.R = W - (m.r != null ? m.r : (phone ? 14 : 26));
    this.T = m.t != null ? m.t : (phone ? 44 : 52);
    this.B = H - (m.b != null ? m.b : (phone ? 58 : 66));
    this.fs = {
      tick: phone ? 15 : 17,
      curve: phone ? 18 : 22,
      big: phone ? 23 : 30,
      small: phone ? 15 : 17,
      title: phone ? 16 : 18
    };
    this.svg.setAttribute('width', W);
    this.svg.setAttribute('height', H);
    this.clipRect.setAttribute('x', this.L); this.clipRect.setAttribute('y', this.T - 2);
    this.clipRect.setAttribute('width', this.R - this.L + 2); this.clipRect.setAttribute('height', this.B - this.T + 2);
    this.redraw();
  };

  Plot.prototype.X = function (v) { var d = this.cfg.x; return this.L + (v - d[0]) / (d[1] - d[0]) * (this.R - this.L); };
  Plot.prototype.Y = function (v) { var d = this.cfg.y; return this.B - (v - d[0]) / (d[1] - d[0]) * (this.B - this.T); };
  Plot.prototype.P = function (x, y) { return [this.X(x), this.Y(y)]; };

  Plot.prototype.update = function () {
    var self = this;
    if (this._raf) return;
    this._raf = requestAnimationFrame(function () { self._raf = 0; self.redraw(); });
  };

  Plot.prototype.redraw = function () {
    if (!this.W) return;
    var g = this.gDyn;
    while (g.firstChild) g.removeChild(g.firstChild);
    while (this.gTop.firstChild) this.gTop.removeChild(this.gTop.firstChild);
    this.segs = [];
    this.rects = [];
    this.hideTicks = [];
    this.axisRects = [];
    this.gArea = el('g', { 'clip-path': 'url(#' + this.clipId + ')' }, g);
    this.gAxes = el('g', null, g);
    this.gLines = el('g', { 'clip-path': 'url(#' + this.clipId + ')' }, g);
    this.gMarks = el('g', null, g);
    this.gLabels = el('g', null, g);
    // handles first: everything else avoids them
    var self = this;
    this.handles.forEach(function (h) { self.placeHandle(h); });
    this.handles.forEach(function (h) {
      if (h.hidden && h.hidden()) return;
      self.rects.push({ x: h.px - 21, y: h.py - 21, w: 42, h: 42, handle: true });
    });
    if (this.toast) this.drawToast();
    this.cfg.render(this, this.state);
    this.drawAxes();
    if (this.caption && this.cfg.caption_text) {
      var html = this.cfg.caption_text(this.state, this);
      if (html !== this._lastCap) { this.caption.innerHTML = html; this._lastCap = html; }
    }
  };

  /* ---------------------------------------------------------------- axes */
  Plot.prototype.drawAxes = function () {
    var cfg = this.cfg, g = this.gAxes, self = this;
    el('line', { x1: this.L, y1: this.B, x2: this.R, y2: this.B, class: 'axis' }, g);
    el('line', { x1: this.L, y1: this.B, x2: this.L, y2: this.T - 6, class: 'axis' }, g);
    (cfg.yTicks || []).forEach(function (v) {
      var y = self.Y(v);
      el('line', { x1: self.L - 7, y1: y, x2: self.L, y2: y, class: 'axis' }, g);
      var t = el('text', { x: self.L - 12, y: y + 5.5, 'text-anchor': 'end', class: 'tick', 'font-size': self.fs.tick }, g);
      t.textContent = cfg.yFmt ? cfg.yFmt(v) : v;
    });
    if (cfg.xTickRows) {
      cfg.xTickRows(this, g);
    } else {
      (cfg.xTicks || []).forEach(function (v) {
        var x = self.X(v);
        el('line', { x1: x, y1: self.B, x2: x, y2: self.B + 7, class: 'axis' }, g);
        var hide = self.hideTicks.some(function (hx) { return Math.abs(hx - x) < 14; });
        if (hide) return;
        var t = el('text', { x: x, y: self.B + 26, 'text-anchor': 'middle', class: 'tick', 'font-size': self.fs.tick }, g);
        t.textContent = cfg.xFmt ? cfg.xFmt(v) : v;
        var tb0 = t.getBBox(), tb = inflate({ x: tb0.x, y: tb0.y, w: tb0.width, h: tb0.height }, 5);
        if (self.axisRects.some(function (r) { return rectsHit(tb, r); })) g.removeChild(t);
      });
    }
    if (cfg.yTitle) {
      var yt = el('text', { x: 4, y: this.T - (this.phone ? 20 : 24), class: 'axis-title', 'font-size': this.fs.title }, g);
      yt.textContent = cfg.yTitle;
    }
    if (cfg.xTitle) {
      var xt = el('text', { x: this.R, y: this.B + (this.phone ? 50 : 56), 'text-anchor': 'end', class: 'axis-title', 'font-size': this.fs.title }, g);
      xt.textContent = typeof cfg.xTitle === 'function' ? cfg.xTitle(this) : cfg.xTitle;
    }
  };

  /* ------------------------------------------------------------ drawing */
  // Line in data coordinates. Registered as a label obstacle (clipped to the plot).
  Plot.prototype.line = function (x1, y1, x2, y2, o) {
    o = o || {};
    var a = this.P(x1, y1), b = this.P(x2, y2);
    var e = el('line', {
      x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: o.color || C.ink,
      'stroke-width': o.w || 4, 'stroke-dasharray': o.dash || null, 'stroke-linecap': o.cap || 'round',
      opacity: o.opacity || null, class: o.cls || null
    }, o.parent || (o.noclip ? this.gMarks : this.gLines));
    if (o.obstacle !== false) this.segs.push([a[0], a[1], b[0], b[1]]);
    return e;
  };
  Plot.prototype.pxLine = function (x1, y1, x2, y2, o) {
    o = o || {};
    var e = el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: o.color || C.ink, 'stroke-width': o.w || 2,
      'stroke-dasharray': o.dash || null, 'stroke-linecap': 'round', opacity: o.opacity || null }, o.parent || this.gMarks);
    if (o.obstacle) this.segs.push([x1, y1, x2, y2]);
    return e;
  };
  Plot.prototype.poly = function (pts, o) {
    o = o || {};
    var self = this;
    var d = pts.map(function (p, i) { var q = self.P(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('') + 'Z';
    return el('path', { d: d, fill: o.fill || C.fGreen, stroke: o.stroke || 'none', 'stroke-width': o.sw || 1.5,
      'stroke-dasharray': o.dash || null }, o.parent || this.gArea);
  };
  Plot.prototype.dot = function (x, y, color, r, o) {
    var p = this.P(x, y);
    el('circle', { cx: p[0], cy: p[1], r: r || 7, fill: color, stroke: (o && o.ring) || C.paper, 'stroke-width': 2.5 }, this.gMarks);
    this.rects.push({ x: p[0] - (r || 7), y: p[1] - (r || 7), w: 2 * (r || 7), h: 2 * (r || 7) });
    return p;
  };
  // Small hollow ring marking a snap target ("detent") on a handle's path.
  Plot.prototype.detent = function (px, py, color) {
    el('circle', { cx: px, cy: py, r: this.phone ? 7 : 8, fill: C.paper, stroke: color || C.soft, 'stroke-width': 2.5, 'stroke-dasharray': '3 3' }, this.gMarks);
  };
  // Bracket: vertical span with short caps, in data coords.
  Plot.prototype.bracket = function (x, y1, y2, color, w) {
    var a = this.P(x, y1), b = this.P(x, y2);
    var g = el('g', { stroke: color, 'stroke-width': w || 3, 'stroke-linecap': 'round' }, this.gMarks);
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, g);
    el('line', { x1: a[0] - 7, y1: a[1], x2: a[0] + 7, y2: a[1] }, g);
    el('line', { x1: b[0] - 7, y1: b[1], x2: b[0] + 7, y2: b[1] }, g);
    this.segs.push([a[0], a[1], b[0], b[1]]);
  };

  /* ------------------------------------------------------------ labels */
  // lines: array of [text, kind, color?]; kind: 'curve' | 'big' | 'small' | 'mid'
  // anchor: [px, py]; o.prefer: list of directions among N NE E SE S SW W NW C
  Plot.prototype.label = function (lines, anchor, o) {
    o = o || {};
    var fs = this.fs, self = this;
    var sizeOf = function (k) { return k === 'big' ? fs.big : k === 'curve' ? fs.curve : k === 'mid' ? Math.round((fs.big + fs.small) / 2) : fs.small; };
    var weightOf = function (k) { return k === 'big' ? 800 : k === 'curve' ? 700 : k === 'mid' ? 700 : 600; };
    var t = el('text', { class: 'lbl' + (o.halo === false ? '' : ' halo') + (o.cls ? ' ' + o.cls : ''), fill: o.color || C.ink }, o.parent || this.gLabels);
    var y = 0;
    lines.forEach(function (ln, i) {
      var s = sizeOf(ln[1]);
      var ts = el('tspan', { x: 0, 'font-size': s, 'font-weight': weightOf(ln[1]), fill: ln[2] || null }, t);
      if (i) { y += s * 1.06; ts.setAttribute('dy', s * 1.06); }
      if (Array.isArray(ln[0])) {
        ln[0].forEach(function (seg) { var c = el('tspan', { fill: seg[1] || null }, ts); c.textContent = seg[0]; });
      } else ts.textContent = ln[0];
    });
    var bb = t.getBBox();
    var w = bb.width, h = bb.height;
    var d0 = o.dist != null ? o.dist : 12;
    var prefer = (o.prefer || ['NE', 'E', 'SE', 'N', 'S', 'NW', 'W', 'SW']).slice();
    if (!o.strict) ['NE', 'E', 'SE', 'N', 'S', 'NW', 'W', 'SW'].forEach(function (d) { if (prefer.indexOf(d) < 0) prefer.push(d); });
    var bounds = o.bounds || { x: this.L + 4, y: this.T - (o.allowTop ? this.T - 4 : 0), w: this.R - this.L - 4, h: this.B - this.T - 4 + (o.allowTop ? this.T - 4 : 0) };
    var ax = anchor[0], ay = anchor[1];
    var steps = o.steps || [0, 12, 26, 44, 66, 92];
    var best = null, bestPen = Infinity, bestLines = 0;
    var ignore = o.ignoreSegs || 0;
    for (var si = 0; si < steps.length; si++) {
      var d = d0 + steps[si];
      for (var pi = 0; pi < prefer.length; pi++) {
        var dir = prefer[pi], r = { w: w, h: h };
        var k = dir === 'C' ? 0 : d, kd = k * 0.72;
        switch (dir) {
          case 'E': r.x = ax + k; r.y = ay - h / 2; break;
          case 'W': r.x = ax - k - w; r.y = ay - h / 2; break;
          case 'N': r.x = ax - w / 2; r.y = ay - k - h; break;
          case 'S': r.x = ax - w / 2; r.y = ay + k; break;
          case 'NE': r.x = ax + kd; r.y = ay - kd - h; break;
          case 'NW': r.x = ax - kd - w; r.y = ay - kd - h; break;
          case 'SE': r.x = ax + kd; r.y = ay + kd; break;
          case 'SW': r.x = ax - kd - w; r.y = ay + kd; break;
          default: r.x = ax - w / 2; r.y = ay - h / 2 + (steps[si] ? (si % 2 ? -1 : 1) * steps[si] : 0);
        }
        var pen = 0, lineHits = 0;
        if (r.x < bounds.x || r.y < bounds.y || r.x + r.w > bounds.x + bounds.w || r.y + r.h > bounds.y + bounds.h) pen += 1000;
        var rr = inflate(r, 4);
        for (var j = ignore; j < this.segs.length; j++) {
          var s = this.segs[j];
          if (segHitsRect(s[0], s[1], s[2], s[3], rr)) lineHits++;
        }
        pen += lineHits * 8;
        var rr2 = inflate(r, 3);
        for (var j2 = 0; j2 < this.rects.length; j2++) if (rectsHit(rr2, this.rects[j2])) pen += 200;
        if (pen === 0) { best = r; bestPen = 0; bestLines = 0; break; }
        var score = pen + si * 3 + pi * 0.3;
        if (score < bestPen) { bestPen = score; best = r; bestLines = lineHits; }
      }
      if (bestPen === 0) break;
    }
    if (o.optional && bestPen >= 100) { t.parentNode.removeChild(t); return null; }
    // a label that has to sit across a line gets a paper card so it still reads
    if (bestLines > 0 && !o.box) o = Object.assign({}, o, { box: 'rgba(239,241,238,0.93)' });
    // position the text so its box lands on the chosen rectangle
    var dirAnchor = 'start', tx = best.x;
    var bx = bb.x; // offset of box from x=0 with start anchor
    tx = best.x - bx;
    var children = t.childNodes;
    for (var c = 0; c < children.length; c++) children[c].setAttribute('x', tx + (o.align === 'end' ? w : o.align === 'middle' ? w / 2 : 0));
    if (o.align === 'end' || o.align === 'middle') t.setAttribute('text-anchor', o.align);
    t.setAttribute('transform', 'translate(0,' + (best.y - bb.y).toFixed(1) + ')');
    if (o.box) {
      var bg = el('rect', { x: best.x - 6, y: best.y - 3, width: w + 12, height: h + 6, rx: 6, fill: o.box, class: o.boxCls || null });
      t.parentNode.insertBefore(bg, t);
    }
    if (o.leader) {
      // short leader from the anchor to the nearest point of the label box, if it ended up far away
      var nx = clamp(ax, best.x, best.x + w), ny = clamp(ay, best.y, best.y + h);
      var dd = Math.hypot(nx - ax, ny - ay);
      if (dd > 26) el('line', { x1: ax, y1: ay, x2: nx + (ax - nx) * 6 / dd, y2: ny + (ay - ny) * 6 / dd, stroke: o.color || C.ink, 'stroke-width': 1.6, opacity: 0.8 }, this.gMarks);
    }
    this.rects.push(best);
    return { el: t, rect: best, pen: bestPen };
  };

  /* ------------------------------------------------------------ toast */
  Plot.prototype.say = function (text, h) {
    var self = this;
    this.toast = { text: text, h: h };
    clearTimeout(this._toastT);
    this.update();
    var live = this.host.closest('.figure') && this.host.closest('.figure').querySelector('.sr-live');
    if (live) live.textContent = text;
    if (navigator.vibrate && h && h._pointerType === 'touch') { try { navigator.vibrate(8); } catch (e) { /* ignore */ } }
  };
  Plot.prototype.unsay = function (delay) {
    var self = this;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(function () { self.toast = null; self.update(); }, delay || 0);
  };
  Plot.prototype.drawToast = function () {
    var h = this.toast.h;
    var r = this.label([[this.toast.text, 'small']], [h.px, h.py], {
      prefer: h.toastPrefer || ['N', 'NE', 'NW', 'S', 'E', 'W'], dist: 30, cls: 'toast-t', color: '#fff', halo: false,
      box: C.plum, boxCls: 'toast-b', parent: this.gTop, allowTop: true
    });
    return r;
  };

  /* ------------------------------------------------------------ handles */
  Plot.prototype.addHandle = function (h) {
    var self = this;
    h.plot = this;
    h.step = h.step || 1;
    var g = h.g = el('g', { class: 'handle', tabindex: 0, role: 'slider', 'aria-label': h.name,
      'aria-valuemin': h.min, 'aria-valuemax': h.max, style: '--c:' + (h.color || C.plum) }, this.gHandles);
    h.gIn = el('g', null, g);
    el('circle', { r: 31, class: 'h-hit' }, h.gIn);
    el('circle', { r: 27, class: 'h-glow' }, h.gIn);
    h.ring = el('circle', { r: 19, class: 'h-ring' }, h.gIn);
    h.rot = el('g', null, h.gIn);
    el('path', { class: 'h-arrows', d: 'M27,0 l-7,-6.5 v13 z M-27,0 l7,-6.5 v13 z' }, h.rot);
    el('circle', { r: 17, class: 'h-body' }, h.gIn);
    el('path', { class: 'h-grip', d: 'M-5,-7 v14 M0,-7 v14 M5,-7 v14' }, h.rot);
    if (this.cfg.beckon === h.key) g.classList.add('beckon');

    var drag = null;
    g.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      g.focus({ preventScroll: true });
      g.setPointerCapture(e.pointerId);
      var r = self.svg.getBoundingClientRect();
      drag = { id: e.pointerId, ox: e.clientX - r.left - h.px, oy: e.clientY - r.top - h.py };
      h._pointerType = e.pointerType;
      g.classList.add('dragging');
      document.documentElement.classList.add('is-dragging');
      self.touch();
      if (h.onStart) h.onStart(self.state);
    });
    // belt and braces for older iOS: touch-action on SVG children is honoured late there
    g.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    g.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      var r = self.svg.getBoundingClientRect();
      var tx = e.clientX - r.left - drag.ox, ty = e.clientY - r.top - drag.oy;
      self.setFromPx(h, tx, ty);
    });
    var end = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      g.classList.remove('dragging');
      document.documentElement.classList.remove('is-dragging');
      if (h.onRelease) { h.onRelease(self.state, self); self.update(); }
      if (self.toast) self.unsay(1600);
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
    g.addEventListener('lostpointercapture', end);
    g.addEventListener('keydown', function (e) {
      var k = e.key, dirx = 0, diry = 0;
      if (k === 'ArrowRight') dirx = 1; else if (k === 'ArrowLeft') dirx = -1;
      else if (k === 'ArrowUp') diry = -1; else if (k === 'ArrowDown') diry = 1;
      else if (k === 'Home' || k === 'End') {
        e.preventDefault(); self.touch();
        self.setValue(h, k === 'Home' ? h.min : h.max, true); return;
      } else return;
      e.preventDefault();
      self.touch();
      var v = h.get(self.state), st = h.step * (e.shiftKey ? 5 : 1);
      var a = self.pathPx(h, v), b = self.pathPx(h, Math.min(h.max, v + h.step));
      if (v + h.step > h.max) b = self.pathPx(h, v), a = self.pathPx(h, Math.max(h.min, v - h.step));
      var mvx = b[0] - a[0], mvy = b[1] - a[1];
      var sign;
      if (dirx) sign = Math.abs(mvx) > 0.5 ? Math.sign(mvx) * dirx : (diry ? -Math.sign(mvy) * diry : dirx);
      else sign = Math.abs(mvy) > 0.5 ? Math.sign(mvy) * diry : -diry;
      var nv = clamp(v + sign * st, h.min, h.max);
      // stop on any snap point we would jump over
      var snaps = h.snaps ? h.snaps(self.state) : [];
      snaps.forEach(function (s) {
        if ((s.v - v) * (nv - s.v) > 0) nv = s.v;
      });
      self.setValue(h, nv, true);
      if (h.onRelease) { h.onRelease(self.state, self); self.update(); }
    });
    g.addEventListener('blur', function () { if (self.toast) self.unsay(800); });
    this.handles.push(h);
  };

  Plot.prototype.touch = function () {
    if (this.touched) return;
    this.touched = true;
    this.handles.forEach(function (h) { h.g.classList.remove('beckon'); });
    this.update();
  };

  Plot.prototype.pathPx = function (h, v) {
    var p = h.at(v, this.state);
    return this.P(p[0], p[1]);
  };

  Plot.prototype.setFromPx = function (h, tx, ty) {
    // project the pointer onto the handle's path by sampling, then refine
    var N = 160, best = h.min, bd = Infinity, i, v, q, d;
    for (i = 0; i <= N; i++) {
      v = h.min + (h.max - h.min) * i / N;
      q = this.pathPx(h, v); d = (q[0] - tx) * (q[0] - tx) + (q[1] - ty) * (q[1] - ty);
      if (d < bd) { bd = d; best = v; }
    }
    var span = (h.max - h.min) / N;
    for (i = -20; i <= 20; i++) {
      v = clamp(best + span * i / 20, h.min, h.max);
      q = this.pathPx(h, v); d = (q[0] - tx) * (q[0] - tx) + (q[1] - ty) * (q[1] - ty);
      if (d < bd) { bd = d; best = v; }
    }
    var raw = best;
    var stepped = clamp(Math.round(raw / h.step) * h.step, h.min, h.max);
    // magnet: snap if the raw position is within a few pixels of a meaningful value
    var snaps = h.snaps ? h.snaps(this.state) : [];
    var rawPx = this.pathPx(h, raw), hit = null;
    var radius = this.phone ? 16 : 14;
    for (var s = 0; s < snaps.length; s++) {
      var sp = this.pathPx(h, snaps[s].v);
      var dist = Math.hypot(sp[0] - rawPx[0], sp[1] - rawPx[1]);
      var lim = (h._snapped === snaps[s].v) ? radius + 6 : radius;
      if (dist < lim && (!hit || dist < hit.d)) hit = { s: snaps[s], d: dist };
    }
    this.setValue(h, hit ? hit.s.v : stepped, false, hit ? hit.s : null);
  };

  Plot.prototype.setValue = function (h, v, fromKey, snapInfo) {
    v = clamp(v, h.min, h.max);
    var old = h.get(this.state);
    if (!snapInfo) {
      var snaps = h.snaps ? h.snaps(this.state) : [];
      for (var i = 0; i < snaps.length; i++) if (Math.abs(snaps[i].v - v) < 1e-9) snapInfo = snaps[i];
    }
    if (v !== old) h.set(this.state, v);
    if (snapInfo) {
      if (h._snapped !== snapInfo.v || fromKey) {
        h._snapped = snapInfo.v;
        this.say(snapInfo.label, h);
        h.ring.classList.remove('pulse'); void h.ring.getBBox(); h.ring.classList.add('pulse');
      }
    } else if (h._snapped != null) {
      h._snapped = null;
      this.toast = null;
    }
    if (fromKey && this.toast) this.unsay(1800);
    this.update();
  };

  Plot.prototype.placeHandle = function (h) {
    var v = h.get(this.state);
    var p = this.pathPx(h, v);
    h.px = p[0]; h.py = p[1];
    var hidden = h.hidden && h.hidden(this.state);
    h.g.style.display = hidden ? 'none' : '';
    h.g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')');
    // orient grip + arrows along the local direction of travel
    var e = (h.max - h.min) / 200;
    var a = this.pathPx(h, clamp(v - e, h.min, h.max)), b = this.pathPx(h, clamp(v + e, h.min, h.max));
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    if (!isFinite(ang) || (a[0] === b[0] && a[1] === b[1])) ang = h.lastAng || 0;
    h.lastAng = ang;
    h.rot.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ')');
    var horiz = Math.abs(Math.cos(ang * Math.PI / 180)) > 0.92, vert = Math.abs(Math.sin(ang * Math.PI / 180)) > 0.92;
    h.g.style.cursor = horiz ? 'ew-resize' : vert ? 'ns-resize' : 'move';
    h.g.setAttribute('aria-valuenow', v);
    h.g.setAttribute('aria-valuetext', h.valueText ? h.valueText(v, this.state) : String(v));
  };

  window.TK = { Plot: Plot, C: C, el: el, money: money, num: num, clamp: clamp };
})();
