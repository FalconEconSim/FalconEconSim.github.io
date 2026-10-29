/* Week 6 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 * Production is Cobb-Douglas Q = K^0.5 L^0.5 unless noted (textbook ch. 6), so cost minimization
 * (MRTS = K/L = w/v) gives L* = q sqrt(v/w), K* = q sqrt(w/v), TC = 2q sqrt(wv).
 *
 * Defaults match week6-viz.html:
 *   6.1  w = $4, v = $4, q = 3: L* = 3, K* = 3, TC* = $24 (axes 0 to 16)
 *   6.2  w = v = $4, Q = K^0.5 L^0.5 (the page also offers L + K and min(L, K)); TC = 8q.
 *        The question picks q = 3: L* = K* = 3, TC = $24.
 *   6.5  TC = TFC + q^2, SMC = 2q, AVC = q, ATC = q + TFC/q, TFC = $100: min ATC $20 at q = 10.
 *        The page's slider starts at $100 with no change, so the question moves TFC to $144
 *        (min ATC $24 at q = 12).
 *   6.6  SRAC(q, K) = 4q/K + 6K/q (w = 4, v = 6), 4 plant sizes K = 1..4 (the page's slider default).
 *        Every SRAC bottoms out at 2 sqrt(wv) = $9.80 at q = 1.22 K. LRAC = lower envelope.
 *   6.8  q = 4, base w = v = $3: L = K = 4, TC $24. The page's slider starts at the base, so the
 *        question raises the wage to $12 (the slider's top): L 2, K 8, TC $48, K/L 1 -> 4.
 *   6.10 The page's ten AC presets; default "Classic U-shape" AC = q + 36/q: q* = 6, min AC $12.
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function isSq(n) { var r = Math.round(Math.sqrt(n)); return r * r === n; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most `max` ticks on a 1-2-5 step
  function niceAxis(vmax, max) {
    var steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200]; max = max || 7;
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= max + 1e-9) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 500) * 500, s: 500 };
  }
  // Cobb-Douglas Q = K^0.5 L^0.5: the cheapest bundle for output q
  function cdOpt(w, v, q) { var L = q * Math.sqrt(v / w), K = q * Math.sqrt(w / v); return { L: L, K: K, TC: w * L + v * K }; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* ---------- 6.1 Cost minimization ---------- */
  var costmin = {
    defaults: function () { return { w: 4, v: 4, q: 3 }; },
    gen: function (rng) { return { w: 1 + Math.floor(rng() * 12), v: 1 + Math.floor(rng() * 12), q: pick(rng, [2, 3, 4, 5, 6]) }; },
    valid: function (p) {
      if (p.w === p.v || !isSq(p.w * p.v)) return false;
      var o = cdOpt(p.w, p.v, p.q), D = costmin.domain(p).X;
      return isMult(o.L, 0.25) && isMult(o.K, 0.25) && Math.min(o.L, o.K) >= 1 && D <= 24;
    },
    random: function (rng, prev) { return draw(costmin.gen, costmin.valid, prev, rng); },
    K: function (p, L) { return p.q * p.q / L; },   // the isoquant K = q^2 / L
    // where the guess starts: on the isoquant, well away from the answer, inside the frame
    start: function (p) {
      var o = cdOpt(p.w, p.v, p.q), D = costmin.domain(p).X, lo = p.q * p.q / (0.92 * D), hi = 0.92 * D;
      var L0 = o.L >= p.q ? o.L / 2.6 : o.L * 2.6;
      return Math.round(clamp(L0, lo, hi) * 10) / 10;
    },
    solve: function (p) { var o = cdOpt(p.w, p.v, p.q); return { L: o.L, K: o.K, TC: o.TC, ratio: p.w / p.v, start: costmin.start(p) }; },
    // the frame: about 2.9 times the bigger input, so the starting guess (2.6 times off) still fits
    domain: function (p) {
      var o = cdOpt(p.w, p.v, p.q), need = 2.9 * Math.max(o.L, o.K);
      var D = [8, 10, 12, 16, 20, 24, 30].filter(function (v) { return v >= need - 1e-9; })[0] || 30;
      var st = D <= 12 ? 2 : D <= 16 ? 2 : D <= 24 ? 4 : 5;
      return { X: D, Y: D, xs: st, ys: st };
    },
    // explore steppers keep the bundle inside the frame
    wRange: function (p, D) { var a = 0.92 * D / p.q; return [Math.max(1, Math.ceil(p.v / (a * a) - 1e-9)), Math.min(12, Math.floor(p.v * a * a + 1e-9))]; },
    vRange: function (p, D) { var a = 0.92 * D / p.q; return [Math.max(1, Math.ceil(p.w / (a * a) - 1e-9)), Math.min(12, Math.floor(p.w * a * a + 1e-9))]; },
    cost: function (p, L) { return p.w * L + p.v * costmin.K(p, L); },
    score: function (p, g) {
      var o = cdOpt(p.w, p.v, p.q); if (!(g.L > 0)) return { total: 0 };
      return { total: Math.round(100 * lin(Math.log(g.L / o.L), 0.04, 0.7)), extra: costmin.cost(p, g.L) / o.TC - 1 };
    }
  };

  /* ---------- 6.2 From isoquants to the total cost curve ---------- */
  var FORMS = ['cd', 'subs', 'comp'];
  var deriv = {
    FORMS: FORMS, QS: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    defaults: function () { return { form: 'cd', w: 4, v: 4, q0: 3 }; },
    gen: function (rng) { return { form: pick(rng, FORMS), w: pick(rng, [2, 3, 4, 5, 6, 8, 9]), v: pick(rng, [2, 3, 4, 5, 6, 8, 9]), q0: pick(rng, [2, 3, 4]) }; },
    valid: function (p) {
      var b = deriv.bundle(p, p.q0), d = deriv.domain(p);
      if (p.form === 'subs' && p.w === p.v) return false;   // the knife edge stays in Explore
      if (p.form === 'cd' && (!isSq(p.w * p.v) || !isMult(b.L, 0.25) || !isMult(b.K, 0.25))) return false;
      return d.X <= 10 && Math.max(b.L, b.K) <= 0.85 * d.X;
    },
    random: function (rng, prev) { return draw(deriv.gen, deriv.valid, prev, rng); },
    // output from a bundle
    Q: function (p, L, K) { return p.form === 'cd' ? Math.sqrt(Math.max(0, K * L)) : p.form === 'subs' ? L + K : Math.min(L, K); },
    // the cheapest bundle for output q; for substitutes at w = v every bundle on the isoquant ties (A..B)
    bundle: function (p, q) {
      if (p.form === 'cd') { var o = cdOpt(p.w, p.v, q); return { L: o.L, K: o.K, TC: o.TC, A: [o.L, o.K], B: [o.L, o.K] }; }
      if (p.form === 'comp') return { L: q, K: q, TC: (p.w + p.v) * q, A: [q, q], B: [q, q] };
      if (p.w < p.v) return { L: q, K: 0, TC: p.w * q, A: [q, 0], B: [q, 0] };
      if (p.v < p.w) return { L: 0, K: q, TC: p.v * q, A: [0, q], B: [0, q] };
      return { L: q / 2, K: q / 2, TC: p.w * q, A: [q, 0], B: [0, q], tie: true };
    },
    slope: function (p) { return p.form === 'cd' ? 2 * Math.sqrt(p.w * p.v) : p.form === 'subs' ? Math.min(p.w, p.v) : p.w + p.v; },
    solve: function (p) {
      var b = deriv.bundle(p, p.q0);
      return { L: b.L, K: b.K, TC: b.TC, A: b.A, B: b.B, tie: !!b.tie, c: deriv.slope(p), TC5: deriv.bundle(p, 5).TC };
    },
    // X: L, K (top panel) and q (bottom panel) share one scale; P: the TC axis of the bottom panel
    domain: function (p) {
      var b5 = deriv.bundle(p, 5), m = Math.max(5.6, 1.1 * Math.max(b5.L, b5.K));
      var X = m <= 6 ? 6 : m <= 8 ? 8 : m <= 10 ? 10 : 12, P = niceAxis(deriv.bundle(p, 5).TC * 1.12, 5);
      return { X: X, Y: 100, xs: X <= 6 ? 1 : 2, ys: 1000, Yt: X, yts: X <= 6 ? 1 : 2, P: P.D, ps: P.s };
    },
    // distance (in input units) from a bundle to the set of cheapest bundles (a point, or a segment at a tie)
    dist: function (p, L, K) {
      var s = deriv.solve(p), ax = s.A[0], ay = s.A[1], bx = s.B[0], by = s.B[1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 ? clamp(((L - ax) * dx + (K - ay) * dy) / l2, 0, 1) : 0;
      return Math.hypot(L - (ax + t * dx), K - (ay + t * dy));
    },
    score: function (p, g) {
      var s = deriv.solve(p), d = deriv.domain(p);
      var sb = g.b ? lin(deriv.dist(p, g.b.x, g.b.y) / d.X, 0.025, 0.25) : 0, st = g.tc != null ? lin((g.tc - s.TC) / s.TC, 0.03, 0.35) : 0;
      return { total: Math.round(100 * (0.5 * sb + 0.5 * st)), parts: [sb, st] };
    }
  };

  /* ---------- 6.5 Short-run cost curves ---------- */
  var SQ = [25, 36, 49, 64, 81, 100, 121, 144, 169, 196];
  var srcost = {
    defaults: function () { return { F0: 100, F1: 144 }; },
    gen: function (rng) { return { F0: pick(rng, SQ.slice(1, 9)), F1: pick(rng, SQ) }; },
    valid: function (p) { var d = Math.abs(Math.sqrt(p.F1) - Math.sqrt(p.F0)); return d >= 2 && d <= 6; },
    random: function (rng, prev) { return draw(srcost.gen, srcost.valid, prev, rng); },
    SMC: function (q) { return 2 * q; }, AVC: function (q) { return q; },
    ATC: function (F, q) { return q + F / q; }, AFC: function (F, q) { return F / q; }, TC: function (F, q) { return F + q * q; },
    // min ATC: d/dq (q + F/q) = 1 - F/q^2 = 0 -> q* = sqrt(F), ATC = 2 sqrt(F) = SMC(q*)
    solve: function (p) { var q0 = Math.sqrt(p.F0), q1 = Math.sqrt(p.F1); return { q0: q0, a0: 2 * q0, q1: q1, a1: 2 * q1, up: p.F1 > p.F0 }; },
    domain: function () { return { X: 16, Y: 40, xs: 2, ys: 5 }; },
    score: function (p, g) {
      var s = srcost.solve(p); if (!g.pt) return { total: 0 };
      var d = Math.hypot((g.pt.x - s.q1) / 16, (g.pt.y - s.a1) / 40);
      return { total: Math.round(100 * lin(d, 0.015, 0.2)), d: d };
    }
  };

  /* ---------- 6.6 The LRAC envelope (has a film) ---------- */
  var env = {
    defaults: function () { return { w: 4, v: 6, n: 4 }; },
    gen: function (rng) { return { w: pick(rng, [2, 3, 4, 5, 6]), v: pick(rng, [2, 3, 4, 5, 6, 8, 9]), n: pick(rng, [3, 4, 5, 6]) }; },
    valid: function (p) { var d = env.domain(p), r = Math.sqrt(p.v / p.w); return r >= 0.6 && r <= 1.8 && d.X <= 14 && env.at(p, d.X) <= 0.9 * d.Y && env.at(p, d.X) >= 1.24 * 2 * Math.sqrt(p.w * p.v); },
    random: function (rng, prev) { return draw(env.gen, env.valid, prev, rng); },
    sr: function (p, K, q) { return p.w * q / K + p.v * K / q; },          // SRAC with plant K: L = q^2/K
    best: function (p, q, n) { var b = 1, m = Infinity; n = n || p.n; for (var K = 1; K <= n; K++) { var a = env.sr(p, K, q); if (a < m - 1e-12) { m = a; b = K; } } return b; },
    at: function (p, q, n) { return env.sr(p, env.best(p, q, n), q); },     // the envelope
    qmin: function (p, K) { return K * Math.sqrt(p.v / p.w); },             // SRAC_K is lowest here
    // plant K hands over to K + 1 where SRAC_K = SRAC_K+1: q = sqrt(v K (K+1) / w)
    swap: function (p, K) { return Math.sqrt(p.v * K * (K + 1) / p.w); },
    solve: function (p) {
      var m = 2 * Math.sqrt(p.w * p.v), d = env.domain(p);
      var qa = (d.Y - Math.sqrt(d.Y * d.Y - 4 * p.w * p.v)) / (2 * p.w);   // SRAC_1 = Y on its left branch: where the envelope enters the frame
      var sw = []; for (var K = 1; K < p.n; K++) sw.push(env.swap(p, K));
      return { acmin: m, qa: qa, swaps: sw, qn: env.qmin(p, p.n), atX: env.at(p, d.X) };
    },
    domain: function (p) {
      var x = niceAxis(2 * env.qmin(p, p.n), 7), m = 2 * Math.sqrt(p.w * p.v);
      var y = niceAxis(Math.max(2 * m, 1.12 * env.sr(p, p.n, x.D)), 6);
      return { X: x.D, Y: y.D, xs: x.s, ys: y.s };
    },
    // g.drawn: [{x, y} | null] (one y per bin). Mean vertical miss over the envelope's range, as a share of the frame
    score: function (p, g) {
      var s = env.solve(p), d = env.domain(p), pts = (g.drawn || []), k = 0, tot = 0, sum = 0;
      pts.forEach(function (q) { if (!q || q.x < s.qa + 0.02 * d.X || q.x > d.X) return; k++; sum += Math.abs(q.y - env.at(p, q.x)) / d.Y; });
      pts.forEach(function (q, i) { if (q === undefined) return; var x = q ? q.x : i * d.X / (pts.length - 1); if (x >= s.qa + 0.02 * d.X && x <= d.X) tot++; });
      if (!k) return { total: 0, err: 1, cover: 0 };
      var err = sum / k, cover = tot ? k / tot : 0;
      return { total: Math.round(100 * lin(err, 0.01, 0.06) * Math.min(1, cover / 0.6)), err: err, cover: cover };
    }
  };

  /* ---------- 6.8 A minimum wage rise and automation ---------- */
  var minwage = {
    defaults: function () { return { w0: 3, w1: 12, v: 3, q: 4 }; },
    gen: function (rng) { var w0 = 1 + Math.floor(rng() * 8); return { w0: w0, w1: w0 + 1 + Math.floor(rng() * (16 - w0)), v: 1 + Math.floor(rng() * 8), q: pick(rng, [3, 4, 5, 6]) }; },
    valid: function (p) {
      if (p.w1 < 1.5 * p.w0 || !isSq(p.v * p.w0) || !isSq(p.v * p.w1)) return false;
      var s = minwage.solve(p), d = minwage.domain(p);
      return [s.L0, s.K0, s.L1, s.K1].every(function (v) { return isMult(v, 0.25) && v >= 0.75 && v <= 0.85 * d.X; }) && s.Kint1 <= 0.92 * d.Y && d.X <= 24 && s.kl1 <= 6 && s.kl0 >= 0.25;
    },
    random: function (rng, prev) { return draw(minwage.gen, minwage.valid, prev, rng); },
    K: function (p, L) { return p.q * p.q / L; },
    solve: function (p) {
      var a = cdOpt(p.w0, p.v, p.q), b = cdOpt(p.w1, p.v, p.q);
      return { L0: a.L, K0: a.K, TC0: a.TC, L1: b.L, K1: b.K, TC1: b.TC, kl0: a.K / a.L, kl1: b.K / b.L,
        Kint0: a.TC / p.v, Lint0: a.TC / p.w0, Kint1: b.TC / p.v, Lint1: b.TC / p.w1 };
    },
    domain: function (p) {
      var s = minwage.solve(p), need = 1.08 * Math.max(s.Kint1, s.L0, s.K0, s.L1, s.K1);
      var D = [12, 16, 18, 20, 24].filter(function (v) { return v >= need - 1e-9; })[0] || 24;
      return { X: D, Y: D, xs: D <= 18 ? 2 : 4, ys: D <= 18 ? 2 : 4 };
    },
    score: function (p, g) {
      var s = minwage.solve(p);
      var sb = g.L > 0 ? lin(Math.log(g.L / s.L1), 0.04, 0.6) : 0, sc = g.Ki != null ? lin((g.Ki - s.Kint1) / s.Kint1, 0.03, 0.35) : 0;
      return { total: Math.round(100 * (0.6 * sb + 0.4 * sc)), parts: [sb, sc] };
    }
  };

  /* ---------- 6.10 Efficient scale ---------- */
  // AC(q) = a2 q^2 + a1 q + a0 + F/q, so TC = a2 q^3 + a1 q^2 + a0 q + F and MC = 3 a2 q^2 + 2 a1 q + a0
  var PRESETS = [
    { key: 'const', name: 'Constant AC: AC = 5', short: 'Constant', a2: 0, a1: 0, a0: 5, F: 0 },
    { key: 'lin', name: 'Linear AC: AC = 2q + 3', short: 'Linear', a2: 0, a1: 2, a0: 3, F: 0 },
    { key: 'classic', name: 'Classic U-shape: AC = q + 36/q', short: 'Classic U', a2: 0, a1: 1, a0: 0, F: 36 },
    { key: 'flat', name: 'Flatter U-shape: AC = 0.5q + 32/q', short: 'Flatter U', a2: 0, a1: 0.5, a0: 0, F: 32 },
    { key: 'steep', name: 'Steep U-shape: AC = 2q + 16/q', short: 'Steep U', a2: 0, a1: 2, a0: 0, F: 16 },
    { key: 'fixed', name: 'Fixed cost heavy: AC = q + 100/q', short: 'Fixed cost heavy', a2: 0, a1: 1, a0: 0, F: 100 },
    { key: 'cubic', name: 'Cubic: AC = q^2 - 6q + 15 + 64/q', short: 'Cubic', a2: 1, a1: -6, a0: 15, F: 64 },
    { key: 'econ', name: 'Economies of scale: AC = 20/q + 2', short: 'Economies', a2: 0, a1: 0, a0: 2, F: 20 },
    { key: 'dis', name: 'Diseconomies: AC = 3q + 2', short: 'Diseconomies', a2: 0, a1: 3, a0: 2, F: 0 },
    { key: 'tb', name: 'Textbook standard: AC = q^2 - 10q + 40', short: 'Textbook', a2: 1, a1: -10, a0: 40, F: 0 }
  ];
  var WITH_MIN = ['classic', 'flat', 'steep', 'fixed', 'cubic', 'tb'];
  var scale = {
    PRESETS: PRESETS, WITH_MIN: WITH_MIN,
    preset: function (key) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].key === key) return PRESETS[i]; return null; },
    of: function (key) { var c = scale.preset(key); return { key: c.key, a2: c.a2, a1: c.a1, a0: c.a0, F: c.F }; },
    defaults: function () { return scale.of('classic'); },
    // half the rounds are page presets, half fresh U-shapes AC = a q + c + F/q with a whole-number q*
    gen: function (rng) {
      if (rng() < 0.5) return scale.of(pick(rng, WITH_MIN));
      var a = pick(rng, [0.5, 1, 1.5, 2, 3]), qs = 3 + Math.floor(rng() * 10);
      return { key: 'gen', a2: 0, a1: a, a0: pick(rng, [0, 0, 2, 4, 6]), F: a * qs * qs };
    },
    valid: function (p) { var s = scale.solve(p), d = scale.domain(p); return s.qs != null && s.qs >= 0.2 * d.X && s.qs <= 0.65 * d.X && d.X <= 30 && d.Y <= 200; },
    random: function (rng, prev) { return draw(scale.gen, scale.valid, prev, rng); },
    AC: function (p, q) { return p.a2 * q * q + p.a1 * q + p.a0 + p.F / q; },
    MC: function (p, q) { return 3 * p.a2 * q * q + 2 * p.a1 * q + p.a0; },
    TC: function (p, q) { return p.a2 * q * q * q + p.a1 * q * q + p.a0 * q + p.F; },
    dAC: function (p, q) { return 2 * p.a2 * q + p.a1 - p.F / (q * q); },
    // efficient scale: the q where AC stops falling (dAC/dq = 0); null when AC only falls, only rises, or is flat
    qstar: function (p) {
      if (p.a2 === 0 && p.a1 > 0 && p.F > 0) return Math.sqrt(p.F / p.a1);
      if (p.a2 > 0) {
        var lo = 1e-3, hi = 1e3;
        if (scale.dAC(p, lo) < 0 && scale.dAC(p, hi) > 0) { for (var i = 0; i < 200; i++) { var m = (lo + hi) / 2; if (scale.dAC(p, m) < 0) lo = m; else hi = m; } return (lo + hi) / 2; }
      }
      return null;
    },
    solve: function (p) {
      var qs = scale.qstar(p);
      var kind = qs != null ? 'U' : (p.a2 === 0 && p.a1 === 0 && p.F === 0) ? 'flat' : (p.a1 <= 0 && p.a2 === 0) ? 'falling' : 'rising';
      return { qs: qs, acmin: qs != null ? scale.AC(p, qs) : null, kind: kind, start: scale.start(p, qs) };
    },
    domain: function (p) {
      var qs = scale.qstar(p);
      var x = niceAxis(qs != null ? 1.9 * qs : 10, 7), top = 0;
      if (qs != null) top = 2.2 * scale.AC(p, qs);
      else for (var q = 0.15 * x.D; q <= x.D + 1e-9; q += x.D / 50) top = Math.max(top, Math.min(scale.AC(p, q), 60));
      if (p.a2 === 0 && p.a1 === 0 && p.F === 0) top = 2 * p.a0;
      var y = niceAxis(top * 1.05, 6);
      return { X: x.D, Y: y.D, xs: x.s, ys: y.s };
    },
    // where the guess starts on the AC curve: on the far side of q*, inside the frame
    start: function (p, qs) {
      if (qs == null) return null;
      var d = scale.domain(p), lo = 0.12 * d.X, hi = 0.92 * d.X;
      for (var t = 0; t < 40 && scale.AC(p, lo) > 0.94 * d.Y; t++) lo += 0.01 * d.X;
      var a = qs - lo > hi - qs ? lo : hi;
      for (var k = 0; k < 40 && scale.AC(p, a) > 0.94 * d.Y; k++) a += a < qs ? 0.01 * d.X : -0.01 * d.X;
      return Math.round(a * 10) / 10;
    },
    score: function (p, g) {
      var s = scale.solve(p), d = scale.domain(p); if (g.q == null || s.qs == null) return { total: 0 };
      return { total: Math.round(100 * lin((g.q - s.qs) / d.X, 0.02, 0.25)) };
    }
  };

  var W6 = { costmin: costmin, deriv: deriv, srcost: srcost, env: env, minwage: minwage, scale: scale,
    util: { cdOpt: cdOpt, lin: lin, niceAxis: niceAxis, isMult: isMult, isSq: isSq, pick: pick, range: range, r2: r2 } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W6;
  else root.W6 = W6;
})(this);
