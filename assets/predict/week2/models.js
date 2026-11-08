/* Week 2 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week2-viz.html:
 *   2.1  Cobb-Douglas a = 0.5, U0 = 2 (P = (2, 2)); plus perfect substitutes / complements / neutral / bad
 *   2.3  I = 100, PX = 5, PY = 4        -> intercepts 20 and 25, slope -1.25
 *   2.4  base I = 100, PX = 5, PY = 4; Income up 30% -> intercepts 26 and 32.5
 *   2.5  I = 80, PX = 5, PY = 4, a = 0.5 -> X* = 8, Y* = 10 (the film)
 *   2.6  I = 100, PX = 5, PY = 4, a = 0.5 -> $50 on X, X* = 10, Y* = 12.5 (start at $20 on X)
 *   2.8  a = 0.5, U = 5                  -> P = (2.5, 10) with MRS 4; MRS = 1 at X = 5
 *   2.9  IC through A: X^0.5 Y^0.5 = 7 (A = (7, 7)); B = (3, 4)
 *   2.10 I = 80, PY = 4, MU_X = a = 3, MU_Y = b = 3. The site's default PX = 4 is the knife edge
 *        (every bundle on the line is optimal), so the first question uses PX = 6 -> all on Y, (0, 20).
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function niceCeil(v, step) { return Math.ceil(v / step - 1e-9) * step; }
  // a tick step giving at most 8 ticks: 1, 2, 5, 10, 20
  function niceStep(D) { var c = [1, 2, 5, 10, 20, 50]; for (var i = 0; i < c.length; i++) if (D / c[i] <= 8 + 1e-9) return c[i]; return 100; }
  function sq(D) { var t = niceStep(D); return { X: D, Y: D, xs: t, ys: t }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // nearest point on a polyline (array of [x, y] or null), Euclidean in data units
  function nearest(px, py, pts) {
    var best = { d: Infinity, x: null, y: null };
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? clamp01(((px - a[0]) * dx + (py - a[1]) * dy) / L2) : 0;
      var x = a[0] + t * dx, y = a[1] + t * dy, d = Math.hypot(px - x, py - y);
      if (d < best.d) best = { d: d, x: x, y: y };
    }
    return best;
  }
  function cd(a, U, x) { return x > 0 ? Math.pow(U / Math.pow(x, a), 1 / (1 - a)) : Infinity; }   // Cobb-Douglas IC: Y at X
  function cdU(a, x, y) { return Math.pow(x, a) * Math.pow(y, 1 - a); }

  /* ---------- 2.1 Indifference curves by preference type ---------- */
  var TYPES = ['cobb', 'subs', 'comp', 'neutral', 'bad'];
  var prefs = {
    TYPES: TYPES,
    defaults: function () { return { type: 'cobb', a: 0.5, x0: 2, y0: 2 }; },
    gen: function (rng) {
      var r = rng(), type = r < 0.3 ? 'cobb' : r < 0.5 ? 'subs' : r < 0.7 ? 'comp' : r < 0.85 ? 'neutral' : 'bad';
      var p = { type: type, a: 0.5, x0: 0, y0: 0 };
      if (type === 'cobb') { p.a = pick(rng, [0.3, 0.5, 0.7]); p.x0 = pick(rng, range(2, 6, 1)); p.y0 = pick(rng, range(2, 6, 1)); }
      if (type === 'subs') { p.x0 = pick(rng, range(2, 7, 1)); p.y0 = pick(rng, range(2, 7, 1)); }
      if (type === 'comp') { p.x0 = pick(rng, range(2, 7, 1)); p.y0 = pick(rng, range(2, 8, 1)); }
      if (type === 'neutral') { p.x0 = pick(rng, range(2, 7, 1)); p.y0 = pick(rng, range(2, 8, 1)); }
      if (type === 'bad') { p.x0 = pick(rng, range(4, 8, 1)); p.y0 = pick(rng, range(1, 5, 1)); }
      return p;
    },
    valid: function (p) {
      var X = 10;
      if (p.type === 'subs') return p.x0 + p.y0 >= 5 && p.x0 + p.y0 <= 9;
      if (p.type === 'bad') return p.x0 - p.y0 >= 2 && p.x0 - p.y0 <= 5;
      if (p.type === 'cobb') { var U = cdU(p.a, p.x0, p.y0); return cd(p.a, U, X) <= 5 && cd(p.a, U, 1) >= 5; }   // the curve spans the frame
      return true;
    },
    random: function (rng, prev) { return draw(prefs.gen, prefs.valid, prev, rng); },
    U: function (p, x, y) {
      if (p.type === 'cobb') return cdU(p.a, x, y);
      if (p.type === 'subs') return x + y;
      if (p.type === 'comp') return Math.min(x, y);
      if (p.type === 'neutral') return x;
      return x - y;   // bad: Y is a bad, U = X - Y
    },
    // the IC through P as a polyline in data space, running past the 10 x 10 frame
    curve: function (p) {
      var U = prefs.U(p, p.x0, p.y0), pts = [], i, BIG = 16;
      if (p.type === 'cobb') { for (i = 0; i <= 400; i++) { var x = 0.05 + (BIG - 0.05) * Math.pow(i / 400, 1.6); var y = cd(p.a, U, x); pts.push(y < 60 ? [x, y] : null); } return pts; }
      if (p.type === 'subs') return [[0, U], [U, 0]];
      if (p.type === 'comp') return [[U, BIG], [U, U], [BIG, U]];
      if (p.type === 'neutral') return [[p.x0, 0], [p.x0, BIG]];
      return [[U, 0], [BIG, BIG - U]];
    },
    solve: function (p) {
      var U = prefs.U(p, p.x0, p.y0);
      var mrs = p.type === 'cobb' ? p.a / (1 - p.a) * p.y0 / p.x0 : p.type === 'subs' ? 1 : null;
      return { U: U, pts: prefs.curve(p), mrs: mrs };
    },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    // which way is better: a unit vector in data space
    better: function (p) {
      if (p.type === 'neutral') return [1, 0];
      if (p.type === 'bad') return [Math.SQRT1_2, -Math.SQRT1_2];
      return [Math.SQRT1_2, Math.SQRT1_2];
    },
    gap: function (p, g) { return g ? nearest(g.x, g.y, prefs.curve(p)) : null; },
    // g: {b1, b2, b3} bundles; each scores on its distance to the IC (data units on the 10 x 10 frame)
    score: function (p, g) {
      var keys = ['b1', 'b2', 'b3'], parts = keys.map(function (k) {
        var b = g[k]; if (!b) return 0;
        if (Math.hypot(b.x - p.x0, b.y - p.y0) < 0.75) return 0;
        return lin(prefs.gap(p, b).d, 0.25, 1.6);
      });
      return { total: Math.round(100 * (parts[0] + parts[1] + parts[2]) / 3), parts: parts };
    }
  };

  /* ---------- 2.3 The budget line ---------- */
  var budget = {
    defaults: function () { return { I: 100, Px: 5, Py: 4 }; },
    gen: function (rng) { return { I: pick(rng, range(40, 200, 10)), Px: pick(rng, range(2, 12, 1)), Py: pick(rng, range(2, 12, 1)) }; },
    valid: function (p) {
      var s = budget.solve(p);
      return isMult(s.xI, 0.5) && isMult(s.yI, 0.5) && s.xI >= 14 && s.xI <= 46 && s.yI >= 14 && s.yI <= 46 && Math.abs(s.xI - s.yI) >= 2;
    },
    random: function (rng, prev) { return draw(budget.gen, budget.valid, prev, rng); },
    solve: function (p) { return { xI: p.I / p.Px, yI: p.I / p.Py, slope: -p.Px / p.Py, opp: p.Px / p.Py, area: 0.5 * (p.I / p.Px) * (p.I / p.Py) }; },
    domain: function (p) { return sq(niceCeil(Math.max(p.I / p.Px, p.I / p.Py) * 1.25, 10)); },
    START: 10,
    score: function (p, g) {
      var s = budget.solve(p);
      var sx = lin((g.x - s.xI) / s.xI, 0.025, 0.35), sy = lin((g.y - s.yI) / s.yI, 0.025, 0.35);
      return { total: Math.round(100 * (sx + sy) / 2), parts: [sx, sy] };
    }
  };

  /* ---------- 2.4 Shift or pivot ---------- */
  var CHANGES = {
    iu: { what: 'I', dir: 1, name: 'Income rises' }, id: { what: 'I', dir: -1, name: 'Income falls' },
    xu: { what: 'Px', dir: 1, name: 'The price of X rises' }, xd: { what: 'Px', dir: -1, name: 'The price of X falls' },
    yu: { what: 'Py', dir: 1, name: 'The price of Y rises' }, yd: { what: 'Py', dir: -1, name: 'The price of Y falls' }
  };
  var shift = {
    CHANGES: CHANGES, I0: 100, Px0: 5, Py0: 4,
    defaults: function () { return { type: 'iu', m: 30 }; },
    gen: function (rng) { return { type: pick(rng, ['iu', 'id', 'xu', 'xd', 'yu', 'yd']), m: pick(rng, [10, 20, 25, 30, 40, 50]) }; },
    valid: function (p) {
      var s = shift.solve(p);
      return isMult(s.xI1, 0.5) && isMult(s.yI1, 0.5) && s.xI1 <= 46 && s.yI1 <= 46 && s.xI1 >= 6 && s.yI1 >= 6;
    },
    random: function (rng, prev) { return draw(shift.gen, shift.valid, prev, rng); },
    solve: function (p) {
      var c = CHANGES[p.type], k = 1 + c.dir * p.m / 100;
      var I = shift.I0 * (c.what === 'I' ? k : 1), Px = shift.Px0 * (c.what === 'Px' ? k : 1), Py = shift.Py0 * (c.what === 'Py' ? k : 1);
      return {
        I: I, Px: Px, Py: Py, xI0: shift.I0 / shift.Px0, yI0: shift.I0 / shift.Py0, xI1: I / Px, yI1: I / Py,
        slope0: -shift.Px0 / shift.Py0, slope1: -Px / Py, fixed: c.what === 'Px' ? 'y' : c.what === 'Py' ? 'x' : 'none',
        kind: c.what === 'I' ? 'shift' : 'pivot'
      };
    },
    domain: function (p) { var s = shift.solve(p); return sq(niceCeil(Math.max(25, s.xI1, s.yI1) * 1.2, 10)); },
    score: function (p, g) {
      var s = shift.solve(p);
      var sx = lin((g.x - s.xI1) / s.xI1, 0.025, 0.3), sy = lin((g.y - s.yI1) / s.yI1, 0.025, 0.3);
      return { total: Math.round(100 * (sx + sy) / 2), parts: [sx, sy] };
    }
  };

  /* ---------- 2.5 The consumer optimum (Cobb-Douglas) ---------- */
  var optimum = {
    defaults: function () { return { I: 80, Px: 5, Py: 4, a: 0.5 }; },
    gen: function (rng) { return { I: pick(rng, range(40, 200, 10)), Px: pick(rng, range(1, 12, 1)), Py: pick(rng, range(1, 12, 1)), a: pick(rng, [0.3, 0.4, 0.5, 0.6, 0.7]) }; },
    valid: function (p) {
      var s = optimum.solve(p);
      return isMult(s.xs, 0.5) && isMult(s.ys, 0.5) && s.xI >= 10 && s.xI <= 60 && s.yI >= 10 && s.yI <= 60 && Math.max(s.xI, s.yI) / Math.min(s.xI, s.yI) <= 2.5;
    },
    random: function (rng, prev) { return draw(optimum.gen, optimum.valid, prev, rng); },
    solve: function (p) {
      var xs = p.a * p.I / p.Px, ys = (1 - p.a) * p.I / p.Py;
      return { xs: xs, ys: ys, U: cdU(p.a, xs, ys), xI: p.I / p.Px, yI: p.I / p.Py, ratio: p.Px / p.Py };
    },
    domain: function (p) { var D = niceCeil(Math.max(p.I / p.Px, p.I / p.Py) * 1.18, 5); return sq(D); },
    ic: function (p, U, x) { return cd(p.a, U, x); },
    mrs: function (p, x, y) { return p.a / (1 - p.a) * y / x; },
    score: function (p, g) {
      var s = optimum.solve(p); if (!g.pt) return { total: 0 };
      var d = Math.hypot((g.pt.x - s.xs) / s.xI, (g.pt.y - s.ys) / s.yI);
      return { total: Math.round(100 * lin(d, 0.03, 0.35)), d: d };
    }
  };

  /* ---------- 2.6 Marginal utility per dollar ---------- */
  var mupd = {
    defaults: function () { return { I: 100, Px: 5, Py: 4, a: 0.5, s0: 20 }; },
    gen: function (rng) { return { I: 100, Px: pick(rng, range(2, 10, 1)), Py: pick(rng, range(2, 10, 1)), a: pick(rng, [0.3, 0.4, 0.5, 0.6, 0.7]), s0: pick(rng, range(10, 90, 10)) }; },
    valid: function (p) {
      var s = mupd.solve(p);
      return isMult(s.xs, 0.5) && isMult(s.ys, 0.5) && Math.abs(p.s0 - s.ss) >= 20 && s.xI <= 50 && s.yI <= 50 && Math.max(s.xI, s.yI) / Math.min(s.xI, s.yI) <= 2.5;
    },
    random: function (rng, prev) { return draw(mupd.gen, mupd.valid, prev, rng); },
    at: function (p, s) {   // the bundle when $s goes to X, and its marginal utility per dollar
      var x = s / p.Px, y = (p.I - s) / p.Py, a = p.a, b = 1 - a;
      var mux = a * Math.pow(x, a - 1) * Math.pow(y, b), muy = b * Math.pow(x, a) * Math.pow(y, -a);
      return { s: s, x: x, y: y, mux: mux, muy: muy, rx: mux / p.Px, ry: muy / p.Py, U: cdU(a, x, y) };
    },
    solve: function (p) {
      var ss = p.a * p.I, st = mupd.at(p, ss), b0 = mupd.at(p, p.s0);
      return { ss: ss, xs: ss / p.Px, ys: (p.I - ss) / p.Py, star: st, start: b0, xI: p.I / p.Px, yI: p.I / p.Py, dir: Math.sign(ss - p.s0) };
    },
    domain: function (p) { var D = niceCeil(Math.max(p.I / p.Px, p.I / p.Py) * 1.15, 5); return sq(D); },
    score: function (p, g) {
      var s = mupd.solve(p), moved = g.s - p.s0;
      var sd = Math.sign(moved) === s.dir ? 1 : 0, sc = lin(g.s - s.ss, 1.5, 30);
      return { total: Math.round(100 * (0.3 * sd + 0.7 * sc)), parts: [sd, sc] };
    }
  };

  /* ---------- 2.8 MRS along the curve ---------- */
  var mrs = {
    defaults: function () { return { a: 0.5, U: 5, x0: 2.5, m: 1 }; },
    gen: function (rng) { return { a: pick(rng, [0.4, 0.5, 0.6]), U: pick(rng, range(4, 8, 1)), x0: pick(rng, range(1.5, 14, 0.5)), m: pick(rng, [0.5, 1, 2]) }; },
    valid: function (p) {
      var s = mrs.solve(p);
      return s.y0 >= 4 && s.y0 <= 16 && Math.abs(Math.log(s.mrs0 / p.m)) >= Math.log(2.5) && s.xt >= 2 && s.xt <= 16 && s.yt >= 2 && s.yt <= 16 &&
        Math.abs(s.xt - p.x0) >= 2;
    },
    random: function (rng, prev) { return draw(mrs.gen, mrs.valid, prev, rng); },
    y: function (p, x) { return cd(p.a, p.U, x); },
    at: function (p, x) { return p.a / (1 - p.a) * mrs.y(p, x) / x; },
    // MRS = (a/b) U^(1/b) x^(-1/b)  ->  x = ((a/b) U^(1/b) / m)^b
    xFor: function (p, m) { var b = 1 - p.a; return Math.pow(p.a / b * Math.pow(p.U, 1 / b) / m, b); },
    solve: function (p) {
      var y0 = mrs.y(p, p.x0), xt = mrs.xFor(p, p.m);
      return { y0: y0, mrs0: mrs.at(p, p.x0), xt: xt, yt: mrs.y(p, xt) };
    },
    domain: function () { return { X: 20, Y: 20, xs: 5, ys: 5 }; },
    QSTART: 16,
    score: function (p, g) {
      var s = mrs.solve(p);
      var s1 = g.m > 0 ? lin(Math.log(g.m / s.mrs0), Math.log(1.06), Math.log(2)) : 0;
      var s2 = g.q > 0 ? lin(Math.log(g.q / s.xt), Math.log(1.04), Math.log(1.8)) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 2.9 ICs cannot cross ---------- */
  var cross = {
    defaults: function () { return { a: 0.5, xA: 7, yA: 7, xB: 3, yB: 4 }; },
    gen: function (rng) {
      return { a: pick(rng, [0.3, 0.4, 0.5, 0.6, 0.7]), xA: pick(rng, range(4, 10, 1)), yA: pick(rng, range(4, 10, 1)), xB: pick(rng, range(2, 13, 1)), yB: pick(rng, range(2, 13, 1)) };
    },
    valid: function (p) {
      var s = cross.solve(p), lo = cross.span(p, s.UB), loA = cross.span(p, s.UA);
      return Math.abs(Math.log(s.UB / s.UA)) >= 0.3 && lo[1] - lo[0] >= 7 && loA[1] - loA[0] >= 7 &&
        Math.abs(p.yB - cross.y(p, s.UA, p.xB)) >= 2.5;
    },
    random: function (rng, prev) { return draw(cross.gen, cross.valid, prev, rng); },
    y: function (p, U, x) { return cd(p.a, U, x); },
    // x range where the IC at U is inside the 16 x 16 frame
    span: function (p, U) { var b = 1 - p.a, xl = Math.pow(U / Math.pow(16, b), 1 / p.a); return [Math.max(0, xl), 16]; },
    solve: function (p) { return { UA: cdU(p.a, p.xA, p.yA), UB: cdU(p.a, p.xB, p.yB), higher: cdU(p.a, p.xB, p.yB) > cdU(p.a, p.xA, p.yA) }; },
    domain: function () { return { X: 16, Y: 16, xs: 4, ys: 4 }; },
    truth: function (p, U) {
      var pts = [], sp = cross.span(p, U);
      for (var i = 0; i <= 240; i++) { var x = sp[0] + (16 - sp[0]) * i / 240; var y = cross.y(p, U, x); pts.push(y <= 16.0001 && y >= 0 ? [x, y] : null); }
      return pts;
    },
    // where a drawn curve (array {x, y} | null over x) crosses the IC through A: [{x, y}]
    crossings: function (p, drawn) {
      var UA = cross.solve(p).UA, out = [], prev = null;
      drawn.forEach(function (q) {
        if (!q || q.x <= 0.05) { prev = null; return; }
        var d = q.y - cross.y(p, UA, q.x);
        if (prev && (d > 0) !== (prev.d > 0) && Math.abs(d) + Math.abs(prev.d) > 0) {
          var t = prev.d / (prev.d - d), x = prev.x + t * (q.x - prev.x);
          if (cross.y(p, UA, x) <= 16) out.push({ x: x, y: cross.y(p, UA, x) });
        }
        prev = { x: q.x, d: d };
      });
      return out;
    },
    // g: {drawn: [{x,y}|null]}. Score: closeness to the true IC through B, passing near B, and not crossing A's IC
    score: function (p, g) {
      var s = cross.solve(p), truth = cross.truth(p, s.UB), pts = (g.drawn || []).filter(Boolean);
      if (!pts.length) return { total: 0 };
      var sum = 0; pts.forEach(function (q) { sum += nearest(q.x, q.y, truth).d / 16; });
      var err = sum / pts.length, hit = 0, tp = truth.filter(Boolean);
      tp.forEach(function (t) { for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - t[0], pts[i].y - t[1]) / 16 < 0.06) { hit++; break; } });
      var cover = hit / tp.length;
      var poly = (g.drawn || []).map(function (q) { return q ? [q.x, q.y] : null; });
      var dB = nearest(p.xB, p.yB, poly).d / 16;
      var sc = lin(err, 0.015, 0.12) * (0.4 + 0.6 * clamp01(cover / 0.8)), sb = lin(dB, 0.02, 0.12);
      var crossed = cross.crossings(p, g.drawn || []).length > 0;
      return { total: Math.round(100 * (0.75 * sc + 0.25 * sb) * (crossed ? 0.6 : 1)), err: err, cover: cover, dB: dB, crossed: crossed };
    }
  };

  /* ---------- 2.10 Corner solutions with perfect substitutes ---------- */
  var corner = {
    defaults: function () { return { I: 80, Px: 6, Py: 4, a: 3, b: 3 }; },
    gen: function (rng) { return { I: pick(rng, range(40, 120, 10)), Px: pick(rng, range(2, 10, 1)), Py: pick(rng, range(2, 10, 1)), a: pick(rng, range(1, 6, 1)), b: pick(rng, range(1, 6, 1)) }; },
    valid: function (p) {
      var s = corner.solve(p);
      return Math.abs(s.rX - s.rY) / Math.max(s.rX, s.rY) >= 0.15 && isMult(s.xI, 0.5) && isMult(s.yI, 0.5) && s.xI >= 8 && s.xI <= 50 && s.yI >= 8 && s.yI <= 50 &&
        Math.max(s.xI, s.yI) / Math.min(s.xI, s.yI) <= 3;
    },
    random: function (rng, prev) { return draw(corner.gen, corner.valid, prev, rng); },
    solve: function (p) {
      var rX = p.a / p.Px, rY = p.b / p.Py, xI = p.I / p.Px, yI = p.I / p.Py, knife = Math.abs(rX - rY) < 1e-9;
      var xs = knife ? xI / 2 : rX > rY ? xI : 0, ys = knife ? yI / 2 : rX > rY ? 0 : yI;
      return { rX: rX, rY: rY, xI: xI, yI: yI, knife: knife, side: knife ? 'both' : rX > rY ? 'x' : 'y', xs: xs, ys: ys, U: p.a * xs + p.b * ys, mrs: p.a / p.b, ratio: p.Px / p.Py };
    },
    domain: function (p) { var D = niceCeil(Math.max(p.I / p.Px, p.I / p.Py) * 1.2, 5); return sq(D); },
    score: function (p, g) {
      var s = corner.solve(p), D = corner.domain(p).X; if (!g.pt) return { total: 0 };
      var d = Math.hypot(g.pt.x - s.xs, g.pt.y - s.ys) / D;
      return { total: Math.round(100 * lin(d, 0.025, 0.2)), d: d };
    }
  };

  var W2 = { prefs: prefs, budget: budget, shift: shift, optimum: optimum, mupd: mupd, mrs: mrs, cross: cross, corner: corner,
    util: { niceStep: niceStep, pick: pick, range: range, niceCeil: niceCeil, isMult: isMult, lin: lin, nearest: nearest, cd: cd, cdU: cdU } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W2;
  else root.W2 = W2;
})(this);
