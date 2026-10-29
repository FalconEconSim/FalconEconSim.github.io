/* Week 5 economics for "Predict, then see": production. Pure functions, no DOM. Loaded by the page
 * and by verify.js in node (module.exports), so every number the page shows is a number the script
 * checked. L is labor (workers), K capital (machines), Q output.
 *
 * Defaults match week5-viz.html (and the fig51 film for 5.1):
 *   5.1  TP = 1.5L^2 - 0.1L^3 (the page's S-curve form, the film's curve): MPL = 3L - 0.3L^2 peaks
 *        at L = 5 (MPL 7.5); MPL = 0 at L = 10, where TP peaks at 50.
 *   5.2  Q = L^0.5 K^0.5, the Q = 4 isoquant through P = (4, 4) (the page's draggable point).
 *   5.3  Q = K^0.5 L^0.5 = 4, so K = 16/L and MRTS = K/L. Start at L = 4 (MRTS 1, the page's start);
 *        the question asks for MRTS = 4: L = 2, K = 8 (the textbook's point A).
 *   5.4  Q = K^0.6 L^0.6, K = L = 4: Q = 4^1.2 = 5.278. Double both: 8^1.2 = 12.126 (x 2.297, IRS).
 *        Double only L: 4^0.6 x 8^0.6 = 8.0 (x 2^0.6 = 1.516, diminishing MPL).
 *   5.5  Q = K^0.5 L^0.5 along the ray L = K: Q = 1, 2, 3 at L = 1, 2, 3 (CRS, equal spacing).
 *   5.6  Q = A K^0.5 L^0.5 = 4 from (L, K) = (4, 4), A = 1. Substitute to L = 2: K = 8 (on the same
 *        isoquant). Then technology A = 1.4 (the page's "Improve Technology" step): K = 16/(1.96 x 2) = 4.08.
 *   5.7  Isoquant L K = 9 (Q = 3, the page's level 3) and an isocost with w = r: cheapest at (3, 3).
 *   5.8  Q = A K^a L^b with A = 1, a = b = 0.5 at (L, K) = (4, 4): MPL = MPK = 0.5, MRTS = 1.
 *   5.9  Bakery Q = K^0.5 L^0.5 with K = 2 ovens; "Buy Machine" makes K = 3: TP = (3L)^0.5.
 *   5.10 The page's ten production functions; the first is Q = L^0.5 K^0.5, isoquant through (4, 4).
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most 7 ticks on a 1-2-5 step
  function niceAxis(vmax) {
    var steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 1000) * 1000, s: 1000 };
  }
  // Cobb-Douglas Q = A K^a L^b, and K on the isoquant Q through L
  function cd(A, a, b, L, K) { return A * Math.pow(K, a) * Math.pow(L, b); }
  function cdK(A, a, b, Q, L) { return Math.pow(Q / (A * Math.pow(L, b)), 1 / a); }
  var EXP = range(0.2, 0.9, 0.1);
  // a drawn curve vs the true one (same rule as Kit.Score.curve, duplicated so node can run it).
  // drawn: [{x, y} | null]; truth: [[x, y] | null]; distances in units of the frame (1/X, 1/Y).
  function nearestD(px, py, pts, sx, sy) {
    var best = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      var ax = a[0] * sx, ay = a[1] * sy, bx = b[0] * sx, by = b[1] * sy, X = px * sx, Y = py * sy, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      var t = L2 ? clamp01(((X - ax) * dx + (Y - ay) * dy) / L2) : 0, d = Math.hypot(X - (ax + t * dx), Y - (ay + t * dy));
      if (d < best) best = d;
    }
    return best;
  }
  function curveScore(drawn, truth, X, Y, o) {
    o = o || {}; var sx = 1 / X, sy = 1 / Y, pts = (drawn || []).filter(Boolean), sum = 0;
    pts.forEach(function (p) { sum += nearestD(p.x, p.y, truth, sx, sy); });
    var err = pts.length ? sum / pts.length : 1, tp = truth.filter(Boolean), hit = 0, rad = o.coverRad || 0.06;
    tp.forEach(function (t) { for (var i = 0; i < pts.length; i++) if (Math.hypot((pts[i].x - t[0]) * sx, (pts[i].y - t[1]) * sy) < rad) { hit++; break; } });
    var cover = tp.length ? hit / tp.length : 0;
    var s = lin(err, o.full == null ? 0.012 : o.full, o.zero == null ? 0.12 : o.zero) * (0.4 + 0.6 * clamp01(cover / 0.8));
    return { err: err, cover: cover, s: s };
  }

  /* ---------- 5.1 Total product and marginal product (has a film) ---------- */
  // TP = aL^2 - bL^3. MPL = 2aL - 3bL^2 peaks where TP bends (L = a/3b) and is zero at TP's peak (L = 2a/3b).
  var product = {
    defaults: function () { return { a: 1.5, b: 0.1 }; },
    gen: function (rng) { var b = pick(rng, [0.02, 0.04, 0.05, 0.1, 0.2]), Li = pick(rng, range(3, 7, 0.5)); return { a: r6(3 * b * Li), b: b }; },
    valid: function (p) { var s = product.solve(p); return isMult(p.a, 0.01) && s.TPmax >= 8 && s.TPmax <= 600; },
    random: function (rng, prev) { return draw(product.gen, product.valid, prev, rng); },
    TP: function (p, L) { return p.a * L * L - p.b * L * L * L; },
    MPL: function (p, L) { return 2 * p.a * L - 3 * p.b * L * L; },
    AP: function (p, L) { return p.a * L - p.b * L * L; },
    solve: function (p) {
      var Li = p.a / (3 * p.b), Lz = 2 * p.a / (3 * p.b), La = p.a / (2 * p.b);
      return { Li: Li, Lz: Lz, La: La, MPmax: p.a * p.a / (3 * p.b), TPi: product.TP(p, Li), TPmax: product.TP(p, Lz), APmax: product.AP(p, La) };
    },
    domain: function (p) {
      var s = product.solve(p), x = niceAxis(s.Lz * 1.15), y = niceAxis(s.TPmax * 1.1);
      var mlo = product.MPL(p, x.D), m = niceAxis(s.MPmax * 1.12);
      return { X: x.D, Y: y.D, xs: x.s, ys: y.s, mY: m.D, ms: m.s, mlo: Math.min(0, mlo) };
    },
    start: function (p) { var D = product.domain(p); return { L1: Math.round(D.X * 0.1 * 10) / 10, L2: Math.round(D.X * 0.97 * 10) / 10 }; },
    score: function (p, g) {
      var s = product.solve(p), X = product.domain(p).X;
      var s1 = g.L1 != null ? lin((g.L1 - s.Li) / X, 0.015, 0.2) : 0, s2 = g.L2 != null ? lin((g.L2 - s.Lz) / X, 0.015, 0.2) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 5.2 Isoquant explorer: bundles that make the same output ---------- */
  // cd: Q = L^0.5 K^0.5; linear: Q = 2L + K; leontief: Q = min(L, K/2) (the page's three panels)
  var TECH = {
    cd: { name: 'Cobb-Douglas', Q: function (L, K) { return Math.sqrt(L * K); } },
    linear: { name: 'Perfect substitutes', Q: function (L, K) { return 2 * L + K; } },
    leontief: { name: 'Perfect complements', Q: function (L, K) { return Math.min(L, K / 2); } }
  };
  var iso = {
    TECH: TECH,
    defaults: function () { return { type: 'cd', q: 4, L: 4, K: 4 }; },
    gen: function (rng) {
      var type = pick(rng, ['cd', 'linear', 'leontief']), q, L, K;
      if (type === 'cd') { q = pick(rng, [2, 3, 4, 5, 6]); L = pick(rng, range(1, 9, 0.5)); K = r6(q * q / L); }
      else if (type === 'linear') { q = pick(rng, [4, 6, 8, 10]); L = pick(rng, range(0.5, q / 2 - 0.5, 0.5)); K = q - 2 * L; }
      else { q = pick(rng, [2, 3, 4]); var arm = rng(); if (arm < 0.34) { L = q; K = 2 * q; } else if (arm < 0.67) { L = q; K = pick(rng, range(2 * q + 0.5, 9, 0.5)); } else { K = 2 * q; L = pick(rng, range(q + 0.5, 9, 0.5)); } }
      return { type: type, q: q, L: L, K: K };
    },
    valid: function (p) {
      if (!(p.L > 0 && p.K > 0 && p.L <= 9 && p.K <= 9)) return false;
      if (p.type === 'cd' && !isMult(p.K, 0.1)) return false;
      return Math.abs(TECH[p.type].Q(p.L, p.K) - p.q) < 1e-9;
    },
    random: function (rng, prev) { return draw(iso.gen, iso.valid, prev, rng); },
    Q: function (p, L, K) { return TECH[p.type].Q(L, K); },
    // K on the isoquant at L (null where the isoquant is vertical or missing)
    Kat: function (type, q, L) {
      if (type === 'cd') return L > 0 ? q * q / L : null;
      if (type === 'linear') return q - 2 * L >= 0 ? q - 2 * L : null;
      return L >= q ? 2 * q : null;
    },
    corner: function (type, q) { return type === 'leontief' ? { L: q, K: 2 * q } : null; },
    solve: function (p) { return { q: p.q, ex: iso.examples(p) }; },
    // two other bundles on the isoquant, for the verdict
    examples: function (p) {
      var q = p.q, c = [];
      if (p.type === 'cd') [1, 2, 4, 8, 1.5, 3, 6].forEach(function (L) { var K = q * q / L; if (K <= 10 && L <= 10) c.push([L, K]); });
      else if (p.type === 'linear') [0, q / 4, q / 2, q / 8].forEach(function (L) { c.push([L, q - 2 * L]); });
      else c.push([q, 2 * q], [q + 2, 2 * q], [q, 2 * q + 1]);
      return c.filter(function (b) { return Math.abs(b[0] - p.L) > 0.01 || Math.abs(b[1] - p.K) > 0.01; }).slice(0, 2);
    },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    scoreOne: function (p, b) { return b ? lin((iso.Q(p, b.x, b.y) - p.q) / p.q, 0.04, 0.35) : 0; },
    score: function (p, g) {
      var s1 = iso.scoreOne(p, g.b1), s2 = iso.scoreOne(p, g.b2);
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 5.3 MRTS along the isoquant K = Q^2 / L ---------- */
  // Q = K^0.5 L^0.5: MRTS = MPL / MPK = K / L = Q^2 / L^2, so MRTS = m at L = Q / sqrt(m), K = Q sqrt(m)
  var MS = [1 / 9, 1 / 4, 4 / 9, 9 / 4, 4, 9];
  var mrts = {
    MS: MS,
    defaults: function () { return { q: 4, m: 4 }; },
    gen: function (rng) { return { q: pick(rng, [3, 4, 5, 6]), m: pick(rng, MS) }; },
    valid: function (p) { var s = mrts.solve(p); return s.L >= 1 && s.K >= 1 && s.L <= 15 && s.K <= 15; },
    random: function (rng, prev) { return draw(mrts.gen, mrts.valid, prev, rng); },
    solve: function (p) { var L = p.q / Math.sqrt(p.m); return { L: L, K: p.q * p.q / L, L0: p.q, K0: p.q }; },
    domain: function () { return { X: 18, Y: 18, xs: 3, ys: 3 }; },
    score: function (p, g) { var s = mrts.solve(p); return { total: g.L > 0 ? Math.round(100 * lin(Math.log(g.L / s.L), 0.03, 0.6)) : 0 }; }
  };

  /* ---------- 5.4 Diminishing MPL vs returns to scale ---------- */
  // Q = K^a L^b from K = L = 4. Scale both by lambda: Q1 lambda^(a+b). Scale only L: Q1 lambda^b.
  var dimret = {
    K0: 4, L0: 4,
    defaults: function () { return { a: 0.6, b: 0.6 }; },
    // b >= 0.3 so doubling labor alone visibly raises output (by 23% or more)
    gen: function (rng) { return { a: pick(rng, EXP), b: pick(rng, EXP) }; },
    valid: function (p) { var s = p.a + p.b; return p.b >= 0.3 - 1e-9 && s >= 0.5 - 1e-9 && s <= 1.7 + 1e-9 && (Math.abs(s - 1) < 1e-9 || Math.abs(s - 1) >= 0.2 - 1e-9); },
    random: function (rng, prev) { return draw(dimret.gen, dimret.valid, prev, rng); },
    both: function (p, lam) { return cd(1, p.a, p.b, lam * 4, lam * 4); },
    onlyL: function (p, lam) { return cd(1, p.a, p.b, lam * 4, 4); },
    solve: function (p) {
      var Q1 = cd(1, p.a, p.b, 4, 4), Qb = dimret.both(p, 2), Ql = dimret.onlyL(p, 2), s = r6(p.a + p.b);
      return { Q1: Q1, Qb: Qb, Ql: Ql, rb: Qb / Q1, rl: Ql / Q1, rts: s > 1 ? 'IRS' : s < 1 ? 'DRS' : 'CRS', s: s };
    },
    domain: function (p) { var s = dimret.solve(p), y = niceAxis(Math.max(s.Qb, 2 * s.Q1) * 1.25); return { X: 2.5, Y: y.D, xs: 0.5, ys: y.s }; },
    // full marks within 4% of Q1, zero at 50%; 30% of each part is being on the right side of "double"
    side: function (g, ans, Q1) {
      var dbl = 2 * Q1;
      if (Math.abs(ans - dbl) < 0.02 * Q1) return Math.abs(g - dbl) <= 0.06 * Q1 ? 1 : 0;
      return (g - dbl) * (ans - dbl) > 0 ? 1 : 0;
    },
    // the side of the double line only counts once the point has moved off today's output
    part: function (g, ans, Q1) { if (g == null) return 0; return 0.3 * (Math.abs(g - Q1) >= 0.1 * Q1 ? dimret.side(g, ans, Q1) : 0) + 0.7 * lin((g - ans) / Q1, 0.04, 0.5); },
    score: function (p, g) {
      var s = dimret.solve(p), s1 = dimret.part(g.qb, s.Qb, s.Q1), s2 = dimret.part(g.ql, s.Ql, s.Q1);
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 5.5 Returns to scale: isoquant spacing along a ray ---------- */
  // Q = K^a L^b on the ray L = K: Q = L^(a+b), so Q = n at L = n^(1/(a+b))
  var spacing = {
    defaults: function () { return { a: 0.5, b: 0.5 }; },
    gen: function (rng) { var e = range(0.25, 0.9, 0.05); return { a: pick(rng, e), b: pick(rng, e) }; },
    valid: function (p) { var s = r6(p.a + p.b); return s >= 0.6 && s <= 1.6 && (s === 1 || Math.abs(s - 1) >= 0.15 - 1e-9); },
    random: function (rng, prev) { return draw(spacing.gen, spacing.valid, prev, rng); },
    at: function (p, n) { return Math.pow(n, 1 / (p.a + p.b)); },
    solve: function (p) {
      var s = r6(p.a + p.b), L1 = 1, L2 = spacing.at(p, 2), L3 = spacing.at(p, 3);
      return { s: s, L1: L1, L2: L2, L3: L3, gap1: L2 - L1, gap2: L3 - L2, rts: s > 1 ? 'IRS' : s < 1 ? 'DRS' : 'CRS' };
    },
    domain: function (p) { return spacing.at(p, 3) >= 2.6 ? { X: 10, Y: 10, xs: 2, ys: 2 } : { X: 5, Y: 5, xs: 1, ys: 1 }; },
    start: function (p) { var X = spacing.domain(p).X; return { L2: 0.55 * X, L3: 0.7 * X }; },   // Q = 3 actually starts just beyond your Q = 2 (figs.js)
    score: function (p, g) {
      var s = spacing.solve(p);
      var s2 = g.L2 > 0 ? lin(Math.log(g.L2 / s.L2), 0.02, 0.35) : 0, s3 = g.L3 > 0 ? lin(Math.log(g.L3 / s.L3), 0.02, 0.35) : 0;
      return { total: Math.round(100 * (s2 + s3) / 2), parts: [s2, s3] };
    }
  };

  /* ---------- 5.6 Input substitution vs technological change ---------- */
  // Q = A K^0.5 L^0.5 = 4: K = 16 / (A^2 L). Start (4, 4) with A = 1.
  var tech = {
    Q: 4, L0: 4, K0: 4,
    defaults: function () { return { L1: 2, A: 1.4 }; },
    gen: function (rng) { return { L1: pick(rng, [2, 2.5, 3, 5, 6, 8]), A: pick(rng, [1.2, 1.25, 1.4, 1.5, 1.6, 2]) }; },
    valid: function (p) { var s = tech.solve(p); return s.K1 <= 8.5 && s.K2 >= 0.4 && s.K1 - s.K2 >= 0.6; },
    random: function (rng, prev) { return draw(tech.gen, tech.valid, prev, rng); },
    K: function (A, L) { return 16 / (A * A * L); },
    solve: function (p) { return { K1: tech.K(1, p.L1), K2: tech.K(p.A, p.L1), Kwrong: tech.K(1, p.L1) / p.A }; },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    part: function (g, ans) { return g != null ? lin((g - ans) / ans, 0.03, 0.5) : 0; },
    score: function (p, g) {
      var s = tech.solve(p), s1 = tech.part(g.K1, s.K1), s2 = tech.part(g.K2, s.K2);
      return { total: Math.round(100 * (0.4 * s1 + 0.6 * s2)), parts: [s1, s2] };
    }
  };

  /* ---------- 5.7 Consumer-production analogy: the cheapest bundle on an isoquant ---------- */
  // Q = (L K)^0.5 = q, isocost wL + rK = C. Tangency MRTS = K/L = w/r: L* = q sqrt(r/w), K* = q sqrt(w/r)
  var PRICES = [[10, 10], [20, 5], [5, 20], [18, 8], [8, 18], [12, 3], [3, 12], [9, 4], [4, 9], [16, 4], [4, 16], [27, 3], [3, 27]];
  var analogy = {
    PRICES: PRICES,
    defaults: function () { return { q: 3, w: 10, r: 10 }; },
    gen: function (rng) { var pr = pick(rng, PRICES); return { q: pick(rng, [2, 3, 4, 5, 6]), w: pr[0], r: pr[1] }; },
    valid: function (p) { var s = analogy.solve(p); return s.L >= 0.8 && s.K >= 0.8 && s.L <= 8.5 && s.K <= 8.5 && s.C / p.w <= 30 && s.C / p.r <= 30; },
    random: function (rng, prev) { return draw(analogy.gen, analogy.valid, prev, rng); },
    cost: function (p, L, K) { return p.w * L + p.r * K; },
    solve: function (p) {
      var L = p.q * Math.sqrt(p.r / p.w), K = p.q * Math.sqrt(p.w / p.r);
      return { L: L, K: K, C: p.w * L + p.r * K, ratio: p.w / p.r };
    },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    score: function (p, g) { var s = analogy.solve(p); return { total: g.pt ? Math.round(100 * lin(Math.log(g.pt.x / s.L), 0.03, 0.7)) : 0 }; }
  };

  /* ---------- 5.8 Cobb-Douglas lab: the isoquant's slope at a point ---------- */
  // Q = A K^a L^b: MPL = bQ/L, MPK = aQ/K, MRTS = MPL/MPK = (b/a)(K/L). A does not change it.
  var lab = {
    defaults: function () { return { A: 1, a: 0.5, b: 0.5, L: 4, K: 4 }; },
    gen: function (rng) { return { A: pick(rng, [1, 1.5, 2]), a: pick(rng, range(0.2, 0.8, 0.1)), b: pick(rng, range(0.2, 0.8, 0.1)), L: pick(rng, [2, 3, 4, 5, 6]), K: pick(rng, [2, 3, 4, 5, 6]) }; },
    valid: function (p) { var m = lab.solve(p).mrts; return m >= 0.15 && m <= 6 && Math.abs(Math.log(m)) >= Math.log(1.25) && Math.abs(Math.log(p.b / p.a)) >= Math.log(1.3); },
    random: function (rng, prev) { return draw(lab.gen, lab.valid, prev, rng); },
    Q: function (p, L, K) { return cd(p.A, p.a, p.b, L, K); },
    solve: function (p) {
      var Q = lab.Q(p, p.L, p.K), MPL = p.b * Q / p.L, MPK = p.a * Q / p.K, s = r6(p.a + p.b);
      // the line starts flat (slope 0.2) unless the answer is flat, then steep (slope 4)
      return { Q: Q, MPL: MPL, MPK: MPK, mrts: MPL / MPK, s: s, rts: s > 1 ? 'IRS' : s < 1 ? 'DRS' : 'CRS', start: MPL / MPK < 1 - 1e-9 ? 4 : 0.2 };
    },
    // K on the isoquant through (p.L, p.K) at labor L
    Kiso: function (p, L, Q) { return cdK(p.A, p.a, p.b, Q == null ? lab.Q(p, p.L, p.K) : Q, L); },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    score: function (p, g) { var s = lab.solve(p); return { total: g.m > 0 ? Math.round(100 * lin(Math.log(g.m / s.mrts), 0.06, 0.9)) : 0 }; }
  };

  /* ---------- 5.9 Bakery: buy a machine, the TP curve shifts ---------- */
  // TP = K^0.5 L^0.5 with K ovens; the page's "MPL of last worker" is TP(L) - TP(L - 1)
  var bakery = {
    defaults: function () { return { K0: 2, K1: 3 }; },
    gen: function (rng) { var K0 = pick(rng, [1, 2, 3, 4, 5]), d = pick(rng, [1, 1, 2, -1, -2]); return { K0: K0, K1: K0 + d }; },
    // the shift must be big enough to see: K changes by a factor of 1.3 or more
    valid: function (p) { return p.K1 >= 1 && p.K1 <= 7 && Math.abs(Math.log(p.K1 / p.K0)) >= Math.log(1.3); },
    random: function (rng, prev) { return draw(bakery.gen, bakery.valid, prev, rng); },
    TP: function (K, L) { return K > 0 && L > 0 ? Math.sqrt(K * L) : 0; },
    MPL: function (K, L) { return L >= 1 ? bakery.TP(K, L) - bakery.TP(K, L - 1) : 0; },
    solve: function (p) { return { at4: bakery.TP(p.K1, 4), at9: bakery.TP(p.K1, 9), old4: bakery.TP(p.K0, 4), old9: bakery.TP(p.K0, 9), up: p.K1 > p.K0 }; },
    domain: function (p) { var y = niceAxis(Math.max(8, bakery.TP(Math.max(p.K0, p.K1), 12) * 1.12)); return { X: 12, Y: y.D, xs: 2, ys: y.s }; },
    BINS: 48,
    truth: function (p, K) { var out = []; for (var i = 0; i <= 160; i++) { var L = 12 * i / 160; out.push([L, bakery.TP(K == null ? p.K1 : K, L)]); } return out; },
    // g.drawn: [{x, y} | null] (the kit's drawn('curve'))
    score: function (p, g) { var D = bakery.domain(p), r = curveScore(g.drawn, bakery.truth(p), D.X, D.Y); return { total: Math.round(100 * r.s), err: r.err, cover: r.cover }; }
  };

  /* ---------- 5.10 Isoquant shape identifier ---------- */
  // the page's ten functions. kind: cd (Q = A L^b K^a), linear (Q = cL L + cK K), leontief (Q = min(cL L, cK K))
  var FUNS = [
    { fn: 'Q = L^0.5 K^0.5', kind: 'cd', A: 1, b: 0.5, a: 0.5 },
    { fn: 'Q = L + 2K', kind: 'linear', cL: 1, cK: 2 },
    { fn: 'Q = min(L, K)', kind: 'leontief', cL: 1, cK: 1 },
    { fn: 'Q = L^0.3 K^0.7', kind: 'cd', A: 1, b: 0.3, a: 0.7 },
    { fn: 'Q = 3L + K', kind: 'linear', cL: 3, cK: 1 },
    { fn: 'Q = min(2L, K)', kind: 'leontief', cL: 2, cK: 1 },
    { fn: 'Q = L^0.6 K^0.6', kind: 'cd', A: 1, b: 0.6, a: 0.6 },
    { fn: 'Q = 0.5L + 1.5K', kind: 'linear', cL: 0.5, cK: 1.5 },
    { fn: 'Q = min(L, 2K)', kind: 'leontief', cL: 1, cK: 2 },
    { fn: 'Q = 2L^0.4 K^0.4', kind: 'cd', A: 2, b: 0.4, a: 0.4 }
  ];
  var PTS = [[4, 4], [3, 3], [5, 5], [3, 5], [5, 3], [4, 6], [6, 4], [3, 4], [4, 3]];
  var shapes = {
    FUNS: FUNS, PTS: PTS,
    defaults: function () { return { i: 0, L: 4, K: 4 }; },
    gen: function (rng) { var pt = pick(rng, PTS); return { i: Math.floor(rng() * FUNS.length), L: pt[0], K: pt[1] }; },
    valid: function (p) { return shapes.truth(p).filter(Boolean).length > 40; },
    random: function (rng, prev) { return draw(shapes.gen, function (p) { return shapes.valid(p) && (!prev || p.i !== prev.i); }, prev, rng); },
    Q: function (F, L, K) {
      if (F.kind === 'cd') return F.A * Math.pow(L, F.b) * Math.pow(K, F.a);
      if (F.kind === 'linear') return F.cL * L + F.cK * K;
      return Math.min(F.cL * L, F.cK * K);
    },
    solve: function (p) {
      var F = FUNS[p.i], q = shapes.Q(F, p.L, p.K), out = { F: F, q: q };
      if (F.kind === 'leontief') { out.cL = q / F.cL; out.cK = q / F.cK; }
      if (F.kind === 'linear') { out.kI = q / F.cK; out.lI = q / F.cL; out.mrts = F.cL / F.cK; }
      if (F.kind === 'cd') out.mrts = (F.b / F.a) * (p.K / p.L);
      return out;
    },
    // in-frame samples of the true isoquant through (L, K), as [[L, K] | null]
    truth: function (p) {
      var s = shapes.solve(p), F = s.F, X = 10, Y = 10, out = [], i, n = 120;
      if (F.kind === 'leontief') {
        for (i = 0; i <= n / 2; i++) { var k = s.cK + (Y - s.cK) * (1 - i / (n / 2)); out.push([s.cL, k]); }
        for (i = 1; i <= n / 2; i++) out.push([s.cL + (X - s.cL) * i / (n / 2), s.cK]);
        return out.filter(function (q) { return q[0] <= X && q[1] <= Y; });
      }
      for (i = 0; i <= n; i++) {
        var L = 0.02 + (X - 0.02) * i / n, K = F.kind === 'cd' ? Math.pow(s.q / (F.A * Math.pow(L, F.b)), 1 / F.a) : (s.q - F.cL * L) / F.cK;
        out.push(K >= 0 && K <= Y ? [L, K] : null);
      }
      // a vertical-ish CD segment near the K axis needs samples by K too
      // steep stretches need samples by K too
      out.push(null);
      for (i = 0; i <= n; i++) { var K2 = 0.02 + (Y - 0.02) * i / n, L2 = F.kind === 'cd' ? Math.pow(s.q / (F.A * Math.pow(K2, F.a)), 1 / F.b) : (s.q - F.cK * K2) / F.cL; out.push(L2 >= 0 && L2 <= X ? [L2, K2] : null); }
      return out;
    },
    domain: function () { return { X: 10, Y: 10, xs: 2, ys: 2 }; },
    score: function (p, g) { var r = curveScore(g.drawn, shapes.truth(p), 10, 10, { coverRad: 0.05 }); return { total: Math.round(100 * r.s), err: r.err, cover: r.cover }; }
  };

  var W5 = { product: product, iso: iso, mrts: mrts, dimret: dimret, spacing: spacing, tech: tech, analogy: analogy, lab: lab, bakery: bakery, shapes: shapes,
    util: { curveScore: curveScore, lin: lin, niceAxis: niceAxis, isMult: isMult, pick: pick, range: range, cd: cd, cdK: cdK } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W5;
  else root.W5 = W5;
})(this);
