/* Predict-then-see kit (lab/predict/kit). Shared engine for every week page; see README.md.
 * Extracted from lab/week11/v5 (the demo Naveen saw) and generalized while building week 2.
 *
 * One figure = a spec object (week page) + this engine:
 *   predict  -> the student commits guesses ON the graph (tap to place, drag a handle, draw)
 *   reveal   -> a film-style timeline animates the true answer; the guess stays as a ghost
 *   verdict  -> big friendly headline, 0-100 score, You vs Answer table, 2-3 sentences of why
 *   explore  -> declarative steppers / segmented toggles plus on-graph handles
 *   again    -> "Try a new one" draws fresh parameters; per-figure tally kept in localStorage
 * The SVG is a pure function of state, rebuilt as a string on every change, so a tween is just
 * "change a number, render". Pointer input is captured on the persistent <svg> root and
 * hit-tested here; a touch that does not start on a handle (or inside the plot during a place or
 * draw step) is left alone so the page still scrolls.
 */
(function () {
  'use strict';

  var C = {
    blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800',
    purple: '#6b52a8', grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257', mute: '#8b9396', line: '#d3d8d4',
    plum: '#7a1f5c', paper: '#eff1ee',
    tBlue: '#14568c', tOrange: '#a8431f', tGreen: '#256647', tRed: '#93301f', tGold: '#7d5a00', tPurple: '#5a4590'
  };
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- formatting and small math ---------- */
  // num(v, dp): rounded to dp decimals (default 1), trailing zeros dropped, thousands commas
  function num(v, dp) {
    dp = dp == null ? 1 : dp;
    var f = Math.pow(10, dp), r = Math.round(v * f) / f;
    if (Object.is(r, -0)) r = 0;
    return r.toLocaleString('en-US', { maximumFractionDigits: dp });
  }
  function money(v) {
    var r = Math.round(v * 100) / 100, neg = r < 0; r = Math.abs(r);
    var s = Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r).toLocaleString('en-US')
      : r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-$' : '$') + s;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // "P_X" -> P<sub>X</sub>, "MU_{XY}" -> MU<sub>XY</sub>, for HTML (escapes first)
  function sub(s) { return esc(s).replace(/_\{([^}]*)\}|_([A-Za-z0-9])/g, function (m, a, b) { return '<sub>' + (a || b) + '</sub>'; }); }
  // same for author-written HTML (not escaped): setup, hints, labels, table rows
  function rich(s) { return String(s).replace(/_\{([^}]*)\}|_([A-Za-z0-9])/g, function (m, a, b) { return '<sub>' + (a || b) + '</sub>'; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function ease(t) { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function snapTo(v, step) { return step ? Math.round(v / step) * step : v; }
  // a sub-range of a progress value: seg(0.7, 0.5, 1) -> 0.4
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }

  /* ---------- SVG string primitives (pixel space) ---------- */
  function attrOp(o) { return o && o.op != null ? ' opacity="' + (+o.op).toFixed(3) + '"' : ''; }
  // SVG text with "_X" subscripts turned into lowered tspans
  function svgRich(s, size) {
    var out = '', last = 0, re = /_\{([^}]*)\}|_([A-Za-z0-9])/g, m, dy = Math.round(size * 0.28);
    s = String(s);
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index)) + '<tspan dy="' + dy + '" font-size="' + Math.round(size * 0.72) + '">' + esc(m[1] || m[2]) + '</tspan><tspan dy="' + (-dy) + '">​</tspan>';
      last = re.lastIndex;
    }
    return out + esc(s.slice(last));
  }
  // rough width of a label (Libre Franklin bold); subscripts count a bit narrower
  function tw(s, size) {
    s = String(s); var n = 0;
    var plain = s.replace(/_\{([^}]*)\}|_([A-Za-z0-9])/g, function (m, a, b) { n += (a || b).length; return ''; });
    return (plain.length + n * 0.72) * (size || 19) * 0.58;
  }
  var K = {
    pline: function (x1, y1, x2, y2, o) {
      o = o || {};
      return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + (o.c || C.ink) + '" stroke-width="' + (o.w || 2) + '" stroke-linecap="' + (o.cap || 'round') + '"' +
        (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + attrOp(o) + '/>';
    },
    polyline: function (pts, o) {
      o = o || {}; if (pts.length < 2) return '';
      return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + (o.c || C.ink) + '" stroke-width="' + (o.w || 4.5) + '" stroke-linecap="' + (o.cap || 'round') + '" stroke-linejoin="round"' +
        (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + attrOp(o) + '/>';
    },
    polygon: function (pts, o) {
      o = o || {};
      return '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="' + (o.fill || C.red) + '" fill-opacity="' + (o.fo == null ? 0.25 : o.fo) + '"' +
        (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 2) + '" stroke-linejoin="round"' : '') + attrOp(o) + '/>';
    },
    text: function (x, y, s, o) {
      o = o || {}; if (o.op != null && o.op <= 0.01) return '';
      var size = o.size || 19;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + size + '" font-weight="' + (o.weight || 700) +
        '" fill="' + (o.c || C.ink) + '" text-anchor="' + (o.anchor || 'start') + '"' +
        (o.halo === false ? '' : ' paint-order="stroke" stroke="' + (o.haloC || C.paper) + '" stroke-width="' + (o.hw || 6) + '" stroke-linejoin="round"') +
        attrOp(o) + (o.cls ? ' class="' + o.cls + '"' : '') + '>' + svgRich(s, size) + '</text>';
    },
    // a dot that lands with a small overshoot while pr runs 0 -> 1
    dot: function (x, y, o) {
      o = o || {}; var sc = o.pr == null ? 1 : o.pr; if (sc <= 0.01) return '';
      var k = sc < 1 ? 1 + 0.35 * Math.sin(Math.PI * sc) : 1;
      var r = (o.r || 9) * Math.min(1, sc * 1.6) * k;
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (o.c || C.ink) +
        '" stroke="' + (o.ring || '#fff') + '" stroke-width="' + (o.sw || 3) + '"' + attrOp(o) + '/>';
    },
    ghostDot: function (x, y, o) {
      o = o || {}; if (o.op != null && o.op <= 0.01) return '';
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (o.r || 10) + '" fill="' + C.paper + '" fill-opacity="0.6" stroke="' + (o.c || C.plum) +
        '" stroke-width="3" stroke-dasharray="4 3"' + attrOp(o) + '/>';
    },
    ring: function (x, y, o) {
      o = o || {};
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (o.r || 7) + '" fill="' + (o.fill || '#fff') + '" stroke="' + (o.c || C.soft) + '" stroke-width="' + (o.w || 2.5) + '"' + attrOp(o) + '/>';
    },
    // a draggable knob; `active` adds the breathing ring that says "move me"
    handle: function (x, y, o) {
      o = o || {}; var col = o.c || C.plum, s = '';
      if (o.active) s += '<circle class="breath" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="21" fill="' + col + '" fill-opacity="0.16"/>';
      if (o.focus) s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="20" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-dasharray="3 4"/>';
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (o.r || 13) + '" fill="' + col + '" stroke="#fff" stroke-width="3.5"/>';
      if (o.grip === 'v') s += '<path d="M' + (x - 4.5) + ' ' + (y - 2) + 'l4.5 -4.5l4.5 4.5M' + (x - 4.5) + ' ' + (y + 2) + 'l4.5 4.5l4.5 -4.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (o.grip === 'h') s += '<path d="M' + (x - 2) + ' ' + (y - 4.5) + 'l-4.5 4.5l4.5 4.5M' + (x + 2) + ' ' + (y - 4.5) + 'l4.5 4.5l-4.5 4.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (o.grip === 'r') s += '<path d="M' + (x - 5) + ' ' + (y + 1) + 'a5 5 0 1 1 3 4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
      return s;
    },
    arrow: function (x1, y1, x2, y2, o) {
      o = o || {}; var col = o.c || C.gold, w = o.w || 4;
      var a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 3) return '';
      var h = Math.min(o.head || 13, L * 0.45), bx = x2 - h * Math.cos(a), by = y2 - h * Math.sin(a);
      var p1x = bx + h * 0.6 * Math.sin(a), p1y = by - h * 0.6 * Math.cos(a), p2x = bx - h * 0.6 * Math.sin(a), p2y = by + h * 0.6 * Math.cos(a);
      return K.pline(x1, y1, bx, by, { c: col, w: w, op: o.op, dash: o.dash }) +
        '<polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' + p1x.toFixed(1) + ',' + p1y.toFixed(1) + ' ' + p2x.toFixed(1) + ',' + p2y.toFixed(1) + '" fill="' + col + '"' + attrOp(o) + '/>';
    }
  };

  /* ---------- geometry helpers (data space unless noted) ---------- */
  var G = {
    // Liang-Barsky clip of a segment to [0,X] x [0,Y]
    clipSeg: function (X, Y, x1, y1, x2, y2) {
      var t0 = 0, t1 = 1, dx = x2 - x1, dy = y2 - y1;
      var p = [-dx, dx, -dy, dy], q = [x1, X - x1, y1, Y - y1];
      for (var i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return null; }
        else { var r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
      }
      return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
    },
    // sample y = fn(x) on [a, b]; non-finite values become null (gaps)
    sample: function (fn, a, b, n) {
      n = n || 160; var out = [];
      for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n, y = fn(x); out.push(isFinite(y) && y != null ? [x, y] : null); }
      return out;
    },
    // distance from point to segment, and to a polyline (nulls split it); sx, sy scale the axes
    distSeg: function (px, py, ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? clamp01(((px - ax) * dx + (py - ay) * dy) / L2) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    },
    nearest: function (px, py, pts, sx, sy) {
      sx = sx || 1; sy = sy || 1; var best = { d: Infinity, x: null, y: null };
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
        var ax = a[0] * sx, ay = a[1] * sy, bx = b[0] * sx, by = b[1] * sy, X = px * sx, Y = py * sy;
        var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? clamp01(((X - ax) * dx + (Y - ay) * dy) / L2) : 0;
        var d = Math.hypot(X - (ax + t * dx), Y - (ay + t * dy));
        if (d < best.d) best = { d: d, x: (ax + t * dx) / sx, y: (ay + t * dy) / sy };
      }
      return best;
    },
    // first crossing between y = f(x) and y = g(x) on (a, b), by sign change + bisection
    cross: function (f, g, a, b, n) {
      n = n || 400; var prev = null, px = null;
      for (var i = 0; i <= n; i++) {
        var x = a + (b - a) * i / n, d = f(x) - g(x);
        if (!isFinite(d)) { prev = null; continue; }
        if (prev != null && (d === 0 || (d > 0) !== (prev > 0))) {
          var lo = px, hi = x;
          for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2, dm = f(m) - g(m); if ((dm > 0) === (prev > 0)) lo = m; else hi = m; }
          return (lo + hi) / 2;
        }
        prev = d; px = x;
      }
      return null;
    },
    bisect: function (fn, a, b, it) {
      var fa = fn(a); for (var k = 0; k < (it || 80); k++) { var m = (a + b) / 2, fm = fn(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; }
      return (a + b) / 2;
    }
  };

  /* ---------- scoring helpers: each returns 0..1 ---------- */
  var Score = {
    // full marks within `full`, zero at `zero`, linear between (absolute error e)
    lin: function (e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); },
    // a guessed point vs the answer, distances normalized by the plot size X, Y
    point: function (gx, gy, tx, ty, X, Y, full, zero) {
      if (gx == null) return 0;
      return Score.lin(Math.hypot((gx - tx) / X, (gy - ty) / Y), full == null ? 0.02 : full, zero == null ? 0.18 : zero);
    },
    // ratio error on a log scale (slopes, prices): full within `full` (e.g. 0.05 = 5%), zero at `zero`
    ratio: function (g, t, full, zero) {
      if (!(g > 0) || !(t > 0)) return 0;
      return Score.lin(Math.log(g / t), Math.log(1 + (full == null ? 0.05 : full)), Math.log(1 + (zero == null ? 1 : zero)));
    },
    // a drawn curve vs the true curve. drawn: [{x,y}|null], truth: [[x,y]|null] (in-frame samples).
    // Distances are in units of the plot size (sx = 1/X, sy = 1/Y). Returns {err, cover, s}.
    curve: function (drawn, truth, X, Y, o) {
      o = o || {}; var sx = 1 / X, sy = 1 / Y, n = 0, sum = 0;
      var pts = (drawn || []).filter(Boolean);
      pts.forEach(function (p) { sum += G.nearest(p.x, p.y, truth, sx, sy).d; n++; });
      var err = n ? sum / n : 1;
      var dl = []; pts.forEach(function (p) { dl.push([p.x, p.y]); });
      var tp = truth.filter(Boolean), hit = 0, rad = o.coverRad || 0.06;
      tp.forEach(function (t) {
        for (var i = 0; i < dl.length; i++) if (Math.hypot((dl[i][0] - t[0]) * sx, (dl[i][1] - t[1]) * sy) < rad) { hit++; break; }
      });
      var cover = tp.length ? hit / tp.length : 0;
      var s = Score.lin(err, o.full == null ? 0.012 : o.full, o.zero == null ? 0.12 : o.zero) * lerp(0.4, 1, clamp01(cover / 0.8));
      return { err: err, cover: cover, s: s };
    }
  };

  /* ---------- label placer ----------
   * Every curve, dot, handle and placed label registers itself as an obstacle; each label then
   * takes the first candidate position whose box touches nothing and stays in frame (or, failing
   * that, searches outward in rings, then takes the least bad). Deterministic: same state, same
   * picture. */
  function Placer(S) { this.S = S; this.r = [[0, S.y1 - 40, 200, 30]]; this.p = []; }   // the y-axis title
  Placer.prototype.pline = function (ax, ay, bx, by) {
    var n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 5));
    for (var i = 0; i <= n; i++) this.p.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
  };
  Placer.prototype.ppath = function (pts) { for (var i = 1; i < pts.length; i++) if (pts[i - 1] && pts[i]) this.pline(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); };
  Placer.prototype.rect = function (x, y, w, h) { this.r.push([x, y, w, h]); };
  Placer.prototype.dot = function (x, y, r) { this.r.push([x - r, y - r, 2 * r, 2 * r]); };
  Placer.prototype.box = function (s, size, c) {
    var w = tw(s, size), x = c.anchor === 'end' ? c.x - w : c.anchor === 'middle' ? c.x - w / 2 : c.x;
    return [x - 5, c.y - size * 0.85, w + 10, size * 1.15];
  };
  Placer.prototype.cost = function (b) {
    var S = this.S, n = 0, i;
    if (b[0] < S.x0 + 3 || b[0] + b[2] > S.W - 2 || b[1] < S.y1 - 40 || b[1] + b[3] > S.y0 - 1) n += 1000;
    if (b[0] < S.x0 + 3 && b[1] + b[3] > S.y1) n += 1000;
    for (i = 0; i < this.p.length; i++) { var q = this.p[i]; if (q[0] > b[0] && q[0] < b[0] + b[2] && q[1] > b[1] && q[1] < b[1] + b[3]) n += 3; }
    for (i = 0; i < this.r.length; i++) { var r = this.r[i]; if (r[0] < b[0] + b[2] && r[0] + r[2] > b[0] && r[1] < b[1] + b[3] && r[1] + r[3] > b[1]) n += 400; }
    return n;
  };
  // returns the chosen candidate {x, y, anchor} (and registers its box), or null
  Placer.prototype.place = function (s, size, cands, ring) {
    var best = null, bk = Infinity;
    for (var i = 0; i < cands.length; i++) {
      var k = this.cost(this.box(s, size, cands[i])) + i * 0.01;
      if (k < bk) { bk = k; best = cands[i]; if (k < 1) break; }
    }
    if (!best) return null;
    if (bk >= 1) {
      var c0 = cands[0], found = null;
      for (var rad = 24; rad <= (ring || 260) && !found; rad += 18) for (var a = 0; a < 16 && !found; a++) {
        var ang = a * Math.PI / 8, cand = { x: c0.x + rad * Math.cos(ang), y: c0.y + rad * Math.sin(ang), anchor: c0.anchor };
        if (this.cost(this.box(s, size, cand)) < 1) found = cand;
      }
      if (found) best = found;
    }
    var b = this.box(s, size, best), S = this.S, sh = 0;
    if (b[0] + b[2] > S.W - 2) sh = S.W - 2 - (b[0] + b[2]); else if (b[0] < S.x0 + 3) sh = S.x0 + 3 - b[0];
    if (sh) { best = { x: best.x + sh, y: best.y, anchor: best.anchor }; b[0] += sh; }
    this.rect(b[0], b[1], b[2], b[3]);
    return best;
  };
  // candidate spots around a pixel point
  function around(px, py, d) {
    d = d || 18;
    return [{ x: px + d, y: py + 6, anchor: 'start' }, { x: px - d, y: py + 6, anchor: 'end' }, { x: px, y: py - d - 2, anchor: 'middle' },
      { x: px, y: py + d + 16, anchor: 'middle' }, { x: px + d, y: py - d, anchor: 'start' }, { x: px - d, y: py - d, anchor: 'end' },
      { x: px + d, y: py + d + 12, anchor: 'start' }, { x: px - d, y: py + d + 12, anchor: 'end' }];
  }

  /* ---------- Pen: the drawing context handed to spec.render(f, S, D) ----------
   * Data-space drawing that auto-registers obstacles with the label placer. Labels are queued
   * and placed only after everything else (including handles) is registered, so the order you
   * call things in does not matter. Layers: under (areas), curves (clipped to the plot),
   * over (dots, arrows, guides), labels, handles. */
  function Pen(f, S) {
    this.f = f; this.S = S; this.L = new Placer(S);
    this.out = { under: '', curves: '', over: '', top: '' }; this.q = [];
  }
  var D = Pen.prototype;
  D.add = function (layer, svg) { this.out[layer || 'over'] += svg; return this; };
  D.px = function (x, y) { return [this.S.x(x), this.S.y(y)]; };
  function live(o) { return !(o.op != null && o.op <= 0.02) && !(o.pr != null && o.pr <= 0.001); }
  // straight data-space line, clipped to the plot, drawn to progress o.pr
  D.line = function (x1, y1, x2, y2, o) {
    o = o || {}; var S = this.S, pr = o.pr == null ? 1 : o.pr; if (pr <= 0.001) return this;
    var c = o.noclip ? [x1, y1, x2, y2] : G.clipSeg(S.X, S.Y, x1, y1, x2, y2); if (!c) return this;
    var ex = lerp(c[0], c[2], pr), ey = lerp(c[1], c[3], pr);
    var a = [S.x(c[0]), S.y(c[1])], b = [S.x(ex), S.y(ey)];
    this.add(o.layer || 'curves', K.pline(a[0], a[1], b[0], b[1], { c: o.c, w: o.w || 4.5, dash: o.dash, op: o.op, cap: o.cap }));
    if (o.reg !== false && live(o)) this.L.pline(a[0], a[1], b[0], b[1]);
    return this;
  };
  // data-space polyline (nulls split it), drawn to progress o.pr by pixel length
  D.path = function (pts, o) {
    o = o || {}; var S = this.S, pr = o.pr == null ? 1 : o.pr; if (pr <= 0.001) return this;
    var px = pts.map(function (p) { return p ? [S.x(p[0]), S.y(p[1])] : null; });
    var lim = Infinity;
    if (pr < 1) {
      var tot = 0; for (var i = 1; i < px.length; i++) if (px[i - 1] && px[i] && inView(S, pts[i - 1], pts[i])) tot += Math.hypot(px[i][0] - px[i - 1][0], px[i][1] - px[i - 1][1]);
      lim = tot * pr;
    }
    var runs = [], run = [], acc = 0, stop = false;
    for (var j = 0; j < px.length && !stop; j++) {
      if (!px[j]) { if (run.length) runs.push(run); run = []; continue; }
      if (run.length) {
        var prev = run[run.length - 1], dl = Math.hypot(px[j][0] - prev[0], px[j][1] - prev[1]);
        if (inView(S, pts[j - 1], pts[j])) {
          if (acc + dl > lim) { var t = (lim - acc) / dl; run.push([lerp(prev[0], px[j][0], t), lerp(prev[1], px[j][1], t)]); stop = true; break; }
          acc += dl;
        }
      }
      run.push(px[j]);
    }
    if (run.length) runs.push(run);
    var self = this;
    runs.forEach(function (r) {
      self.add(o.layer || 'curves', K.polyline(r, { c: o.c, w: o.w || 4.5, dash: o.dash, op: o.op }));
      if (o.reg !== false && live(o)) self.L.ppath(r.filter(function (p) { return p[0] >= S.x0 - 2 && p[0] <= S.x1 + 2 && p[1] >= S.y1 - 2 && p[1] <= S.y0 + 2; }));
    });
    return this;
  };
  function inView(S, a, b) {
    if (!a || !b) return false;
    return !(Math.max(a[0], b[0]) < 0 || Math.min(a[0], b[0]) > S.X || Math.max(a[1], b[1]) < 0 || Math.min(a[1], b[1]) > S.Y);
  }
  // y = fn(x) on [a, b] (default the whole x range); values far outside the frame are cut
  D.fn = function (fn, a, b, o) {
    o = o || {}; var S = this.S;
    a = a == null ? 0 : a; b = b == null ? S.X : b;
    var pts = G.sample(fn, a, b, o.n || 200).map(function (p) { return p && p[1] > -S.Y && p[1] < 3 * S.Y ? p : null; });
    return this.path(pts, o);
  };
  // parametric curve t -> [x, y]
  D.param = function (fn, t0, t1, o) {
    o = o || {}; var pts = [];
    for (var i = 0, n = o.n || 200; i <= n; i++) { var p = fn(t0 + (t1 - t0) * i / n); pts.push(p && isFinite(p[0]) && isFinite(p[1]) ? p : null); }
    return this.path(pts, o);
  };
  D.area = function (pts, o) {
    o = o || {}; if (o.op != null && o.op <= 0.01) return this;
    var S = this.S;
    return this.add(o.layer || 'under', K.polygon(pts.map(function (p) { return [S.x(p[0]), S.y(p[1])]; }), o));
  };
  D.dot = function (x, y, o) {
    o = o || {}; var p = this.px(x, y);
    if (o.reg !== false && live(o)) this.L.dot(p[0], p[1], (o.r || 9) + 3);
    return this.add(o.layer || 'over', K.dot(p[0], p[1], o));
  };
  D.ghost = function (x, y, o) {
    o = o || {}; var p = this.px(x, y);
    if (o.reg !== false && live(o)) this.L.dot(p[0], p[1], (o.r || 10) + 2);
    return this.add(o.layer || 'over', K.ghostDot(p[0], p[1], o));
  };
  // dashed guide lines from (x, y) down to the x axis and across to the y axis
  D.drop = function (x, y, o) {
    o = o || {}; var S = this.S, pr = o.pr == null ? 1 : o.pr; if (pr <= 0.001) return this;
    var p = this.px(x, y), st = { c: o.c || C.soft, w: o.w || 2.5, dash: o.dash || '6 6', op: o.op };
    if (o.x !== false) { this.add(o.layer || 'over', K.pline(p[0], p[1], p[0], lerp(p[1], S.y0, pr), st)); if (live(o)) this.L.pline(p[0], p[1], p[0], S.y0); }
    if (o.y !== false) { this.add(o.layer || 'over', K.pline(p[0], p[1], lerp(p[0], S.x0, pr), p[1], st)); if (live(o)) this.L.pline(p[0], p[1], S.x0, p[1]); }
    return this;
  };
  D.arrow = function (x1, y1, x2, y2, o) {
    o = o || {}; var a = this.px(x1, y1), b = this.px(x2, y2);
    return this.arrowP(a[0], a[1], b[0], b[1], o);
  };
  D.arrowP = function (x1, y1, x2, y2, o) {
    o = o || {}; if (o.op != null && o.op <= 0.01) return this;
    if (o.reg !== false) this.L.pline(x1, y1, x2, y2);
    return this.add(o.layer || 'over', K.arrow(x1, y1, x2, y2, o));
  };
  D.plineP = function (x1, y1, x2, y2, o) {
    o = o || {}; if (o.reg !== false && live(o)) this.L.pline(x1, y1, x2, y2);
    return this.add(o.layer || 'over', K.pline(x1, y1, x2, y2, o));
  };
  // raw pixel text, placed exactly where asked (o.reg registers its box as an obstacle)
  D.text = function (px, py, s, o) {
    o = o || {}; var size = o.size || this.S.ls;
    if (o.reg && live(o)) { var b = this.L.box(s, size, { x: px, y: py, anchor: o.anchor || 'start' }); this.L.rect(b[0], b[1], b[2], b[3]); }
    return this.add(o.layer || 'over', K.text(px, py, s, Object.assign({ size: size }, o)));
  };
  // queued, collision-avoiding label. cands: [{x, y, anchor}] in pixels, best first
  D.label = function (s, cands, o) { this.q.push({ s: s, cands: cands, o: o || {}, prio: (o && o.prio) || 1 }); return this; };
  D.around = function (x, y, d) { var p = this.px(x, y); return around(p[0], p[1], d); };
  D.aroundP = around;
  // candidate spots along y = fn(x) at the given data xs (pref 'below' tries under the curve first)
  D.along = function (fn, xs, d, pref) {
    var S = this.S, out = []; d = d || 10;
    xs.forEach(function (q) {
      var v = fn(q); if (v == null || !isFinite(v) || v < 0 || v > S.Y || q < 0 || q > S.X) return;
      var px = S.x(q), py = S.y(v);
      var up = [{ x: px + d, y: py - d, anchor: 'start' }, { x: px - d, y: py - d, anchor: 'end' }],
        dn = [{ x: px + d, y: py + d + 15, anchor: 'start' }, { x: px - d, y: py + d + 15, anchor: 'end' }];
      out.push.apply(out, pref === 'below' ? dn.concat(up) : pref === 'aboveOnly' ? up : pref === 'belowOnly' ? dn : up.concat(dn));
    });
    return out;
  };
  // candidate spots around points at fractions (0..1) of the in-frame length of a data polyline
  D.pathCands = function (pts, fracs, d) {
    var S = this.S, vis = pts.filter(function (p) { return p && p[0] >= 0 && p[0] <= S.X && p[1] >= 0 && p[1] <= S.Y; }), out = [], self = this;
    if (!vis.length) return out;
    fracs.forEach(function (t) { var p = vis[Math.min(vis.length - 1, Math.round(t * (vis.length - 1)))]; out.push.apply(out, self.around(p[0], p[1], d || 14)); });
    return out;
  };
  D.pathLabel = function (s, pts, fracs, o) { o = o || {}; return this.label(s, this.pathCands(pts, fracs, o.d), Object.assign({ size: this.S.fs }, o)); };
  // label next to a data point
  D.near = function (x, y, s, o) { o = o || {}; return this.label(s, this.around(x, y, o.d || 18), o); };
  // curve name along y = fn(x); xs are fractions of the x range (0..1)
  D.curveLabel = function (s, fn, fracs, o) {
    o = o || {}; var S = this.S;
    return this.label(s, this.along(fn, fracs.map(function (t) { return t * S.X; }), o.d, o.pref), Object.assign({ size: S.fs }, o));
  };
  // value label sitting just above the x axis at x = v (placed before other labels)
  D.xval = function (v, s, o) {
    o = o || {}; var S = this.S, size = o.size || S.ls, x = S.x(v) + (o.dx || 0), anchor = o.anchor || 'middle', w = tw(s, size);
    var left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    if (left < S.x0 + 4) x += S.x0 + 4 - left;
    if (left + w > S.x1) x -= left + w - S.x1;
    return this.label(s, [{ x: x, y: S.y0 - 10, anchor: anchor }], Object.assign({ prio: 0, fixed: true }, o, { size: size }));
  };
  // value label just right of the y axis at y = v
  D.yval = function (v, s, o) {
    o = o || {}; var S = this.S, size = o.size || S.ls, y = S.y(v) + (o.dy == null ? 6 : o.dy);
    y = clamp(y, S.y1 + size, S.y0 - 6);
    return this.label(s, [{ x: S.x0 + 10, y: y, anchor: 'start' }], Object.assign({ prio: 0, fixed: true }, o, { size: size }));
  };
  // the student's freehand drawing (see the 'draw' step); plum while predicting, a ghost after
  D.drawing = function (key, o) {
    o = o || {}; var f = this.f, S = this.S, pts = f.drawn(key), runs = [], run = [];
    pts.forEach(function (p) { if (p) run.push([S.x(p.x), S.y(p.y)]); else if (run.length) { runs.push(run); run = []; } });
    if (run.length) runs.push(run);
    var pred = f.predicting, op = pred ? 1 : (f.ghostOn() ? 1 - 0.5 * f.gOp() : 0);
    if (op <= 0.01) return runs;
    var self = this;
    runs.forEach(function (r) {
      if (r.length === 1) self.add('over', '<circle cx="' + r[0][0].toFixed(1) + '" cy="' + r[0][1].toFixed(1) + '" r="3" fill="' + C.plum + '"/>');
      self.add('over', K.polyline(r, { c: o.c || C.plum, w: pred ? 5 : 4, op: op, dash: pred ? null : '2 8' }));
      if (pred) self.L.ppath(r);
    });
    return runs;
  };
  D.flush = function () {
    var self = this, S = this.S, lab = '';
    this.q.map(function (it, i) { it.i = i; return it; }).sort(function (a, b) { return a.prio - b.prio || a.i - b.i; }).forEach(function (it) {
      var o = it.o, size = o.size || S.ls;
      if (o.op != null && o.op <= 0.02) return;
      var c = o.fixed ? it.cands[0] : self.L.place(it.s, size, it.cands, o.ring);
      if (!c) return;
      if (o.fixed) { var b = self.L.box(it.s, size, c); self.L.rect(b[0], b[1], b[2], b[3]); }
      lab += K.text(c.x, c.y, it.s, Object.assign({}, o, { size: size, anchor: c.anchor }));
    });
    return lab;
  };

  /* ---------- axes ---------- */
  function axes(S, o) {
    o = o || {}; var s = '', v, fs = S.narrow ? 15 : 16;
    var xf = o.xfmt || function (v) { return num(v, 2); }, yf = o.yfmt || function (v) { return num(v, 2); };
    for (v = S.ys; v <= S.Y + 1e-9; v += S.ys) {
      var y = S.y(v);
      s += K.pline(S.x0 - 6, y, S.x0, y, { c: C.soft, w: 2, cap: 'butt' });
      s += K.text(S.x0 - 10, y + 5.5, yf(v), { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
    }
    for (v = S.xs; v <= S.X + 1e-9; v += S.xs) {
      var x = S.x(v);
      s += K.pline(x, S.y0, x, S.y0 + 6, { c: C.soft, w: 2, cap: 'butt' });
      s += K.text(x, S.y0 + 25, xf(v), { size: fs, weight: 500, c: C.soft, anchor: 'middle', halo: false });
    }
    if (o.zero !== false) s += K.text(S.x0 - 8, S.y0 + 22, '0', { size: fs, weight: 500, c: C.soft, anchor: 'end', halo: false });
    s += K.pline(S.x0, S.y0, S.x1 + 4, S.y0, { c: C.ink, w: 2.5, cap: 'square' });
    s += K.pline(S.x0, S.y0, S.x0, S.y1 - 4, { c: C.ink, w: 2.5, cap: 'square' });
    s += K.text(4, S.y1 - 18, o.ytitle == null ? '$ per unit' : o.ytitle, { size: S.narrow ? 16 : 17, weight: 600, c: C.soft, anchor: 'start', halo: false });
    s += K.text(S.x1, S.y0 + 50, o.xtitle == null ? 'Quantity' : o.xtitle, { size: S.narrow ? 16 : 17, weight: 600, c: C.soft, anchor: 'end', halo: false });
    return s;
  }

  /* ---------- tally (per-figure score, kept per viewer) ---------- */
  var STORE = 'ec224-predict-tally', TALLY = {};
  function loadTally() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveTally() { try { localStorage.setItem(STORE, JSON.stringify(TALLY)); } catch (e) { /* private mode: keep in memory */ } }

  function tier(score) {
    if (score >= 90) return { head: 'Spot on.', tone: 'great' };
    if (score >= 70) return { head: 'Very close.', tone: 'good' };
    if (score >= 45) return { head: 'Good instinct.', tone: 'ok' };
    return { head: 'Now you know.', tone: 'learn' };
  }
  function encourage(score, t) {
    if (score >= 90) return t.streak >= 2 ? t.streak + ' strong rounds in a row. You have this one.' : 'That is the answer, give or take a hair.';
    if (score >= 70) return 'Close enough that the idea is clearly there.';
    if (score >= 45) return 'The right direction. The picture shows the last step.';
    return 'Most people miss this one the first time. Try a new one and see if it clicks.';
  }
  function val(v, f) { return typeof v === 'function' ? v(f) : v; }

  /* ---------- the figure ---------- */
  function Figure(spec, root, opts) {
    var f = this;
    opts = opts || {};
    f.spec = spec; f.model = spec.model; f.root = root; f.opts = opts;
    f.rv = {}; f.ex = {}; f.round = 0; f.id = spec.key; f.kfocus = 0;
    var film = '';
    if (spec.film) {
      var base = (opts.filmBase || '../../../media/films/') + spec.film.name;
      film = '<div class="film"><video controls playsinline muted preload="metadata" width="1920" height="1080" poster="' + base + '-poster.jpg" aria-label="' +
        esc(spec.film.label || 'Animation') + '"><source src="' + base + '.mp4" type="video/mp4"></video></div>' +
        '<p class="film-cap"><b>' + esc(spec.film.title || 'Watch first') + '</b>' + (spec.film.caption || '') + '</p>';
    }
    root.classList.add('fig');
    root.setAttribute('aria-label', 'Figure ' + spec.num);
    root.innerHTML = film +
      '<header class="fig-head">' +
      '<p class="fig-num">Figure ' + esc(spec.num) + '<span>' + esc(spec.topic || '') + '</span></p>' +
      '<h2 class="q" id="q-' + f.id + '"></h2>' +
      '<p class="setup"></p>' +
      '</header>' +
      '<div class="stage"><div class="k-hits" aria-hidden="true"></div><svg class="plot" tabindex="0" role="application" aria-labelledby="q-' + f.id + '" aria-describedby="sr-' + f.id + '"></svg>' +
      '<p class="sr" id="sr-' + f.id + '" aria-live="polite"></p></div>' +
      '<div class="panel">' +
      '<div class="predict"><ol class="steps"></ol>' +
      '<div class="actions"><button type="button" class="btn reveal" disabled>Reveal the answer</button>' +
      '<button type="button" class="linkish skip">Not sure? Just show me</button></div></div>' +
      '<div class="verdict" hidden></div>' +
      '<div class="explore" hidden></div>' +
      '<div class="again" hidden><button type="button" class="btn ghost newone">Try a new one</button><p class="tally"></p></div>' +
      '</div>';
    f.svg = root.querySelector('svg'); f.stage = root.querySelector('.stage'); f.hits = root.querySelector('.k-hits');
    f.$ = function (sel) { return root.querySelector(sel); };
    f.bind();
    f.newRound(false);
    var lastW = 0;
    if ('ResizeObserver' in window) new ResizeObserver(function () { var w = f.stage.clientWidth; if (w !== lastW) { lastW = w; f.render(); } }).observe(f.stage);
    else window.addEventListener('resize', function () { f.render(); });
  }
  var P = Figure.prototype;

  /* mode flags and reveal progress */
  P.setMode = function (m) {
    this.mode = m; this.predicting = m === 'predict'; this.revealing = m === 'revealing'; this.exploring = m === 'explore'; this.truth = m !== 'predict';
  };
  // reveal progress of a timeline key: 0 while predicting, the tween while revealing, 1 in explore
  P.t = function (key) { return this.exploring ? 1 : this.predicting ? 0 : (this.rv[key] == null ? 0 : this.rv[key]); };
  // the guess stays as a ghost through the reveal and until the student first touches an Explore control
  P.ghostOn = function () { return !this.skipped && (this.revealing || (this.exploring && !this.ex.touched)); };
  // draw-in progress of the base picture (curves shown before any guess)
  P.base = function () { return this.rv.base == null ? 1 : this.rv.base; };
  P.gOp = function () { return this.exploring ? 1 : (this.rv.ghost == null ? 0 : this.rv.ghost); };
  P.resolve = function (rescale) { this.sol = this.model.solve(this.p); if (rescale) this.dom = this.model.domain(this.p); };

  P.newRound = function (randomize) {
    var f = this, spec = f.spec;
    cancelAnimationFrame(f.raf); cancelAnimationFrame(f.traf);
    f.p = randomize ? f.model.random(Math.random, f.p) : f.model.defaults();
    f.p0 = JSON.parse(JSON.stringify(f.p));
    f.sol = f.model.solve(f.p);
    f.dom = f.model.domain(f.p);
    f.g = spec.initGuess ? spec.initGuess(f) : {};
    f.done = spec.steps.map(function () { return false; });
    f.cur = 0; f.kpick = false; f.kbd = false; f.setMode('predict'); f.rv = {}; f.ex = {}; f.result = null; f.round++; f.msg = null; f.kplaced = {}; f.skipped = false;
    f.$('.q').innerHTML = rich(val(spec.question, f));
    f.$('.setup').innerHTML = val(spec.setup, f) || '';
    f.$('.predict').hidden = false; f.$('.verdict').hidden = true; f.$('.explore').hidden = true; f.$('.again').hidden = true;
    f.root.classList.remove('is-explore', 'is-revealing');
    f.updateSteps();
    if (randomize) { f.rv.base = 0; f.play([['base', 0, 900]]); }
    else f.rv.base = f.seen || RM ? 1 : 0;
    f.render();
  };

  P.stepPrompt = function (i) { var st = this.spec.steps[i]; return st ? val(st.prompt, this) : ''; };
  P.updateSteps = function () {
    var f = this, spec = f.spec;
    f.$('.steps').innerHTML = spec.steps.map(function (st, i) {
      var state = f.done[i] ? 'done' : i === f.cur ? 'now' : 'later';
      return '<li class="' + state + '"><span class="lbl">' + rich(val(st.label, f)) + '</span>' +
        (i === f.cur && !f.done[i] ? '<span class="how">' + rich(f.stepPrompt(i)) + '</span>' + (f.msg ? '<span class="nope">' + rich(f.msg) + '</span>' : '') : '') + '</li>';
    }).join('');
    var all = f.done.every(Boolean);
    var btn = f.$('.reveal'); btn.disabled = !all;
    btn.classList.toggle('ready', all);
    var sr = all ? 'All guesses in. Press Reveal the answer.' : (spec.steps[f.cur] ? 'Step ' + (f.cur + 1) + ': ' + String(f.stepPrompt(f.cur)).replace(/<[^>]+>/g, '') : '');
    f.$('.sr').textContent = (f.msg ? f.msg + ' ' : '') + sr + ' ' + (spec.kbdHint || 'Keyboard: arrow keys move the highlighted handle, Space switches handles, Enter places or confirms.');
  };

  // try to complete step i; a step's check(f) may return false or a message string to refuse
  P.completeStep = function (i) {
    var f = this; if (i == null || !f.predicting) return;
    var st = f.spec.steps[i];
    if (st.check) {
      var ok = st.check(f);
      if (ok !== true) { f.msg = typeof ok === 'string' ? ok : null; f.updateSteps(); return; }
    }
    f.msg = null;
    f.done[i] = true;
    var next = f.done.indexOf(false);
    f.cur = next < 0 ? f.spec.steps.length : next;
    f.updateSteps();
  };

  /* geometry */
  P.layout = function () {
    var f = this, spec = f.spec, W = Math.max(280, Math.round(f.stage.clientWidth));
    var narrow = W < 560;
    var asp = narrow ? (spec.narrowAspect || 1.02) : (spec.aspect || 0.74);
    var H = narrow ? Math.round(W * asp) : Math.round(Math.min(spec.maxH || 640, Math.max(420, W * asp)));
    var m = { l: narrow ? 50 : 66, r: narrow ? 16 : 26, t: 50, b: 62 };
    if (spec.extraBottom) { H += spec.extraBottom; m.b += spec.extraBottom; }
    var d = f.dom;
    var S = { W: W, H: H, narrow: narrow, X: d.X, Y: d.Y, xs: d.xs, ys: d.ys, x0: m.l, x1: W - m.r, y0: H - m.b, y1: m.t };
    S.x = function (v) { return S.x0 + v / S.X * (S.x1 - S.x0); };
    S.y = function (v) { return S.y0 - v / S.Y * (S.y0 - S.y1); };
    S.ix = function (px) { return (px - S.x0) / (S.x1 - S.x0) * S.X; };
    S.iy = function (py) { return (S.y0 - py) / (S.y0 - S.y1) * S.Y; };
    S.fs = narrow ? 18 : 20;   // curve names
    S.ls = narrow ? 17 : 19;   // value labels
    S.ss = narrow ? 16 : 17;   // small notes (ghost tags)
    f.S = S;
    return S;
  };

  P.render = function () {
    var f = this, S = f.layout();
    f.svg.setAttribute('viewBox', '0 0 ' + S.W + ' ' + S.H);
    f.svg.setAttribute('width', S.W); f.svg.setAttribute('height', S.H);
    var clipId = 'clip-' + f.id, pen = new Pen(f, S);
    f.spec.render(f, S, pen);
    var hs = f.handles();
    hs.forEach(function (h) { pen.L.dot(h.px[0], h.px[1], 17); });
    var labels = pen.flush();
    var body = '<defs><clipPath id="' + clipId + '"><rect x="' + S.x0 + '" y="' + (S.y1 - 2) + '" width="' + (S.x1 - S.x0 + 2) + '" height="' + (S.y0 - S.y1 + 2) + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + clipId + ')">' + pen.out.under + '</g>' + axes(S, val(f.spec.axes, f) || {}) +
      '<g clip-path="url(#' + clipId + ')">' + pen.out.curves + '</g>' + pen.out.over + labels;
    var kh = f.keyHandle(hs);
    hs.forEach(function (h) { body += K.handle(h.px[0], h.px[1], { c: h.c, active: h.active && !f.drag, grip: h.grip, focus: f.kbd && h === kh }); });
    body += pen.out.top;
    f.svg.innerHTML = body;
    var hits = '', pc = function (v, T) { return (v / T * 100).toFixed(3) + '%'; };
    if (f.capturesPlot()) hits += '<div class="k-hit k-area" style="left:' + pc(S.x0 - 6, S.W) + ';top:' + pc(S.y1 - 6, S.H) + ';width:' + pc(S.x1 - S.x0 + 12, S.W) + ';height:' + pc(S.y0 - S.y1 + 12, S.H) + '"></div>';
    if (!f.revealing) hs.forEach(function (h) { hits += '<div class="k-hit" style="left:' + pc(h.px[0], S.W) + ';top:' + pc(h.px[1], S.H) + '"></div>'; });
    if (hits !== f.hitsHTML) { f.hits.innerHTML = hits; f.hitsHTML = hits; }
    f.hits.style.height = f.svg.getBoundingClientRect().height + 'px';
    f.root.classList.toggle('dragging', !!f.drag);
    if (f.exploring && f.spec.explore && f.spec.explore.readout) {
      var ro = f.$('.ex-readout'); if (ro) ro.innerHTML = f.spec.explore.readout(f);
    }
  };

  // spec handles plus automatic handles for placed points of 'place' steps; each gets .px
  P.handles = function () {
    var f = this, S = f.S, out = [];
    if (f.predicting) f.spec.steps.forEach(function (st, i) {
      if (st.kind !== 'place' || !st.key || st.handle === false) return;
      var g = f.g[st.key]; if (!g) return;
      out.push({ x: g.x, y: g.y, step: i, active: f.cur === i, snap: st.snap, noAutoDone: true, set: function (f, X, Y) { f.g[st.key] = { x: X, y: Y }; } });
    });
    var sh = f.spec.handles ? f.spec.handles(f, S) : [];
    out = out.concat((sh || []).filter(Boolean));
    out.forEach(function (h) { h.px = h.px || [S.x(h.x), S.y(h.y)]; });
    return out;
  };
  // does a touch anywhere in the plot belong to us right now? (place / draw steps)
  P.capturesPlot = function () {
    var f = this; if (!f.predicting) return false;
    var st = f.spec.steps[f.cur];
    return !!(st && (st.kind === 'place' || st.kind === 'draw')) || f.spec.steps.some(function (s, i) { return s.kind === 'draw' && f.done[i]; });
  };
  P.keyHandle = function (hs) {
    if (!hs.length) return null;
    var act = hs.filter(function (h) { return h.active; });
    if (this.kfocus != null && this.kfocus < hs.length && this.kpick) return hs[this.kfocus];
    return act[0] || hs[hs.length - 1];
  };
  // apply a handle's snap and call its setter (data coordinates, clamped to the frame)
  P.setHandle = function (h, X, Y) {
    var S = this.S, sn = h.snap;
    X = clamp(X, 0, S.X); Y = clamp(Y, 0, S.Y);
    if (sn != null) {
      var sx = typeof sn === 'object' ? sn.x : sn, sy = typeof sn === 'object' ? sn.y : sn;
      if (sx) X = clamp(snapTo(X, sx), 0, S.X); if (sy) Y = clamp(snapTo(Y, sy), 0, S.Y);
    }
    h.set(this, X, Y);
    if (this.exploring) { this.ex.touched = true; this.resolve(); }
  };

  /* timelines: seq = [[key, startMs, durMs], ...]; values in f.rv go 0 -> 1 (eased) */
  P.play = function (seq, done) {
    var f = this;
    cancelAnimationFrame(f.raf);
    if (RM) { seq.forEach(function (s) { f.rv[s[0]] = 1; }); f.render(); if (done) done(); return; }
    var t0 = performance.now(), end = 0;
    seq.forEach(function (s) { end = Math.max(end, s[1] + s[2]); if (f.rv[s[0]] == null) f.rv[s[0]] = 0; });
    function tick(now) {
      var t = now - t0;
      seq.forEach(function (s) { f.rv[s[0]] = (s[3] === 'linear' ? clamp01 : ease)((t - s[1]) / s[2]); });
      f.render();
      if (t < end) f.raf = requestAnimationFrame(tick); else if (done) done();
    }
    f.raf = requestAnimationFrame(tick);
  };

  /* tween a number so explore changes glide instead of jump; each(v) runs every frame */
  P.tween = function (from, to, dur, each, after) {
    var f = this;
    cancelAnimationFrame(f.traf);
    if (RM || from === to) { each(to, true); f.resolve(); f.render(); if (after) after(); return; }
    var t0 = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - t0) / (dur || 450));
      each(t < 1 ? lerp(from, to, ease(t)) : to, t >= 1); f.resolve();
      f.render();
      if (t < 1) f.traf = requestAnimationFrame(tick); else if (after) after();
    }
    f.traf = requestAnimationFrame(tick);
  };

  P.score = function () {
    var f = this, spec = f.spec;
    if (spec.score) return spec.score(f);
    return f.model.score(f.p, spec.scoreInput ? spec.scoreInput(f) : f.g, f.sol);
  };

  P.reveal = function (skipped) {
    var f = this, spec = f.spec;
    if (!f.predicting) return;
    cancelAnimationFrame(f.raf);
    f.skipped = !!skipped; f.seen = true;
    f.result = skipped ? null : f.score();
    f.setMode('revealing');
    f.rv = { base: 1 };   // a reveal mid draw-in must not leave the base curves half drawn
    f.root.classList.add('is-revealing');
    f.$('.predict').hidden = true;
    f.play(val(spec.reveal, f), function () { f.finishReveal(); });
  };

  P.finishReveal = function () {
    var f = this, spec = f.spec, res = f.result;
    f.setMode('explore'); f.kpick = false;
    f.root.classList.remove('is-revealing'); f.root.classList.add('is-explore');
    if (spec.explore && spec.explore.init) spec.explore.init(f);
    var t = TALLY[f.id] || { played: 0, best: 0, streak: 0 };
    var v = spec.verdict(f), html = '';
    if (res) {
      t.played++; t.best = Math.max(t.best, res.total); t.streak = res.total >= 70 ? t.streak + 1 : 0;
      TALLY[f.id] = t; saveTally();
      var tr = tier(res.total);
      html += '<div class="v-top tone-' + tr.tone + '"><p class="v-head">' + (v.head || tr.head) + '</p>' +
        '<p class="v-score"><span class="v-num" data-to="' + res.total + '">0</span><span class="v-of"> of 100</span></p></div>' +
        '<p class="v-cheer">' + (v.cheer || encourage(res.total, t)) + '</p>';
    } else {
      html += '<div class="v-top tone-learn"><p class="v-head">Here is how it works.</p></div>' +
        '<p class="v-cheer">No score this round. Try a new one when you are ready to guess.</p>';
    }
    if (v.rows && v.rows.length) {
      html += '<table class="v-table"><thead><tr><th></th>' + (res ? '<th>You</th>' : '') + '<th>Answer</th></tr></thead><tbody>' +
        v.rows.map(function (r) { return '<tr><th scope="row">' + rich(r[0]) + '</th>' + (res ? '<td class="you">' + r[1] + '</td>' : '') + '<td class="ans">' + r[2] + '</td></tr>'; }).join('') +
        '</tbody></table>';
    }
    html += '<p class="why">' + v.why + '</p>';
    var vd = f.$('.verdict'); vd.innerHTML = html; vd.hidden = false;
    f.buildExplore();
    f.$('.again').hidden = false;
    f.$('.tally').innerHTML = t.played ? '<span><b>' + t.played + '</b> ' + (t.played === 1 ? 'round' : 'rounds') + '</span><span>best <b>' + t.best + '</b></span>' +
      (t.streak >= 2 ? '<span><b>' + t.streak + '</b> in a row at 70+</span>' : '') : '';
    f.$('.sr').textContent = (res ? tier(res.total).head + ' ' + res.total + ' of 100. ' : '') + v.why.replace(/<[^>]+>/g, '');
    var n = vd.querySelector('.v-num');
    if (n) {
      var to = +n.getAttribute('data-to');
      if (RM) n.textContent = to;
      else { var t0 = performance.now(); (function up(now) { var k = Math.min(1, (now - t0) / 700); n.textContent = Math.round(to * ease(k)); if (k < 1) requestAnimationFrame(up); })(t0); }
    }
    f.render();
    document.dispatchEvent(new CustomEvent('kit:tally'));
  };

  /* ---------- explore controls (declarative) ----------
   * spec.explore.controls: array (or fn(f) -> array) of
   *   { kind: 'stepper', label, get(f), set(f, v, final), step, min, max, fmt(v), dur }
   *   { kind: 'seg', label, options: [[value, text], ...], get(f), set(f, value) }
   * Set runs per tween frame (final = true on the last); the kit re-solves and re-renders. */
  P.buildExplore = function () {
    var f = this, ex = f.spec.explore; if (!ex) return;
    var ctl = val(ex.controls, f) || []; f.ctl = ctl;
    var html = ctl.map(function (c, i) {
      if (c.kind === 'stepper') {
        var lab = esc(val(c.label, f));
        return '<div class="stepper"><span class="st-lbl">' + rich(val(c.label, f)) + '</span>' +
          '<button type="button" class="st-btn" data-ctl="' + i + '" data-dir="-1" aria-label="Decrease ' + lab + '">&minus;</button>' +
          '<output class="st-val" data-ctl-val="' + i + '"></output>' +
          '<button type="button" class="st-btn" data-ctl="' + i + '" data-dir="1" aria-label="Increase ' + lab + '">+</button></div>';
      }
      if (c.kind === 'seg') {
        return '<div class="seg-wrap"><span class="seg-lbl">' + rich(val(c.label, f) || '') + '</span><div class="seg" role="group" aria-label="' + esc(val(c.label, f) || '') + '">' +
          c.options.map(function (o, j) { return '<button type="button" data-ctl="' + i + '" data-opt="' + j + '" aria-pressed="false">' + rich(o[1]) + '</button>'; }).join('') + '</div></div>';
      }
      return '';
    }).join('');
    var el = f.$('.explore');
    el.innerHTML = '<p class="ex-title">' + esc(ex.title || 'Now play with it') + '</p><p class="ex-hint">' + rich(val(ex.hint, f) || '') + '</p>' +
      '<div class="ex-controls">' + html + '</div><p class="ex-readout" aria-live="polite"></p>';
    el.hidden = false;
    f.syncControls();
  };
  P.syncControls = function () {
    var f = this; if (!f.ctl) return;
    f.ctl.forEach(function (c, i) {
      if (c.kind === 'stepper') {
        var v = c._target != null ? c._target : c.get(f), o = f.root.querySelector('[data-ctl-val="' + i + '"]');
        if (o) o.textContent = c.fmt ? c.fmt(v) : num(v, 2);
        f.root.querySelectorAll('.st-btn[data-ctl="' + i + '"]').forEach(function (b) {
          var d = +b.getAttribute('data-dir'); b.disabled = d < 0 ? (c.min != null && v <= c.min + 1e-9) : (c.max != null && v >= c.max - 1e-9);
        });
      } else if (c.kind === 'seg') {
        var cur = c.get(f);
        f.root.querySelectorAll('.seg button[data-ctl="' + i + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(c.options[+b.getAttribute('data-opt')][0] === cur)); });
      }
    });
  };
  P.control = function (btn) {
    var f = this, i = +btn.getAttribute('data-ctl'), c = f.ctl && f.ctl[i]; if (!c) return;
    f.ex.touched = true;
    if (c.kind === 'stepper') {
      var from = c.get(f), base = c._target != null ? c._target : from;
      var to = base + (+btn.getAttribute('data-dir')) * (c.step || 1);
      to = Math.round(to * 1e6) / 1e6;
      if (c.min != null) to = Math.max(c.min, to); if (c.max != null) to = Math.min(c.max, to);
      if (Math.abs(to - base) < 1e-9) return;
      c._target = to; f.syncControls();
      f.tween(from, to, c.dur || 450, function (v, fin) { c.set(f, v, fin); }, function () { c._target = null; f.syncControls(); });
    } else if (c.kind === 'seg') {
      var o = c.options[+btn.getAttribute('data-opt')];
      if (o[0] === c.get(f)) return;
      c.set(f, o[0]); f.resolve(); f.syncControls(); f.render();
    }
  };

  /* ---------- input ---------- */
  P.local = function (e) {
    var r = this.svg.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (this.S.W / r.width), y: (e.clientY - r.top) * (this.S.H / r.height) };
  };
  P.inPlot = function (pt, pad) {
    var S = this.S; pad = pad || 0;
    return pt.x >= S.x0 - pad && pt.x <= S.x1 + pad && pt.y >= S.y1 - pad && pt.y <= S.y0 + pad;
  };
  // what would a press at pt grab? (shared by pointerdown and the touchstart scroll guard)
  P.target = function (pt, touch) {
    var f = this; if (f.revealing) return null;
    var hs = f.handles(), best = null, bd = touch ? 32 : 22;
    hs.forEach(function (h) {
      var d = h.hit ? h.hit(pt) : Math.hypot(pt.x - h.px[0], pt.y - h.px[1]);
      if (d < bd) { bd = d; best = h; }
    });
    if (best) return { kind: 'handle', h: best };
    if (f.predicting) {
      var st = f.spec.steps[f.cur];
      if (st && st.kind === 'place' && f.inPlot(pt, 6)) return { kind: 'place', step: f.cur };
      if (st && st.kind === 'draw' && f.inPlot(pt, 6)) return { kind: 'draw', step: f.cur };
      // a finished drawing can be redrawn any time before the reveal
      var di = -1; f.spec.steps.forEach(function (s, i) { if (s.kind === 'draw' && f.done[i]) di = i; });
      if (di >= 0 && f.inPlot(pt, 0)) return { kind: 'draw', step: di };
    }
    return null;
  };

  P.bind = function () {
    var f = this, svg = f.svg, stg = f.stage;
    stg.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      if (f.target(f.local(e.touches[0]), true)) e.preventDefault();   // ours: no scroll. Otherwise the page scrolls.
    }, { passive: false });
    stg.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      var pt = f.local(e), t = f.target(pt, e.pointerType !== 'mouse');
      if (!t) return;
      e.preventDefault(); f.kbd = false;
      try { stg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      f.drag = t; f.dragId = e.pointerId; f.lastPt = null;
      if (t.kind === 'draw') f.drawStart(t.step);
      if (t.kind === 'handle' && t.h.grab) t.h.grab(f, f.S.ix(pt.x), f.S.iy(pt.y));
      f.move(pt);
    });
    stg.addEventListener('pointermove', function (e) {
      if (f.drag && e.pointerId === f.dragId) { e.preventDefault(); f.move(f.local(e)); }
      else if (!f.drag && e.pointerType === 'mouse') {
        var t = f.target(f.local(e), false);
        stg.style.cursor = t ? (t.kind === 'handle' ? 'grab' : 'crosshair') : '';
      }
    });
    function end(e) {
      if (!f.drag || e.pointerId !== f.dragId) return;
      var t = f.drag; f.drag = null;
      var step = t.kind === 'handle' ? t.h.step : t.step;
      if (t.kind === 'handle' && t.h.drop) t.h.drop(f);
      if (f.predicting && step != null) f.completeStep(step);
      f.render();
    }
    stg.addEventListener('pointerup', end);
    stg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', function (e) { f.key(e); });
    svg.addEventListener('blur', function () { if (f.kbd) { f.kbd = false; f.render(); } });
    f.$('.reveal').addEventListener('click', function () { f.reveal(false); });
    f.$('.skip').addEventListener('click', function () { f.reveal(true); });
    f.$('.newone').addEventListener('click', function () {
      f.newRound(true);
      var q = f.$('.fig-head'), r = q.getBoundingClientRect();
      if (r.top < 0) q.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    });
    f.root.addEventListener('click', function (e) {
      if (!f.exploring) return;
      var b = e.target.closest('[data-ctl]'); if (b) { f.control(b); return; }
      b = e.target.closest('[data-act]');
      if (b && f.spec.explore.act) { f.ex.touched = true; f.spec.explore.act(f, b.getAttribute('data-act'), b); }
    });
    // first time on screen: draw the base curves in
    if ('IntersectionObserver' in window && !RM) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting && !f.seen) { f.seen = true; io.disconnect(); if (f.predicting && f.rv.base < 1) f.play([['base', 0, 1000]]); }
        });
      }, { threshold: 0.35 });
      io.observe(f.stage);
    } else f.seen = true;
  };

  P.move = function (pt) {
    var f = this, S = f.S, t = f.drag;
    var X = clamp(S.ix(pt.x), 0, S.X), Y = clamp(S.iy(pt.y), 0, S.Y);
    if (t.kind === 'handle') f.setHandle(t.h, X, Y);
    else if (t.kind === 'place') f.place(t.step, X, Y);
    else if (t.kind === 'draw') { f.drawTo(t.step, X, Y, f.lastPt); f.lastPt = { x: X, y: Y }; }
    f.render();
  };
  P.place = function (i, X, Y) {
    var f = this, st = f.spec.steps[i];
    if (st.snap) { X = snapTo(X, st.snap); Y = snapTo(Y, st.snap); }
    if (st.place) st.place(f, X, Y); else f.g[st.key] = { x: X, y: Y };
  };

  /* freehand drawing. A 'draw' step stores bins over the x range in f.g[key]:
   *   st.mode 'fn' (default): one y per bin, a curve y(x) drawn in any direction
   *   st.mode 'free': raw points, any shape (L-shapes, vertical lines) */
  P.drawStart = function (i) {
    var f = this, st = f.spec.steps[i];
    if (st.mode === 'free') { if (!f.g[st.key]) f.g[st.key] = []; else if (f.g[st.key].length) f.g[st.key].push(null); }
  };
  P.drawTo = function (i, X, Y, last) {
    var f = this, st = f.spec.steps[i], key = st.key;
    if (st.mode === 'free') { f.g[key].push({ x: X, y: Y }); return; }
    var nb = st.bins || 40, bins = f.g[key] || (f.g[key] = new Array(nb + 1).fill(null)), bw = f.dom.X / nb, i1 = Math.round(X / bw);
    if (last) {
      var i0 = Math.round(last.x / bw), lo = Math.min(i0, i1), hi = Math.max(i0, i1);
      for (var k = lo; k <= hi; k++) bins[k] = i1 === i0 ? Y : lerp(last.y, Y, (k - i0) / (i1 - i0));
    } else bins[i1] = Y;
  };
  // the drawing as [{x, y} | null]
  P.drawn = function (key) {
    var f = this, st = f.spec.steps.filter(function (s) { return s.key === key; })[0] || {}, d = f.g[key] || [];
    if (st.mode === 'free') return d;
    var bw = f.dom.X / (st.bins || 40);
    return d.map(function (v, i) { return v == null ? null : { x: i * bw, y: v }; });
  };
  // fraction of bins filled (for a 'fn' drawing), restricted to [a, b] in x if given
  P.coverage = function (key, a, b) {
    var pts = this.drawn(key), n = 0, k = 0;
    a = a == null ? 0 : a; b = b == null ? this.dom.X : b;
    for (var i = 0; i < pts.length; i++) {
      var x = i * this.dom.X / (pts.length - 1); if (x < a - 1e-9 || x > b + 1e-9) continue;
      n++; if (pts[i]) k++;
    }
    return n ? k / n : 0;
  };

  P.key = function (e) {
    var f = this, S = f.S, k = e.key;
    if (f.revealing) return;
    var dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dy = k === 'ArrowUp' ? 1 : k === 'ArrowDown' ? -1 : 0;
    var big = e.shiftKey ? 5 : 1;
    if (f.predicting) {
      var st = f.spec.steps[f.cur];
      // place steps: Enter drops the point (at st.kstart or mid-plot), arrows move it, Enter again confirms
      var placed = st && st.kind === 'place' && (st.key ? !!f.g[st.key] : f.kplaced[f.cur]);
      if (st && st.kind === 'place' && !placed && (k === 'Enter' || dx || dy)) {
        var p0 = st.kstart ? st.kstart(f) : { x: S.X * 0.5, y: S.Y * 0.5 };
        f.place(f.cur, p0.x, p0.y); f.kplaced[f.cur] = true; f.kbd = true; f.kpick = false;
        f.$('.sr').textContent = 'Point placed. Arrow keys move it, Enter confirms.';
        f.render(); e.preventDefault(); return;
      }
      if (st && st.kind === 'draw' && (dx || dy || k === 'Enter')) {
        f.keyDraw(f.cur, dy * big);
        if (k === 'Enter') f.completeStep(f.cur);
        f.render(); e.preventDefault(); return;
      }
    }
    var hs = f.handles();
    if (k === ' ' && hs.length > 1) {
      var cur = hs.indexOf(f.keyHandle(hs)); f.kfocus = (cur + 1) % hs.length; f.kpick = true; f.kbd = true;
      f.$('.sr').textContent = 'Handle ' + (f.kfocus + 1) + ' of ' + hs.length + ' selected.';
      f.render(); e.preventDefault(); return;
    }
    if (!dx && !dy && k !== 'Enter') return;
    var h = f.keyHandle(hs); if (!h) return;
    e.preventDefault(); f.kbd = true; f.kfocus = hs.indexOf(h); f.kpick = true;
    if (k === 'Enter') { if (h.step != null) f.completeStep(h.step); f.render(); return; }
    var nx = h.x != null ? h.x : S.ix(h.px[0]), ny = h.y != null ? h.y : S.iy(h.px[1]);
    var ks = h.kstep, kx = ks ? (typeof ks === 'object' ? ks.x : ks) : (h.snap ? (typeof h.snap === 'object' ? h.snap.x : h.snap) : S.X / 100);
    var ky = ks ? (typeof ks === 'object' ? ks.y : ks) : (h.snap ? (typeof h.snap === 'object' ? h.snap.y : h.snap) : S.Y / 100);
    if (h.key) h.key(f, dx * big, dy * big);
    else f.setHandle(h, nx + dx * big * (kx || S.X / 100), ny + dy * big * (ky || S.Y / 100));
    if (h.step != null && f.predicting && !h.noAutoDone) f.completeStep(h.step);
    f.render();
  };
  P.keyDraw = function (i, dy) {
    var f = this, st = f.spec.steps[i], key = st.key;
    var cur = f.drawn(key);
    if (!cur.some(Boolean)) {
      var nb = st.bins || 40, bw = f.dom.X / nb, start = st.kstart || function () { return f.dom.Y * 0.5; };
      f.g[key] = []; for (var j = 0; j <= nb; j++) { var v = start(f, j * bw); f.g[key].push(v == null || !isFinite(v) ? null : clamp(v, 0, f.dom.Y)); }
    }
    if (dy) f.g[key] = f.g[key].map(function (v) { return v == null ? null : clamp(v + dy * f.dom.Y / 100, 0, f.dom.Y); });
  };

  /* ---------- mounting a week page ---------- */
  // Kit.mount(specs, {store, board, filmBase}) builds every figure into <section id=spec.key> and
  // fills the figure index (an element with [data-kit-board]) with live "best" scores.
  function mount(specs, opts) {
    opts = opts || {};
    STORE = opts.store || STORE; TALLY = loadTally();
    var figs = {};
    var board = document.querySelector(opts.board || '[data-kit-board]');
    if (board) board.innerHTML = specs.map(function (s) {
      return '<a href="#' + s.key + '"><span class="b-num">' + esc(s.num) + '</span><span class="b-name">' + rich(s.short || s.topic) + '</span><span class="b-best" data-fig="' + s.key + '"></span></a>';
    }).join('');
    specs.forEach(function (spec) {
      var el = document.getElementById(spec.key);
      if (!el) { el = document.createElement('section'); el.id = spec.key; (document.querySelector('main') || document.body).appendChild(el); }
      figs[spec.key] = new Figure(spec, el, opts);
    });
    function refresh() {
      document.querySelectorAll('.b-best').forEach(function (el) {
        var r = TALLY[el.getAttribute('data-fig')];
        el.textContent = r && r.played ? 'best ' + r.best : 'not tried';
        el.classList.toggle('has', !!(r && r.played));
      });
    }
    refresh();
    document.addEventListener('kit:tally', refresh);
    window.__figs = figs;   // for test scripts
    return figs;
  }

  window.Kit = {
    version: '1.0',
    C: C, RM: RM, K: K, G: G, Score: Score, Placer: Placer, Pen: Pen, Figure: Figure, mount: mount,
    num: num, money: money, esc: esc, sub: sub, rich: rich, clamp: clamp, clamp01: clamp01, lerp: lerp, ease: ease, easeOut: easeOut, seg: seg, snapTo: snapTo, tw: tw,
    tally: function () { return TALLY; }, tier: tier
  };
})();
