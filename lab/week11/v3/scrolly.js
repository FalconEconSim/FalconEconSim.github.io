/* Scrolly engine for the Week 11 lab, v3.
 * Stage: a keyed scene graph over one SVG. A figure describes the whole picture for a
 * state as a plain object {key: spec}; the stage tweens every element from wherever it
 * is to where the spec says, so any step can follow any other (scrolling back included).
 * Story: watches the steps of one figure and tells it which step is active. */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = d3.easeCubicInOut;

  function setAll(sel, attrs) {
    for (var k in attrs) if (attrs[k] !== undefined) sel.attr(k, attrs[k]);
  }

  function Stage(host, label) {
    this.host = host;
    this.svg = d3.select(host).append('svg')
      .attr('class', 'stage-svg').attr('role', 'img').attr('aria-label', label || '');
    this.layers = {};
    var self = this;
    ['axis', 'area', 'guide', 'curve', 'mark', 'label'].forEach(function (n) {
      self.layers[n] = self.svg.append('g').attr('class', 'L-' + n);
    });
    this.els = new Map();
  }

  Stage.prototype.measure = function () {
    var w = Math.max(240, Math.round(this.host.clientWidth));
    var h = Math.max(200, Math.round(this.host.clientHeight));
    this.svg.attr('viewBox', '0 0 ' + w + ' ' + h).attr('width', w).attr('height', h);
    this.svg.classed('narrow', w < 560);
    return { w: w, h: h, narrow: w < 560 };
  };

  /* spec fields:
   *   tag        svg element name
   *   layer      one of the layer names (default 'curve')
   *   attrs      animated attributes (d, x, y, cx, r, fill, stroke, ...)
   *   set        attributes applied instantly (class, text-anchor, ...)
   *   from       attributes to start from when the element appears
   *   draw       0..1, paths only: how much of the stroke is drawn (draw-in animation)
   *   opacity    target opacity (default 1)
   *   text       text content (swapped instantly) | num + fmt (counted)
   *   delay      ms delay before this element moves
   *   dur        override duration for this element */
  Stage.prototype.render = function (spec, dur) {
    if (REDUCED) dur = 0;
    var seen = {};
    var self = this;
    Object.keys(spec).forEach(function (key) {
      var s = spec[key];
      if (!s) return;
      seen[key] = true;
      var rec = self.els.get(key);
      if (!rec) {
        var node = self.layers[s.layer || 'curve'].append(s.tag).attr('data-k', key);
        rec = { node: node, visible: false, num: null, hasDraw: false };
        self.els.set(key, rec);
      }
      var n = rec.node;
      var d = s.dur !== undefined ? s.dur : dur;
      if (REDUCED) d = 0;
      var delay = REDUCED ? 0 : (s.delay || 0);
      if (s.set) setAll(n, s.set);
      var drawing = s.draw !== undefined;
      if (drawing && !rec.hasDraw) {
        n.attr('pathLength', 1).attr('stroke-dasharray', '1 1').attr('stroke-dashoffset', 1);
        rec.hasDraw = true;
      }
      if (!rec.visible) {
        n.interrupt('m');
        setAll(n, s.attrs || {});
        if (s.from) setAll(n, s.from);
        if (drawing) {
          n.attr('stroke-dashoffset', 1).attr('opacity', s.opacity !== undefined ? s.opacity : 1);
        } else if (s.pop) {
          n.attr('opacity', s.opacity !== undefined ? s.opacity : 1);
        } else {
          n.attr('opacity', 0);
        }
        if (s.text !== undefined) n.text(s.text);
        if (s.num !== undefined) { n.text(s.fmt(s.num)); rec.num = s.num; }
      }
      var t = n.transition('m').delay(delay).duration(d).ease(EASE);
      var a = s.attrs || {};
      for (var k in a) if (a[k] !== undefined) t.attr(k, a[k]);
      t.attr('opacity', s.opacity !== undefined ? s.opacity : 1);
      if (drawing) t.attr('stroke-dashoffset', 1 - s.draw);
      if (s.text !== undefined && rec.visible && n.text() !== s.text) {
        if (delay) { var txt = s.text; t.on('start.txt', function () { this.textContent = txt; }); }
        else n.text(s.text);
      }
      if (s.num !== undefined && rec.visible && rec.num !== s.num) {
        var from = rec.num === null ? s.num : rec.num, to = s.num, fmt = s.fmt;
        t.tween('num', function () {
          var el = this, i = d3.interpolateNumber(from, to);
          return function (u) { el.textContent = fmt(i(u)); };
        });
      }
      if (s.num !== undefined) rec.num = s.num;
      rec.visible = true;
    });
    this.els.forEach(function (rec, key) {
      if (seen[key] || !rec.visible) return;
      rec.visible = false;
      var t = rec.node.transition('m').duration(REDUCED ? 0 : dur * 0.7).ease(EASE);
      if (rec.hasDraw) t.attr('stroke-dashoffset', 1).transition().duration(0).attr('opacity', 0);
      else t.attr('opacity', 0);
    });
  };

  /* ---------- small builders shared by the figures ---------- */
  var K = {};
  K.line = function (pts, sx, sy) {
    return 'M' + pts.map(function (p) { return sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join('L');
  };
  K.poly = function (pts, sx, sy) { return K.line(pts, sx, sy) + 'Z'; };
  K.money = function (v) { return '$' + Math.round(v).toLocaleString('en-US'); };
  K.int = function (v) { return String(Math.round(v)); };

  /* Axes: tick marks and numbers are keyed by value, so a domain change glides them. */
  K.axes = function (spec, D, sx, sy, o) {
    var x0 = sx.range()[0], x1 = sx.range()[1], y0 = sy.range()[0], y1 = sy.range()[1];
    spec.xaxis = { tag: 'path', layer: 'axis', set: { class: 'ax-line' }, attrs: { d: 'M' + x0 + ',' + y0 + 'H' + (x1 + 6) } };
    spec.yaxis = { tag: 'path', layer: 'axis', set: { class: 'ax-line' }, attrs: { d: 'M' + x0 + ',' + y0 + 'V' + (y1 - 6) } };
    (o.xt || []).forEach(function (v) {
      if (o.xhide && o.xhide(v)) return;
      spec['xt' + v] = { tag: 'line', layer: 'axis', set: { class: 'ax-tick' }, attrs: { x1: sx(v), x2: sx(v), y1: y0, y2: y0 + 7 } };
      spec['xn' + v] = { tag: 'text', layer: 'axis', set: { class: 'ax-num', 'text-anchor': 'middle' }, attrs: { x: sx(v), y: y0 + (D.narrow ? 24 : 28) }, text: o.xf ? o.xf(v) : String(v) };
    });
    (o.yt || []).forEach(function (v) {
      spec['yt' + v] = { tag: 'line', layer: 'axis', set: { class: 'ax-tick' }, attrs: { x1: x0 - 7, x2: x0, y1: sy(v), y2: sy(v) } };
      spec['yn' + v] = { tag: 'text', layer: 'axis', set: { class: 'ax-num', 'text-anchor': 'end' }, attrs: { x: x0 - 11, y: sy(v) + 5 }, text: o.yf ? o.yf(v) : String(v) };
    });
    if (o.xl) spec.xl = { tag: 'text', layer: 'axis', set: { class: 'ax-title', 'text-anchor': 'end' }, attrs: { x: x1 + 4, y: y0 + (D.narrow ? 46 : 56) }, text: o.xl };
    if (o.yl) spec.yl = { tag: 'text', layer: 'axis', set: { class: 'ax-title', 'text-anchor': 'start' }, attrs: { x: x0 - (D.narrow ? 40 : 52), y: y1 - (D.narrow ? 14 : 20) }, text: o.yl };
  };

  /* A thick curve that draws itself in. */
  K.curve = function (d, color, extra) {
    var s = { tag: 'path', layer: 'curve', set: { class: 'curve' }, attrs: { d: d, stroke: color }, draw: 1 };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  };
  K.label = function (x, y, text, color, anchor, extra) {
    var s = { tag: 'text', layer: 'label', set: { class: 'lbl', 'text-anchor': anchor || 'start' }, attrs: { x: x, y: y, fill: color }, text: text };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  };
  K.dot = function (x, y, color, r) {
    return { tag: 'circle', layer: 'mark', set: { class: 'dot' }, attrs: { cx: x, cy: y, r: r || 9, fill: color } };
  };
  K.guide = function (x1, y1, x2, y2, color) {
    return { tag: 'line', layer: 'guide', set: { class: 'guide' }, attrs: { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || '#4a5257' } };
  };
  /* Vertical arrow as one path (shaft + head) so its length can tween. */
  K.arrow = function (x, yFrom, yTo, color) {
    var up = yTo < yFrom ? 1 : -1, hh = 12, hw = 8;
    var d = 'M' + x + ',' + yFrom + 'V' + (yTo + up * hh * 0.6) +
      'M' + (x - hw) + ',' + (yTo + up * hh) + 'L' + x + ',' + yTo + 'L' + (x + hw) + ',' + (yTo + up * hh);
    return { tag: 'path', layer: 'mark', set: { class: 'arrow' }, attrs: { d: d, stroke: color } };
  };

  /* ---------- Story: one figure's steps, scroll position -> active step ---------- */
  var stories = [];
  function Story(section, fig) {
    this.section = section;
    this.fig = fig;
    this.steps = Array.prototype.slice.call(section.querySelectorAll('.step'));
    this.panel = section.querySelector('.panel');
    this.active = -2;
    this.bars = Array.prototype.slice.call(section.querySelectorAll('.prog i'));
    stories.push(this);
  }
  Story.prototype.trigger = function () {
    var vh = window.innerHeight;
    if (window.innerWidth < 900) {
      var pb = this.panel.getBoundingClientRect().height;
      return pb + (vh - pb) * 0.32;
    }
    return vh * 0.55;
  };
  Story.prototype.update = function () {
    var ty = this.trigger(), idx = -1, vh = window.innerHeight;
    for (var i = 0; i < this.steps.length; i++) {
      var thr = i === 0 ? ty + vh * 0.15 : ty;
      if (this.steps[i].getBoundingClientRect().top < thr) idx = i;
    }
    if (idx !== this.active) {
      var prev = this.active;
      this.active = idx;
      this.steps.forEach(function (s, j) { s.classList.toggle('is-active', j === idx); });
      this.bars.forEach(function (b, j) { b.classList.toggle('on', j <= idx); });
      this.section.classList.toggle('is-try', idx === this.steps.length - 1);
      this.fig.go(idx, prev);
    }
  };

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; stories.forEach(function (s) { s.update(); }); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { stories.forEach(function (s) { s.fig.redraw(); s.update(); }); }, 120);
  });

  window.Scrolly = { Stage: Stage, Story: Story, K: K, REDUCED: REDUCED, poke: onScroll };
})();
