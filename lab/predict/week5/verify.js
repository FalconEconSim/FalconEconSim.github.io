/* Verifies every Week 5 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week5/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: marginal products by numerical derivatives of the production function, peaks
 * by brute-force grid search, isoquant slopes by implicit differentiation done numerically, the
 * cheapest bundle by searching the isoquant, every answer bundle put back into Q(L, K), frame fit,
 * perfect guesses score 100, answers reachable on the handles' grids, untouched starting guesses
 * and the classic mistakes score low, defaults equal week5-viz.html. Float tolerance 1e-6. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 5151;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol) * Math.max(1, Math.abs(b));
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(12) + n + ' draws'); }
function ticksOk(D) { return D.X / D.xs <= 7 + 1e-9 && D.Y / D.ys <= 7 + 1e-9 && Math.abs(D.X / D.xs - Math.round(D.X / D.xs)) < 1e-9 && Math.abs(D.Y / D.ys - Math.round(D.Y / D.ys)) < 1e-9; }
const d1 = (fn, x) => { const h = 1e-5 * Math.max(1, Math.abs(x)); return (fn(x + h) - fn(x - h)) / (2 * h); };
function argmax(fn, a, b, n) { let bx = a, bv = -Infinity; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, v = fn(x); if (v > bv) { bv = v; bx = x; } } return bx; }
const cdQ = (A, a, b, L, K) => A * Math.pow(K, a) * Math.pow(L, b);
// MRTS from the production function alone: (dQ/dL) / (dQ/dK)
const mrtsNum = (Q, L, K) => d1(l => Q(l, K), L) / d1(k => Q(L, k), K);
const many = (M, i) => (i ? M.random(rng) : M.defaults());

/* 5.1 TP and MPL */
(function () {
  const M = W.product, d = M.defaults(), s0 = M.solve(d);
  ok(d.a === 1.5 && d.b === 0.1 && close(s0.Li, 5) && close(s0.Lz, 10) && close(s0.MPmax, 7.5) && close(s0.TPmax, 50) && close(s0.La, 7.5) && close(s0.APmax, 5.625), '5.1', 'defaults = page and film (MPL peak 7.5 at 5, TP max 50 at 10, AP max 5.625 at 7.5)', s0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p), TP = L => p.a * L * L - p.b * L * L * L;
    ok(close(d1(TP, 3.3), M.MPL(p, 3.3), 1e-5), '5.1', 'MPL = numerical slope of TP', p);
    const MPL = L => d1(TP, L);
    ok(Math.abs(argmax(MPL, 0, D.X, 6000) - s.Li) < D.X / 1500, '5.1', 'MPL peak by grid search', p);
    ok(Math.abs(argmax(TP, 0, D.X, 6000) - s.Lz) < D.X / 1500 && Math.abs(MPL(s.Lz)) < 1e-4 * s.MPmax, '5.1', 'TP peak where MPL = 0', p);
    ok(Math.abs(argmax(L => TP(L) / L, 0.01, D.X, 6000) - s.La) < D.X / 1000 && close(MPL(s.La), TP(s.La) / s.La, 1e-5), '5.1', 'AP peak where MPL = AP', p);
    ok(close(TP(s.Lz), s.TPmax) && close(MPL(s.Li), s.MPmax, 1e-5), '5.1', 'values', p);
    ok(ticksOk(D) && s.Lz <= 0.9 * D.X && s.TPmax <= 0.95 * D.Y && s.MPmax <= 0.95 * D.mY && M.MPL(p, D.X) >= D.mlo - 1e-9 && TP(D.X) >= 0, '5.1', 'frame fits', D);
    ok(Math.abs(D.mlo) < 3 * D.mY, '5.1', 'MPL panel not dominated by the negative part', D);
    ok(M.score(p, { L1: s.Li, L2: s.Lz }).total === 100, '5.1', 'perfect scores 100', p);
    ok(M.score(p, { L1: Math.round(s.Li * 10) / 10, L2: Math.round(s.Lz * 10) / 10 }).total === 100, '5.1', 'answers reachable on the 0.1 grid', p);
    const st = M.start(p);
    ok(M.score(p, { L1: st.L1, L2: st.L2 }).total < 40, '5.1', 'untouched starts score low', p);
    ok(M.score(p, { L1: s.Lz, L2: s.Li }).total < 40, '5.1', 'swapped answers score low', p);
    ok(Number.isInteger(Math.round(p.a * 100)) && Math.abs(p.a * 100 - Math.round(p.a * 100)) < 1e-9, '5.1', 'a has two decimals', p);
  }
  report('5.1 TP/MPL', N);
})();

/* 5.2 isoquants */
(function () {
  const M = W.iso, d = M.defaults();
  ok(d.type === 'cd' && d.q === 4 && d.L === 4 && d.K === 4, '5.2', 'defaults = page (Q = 4 isoquant, P at (4, 4))', d);
  const Qf = { cd: (L, K) => Math.sqrt(L) * Math.sqrt(K), linear: (L, K) => 2 * L + K, leontief: (L, K) => Math.min(L, K / 2) };
  const types = {};
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), Q = (L, K) => Qf[p.type](L, K); types[p.type] = (types[p.type] || 0) + 1;
    ok(close(Q(p.L, p.K), p.q), '5.2', 'A makes q', p);
    ok(p.L > 0 && p.K > 0 && p.L <= 9 && p.K <= 9, '5.2', 'A inside the frame', p);
    ok(s.ex.length === 2 && s.ex.every(b => close(Q(b[0], b[1]), p.q) && b[0] <= 10 && b[1] <= 10 && (Math.abs(b[0] - p.L) > 0.01 || Math.abs(b[1] - p.K) > 0.01)), '5.2', 'examples in the verdict make q and differ from A', p);
    // the isoquant the page draws: every sampled point makes q
    for (let L = 0.25; L <= 10; L += 0.25) { const K = M.Kat(p.type, p.q, L); if (K != null && K <= 10) ok(close(Q(L, K), p.q, 1e-9), '5.2', 'drawn isoquant makes q', [p, L, K]); }
    const g = { b1: { x: s.ex[0][0], y: s.ex[0][1] }, b2: { x: s.ex[1][0], y: s.ex[1][1] } };
    ok(M.score(p, g).total === 100, '5.2', 'two true bundles score 100', p);
    const gr = { b1: { x: Math.round(g.b1.x * 10) / 10, y: Math.round(g.b1.y * 10) / 10 }, b2: { x: Math.round(g.b2.x * 10) / 10, y: Math.round(g.b2.y * 10) / 10 } };
    ok(M.score(p, gr).total >= 90, '5.2', 'true bundles on the 0.1 grid score 90+', [p, gr]);
    // doubling A is a classic wrong answer: it makes more output (CRS), so it must score low
    const dbl = { x: Math.min(10, 2 * p.L), y: Math.min(10, 2 * p.K) };
    ok(M.score(p, { b1: dbl, b2: dbl }).total < 50, '5.2', 'a bundle with more of both inputs scores low', p);
  }
  ok(Object.keys(types).length === 3, '5.2', 'all three technologies drawn', types);
  report('5.2 isoquant', N);
})();

/* 5.3 MRTS */
(function () {
  const M = W.mrts, d = M.defaults(), s0 = M.solve(d);
  ok(d.q === 4 && close(s0.L, 2) && close(s0.K, 8) && s0.L0 === 4, '5.3', 'defaults: Q = 4, start L = 4, MRTS 4 at (2, 8)', s0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p), Q = (L, K) => cdQ(1, 0.5, 0.5, L, K);
    ok(close(Q(s.L, s.K), p.q), '5.3', 'answer on the isoquant', p);
    ok(close(mrtsNum(Q, s.L, s.K), p.m, 1e-5), '5.3', 'MRTS = MPL/MPK numerically', p);
    ok(close(-d1(L => p.q * p.q / L, s.L), p.m, 1e-5), '5.3', 'isoquant slope = -MRTS', p);
    ok(s.L <= 0.85 * D.X && s.K <= 0.85 * D.Y && s.L >= 1 && s.K >= 1 && ticksOk(D), '5.3', 'answer inside the frame', p);
    ok(Math.abs(p.m - 1) > 0.1, '5.3', 'answer is not the start (MRTS 1)', p);
    ok(M.score(p, { L: s.L }).total === 100 && M.score(p, { L: Math.round(s.L * 20) / 20 }).total === 100, '5.3', 'perfect and 0.05-grid answers score 100', p);
    ok(M.score(p, { L: s.L0 }).total < 40, '5.3', 'untouched start scores low', p);
    ok(M.score(p, { L: p.q * p.q / s.L }).total < 40, '5.3', 'mirror point (MRTS 1/m) scores low', p);
  }
  report('5.3 MRTS', N);
})();

/* 5.4 diminishing MPL vs RTS */
(function () {
  const M = W.dimret, d = M.defaults(), s0 = M.solve(d);
  ok(d.a === 0.6 && d.b === 0.6 && close(s0.Q1, 5.278031643, 1e-8) && close(s0.Qb, 12.12573253, 1e-8) && close(s0.Ql, 8, 1e-9), '5.4', 'defaults: a = b = 0.6, Q 5.28 -> 12.13 (both) and 8.00 (only L)', s0);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p), Q = (L, K) => cdQ(1, p.a, p.b, L, K);
    seen[s.rts] = 1;
    ok(close(Q(4, 4), s.Q1) && close(Q(8, 8), s.Qb) && close(Q(8, 4), s.Ql), '5.4', 'outputs from Q(L, K)', p);
    ok(close(s.rb, Math.pow(2, p.a + p.b)) && close(s.rl, Math.pow(2, p.b)), '5.4', 'multipliers', p);
    ok(s.rl < 2, '5.4', 'doubling only L less than doubles (b < 1)', p);
    ok((s.rts === 'IRS') === (s.Qb > 2 * s.Q1 + 1e-9) && (s.rts === 'DRS') === (s.Qb < 2 * s.Q1 - 1e-9), '5.4', 'RTS label matches the doubling test', p);
    ok(Math.max(s.Qb, 2 * s.Q1) <= 0.85 * D.Y && ticksOk(D), '5.4', 'answers inside the frame', D);
    ok(M.score(p, { qb: s.Qb, ql: s.Ql }).total === 100, '5.4', 'perfect scores 100', p);
    ok(M.score(p, { qb: Math.round(s.Qb * 100) / 100, ql: Math.round(s.Ql * 100) / 100 }).total === 100, '5.4', 'answers on the 0.01 grid score 100', p);
    ok(M.score(p, { qb: s.Q1, ql: s.Q1 }).total < 40, '5.4', 'untouched starts score low', p);
    ok(M.score(p, { qb: 2 * s.Q1, ql: 2 * s.Q1 }).total < 70, '5.4', '"both double" guess scores under 70', p);
    if (s.rts !== 'CRS') ok(M.score(p, { qb: 2 * s.Q1, ql: s.Ql }).total < 90, '5.4', 'ignoring returns to scale costs points', p);
  }
  ok(seen.IRS && seen.CRS && seen.DRS, '5.4', 'IRS, CRS and DRS all drawn', seen);
  report('5.4 MPL/RTS', N);
})();

/* 5.5 spacing */
(function () {
  const M = W.spacing, d = M.defaults(), s0 = M.solve(d);
  ok(d.a === 0.5 && d.b === 0.5 && close(s0.L2, 2) && close(s0.L3, 3) && s0.rts === 'CRS', '5.5', 'defaults: Q = 1, 2, 3 at L = 1, 2, 3', s0);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p), Q = (L, K) => cdQ(1, p.a, p.b, L, K);
    seen[s.rts] = 1;
    ok(close(Q(1, 1), 1) && close(Q(s.L2, s.L2), 2) && close(Q(s.L3, s.L3), 3), '5.5', 'Q on the ray = 1, 2, 3', p);
    if (s.rts === 'CRS') ok(close(s.gap1, s.gap2), '5.5', 'CRS equal gaps', p);
    if (s.rts === 'IRS') ok(s.gap2 < s.gap1 - 1e-9, '5.5', 'IRS gaps shrink', p);
    if (s.rts === 'DRS') ok(s.gap2 > s.gap1 + 1e-9, '5.5', 'DRS gaps grow', p);
    ok(s.L3 <= 0.9 * D.X && s.L2 > 1.05 && ticksOk(D), '5.5', 'answers fit and differ from Q = 1', [p, D]);
    ok(M.score(p, { L2: s.L2, L3: s.L3 }).total === 100, '5.5', 'perfect scores 100', p);
    ok(M.score(p, { L2: Math.round(s.L2 * 20) / 20, L3: Math.round(s.L3 * 20) / 20 }).total === 100, '5.5', 'answers on the 0.05 grid score 100', p);
    const st = M.start(p);
    ok(M.score(p, { L2: st.L2, L3: st.L3 }).total < 40, '5.5', 'untouched starts score low', p);
    if (s.rts !== 'CRS') ok(M.score(p, { L2: 2, L3: 3 }).total < 90, '5.5', 'assuming CRS spacing costs points', p);
  }
  ok(seen.IRS && seen.CRS && seen.DRS, '5.5', 'IRS, CRS and DRS all drawn', seen);
  report('5.5 spacing', N);
})();

/* 5.6 substitution vs technology */
(function () {
  const M = W.tech, d = M.defaults(), s0 = M.solve(d);
  ok(d.L1 === 2 && d.A === 1.4 && close(s0.K1, 8) && close(s0.K2, 16 / (1.96 * 2)), '5.6', 'defaults: (4, 4) -> (2, 8), then A 1.4 -> K 4.08', s0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p);
    ok(close(cdQ(1, 0.5, 0.5, 4, 4), 4) && close(cdQ(1, 0.5, 0.5, p.L1, s.K1), 4) && close(cdQ(p.A, 0.5, 0.5, p.L1, s.K2), 4), '5.6', 'every bundle makes Q = 4', p);
    ok(s.K1 <= 0.85 * D.Y && s.K2 >= 0.04 * D.Y && p.L1 <= 0.85 * D.X && p.L1 !== 4, '5.6', 'inside the frame', p);
    ok(M.score(p, { K1: s.K1, K2: s.K2 }).total === 100 && M.score(p, { K1: Math.round(s.K1 * 100) / 100, K2: Math.round(s.K2 * 100) / 100 }).total === 100, '5.6', 'perfect and 0.01-grid answers score 100', p);
    ok(M.score(p, { K1: s.K1, K2: s.Kwrong }).total < 90, '5.6', 'the 1/A mistake costs points', p);
    ok(M.score(p, { K1: s.K1, K2: s.K1 }).total < 60, '5.6', 'ignoring the technology scores under 60', p);
  }
  report('5.6 tech', N);
})();

/* 5.7 cheapest bundle */
(function () {
  const M = W.analogy, d = M.defaults(), s0 = M.solve(d);
  ok(d.q === 3 && d.w === d.r && close(s0.L, 3) && close(s0.K, 3), '5.7', 'defaults: level 3, equal prices, optimum (3, 3)', s0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), D = M.domain(p), cost = (L) => p.w * L + p.r * p.q * p.q / L;
    ok(close(Math.sqrt(s.L * s.K), p.q), '5.7', 'optimum on the isoquant', p);
    const Lg = argmax(L => -cost(L), 0.05, 40, 40000);
    ok(Math.abs(Lg - s.L) < 0.002 * Math.max(1, s.L) && close(cost(s.L), s.C), '5.7', 'cheapest point by grid search', p);
    ok(close(mrtsNum((L, K) => Math.sqrt(L * K), s.L, s.K), p.w / p.r, 1e-5), '5.7', 'MRTS = w/r at the optimum', p);
    ok(s.L <= 0.85 * D.X && s.K <= 0.85 * D.Y, '5.7', 'optimum inside the frame', p);
    ok(M.score(p, { pt: { x: s.L, y: s.K } }).total === 100 && M.score(p, { pt: { x: Math.round(s.L * 100) / 100 } }).total === 100, '5.7', 'perfect and 0.01-grid answers score 100', p);
    ok(M.score(p, { pt: { x: p.q } }).total < 70 || p.w === p.r, '5.7', 'the symmetric point scores under 70 when prices differ', p);
  }
  report('5.7 analogy', N);
})();

/* 5.8 Cobb-Douglas lab */
(function () {
  const M = W.lab, d = M.defaults(), s0 = M.solve(d);
  ok(d.A === 1 && d.a === 0.5 && d.b === 0.5 && d.L === 4 && d.K === 4 && close(s0.Q, 4) && close(s0.MPL, 0.5) && close(s0.MPK, 0.5) && close(s0.mrts, 1), '5.8', 'defaults = page (Q 4, MPL = MPK = 0.5, MRTS 1)', s0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), s = M.solve(p), Q = (L, K) => cdQ(p.A, p.a, p.b, L, K);
    ok(close(d1(L => Q(L, p.K), p.L), s.MPL, 1e-5) && close(d1(K => Q(p.L, K), p.K), s.MPK, 1e-5), '5.8', 'MPL and MPK numerically', p);
    ok(close(-d1(L => M.Kiso(p, L), p.L), s.mrts, 1e-5), '5.8', 'isoquant slope at P = -MRTS', p);
    ok(close(M.Kiso(p, p.L), p.K, 1e-9), '5.8', 'isoquant passes through P', p);
    ok(close(M.solve(Object.assign({}, p, { A: p.A * 3 })).mrts, s.mrts, 1e-9), '5.8', 'A does not change MRTS', p);
    ok(M.score(p, { m: s.mrts }).total === 100, '5.8', 'perfect scores 100', p);
    ok(M.score(p, { m: s.start }).total < 40, '5.8', 'untouched start scores low', p);
    ok(M.score(p, { m: p.K / p.L }).total < 90 || (p.a === p.b && i === 0), '5.8', 'ignoring the exponents (MRTS = K/L) costs points', p);
  }
  report('5.8 lab', N);
})();

/* 5.9 bakery */
(function () {
  const M = W.bakery, d = M.defaults(), s0 = M.solve(d);
  ok(d.K0 === 2 && d.K1 === 3 && close(s0.at4, Math.sqrt(12)) && close(s0.old4, Math.sqrt(8)), '5.9', 'defaults: K = 2 ovens, buy one', s0);
  ok(close(M.MPL(2, 1), Math.SQRT2) && close(M.MPL(2, 2), 2 - Math.SQRT2), '5.9', 'page MPL of last worker (1.414, then 0.586)', 0);
  for (let i = 0; i < N; i++) {
    const p = many(M, i), D = M.domain(p), bins = n => { const out = []; for (let j = 0; j <= 48; j++) { const L = 12 * j / 48; out.push({ x: L, y: n(L) }); } return out; };
    ok(D.X === 12 && M.TP(Math.max(p.K0, p.K1), 12) <= 0.95 * D.Y && ticksOk(D), '5.9', 'curves fit the frame', [p, D]);
    for (let L = 1; L <= 12; L++) ok(M.MPL(p.K1, L) > 0 && (L === 1 || M.MPL(p.K1, L) < M.MPL(p.K1, L - 1)), '5.9', 'MPL positive and diminishing', [p, L]);
    ok((p.K1 > p.K0) === (M.MPL(p.K1, 5) > M.MPL(p.K0, 5)), '5.9', 'more capital raises MPL', p);
    ok(M.score(p, { drawn: bins(L => M.TP(p.K1, L)) }).total >= 97, '5.9', 'drawing the true curve scores 97+', p);
    ok(M.score(p, { drawn: bins(L => M.TP(p.K0, L)) }).total < 60, '5.9', 'redrawing the old curve scores under 60', p);
  }
  report('5.9 bakery', N);
})();

/* 5.10 shapes */
(function () {
  const M = W.shapes, d = M.defaults();
  ok(d.i === 0 && M.FUNS.length === 10 && M.FUNS[0].fn === 'Q = L^0.5 K^0.5', '5.10', 'defaults: the page\'s first function, ten in all', d);
  // the three keyboard sketches through P (same as figs.js)
  function sketches(L0, K0, p) {
    const a = [], b = [], c = [];
    for (let i = 0; i <= 40; i++) { const x = 2 * L0 * i / 40; a.push({ x, y: K0 * (2 - x / L0) }); }
    for (let i = 0; i <= 60; i++) { const L = L0 * K0 / 10 + (10 - L0 * K0 / 10) * i / 60; b.push({ x: L, y: L0 * K0 / L }); }
    for (let i = 0; i <= 20; i++) c.push({ x: L0, y: 10 - (10 - K0) * i / 20 }); for (let i = 1; i <= 20; i++) c.push({ x: L0 + (10 - L0) * i / 20, y: K0 });
    const out = { linear: a.filter(q => q.x <= 10 && q.y <= 10 && q.y >= 0), cd: b, leontief: c };
    // the right family's sketch is the true isoquant (the page's three-way quiz, by keyboard)
    out[M.solve(p).F.kind] = M.truth(p).filter(Boolean).map(t => ({ x: t[0], y: t[1] }));
    return out;
  }
  const best = {};
  for (let i = 0; i < Math.min(N, 3000); i++) {
    const p = many(M, i), s = M.solve(p), F = s.F, tr = M.truth(p);
    ok(close(M.Q(F, p.L, p.K), s.q), '5.10', 'q from P', p);
    tr.filter(Boolean).forEach(t => ok(Math.abs(M.Q(F, t[0], t[1]) - s.q) < 1e-6 * Math.max(1, s.q), '5.10', 'every sample of the drawn isoquant makes q', [p, t]));
    ok(M.score(p, { drawn: tr.filter(Boolean).map(t => ({ x: t[0], y: t[1] })) }).total >= 97, '5.10', 'tracing the true isoquant scores 97+', p);
    const sk = sketches(p.L, p.K, p), wrong = Object.keys(sk).filter(k => k !== F.kind);
    wrong.forEach(k => { const sc = M.score(p, { drawn: sk[k] }).total; ok(sc < 70, '5.10', 'a wrong-shape sketch through P scores under 70', [p.i, p.L, p.K, k, sc]); });
    const right = M.score(p, { drawn: sk[F.kind] }).total; best[F.fn] = Math.min(best[F.fn] == null ? 100 : best[F.fn], right);
  }
  // keyboard users pick one of three sketches: the right family must beat both wrong ones
  ok(Object.keys(best).length === 10, '5.10', 'all ten functions drawn', best);
  report('5.10 shapes', Math.min(N, 3000));
  console.log('         5.10 keyboard sketch of the right family, worst score per function:', JSON.stringify(best));
})();

console.log(fails ? '\n' + fails + ' FAILURES' : '\nall checks passed');
process.exit(fails ? 1 : 0);
