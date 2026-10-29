/* Manim Live: a tiny stage engine for film-style interactive figures.
 * No dependencies. Every visual property of a figure is a number in a state
 * object; the engine eases the whole state from where it is to where it is
 * going (cubic in-out, like Manim's smooth rate function), and the figure's
 * draw() paints straight from the in-between state on every frame. Nothing
 * ever jump-cuts, and a new request mid-tween starts from wherever it is.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  function money(v, cents) {
    var neg = v < 0; v = Math.abs(v);
    var s = cents && Math.abs(v - Math.round(v)) > 0.004
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(v).toLocaleString('en-US');
    return (neg ? '-$' : '$') + s;
  }
  function num(v) { return Math.round(v).toLocaleString('en-US'); }

  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, cls, parent, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Graph: scales, axes, marks, labels, handles ---------- */
  function makeGraph(wrap, spec, stage) {
    wrap.innerHTML = '';
    var w = Math.max(280, Math.round(wrap.clientWidth));
    var small = w < 560;
    var h = Math.round(small ? clamp(w * 1.1, 320, 470) : clamp(w * 0.72, 380, 590));
    var m = small ? { l: 50, r: 14, t: 48, b: 62 } : { l: 76, r: 24, t: 62, b: 84 };
    if (spec.margin) Object.assign(m, spec.margin(small));
    var svg = S('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, class: 'gsvg', role: 'img', 'aria-label': spec.alt || spec.title }, wrap);
    var g = {
      svg: svg, w: w, h: h, small: small, stage: stage,
      L: m.l, R: w - m.r, T: m.t, B: h - m.b,
      fs: small ? { lab: 18, tick: 14, ax: 16, val: 17 } : { lab: 26, tick: 19, ax: 21, val: 21 },
      xd: spec.dom.x.slice(), yd: spec.dom.y.slice()
    };
    g.X = function (v) { return g.L + (v - g.xd[0]) / (g.xd[1] - g.xd[0]) * (g.R - g.L); };
    g.Y = function (v) { return g.B - (v - g.yd[0]) / (g.yd[1] - g.yd[0]) * (g.B - g.T); };
    g.iX = function (px) { return g.xd[0] + (px - g.L) / (g.R - g.L) * (g.xd[1] - g.xd[0]); };
    g.iY = function (py) { return g.yd[0] + (g.B - py) / (g.B - g.T) * (g.yd[1] - g.yd[0]); };
    g.ux = function () { return (g.R - g.L) / (g.xd[1] - g.xd[0]); };
    g.uy = function () { return (g.B - g.T) / (g.yd[1] - g.yd[0]); };

    var defs = S('defs', {}, svg);
    var cid = spec.id + '-clip';
    var cp = S('clipPath', { id: cid }, defs);
    S('rect', { x: g.L, y: g.T - 6, width: g.R - g.L + 6, height: g.B - g.T + 6 }, cp);
    g.axesG = S('g', { class: 'axes' }, svg);
    g.under = S('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    g.plot = S('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    g.over = S('g', {}, svg);
    g.labs = S('g', {}, svg);
    g.hand = S('g', {}, svg);

    g.path = function (parent, stroke, width, extra) {
      var a = { fill: 'none', stroke: stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      if (extra) Object.assign(a, extra);
      return S('path', a, parent || g.plot);
    };
    g.area = function (fill, parent) { return S('path', { fill: fill, stroke: 'none' }, parent || g.under); };
    g.dot = function (fill, r) { return S('circle', { r: r || (small ? 6 : 8), fill: fill, stroke: '#eff1ee', 'stroke-width': small ? 2 : 3 }, g.over); };
    // Line in data coords, drawn on from its first end by fraction p (Manim's Create).
    g.seg = function (el, x1, y1, x2, y2, p) {
      if (p == null) p = 1;
      if (p <= 0.001) { el.setAttribute('d', ''); return; }
      var ex = lerp(x1, x2, p), ey = lerp(y1, y2, p);
      el.setAttribute('d', 'M' + g.X(x1).toFixed(1) + ',' + g.Y(y1).toFixed(1) + 'L' + g.X(ex).toFixed(1) + ',' + g.Y(ey).toFixed(1));
    };
    g.poly = function (el, pts) {
      el.setAttribute('d', pts.map(function (p, i) { return (i ? 'L' : 'M') + g.X(p[0]).toFixed(1) + ',' + g.Y(p[1]).toFixed(1); }).join('') + 'Z');
    };
    g.op = function (el, o) {
      o = clamp(o, 0, 1);
      el.style.opacity = o.toFixed(3);
      el.style.display = o < 0.01 ? 'none' : '';
    };
    g.place = function (el, cx, cy) { el.setAttribute('cx', cx.toFixed(1)); el.setAttribute('cy', cy.toFixed(1)); };
    g.dotAt = function (el, x, y, o) { g.place(el, g.X(x), g.Y(y)); g.op(el, o == null ? 1 : o); };

    // Text with a paper halo so it always reads cleanly.
    g.text = function (color, opts) {
      opts = opts || {};
      var t = S('text', {
        class: opts.halo === false ? 'lbl nohalo' : 'lbl', fill: color, 'font-size': opts.size || g.fs.lab, 'font-weight': opts.weight || 700,
        'text-anchor': opts.anchor || 'start', 'dominant-baseline': 'central'
      }, opts.parent || g.labs);
      t._str = null;
      return t;
    };
    g.say = function (el, str) { if (el._str !== str) { el.textContent = str; el._str = str; el._w = null; } };
    g.tw = function (el) {
      if (el._w == null) { var d = el.style.display; el.style.display = ''; el._w = el.getComputedTextLength(); el.style.display = d; }
      return el._w;
    };
    g.at = function (el, px, py, o) {
      el.setAttribute('x', px.toFixed(1)); el.setAttribute('y', py.toFixed(1));
      if (o != null) g.op(el, o);
    };
    // Put a label beside a straight line f(x) so it sits in clear space.
    // side: 'above' | 'below'; anchor: start | end | middle at data x0.
    g.byLine = function (el, f, x0, side, gapPx, o) {
      var wpx = g.tw(el), anc = el.getAttribute('text-anchor');
      var px0 = g.X(x0), a = anc === 'start' ? px0 : anc === 'end' ? px0 - wpx : px0 - wpx / 2;
      var b = a + wpx;
      var ya = g.Y(f(g.iX(a))), yb = g.Y(f(g.iX(b)));
      var half = (+el.getAttribute('font-size')) * 0.5;
      var py = side === 'above' ? Math.min(ya, yb) - gapPx - half : Math.max(ya, yb) + gapPx + half;
      g.at(el, px0, py, o);
      return py;
    };

    // Axes in the film style: medium ink line, outward ticks, minor ticks between.
    g.axes = function (o) {
      var A = g.axesG; A.innerHTML = '';
      var ink = '#4a5257';
      S('path', { d: 'M' + g.L + ',' + (g.T - 18) + 'V' + g.B + 'H' + (g.R + 6), fill: 'none', stroke: ink, 'stroke-width': small ? 2 : 2.5 }, A);
      (o.yt || []).forEach(function (v, i) {
        var y = g.Y(v);
        S('path', { d: 'M' + (g.L - 8) + ',' + y + 'H' + g.L, stroke: ink, 'stroke-width': 2 }, A);
        if (o.yminor && i < o.yt.length - 1) { var ym = g.Y((v + o.yt[i + 1]) / 2); S('path', { d: 'M' + (g.L - 5) + ',' + ym + 'H' + g.L, stroke: ink, 'stroke-width': 1.6 }, A); }
        if (v === 0 && o.skip0) return;
        var t = S('text', { x: g.L - 13, y: y, 'text-anchor': 'end', 'dominant-baseline': 'central', class: 'tick', 'font-size': g.fs.tick }, A);
        t.textContent = o.yf ? o.yf(v) : v;
      });
      (o.xt || []).forEach(function (v, i) {
        var x = g.X(v);
        S('path', { d: 'M' + x + ',' + g.B + 'V' + (g.B + 8), stroke: ink, 'stroke-width': 2 }, A);
        if (o.xminor && i < o.xt.length - 1) { var xm = g.X((v + o.xt[i + 1]) / 2); S('path', { d: 'M' + xm + ',' + g.B + 'V' + (g.B + 5), stroke: ink, 'stroke-width': 1.6 }, A); }
        if (v === 0 && o.skip0 !== false) return;
        var t = S('text', { x: x, y: g.B + 12 + g.fs.tick * 0.6, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'tick', 'font-size': g.fs.tick }, A);
        t.textContent = o.xf ? o.xf(v) : v;
      });
      if (o.ylab) {
        var yl = S('text', { x: g.L - (small ? 40 : 56), y: g.T - 36 + (small ? 4 : 0), 'text-anchor': 'start', 'dominant-baseline': 'central', class: 'axt', 'font-size': g.fs.ax }, A);
        yl.textContent = o.ylab;
      }
      if (o.xlab) {
        var xl = S('text', { x: g.R, y: g.B + (small ? 46 : 64), 'text-anchor': 'end', 'dominant-baseline': 'central', class: 'axt', 'font-size': g.fs.ax }, A);
        xl.textContent = o.xlab;
      }
    };

    // A single draggable handle that lives on the graph. Pointer + keyboard.
    g.handle = function (o) {
      var r = small ? 14 : 16;
      var el = S('g', { class: 'handle', tabindex: 0, role: 'slider', 'aria-label': o.label }, g.hand);
      S('circle', { r: r + 14, class: 'hit', fill: 'transparent' }, el);
      S('circle', { r: r + 6, fill: o.color, opacity: 0.16, class: 'ring' }, el);
      S('circle', { r: r, fill: '#ffffff', stroke: o.color, 'stroke-width': 3.5 }, el);
      var c = r * 0.42;
      var d = o.axis === 'x'
        ? 'M' + (-c * 0.4) + ',' + (-c) + 'L' + (-c * 1.5) + ',0L' + (-c * 0.4) + ',' + c + 'M' + (c * 0.4) + ',' + (-c) + 'L' + (c * 1.5) + ',0L' + (c * 0.4) + ',' + c
        : 'M' + (-c) + ',' + (-c * 0.4) + 'L0,' + (-c * 1.5) + 'L' + c + ',' + (-c * 0.4) + 'M' + (-c) + ',' + (c * 0.4) + 'L0,' + (c * 1.5) + 'L' + c + ',' + (c * 0.4);
      S('path', { d: d, fill: 'none', stroke: o.color, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, el);
      el.style.cursor = o.axis === 'x' ? 'ew-resize' : 'ns-resize';
      var hint = null;
      if (!stage.touched) {
        hint = S('text', { class: 'hint', 'font-size': small ? 15 : 17, 'dominant-baseline': 'central', 'text-anchor': o.hintAnchor || 'start' }, g.hand);
        hint.textContent = o.hint || 'drag';
      }
      var dragging = false;
      var rect = null;
      function pt(e) { return [e.clientX - rect.left, e.clientY - rect.top]; }
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        rect = svg.getBoundingClientRect();
        dragging = true; el.classList.add('active');
        try { el.setPointerCapture(e.pointerId); } catch (_) { }
        stage.grab(true);
        var p = pt(e); stage.user(o.drag(p[0], p[1]), 140);
      });
      el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var p = pt(e); stage.user(o.drag(p[0], p[1]), 140);
      });
      function end() {
        if (!dragging) return;
        dragging = false; el.classList.remove('active');
        stage.grab(false);
        stage.user(o.release ? o.release() : {}, 500);
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('keydown', function (e) {
        var k = e.key, dir = 0;
        if (k === 'ArrowUp' || k === 'ArrowRight') dir = 1;
        else if (k === 'ArrowDown' || k === 'ArrowLeft') dir = -1;
        if (!dir) return;
        e.preventDefault();
        stage.user(o.key(dir), 380);
      });
      var api = {
        el: el,
        at: function (px, py, op) {
          el.setAttribute('transform', 'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ')');
          g.op(el, op == null ? 1 : op);
          el.style.pointerEvents = (op == null || op > 0.5) ? '' : 'none';
          if (hint) {
            if (stage.touched) { hint.remove(); hint = null; return; }
            var dx = (o.hintAnchor === 'end' ? -1 : 1) * (r + 12);
            hint.setAttribute('x', (px + dx + (o.hintDx || 0)).toFixed(1));
            hint.setAttribute('y', (py + (o.hintDy || 0)).toFixed(1));
            g.op(hint, (op == null ? 1 : op));
          }
        },
        value: function (v, txt) { el.setAttribute('aria-valuenow', v); el.setAttribute('aria-valuetext', txt || v); }
      };
      return api;
    };
    return g;
  }

  /* ---------- Stage: state, tween, narration, table, controls, story ---------- */
  function Stage(spec, mount) {
    var self = this;
    this.spec = spec;
    this.cur = Object.assign({}, spec.state);
    this.tgt = Object.assign({}, spec.state);
    this.beat = null;
    this.playing = false;
    this.touched = false;
    this.anim = null;
    this.timer = null;

    var sec = H('section', 'fig', mount);
    sec.id = spec.id;
    sec.setAttribute('aria-labelledby', spec.id + '-t');
    var st = H('div', 'stage', sec);
    var head = H('header', 'head', st);
    H('p', 'fig-num', head, spec.num);
    var h2 = H('h2', 'fig-title', head, spec.title); h2.id = spec.id + '-t';
    this.gwrap = H('div', 'graph', st);
    this.narr = H('p', 'narr', st);
    this.narr.setAttribute('aria-live', 'polite');
    var ctrl = H('div', 'ctrl', st);
    this.tableWrap = H('div', 'ro-wrap', st);
    this.buildTable();

    // Story row
    var story = H('div', 'story', ctrl);
    this.playBtn = H('button', 'play', story);
    this.playBtn.type = 'button';
    this.playBtn.addEventListener('click', function () { self.playing ? self.pause() : self.play(); });
    var dots = H('ol', 'beats', story);
    dots.setAttribute('aria-label', 'Story steps');
    this.dots = spec.beats.map(function (b, i) {
      var li = H('li', '', dots);
      var d = H('button', 'beat', li, '<span class="fill"></span><span class="n">' + (i + 1) + '</span>');
      d.type = 'button';
      d.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + spec.beats.length);
      d.addEventListener('click', function () { self.pause(); self.goBeat(i); });
      return d;
    });

    // Knobs
    var knobs = H('div', 'knobs', ctrl);
    this.syncers = [];
    (spec.controls || []).forEach(function (c) { self.syncers.push(self.makeControl(c, knobs)); });

    this.layout();
    var ro = new ResizeObserver(function () {
      var w = Math.round(self.gwrap.clientWidth);
      if (w !== self.lastW) self.layout();
    });
    ro.observe(this.gwrap);

    var start = spec.startBeat != null ? spec.startBeat : spec.beats.length - 1;
    this.goBeat(start, 0);
    this.setPlayLabel();
  }

  Stage.prototype.layout = function () {
    this.lastW = Math.round(this.gwrap.clientWidth);
    this.g = makeGraph(this.gwrap, this.spec, this);
    this.spec.build(this.g, this);
    this.render();
  };

  Stage.prototype.render = function () {
    this.spec.draw(this.g, this.cur, this);
    this.fillTable(this.cur);
  };

  Stage.prototype.go = function (target, dur) {
    var self = this;
    if (dur == null) dur = 900;
    if (RM.matches) dur = Math.min(dur, 1);
    var from = Object.assign({}, this.cur);
    var to = Object.assign({}, target);
    if (this.anim) cancelAnimationFrame(this.anim);
    if (dur <= 1) { this.cur = to; this.render(); return; }
    var t0 = performance.now();
    var step = function (now) {
      var p = clamp((now - t0) / dur, 0, 1), e = ease(p);
      for (var k in to) {
        var a = from[k], b = to[k];
        self.cur[k] = (typeof a === 'number' && typeof b === 'number') ? a + (b - a) * e : b;
      }
      self.render();
      self.anim = p < 1 ? requestAnimationFrame(step) : null;
    };
    this.anim = requestAnimationFrame(step);
  };

  Stage.prototype.beatState = function (i) {
    var s = Object.assign({}, this.spec.state);
    for (var j = 0; j <= i; j++) Object.assign(s, this.spec.beats[j].to || {});
    if (this.spec.constrain) this.spec.constrain(s);
    return s;
  };

  Stage.prototype.goBeat = function (i, dur) {
    var b = this.spec.beats[i];
    this.beat = i;
    this.tgt = this.beatState(i);
    this.go(this.tgt, dur != null ? dur : (b.dur || 1100));
    this.setNarration(b.say);
    this.syncControls();
    this.dots.forEach(function (d, j) {
      d.classList.toggle('on', j === i);
      d.classList.toggle('done', j < i);
      d.setAttribute('aria-current', j === i ? 'step' : 'false');
    });
  };

  // The student takes over: stop the film, apply the change, narrate live.
  Stage.prototype.user = function (patch, dur) {
    if (this.playing) this.pause();
    this.touched = true;
    this.beat = null;
    this.dots.forEach(function (d) { d.classList.remove('on', 'done', 'run'); d.setAttribute('aria-current', 'false'); });
    var s = Object.assign({}, this.tgt, patch || {});
    if (this.spec.constrain) this.spec.constrain(s, this);
    this.tgt = s;
    this.go(s, dur == null ? 650 : dur);
    this.setNarration(this.spec.narrate(s, this));
    this.syncControls();
  };
  Stage.prototype.grab = function (on) { this.dragging = on; };

  Stage.prototype.play = function () {
    var self = this;
    this.playing = true;
    this.touched = true;
    var startAt = (this.beat == null || this.beat >= this.spec.beats.length - 1) ? 0 : this.beat + 1;
    if (startAt === 0 && this.spec.blank) {
      // Start the film from a clean stage, exactly like the video.
      var s = Object.assign({}, this.beatState(0), this.spec.blank);
      if (this.anim) cancelAnimationFrame(this.anim);
      this.anim = null;
      var from = Object.assign({}, this.cur);
      var t0 = performance.now(), dur = RM.matches ? 1 : 450;
      // fade out to blank first, then begin
      var step = function (now) {
        var p = clamp((now - t0) / dur, 0, 1), e = ease(p);
        for (var k in s) { var a = from[k], b = s[k]; self.cur[k] = (typeof a === 'number' && typeof b === 'number') ? a + (b - a) * e : b; }
        self.render();
        if (p < 1) self.anim = requestAnimationFrame(step);
        else if (self.playing) self.runBeat(0);
      };
      this.anim = requestAnimationFrame(step);
    } else {
      this.runBeat(startAt);
    }
    this.setPlayLabel();
  };
  Stage.prototype.runBeat = function (i) {
    var self = this;
    if (!this.playing) return;
    this.goBeat(i);
    var b = this.spec.beats[i];
    var words = b.say.replace(/<[^>]+>/g, '').split(/\s+/).length;
    var hold = Math.max(3600, words * 290 + 1200) + (b.dur || 1100);
    if (RM.matches) hold = Math.max(hold, 5000);
    var d = this.dots[i];
    d.classList.add('run');
    d.style.setProperty('--hold', hold + 'ms');
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      d.classList.remove('run');
      if (!self.playing) return;
      if (i + 1 < self.spec.beats.length) self.runBeat(i + 1);
      else { self.playing = false; self.setPlayLabel(); }
    }, hold);
  };
  Stage.prototype.pause = function () {
    this.playing = false;
    clearTimeout(this.timer);
    this.dots.forEach(function (d) { d.classList.remove('run'); });
    this.setPlayLabel();
  };
  Stage.prototype.setPlayLabel = function () {
    var ICON_PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h3.6v13H5zM11.4 3.5H15v13h-3.6z" fill="currentColor"/></svg>';
    var atEnd = this.beat === this.spec.beats.length - 1;
    var label = this.playing ? 'Pause' : (atEnd ? 'Play the story' : (this.beat != null && this.beat > 0 ? 'Continue the story' : 'Play the story'));
    this.playBtn.innerHTML = (this.playing ? ICON_PAUSE : ICON_PLAY) + '<span>' + label + '</span>';
  };

  Stage.prototype.setNarration = function (html) {
    if (this.narr._html === html) return;
    this.narr._html = html;
    this.narr.innerHTML = html;
    this.narr.classList.remove('in');
    void this.narr.offsetWidth;
    this.narr.classList.add('in');
  };

  /* Readout table: a small film-style comparison table. */
  Stage.prototype.buildTable = function () {
    var t = this.spec.table;
    if (!t) return;
    var tb = H('table', 'ro', this.tableWrap);
    var thead = H('thead', '', tb), hr = H('tr', '', thead);
    H('th', '', hr, '<span class="sr">Measure</span>');
    this.thCells = t.cols.map(function (c) { var th = H('th', '', hr, c); th.scope = 'col'; return th; });
    var body = H('tbody', '', tb);
    this.cells = t.rows.map(function (r) {
      var tr = H('tr', '', body);
      var th = H('th', '', tr, r.label); th.scope = 'row';
      if (r.color) th.style.color = r.color;
      return t.cols.map(function () { return H('td', '', tr); });
    });
  };
  Stage.prototype.fillTable = function (s) {
    var t = this.spec.table;
    if (!t) return;
    var act = t.active ? t.active(this.tgt) : -1;
    var self = this;
    // During the film a column appears only once the story reaches it.
    var vis = t.cols.map(function (c, j) { return (self.beat == null || !t.reveal || self.beat >= t.reveal[j]) ? '1' : '0'; });
    t.rows.forEach(function (r, i) {
      var vals = r.get(s, self.tgt);
      vals.forEach(function (v, j) {
        var c = self.cells[i][j];
        var str = typeof v === 'object' ? v.t : v;
        if (c._s !== str) { c.textContent = str; c._s = str; }
        c.style.color = typeof v === 'object' && v.c ? v.c : '';
        c.classList.toggle('act', j === act);
        if (c.style.opacity !== vis[j]) c.style.opacity = vis[j];
      });
    });
    this.thCells.forEach(function (th, j) { th.classList.toggle('act', j === act); if (th.style.opacity !== vis[j]) th.style.opacity = vis[j]; });
  };

  /* Big, plain controls: a stepper, a segmented choice, or a single button. */
  Stage.prototype.makeControl = function (c, parent) {
    var self = this;
    var box = H('div', 'knob knob-' + c.type, parent);
    var id = this.spec.id + '-' + (c.key || 'btn');
    if (c.type === 'stepper') {
      var lab = H('span', 'klabel', box, c.label); lab.id = id + '-l';
      var row = H('div', 'stepper', box);
      row.setAttribute('role', 'group'); row.setAttribute('aria-labelledby', id + '-l');
      var minus = H('button', 'sbtn', row, '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>');
      var val = H('output', 'sval', row);
      var plus = H('button', 'sbtn', row, '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4v12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>');
      minus.type = plus.type = 'button';
      minus.setAttribute('aria-label', 'Decrease ' + c.aria);
      plus.setAttribute('aria-label', 'Increase ' + c.aria);
      var bump = function (dir) {
        var v = clamp(+(self.tgt[c.key] + dir * c.step).toFixed(4), c.min, c.max);
        if (v === self.tgt[c.key]) return;
        var p = {}; p[c.key] = v; self.user(p, 600);
      };
      // Press and hold repeats, gently.
      [[minus, -1], [plus, 1]].forEach(function (pair) {
        var b = pair[0], dir = pair[1], t1 = null, t2 = null;
        var stop = function () { clearTimeout(t1); clearInterval(t2); };
        b.addEventListener('pointerdown', function (e) {
          if (e.button) return;
          bump(dir);
          t1 = setTimeout(function () { t2 = setInterval(function () { bump(dir); }, 150); }, 450);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(dir); } });
      });
      return function () {
        var v = self.tgt[c.key];
        val.textContent = c.fmt ? c.fmt(v) : v;
        minus.disabled = v <= c.min; plus.disabled = v >= c.max;
      };
    }
    if (c.type === 'seg') {
      var lab2 = H('span', 'klabel', box, c.label); lab2.id = id + '-l';
      var grp = H('div', 'seg', box);
      grp.setAttribute('role', 'radiogroup'); grp.setAttribute('aria-labelledby', id + '-l');
      var btns = c.options.map(function (o) {
        var b = H('button', 'sopt', grp, o[1]);
        b.type = 'button'; b.setAttribute('role', 'radio');
        b.addEventListener('click', function () {
          var p = {}; p[c.key] = o[0];
          if (c.extra) Object.assign(p, c.extra(o[0], self.tgt));
          self.user(p, c.dur || 1000);
        });
        return b;
      });
      return function () {
        var v = self.tgt[c.key];
        btns.forEach(function (b, i) { var on = c.options[i][0] === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      };
    }
    if (c.type === 'button') {
      H('span', 'klabel', box, c.label);
      var b = H('button', 'act-btn', box, c.text);
      b.type = 'button';
      b.addEventListener('click', function () { c.click(self); });
      return function () { if (c.enabled) b.disabled = !c.enabled(self.tgt); };
    }
    return function () { };
  };
  Stage.prototype.syncControls = function () { this.syncers.forEach(function (f) { f(); }); };

  window.ManimLive = { Stage: Stage, S: S, H: H, money: money, num: num, clamp: clamp, lerp: lerp };
})();
