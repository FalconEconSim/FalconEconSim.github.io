/* Verifies every Week 2 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week2/verify.js   (prints a line per figure, exits 1 on any failure)
 * Independent checks: brute-force grid maximization of utility on the budget line, numerical
 * derivatives for MRS and tangency, sign scans for "curves never cross", budget identities,
 * frame fit, perfect guesses score 100, defaults equal week2-viz.html. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 12345;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const half = v => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
const cdU = (a, x, y) => Math.pow(x, a) * Math.pow(y, 1 - a);
// brute force: best Cobb-Douglas bundle on the line, scanning dollars on X
function bruteCD(a, I, Px, Py) {
  let best = -1, bx = 0;
  for (let i = 1; i < 8000; i++) { const s = I * i / 8000, x = s / Px, y = (I - s) / Py, u = cdU(a, x, y); if (u > best) { best = u; bx = x; } }
  return bx;
}
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(10) + n + ' draws'); }

/* 2.1 */
(function () {
  const M = W.prefs, d = M.defaults();
  ok(d.type === 'cobb' && d.a === 0.5 && close(M.solve(d).U, 2), '2.1', 'default U0 = 2', d);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), pts = s.pts;
    seen[p.type] = 1;
    ok(M.gap(p, { x: p.x0, y: p.y0 }).d < 0.02, '2.1', 'curve passes through P', p);
    // every in-frame point of the curve has the same utility as P
    pts.filter(Boolean).forEach(q => { if (q[0] > 0.2 && q[0] < 10 && q[1] > 0.2 && q[1] < 10) ok(close(M.U(p, q[0], q[1]), s.U, 1e-6 * Math.max(1, s.U) + (p.type === 'cobb' ? 1e-6 : 0)), '2.1', 'U constant on curve', p); });
    // the frame shows at least three well spread bundles on the curve, away from P
    const cand = [];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k]; if (!a || !b) continue;
      for (let t = 0; t < 1; t += 0.02) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (x > 0.4 && x < 9.6 && y > 0.4 && y < 9.6 && Math.hypot(x - p.x0, y - p.y0) > 1) cand.push([x, y]); }
    }
    const pick = []; cand.forEach(c => { if (pick.length < 3 && pick.every(q => Math.hypot(q[0] - c[0], q[1] - c[1]) > 1)) pick.push(c); });
    ok(pick.length === 3, '2.1', 'three spread bundles available', p);
    if (pick.length === 3) {
      const g = { b1: { x: pick[0][0], y: pick[0][1] }, b2: { x: pick[1][0], y: pick[1][1] }, b3: { x: pick[2][0], y: pick[2][1] } };
      ok(M.score(p, g).total === 100, '2.1', 'perfect bundles score 100', p);
    }
    // a bundle the consumer strictly prefers is off the curve, so it does not score full
    const v = M.better(p), off = { x: p.x0 + v[0] * 2, y: p.y0 + v[1] * 2 };
    ok(M.U(p, off.x, off.y) > s.U, '2.1', '"better" arrow points to higher utility', p);
    ok(M.gap(p, off).d > 0.5, '2.1', 'a better bundle is off the IC', p);
  }
  ok(Object.keys(seen).length === 5, '2.1', 'all five preference types drawn', seen);
  report('2.1 prefs', N);
})();

/* 2.3 */
(function () {
  const M = W.budget, d = M.defaults(), s0 = M.solve(d);
  ok(s0.xI === 20 && s0.yI === 25 && s0.slope === -1.25, '2.3', 'defaults 20 / 25 / -1.25', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    ok(close(p.Px * s.xI, p.I) && close(p.Py * s.yI, p.I), '2.3', 'intercepts exhaust income', p);
    ok(close(s.slope, -(s.yI / s.xI)), '2.3', 'slope = rise over run', p);
    ok(s.xI <= 0.85 * D.X && s.yI <= 0.85 * D.Y, '2.3', 'line fits the frame', p);
    ok(Math.abs(s.xI - M.START) >= 3 && Math.abs(s.yI - M.START) >= 3 || !i, '2.3', 'handles do not start on the answer', p);
    ok(M.score(p, { x: s.xI, y: s.yI }).total === 100, '2.3', 'perfect scores 100', p);
    ok(M.score(p, { x: M.START, y: M.START }).total < 60, '2.3', 'untouched handles score low', p);
    ok(half(s.xI) && half(s.yI) || !i, '2.3', 'answers on the 0.5 snap grid', p);
    ok(D.X / D.xs <= 8 && Number.isInteger(D.X / D.xs), '2.3', 'ticks', D);
  }
  report('2.3 budget', N);
})();

/* 2.4 */
(function () {
  const M = W.shift, d = M.defaults(), s0 = M.solve(d);
  ok(s0.xI1 === 26 && s0.yI1 === 32.5 && s0.slope1 === -1.25, '2.4', 'default income up 30%', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), c = M.CHANGES[p.type], D = M.domain(p);
    ok(close(s.Px * s.xI1, s.I) && close(s.Py * s.yI1, s.I), '2.4', 'new intercepts exhaust new income', p);
    if (c.what === 'Px') ok(close(s.yI1, 25) && !close(s.slope1, -1.25), '2.4', 'PX change pivots on the Y end', p);
    if (c.what === 'Py') ok(close(s.xI1, 20) && !close(s.slope1, -1.25), '2.4', 'PY change pivots on the X end', p);
    if (c.what === 'I') ok(close(s.slope1, -1.25) && close(s.xI1 / 20, s.yI1 / 25), '2.4', 'income change is parallel', p);
    const k = 1 + c.dir * p.m / 100, base = { I: 100, Px: 5, Py: 4 }[c.what];
    ok(close(s[c.what], base * k), '2.4', 'magnitude applied', p);
    ok(Math.max(s.xI1, s.yI1, 25) <= 0.85 * D.X, '2.4', 'both lines fit', p);
    ok(half(s.xI1) && half(s.yI1), '2.4', 'answers on the 0.5 snap grid', p);
    ok(M.score(p, { x: s.xI1, y: s.yI1 }).total === 100, '2.4', 'perfect scores 100', p);
    ok(M.score(p, { x: 20, y: 25 }).total < 100, '2.4', 'untouched handles are not perfect', p);
  }
  report('2.4 shift', N);
})();

/* 2.5 */
(function () {
  const M = W.optimum, d = M.defaults(), s0 = M.solve(d);
  ok(s0.xs === 8 && s0.ys === 10 && close(s0.U, Math.sqrt(80), 1e-9), '2.5', 'defaults X* 8, Y* 10 (film)', s0);
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const bx = bruteCD(p.a, p.I, p.Px, p.Py);
    ok(close(bx, s.xs, 0.004 * s.xI), '2.5', 'brute-force optimum matches X*', p);
    ok(close(p.Px * s.xs + p.Py * s.ys, p.I, 1e-9), '2.5', 'optimum on the budget line', p);
    // tangency by numerical derivative of the IC at X*
    const h = 1e-5, slope = (M.ic(p, s.U, s.xs + h) - M.ic(p, s.U, s.xs - h)) / (2 * h);
    ok(close(-slope, p.Px / p.Py, 1e-4), '2.5', 'IC slope = -PX/PY at X*', p);
    ok(Math.max(s.xI, s.yI) <= 0.86 * D.X, '2.5', 'fits frame', p);
    ok(M.score(p, { pt: { x: s.xs, y: s.ys } }).total === 100, '2.5', 'perfect scores 100', p);
    // the drawn background ICs: 1.22 and 1.5 x U* never reach the line, 0.6 and 0.82 cut it
    let minHi = Infinity, minLo = Infinity;
    for (let x = s.xI * 0.001; x < s.xI; x += s.xI / 2000) { const yl = (p.I - p.Px * x) / p.Py; minHi = Math.min(minHi, M.ic(p, s.U * 1.22, x) - yl); minLo = Math.min(minLo, M.ic(p, s.U * 0.82, x) - yl); }
    ok(minHi > 0 && minLo < 0, '2.5', 'background ICs sit either side of the optimum', p);
    ok(half(s.xs) && half(s.ys), '2.5', 'tidy answers', p);
  }
  report('2.5 optimum', N / 4);
})();

/* 2.6 */
(function () {
  const M = W.mupd, d = M.defaults(), s0 = M.solve(d);
  ok(s0.ss === 50 && s0.xs === 10 && s0.ys === 12.5 && close(s0.start.rx, 0.2236, 1e-4) && close(s0.start.ry, 0.0559, 1e-4), '2.6', 'defaults', s0);
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    const bx = bruteCD(p.a, p.I, p.Px, p.Py);
    ok(close(bx * p.Px, s.ss, 0.01 * p.I), '2.6', 'brute-force best split', p);
    ok(close(s.star.rx, s.star.ry, 1e-9), '2.6', 'MU per dollar equal at the optimum', p);
    // marginal utility by finite differences, independent of the closed form
    const h = 1e-6, b = s.start, uX = (cdU(p.a, b.x + h, b.y) - cdU(p.a, b.x - h, b.y)) / (2 * h), uY = (cdU(p.a, b.x, b.y + h) - cdU(p.a, b.x, b.y - h)) / (2 * h);
    ok(close(uX / p.Px, b.rx, 1e-5) && close(uY / p.Py, b.ry, 1e-5), '2.6', 'MU/P at B matches numerics', p);
    ok(Math.sign(b.rx - b.ry) === s.dir, '2.6', 'direction follows the bigger MU per dollar', p);
    ok(Math.max(s.xI, s.yI) <= D.X, '2.6', 'fits frame', p);
    ok(M.score(p, { s: s.ss }).total === 100, '2.6', 'perfect scores 100', p);
    ok(M.score(p, { s: p.s0 - 10 * s.dir }).total < 50, '2.6', 'wrong way scores low', p);
  }
  report('2.6 mupd', N / 4);
})();

/* 2.8 */
(function () {
  const M = W.mrs, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.y0, 10) && close(s0.mrs0, 4) && close(s0.xt, 5) && close(s0.yt, 5), '2.8', 'defaults P (2.5, 10), MRS 4; MRS 1 at (5, 5)', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), h = 1e-6;
    const d0 = (M.y(p, p.x0 + h) - M.y(p, p.x0 - h)) / (2 * h), dt = (M.y(p, s.xt + h) - M.y(p, s.xt - h)) / (2 * h);
    ok(close(-d0, s.mrs0, 1e-4 * Math.max(1, s.mrs0)), '2.8', 'MRS at P = -slope of the IC', p);
    ok(close(-dt, p.m, 1e-4), '2.8', 'MRS at target = m', p);
    ok(close(cdU(p.a, p.x0, s.y0), p.U, 1e-9) && close(cdU(p.a, s.xt, s.yt), p.U, 1e-9), '2.8', 'points on U', p);
    ok(s.y0 <= 16 && s.yt <= 16 && s.xt <= 16, '2.8', 'in frame', p);
    ok(M.score(p, { m: s.mrs0, q: s.xt }).total === 100, '2.8', 'perfect scores 100', p);
    ok(M.score(p, { m: 1, q: M.QSTART }).total < 90, '2.8', 'untouched start is not near perfect', p);
  }
  report('2.8 mrs', N);
})();

/* 2.9 */
(function () {
  const M = W.cross, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.UA, 7) && close(s0.UB, Math.sqrt(12)), '2.9', 'defaults: IC through A at U = 7', s0);
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p);
    // the two true curves never cross: sign scan
    let sign = 0, crossed = false;
    for (let x = 0.01; x <= 16; x += 0.01) { const v = Math.sign(M.y(p, s.UB, x) - M.y(p, s.UA, x)); if (!sign) sign = v; else if (v && v !== sign) crossed = true; }
    ok(!crossed && sign === (s.higher ? 1 : -1), '2.9', 'same-taste ICs never cross', p);
    // a perfect drawing (the bins on the true curve) scores near 100 and is not flagged as crossing
    const nb = 48, bw = 16 / nb, drawn = [];
    for (let k = 0; k <= nb; k++) { const x = k * bw, y = M.y(p, s.UB, x); drawn.push(x > 0 && y <= 16 ? { x: x, y: y } : null); }
    const sc = M.score(p, { drawn: drawn });
    ok(sc.total >= 95 && !sc.crossed, '2.9', 'perfect drawing scores 95+', Object.assign({ sc: sc.total }, p));
    // a straight line through B that is steep enough to cut A's curve is flagged
    const steep = []; for (let k = 0; k <= nb; k++) { const x = k * bw, y = p.yB + (s.higher ? -6 : 6) * (x - p.xB); steep.push(y >= 0 && y <= 16 ? { x: x, y: y } : null); }
    const hits = M.crossings(p, steep);
    hits.forEach(h => ok(close(h.y, M.y(p, s.UA, h.x), 1e-6), '2.9', 'crossing point lies on A\'s curve', p));
    ok(M.span(p, s.UB)[1] - M.span(p, s.UB)[0] >= 7, '2.9', 'B curve spans the frame', p);
  }
  report('2.9 cross', N / 4);
})();

/* 2.10 */
(function () {
  const M = W.corner, d = M.defaults(), s0 = M.solve(d);
  ok(s0.side === 'y' && s0.xs === 0 && s0.ys === 20, '2.10', 'default: all Y, (0, 20)', s0);
  ok(M.solve({ I: 80, Px: 4, Py: 4, a: 3, b: 3 }).knife, '2.10', 'the site default PX = 4 is the knife edge', {});
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    let best = -1, bx = 0;
    for (let k = 0; k <= 4000; k++) { const x = s.xI * k / 4000, y = (p.I - p.Px * x) / p.Py, u = p.a * x + p.b * y; if (u > best + 1e-12) { best = u; bx = x; } }
    ok(close(bx, s.xs, 1e-9), '2.10', 'brute-force corner', p);
    ok(close(best, s.U, 1e-9), '2.10', 'utility at the corner', p);
    ok(!s.knife && (s.rX > s.rY) === (s.side === 'x'), '2.10', 'corner follows MU per dollar', p);
    ok(Math.max(s.xI, s.yI) <= 0.85 * D.X, '2.10', 'fits frame', p);
    ok(M.score(p, { pt: { x: s.xs, y: s.ys } }).total === 100, '2.10', 'perfect scores 100', p);
    ok(M.score(p, { pt: { x: s.side === 'x' ? 0 : s.xI, y: s.side === 'x' ? s.yI : 0 } }).total === 0, '2.10', 'wrong corner scores 0', p);
  }
  report('2.10 corner', N);
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
