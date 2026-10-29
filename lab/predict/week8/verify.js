/* Verifies every Week 8 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week8/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: surplus areas by numerical integration under the curves, quantities traded
 * by scanning both sides of the market, monopoly and block-pricing optima by brute-force search
 * (never the closed forms), third-degree and uniform prices by grid search on profit, the
 * natural-monopoly break-even point and the two-tier break-even P_A by scanning for the first
 * price with zero profit, welfare identities (CS + PS + DWL = TS max, transfer + DWL = lost CS,
 * dCS + dPS + revenue + DWL = 0, green - red = net profit), frame fit, perfect guesses score 100,
 * untouched starting guesses and the classic mistakes score low, defaults equal week8-viz.html
 * (or the documented first-round deviations). Float tolerance 1e-6 unless a grid sets it. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 8080;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
// integral of f on [a, b] by Simpson's rule
function integ(f, a, b, n) { n = n || 400; if (b <= a) return 0; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
// argmax of f on [a, b]: a grid, then a golden-section polish
function argmax(f, a, b, n) {
  n = n || 2000; let best = a, bv = -Infinity;
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, v = f(x); if (v > bv) { bv = v; best = x; } }
  let lo = Math.max(a, best - (b - a) / n), hi = Math.min(b, best + (b - a) / n);
  for (let k = 0; k < 80; k++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (f(m1) < f(m2)) lo = m1; else hi = m2; }
  return (lo + hi) / 2;
}
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(14) + n + ' draws'); }
function fits(D, x, y) { return x <= 0.98 * D.X && y <= 0.98 * D.Y && D.X / D.xs <= 7 + 1e-9 && D.Y / D.ys <= 7 + 1e-9 && W.util.isMult(D.X / D.xs, 1) && W.util.isMult(D.Y / D.ys, 1); }
const Nh = Math.max(1000, Math.round(N / 4));

/* 8.1 CS / PS anatomy */
(function () {
  const M = W.welfare, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qe === 8 && s0.Ps === 12 && s0.TSmax === 64 && s0.Qt === 5 && s0.Qd === 5 && s0.Qs === 11 && close(s0.CS, 12.5) && close(s0.PS, 42.5) && close(s0.DWL, 9), '8.1', 'defaults (P held at $15)', s0);
  ok(d.a === 20 && d.b === 4, '8.1', 'live curves D: P = 20 - Q, S: P = 4 + Q', d);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const dem = q => p.a - q, sup = q => p.b + q;
    // scan: the most units that both a buyer and a seller agree to at price P
    let Qt = 0; for (let q = 0; q <= p.a; q += 0.0005) { if (dem(q) >= p.P - 1e-12 && sup(q) <= p.P + 1e-12) Qt = q; }
    ok(close(Qt, s.Qt, 1e-3), '8.1', 'traded quantity = short side', p);
    ok(close(integ(q => dem(q) - p.P, 0, s.Qt), s.CS, 1e-6) && close(integ(q => p.P - sup(q), 0, s.Qt), s.PS, 1e-6), '8.1', 'CS and PS by integration', p);
    ok(close(integ(q => dem(q) - sup(q), s.Qt, s.Qe), s.DWL, 1e-6), '8.1', 'DWL = lost gains between Qt and Q*', p);
    ok(close(s.CS + s.PS + s.DWL, s.TSmax) && close(integ(q => dem(q) - sup(q), 0, s.Qe), s.TSmax, 1e-6), '8.1', 'CS + PS + DWL = TS max', p);
    ok(close(dem(s.Qe), sup(s.Qe)) && close(dem(s.Qe), s.Ps), '8.1', 'equilibrium', p);
    ok(s.DWL > 0.5, '8.1', 'visible DWL', p);
    ok(fits(D, p.a, p.a), '8.1', 'demand fits the frame', D);
    ok(M.score(p, { Q: s.Qt }).total === 100, '8.1', 'perfect scores 100', p);
    ok(M.score(p, { Q: Math.max(s.Qd, s.Qs) }).total === 0, '8.1', 'the long side scores 0', p);
    ok(M.score(p, { Q: s.Qe }).total <= 35, '8.1', 'answering Q* scores low', p);
    ok(W.util.isMult(s.Qt, 0.5), '8.1', 'answer on the 0.5 handle grid', p);
  }
  report('8.1 welfare', N);
})();

/* 8.2 transfer vs destruction */
(function () {
  const M = W.transfer, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qs === 8 && s0.PQ === 6 && s0.transfer === 16 && s0.dwl === 8 && s0.csRem === 8 && s0.CSc === 32, '8.2', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), dem = q => p.a - p.b * q;
    ok(close(dem(s.Qs), p.c), '8.2', 'Q* where demand meets MC', p);
    ok(close(integ(q => dem(q) - dem(p.Q), 0, p.Q), s.csRem, 1e-6), '8.2', 'remaining CS by integration', p);
    ok(close(integ(q => dem(q) - p.c, p.Q, s.Qs), s.dwl, 1e-6), '8.2', 'DWL by integration', p);
    ok(close(s.transfer + s.dwl, s.lost, 1e-6), '8.2', 'transfer + DWL = lost CS', p);
    // the triangle beats the rectangle exactly below Q*/3
    const q1 = s.Qeq * 0.98, q2 = Math.min(s.Qs, s.Qeq * 1.02), w1 = M.at(p, q1), w2 = M.at(p, q2);
    ok(w1.dwl > w1.transfer && w2.dwl < w2.transfer && close(M.at(p, s.Qeq).dwl, M.at(p, s.Qeq).transfer, 1e-6), '8.2', 'triangle = rectangle at Q*/3', p);
    ok(fits(D, p.a / p.b, p.a), '8.2', 'demand fits the frame', D);
    ok(M.score(p, { P: s.PQ, X: s.Qs, mp: true, mx: true }).total === 100, '8.2', 'perfect scores 100', p);
    ok(M.score(p, { P: p.c, X: p.Q, mp: true, mx: true }).total < 40, '8.2', 'untouched start scores low', p);
  }
  report('8.2 transfer', N);
})();

/* 8.3 trade and tariffs */
(function () {
  const M = W.tariff, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Ps === 12 && s0.Pt === 8 && s0.Qs0 === 2 && s0.Qd0 === 14 && s0.Qs === 4 && s0.Qd === 12 && s0.rev === 16 && s0.dwl === 4 && s0.CSa === 32 && s0.PSa === 32 && s0.gain === 36, '8.3', 'defaults', s0);
  ok(M.at(d, 6, 0).gain === 36 && M.at(d, 6, 0).CS0 === 98 && M.at(d, 6, 0).PS0 === 2, '8.3', 'live free-trade numbers (CS $98, PS $2, net +$36)', {});
  ok(M.at(d, 6, 6).prohibitive && M.at(d, 6, 6).rev === 0 && M.at(d, 6, 6).Pt === 12, '8.3', 'prohibitive tariff caps at autarky', {});
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), dem = q => p.a - q, sup = q => p.b + q;
    ok(!s.prohibitive && close(s.Pt, p.Pw + p.t), '8.3', 'tariff passes through to the domestic price', p);
    ok(close(sup(s.Qs), s.Pt) && close(dem(s.Qd), s.Pt) && close(sup(s.Qs0), p.Pw) && close(dem(s.Qd0), p.Pw), '8.3', 'quantities on the curves', p);
    const CS = P => integ(q => dem(q) - P, 0, p.a - P), PS = P => integ(q => P - sup(q), 0, Math.max(0, P - p.b));
    ok(close(CS(s.Pt) - CS(p.Pw), s.dCS, 1e-6) && close(PS(s.Pt) - PS(p.Pw), s.dPS, 1e-6), '8.3', 'dCS and dPS by integration', p);
    ok(close(s.dCS + s.dPS + s.rev + s.dwl, 0, 1e-6), '8.3', 'dCS + dPS + revenue = -DWL', p);
    ok(close(CS(p.Pw) + PS(p.Pw) - CS(s.Ps) - PS(s.Ps), s.gain, 1e-6) && s.gain > 0, '8.3', 'gains from trade by integration, positive', p);
    ok(close(s.rev, p.t * (s.Qd - s.Qs)) && s.imp < s.imp0, '8.3', 'revenue = t x imports; imports shrink', p);
    ok(fits(D, s.Qd0, s.Ps + 2) && D.X >= 1.18 * s.Qd0 - 1e-9, '8.3', 'trade band fits the frame', D);
    const g = { P: s.Pt, qs: s.Qs, qd: s.Qd, mp: true, ms: true, md: true };
    ok(M.score(p, g).total === 100, '8.3', 'perfect scores 100', p);
    ok(M.score(p, { P: p.Pw, qs: s.Qs0, qd: s.Qd0, mp: true, ms: true, md: true }).total < 45, '8.3', 'ignoring the tariff scores low', p);
  }
  report('8.3 tariff', N);
})();

/* 8.4 monopoly two-step */
(function () {
  const M = W.mono, d = M.defaults(), s0 = M.solve(d);
  ok(s0.mr0 === 5 && s0.Qm === 4 && s0.Pm === 6 && s0.pi === 16 && s0.CS === 8 && s0.DWL === 8 && s0.Qc === 8 && s0.CSc === 32, '8.4', 'defaults = film numbers', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const prof = Q => (p.a - Q) * Q - p.c * Q, TR = Q => (p.a - Q) * Q, h = 1e-5;
    ok(close(argmax(prof, 0, p.a), s.Qm, 1e-5), '8.4', 'brute-force profit max', p);
    ok(close((TR(s.Qm + h) - TR(s.Qm - h)) / (2 * h), p.c, 1e-5), '8.4', 'MR = MC at Q_M', p);
    ok(close((TR(s.mr0 + h) - TR(s.mr0 - h)) / (2 * h), 0, 1e-5), '8.4', 'MR = 0 at a/2', p);
    ok(close(prof(s.Qm), s.pi, 1e-9) && close(integ(q => p.a - q - s.Pm, 0, s.Qm), s.CS) && close(integ(q => p.a - q - p.c, s.Qm, s.Qc), s.DWL), '8.4', 'profit, CS, DWL', p);
    ok(close(s.pi + s.CS + s.DWL, s.CSc), '8.4', 'CS + profit + DWL = competitive TS', p);
    ok(fits(D, p.a, p.a), '8.4', 'demand fits the frame', D);
    ok(M.score(p, { mr: s.mr0, q: s.Qm, p: s.Pm, mm: true, mq: true, mp: true }).total === 100, '8.4', 'perfect scores 100', p);
    ok(M.score(p, { mr: s.mr0, q: s.Qm, p: p.c, mm: true, mq: true, mp: true }).total <= 65, '8.4', 'price read off MR loses the price part', p);
    ok(M.score(p, { mr: p.a, q: s.Qc, p: p.c, mm: true, mq: true, mp: true }).total === 0, '8.4', 'the competitive answer scores 0', p);
  }
  report('8.4 monopoly', N);
})();

/* 8.5 biggest profit rectangle */
(function () {
  const M = W.compare, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Pm === 6 && s0.pi === 16 && s0.CS === 8 && s0.DWL === 8 && s0.CSc === 32 && M.start(d) === 3, '8.5', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    ok(close(argmax(P => M.profit(p, P), p.c, p.a), s.Pm, 1e-5), '8.5', 'brute-force best rectangle price', p);
    ok(close(M.profit(p, s.Pm), s.pi), '8.5', 'profit at the best price', p);
    ok(fits(D, p.a, p.a), '8.5', 'demand fits the frame', D);
    ok(M.score(p, { P: s.Pm }).total === 100, '8.5', 'perfect scores 100', p);
    ok(M.score(p, { P: M.start(p) }).total <= 10, '8.5', 'untouched start scores low', p);
    ok(M.score(p, { P: p.c }).total === 0, '8.5', 'the competitive price scores 0', p);
  }
  report('8.5 compare', N);
})();

/* 8.7 perfect price discrimination */
(function () {
  const M = W.ppd, d = M.defaults(), s0 = M.solve(d);
  ok(s0.ppdQ === 8 && s0.ppdP === 2 && s0.ppdPi === 32 && s0.Qm === 4, '8.7', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // a perfectly discriminating seller earns the area under demand above MC up to Q
    const prof = Q => integ(q => p.a - q - p.c, 0, Q, 200);
    ok(close(argmax(prof, 0, p.a, 800), s.ppdQ, 1e-4), '8.7', 'brute-force PPD output', p);
    ok(close(prof(s.ppdQ), s.ppdPi, 1e-6) && close(s.ppdPi, s.CSc), '8.7', 'PPD profit = competitive TS', p);
    ok(close(p.a - s.ppdQ, p.c), '8.7', 'last unit sells at MC', p);
    ok(fits(D, p.a, p.a), '8.7', 'demand fits the frame', D);
    ok(M.score(p, { Q: s.ppdQ }).total === 100, '8.7', 'perfect scores 100', p);
    ok(M.score(p, { Q: s.Qm }).total === 0, '8.7', 'staying at the monopoly point scores 0', p);
  }
  report('8.7 PPD', N);
})();

/* 8.8 block pricing */
(function () {
  const M = W.blocks, d = M.defaults(), s0 = M.solve(d);
  ok(s0.q.join() === '2,4,6' && s0.prices.join() === '8,6,4' && s0.pi === 24 && s0.cs === 6 && s0.dwl === 2, '8.8', 'defaults n = 3', s0);
  const n1 = M.solve({ a: 10, c: 2, n: 1 });
  ok(n1.q[0] === 4 && n1.prices[0] === 6 && n1.pi === 16 && n1.dwl === 8, '8.8', 'n = 1 is the plain monopoly (live default)', n1);
  for (let n = 1; n <= 10; n++) { const s = M.solve({ a: 10, c: 2, n: n }); ok(close(s.dwl, 32 / ((n + 1) * (n + 1))) && close(s.pi, 32 * n / (n + 1)), '8.8', 'live formulas DWL = 32/(n+1)^2, profit = 32n/(n+1)', { n: n }); }
  for (let i = 0; i < Nh; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // brute force: coordinate ascent on the block ends, from a deliberately bad start
    const prof = qs => M.outcome(p, qs).pi;
    let qs = M.start(p).slice();
    for (let it = 0; it < 60; it++) for (let k = 0; k < p.n; k++) {
      const lo = k ? qs[k - 1] : 0, hi = k < p.n - 1 ? qs[k + 1] : p.a;
      qs[k] = argmax(x => { const t = qs.slice(); t[k] = x; return prof(t); }, lo, hi, 200);
    }
    ok(qs.every((q, k) => close(q, s.q[k], 1e-3)), '8.8', 'brute-force block ends = i Q*/(n+1)', { p: p, qs: qs });
    const o = M.outcome(p, s.q);
    ok(close(o.pi, s.pi) && close(o.cs, s.cs) && close(o.dwl, s.dwl) && close(o.pi + o.cs + o.dwl, s.TS), '8.8', 'profit, CS, DWL add up to TS', p);
    ok(s.prices.every((P, k) => close(P, p.a - s.q[k]) && P > p.c), '8.8', 'each block priced at its last buyer\'s WTP, above MC', p);
    ok(fits(D, p.a, p.a), '8.8', 'demand fits the frame', D);
    ok(s.q.every(q => W.util.isMult(q, 0.25)), '8.8', 'answers on the 0.25 handle grid', p);
    ok(M.score(p, { q: s.q.slice() }).total === 100, '8.8', 'perfect scores 100', p);
    ok(M.score(p, { q: M.start(p) }).total < 30, '8.8', 'untouched start scores low', p);
  }
  report('8.8 blocks', Nh);
})();

/* 8.9 market separation */
(function () {
  const M = W.separate, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Q1 === 40 && s0.P1 === 60 && s0.Q2 === 30 && s0.P2 === 35 && s0.pi === 2050 && close(s0.uP, 130 / 3) && close(s0.uPi, 4900 / 3) && close(s0.gain, 2050 - 4900 / 3), '8.9', 'defaults = textbook example', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const p1 = P => (P - p.c) * M.q1(p, P), p2 = P => (P - p.c) * M.q2(p, P), pu = P => (P - p.c) * (M.q1(p, P) + M.q2(p, P));
    ok(close(argmax(p1, p.c, p.a1), s.P1, 1e-5) && close(argmax(p2, p.c, p.a2), s.P2, 1e-5), '8.9', 'brute-force price in each market', p);
    ok(close(argmax(pu, p.c, p.a1, 20000), s.uP, 1e-4) && close(pu(s.uP), s.uPi, 1e-6), '8.9', 'brute-force uniform price', p);
    ok(s.gain > 0 && s.P1 > s.P2, '8.9', 'discrimination pays; business pays more', p);
    // MR1 = MR2 = MC at the chosen quantities (numerical MR)
    const h = 1e-5, TR1 = Q => (p.a1 - Q) * Q, TR2 = Q => (p.a2 - Q / 2) * Q;
    ok(close((TR1(s.Q1 + h) - TR1(s.Q1 - h)) / (2 * h), p.c, 1e-5) && close((TR2(s.Q2 + h) - TR2(s.Q2 - h)) / (2 * h), p.c, 1e-5), '8.9', 'MR1 = MR2 = MC', p);
    // the less elastic market (smaller |e|) has the higher price; Lerner = -1/e
    ok(Math.abs(s.e1) < Math.abs(s.e2) && close(s.L1, -1 / s.e1, 1e-9) && close(s.L2, -1 / s.e2, 1e-9), '8.9', 'Lerner = -1/e; less elastic pays more', p);
    ok(fits(D, Math.max(p.a1, 2 * p.a2), p.a1), '8.9', 'both demands fit the frame', D);
    ok(M.score(p, { P1: s.P1, P2: s.P2, m1: true, m2: true }).total === 100, '8.9', 'perfect scores 100', p);
    ok(M.score(p, { P1: s.start, P2: s.start, m1: true, m2: true }).total < 60, '8.9', 'one uniform price scores low', p);
  }
  report('8.9 separate', N);
})();

/* 8.10 natural monopoly */
(function () {
  const M = W.natmono, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Qm === 9 && s0.Pm === 11 && close(s0.piM, 31) && s0.dwlM === 40.5 && s0.lossC === 50 && close(s0.Qa, 9 + Math.sqrt(31)) && close(s0.Pa, 11 - Math.sqrt(31)) && close(s0.dwlA, 5.890, 1e-3), '8.10', 'defaults = live readout', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const dem = q => p.a - q, prof = Q => (dem(Q) - M.AC(p, Q)) * Q;
    ok(close(argmax(prof, 0.01, p.a), s.Qm, 1e-5), '8.10', 'brute-force monopoly', p);
    // scan: the largest Q (lowest price) at which price still covers average cost
    let best = 0; for (let q = 0.01; q <= p.a; q += 0.0005) if (dem(q) >= M.AC(p, q) - 1e-12) best = q;
    ok(close(best, s.Qa, 1e-3) && close(s.piA, 0, 1e-6), '8.10', 'P = AC: lowest break-even price', p);
    ok(close((dem(s.Qc) - M.AC(p, s.Qc)) * s.Qc, -p.F, 1e-6), '8.10', 'P = MC loses exactly F', p);
    ok(close(integ(q => dem(q) - p.c, s.Qm, s.Qc), s.dwlM) && close(integ(q => dem(q) - p.c, s.Qa, s.Qc), s.dwlA), '8.10', 'DWL by integration', p);
    ok(s.piM > 0 && s.dwlA < s.dwlM && s.Pa < s.Pm && s.Pa > p.c, '8.10', 'regime ordering', p);
    // average cost falls over the whole range: a natural monopoly
    ok(M.AC(p, 1) > M.AC(p, 2) && M.AC(p, p.a - 1) > M.AC(p, p.a), '8.10', 'AC declining', p);
    ok(fits(D, p.a, p.a), '8.10', 'demand fits the frame', D);
    ok(M.score(p, { Pm: s.Pm, Pa: s.Pa, mm: true, ma: true }).total === 100, '8.10', 'perfect scores 100', p);
    ok(M.score(p, { Pm: s.Pm, Pa: p.c, mm: true, ma: true }).parts[1] <= 0.35, '8.10', 'P = MC as the break-even answer scores low', p);
    ok(Math.abs(s.Pa - s.Pm) > 0.15 * (p.a - p.c), '8.10', 'the two answers are apart', p);
  }
  report('8.10 natmono', N);
})();

/* 8.11 two-tier pricing */
(function () {
  const M = W.twotier, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.PA, 11 - Math.sqrt(31)) && close(s0.net, 0) && d.PA0 === 9 && close(M.profit(d, 9), 27) && close(s0.PA, s0.single), '8.11', 'defaults (break-even = the P = AC price of 8.10)', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // scan up from P_R: the first high-tier price at which net profit reaches zero
    let first = NaN; for (let P = p.PR; P <= p.a; P += 0.0005) { if (M.profit(p, P) >= -1e-12) { first = P; break; } }
    ok(close(first, s.PA, 1e-3), '8.11', 'scan finds the break-even P_A', p);
    // net profit directly from revenue and cost
    const QA = p.a - s.PA, QR = p.a - p.PR, net = s.PA * QA + p.PR * (QR - QA) - (p.F + p.c * QR);
    ok(close(net, 0, 1e-6) && close(s.green - s.red, 0, 1e-6), '8.11', 'green = red at break-even', p);
    const w = M.parts(p, p.PA0);
    ok(close(w.green - w.red, M.profit(p, p.PA0), 1e-6) && w.green > w.red, '8.11', 'green - red = net profit; start is profitable', p);
    ok(s.ACR > p.PR && s.PA > s.ACR, '8.11', 'P_R < AC(Q_R) < P_A: a real cross-subsidy', p);
    ok(fits(D, p.a, Math.max(p.PA0, s.ACR + 1)) && p.PA0 <= 0.8 * D.Y, '8.11', 'both tiers fit the frame', D);
    ok(M.score(p, { PA: s.PA }).total === 100 && M.score(p, { PA: Math.round(s.PA * 10) / 10 }).total === 100, '8.11', 'perfect (and $0.10 grid) scores 100', p);
    ok(M.score(p, { PA: p.PA0 }).total === 0, '8.11', 'untouched start scores 0', p);
  }
  report('8.11 twotier', N);
})();

if (fails) { console.log('\n' + fails + ' failures'); process.exit(1); }
console.log('\nall checks pass');
