/* Deterministic label placement.
   ---------------------------------------------------------------------------
   Every figure page used to lay its labels out with a d3 force simulation:
   labels were scattered at random around their anchor, then drifted into place
   over a second or so, and could be dragged. Moving a slider set the whole
   thing swimming again.

   The prototype we settled on does none of that. It works out where each label
   belongs once, puts it there, and draws a leader back to the anchor. Move a
   slider and the label is simply in its new place on the next frame. Nothing
   animates, nothing settles, nothing is draggable.

   This is that placement, shared by every figure system on the site. The search
   is the prototype's: twelve directions around the anchor at four distances,
   each candidate scored on how clear it is of the drawn curves, of the other
   labels, and of the anchor itself, with a mild preference for staying close.
   No randomness anywhere, so the same figure state always produces the same
   layout.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';
  if (window.EC224Place) return;

  var CELL = 4;          /* occupancy grid resolution, in node units */
  var RINGS = 4;         /* how far out the clearance probe looks */

  /* ── occupancy grid ─────────────────────────────────────────────────────── */
  function Grid(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0;
    this.W = Math.max(1, Math.ceil((x1 - x0) / CELL));
    this.H = Math.max(1, Math.ceil((y1 - y0) / CELL));
    this.a = new Uint8Array(this.W * this.H);
  }
  Grid.prototype.mark = function (x, y) {
    var gx = ((x - this.x0) / CELL) | 0, gy = ((y - this.y0) / CELL) | 0;
    if (gx >= 0 && gy >= 0 && gx < this.W && gy < this.H) this.a[gy * this.W + gx] = 1;
  };
  Grid.prototype.markRect = function (x, y, w, h) {
    for (var yy = y; yy <= y + h; yy += CELL) for (var xx = x; xx <= x + w; xx += CELL) this.mark(xx, yy);
  };
  /* Distance in units from a box to the nearest marked cell, capped. */
  Grid.prototype.clearance = function (x, y, w, h) {
    var gx0 = ((x - this.x0) / CELL) | 0, gy0 = ((y - this.y0) / CELL) | 0;
    var gx1 = ((x + w - this.x0) / CELL) | 0, gy1 = ((y + h - this.y0) / CELL) | 0;
    for (var r = 0; r <= RINGS; r++) {
      for (var gy = gy0 - r; gy <= gy1 + r; gy++) {
        for (var gx = gx0 - r; gx <= gx1 + r; gx++) {
          if (r > 0 && gx !== gx0 - r && gx !== gx1 + r && gy !== gy0 - r && gy !== gy1 + r) continue;
          if (gx < 0 || gy < 0 || gx >= this.W || gy >= this.H) continue;
          if (this.a[gy * this.W + gx]) return r * CELL;
        }
      }
    }
    return (RINGS + 1) * CELL;
  };

  /* ── the drawn ink, sampled in the svg's own user space ─────────────────── */
  function sampleInk(grid, svg) {
    if (!svg) return;
    var el = svg.node ? svg.node() : svg;              /* accept a d3 selection */
    if (!el || !el.querySelectorAll) return;
    /* a group inside the plot only contains labels; the ink is on the svg */
    if (el.tagName && el.tagName.toLowerCase() !== "svg" && el.ownerSVGElement) {
      el = el.ownerSVGElement;
    }
    el.querySelectorAll('line, path, polyline').forEach(function (s) {
      if (s.closest('.tick, .domain')) return;
      if (s.hasAttribute('data-fl-leader') || s.hasAttribute('data-place-leader')) return;
      var stroke = (s.getAttribute('stroke') || '').toLowerCase();
      if (!stroke || stroke === 'none') return;
      /* gridlines are thin and pale; they are not something to dodge */
      if (parseFloat(s.getAttribute('stroke-width') || '1') < 1.5) return;
      var op = parseFloat(s.getAttribute('opacity') || '1');
      if (op < 0.15) return;
      try {
        var L = s.getTotalLength();
        if (!L || !isFinite(L)) return;
        var n = Math.min(240, Math.max(8, Math.round(L / CELL)));
        for (var i = 0; i <= n; i++) {
          var p = s.getPointAtLength(L * i / n);
          grid.mark(p.x, p.y);
        }
      } catch (e) { /* a shape with no length; nothing to sample */ }
    });
    /* filled regions and existing static text are obstacles too */
    el.querySelectorAll('text').forEach(function (t) {
      if (t.closest('.fig-label')) return;
      try {
        var b = t.getBBox();
        if (b.width) grid.markRect(b.x, b.y, b.width, b.height);
      } catch (e) {}
    });
  }

  /* A canvas holds its curves as pixels, not shapes. Sample it on a coarse
     stride: anything neither transparent nor near-white counts as drawn. The
     canvas backing store is usually larger than its CSS box (device pixel
     ratio), and the labels are positioned in CSS pixels, so scale as we go. */
  function sampleCanvas(grid, cvs, cssW, cssH) {
    if (!cvs || !cvs.width || !cvs.height) return;
    var data;
    try {
      data = cvs.getContext("2d", { willReadFrequently: true })
                .getImageData(0, 0, cvs.width, cvs.height).data;
    } catch (e) { return; }
    var sx = (cssW || cvs.clientWidth || cvs.width) / cvs.width;
    var sy = (cssH || cvs.clientHeight || cvs.height) / cvs.height;
    var step = Math.max(1, Math.round(2 / Math.max(sx, 0.2)));
    for (var y = 0; y < cvs.height; y += step) {
      for (var x = 0; x < cvs.width; x += step) {
        var i = (y * cvs.width + x) * 4;
        if (data[i + 3] < 40) continue;
        if (data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232) continue;
        grid.mark(x * sx, y * sy);
      }
    }
  }

  /* ── the search ─────────────────────────────────────────────────────────── */
  var ANGLES = 12, DISTS = [30, 50, 72, 96];

  function solve(nodes, cfg) {
    cfg = cfg || {};
    if (!nodes || !nodes.length) return;

    var wOf = cfg.w || function (d) { return d.lw || 60; };
    var hOf = cfg.h || function () { return cfg.labelHeight || 16; };
    var anchorOf = cfg.anchor || function (d) {
      return { x: d.fx_anchor != null ? d.fx_anchor : d.x, y: d.fy_anchor != null ? d.fy_anchor : d.y };
    };
    var b = typeof cfg.bounds === "function" ? cfg.bounds() : cfg.bounds;
    if (!b) b = { x0: 0, y0: 0, x1: cfg.width || 1000, y1: cfg.height || 1000 };
    var centred = cfg.origin === 'center';

    var grid = new Grid(b.x0 - 40, b.y0 - 40, b.x1 + 40, b.y1 + 40);
    sampleInk(grid, cfg.svg);
    if (cfg.canvas) sampleCanvas(grid, (typeof cfg.canvas === "function" ? cfg.canvas() : cfg.canvas), b.x1, b.y1);
    if (cfg.obstacles) cfg.obstacles.forEach(function (p) { grid.mark(p[0], p[1]); });

    /* every anchor is a fixed point the label must not cover */
    nodes.forEach(function (d) {
      var a = anchorOf(d);
      grid.markRect(a.x - 4, a.y - 4, 8, 8);
    });

    var placed = [];
    nodes.forEach(function (d) {
      var a = anchorOf(d), w = wOf(d), h = hOf(d);
      /* boxOff lets a figure say "this one belongs here", and it is honoured
         unless that spot is unusable. */
      var want = cfg.prefer && cfg.prefer(d);
      var best = null;

      function consider(x, y, dist, bonus) {
        if (x < b.x0 || y < b.y0 || x + w > b.x1 || y + h > b.y1) return;
        var sc = grid.clearance(x, y, w, h) - dist * 0.045 + (bonus || 0);
        for (var i = 0; i < placed.length; i++) {
          var p = placed[i];
          if (!(x + w + 4 <= p.x || p.x + p.w + 4 <= x || y + h + 4 <= p.y || p.y + p.h + 4 <= y)) sc -= 14;
        }
        if (!best || sc > best.sc) best = { x: x, y: y, sc: sc };
      }

      if (want) consider(a.x + want.x, a.y + want.y, Math.abs(want.x) + Math.abs(want.y), 3);

      for (var ai = 0; ai < ANGLES; ai++) {
        for (var di = 0; di < DISTS.length; di++) {
          var ang = (Math.PI * 2 / ANGLES) * ai, dist = DISTS[di];
          var cx = a.x + Math.cos(ang) * dist, cy = a.y - Math.sin(ang) * dist;
          consider(cx - w / 2, cy - h / 2, dist, 0);
        }
      }
      if (!best) best = { x: Math.min(Math.max(a.x + 10, b.x0), b.x1 - w), y: Math.min(Math.max(a.y - h / 2, b.y0), b.y1 - h) };

      placed.push({ x: best.x, y: best.y, w: w, h: h });
      grid.markRect(best.x, best.y, w, h);
      if (centred) { d.x = best.x + w / 2; d.y = best.y + h / 2; }
      else { d.x = best.x; d.y = best.y; }
      d.vx = 0; d.vy = 0;
    });
  }

  var busy = false;

  /* Called from a figure's own repaint, once the curves for this frame are
     drawn. Skipped while settle() is already solving, so one redraw never
     costs two solves. */
  function reflow(nodes, cfg) {
    if (busy || !nodes || !cfg) return;
    try { solve(nodes, cfg); } catch (e) {}
  }

  /* ── a stand-in for the force simulation the pages used to build ────────── */
  /* Same surface the figures call, so their draw code does not change: on,
     alpha, alphaTarget, restart, stop, nodes. Every one of those that used to
     wake the physics now just re-solves and repaints, once. */
  function staticSim(nodes, cfg) {
    var handlers = { tick: [], end: [] };
    var sim = {
      _static: true,
      _nodes: nodes,
      _cfg: cfg || {},
      nodes: function (n) { if (!arguments.length) return nodes; nodes = n; return sim; },
      force: function () { return sim; },
      alpha: function () { return sim; },
      alphaTarget: function () { return sim; },
      alphaDecay: function () { return sim; },
      velocityDecay: function () { return sim; },
      stop: function () { return sim; },
      tick: function () { sim.settle(); return sim; },
      restart: function () { sim.settle(); return sim; },
      on: function (name, fn) {
        var key = String(name).split('.')[0];
        if (!handlers[key]) handlers[key] = [];
        if (fn) { handlers[key].push(fn); if (key === 'tick') sim.settle(); }
        return sim;
      },
      settle: function () {
        busy = true;
        try { solve(nodes, sim._cfg); } catch (e) {}
        busy = false;
        handlers.tick.forEach(function (f) { try { f(); } catch (e) {} });
        handlers.end.forEach(function (f) { try { f(); } catch (e) {} });
        return sim;
      }
    };
    return sim;
  }

  window.EC224Place = { solve: solve, reflow: reflow, staticSim: staticSim, Grid: Grid, sampleInk: sampleInk, sampleCanvas: sampleCanvas };
})();
