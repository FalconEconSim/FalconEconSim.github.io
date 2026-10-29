/* Verifies every Week 7 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week7/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: profit maximized by brute-force grid search over q (including q = 0, so the
 * shutdown rule is tested, not assumed); marginal cost by numerical derivative of TC; min SAVC and
 * min SAC by grid search; market equilibria by evaluating supply = demand directly; the long-run
 * firm count from Q / q*; directions in the three-panel chain by comparing levels; perfect guesses
 * score 100 and the classic mistakes score low; defaults equal week7-viz.html. Float tolerance 1e-6
 * unless noted (grid searches use their grid step). */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 7777;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(14) + n + ' draws'); }
// the cost model written out again here, not taken from models.js
const TC = (p, q) => q * q * q / 3 - 2 * q * q + p.c * q + p.F;
const MCnum = (p, q) => (TC(p, q + 1e-5) - TC(p, q - 1e-5)) / 2e-5;
const AVC = (p, q) => (TC(p, q) - p.F) / q, AC = (p, q) => TC(p, q) / q;
function argmax(fn, a, b, n) { let best = a, bv = -Infinity; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, v = fn(x); if (v > bv) { bv = v; best = x; } } return { x: best, v: bv }; }
function argmin(fn, a, b, n) { const r = argmax(x => -fn(x), a, b, n); return { x: r.x, v: -r.v }; }
// best output by grid search: compare producing (best q > 0) with shutting down (q = 0, profit -F)
function bestQ(p, P) { const r = argmax(q => P * q - TC(p, q), 0.01, 12, 24000); return r.v > -p.F ? r : { x: 0, v: -p.F }; }
function fitsTicks(D) { return D.X / D.xs <= 9 + 1e-9 && D.Y / D.ys <= 9 + 1e-9; }

/* the firm, shared */
(function () {
  const F = W.firm;
  for (let i = 0; i < 2000; i++) {
    const p = { c: 5 + 4 * rng(), F: 2 + 8 * rng() }, q = 0.2 + 7 * rng();
    ok(close(F.smc(p, q), MCnum(p, q), 1e-5), 'firm', 'SMC = dTC/dq', p);
    ok(close(F.savc(p, q), AVC(p, q), 1e-9) && close(F.sac(p, q), AC(p, q), 1e-9), 'firm', 'SAVC, SAC', p);
    const mv = argmin(x => AVC(p, x), 0.2, 9, 20000), be = F.be(p), ma = argmin(x => AC(p, x), 0.2, 12, 40000);
    ok(close(mv.v, F.psd(p), 1e-6) && close(mv.x, 3, 1e-3), 'firm', 'min SAVC = c - 3 at q = 3', p);
    ok(close(ma.v, be.P, 1e-6) && close(ma.x, be.q, 1e-3), 'firm', 'min SAC by grid', p);
    ok(close(F.smc(p, be.q), be.P, 1e-6), 'firm', 'SMC = SAC at min SAC', p);
    const P = 1 + 14 * rng(), r = bestQ(p, P);
    ok(close(F.supply(p, P), r.x, 1e-3), 'firm', 'supply = brute-force profit max (with shutdown)', [p, P]);
  }
  const d = { c: 7, F: 5 }, be = F.be(d);
  ok(F.psd(d) === 4 && close(be.P, 5.5088, 1e-4) && close(be.q, 3.584, 1e-3), 'firm', 'site numbers: $4 and $5.51 at 3.58', be);
  report('firm', 2000);
})();

/* 7.1 TR vs TC */
(function () {
  const M = W.landscape, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.q, 2 + Math.sqrt(7)) && close(s0.TR, 46.4575, 1e-4) && close(s0.TC, 27.7773, 1e-4) && close(s0.pi, 18.6802, 1e-4), '7.1', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), r = bestQ(p, p.P);
    ok(close(s.q, r.x, 1e-3) && close(s.pi, r.v, 1e-4), '7.1', 'q* and profit = grid search', p);
    ok(close(MCnum(p, s.q), p.P, 1e-4), '7.1', 'slopes parallel at q*: MC = P', p);
    ok(!s.shut && s.pi > -p.F, '7.1', 'random rounds produce (beat shutdown)', p);
    const rg = M.pRange(p), qm = W.firm.supply(p, rg.hi);
    ok(s.q <= 0.8 * D.X && rg.hi * qm <= D.Y && TC(p, qm) + 10 <= D.Y && fitsTicks(D), '7.1', 'frame holds q*, TR and TC through the explore range', [p, D]);
    ok(M.score(p, { q: s.q }).total === 100 && M.score(p, { q: Math.round(s.q * 20) / 20 }).total === 100, '7.1', 'perfect / snapped scores 100', p);
    ok(M.score(p, { q: M.start(D) }).total < 30, '7.1', 'untouched start scores low', p);
    // the minimum-of-MC mistake (q = 2) and the break-even output score below 70
    ok(M.score(p, { q: 2 }).total < 70, '7.1', 'q at min MC scores low', p);
  }
  report('7.1 TR vs TC', N);
})();

/* 7.2 profit rectangle */
(function () {
  const M = W.rect, d = M.defaults(), s0 = M.solve(d);
  ok(s0.q === 4 && close(s0.sac, 5.58333, 1e-5) && close(s0.savc, 4.33333, 1e-5) && close(s0.pi, 5.66667, 1e-5), '7.2', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), r = bestQ(p, p.P);
    ok(close(s.q, r.x, 1e-3) && close(s.pi, r.v, 1e-4), '7.2', 'q* and profit = grid search', p);
    ok(close(s.q * (p.P - s.sac), p.P * s.q - TC(p, s.q), 1e-9), '7.2', 'rectangle area = TR - TC', p);
    ok(s.pi > -p.F && !s.shut, '7.2', 'firm produces in random rounds', p);
    ok(Math.max(p.P, s.sac) <= D.Y - 2 && s.q <= 0.8 * D.X && fitsTicks(D), '7.2', 'rectangle inside the frame', [p, D]);
    ok(M.score(p, { x: s.q, y: s.sac }).total === 100 && M.score(p, { x: Math.round(s.q * 20) / 20, y: Math.round(s.sac * 20) / 20 }).total === 100, '7.2', 'perfect / snapped scores 100', p);
    ok(M.score(p, { x: s.q, y: s.savc }).total < 70, '7.2', 'SAVC-bottom mistake scores below 70', p);
    ok(M.score(p, M.start).total < 25, '7.2', 'untouched start scores low', p);
  }
  report('7.2 rectangle', N);
})();

/* 7.3 shutdown and break-even */
(function () {
  const M = W.zones, d = M.defaults(), s0 = M.solve(d);
  ok(s0.psd === 4 && close(s0.be.P, 5.5088, 1e-4), '7.3', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // at a price just below min SAVC the best choice is q = 0; just above, producing beats shutting down
    ok(bestQ(p, s.psd - 0.02).x === 0 && bestQ(p, s.psd + 0.02).x > 2.5, '7.3', 'shutdown price by grid', p);
    ok(bestQ(p, s.be.P - 0.02).v < 0 && bestQ(p, s.be.P + 0.02).v > 0, '7.3', 'break-even price by grid', p);
    ok(M.zone(p, s.psd - 0.1) === 'shut' && M.zone(p, (s.psd + s.be.P) / 2) === 'loss' && M.zone(p, s.be.P + 0.1) === 'profit', '7.3', 'zones', p);
    ok(s.be.P <= D.Y - 3 && fitsTicks(D), '7.3', 'frame', [p, D]);
    ok(M.score(p, { sd: s.psd, be: s.be.P }).total === 100, '7.3', 'perfect scores 100', p);
    ok(M.score(p, { sd: s.be.P, be: s.psd }).total < 60, '7.3', 'swapped answers score low', p);
    const st = M.start(D); ok(M.score(p, st).total < 20, '7.3', 'untouched start scores low', p);
  }
  report('7.3 zones', N);
})();

/* 7.5 firm supply */
(function () {
  const M = W.supply, d = M.defaults(), s0 = M.solve(d);
  ok(s0.psd === 4 && s0.qsd === 3 && close(s0.qt, 2 + Math.sqrt(5)), '7.5', 'defaults', s0);
  let below = 0;
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), r = bestQ(p, p.Pt);
    ok(close(s.qt, r.x, 1e-3), '7.5', 'quantity at the test price = grid search', p);
    if (s.below) { below++; ok(s.qt === 0, '7.5', 'below shutdown supplies 0', p); }
    ok(s.qt <= 0.95 * D.X && p.Pt < D.Y, '7.5', 'answer in frame', [p, D]);
    ok(M.score(p, { sx: 3, sy: s.psd, qt: s.qt }).total === 100, '7.5', 'perfect scores 100', p);
    ok(M.score(p, { sx: 2, sy: p.c - 4, qt: s.qt }).total <= 50, '7.5', 'starting at min SMC loses the first half', p);
    ok(M.score(p, { sx: s.qsd, sy: s.psd, qt: W.firm.be(p).q }).total < 100 || Math.abs(W.firm.be(p).q - s.qt) < 0.1, '7.5', 'break-even q is not the answer', p);
    ok(M.score(p, M.start).total < 40, '7.5', 'untouched start scores low', p);
  }
  ok(below > N * 0.15 && below < N * 0.35, '7.5', 'about a quarter of rounds ask below the shutdown price', below);
  report('7.5 supply', N);
})();

/* 7.7 three panels */
(function () {
  const M = W.chain, b = M.base(), expect = { sub: [1, 1, 1], sub_fall: [-1, -1, -1], income: [1, 1, 1], income_fall: [-1, -1, -1], input: [1, 1, -1], input_fall: [-1, -1, 1] };
  ok(close(b.P0, 5.5088, 1e-4) && close(b.Q0, 358.39, 1e-2) && close(M.d(0, b.P0), 1.792, 1e-3), '7.7', 'starting equilibrium', b);
  ok(close(M.S(7, b.P0), M.D(0, b.P0), 1e-6), '7.7', 'start clears the market', b);
  let n = 0;
  M.SCK.forEach(sc => M.mag(sc).forEach(m => {
    const p = { sc, m }, s = M.solve(p); n++;
    ok(JSON.stringify(s.dirs) === JSON.stringify(expect[sc]), '7.7', 'directions match the textbook table', [p, s.dirs]);
    ok(close(M.S(s.c1, s.P1), M.D(s.sh, s.P1), 1e-6), '7.7', 'new price clears the market', p);
    ok(s.P1 > s.c1 - 3 + 0.2, '7.7', 'new price above the new shutdown price', p);
    ok(close(s.Q1, M.D(s.sh, s.P1), 1e-6) && close(s.x1 * M.N, s.Q1, 1e-6), '7.7', 'market Q = 100 firms = 200 consumers', p);
    const pp = { c: s.c1, F: M.F }, r = bestQ(pp, s.P1);
    ok(close(s.q1, r.x, 1e-3) && close(s.pi1, r.v, 1e-4), '7.7', 'firm output and profit by grid', p);
    ok(['sub', 'income', 'input_fall'].includes(sc) ? s.pi1 > 0 : s.pi1 < 0, '7.7', 'profit sign (demand up / cost down: profit)', p);
    ok(s.P1 < M.R.P - 1 && s.Q1 < M.R.Q && s.q1 < M.R.q && s.x1 < M.R.x, '7.7', 'everything inside its panel', p);
    ok(M.score(p, { cause: s.dirs[0], dp: s.dirs[1], dq: s.dirs[2] }).total === 100 && M.score(p, { cause: -s.dirs[0], dp: -s.dirs[1], dq: -s.dirs[2] }).total === 0, '7.7', 'scoring', p);
  }));
  for (let i = 0; i < N; i++) { const p = M.random(rng, { sc: 'sub' }); ok(p.sc !== 'sub' && M.mag(p.sc).includes(p.m), '7.7', 'new draws change the story', p); }
  report('7.7 chain', n + ' scenarios x sizes, ' + N);
})();

/* 7.8 market supply */
(function () {
  const M = W.market, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qsd === 30 && close(s0.Qt, 10 * (2 + Math.sqrt(5))), '7.8', 'defaults (Q 30 at $4, 42.4 at $8)', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), pf = { c: 7, F: 5 };
    // sum n separate firms' best outputs, each found by grid search
    const qOne = bestQ(pf, p.Pt).x;
    ok(close(s.Qt, p.n * qOne, p.n * 1e-3), '7.8', 'market Q = n x one firm by grid', p);
    ok(bestQ(pf, 3.98).x === 0 && close(bestQ(pf, 4.02).x * p.n, s.Qsd, p.n * 0.15), '7.8', 'market starts at $4 with 3n', p);
    ok(p.n * M.q(D.Y) <= D.X && D.X / D.xs <= 7 + 1e-9, '7.8', 'market curve in frame', [p, D]);
    ok(M.nMax(p) * M.q(13.5) <= D.X, '7.8', 'explore n range stays in frame', p);
    ok(M.score(p, { sx: s.Qsd, sy: 4, qt: s.Qt }).total === 100, '7.8', 'perfect scores 100', p);
    ok(M.score(p, { sx: 3, sy: 4, qt: s.qt }).total < 60 || p.n <= 2, '7.8', 'one firm\'s numbers score low', p);
  }
  report('7.8 market', N);
})();

/* 7.9 long run */
(function () {
  const M = W.longrun, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.P1, 6.40, 0.005) && close(s0.pi1, 3.31, 0.005) && close(s0.QLR, 1065, 0.5) && Math.round(s0.nLR) === 297 && close(s0.Q0, 537.6, 0.1), '7.9', 'defaults (site: $6.40, $3.31, 1,065, 297)', s0);
  ok(close(M.at(d, 450, d.A1).P, 4.73, 0.005) && close(M.at(d, 450, d.A1).pi, -2.69, 0.005), '7.9', 'site exit start: 450 firms, $4.73, loss $2.69', M.at(d, 450, d.A1));
  for (let i = 0; i < 5000; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), F = W.firm;
    ok(close(p.n0 * F.supply(p, s.P1), p.A1 - p.B * s.P1, 1e-4), '7.9', 'short-run price clears the market', p);
    ok(close(p.n0 * s.qstar, p.A0 - p.B * s.Pstar, 0.05 * p.n0 / 10 + 0.1), '7.9', 'start is a long-run equilibrium with D', p);
    ok(close(bestQ(p, s.P1).v, s.pi1, 1e-3) && (s.rise ? s.pi1 > 0 : s.pi1 < 0), '7.9', 'short-run profit sign and size by grid', p);
    // with nLR firms each at min SAC, the market clears at P* and profit is zero
    ok(close(s.nLR * s.qstar, p.A1 - p.B * s.Pstar, 1e-6) && close(M.at(p, s.nLR, p.A1).P, s.Pstar, 1e-6) && close(M.at(p, s.nLR, p.A1).pi, 0, 1e-6), '7.9', 'long run: zero profit at min SAC', p);
    ok(Math.max(s.QLR, s.Q1, s.Q0) <= D.QX && Math.max(s.nLR, p.n0) * F.supply(p, D.Ph) <= D.QX && Math.max(s.P1, s.Pstar) <= D.PY - 1 && D.QX / D.Qs <= 7 + 1e-9, '7.9', 'frame', [p, D]);
    ok(M.score(p, { P: s.Pstar, n: s.nLR }).total === 100 && M.score(p, { P: Math.round(s.Pstar * 100) / 100, n: Math.round(s.nLR) }).total === 100, '7.9', 'perfect / rounded scores 100', p);
    ok(M.score(p, { P: s.P1, n: p.n0 }).total < 40, '7.9', 'untouched start scores low', p);
  }
  report('7.9 long run', 5000);
})();

console.log(fails ? fails + ' FAILURES' : 'all checks pass');
process.exit(fails ? 1 : 0);
