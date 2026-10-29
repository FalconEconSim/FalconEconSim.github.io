/* Verifies every Week 4 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week4/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: elasticities by numerical derivatives (dQ/dP x P/Q), arc elasticity by the
 * textbook midpoint formula, revenue peaks by brute-force grid search, consumer surplus by
 * numerical integration under the demand curve, constant-elasticity revenue from actual P x Q,
 * market demand by summing the two demands on a grid, frame fit, perfect guesses score 100,
 * untouched starting guesses score low, defaults equal week4-viz.html. Float tolerance 1e-6. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 4242;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
const Qlin = (a, b, P) => Math.max(0, a - b * P);
// point elasticity by central difference, independent of the closed form -bP/Q
function eNum(qf, P) { const h = 1e-6 * Math.max(1, P); return (qf(P + h) - qf(P - h)) / (2 * h) * P / qf(P); }
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(12) + n + ' draws'); }
function fits(D, a, c) { return a <= 0.97 * D.X && c <= 0.95 * D.Y && D.X / D.xs <= 7 + 1e-9 && Number.isInteger(Math.round(D.X / D.xs * 1e9) / 1e9); }

/* 4.1 point vs arc */
(function () {
  const M = W.arc, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.arc, -1.857142857, 1e-6) && s0.Pm === 32.5 && s0.Qm === 35 && s0.e1 === -1 && s0.e2 === -4 && s0.Q1 === 50 && s0.Q2 === 20, '4.1', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), qf = P => Qlin(p.a, p.b, P);
    // textbook midpoint formula, computed from scratch
    const q1 = qf(p.P1), q2 = qf(p.P2), arcE = ((q2 - q1) / ((q1 + q2) / 2)) / ((p.P2 - p.P1) / ((p.P1 + p.P2) / 2));
    ok(close(arcE, s.arc), '4.1', 'arc elasticity = midpoint formula', p);
    ok(close(eNum(qf, s.Pm), s.arc, 1e-5), '4.1', 'point elasticity at the midpoint = arc elasticity', p);
    ok(close(qf(s.Pm), s.Qm), '4.1', 'midpoint lies on the demand line', p);
    ok(close(eNum(qf, p.P1), s.e1, 1e-5) && close(eNum(qf, p.P2), s.e2, 1e-5), '4.1', 'point e at A and B', p);
    ok(fits(D, p.a, s.c), '4.1', 'line fits the frame', D);
    ok(M.score(p, { P: s.Pm }).total === 100, '4.1', 'perfect scores 100', p);
    ok(M.score(p, { P: Math.round(s.Pm * 10) / 10 }).total === 100, '4.1', 'answer reachable on the $0.10 grid', p);
    ok(M.score(p, { P: s.start }).total < 40, '4.1', 'untouched start scores low', p);
    ok(Math.abs(s.e1 - s.arc) > 0.05 || Math.abs(s.e2 - s.arc) > 0.05, '4.1', 'endpoints differ from the arc value', p);
  }
  report('4.1 arc', N);
})();

/* 4.2 heatmap */
(function () {
  const M = W.heat, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Pu === 25 && s0.Qu === 50 && close(s0.Pk, 37.5) && close(s0.Qk, 25), '4.2', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), qf = P => Qlin(p.a, p.b, P);
    ok(close(eNum(qf, s.Pu), -1, 1e-5), '4.2', 'numerical e = -1 at the unit point', p);
    ok(close(eNum(qf, s.Pk), -p.k, 1e-5 * p.k), '4.2', 'numerical e = -k at the target', p);
    ok(close(s.ek, -p.k, 1e-9), '4.2', 'closed form e at target', p);
    // elastic above the midpoint, inelastic below
    ok(Math.abs(eNum(qf, s.Pu * 1.2)) > 1 && Math.abs(eNum(qf, s.Pu * 0.8)) < 1, '4.2', 'elastic above, inelastic below', p);
    ok(fits(D, p.a, s.c), '4.2', 'line fits the frame', D);
    const pt = P => ({ x: qf(P), y: P });
    ok(M.score(p, { u: pt(s.Pu), k: pt(s.Pk) }).total === 100, '4.2', 'perfect scores 100', p);
    ok(M.score(p, { u: pt(Math.round(s.Pu * 10) / 10), k: pt(Math.round(s.Pk * 10) / 10) }).total === 100, '4.2', 'answers reachable on the $0.10 grid', p);
    ok(M.score(p, { u: pt(s.Pk), k: pt(s.Pu) }).total < 60, '4.2', 'swapped answers score low', p);
  }
  report('4.2 heat', N);
})();

/* 4.3 revenue rectangle */
(function () {
  const M = W.revenue, d = M.defaults(), s0 = M.solve(d);
  ok(s0.TR0 === 1050 && s0.TRmax === 1250 && s0.Ps === 25 && s0.Qs === 50 && s0.dir === -1 && close(s0.e0, -70 / 30), '4.3', 'defaults: $35 -> peak $25, $1,250', s0);
  ok(M.solve({ a: 100, b: 2, P0: 25 }).TR0 === M.solve({ a: 100, b: 2, P0: 25 }).TRmax, '4.3', 'the site P_old $25 is the peak', {});
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), qf = P => Qlin(p.a, p.b, P);
    let best = -1, bp = 0;
    for (let k = 0; k <= 20000; k++) { const P = s.c * k / 20000, tr = P * qf(P); if (tr > best) { best = tr; bp = P; } }
    ok(close(bp, s.Ps, s.c / 10000) && close(best, s.TRmax, 1e-6 * s.TRmax), '4.3', 'brute-force revenue peak', p);
    ok(close(eNum(qf, s.Ps), -1, 1e-5), '4.3', 'unit elastic at the peak', p);
    ok(close(s.TR0, p.P0 * qf(p.P0)), '4.3', 'TR0 = P x Q', p);
    // a small move toward the peak raises revenue; elastic <=> a cut raises revenue
    const h = 0.01, up = (p.P0 + s.dir * h) * qf(p.P0 + s.dir * h) > s.TR0;
    ok(up, '4.3', 'moving toward the peak raises TR', p);
    ok((Math.abs(eNum(qf, p.P0)) > 1) === (s.dir < 0), '4.3', 'elastic <=> cut raises revenue', p);
    ok(fits(D, p.a, s.c), '4.3', 'line fits the frame', D);
    ok(M.score(p, { P: s.Ps }).total === 100, '4.3', 'perfect scores 100', p);
    ok(M.score(p, { P: p.P0 - s.dir * 0.2 * s.c }).total < 30, '4.3', 'wrong direction scores low', p);
    ok(Math.abs(p.P0 - s.Ps) >= 0.2 * s.c - 1e-9, '4.3', 'start is well away from the peak', p);
  }
  report('4.3 revenue', N);
})();

/* 4.4 pricing strategy */
(function () {
  const M = W.pricing, d = M.defaults(), s0 = M.solve(d), seen = {};
  ok(close(s0.dQ, -2.818, 1e-3) && close(s0.dTR, 6.899, 1e-3) && close(s0.approx, 7), '4.4', 'defaults: pharma +10%', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), e = M.ind(p.ind).e; seen[p.ind] = 1;
    // actual prices and quantities on Q = 100 (P / 10)^e
    const qf = P => 100 * Math.pow(P / 10, e), P1 = 10 * (1 + p.dp / 100), Q1 = qf(P1);
    ok(close(eNum(qf, 10), e, 1e-6) && close(eNum(qf, P1), e, 1e-6), '4.4', 'constant elasticity everywhere', p);
    ok(close(s.dQ, 100 * (Q1 / 100 - 1), 1e-9), '4.4', '%dQ from actual quantities', p);
    ok(close(s.dTR, 100 * (P1 * Q1 - 1000) / 1000, 1e-9), '4.4', '%dTR from actual P x Q', p);
    ok(close(s.approx, p.dp * (1 + e), 1e-12), '4.4', 'linear shortcut', p);
    ok(Math.sign(s.dTR) === (Math.abs(e) > 1 ? -Math.sign(p.dp) : Math.sign(p.dp)), '4.4', 'revenue direction follows elasticity', p);
    const D = M.domain(p), H = D.Y / 2;
    ok(Math.abs(s.dQ) <= 0.85 * H && Math.abs(s.dTR) <= 0.85 * H && Math.abs(p.dp) <= 0.5 * H + 1e-9, '4.4', 'bars fit the frame with room to guess', Object.assign({ H: H }, p));
    ok(Number.isInteger(H / D.ys) && D.Y / D.ys <= 8, '4.4', 'ticks', D);
    ok(M.score(p, { q: s.dQ, tr: s.dTR }).total === 100, '4.4', 'perfect scores 100', p);
    ok(M.score(p, { q: Math.round(s.dQ * 2) / 2, tr: Math.round(s.dTR * 2) / 2 }).total === 100, '4.4', 'answers reachable on the 0.5 grid', p);
    ok(M.score(p, { q: 0, tr: 0 }).total < 100, '4.4', 'untouched bars are not perfect', p);
  }
  ok(Object.keys(seen).length === 7, '4.4', 'all seven industries drawn', seen);
  report('4.4 pricing', N);
})();

/* 4.6 consumer surplus */
(function () {
  const M = W.surplus, d = M.defaults(), s0 = M.solve(d);
  ok(s0.CS0 === 2025 && s0.CS1 === 1225 && s0.rect === 700 && s0.tri === 100 && s0.area === 800, '4.6', 'defaults: $2,025 -> $1,225 = 700 + 100', s0);
  let rises = 0;
  // CS by midpoint-rule integration of (inverse demand - price) over quantity
  const csNum = (p, P) => { const qmax = Qlin(p.a, p.b, P), n = 4000; let s = 0; for (let k = 0; k < n; k++) { const q = (k + 0.5) * qmax / n; s += ((p.a - q) / p.b - P) * qmax / n; } return s; };
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); if (s.rise) rises++;
    ok(close(csNum(p, p.P0), s.CS0, 1e-6 * Math.max(1, s.CS0)) && close(csNum(p, p.P1), s.CS1, 1e-6 * Math.max(1, s.CS1)), '4.6', 'CS by integration', p);
    ok(close(Math.abs(s.CS1 - s.CS0), s.area, 1e-6), '4.6', 'rectangle + triangle = change in CS', p);
    ok((s.CS1 < s.CS0) === s.rise, '4.6', 'a rise loses CS, a fall gains it', p);
    ok(fits(D, p.a, s.c), '4.6', 'line fits the frame', D);
    ok(M.score(p, { xb: s.Qhi, xt: s.Qlo }).total === 100, '4.6', 'perfect scores 100', p);
    ok(M.score(p, { xb: Math.round(s.Qhi * 2) / 2, xt: Math.round(s.Qlo * 2) / 2 }).total === 100, '4.6', 'answer reachable on the 0.5 grid', p);
    const x0 = Math.round(D.X * 0.12);
    ok(M.score(p, { xb: x0, xt: x0 }).total < 40, '4.6', 'untouched handles score low', p);
    ok(M.score(p, { xb: s.Qlo, xt: s.Qlo }).total < 90, '4.6', 'forgetting the triangle is not "spot on"', p);
    // symmetric-difference area against a numerical scan, for a random guess
    const g = { xb: rng() * D.X, xt: rng() * D.X }, h = s.Phi - s.Plo; let num = 0;
    for (let k = 0; k < 2000; k++) { const t = (k + 0.5) / 2000, xg = g.xb + (g.xt - g.xb) * t, xtr = s.Qhi + (s.Qlo - s.Qhi) * t; num += Math.abs(xg - xtr) * h / 2000; }
    ok(close(M.symdiff(p, g), num, 1e-3 * Math.max(1, num)), '4.6', 'shaded-area error matches numerics', Object.assign({ g: g }, p));
  }
  ok(rises > N / 4 * 0.5 && rises < N / 4 * 0.9, '4.6', 'mix of rises and falls (' + rises + ')', {});
  report('4.6 surplus', N / 4);
})();

/* 4.7 surge pricing */
(function () {
  const M = W.surge, d = M.defaults(), s0 = M.solve(d);
  ok(s0.TRn === 150 && s0.Pm === 10 && s0.TRm === 200 && s0.Pb === 15 && s0.TRb === 150 && s0.CSn === 225 && s0.CSb === 25 && s0.Qn === 30, '4.7', 'defaults', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), qf = P => Qlin(p.a, p.b, P);
    let best = -1, bp = 0, hiOK = 0;
    for (let k = 0; k <= 20000; k++) { const P = s.c * k / 20000, tr = P * qf(P); if (tr > best) { best = tr; bp = P; } if (tr >= s.TRn - 1e-9) hiOK = P; }
    ok(close(bp, s.Pm, s.c / 10000), '4.7', 'brute-force revenue peak', p);
    ok(close(hiOK, s.Pb, s.c / 10000 + 1e-9), '4.7', 'highest fare with revenue >= normal', p);
    ok(close(s.TRb, s.TRn, 1e-9), '4.7', 'revenue back to normal at Pb', p);
    ok(s.CSb < s.CSm && s.CSm < s.CSn, '4.7', 'surplus falls as the fare rises', p);
    ok(fits(D, p.a, s.c), '4.7', 'line fits the frame', D);
    ok(M.score(p, { m: s.Pm, bk: s.Pb }).total === 100, '4.7', 'perfect scores 100', p);
    ok(M.score(p, { m: p.Pn, bk: p.Pn }).total < 40, '4.7', 'untouched start scores low', p);
  }
  report('4.7 surge', N);
})();

/* 4.8 market demand */
(function () {
  const M = W.market, d = M.defaults(), s0 = M.solve(d);
  ok(s0.top === 30 && s0.Pk === 12 && s0.Qk === 18 && s0.Qsum === 54 && s0.bsum === 3 && s0.ah === 30 && s0.bh === 1, '4.8', 'defaults: kink $12, Q 18; Qm = 54 - 3P', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const qm = P => Qlin(p.a1, p.b1, P) + Qlin(p.a2, p.b2, P);
    ok(qm(s.top) === 0 && qm(s.top - 0.01) > 0, '4.8', 'market starts at the higher choke price', p);
    ok(close(qm(0), s.Qsum) && close(qm(s.Pk), s.Qk), '4.8', 'end point and kink by summation', p);
    const h = 1e-4, above = (qm(s.Pk + 2 * h) - qm(s.Pk + h)) / h, below = (qm(s.Pk - h) - qm(s.Pk - 2 * h)) / h;
    ok(close(above, -s.bh, 1e-6) && close(below, -s.bsum, 1e-6), '4.8', 'slopes either side of the kink', p);
    ok(close(s.ah - s.bh * ((s.top + s.Pk) / 2), qm((s.top + s.Pk) / 2)) && close(s.Qsum - s.bsum * s.Pk / 2, qm(s.Pk / 2)), '4.8', 'segment equations match the sum', p);
    ok(s.Qsum <= 0.95 * D.X && s.top <= 0.95 * D.Y && D.X / D.xs <= 7 && D.Y / D.ys <= 7, '4.8', 'fits frame', D);
    ok(M.score(p, { top: s.top, kx: s.Qk, ky: s.Pk, bot: s.Qsum }).total === 100, '4.8', 'perfect scores 100', p);
    const st = M.start(D);
    ok(M.score(p, st).total < 45, '4.8', 'untouched handles score low', Object.assign({ st: st }, p));
  }
  report('4.8 market', N);
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
