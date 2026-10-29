/* Verifies every Week 6 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week6/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: cost minimization by brute-force search along the isoquant (and over the
 * whole input grid for the three forms of 6.2), MRTS = w/v at the answer, minimum ATC / AC by grid
 * search and MC = AC there, MC as a numerical derivative of TC, the LRAC envelope as a brute-force
 * minimum over plants, handover points, frame fit, perfect guesses score 100, untouched starting
 * guesses score low, defaults equal week6-viz.html. Float tolerance 1e-6 unless noted. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 6262;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
const rel = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol) * Math.max(1, Math.abs(b));
let before = 0;
function report(name, n) { console.log((fails > before ? 'FAILED  ' : 'ok      ') + name.padEnd(14) + n + ' draws'); before = fails; }
function ticksOk(D, s) { const n = D / s; return Math.abs(n - Math.round(n)) < 1e-9 && n <= 10 + 1e-9; }
// golden-section minimum of a unimodal f on [a, b]
function gmin(f, a, b) { const g = (Math.sqrt(5) - 1) / 2; let c = b - g * (b - a), d = a + g * (b - a); for (let i = 0; i < 200; i++) { if (f(c) < f(d)) b = d; else a = c; c = b - g * (b - a); d = a + g * (b - a); } return (a + b) / 2; }
// coarse grid then golden section: robust brute-force minimum on [a, b]
function bmin(f, a, b, n) { n = n || 4000; let bi = 0, bv = Infinity; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, v = f(x); if (v < bv) { bv = v; bi = i; } } const h = (b - a) / n; return gmin(f, Math.max(a, a + (bi - 1) * h), Math.min(b, a + (bi + 1) * h)); }

/* 6.1 cost minimization */
(function () {
  const M = W.costmin, d = M.defaults(), s0 = M.solve(d);
  ok(s0.L === 3 && s0.K === 3 && s0.TC === 24, '6.1', 'defaults L* = K* = 3, TC $24', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const cost = L => p.w * L + p.v * p.q * p.q / L;
    const Lb = bmin(cost, 0.01, 60);
    ok(rel(Lb, s.L, 1e-5) && rel(cost(Lb), s.TC, 1e-9), '6.1', 'brute-force cheapest bundle on the isoquant', p);
    ok(close(Math.sqrt(s.L * s.K), p.q, 1e-9), '6.1', 'answer makes q', p);
    ok(close(s.K / s.L, p.w / p.v, 1e-9), '6.1', 'MRTS = K/L = w/v at the answer', p);
    ok(Math.max(s.L, s.K) <= 0.8 * D.X && Math.min(s.L, s.K) >= 0.5 && ticksOk(D.X, D.xs) && D.X / D.xs <= 8, '6.1', 'answer inside the frame', D);
    ok(M.score(p, { L: s.L }).total === 100, '6.1', 'perfect scores 100', p);
    ok(M.score(p, { L: Math.round(s.L / 0.05) * 0.05 }).total === 100, '6.1', 'answer reachable on the 0.05 grid', p);
    ok(M.score(p, { L: s.start }).total < 40, '6.1', 'untouched start scores low', p);
    ok(s.start * 1 > 0 && M.K(p, s.start) <= 0.95 * D.Y && s.start <= 0.95 * D.X, '6.1', 'start inside the frame', p);
    const wr = M.wRange(p, D.X), vr = M.vRange(p, D.X);
    ok(wr[0] <= p.w && p.w <= wr[1] && vr[0] <= p.v && p.v <= vr[1], '6.1', 'explore ranges include the round', p);
    for (const w of [wr[0], wr[1]]) { const o = W.util.cdOpt(w, p.v, p.q); ok(Math.max(o.L, o.K) <= 0.93 * D.X, '6.1', 'explore w keeps the bundle in frame', p); }
    for (const v of [vr[0], vr[1]]) { const o = W.util.cdOpt(p.w, v, p.q); ok(Math.max(o.L, o.K) <= 0.93 * D.X, '6.1', 'explore v keeps the bundle in frame', p); }
    if (i && p.w === p.v) ok(false, '6.1', 'random rounds are not symmetric', p);
  }
  report('6.1 costmin', N);
})();

/* 6.2 isoquants to total cost */
(function () {
  const M = W.deriv, d = M.defaults(), s0 = M.solve(d);
  ok(s0.L === 3 && s0.K === 3 && s0.TC === 24 && s0.c === 8, '6.2', 'defaults: cd, w = v = 4, q 3 -> (3, 3), TC $24, TC = 8q', s0);
  // the page's three forms at w = v = 4: TC = 8q, 4q, 8q
  ok(M.slope({ form: 'subs', w: 4, v: 4 }) === 4 && M.slope({ form: 'comp', w: 4, v: 4 }) === 8, '6.2', 'page TC slopes', {});
  const n = Math.max(2000, N / 4);
  for (let i = 0; i < n; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // brute force over a fine input grid: cheapest bundle making at least q0
    let best = Infinity;
    const top = 3 * p.q0, st = top / 600;
    for (let a = 0; a <= 600; a++) {
      const L = a * st;
      // smallest K that reaches q0 given L (each form is monotone in K)
      let K;
      if (p.form === 'cd') K = L > 0 ? p.q0 * p.q0 / L : Infinity;
      else if (p.form === 'subs') K = Math.max(0, p.q0 - L);
      else K = L >= p.q0 - 1e-12 ? p.q0 : Infinity;
      if (!isFinite(K)) continue;
      best = Math.min(best, p.w * L + p.v * K);
    }
    if (p.form === 'cd') best = Math.min(best, p.w * bmin(L => p.w * L + p.v * p.q0 * p.q0 / L, 0.01, top) + p.v * p.q0 * p.q0 / bmin(L => p.w * L + p.v * p.q0 * p.q0 / L, 0.01, top));
    ok(rel(best, s.TC, 1e-4), '6.2', 'brute-force cheapest cost of q0', { p: p, best: best, TC: s.TC });
    ok(close(M.Q(p, s.L, s.K), p.q0, 1e-9) && close(p.w * s.L + p.v * s.K, s.TC, 1e-9), '6.2', 'answer makes q0 at cost TC', p);
    // TC is linear through the origin with slope c (constant returns, no fixed cost)
    M.QS.forEach(q => { const b = M.bundle(p, q); ok(close(b.TC, s.c * q, 1e-9) && close(M.Q(p, b.L, b.K), q, 1e-9), '6.2', 'TC(q) = c q along the expansion path', p);
      ok(Math.max(b.L, b.K) <= D.X + 1e-9, '6.2', 'every bundle up to q = 5 in the top frame', p); });
    ok(s.TC5 <= 0.9 * D.P && ticksOk(D.P, D.ps) && ticksOk(D.X, D.xs), '6.2', 'TC(5) inside the bottom frame', D);
    ok(Math.max(s.L, s.K) <= 0.85 * D.X, '6.2', 'answer bundle inside the frame', p);
    ok(M.score(p, { b: { x: s.L, y: s.K }, tc: s.TC }).total === 100, '6.2', 'perfect scores 100', p);
    ok(M.score(p, { b: { x: Math.round(s.L * 10) / 10, y: Math.round(s.K * 10) / 10 }, tc: Math.round(s.TC * 2) / 2 }).total === 100, '6.2', 'answers reachable on the input grid', p);
    if (p.form === 'cd') ok(close(s.K / s.L, p.w / p.v, 1e-9), '6.2', 'cd: MRTS = w/v', p);
    if (p.form === 'subs') ok((p.w < p.v ? s.K === 0 : p.v < p.w ? s.L === 0 : true), '6.2', 'subs: only the cheaper input', p);
    if (i) ok(!(p.form === 'subs' && p.w === p.v), '6.2', 'no knife edge in random rounds', p);
  }
  // tie: substitutes at w = v, every bundle on the isoquant is cheapest
  const tp = { form: 'subs', w: 4, v: 4, q0: 3 };
  ok(M.dist(tp, 1, 2) < 1e-9 && M.dist(tp, 3, 0) < 1e-9 && M.score(tp, { b: { x: 2, y: 1 }, tc: 12 }).total === 100, '6.2', 'substitutes tie: whole isoquant scores', tp);
  report('6.2 deriv', n);
})();

/* 6.5 short-run cost curves */
(function () {
  const M = W.srcost, d = M.defaults(), s0 = M.solve(d);
  ok(s0.q0 === 10 && s0.a0 === 20 && s0.q1 === 12 && s0.a1 === 24, '6.5', 'defaults: TFC $100 -> $144, min ATC $20 at 10 -> $24 at 12', s0);
  const D = M.domain();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p);
    [[p.F0, s.q0, s.a0], [p.F1, s.q1, s.a1]].forEach(c => {
      const qb = bmin(q => M.ATC(c[0], q), 0.1, 40);
      ok(rel(qb, c[1], 1e-5) && rel(M.ATC(c[0], qb), c[2], 1e-9), '6.5', 'brute-force min ATC', p);
      const h = 1e-5, mc = (M.TC(c[0], c[1] + h) - M.TC(c[0], c[1] - h)) / (2 * h);
      ok(rel(mc, c[2], 1e-6) && close(M.SMC(c[1]), c[2], 1e-9), '6.5', 'SMC = dTC/dq crosses ATC at its minimum', p);
      ok(close(M.ATC(c[0], c[1]), M.AVC(c[1]) + M.AFC(c[0], c[1]), 1e-9), '6.5', 'ATC = AVC + AFC', p);
      ok(c[1] <= 0.9 * D.X && c[2] <= 0.8 * D.Y, '6.5', 'min ATC inside the frame', p);
    });
    ok(M.score(p, { pt: { x: s.q1, y: s.a1 } }).total === 100, '6.5', 'perfect scores 100', p);
    ok(M.score(p, { pt: { x: Math.round(s.q1 * 10) / 10, y: Math.round(s.a1 * 2) / 2 } }).total === 100, '6.5', 'answer reachable on the grid', p);
    ok(M.score(p, { pt: { x: s.q0, y: s.a0 } }).total < 40, '6.5', 'staying at the old minimum scores low', p);
    ok(M.score(p, { pt: { x: s.q1, y: s.a0 } }).total < 80, '6.5', 'right q, old height loses points', p);
  }
  report('6.5 srcost', N);
})();

/* 6.6 LRAC envelope */
(function () {
  const M = W.env, d = M.defaults(), s0 = M.solve(d), D0 = M.domain(d);
  ok(rel(s0.acmin, 9.797958971, 1e-9) && rel(M.qmin(d, 1), 1.224744871, 1e-9) && rel(M.qmin(d, 4), 4.898979486, 1e-9), '6.6', 'defaults: min $9.80 at q = 1.22 K', s0);
  ok(D0.X === 10 && D0.Y === 20, '6.6', 'default frame 10 x 20 (as the film)', D0);
  const n = Math.max(2000, N / 4);
  for (let i = 0; i < n; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    for (let K = 1; K <= p.n; K++) {
      const qb = bmin(q => M.sr(p, K, q), 0.01, 50);
      ok(rel(qb, M.qmin(p, K), 1e-5) && rel(M.sr(p, K, qb), s.acmin, 1e-9), '6.6', 'each SRAC bottoms out at 2 sqrt(wv)', p);
      ok(rel(M.at(p, M.qmin(p, K)), s.acmin, 1e-9), '6.6', 'envelope touches each SRAC at its minimum', p);
    }
    s.swaps.forEach((q, j) => { const K = j + 1; ok(rel(M.sr(p, K, q), M.sr(p, K + 1, q), 1e-9) && M.best(p, q * 0.999) === K && M.best(p, q * 1.001) === K + 1, '6.6', 'handover points', p); });
    for (let k = 0; k <= 200; k++) {
      const q = 0.05 + (D.X - 0.05) * k / 200; let m = Infinity; for (let K = 1; K <= p.n; K++) m = Math.min(m, M.sr(p, K, q));
      ok(close(M.at(p, q), m, 1e-9) && M.at(p, q) >= s.acmin - 1e-9, '6.6', 'envelope = lowest SRAC, never below the floor', p);
    }
    ok(rel(M.sr(p, 1, s.qa), D.Y, 1e-9) && s.qa < M.qmin(p, 1), '6.6', 'the envelope enters the frame at qa', p);
    ok(s.atX <= 0.9 * D.Y && M.qmin(p, p.n) <= 0.7 * D.X && ticksOk(D.X, D.xs) && ticksOk(D.Y, D.ys), '6.6', 'envelope fits the frame', D);
    // drawings, one y per bin (48 bins), as the page stores them
    const bins = 48, perfect = [], flat = [];
    for (let b = 0; b <= bins; b++) { const x = b * D.X / bins; perfect.push(x >= s.qa ? { x: x, y: M.at(p, x) } : null); flat.push(x >= s.qa ? { x: x, y: s.acmin } : null); }
    ok(M.score(p, { drawn: perfect }, s).total === 100, '6.6', 'perfect drawing scores 100 (called as the kit calls it, with the solution as 3rd argument)', p);
    const fs = M.score(p, { drawn: flat }).total;
    ok(fs < 75, '6.6', 'a flat line at the floor misses the rising end', { p: p, fs: fs });
    ok(M.score(p, { drawn: perfect.map((q, j) => j < bins / 2 ? q : null) }).total < 100, '6.6', 'half a drawing loses points', p);
  }
  report('6.6 env', n);
})();

/* 6.8 minimum wage */
(function () {
  const M = W.minwage, d = M.defaults(), s0 = M.solve(d), D0 = M.domain(d);
  ok(s0.L0 === 4 && s0.K0 === 4 && s0.TC0 === 24 && s0.L1 === 2 && s0.K1 === 8 && s0.TC1 === 48 && s0.kl0 === 1 && s0.kl1 === 4 && s0.Kint1 === 16, '6.8', 'defaults: w $3 -> $12, (4, 4) -> (2, 8), TC $24 -> $48', s0);
  ok(D0.X === 18, '6.8', 'default frame 18 (as the page)', D0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    [[p.w0, s.L0, s.TC0], [p.w1, s.L1, s.TC1]].forEach(c => {
      const cost = L => c[0] * L + p.v * p.q * p.q / L, Lb = bmin(cost, 0.01, 80);
      ok(rel(Lb, c[1], 1e-5) && rel(cost(Lb), c[2], 1e-9), '6.8', 'brute-force cheapest bundle', p);
    });
    ok(close(s.K1 / s.L1, p.w1 / p.v, 1e-9) && close(Math.sqrt(s.L1 * s.K1), p.q, 1e-9), '6.8', 'new bundle: MRTS = w1/v on the isoquant', p);
    ok(s.L1 < s.L0 && s.K1 > s.K0 && s.kl1 > s.kl0 && s.TC1 > s.TC0, '6.8', 'wage rise: less labor, more capital, higher cost', p);
    ok(close(s.kl1 / s.kl0, p.w1 / p.w0, 1e-9), '6.8', 'K/L rises in proportion to the wage', p);
    ok(close(s.Kint1 * p.v, s.TC1, 1e-9) && close(p.w1 * s.L1 + p.v * s.K1, s.TC1, 1e-9), '6.8', 'new isocost through the bundle', p);
    ok(s.Kint1 <= 0.92 * D.Y && Math.max(s.L0, s.K0, s.L1, s.K1) <= 0.85 * D.X && ticksOk(D.X, D.xs), '6.8', 'fits the frame', D);
    ok(M.score(p, { L: s.L1, Ki: s.Kint1 }).total === 100, '6.8', 'perfect scores 100', p);
    ok(M.score(p, { L: Math.round(s.L1 / 0.05) * 0.05, Ki: Math.round(s.Kint1 * 4) / 4 }).total === 100, '6.8', 'answers reachable on the grid', p);
    ok(M.score(p, { L: s.L0, Ki: s.Kint0 }).total < 40, '6.8', 'untouched start (old bundle, old cost) scores low', p);
  }
  report('6.8 minwage', N);
})();

/* 6.10 efficient scale */
(function () {
  const M = W.scale, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.qs, 6) && close(s0.acmin, 12), '6.10', 'default classic U: q* = 6, min AC $12', s0);
  const want = { classic: [6, 12], flat: [8, 8], steep: [Math.sqrt(8), 2 * Math.sqrt(32)], fixed: [10, 20], tb: [5, 15] };
  Object.keys(want).forEach(k => { const s = M.solve(M.of(k)); ok(rel(s.qs, want[k][0], 1e-6) && rel(s.acmin, want[k][1], 1e-6), '6.10', 'preset ' + k, s); });
  // the page's preset formulas, term by term
  const page = {
    const: [q => 5, q => 5 * q, q => 5], lin: [q => 2 * q + 3, q => 2 * q * q + 3 * q, q => 4 * q + 3], classic: [q => q + 36 / q, q => q * q + 36, q => 2 * q],
    flat: [q => 0.5 * q + 32 / q, q => 0.5 * q * q + 32, q => q], steep: [q => 2 * q + 16 / q, q => 2 * q * q + 16, q => 4 * q], fixed: [q => q + 100 / q, q => q * q + 100, q => 2 * q],
    cubic: [q => q * q - 6 * q + 15 + 64 / q, q => q * q * q - 6 * q * q + 15 * q + 64, q => 3 * q * q - 12 * q + 15], econ: [q => 20 / q + 2, q => 20 + 2 * q, q => 2],
    dis: [q => 3 * q + 2, q => 3 * q * q + 2 * q, q => 6 * q + 2], tb: [q => q * q - 10 * q + 40, q => q * q * q - 10 * q * q + 40 * q, q => 3 * q * q - 20 * q + 40]
  };
  M.PRESETS.forEach(c => { const p = M.of(c.key), f = page[c.key]; [0.5, 1, 2.5, 4, 7, 11].forEach(q => ok(close(M.AC(p, q), f[0](q), 1e-9) && close(M.TC(p, q), f[1](q), 1e-9) && close(M.MC(p, q), f[2](q), 1e-9), '6.10', 'page formula ' + c.key, q)); });
  ok(M.solve(M.of('econ')).qs == null && M.solve(M.of('dis')).qs == null && M.solve(M.of('const')).qs == null && M.solve(M.of('lin')).qs == null, '6.10', 'no efficient scale for monotone AC', {});
  M.PRESETS.forEach(c => { const p = M.of(c.key), D = M.domain(p); ok(D.X > 0 && D.Y > 0 && ticksOk(D.X, D.xs) && ticksOk(D.Y, D.ys), '6.10', 'preset frame ' + c.key, D); });
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const qb = bmin(q => M.AC(p, q), 0.05, 3 * D.X);
    ok(rel(qb, s.qs, 1e-5) && rel(M.AC(p, qb), s.acmin, 1e-9), '6.10', 'brute-force min AC', p);
    const h = 1e-5, mcn = (M.TC(p, s.qs + h) - M.TC(p, s.qs - h)) / (2 * h);
    ok(rel(mcn, M.MC(p, s.qs), 1e-6) && rel(M.MC(p, s.qs), s.acmin, 1e-6), '6.10', 'MC = dTC/dq crosses AC at its minimum', p);
    ok(M.MC(p, s.qs * 0.8) < M.AC(p, s.qs * 0.8) && M.MC(p, s.qs * 1.2) > M.AC(p, s.qs * 1.2), '6.10', 'MC below AC before q*, above after', p);
    ok(s.acmin <= 0.6 * D.Y && s.qs <= 0.65 * D.X && ticksOk(D.X, D.xs) && ticksOk(D.Y, D.ys), '6.10', 'fits the frame', D);
    ok(M.score(p, { q: s.qs }).total === 100 && M.score(p, { q: Math.round(s.qs * 10) / 10 }).total === 100, '6.10', 'perfect scores 100', p);
    ok(M.score(p, { q: s.start }).total < 40 && M.AC(p, s.start) <= 0.95 * D.Y, '6.10', 'untouched start scores low and is in frame', p);
    for (let q = 0.1; q < D.X; q += D.X / 40) ok(M.MC(p, q) >= -1e-9 && M.TC(p, q) - M.TC(p, 0.0001) >= -1e-6, '6.10', 'MC never negative', p);
  }
  report('6.10 scale', N);
})();

console.log(fails ? fails + ' failures' : 'all checks pass');
process.exit(fails ? 1 : 0);
