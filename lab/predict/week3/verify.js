/* Verifies every Week 3 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week3/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: brute-force utility maximization on the budget line, brute-force expenditure
 * minimization on the original curve (the compensated bundle C), numerical tangency slopes,
 * SE + IE = TE, budget identities, demand-shift directions, scenario answer keys, frame fit,
 * perfect guesses score 100, defaults equal week3-viz.html and the films. Float tolerance 1e-6
 * unless a check says otherwise. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 4242;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
const cdU = (a, x, y) => Math.pow(x, a) * Math.pow(y, 1 - a);
// brute force: best Cobb-Douglas bundle on a budget line, scanning dollars on X
function bruteCD(a, I, Px, Py) {
  let best = -1, bx = 0;
  for (let i = 1; i < 8000; i++) { const s = I * i / 8000, x = s / Px, y = (I - s) / Py, u = cdU(a, x, y); if (u > best) { best = u; bx = x; } }
  return bx;
}
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(12) + n + ' draws'); }

/* 3.1 */
(function () {
  const M = W.derive, d = M.defaults(), s0 = M.solve(d);
  ok(s0.X0 === 5 && s0.X1 === 15 && s0.Ys === 10, '3.1', 'defaults: $6 -> 5, $2 -> 15, Y* = 10', s0);
  ok([6, 4, 2, 1].map(P => M.xAt(d, P)).join() === '5,7.5,15,30', '3.1', 'page steps 6,4,2,1 -> 5,7.5,15,30', {});
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    ok(close(bruteCD(p.a, p.I, p.P1, p.Py), s.X1, 0.004 * s.xI1), '3.1', 'brute-force optimum at new price', p);
    ok(close(bruteCD(p.a, p.I, p.P0, p.Py), s.X0, 0.004 * s.xI0), '3.1', 'brute-force optimum at old price', p);
    ok(close(p.P1 * s.X1 + p.Py * s.Ys, p.I) && close(p.P0 * s.X0 + p.Py * s.Ys, p.I), '3.1', 'optima on their budget lines', p);
    const h = 1e-5, sl = (M.ic(p, s.U1, s.X1 + h) - M.ic(p, s.U1, s.X1 - h)) / (2 * h);
    ok(close(-sl, p.P1 / p.Py, 1e-4), '3.1', 'tangency at the new optimum', p);
    ok(close(s.X1 * p.P1, s.k) && close(s.X0 * p.P0, s.k), '3.1', 'both points on D: X = k / P', p);
    ok(Math.sign(s.X1 - s.X0) === -Math.sign(p.P1 - p.P0), '3.1', 'law of demand', p);
    ok(s.X1 <= 0.8 * D.X && s.X0 <= 0.8 * D.X && s.Ys <= 0.8 * D.Yt && Math.max(p.P0, p.P1) <= 0.85 * D.P, '3.1', 'fits both panels', p);
    ok(D.X / D.xs <= 8 && Number.isInteger(D.X / D.xs) && D.Yt / D.yts <= 5, '3.1', 'ticks', D);
    // background ICs bracket the new optimum: 1.22 x U1 never reaches the new line, 0.82 x U1 cuts it
    let minHi = Infinity, minLo = Infinity;
    for (let x = s.xI1 * 0.001; x < s.xI1; x += s.xI1 / 2000) { const yl = (p.I - p.P1 * x) / p.Py; minHi = Math.min(minHi, M.ic(p, s.U1 * 1.22, x) - yl); minLo = Math.min(minLo, M.ic(p, s.U1 * 0.82, x) - yl); }
    ok(minHi > 0 && minLo < 0, '3.1', 'background ICs either side of the optimum', p);
    ok(M.score(p, { opt: { x: s.X1, y: s.Ys }, dem: { x: s.X1, p: p.P1 } }).total === 100, '3.1', 'perfect scores 100', p);
    ok(M.score(p, { opt: { x: s.X0, y: s.Ys }, dem: { x: s.X0, p: p.P0 } }).total < 70, '3.1', 'staying at A scores under 70', p);
  }
  report('3.1 derive', N / 4);
})();

/* 3.2 */
(function () {
  const M = W.slutsky, d = M.defaults(), s0 = M.solve(d);
  ok(s0.XA === 10 && s0.YA === 10 && s0.XB === 20 && close(s0.XC, 14.1421356, 1e-6) && close(s0.YC, 7.0710678, 1e-6), '3.2', 'defaults A (10,10), C (14.14, 7.07), B (20,10)', s0);
  ok(s0.SE.toFixed(2) === '4.14' && s0.IE.toFixed(2) === '5.86' && close(s0.TE, 10), '3.2', 'film: SE +4.14, IE +5.86, TE +10', s0);
  // the page's own formula (a = 0.5 only): XC = XA sqrt(PxOld / PxNew), YC = XC PxNew / Py
  for (let P = 1.25; P <= 6; P += 0.25) { const p = Object.assign({}, d, { P1: P }), s = M.solve(p); ok(close(s.XC, s.XA * Math.sqrt(3 / P)) && close(s.YC, s.XC * P / 3), '3.2', 'matches week3-viz computeV2 over its slider', p); }
  for (let i = 0; i < N / 4; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p).X;
    // C by brute force: the cheapest bundle on U1 at the new prices
    let best = Infinity, bx = 0;
    for (let k = 1; k < 20000; k++) { const x = 4 * D * k / 20000, y = M.ic(p, s.UA, x), e = p.P1 * x + p.Py * y; if (e < best) { best = e; bx = x; } }
    ok(close(bx, s.XC, 0.002 * D) && close(best, s.Mc, 1e-3 * s.Mc), '3.2', 'brute-force expenditure minimum is C', p);
    ok(close(cdU(p.a, s.XC, s.YC), s.UA, 1e-9 * s.UA), '3.2', 'C is on the original curve U1', p);
    const h = 1e-5, sl = (M.ic(p, s.UA, s.XC + h) - M.ic(p, s.UA, s.XC - h)) / (2 * h);
    ok(close(-sl, p.P1 / p.Py, 1e-4), '3.2', 'compensated line tangent to U1 at C (new slope)', p);
    ok(close(bruteCD(p.a, p.I, p.P1, p.Py), s.XB, 0.004 * s.xIB), '3.2', 'brute-force B', p);
    ok(close(s.SE + s.IE, s.TE, 1e-9), '3.2', 'SE + IE = TE', p);
    ok(Math.sign(s.SE) === -Math.sign(p.P1 - p.P0), '3.2', 'SE opposite to the price change', p);
    ok(Math.sign(s.IE) === Math.sign(s.TE), '3.2', 'IE same sign as TE (normal good)', p);
    ok(Math.max(s.XA, s.XB, s.XC, s.YA, s.YC) <= 0.85 * D, '3.2', 'fits frame', p);
    ok(M.score(p, { M: s.Mc, cx: s.XC }).total === 100, '3.2', 'perfect scores 100', p);
    ok(M.score(p, { M: p.I, cx: s.XA }).total < 60, '3.2', 'untouched guess scores low', p);
  }
  report('3.2 slutsky', N / 4);
})();

/* 3.3 */
(function () {
  const M = W.income, d = M.defaults(), s0 = M.solve(d);
  ok(s0.X0 === 20 && close(s0.Y0, 40 / 3) && s0.X1 === 30 && close(s0.Y1, 20), '3.3', 'defaults normal: $80 -> (20, 13.33), $120 -> (30, 20)', s0);
  const inf = M.solve({ type: 'inferior', I0: 80, I1: 120 });
  ok(inf.X0 === 16 && close(inf.Y0, 16) && inf.X1 === 14, '3.3', 'inferior: $80 -> (16, 16), $120 -> X 14', inf);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    seen[p.type + (s.rise ? '+' : '-')] = 1;
    ok(close(M.Px * s.X1 + M.Py * s.Y1, p.I1) && close(M.Px * s.X0 + M.Py * s.Y0, p.I0), '3.3', 'bundles on their budget lines', p);
    ok(s.Y0 > 0 && s.Y1 > 0 && s.X1 > 0, '3.3', 'bundles affordable and positive', p);
    const h = 1e-3, dx = (M.x(p.type, p.I1 + h) - M.x(p.type, p.I1 - h)) / (2 * h);
    ok(close(dx, s.dxdi, 1e-6), '3.3', 'dX*/dI matches', p);
    ok(Math.sign(s.dX) === Math.sign(p.I1 - p.I0) * (p.type === 'normal' ? 1 : -1), '3.3', 'normal moves with income, inferior against', p);
    ok(close(s.k1 / M.Px, s.X1) && close(s.k0 / M.Px, s.X0), '3.3', 'demand curves pass through X* at PX = $2', p);
    if (p.type === 'normal') ok(close(bruteCD(0.5, p.I1, M.Px, M.Py), s.X1, 0.004 * p.I1 / M.Px), '3.3', 'brute-force Cobb-Douglas bundle', p);
    // the drawn IC through B: tangent to the budget line there, never above it nearby (convex, on the line only at B)
    const ic = M.ic(p.type, p.I1), sl = (ic.fn(s.X1 + h) - ic.fn(s.X1 - h)) / (2 * h);
    ok(close(sl, -M.Px / M.Py, 1e-5) && close(ic.fn(s.X1), s.Y1, 1e-9), '3.3', 'IC tangent to budget line at B', p);
    let below = false; for (let x = 0.2; x < Math.min(ic.b, p.I1 / M.Px); x += 0.05) if (ic.fn(x) < (p.I1 - M.Px * x) / M.Py - 1e-9) below = true;
    ok(!below, '3.3', 'no affordable bundle beats B on the drawn IC', p);
    ok(Math.max(s.X0, s.X1) <= 0.8 * D.X && Math.max(s.Y0, s.Y1) <= 0.95 * D.Yt && M.Px <= 0.5 * D.P, '3.3', 'fits panels', p);
    ok(M.score(p, { x: s.X1, q: s.X1 }).total === 100, '3.3', 'perfect scores 100', p);
    ok(M.score(p, { x: s.X0 - s.dX, q: s.X0 - s.dX }).total === 0, '3.3', 'wrong direction scores 0', p);
  }
  ok(Object.keys(seen).length === 4, '3.3', 'normal/inferior x rise/fall all drawn', seen);
  report('3.3 income', N);
})();

/* 3.4 */
(function () {
  const M = W.drill, S = M.SCEN;
  ok(S.length === 25, '3.4', 'all 25 page scenarios', {});
  // the page's answer key, in its order
  const key = 'm s s s m s s m s m s s m s s m s s s s m s s m s'.split(' ');
  S.forEach((sc, i) => ok((sc.kind === 'movement' ? 'm' : 's') === key[i], '3.4', 'kind matches the page answer #' + i, sc));
  S.forEach((sc, i) => {
    const p = { i }, s = M.solve(p);
    if (sc.kind === 'movement') {
      ok(sc.P0 > 0 && sc.P1 > 0 && sc.P0 <= 11 && sc.P1 <= 11 && s.Q0 > 0 && s.Q1 > 0, '3.4', 'movement inside the frame #' + i, sc);
      ok(close(s.Q1 - s.Q0, -M.B * (sc.P1 - sc.P0)), '3.4', 'movement follows the curve #' + i, s);
      const m = /from \$(\d+(?:\.\d+)?) to \$(\d+(?:\.\d+)?)/.exec(sc.t); ok(m && +m[1] === sc.P0 && +m[2] === sc.P1, '3.4', 'prices match the text #' + i, sc);
      ok(M.score(p, { mode: 'move', P: sc.P1, dq: 0 }).total === 100, '3.4', 'perfect movement 100 #' + i, sc);
      ok(M.score(p, { mode: 'shift', P: s.P0, dq: 5 }).total === 0 && M.score(p, { mode: 'shift', P: s.P0, dq: -5 }).total === 0, '3.4', 'a shift scores 0 #' + i, sc);
      ok(M.score(p, { mode: 'move', P: 2 * sc.P0 - sc.P1, dq: 0 }).total === 60, '3.4', 'wrong direction 60 #' + i, sc);
    } else {
      ok(sc.dir === 1 || sc.dir === -1, '3.4', 'shift has a direction #' + i, sc);
      ok(/right/.test(sc.why) === (sc.dir > 0) && /left/.test(sc.why) === (sc.dir < 0), '3.4', 'direction matches the explanation #' + i, sc);
      ok(M.score(p, { mode: 'shift', P: s.P0, dq: 6 * sc.dir }).total === 100, '3.4', 'perfect shift 100 #' + i, sc);
      ok(M.score(p, { mode: 'move', P: s.P0 + 1, dq: 0 }).total === 0, '3.4', 'a movement scores 0 #' + i, sc);
      ok(s.Q0 + 12 <= M.domain().X && s.Q0 - 6 >= 0, '3.4', 'shifted point in frame #' + i, s);
    }
    ok(/[Ss]hift|[Mm]ovement|moves .*along/.test(sc.why), '3.4', 'explanation names the kind #' + i, sc);
  });
  const seen = {}; let prev = null;
  for (let i = 0; i < N; i++) { const p = M.random(rng, prev); ok(!prev || p.i !== prev.i, '3.4', 'new scenario each round', p); seen[p.i] = 1; prev = p; }
  ok(Object.keys(seen).length === 25, '3.4', 'every scenario reachable', seen);
  report('3.4 drill', N);
})();

/* 3.5 */
(function () {
  const M = W.cross, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.s0, 0.5) && close(s0.X0, 12.5) && close(s0.s1, 0.62) && close(s0.X1, 15.5), '3.5', 'defaults: s 0.5 -> 0.62, X 12.5 -> 15.5', s0);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    seen[p.rel + (p.Py1 > p.Py0 ? '+' : '-')] = 1;
    // page formula: shareX = 0.5 + dir 0.06 (Py - 4), X = shareX I / Px, Y = (I - shareX I) / Py
    const dir = p.rel === 'sub' ? 1 : -1;
    ok(close(s.X1, (0.5 + dir * 0.06 * (p.Py1 - 4)) * p.I / p.Px), '3.5', 'matches week3-viz redrawV5', p);
    ok(close(p.Px * s.X1 + p.Py1 * s.Y1, p.I) && s.Y1 > 0, '3.5', 'bundle exhausts income', p);
    ok(s.dir === dir * Math.sign(p.Py1 - p.Py0), '3.5', 'substitutes shift with PY, complements against', p);
    for (const P of [1, 2.5, 5]) ok(Math.sign(s.k1 / P - s.k0 / P) === s.dir, '3.5', 'shift is the same at every PX', p);
    ok(Math.max(s.X0, s.X1) <= 0.7 * D.X && p.Px <= 0.6 * D.Y, '3.5', 'fits frame', p);
    ok(M.score(p, { x: s.X1 }).total === 100, '3.5', 'perfect scores 100', p);
    ok(M.score(p, { x: 2 * s.X0 - s.X1 }).total === 0, '3.5', 'wrong direction scores 0', p);
  }
  ok(Object.keys(seen).length === 4, '3.5', 'subs/comp x up/down all drawn', seen);
  report('3.5 cross', N);
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
