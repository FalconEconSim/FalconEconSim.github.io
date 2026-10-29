/* Verifies every Week 10 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week10/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: best responses by brute-force profit maximization on a fine grid, Cournot by
 * iterating best responses, Stackelberg by grid search over the leader's output, Hotelling shares by
 * counting a fine grid of sunbathers and the best spot by searching every 0.01 location, average walk
 * by numerical integration, n-firm prices by iterating best replies among n firms, the four models by
 * brute force (monopoly, Cournot, Stackelberg, undercutting), Bertrand best reply by trying every $1
 * price, frame fit, perfect guesses score 100, untouched starting guesses score low, defaults equal
 * week10-viz.html and the textbook. Float tolerance 1e-6 unless noted. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 1010;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(18) + n + ' draws'); }
function ticksOk(D) { return D.X / D.xs <= 16 + 1e-9 && D.Y / D.ys <= 7 + 1e-9 && Number.isInteger(Math.round(D.Y / D.ys * 1e9) / 1e9); }
// argmax of f over [lo, hi] by a coarse grid then golden refinement
function argmax(f, lo, hi) {
  let best = lo, bv = -Infinity;
  for (let i = 0; i <= 2000; i++) { const x = lo + (hi - lo) * i / 2000, v = f(x); if (v > bv) { bv = v; best = x; } }
  let a = Math.max(lo, best - (hi - lo) / 2000), b = Math.min(hi, best + (hi - lo) / 2000);
  for (let k = 0; k < 100; k++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) a = m1; else b = m2; }
  return (a + b) / 2;
}

/* 10.1 Cournot and Stackelberg */
(function () {
  const M = W.cournot, d = M.defaults(), s0 = M.solve(d);
  ok(s0.qc === 40 && s0.Pc === 40 && s0.pic === 1600 && s0.qL === 60 && s0.qF === 30 && s0.Ps === 30 && s0.piL === 1800 && s0.piF === 900, '10.1', 'defaults (textbook: 40/40 at $40, 60/30 at $30)', s0);
  // the film's staircase: A 10, B 55, A 32.5, B 43.75, A 38.125
  const st = M.stairs(d, 10, 3);
  ok(close(st[1][1], 55) && close(st[2][0], 32.5) && close(st[3][1], 43.75) && close(st[4][0], 38.125), '10.1', 'film staircase numbers', st);
  // live-page presets
  ok(close(M.solve(M.PRESETS.large).qc, 160 / 3) && M.solve(M.PRESETS.steep).qc === 20 && M.solve(M.PRESETS.small).qc === 30, '10.1', 'presets', {});
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), c = p.a / p.b;
    const profA = (qA, qB) => Math.max(0, p.a - p.b * (qA + qB)) * qA;
    // best responses by brute force at a few rival outputs
    [0, 0.2, 0.5, 0.8].forEach(t => {
      const qB = t * c, br = argmax(q => profA(q, qB), 0, c);
      ok(close(br, M.brA(p, qB), 1e-4 * c), '10.1', 'BR_A brute force', p);
      ok(close(br, M.brB(p, qB), 1e-4 * c), '10.1', 'BR_B symmetric', p);
    });
    // Cournot: iterate best responses from 0
    let qA = 0, qB = 0; for (let k = 0; k < 200; k++) { qA = M.brA(p, qB); qB = M.brB(p, qA); }
    ok(close(qA, s.qc, 1e-6 * c) && close(qB, s.qc, 1e-6 * c), '10.1', 'Cournot = fixed point of best responses', p);
    ok(close(s.Pc, p.a - p.b * 2 * s.qc) && close(s.pic, s.Pc * s.qc), '10.1', 'Cournot price and profit', p);
    // no profitable deviation at Cournot
    ok(profA(s.qc, s.qc) >= profA(s.qc * 1.1, s.qc) && profA(s.qc, s.qc) >= profA(s.qc * 0.9, s.qc), '10.1', 'Cournot no deviation', p);
    // Stackelberg: leader maximizes its profit along B's best response
    const L = argmax(q => profA(q, M.brB(p, q)), 0, c);
    ok(close(L, s.qL, 1e-4 * c) && close(M.brB(p, s.qL), s.qF), '10.1', 'Stackelberg by search', p);
    ok(close(s.piL, profA(s.qL, s.qF)) && close(s.piF, profA(s.qF, s.qL)) && s.piL > s.pic && s.piF < s.pic, '10.1', 'first-mover advantage', p);
    ok(close(s.Ps, p.a - p.b * (s.qL + s.qF)), '10.1', 'Stackelberg price', p);
    // the student's line crossing: the true line gives the Cournot point
    const x = M.crossing(p, s.half, s.c);
    ok(x && close(x.qA, s.qc) && close(x.qB, s.qc), '10.1', 'crossing of the true line = Cournot', p);
    ok(c <= 0.97 * D.X && D.X === D.Y && D.X / D.xs <= 7, '10.1', 'frame fits', D);
    ok(Number.isInteger(s.half) && Number.isInteger(s.c) && Number.isInteger(s.qL * 2) && Number.isInteger(s.qF * 2), '10.1', 'answers on the snap grid', p);
    ok(M.score(p, { top: s.half, bot: s.c, s: { x: s.qL, y: s.qF } }).total === 100, '10.1', 'perfect scores 100', p);
    const st0 = M.start(D);
    ok(M.score(p, { top: st0.top, bot: st0.bot, s: null }).total < 30, '10.1', 'untouched start scores low', p);
    ok(M.score(p, { top: s.half, bot: s.c, s: { x: s.qc, y: s.qc } }).total < 80, '10.1', 'Cournot point as Stackelberg is not full marks', p);
  }
  report('10.1 cournot', N);
})();

/* 10.2 Hotelling */
(function () {
  const M = W.beach, d = M.defaults(), s0 = M.solve(d);
  ok(close(M.share(0.3, 0.7), 0.5) && s0.best === 0.69 && close(s0.bestShare, 0.695), '10.2', 'defaults (0.3/0.7 split 50/50, best 0.69)', s0);
  ok(close(M.walk(0.25, 0.75), 0.125) && close(M.walk(0.5, 0.5), 0.25), '10.2', 'walks 0.125 vs 0.25 (twice)', {});
  ok(close(M.share(0.35, 0.75), 0.55), '10.2', 'textbook example: 0.35 vs 0.75 gives 55%', {});
  const G = 20000;
  const count = (x, y) => { let n = 0; for (let i = 0; i < G; i++) { const z = (i + 0.5) / G, dx = Math.abs(z - x), dy = Math.abs(z - y); n += dx < dy ? 1 : dx === dy ? 0.5 : 0; } return n / G; };
  for (let i = 0; i < Math.min(N, 3000); i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p);
    ok(close(count(p.a, p.b), M.share(p.a, p.b), 2e-4), '10.2', 'share by counting sunbathers', p);
    // best spot on the 0.01 grid
    let best = -1, bx = 0; for (let k = 0; k <= 100; k++) { const x = k / 100, v = M.share(x, p.b); if (v > best + 1e-12) { best = v; bx = x; } }
    ok(close(bx, s.best) && close(best, s.bestShare), '10.2', 'best spot by grid search', p);
    ok(Math.abs(p.b - 0.5) >= 0.1 - 1e-9 && p.a >= 0 && p.a <= 1, '10.2', 'valid draw', p);
    // walking distance by integration
    const wx = M.walk(p.a, p.b); let w = 0; for (let k = 0; k < G; k++) { const z = (k + 0.5) / G; w += Math.min(Math.abs(z - p.a), Math.abs(z - p.b)) / G; }
    ok(close(w, wx, 1e-6), '10.2', 'average walk by integration', p);
    // (0.5, 0.5) is a Nash equilibrium: no grid move gains
    let gain = false; for (let k = 0; k <= 100; k++) if (M.share(k / 100, 0.5) > 0.5 + 1e-12) gain = true;
    ok(!gain, '10.2', 'no profitable move from the center', p);
    ok(M.score(p, { a: s.best, end: { x: 0.5 } }).total === 100, '10.2', 'perfect scores 100', p);
    ok(M.score(p, { a: p.a, end: { x: p.b } }).total < 50, '10.2', 'untouched start + end on B scores low', p);
    ok(M.score(p, { a: p.b, end: { x: 0.5 } }).total < 70, '10.2', 'standing on B (50%) loses most of the first part', p);
  }
  report('10.2 hotelling', Math.min(N, 3000));
})();

/* 10.3 n-firm Cournot */
(function () {
  const M = W.nfirm, d = M.defaults(), s0 = M.solve(d);
  ok(s0.P1 === 60 && s0.Pk === 30 && s0.P2 === 40 && s0.floor === 0 && close(M.P(d, 15), 7.5), '10.3', 'defaults (textbook: $60, $40, $30)', s0);
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    [1, 2, p.k, 15].forEach(n => {
      // iterate best replies among n identical firms: each q_i = (a - c - Q_others)/2 (P = a - Q)
      let q = new Array(n).fill(0);
      for (let it = 0; it < 400; it++) for (let j = 0; j < n; j++) { const others = q.reduce((x, y) => x + y, 0) - q[j]; q[j] = Math.max(0, (p.a - p.c - others) / 2); }
      const Q = q.reduce((x, y) => x + y, 0), P = p.a - Q;
      ok(close(P, M.P(p, n), 1e-5) && close(q[0], M.q(p, n), 1e-5), '10.3', 'P*(n) by iterated best replies', [p, n]);
    });
    ok(M.P(p, 1) > M.P(p, 2) && M.P(p, 2) > M.P(p, 15) && M.P(p, 15) > p.c, '10.3', 'price falls with n, stays above MC', p);
    ok(close(M.P(p, 1e7), p.c, 1e-3), '10.3', 'limit is MC', p);
    ok(s.P1 <= 0.95 * D.Y && ticksOk(D), '10.3', 'frame fits', D);
    ok(M.score(p, { p1: s.P1, pk: s.Pk, floor: s.floor }).total === 100, '10.3', 'perfect scores 100', p);
    ok(M.score(p, { p1: Math.round(s.P1 * 2) / 2, pk: Math.round(s.Pk * 2) / 2, floor: p.c }).total === 100, '10.3', 'reachable on the $0.50 grid', p);
    const st = M.start(D);
    ok(M.score(p, st).total < 45, '10.3', 'untouched start scores low', p);
  }
  report('10.3 n-firm', N);
})();

/* 10.4 four models */
(function () {
  const M = W.four, d = M.defaults(), s0 = M.solve(d);
  const t = (o, Q, P, pi) => o.Q === Q && o.P === P && o.pi === pi;
  ok(t(s0.cournot, 80, 40, 3200) && t(s0.stackelberg, 90, 30, 2700) && t(s0.collusion, 60, 60, 3600) && t(s0.bertrand, 120, 0, 0), '10.4', 'defaults (live page)', s0);
  // textbook welfare table: CS 1,800 / 3,200 / 4,050 / 7,200; DWL 1,800 / 800 / 450 / 0
  ok(s0.collusion.CS === 1800 && s0.cournot.CS === 3200 && s0.stackelberg.CS === 4050 && s0.bertrand.CS === 7200 &&
    s0.collusion.DWL === 1800 && s0.cournot.DWL === 800 && s0.stackelberg.DWL === 450 && s0.bertrand.DWL === 0, '10.4', 'textbook welfare table', s0);
  const C = W.cournot;
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p), cm = (p.a - p.c) / p.b;
    const prof = (qA, qB) => (Math.max(0, p.a - p.b * (qA + qB)) - p.c) * qA;
    // collusion = monopoly output by search
    const Qm = argmax(Q => (p.a - p.b * Q - p.c) * Q, 0, cm);
    ok(close(Qm, s.collusion.Q, 1e-4 * cm), '10.4', 'collusion = monopoly output', p);
    // Cournot by iterating best responses with MC
    // at the Cournot point each firm's own best reply (by search) is its Cournot output
    const qc = s.cournot.qA, br = argmax(q => prof(q, qc), 0, cm);
    ok(close(br, qc, 1e-4 * cm) && close(s.cournot.qB, qc), '10.4', 'Cournot: best reply to the rival is itself', p);
    const L = argmax(q => prof(q, Math.max(0, (cm - q) / 2)), 0, cm);
    ok(close(L, s.stackelberg.qA, 1e-4 * cm) && close(s.stackelberg.qB, (cm - s.stackelberg.qA) / 2), '10.4', 'Stackelberg by search', p);
    ok(close(s.bertrand.P, p.c) && close(s.bertrand.pi, 0) && close(s.bertrand.Q, cm), '10.4', 'Bertrand P = MC', p);
    W.four.MODELS.forEach(m => {
      const o = s[m];
      ok(close(o.P, p.a - p.b * o.Q) && close(o.pi, (o.P - p.c) * o.Q) && close(o.CS, 0.5 * (p.a - o.P) * o.Q) && close(o.DWL, 0.5 * (o.P - p.c) * (cm - o.Q)), '10.4', 'price, profit, CS, DWL ' + m, p);
      ok(Number.isInteger(o.Q * 2), '10.4', 'answer on the 0.5 grid ' + m, p);
    });
    ok(s.collusion.Q < s.cournot.Q && s.cournot.Q < s.stackelberg.Q && s.stackelberg.Q < s.bertrand.Q, '10.4', 'output ranking', p);
    ok(s.collusion.pi > s.cournot.pi && s.cournot.pi > s.stackelberg.pi && s.stackelberg.pi > s.bertrand.pi, '10.4', 'profit ranking', p);
    ok(p.a / p.b <= 0.97 * D.X && p.a <= 0.95 * D.Y && ticksOk(D), '10.4', 'frame fits', D);
    const g = {}; W.four.MODELS.forEach(m => { g[m] = { x: s[m].Q }; });
    ok(M.score(p, g).total === 100, '10.4', 'perfect scores 100', p);
    const sw = { cournot: { x: s.collusion.Q }, stackelberg: { x: s.bertrand.Q }, collusion: { x: s.cournot.Q }, bertrand: { x: s.stackelberg.Q } };
    ok(M.score(p, sw).total < 60, '10.4', 'scrambled answers score low', p);
  }
  report('10.4 four models', N);
})();

/* 10.5 Bertrand */
(function () {
  const M = W.bertrand, d = M.defaults(), s0 = M.solve(d);
  ok(s0.Pb === 59 && s0.pib === 2379 && s0.match === 1200 && s0.Pm === 70 && s0.pim === 2500, '10.5', 'defaults (rival $60: $59 for $2,379)', s0);
  ok(M.solve({ a: 120, c: 20, pr: 80 }).Pb === 70 && M.solve({ a: 120, c: 20, pr: 80 }).pib === 2500, '10.5', 'rival above $70: charge $70', {});
  ok(M.profit(d, 50) === 30 * 70 && M.profit(d, 61) === 0 && M.profit(d, 60) === 1200, '10.5', 'live default $50 vs $60 = $2,100', {});
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // independent profit rule and brute force over every $1 price (ties: buyers split)
    const prof = P => { const q = Math.max(0, p.a - P), m = (P - p.c) * q; return P < p.pr ? m : P === p.pr ? m / 2 : 0; };
    let best = -Infinity, bp = null; for (let P = 0; P <= D.X; P++) { const v = prof(P); if (v > best) { best = v; bp = P; } }
    ok(bp === s.Pb && close(best, s.pib), '10.5', 'best reply by trying every $1 price', p);
    ok(close(M.profit(p, p.pr), prof(p.pr)) && close(M.profit(p, p.pr + 1), 0) && close(M.profit(p, p.pr - 1), prof(p.pr - 1)), '10.5', 'profit rule', p);
    ok(s.pib > s.match, '10.5', 'undercutting beats matching', p);
    ok(Number.isInteger(s.Pb) && Number.isInteger(s.Pm), '10.5', 'whole-dollar answers', p);
    ok(s.pim <= 0.95 * D.Y && p.a <= D.X && ticksOk(D) && D.X / D.xs <= 7, '10.5', 'frame fits', D);
    // the truth polyline matches the profit function
    const tr = M.truth(p, D.X);
    const cut = tr.indexOf(null);
    ok(tr.slice(0, cut).every(q => q[0] <= p.pr + 1e-9 && close(q[1], (q[0] - p.c) * (p.a - q[0]), 1e-5)) && tr.slice(cut + 1).every(q => q[0] >= p.pr && q[1] === 0), '10.5', 'truth curve', p);
    // a perfect drawing on the 60 bins and the best price score 100
    const bw = D.X / 60, perfect = [];
    for (let k = 0; k <= 60; k++) { const x = k * bw; perfect.push(x < p.c ? null : { x: x, y: x < p.pr ? (x - p.c) * (p.a - x) : 0 }); }
    ok(M.score(p, { drawn: perfect, P: s.Pb }).total === 100, '10.5', 'perfect scores 100', p);
    const cs = M.curveScore(p, perfect, D);
    ok(cs.dy != null && cs.dy < 1e-6, '10.5', 'perfect drawing misses by $0', p);
    const flat = perfect.map(q => q && { x: q.x, y: D.Y * 0.3 });
    ok(M.score(p, { drawn: flat, P: p.pr + 5 }).total < 30, '10.5', 'flat line and a price above the rival score low', p);
    ok(M.score(p, { drawn: perfect, P: p.pr }).total < 60, '10.5', 'matching the rival is not full marks', p);
  }
  report('10.5 bertrand', N);
})();

console.log(fails ? fails + ' failures' : 'all checks pass');
process.exit(fails ? 1 : 0);
