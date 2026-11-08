/* Week 7 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * One firm model runs through the whole week, the one on week7-viz.html and in the fig75 / fig79 films:
 *   TC(q) = q^3/3 - 2q^2 + c q + F        (site: c = 7, F = TFC = 5)
 *   SMC = q^2 - 4q + c,  SAVC = q^2/3 - 2q + c,  SAC = SAVC + F/q
 *   min SAVC = c - 3 at q = 3 (the shutdown point; $4 on the site)
 *   min SAC where SMC = SAC: 2q^3/3 - 2q^2 = F (q = 3.584, $5.51 on the site)
 *   supply: q(P) = 2 + sqrt(P - c + 4) for P >= c - 3, else 0   (the site's q* = 2 + sqrt(P - 3))
 *
 * Defaults match week7-viz.html:
 *   7.1  P = $10, TFC $5: q* = 2 + sqrt(7) = 4.65, TR $46.46, TC $27.78, profit $18.68
 *   7.2  P = $7: q* = 4, SAC(4) = $5.58, profit 4 x $1.42 = $5.67 (SAVC(4) = $4.33 is the classic mistake)
 *   7.3  shutdown $4 (q = 3), break-even $5.51 (q = 3.58)
 *   7.5  supply starts at (3, $4); at P = $8 the firm supplies 2 + sqrt(5) = 4.24 (the page's table row)
 *   7.7  the page's first scenario: the price of a substitute rises (demand shock, consumer first)
 *   7.8  n = 10 firms: market supply starts at Q = 30 at $4; at $8, Q = 10 x 4.24 = 42.4
 *   7.9  150 firms, D: Q = 3,558.6 - 548.4P rises to D': Q = 4,086 - 548.4P. Short run $6.40, profit
 *        $3.31 per firm; long run back at $5.51 with about 297 firms selling 1,065 units
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function sgn(v, eps) { return v > (eps || 1e-9) ? 1 : v < -(eps || 1e-9) ? -1 : 0; }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 20000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most 7 ticks on a 1-2-5 step
  function niceAxis(vmax) {
    var steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 2000) * 2000, s: 2000 };
  }
  // root of a monotone function on [a, b] by bisection
  function bisect(fn, a, b) {
    var fa = fn(a);
    for (var k = 0; k < 200; k++) { var m = (a + b) / 2, fm = fn(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; }
    return (a + b) / 2;
  }

  /* ---------- the firm ---------- */
  var firm = {
    tvc: function (p, q) { return q * q * q / 3 - 2 * q * q + p.c * q; },
    tc: function (p, q) { return firm.tvc(p, q) + p.F; },
    smc: function (p, q) { return q * q - 4 * q + p.c; },
    savc: function (p, q) { return q * q / 3 - 2 * q + p.c; },
    sac: function (p, q) { return q > 0 ? firm.savc(p, q) + p.F / q : Infinity; },
    psd: function (p) { return p.c - 3; },     // shutdown price = min SAVC
    qsd: 3,
    // quantity supplied: P = SMC on the rising branch at or above min SAVC, zero below
    supply: function (p, P) { return P >= p.c - 3 - 1e-12 ? 2 + Math.sqrt(Math.max(0, P - p.c + 4)) : 0; },
    // break-even point: min SAC, where SMC = SAC  <=>  2q^3/3 - 2q^2 = F
    be: function (p) {
      var q = p.F > 0 ? bisect(function (u) { return 2 * u * u * u / 3 - 2 * u * u - p.F; }, 3, 60) : 3;
      return { q: q, P: firm.sac(p, q) };
    },
    profit: function (p, P, q) { return P * q - firm.tc(p, q); }
  };

  /* ---------- 7.1 Profit landscape: TR vs TC ---------- */
  var landscape = {
    defaults: function () { return { c: 7, F: 5, P: 10 }; },
    gen: function (rng) { var c = pick(rng, [5, 6, 7, 8]); return { c: c, F: pick(rng, [2, 3, 4, 5, 6, 8, 10]), P: c - 3 + 1 + Math.floor(rng() * 8) }; },
    valid: function (p) { var s = landscape.solve(p); return s.q <= 5.4 && Math.abs(s.pi) >= 1; },
    random: function (rng, prev) { return draw(landscape.gen, landscape.valid, prev, rng); },
    // explore range for the price stepper
    pRange: function (p) { return { lo: Math.max(1, p.P - 4), hi: p.P + 2 }; },
    solve: function (p) {
      var psd = firm.psd(p), shut = p.P < psd - 1e-12, q = shut ? 0 : firm.supply(p, p.P), be = firm.be(p);
      return { q: q, shut: shut, psd: psd, be: be, TR: p.P * q, TC: firm.tc(p, q), pi: firm.profit(p, p.P, q), mc: firm.smc(p, q) };
    },
    domain: function (p) {
      var r = landscape.pRange(p), qm = firm.supply(p, r.hi), x = niceAxis(qm * 1.36);
      var y = niceAxis(1.12 * Math.max(r.hi * qm, firm.tc(p, qm) + 10));
      return { X: x.D, Y: y.D, xs: x.s, ys: y.s };
    },
    start: function (D) { return Math.round(D.X * 0.14 * 20) / 20; },
    score: function (p, g) {
      var s = landscape.solve(p), D = landscape.domain(p);
      return { total: Math.round(100 * lin((g.q - s.q) / D.X, 0.012, 0.2)) };
    }
  };

  /* ---------- 7.2 Profit rectangle ---------- */
  var rect = {
    defaults: function () { return { c: 7, F: 5, P: 7 }; },
    gen: function (rng) { var c = pick(rng, [6, 7, 8]); return { c: c, F: pick(rng, [3, 4, 5, 6, 8]), P: c - 3 + 0.5 * (1 + Math.floor(rng() * 14)) }; },
    valid: function (p) {
      var s = rect.solve(p);
      return Math.abs(p.P - s.be.P) >= 0.45 && s.q <= 6.8 && s.sac <= 12.5 && p.P <= 12.5;
    },
    random: function (rng, prev) { return draw(rect.gen, rect.valid, prev, rng); },
    solve: function (p) {
      var psd = firm.psd(p), shut = p.P < psd - 1e-12, q = shut ? 0 : firm.supply(p, p.P), be = firm.be(p);
      var sac = q > 0 ? firm.sac(p, q) : Infinity, savc = q > 0 ? firm.savc(p, q) : p.c;
      return { q: q, shut: shut, psd: psd, be: be, sac: sac, savc: savc, smc: firm.smc(p, q),
        pi: shut ? -p.F : q * (p.P - sac), margin: p.P - sac, TR: p.P * q, TC: firm.tc(p, q) };
    },
    // room above the price for the curves and the explore handle; 10 on the site's default round
    domain: function (p) { var s = rect.solve(p); return { X: 9, Y: Math.max(10, 2 * Math.ceil((Math.max(p.P, s.sac) + 2.6) / 2)), xs: 1, ys: 2 }; },
    start: { x: 1.5, y: 1.5 },
    score: function (p, g) {
      var s = rect.solve(p), D = rect.domain(p);
      var sq = lin((g.x - s.q) / D.X, 0.012, 0.12), sy = lin((g.y - s.sac) / 14, 0.01, 0.06);
      return { total: Math.round(100 * (0.5 * sq + 0.5 * sy)), parts: [sq, sy] };
    }
  };

  /* ---------- 7.3 Shutdown and break-even prices ---------- */
  var zones = {
    defaults: function () { return { c: 7, F: 5 }; },
    gen: function (rng) { return { c: pick(rng, [5, 6, 7, 8, 9]), F: pick(rng, [2, 3, 4, 5, 6, 8, 10]) }; },
    valid: function (p) { var s = zones.solve(p); return s.be.P - s.psd >= 0.6; },
    random: function (rng, prev) { return draw(zones.gen, zones.valid, prev, rng); },
    solve: function (p) { return { psd: firm.psd(p), qsd: firm.qsd, be: firm.be(p) }; },
    domain: function (p) { var s = zones.solve(p); return { X: 9, Y: Math.max(10, 2 * Math.ceil((s.be.P + 3.5) / 2)), xs: 1, ys: 2 }; },
    start: function (D) { return { sd: 1, be: D.Y - 1 }; },
    // the zone a price falls in
    zone: function (p, P) {
      var s = zones.solve(p);
      if (P < s.psd - 1e-9) return 'shut';
      if (P < s.be.P - 1e-9) return 'loss';
      if (P < s.be.P + 1e-9) return 'even';
      return 'profit';
    },
    score: function (p, g) {
      var s = zones.solve(p), D = zones.domain(p);
      var a = lin((g.sd - s.psd) / 14, 0.008, 0.08), b = lin((g.be - s.be.P) / 14, 0.008, 0.08);
      return { total: Math.round(100 * (a + b) / 2), parts: [a, b] };
    }
  };

  /* ---------- 7.5 The firm's supply curve (has a film) ---------- */
  var supply = {
    defaults: function () { return { c: 7, F: 5, Pt: 8 }; },
    gen: function (rng) {
      var c = pick(rng, [5, 6, 7, 8, 9]), psd = c - 3, below = rng() < 0.25;
      var Pt = below ? pick(rng, range(Math.max(1, psd - 2.5), psd - 0.5, 0.5)) : pick(rng, range(psd + 1, Math.min(13, psd + 8), 0.5));
      return { c: c, F: pick(rng, [3, 4, 5, 6]), Pt: Pt };
    },
    valid: function (p) { var s = supply.solve(p); return p.Pt >= 1 && p.Pt <= 13 && Math.abs(p.Pt - s.psd) >= 0.5 && s.qt <= 6.5; },
    random: function (rng, prev) { return draw(supply.gen, supply.valid, prev, rng); },
    solve: function (p) { return { psd: firm.psd(p), qsd: firm.qsd, qt: firm.supply(p, p.Pt), be: firm.be(p), below: p.Pt < firm.psd(p) }; },
    domain: function () { return { X: 7, Y: 14, xs: 1, ys: 2 }; },
    start: { sx: 1, sy: 11, qt: 6 },
    score: function (p, g) {
      var s = supply.solve(p), D = supply.domain(p);
      var a = Math.hypot((g.sx - s.qsd) / D.X, (g.sy - s.psd) / D.Y), s1 = lin(a, 0.015, 0.15), s2 = lin((g.qt - s.qt) / D.X, 0.012, 0.15);
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 7.7 Three panels: firm, market, consumer ---------- */
  // 100 identical firms (the course cost model, c = 7, F = 5) and 200 identical consumers. The market
  // starts in long-run equilibrium at min SAC ($5.51, each firm 3.58 units, market 358.4); market demand
  // D: Q = A - 50P passes through that point. A demand shock shifts D sideways by m x 358.4 units at every
  // price (each consumer's d by 1/200 of that); an input-price shock moves every firm's cost curves up or
  // down by $m (c -> 7 +- m).
  var SC = {
    sub: { name: 'The price of a substitute rises', dem: true, up: true },
    sub_fall: { name: 'The price of a substitute falls', dem: true, up: false },
    income: { name: 'Consumer income rises (a normal good)', dem: true, up: true },
    income_fall: { name: 'Consumer income falls (a normal good)', dem: true, up: false },
    input: { name: 'An input price rises', dem: false, up: true },
    input_fall: { name: 'An input price falls', dem: false, up: false }
  };
  var SCK = ['sub', 'sub_fall', 'income', 'income_fall', 'input', 'input_fall'];
  var chain = {
    SC: SC, SCK: SCK, n: 100, N: 200, B: 50, c0: 7, F: 5,
    // panel ranges (local units): firm q 0..7, market Q 0..700, consumer x 0..5, price 0..10 everywhere
    R: { q: 7, Q: 600, x: 4, P: 10 },
    base: function () {
      var p0 = { c: chain.c0, F: chain.F }, be = firm.be(p0), Q0 = chain.n * be.q;
      return { p0: p0, P0: be.P, q0: be.q, Q0: Q0, A: Q0 + chain.B * be.P };
    },
    mag: function (sc) { return SC[sc].dem ? [0.15, 0.2, 0.25] : [0.75, 1, 1.25]; },
    defaults: function () { return { sc: 'sub', m: 0.25 }; },
    gen: function (rng) { var sc = pick(rng, SCK); return { sc: sc, m: pick(rng, chain.mag(sc)) }; },
    valid: function () { return true; },
    random: function (rng, prev) {
      // a different scenario from the last one, so "Try a new one" always changes the story
      for (var i = 0; i < 1000; i++) { var p = chain.gen(rng); if (!prev || p.sc !== prev.sc) return p; }
      throw new Error('no valid draw');
    },
    // demand at price P after a sideways shift of sh x Q0 units: market and one consumer
    D: function (sh, P) { var b = chain.base(); return Math.max(0, b.A + sh * b.Q0 - chain.B * P); },
    d: function (sh, P) { return chain.D(sh, P) / chain.N; },
    // inverse demand of one consumer: the price at which she buys x
    dInv: function (sh, x) { var b = chain.base(); return (b.A + sh * b.Q0 - chain.N * x) / chain.B; },
    S: function (c, P) { return chain.n * firm.supply({ c: c, F: chain.F }, P); },
    // market-clearing price (the shocks used here never push demand into supply's jump at c - 3)
    eqP: function (sh, c) {
      var b = chain.base(), lo = c - 3, hi = (b.A + Math.max(0, sh) * b.Q0) / chain.B;
      return bisect(function (P) { return chain.S(c, P) - chain.D(sh, P); }, lo, hi);
    },
    solve: function (p) {
      var sc = SC[p.sc], b = chain.base(), sh = sc.dem ? (sc.up ? p.m : -p.m) : 0, c1 = sc.dem ? chain.c0 : (sc.up ? chain.c0 + p.m : chain.c0 - p.m);
      var P1 = chain.eqP(sh, c1), p1 = { c: c1, F: chain.F }, q1 = firm.supply(p1, P1), sac1 = firm.sac(p1, q1);
      var x0 = chain.d(0, b.P0), x1 = chain.d(sh, P1);
      return {
        dem: sc.dem, up: sc.up, sh: sh, c1: c1, P0: b.P0, P1: P1, q0: b.q0, q1: q1, Q0: b.Q0, Q1: chain.n * q1, x0: x0, x1: x1,
        sac1: sac1, pi1: q1 * (P1 - sac1), be1: firm.be(p1),
        // the three directions a student predicts: cause shift (+1 = d right / SMC up), price, taker's quantity
        dirs: [sc.dem ? (sh > 0 ? 1 : -1) : (c1 > chain.c0 ? 1 : -1), sgn(P1 - b.P0), sc.dem ? sgn(q1 - b.q0) : sgn(x1 - x0)],
        // the shift of the cause curve in its own panel's units: d moves sideways by sh Q0 / N, SMC up by c1 - c0
        shift: sc.dem ? sh * b.Q0 / chain.N : c1 - chain.c0
      };
    },
    domain: function () { return { X: 100, Y: 100, xs: 1000, ys: 1000 }; },
    // one right direction per step, a third of the score each
    score: function (p, g) {
      var s = chain.solve(p), got = [sgn(g.cause, 1e-6), sgn(g.dp, 1e-6), sgn(g.dq, 1e-6)];
      var parts = got.map(function (v, i) { return v === s.dirs[i] ? 1 : 0; });
      return { total: Math.round(100 * (parts[0] + parts[1] + parts[2]) / 3), parts: parts };
    }
  };

  /* ---------- 7.8 Market supply: the horizontal sum ---------- */
  var market = {
    c: 7, F: 5,
    NS: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50],
    defaults: function () { return { n: 10, Pt: 8 }; },
    gen: function (rng) { return { n: pick(rng, market.NS), Pt: pick(rng, [5, 6, 7, 8, 9, 10, 11, 12]) }; },
    valid: function () { return true; },
    random: function (rng, prev) { return draw(market.gen, market.valid, prev, rng); },
    q: function (P) { return firm.supply({ c: market.c, F: market.F }, P); },
    solve: function (p) {
      var qt = market.q(p.Pt);
      return { psd: market.c - 3, qsd: 3, Qsd: 3 * p.n, qt: qt, Qt: p.n * qt };
    },
    domain: function (p) { var x = niceAxis(1.18 * p.n * market.q(14)); return { X: x.D, Y: 14, xs: x.s, ys: 2 }; },
    nMax: function (p) { var D = market.domain(p); return Math.max(p.n, Math.floor(D.X / market.q(13.5))); },
    start: function (D) { return { sx: Math.round(D.X * 0.85 * 2) / 2, sy: 11, qt: Math.round(D.X * 0.12 * 2) / 2 }; },
    score: function (p, g) {
      var s = market.solve(p), D = market.domain(p);
      var a = Math.hypot((g.sx - s.Qsd) / D.X, (g.sy - s.psd) / D.Y), s1 = lin(a, 0.015, 0.15), s2 = lin((g.qt - s.Qt) / D.X, 0.012, 0.15);
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 7.9 Long-run entry and exit (has a film) ---------- */
  var longrun = {
    defaults: function () { return { c: 7, F: 5, n0: 150, A0: 3558.6, A1: 4086, B: 548.4 }; },
    gen: function (rng) {
      var p = { c: pick(rng, [6, 7, 8]), F: pick(rng, [4, 5, 6]) }, be = firm.be(p);
      var n0 = pick(rng, [100, 120, 150, 200, 250]), Q0 = n0 * be.q, e = pick(rng, [0.8, 1, 1.2, 1.5]), r = pick(rng, [0.5, 0.6, 0.8, 1, -0.3, -0.4, -0.5]);
      var B = Math.round(Q0 / e * 10) / 10, A0 = Math.round((Q0 + B * be.P) * 10) / 10;
      return { c: p.c, F: p.F, n0: n0, A0: A0, A1: Math.round((A0 + r * Q0) * 10) / 10, B: B };
    },
    valid: function (p) {
      var s = longrun.solve(p);
      return s.P1 >= s.psd + 0.3 && Math.abs(s.P1 - s.Pstar) >= 0.5 && s.nLR >= 30 && Math.abs(s.nLR - p.n0) >= 0.25 * p.n0 && s.QLR > 0;
    },
    random: function (rng, prev) { return draw(longrun.gen, longrun.valid, prev, rng); },
    // short-run price with n firms facing demand Q = A - BP (supply n q(P) only above the shutdown price)
    srP: function (p, n, A) {
      var psd = firm.psd(p);
      if (A - p.B * psd <= n * firm.qsd) return psd;   // demand meets supply in its jump at the shutdown price
      return bisect(function (P) { return n * firm.supply(p, P) - (A - p.B * P); }, psd, A / p.B);
    },
    at: function (p, n, A) {
      var P = longrun.srP(p, n, A), q = firm.supply(p, P), sac = firm.sac(p, q);
      return { n: n, P: P, q: q, Q: A - p.B * P, sac: sac, pi: q * (P - sac) };
    },
    solve: function (p) {
      var be = firm.be(p), sr = longrun.at(p, p.n0, p.A1), QLR = p.A1 - p.B * be.P;
      return {
        psd: firm.psd(p), Pstar: be.P, qstar: be.q, Q0: p.A0 - p.B * be.P, rise: p.A1 > p.A0,
        P1: sr.P, q1: sr.q, Q1: sr.Q, sac1: sr.sac, pi1: sr.pi, QLR: QLR, nLR: QLR / be.q
      };
    },
    // Ph: the price at which the S' handle sits (near the top of the market panel)
    domain: function (p) {
      var s = longrun.solve(p), Y = 2 * Math.ceil((Math.max(s.P1, s.Pstar) + 1.4) / 2), Ph = Math.round(0.9 * Y * 10) / 10;
      var x = niceAxis(1.18 * Math.max(s.QLR, s.Q0, s.Q1, 1.04 * Math.max(s.nLR, p.n0) * firm.supply(p, Ph)));
      return { X: 100, Y: 100, xs: 1000, ys: 1000, QX: x.D, Qs: x.s, PY: Y, Ps: Y <= 8 ? 1 : 2, qX: 8, Ph: Ph };
    },
    score: function (p, g) {
      var s = longrun.solve(p), D = longrun.domain(p);
      var a = lin((g.P - s.Pstar) / D.PY, 0.01, 0.1), b = g.n > 0 ? lin(Math.log(g.n / s.nLR), 0.03, 0.35) : 0;
      return { total: Math.round(100 * (a + b) / 2), parts: [a, b] };
    }
  };

  var W7 = { firm: firm, landscape: landscape, rect: rect, zones: zones, supply: supply, chain: chain, market: market, longrun: longrun,
    util: { lin: lin, niceAxis: niceAxis, bisect: bisect, pick: pick, range: range, sgn: sgn, clamp: clamp } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W7;
  else root.W7 = W7;
})(this);
