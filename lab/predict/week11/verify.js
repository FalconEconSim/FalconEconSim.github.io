/* Verifies every Week 11 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week11/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: intersections by bisection on the raw curves, deadweight losses and abatement
 * costs and Coase payments by numerical integration, the cheapest cap-and-trade split by brute-force
 * grid search, the waste triangle = extra cost, the public-good outcome by checking each neighbor's
 * best reply, frame fit, perfect guesses score 100, classic wrong answers and untouched starts score
 * low, answers reachable on the input grid, defaults equal week11-viz.html. Float tolerance 1e-6. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 1111;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
function report(name, n, extra) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(14) + n + ' draws' + (extra ? '  ' + extra : '')); }
// root of f on [a, b] by bisection (f changes sign)
function root(f, a, b) { let fa = f(a); for (let k = 0; k < 200; k++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
// midpoint-rule integral
function integ(f, a, b, n) { n = n || 4000; let s = 0; const h = (b - a) / n; for (let k = 0; k < n; k++) s += f(a + (k + 0.5) * h) * h; return s; }
function ticksOK(D) { return D.Y / D.ys <= 8 + 1e-9 && Number.isInteger(Math.round(D.Y / D.ys * 1e9) / 1e9); }

/* 11.1 negative externality, Pigouvian tax */
(function () {
  const M = W.pigou, d = M.defaults(), s0 = M.solve(d);
  ok(s0.QE === 45 && s0.PE === 55 && s0.Qs === 35 && s0.Ps === 65 && s0.dwl === 100 && s0.tax === 20 && s0.keep === 45 && s0.smcE === 75, '11.1', 'defaults: 45 at $55, 35 at $65, DWL $100, tax $20', s0);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); seen.add(JSON.stringify(p));
    const MB = q => p.a - q, PMC = q => p.c + q, SMC = q => p.c + q + p.m;
    const qe = root(q => PMC(q) - MB(q), 0, p.a), qs = root(q => SMC(q) - MB(q), 0, p.a);
    ok(close(qe, s.QE) && close(MB(qe), s.PE), '11.1', 'market where PMC = MB', p);
    ok(close(qs, s.Qs) && close(MB(qs), s.Ps), '11.1', 'optimum where SMC = MB', p);
    ok(close(integ(q => SMC(q) - MB(q), qs, qe), s.dwl, 1e-6 * Math.max(1, s.dwl)), '11.1', 'DWL = integral of SMC - MB over [Q*, QE]', p);
    ok(close(0.5 * (s.QE - s.Qs) * (s.smcE - MB(s.QE)), s.dwl), '11.1', 'DWL = 1/2 base x height (textbook)', p);
    // a tax equal to MEC moves the market to Q*: PMC + t = MB
    const qt = root(q => PMC(q) + s.tax - MB(q), 0, p.a);
    ok(close(qt, s.Qs) && close(M.withTax(p, s.tax).dwl, 0) && close(s.keep, MB(qt) - s.tax), '11.1', 'tax = MEC lands on Q*, no DWL, firms keep P - t', p);
    const t = Math.round(rng() * (p.a - p.c)), w = M.withTax(p, t), qn = root(q => PMC(q) + t - MB(q), 0, p.a);
    ok(close(w.Q, qn, 1e-6) && close(w.dwl, Math.abs(integ(q => SMC(q) - MB(q), Math.min(qn, qs), Math.max(qn, qs))), 1e-4 * Math.max(1, w.dwl)), '11.1', 'any tax: quantity and DWL by integration', Object.assign({ t: t }, p));
    ok(Number.isInteger(s.QE) && Number.isInteger(s.Qs) && Number.isInteger(s.Ps), '11.1', 'answers on the whole-number grid', p);
    ok(s.QE <= 0.95 * D.X && s.Ps <= 0.9 * D.Y && p.a <= D.Y && ticksOK(D), '11.1', 'fits the frame', D);
    const xq = M.xq(p);
    ok(xq > 0 && Math.abs(xq - s.Qs) >= 0.1 * p.a - 1e-9 && p.c + xq + M.mMax(p) <= D.Y, '11.1', 'tax handle clear of Q* and inside the frame', Object.assign({ xq: xq }, p));
    ok(M.score(p, { mk: { x: s.QE, y: s.PE }, op: { x: s.Qs, y: s.Ps }, t: s.tax }).total === 100, '11.1', 'perfect scores 100', p);
    ok(M.score(p, { mk: { x: s.QE, y: s.PE }, op: { x: s.QE, y: s.PE }, t: 0 }).total < 60, '11.1', 'ignoring the harm is not "very close"', p);
  }
  report('11.1 pigou', N, seen.size + ' distinct rounds');
})();

/* 11.2 cap-and-trade */
(function () {
  const M = W.cap, d = M.defaults(), s0 = M.solve(d);
  ok(s0.eA === 80 && s0.eB === 20 && s0.lam === 160 && s0.ct === 8000 && s0.eq === 12500 && s0.save === 4500 && Math.round(100 * s0.pct) === 36, '11.2', 'defaults: 80 / 20, $160, $8,000 vs $12,500, 36%', s0);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); seen.add(JSON.stringify(p));
    const costN = x => integ(e => p.al * e, 0, x, 400) + integ(e => p.be * e, 0, p.T - x, 400);   // areas under each MAC
    let best = Infinity, bx = 0;
    for (let k = 0; k <= 4000; k++) { const x = p.T * k / 4000, c = M.cost(p, x); if (c < best) { best = c; bx = x; } }
    ok(close(bx, s.eA, p.T / 4000) && close(best, s.ct, 1e-6 * s.ct), '11.2', 'brute-force cheapest split', p);
    ok(close(costN(s.eA), s.ct, 1e-6 * s.ct) && close(costN(p.T / 2), s.eq, 1e-6 * s.eq), '11.2', 'costs by integrating each MAC', p);
    ok(close(p.al * s.eA, p.be * s.eB) && close(p.al * s.eA, s.lam) && close(s.eA + s.eB, p.T), '11.2', 'MACs equal at the permit price, target met', p);
    ok(s.save > 0 && (s.eA > s.eB) === (p.al < p.be), '11.2', 'cheaper firm does more, trading saves money', p);
    // the red sliver between the two MAC lines from e_A* to any x is exactly the extra cost
    const x = Math.round(rng() * p.T), A = e => p.al * e, B = e => p.be * (p.T - e);
    const tri = 0.5 * Math.abs(x - s.eA) * Math.abs(A(x) - B(x));
    ok(close(tri, M.cost(p, x) - s.ct, 1e-6 * Math.max(1, s.ct)), '11.2', 'waste triangle = extra cost', Object.assign({ x: x }, p));
    ok(s.lam <= 0.6 * D.Y && ticksOK(D) && D.X / D.xs <= 7 + 1e-9, '11.2', 'fits the frame', D);
    ok(Number.isInteger(s.eA), '11.2', 'answer on the whole-unit grid', p);
    ok(M.score(p, { x: s.eA }).total === 100, '11.2', 'perfect scores 100', p);
    ok(M.score(p, { x: p.T / 2 }).total < 70, '11.2', 'equal split is not "very close"', p);
  }
  // explore: any total from 20 to 150 keeps the picture valid
  for (let T = 20; T <= 150; T += 5) { const p = { al: 2, be: 8, T: T }, s = M.solve(p), D = M.domain(p); ok(s.lam <= 0.6 * D.Y && D.X / D.xs <= 7 + 1e-9, '11.2', 'explore total ' + T + ' fits', D); }
  report('11.2 cap', N, seen.size + ' distinct rounds');
})();

/* 11.3 positive externality, Pigouvian subsidy */
(function () {
  const M = W.pos, d = M.defaults(), s0 = M.solve(d);
  ok(s0.QE === 45 && s0.PE === 55 && s0.Qs === 55 && s0.Ps === 65 && s0.dwl === 100 && s0.sub === 20, '11.3', 'defaults: 45, Q* 55, DWL $100, subsidy $20', s0);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); seen.add(JSON.stringify(p));
    const MB = q => p.a - q, MC = q => p.c + q, MSB = q => p.a - q + p.m;
    const qe = root(q => MB(q) - MC(q), 0, p.a), qs = root(q => MSB(q) - MC(q), 0, p.a + p.m);
    ok(close(qe, s.QE) && close(qs, s.Qs) && close(MC(qs), s.Ps), '11.3', 'market MB = MC, optimum MSB = MC', p);
    ok(close(integ(q => MSB(q) - MC(q), qe, qs), s.dwl, 1e-6 * Math.max(1, s.dwl)), '11.3', 'DWL by integration', p);
    const qsub = root(q => MB(q) + s.sub - MC(q), 0, p.a + p.m);
    ok(close(qsub, s.Qs) && close(M.withSub(p, s.sub).dwl, 0), '11.3', 'subsidy = MEB lands on Q*', p);
    const sb = Math.round(rng() * 40), w = M.withSub(p, sb), qn = root(q => MB(q) + sb - MC(q), 0, p.a + 40);
    ok(close(w.Q, qn) && close(w.dwl, Math.abs(integ(q => MSB(q) - MC(q), Math.min(qn, qs), Math.max(qn, qs))), 1e-4 * Math.max(1, w.dwl)), '11.3', 'any subsidy: quantity and DWL', Object.assign({ s: sb }, p));
    // frame: MSB for any explore MEB up to $40 stays inside; Q* inside
    ok(p.a + M.mMax <= D.Y && (p.a - p.c + M.mMax) / 2 <= 0.95 * D.X && s.QE >= 0.3 * D.X && ticksOK(D), '11.3', 'fits the frame for MEB 0..40', D);
    ok(Number.isInteger(s.Qs), '11.3', 'Q* on the whole-unit grid', p);
    const bins = 40, bw = D.X / bins, perfect = [], mbOnly = [];
    for (let k = 0; k <= bins; k++) { perfect.push({ x: k * bw, y: Math.min(D.Y, MSB(k * bw)) }); mbOnly.push({ x: k * bw, y: MB(k * bw) }); }
    ok(M.score(p, { draw: perfect, q: s.Qs }).total === 100, '11.3', 'perfect scores 100', p);
    ok(M.score(p, { draw: mbOnly, q: s.QE }).total < 45, '11.3', 'forgetting the external benefit scores low', p);
  }
  report('11.3 subsidy', N, seen.size + ' distinct rounds');
})();

/* 11.4 public good */
(function () {
  const M = W.pub, d = M.defaults(), s0 = M.solve(d);
  ok(s0.total === 360 && s0.worth && !s0.alone && !s0.built && s0.lost === 60 && s0.outcome === 'freeride', '11.4', 'defaults: $360 > $300, $120 < $300, $60 lost', s0);
  const out = { alone: 0, freeride: 0, none: 0 }, seen = new Set();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); seen.add(JSON.stringify(p)); out[s.outcome]++;
    // vertical summation: everyone enjoys the same light, so add willingness to pay
    let sum = 0; for (let k = 0; k < p.N; k++) sum += p.v; ok(sum === s.total, '11.4', 'vertical sum', p);
    ok(s.worth === (sum - p.c > 0), '11.4', 'worth building iff total surplus > 0', p);
    // each neighbor deciding alone: buying is a best reply to nobody buying iff v - c >= 0
    const someoneBuys = p.v - p.c >= 0;
    ok(s.built === someoneBuys, '11.4', 'built iff a lone buyer gains', p);
    // with v < c, (nobody buys) is a Nash equilibrium: no one gains by deviating
    if (!someoneBuys) ok(p.v - p.c < 0, '11.4', 'no profitable deviation', p);
    ok(close(s.lost, s.worth && !s.built ? sum - p.c : 0), '11.4', 'surplus lost to free-riding', p);
    ok(p.N >= 1 && p.N <= 8 && p.v >= 0 && p.v <= 200 && p.c === 300, '11.4', 'inside the site slider ranges', p);
    ok(s.total <= 0.9 * D.Y && p.c <= 0.9 * D.Y && ticksOK(D), '11.4', 'fits the frame', D);
    ok(s.total - p.v >= 0.15 * D.Y, '11.4', 'the two answers are clearly apart', Object.assign({ Y: D.Y }, p));
    ok(W.util.isMult(s.total, 10) && W.util.isMult(p.v, 10), '11.4', 'answers on the $10 grid', p);
    ok(M.score(p, { w: s.total, b: p.v }).total === 100, '11.4', 'perfect scores 100', p);
    ok(M.score(p, { w: s.total, b: s.total }).total <= 60, '11.4', '"they buy it together" (no free-riding) is not close', p);
    ok(M.score(p, { w: p.v, b: p.v }).total <= 60, '11.4', '"only my own value counts" is not close', p);
  }
  // explore: every slider setting of the site fits the rescaled frame
  for (let n = 1; n <= 8; n++) for (let v = 0; v <= 200; v += 10) { const p = { N: n, v: v, c: 300 }, D = M.domain(p); ok(n * v <= 0.9 * D.Y && ticksOK(D), '11.4', 'explore N ' + n + ' v ' + v + ' fits', D); }
  ok(out.freeride > N * 0.4 && out.none > N * 0.05, '11.4', 'mix of outcomes ' + JSON.stringify(out), {});
  report('11.4 public', N, seen.size + ' distinct rounds ' + JSON.stringify(out));
})();

/* 11.5 Coase */
(function () {
  const M = W.coase, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Smax === 50 && s0.Ss === 25 && s0.price === 50 && s0.fLoss === 625 && s0.nSave === 1875 && s0.nHarm === 625 && s0.fGain === 1875, '11.5', 'defaults: S* 25 at $50, $625 to $1,875 either way', s0);
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p); seen.add(JSON.stringify(p));
    const MB = S => p.a - p.b * S, MD = S => p.d * S;
    ok(close(root(S => MB(S), 0, 1000), s.Smax), '11.5', 'factory alone pollutes until MB = 0', p);
    const ss = root(S => MB(S) - MD(S), 0, s.Smax);
    ok(close(ss, s.Ss) && close(MD(ss), s.price), '11.5', 'S* where MB = MD', p);
    ok(close(integ(MB, s.Ss, s.Smax), s.fLoss, 1e-6 * s.fLoss) && close(integ(MD, s.Ss, s.Smax), s.nSave, 1e-6 * s.nSave), '11.5', 'factory right: payment range by integration', p);
    ok(close(integ(MD, 0, s.Ss), s.nHarm, 1e-6 * s.nHarm) && close(integ(MB, 0, s.Ss), s.fGain, 1e-6 * s.fGain), '11.5', 'neighbor right: payment range by integration', p);
    ok(s.fLoss < s.nSave && s.nHarm < s.fGain, '11.5', 'a deal that helps both exists from either start', p);
    // from any S other than S*, one more step toward S* gains more for one side than it costs the other
    const S1 = rng() * s.Smax;
    if (Math.abs(S1 - s.Ss) > 1e-3) ok(S1 > s.Ss ? MD(S1) > MB(S1) : MB(S1) > MD(S1), '11.5', 'gains from trade point toward S*', Object.assign({ S: S1 }, p));
    ok(p.a <= D.Y && MD(s.Smax) <= D.Y && s.price <= 0.9 * D.Y && ticksOK(D) && D.X / D.xs <= 8 + 1e-9, '11.5', 'fits the frame', D);
    ok(W.util.isMult(s.Ss, 0.5), '11.5', 'S* on the 0.5 rail grid', p);
    ok(M.score(p, { f: s.Ss, n: s.Ss }).total === 100, '11.5', 'perfect scores 100', p);
    ok(M.score(p, { f: s.Smax, n: 0 }).total < 10, '11.5', 'untouched markers score low', p);
    ok(M.score(p, { f: s.Smax, n: s.Ss }).total <= 50, '11.5', '"the owner keeps its way" half scores half', p);
  }
  report('11.5 coase', N, seen.size + ' distinct rounds');
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
