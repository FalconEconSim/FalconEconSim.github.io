/* Verifies every Week 12 model against independent numerics, over thousands of random draws.
 * Run: node lab/predict/week12/verify.js [N]   (prints a line per figure, exits 1 on any failure)
 * Independent checks: the knife-edge p* by bisection on the mixture p WTP_peach + (1 - p) WTP_lemon,
 * the outcome at p0 by playing out the exit rule (peach owners leave when the offer is below their
 * reserve, buyers then price a pool of lemons only), the Spence separating range by brute-force scan of
 * thresholds against both incentive constraints, frame fit, perfect guesses score 100, untouched
 * starting guesses and the classic mistakes score low, defaults equal week12-viz.html. */
'use strict';
const W = require('./models.js');
const N = +process.argv[2] || 20000;
let rngState = 1212;
function rng() { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
let fails = 0; const kinds = {};
function ok(cond, fig, msg, p) { if (!cond) { fails++; const k = fig + ' ' + msg; kinds[k] = (kinds[k] || 0) + 1; if (kinds[k] <= 2) console.log('FAIL', k, JSON.stringify(p)); } }
const close = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
function report(name, n) { console.log((fails ? 'checked ' : 'ok      ') + name.padEnd(14) + n + ' draws'); }

/* 12.1 lemons */
(function () {
  const M = W.lemons, d = M.defaults(), s0 = M.solve(d);
  ok(close(s0.ps, 2 / 3, 1e-12) && s0.fn === 2 && s0.fd === 3 && s0.E0 === 1800 && !s0.pool && s0.top === 1200 && s0.lo === 1000 && s0.gainH === 400 && s0.gainL === 200,
    '12.1', 'defaults: p* = 2/3, offer $1,800 at p = 0.5, lemons only at most $1,200', s0);
  ok(M.E(d, 0.75) === 2100 && M.E(d, 0.25) === 1500 && M.solve(Object.assign({}, d, { p0: 0.75 })).pool, '12.1', 'textbook cases p = 0.75 and 0.25', {});
  const Dd = M.domain(d);
  ok(Dd.Y0 === 1000 && Dd.Y0 + Dd.Y === 2600 && Dd.ys === 200, '12.1', 'default frame $1,000 to $2,600 as on the site', Dd);
  // textbook Example 12.1 and Check Your Understanding 1, through the same solver
  ok(close(M.solve({ WL: 1000, WH: 3600, vL: 800, vH: 3000, p0: 0.6 }).ps, 2000 / 2600, 1e-12) && !M.solve({ WL: 1000, WH: 3600, vL: 800, vH: 3000, p0: 0.6 }).pool, '12.1', 'textbook Example 12.1', {});
  ok(close(M.solve({ WL: 700, WH: 2200, vL: 500, vH: 1800, p0: 0.8 }).ps, 1100 / 1500, 1e-12) && M.solve({ WL: 700, WH: 2200, vL: 500, vH: 1800, p0: 0.8 }).pool, '12.1', 'textbook CYU 1', {});
  let pools = 0;
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    if (s.pool) pools++;
    const mix = x => x * p.WH + (1 - x) * p.WL;
    // bisection for mix(p) = vH
    let a = 0, b = 1; for (let k = 0; k < 80; k++) { const m = (a + b) / 2; if (mix(m) < p.vH) a = m; else b = m; }
    ok(close(a, s.ps, 1e-9), '12.1', 'p* by bisection', p);
    ok(close(s.fn / s.fd, s.ps, 1e-12) && Number.isInteger(s.fn) && Number.isInteger(s.fd), '12.1', 'p* fraction', p);
    ok(close(M.E(p, p.p0), mix(p.p0)), '12.1', 'E[WTP] is the mixture', p);
    // play out the market at p0: peach owners stay iff the pooled offer covers their reserve
    const offer = mix(p.p0), peachesStay = offer >= p.vH, topPrice = peachesStay ? offer : p.WL;
    ok(s.pool === peachesStay && close(s.top, topPrice), '12.1', 'outcome at p0 by the exit rule', p);
    ok(peachesStay ? offer >= p.vH && offer >= p.vL : p.WL >= p.vL && p.WL < p.vH, '12.1', 'whoever is left still trades', p);
    ok(p.vL < p.WL && p.WL < p.vH && p.vH < p.WH, '12.1', 'gains from trade for both types, and a lemons problem', p);
    ok(Math.abs(p.p0 - s.ps) >= 0.1 - 1e-9, '12.1', 'p0 well away from the knife-edge', p);
    // frame: both ends of E[WTP] and the reserve inside, ticks
    ok(D.Y0 <= p.WL - 100 && D.Y0 + D.Y >= p.WH + 100 && D.Y0 >= 0 && D.Y / D.ys <= 8 && Number.isInteger(D.Y / D.ys) && D.Y0 % D.ys === 0, '12.1', 'frame', D);
    ok(M.score(p, { ps: s.ps, top: s.top }).total === 100, '12.1', 'perfect scores 100', p);
    ok(M.score(p, { ps: Math.round(s.ps * 100) / 100, top: Math.round(s.top / 10) * 10 }).total === 100, '12.1', 'answers reachable on the 0.01 / $10 grid', p);
    const st = M.start(D);
    ok(M.score(p, st).total < 40, '12.1', 'untouched start scores low', Object.assign({ st: st }, p));
    ok(st.top <= D.Y0 + D.Y && st.top > s.top + 0.25 * (p.WH - p.WL), '12.1', 'price handle starts well away', p);
    // the classic mistake: quoting the pooled average when peaches have left
    if (!s.pool) ok(M.score(p, { ps: s.ps, top: offer }).parts[1] === 0, '12.1', 'average offer below p* earns nothing on step 2', p);
  }
  ok(pools > N * 0.2 && pools < N * 0.6, '12.1', 'mix of pooling and separating (' + pools + ')', {});
  report('12.1 lemons', N);
})();

/* 12.2 Spence signaling */
(function () {
  const M = W.spence, d = M.defaults(), s0 = M.solve(d), D0 = M.domain(d);
  ok(s0.lo === 20 && s0.hi === 60 && s0.hiLo === 80 && D0.X === 80 && D0.xs === 10 && D0.Y === 120, '12.2', 'defaults: 20 to 60, frame 80', Object.assign({ D: D0 }, s0));
  for (let i = 0; i < N; i++) {
    const p = i ? M.random(rng) : d, s = M.solve(p), D = M.domain(p);
    // brute force: thresholds where the low type stays out and the high type signals
    let lo = null, hi = null;
    for (let k = 0; k <= 40000; k++) {
      const t = D.X * k / 40000, lowOut = p.yH - p.b * t <= p.yL + 1e-9, highIn = p.yH - p.a * t >= p.yL - 1e-9;
      if (lowOut && highIn) { if (lo == null) lo = t; hi = t; }
    }
    ok(lo != null && close(lo, s.lo, D.X / 40000 + 1e-9) && close(hi, s.hi, D.X / 40000 + 1e-9), '12.2', 'separating range by scan', p);
    ok(close(M.low(p, s.lo), p.yL) && close(M.high(p, s.hi), p.yL), '12.2', 'each edge is where one type is indifferent', p);
    ok(p.b > p.a && s.sep, '12.2', 'single crossing', p);
    ok(M.high(p, s.lo) > p.yL, '12.2', 'high type strictly gains at the least-cost threshold', p);
    ok(Number.isInteger(s.lo) && Number.isInteger(s.hi), '12.2', 'whole-number edges', p);
    ok(s.hi <= 0.82 * D.X && s.lo >= 0.18 * D.X && p.yH <= 0.95 * D.Y && D.X / D.xs <= 8 && D.Y / D.ys <= 8, '12.2', 'frame', D);
    ok(M.score(p, { lo: s.lo, hi: s.hi }).total === 100, '12.2', 'perfect scores 100', p);
    const st = M.start(D);
    ok(M.score(p, st).total < 40, '12.2', 'untouched start scores low', Object.assign({ st: st }, p));
    ok(M.score(p, { lo: s.hi, hi: s.lo }).total < 40, '12.2', 'swapped edges score low', p);
  }
  report('12.2 spence', N);
})();

Object.keys(kinds).forEach(k => console.log('  ' + kinds[k] + ' x ' + k));
console.log(fails ? fails + ' FAILURES' : 'all checks passed');
process.exit(fails ? 1 : 0);
