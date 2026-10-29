/* Verifies every Week 9 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week9/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: two-part profit maximized by brute-force grid search over the usage charge
 * (fee = consumer surplus by numerical integration), the single-price monopoly by grid search;
 * natural-monopoly regimes by grid search (profit max) and by scanning for P = AC; Nash equilibria
 * by brute force over every cell and every unilateral deviation; block-pricing profit by summing
 * rectangles unit slice by slice and against 20 (n - 1) / n; frame fit; perfect guesses score 100;
 * untouched starting guesses score low; defaults equal week9-viz.html. Float tolerance 1e-6. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 9090;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(14) + n + ' draws'); }
function integ(fn, a, b, n) { n = n || 2000; let s = 0; const h = (b - a) / n; for (let i = 0; i < n; i++) s += fn(a + (i + 0.5) * h) * h; return s; }
function axisOk(D, xmax, ymax) { return xmax <= 0.98 * D.X && ymax <= 0.97 * D.Y && D.X / D.xs <= 7 + 1e-9 && D.Y / D.ys <= 7 + 1e-9; }

/* 9.1 two-part pricing */
(function () {
  const M = W.twopart, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qe === 20 && close(s0.F, 20) && s0.Qm === 10 && s0.Pm === 2 && close(s0.piM, 10) && close(s0.csM, 5) && close(s0.dwlM, 5), '9.1', 'defaults: F $20, monopoly Q 10 at $2, profit $10, CS $5, DWL $5', s0);
  const a15 = M.at(d, 1.5);
  ok(close(a15.Q, 15) && close(a15.F, 11.25) && close(a15.use, 7.5) && close(a15.total, 18.75) && close(a15.dwl, 1.25), '9.1', 'textbook check p = $1.50', a15);
  const runs = Math.min(N, 4000);
  for (let i = 0; i < runs; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const dem = q => p.a - p.b * q;
    // two-part profit by grid search over p, fee by numerical CS
    let bestP = 0, best = -Infinity;
    for (let k = 0; k <= 600; k++) {
      const P = p.a * k / 600, q = Math.max(0, (p.a - P) / p.b), cs = integ(x => dem(x) - P, 0, q, 200), tot = cs + (P - p.mc) * q;
      if (tot > best + 1e-12) { best = tot; bestP = P; }
      if (k % 37 === 0) { const at = M.at(p, P); ok(close(at.total, tot, 1e-6) && close(at.F, cs, 1e-6), '9.1', 'fee = CS and total at any p', [p, P]); }
    }
    ok(close(bestP, p.mc, p.a / 600 + 1e-9) && close(best, s.F, 1e-6), '9.1', 'grid search: best p is MC, profit = F', [p, bestP, best]);
    ok(close(s.F, integ(x => dem(x) - p.mc, 0, s.Qe)), '9.1', 'F = CS at MC by integration', p);
    // single-price monopoly by grid search on Q
    let bq = 0, bpi = -Infinity;
    for (let k = 0; k <= 4000; k++) { const q = s.Qe * 2 * k / 4000, pi = (dem(q) - p.mc) * q; if (pi > bpi) { bpi = pi; bq = q; } }
    ok(close(bq, s.Qm, s.Qe / 1000) && close(bpi, s.piM, 1e-6) && close(dem(s.Qm), s.Pm), '9.1', 'monopoly by grid search', p);
    ok(close(s.F, 2 * s.piM), '9.1', 'two-part profit doubles monopoly profit', p);
    // DWL at any p: TS max minus total
    const P2 = p.mc + (p.a - p.mc) * 0.37, P3 = p.mc * 0.5;
    ok(close(M.at(p, P2).dwl, s.F - M.at(p, P2).total) && close(M.at(p, P3).dwl, s.F - M.at(p, P3).total), '9.1', 'DWL = max surplus - total, above and below MC', p);
    ok(axisOk(D, s.choke, p.a), '9.1', 'fits frame', D);
    ok(M.score(p, { p: p.mc, m: { x: s.Qm, y: s.Pm } }).total === 100, '9.1', 'perfect scores 100', p);
    ok(M.score(p, { p: Math.round(p.mc / 0.05) * 0.05, m: { x: s.Qm, y: s.Pm } }).total === 100, '9.1', 'answer on the $0.05 grid', p);
    ok(M.score(p, { p: s.start, m: null }).total < 20, '9.1', 'untouched start scores low', p);
    ok(M.score(p, { p: p.mc, m: { x: s.Qm, y: p.mc } }).total < 90, '9.1', 'monopoly price read off MR scores below 90', p);
    ok(M.score(p, { p: 0, m: { x: s.Qm, y: s.Pm } }).total <= 75, '9.1', 'p = 0 (exam mistake) loses the p points', p);
  }
  report('9.1 two-part', runs);
})();

/* 9.2 natural monopoly */
(function () {
  const M = W.natmon, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qu === 27.5 && s0.Pu === 32.5 && close(s0.piU, 556.25) && s0.Qmc === 55 && s0.Pmc === 5 && s0.lossMC === -200 &&
    close(s0.Qac, 51.08495283, 1e-6) && close(s0.Pac, 8.91504717, 1e-6), '9.2', 'defaults: Q 27.5 at $32.50; Q 55 at $5; AC Q 51.08 at $8.92', s0);
  const kinds = {};
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const dem = q => p.a - p.b * q, AC = q => p.F / q + p.c;
    // profit max by grid search
    let bq = 0, bpi = -Infinity;
    for (let k = 1; k <= 3000; k++) { const q = s.choke * k / 3000, pi = (dem(q) - p.c) * q - p.F; if (pi > bpi) { bpi = pi; bq = q; } }
    ok(close(bq, s.Qu, s.choke / 1500) && close(bpi, s.piU, 1e-6 * Math.max(1, Math.abs(bpi)) + 1e-6) && close(dem(s.Qu), s.Pu), '9.2', 'unregulated by grid search', p);
    ok(s.piU > 0, '9.2', 'unregulated firm profitable', p);
    // P = AC: scan for the last sign change of dem - AC
    let last = null;
    for (let k = 1; k <= 4000; k++) { const q = s.choke * k / 4000, q0 = s.choke * (k - 1) / 4000; if (k > 1 && (dem(q) - AC(q)) * (dem(q0) - AC(q0)) <= 0) last = (q + q0) / 2; }
    ok(last != null && close(last, s.Qac, s.choke / 3000), '9.2', 'AC price = largest crossing', [p, last, s.Qac]);
    ok(close(dem(s.Qac), AC(s.Qac)) && close(s.Pac, AC(s.Qac)) && close(s.reg.ac.pi, 0, 1e-6), '9.2', 'AC pricing breaks even', p);
    ok(close(s.reg.mc.pi, (p.c - AC(s.Qmc)) * s.Qmc) && close(dem(s.Qmc), p.c), '9.2', 'MC pricing loses the fixed cost', p);
    ok(s.Qu < s.Qac && s.Qac < s.Qmc && s.Qac - s.Qu >= 0.12 * s.choke && s.Qmc - s.Qac >= 0.015 * s.choke, '9.2', 'points well apart', p);
    ok(close(s.dwl(s.Qu), integ(q => dem(q) - p.c, s.Qu, s.Qmc)) && s.dwl(s.Qac) < s.dwl(s.Qu), '9.2', 'DWL by integration, smaller under AC pricing', p);
    ok(Number.isInteger(p.F) && p.F > 0 && p.F < M.Fmax(p), '9.2', 'fixed cost valid', p);
    ok(axisOk(D, s.choke * 0.98, p.a) && s.Pu <= D.Y, '9.2', 'fits frame', D);
    ok(M.score(p, { u: { x: s.Qu, y: s.Pu }, ac: { x: s.Qac, y: s.Pac } }).total === 100, '9.2', 'perfect scores 100', p);
    ok(M.score(p, { u: { x: s.Qmc, y: p.c }, ac: { x: s.Qmc, y: p.c } }).total < 60, '9.2', 'P = MC for both scores low', p);
    kinds[p.b] = (kinds[p.b] || 0) + 1;
  }
  ok(Object.keys(kinds).length === 3, '9.2', 'slopes 0.5, 1 and 2 all drawn', kinds);
  report('9.2 nat. mon.', N);
})();

/* 9.3 the circle method */
(function () {
  const M = W.game, d = M.defaults(), s0 = M.solve(d);
  ok(s0.nash.length === 1 && s0.nash[0][0] === 0 && s0.nash[0][1] === 0 && s0.domA === 0 && s0.domB === 0 && d.labels.r[0] === 'Confess', '9.3', 'default PD: (Confess, Confess), both dominant', s0);
  // textbook / live preset answers
  const exp = { pd: [[0, 0]], opec: [[1, 1]], coord: [[0, 0], [1, 1]], adv: [[0, 0]] };
  Object.keys(exp).forEach(k => { const s = M.solve(M.presets[k]); ok(JSON.stringify(s.nash) === JSON.stringify(exp[k]) && M.valid(M.presets[k]), '9.3', 'preset ' + k, s.nash); });
  // brute force: a cell is NE iff neither player gains by a unilateral deviation
  function brute(P) {
    const out = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (P[i][j][0] >= P[1 - i][j][0] && P[i][j][1] >= P[i][1 - j][1]) out.push([i, j]);
    return out;
  }
  const count = {}, kindsSeen = {};
  let prev = null;
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng, prev) : d, s = M.solve(p);
    ok(M.valid(p), '9.3', 'no ties in any comparison', p);
    ok(!prev || JSON.stringify(prev.pay) !== JSON.stringify(p.pay), '9.3', 'new game differs from the last', p);
    ok(JSON.stringify(brute(p.pay)) === JSON.stringify(s.nash), '9.3', 'NE = brute force', p);
    for (let j = 0; j < 2; j++) ok(p.pay[s.aBR[j]][j][0] > p.pay[1 - s.aBR[j]][j][0], '9.3', 'A best reply is strictly higher', p);
    for (let r = 0; r < 2; r++) ok(p.pay[r][s.bBR[r]][1] > p.pay[r][1 - s.bBR[r]][1], '9.3', 'B best reply is strictly higher', p);
    if (p.kind) {
      const n = s.nash.length, want = { dominant: 1, iterated: 1, coord: 2, none: 0 }[p.kind];
      ok(n === want, '9.3', 'archetype ' + p.kind + ' has ' + want + ' NE', p);
      if (p.kind === 'dominant') ok(s.domA != null && s.domB != null, '9.3', 'dominant: both dominant', p);
      if (p.kind === 'iterated') ok((s.domA != null) !== (s.domB != null), '9.3', 'iterated: exactly one dominant', p);
      if (p.kind === 'coord' || p.kind === 'none') ok(s.domA == null && s.domB == null, '9.3', p.kind + ': nobody dominant', p);
      kindsSeen[p.kind] = (kindsSeen[p.kind] || 0) + 1;
    }
    count[s.nash.length] = (count[s.nash.length] || 0) + 1;
    p.pay.forEach(r => r.forEach(c => c.forEach(v => ok(Number.isInteger(v), '9.3', 'integer payoffs', p))));
    // scoring: the true circles score 100 and imply exactly the true NE
    const g = { a: s.aBR.slice(), b: s.bBR.slice() };
    ok(M.score(p, g).total === 100 && JSON.stringify(M.implied(g)) === JSON.stringify(s.nash), '9.3', 'perfect circles: 100 and the right NE', p);
    const wrong = { a: s.aBR.map(x => 1 - x), b: s.bBR.map(x => 1 - x) };
    ok(M.score(p, wrong).total === 0, '9.3', 'every circle wrong scores 0', p);
    ok(M.score(p, { a: [null, null], b: [null, null] }).total === 0, '9.3', 'nothing circled scores 0', p);
    prev = p;
  }
  ok(count[0] > 0 && count[1] > 0 && count[2] > 0 && !count[3] && !count[4], '9.3', 'draws cover 0, 1 and 2 equilibria', count);
  ok(Object.keys(kindsSeen).length === 4, '9.3', 'all four archetypes drawn', kindsSeen);
  // ties typed in Explore: brute force still agrees
  const tie = { pay: [[[2, 2], [2, 2]], [[2, 2], [2, 2]]] };
  ok(M.solve(tie).nash.length === 4 && JSON.stringify(brute(tie.pay)) === JSON.stringify(M.solve(tie).nash), '9.3', 'all-tie game: 4 NE', tie);
  for (let i = 0; i < 2000; i++) {
    const P = [0, 1].map(() => [0, 1].map(() => [Math.floor(rng() * 3), Math.floor(rng() * 3)]));
    ok(JSON.stringify(brute(P)) === JSON.stringify(M.solve({ pay: P }).nash), '9.3', 'NE with ties = brute force', P);
  }
  console.log('        equilibria per draw: ' + JSON.stringify(count) + ', archetypes: ' + JSON.stringify(kindsSeen));
  report('9.3 game', N);
})();

/* 9.4 block pricing */
(function () {
  const M = W.blocks, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.pr[0], 7 / 3) && close(s0.pr[1], 5 / 3) && close(s0.pr[2], 1) && close(s0.profit, 40 / 3) && s0.max === 20 && close(s0.w, 20 / 3), '9.4', 'defaults: $2.33, $1.67, $1.00; profit $13.33 of $20', s0);
  for (let n = 1; n <= 10; n++) ok(close(M.solve(Object.assign({}, d, { n })).profit, 20 * (n - 1) / n), '9.4', 'live formula 20(n-1)/n at n=' + n, n);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), dem = q => p.a - p.b * q;
    // profit slice by slice: each unit slice pays the price of the block it sits in
    let sum = 0; const K = 6000;
    for (let k = 0; k < K; k++) { const q = (k + 0.5) * s.Qe / K, blk = Math.min(p.n - 1, Math.floor(q / s.w)); sum += (s.pr[blk] - p.mc) * s.Qe / K; }
    ok(close(sum, s.profit, 1e-6 * Math.max(1, s.profit)), '9.4', 'profit = sum of block rectangles', p);
    ok(close(s.profit, s.max * (p.n - 1) / p.n), '9.4', 'profit = max (n - 1) / n', p);
    ok(close(s.max, integ(q => dem(q) - p.mc, 0, s.Qe)), '9.4', 'max = surplus triangle by integration', p);
    ok(close(s.pr[p.n - 1], p.mc) && s.pr.every((v, k) => k === 0 || v < s.pr[k - 1]), '9.4', 'staircase falls to MC', p);
    for (let k = 0; k < p.n; k++) ok(dem((k + 1) * s.w) >= s.pr[k] - 1e-9 && close(dem((k + 1) * s.w), s.pr[k]), '9.4', 'each block priced at the demand price of its last unit', p);
    ok(axisOk(D, s.Qe / 0.98 * 0.98, p.a) && p.n >= 2 && p.n <= 5, '9.4', 'fits frame, 2 to 5 blocks', D);
    ok(M.score(p, { pr: s.pr.slice() }).total === 100, '9.4', 'perfect scores 100', p);
    ok(M.score(p, { pr: s.pr.map(v => Math.round(v / 0.05) * 0.05) }).total === 100, '9.4', 'answer on the $0.05 grid', p);
    ok(M.score(p, { pr: s.pr.map(() => s.start) }).total < 40, '9.4', 'untouched start scores low', p);
    ok(M.score(p, { pr: s.pr.map((v, k) => dem(k * s.w)) }).total < 70, '9.4', 'pricing at the first unit of each block scores below 70', p);
    for (let k = 0; k < p.n; k++) ok(Math.abs(s.start - s.pr[k]) > 0.1 * (p.a - p.mc), '9.4', 'start is away from every answer', p);
  }
  report('9.4 blocks', N);
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
