/* Week 11 economics models for "Predict, then see" (v5).
 * Pure functions only: no DOM. Loaded by the page and by the verification
 * script in node (module.exports), so every number the page shows is the
 * number the script checked.
 *
 * Defaults match week11-viz.html:
 *   11.1 MB = 100 - Q, PMC = 10 + Q, MEC $20  -> QE 45, Q* 35, DWL $100, tax $20
 *   11.2 MAC_A = 2e, MAC_B = 8e, target 100   -> A 80, B 20, permit $160, $8,000 vs $12,500
 *   11.3 MB = 100 - Q, MC = 10 + Q, MEB $20   -> QE 45, Q* 55, DWL $100, subsidy $20
 *   11.4 three neighbors, vertical sum of MB, cost per streetlight
 *   11.5 MB = 100 - 2S, MD = 2S                -> S* 25 from either starting right
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function niceCeil(v, step) { return Math.ceil(v / step - 1e-9) * step; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function isTenth(v) { return Math.abs(v * 10 - Math.round(v * 10)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  // Draw until valid and different from the previous parameters.
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 5000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }

  /* ---------- 11.1 Negative externality, Pigouvian tax ---------- */
  var pigou = {
    defaults: function () { return { a: 100, c: 10, m: 20 }; },
    gen: function (rng) {
      return { a: pick(rng, range(80, 120, 10)), c: pick(rng, [0, 10, 20, 30]), m: pick(rng, range(10, 40, 2)) };
    },
    valid: function (p) {
      var s = pigou.solve(p);
      return s.Qs >= 15 && s.QE - s.Qs >= 5 && s.QE <= 0.6 * p.a;
    },
    random: function (rng, prev) { return draw(pigou.gen, pigou.valid, prev, rng); },
    solve: function (p) {
      var QE = (p.a - p.c) / 2, Qs = (p.a - p.c - p.m) / 2;
      return {
        QE: QE, PE: p.a - QE,            // market: PMC = MB
        Qs: Qs, Ps: p.a - Qs,            // optimum: SMC = PMC + MEC = MB
        tax: p.m,                         // t* = MEC (constant MEC)
        keep: p.a - Qs - p.m,             // what firms keep per unit under the tax
        dwl: p.m * p.m / 4                // 1/2 x (QE - Q*) x MEC = MEC^2 / 4
      };
    },
    // market quantity and DWL under an arbitrary per-unit tax t
    withTax: function (p, t) {
      var Qt = Math.max(0, (p.a - p.c - t) / 2), Qs = (p.a - p.c - p.m) / 2;
      return { Q: Qt, P: p.a - Qt, dwl: (Qt - Qs) * (Qt - Qs) };
    },
    domain: function (p) { return { X: p.a, Y: niceCeil(p.a + 15, 20), xs: 20, ys: 20 }; },
    score: function (p, g) {
      var s = pigou.solve(p), d = pigou.domain(p);
      function pt(gp, Q, P) { return gp ? clamp01(1 - Math.hypot((gp.x - Q) / d.X, (gp.y - P) / d.Y) / 0.16) : 0; }
      var sm = pt(g.mk, s.QE, s.PE), so = pt(g.op, s.Qs, s.Ps);
      var st = g.t == null ? 0 : clamp01(1 - Math.abs(g.t - p.m) / Math.max(p.m, 12));
      return { total: Math.round(100 * (0.25 * sm + 0.4 * so + 0.35 * st)), parts: [sm, so, st] };
    }
  };

  /* ---------- 11.2 Cap-and-trade, equalize MAC ---------- */
  var cap = {
    defaults: function () { return { al: 2, be: 8, T: 100 }; },
    gen: function (rng) {
      var lo = pick(rng, [1, 2, 3]), hi = lo * pick(rng, [2, 3, 4]);
      var swap = rng() < 0.4;
      return { al: swap ? hi : lo, be: swap ? lo : hi, T: pick(rng, [60, 80, 100, 120]) };
    },
    valid: function (p) {
      var s = cap.solve(p);
      return isTenth(s.eA) && Number.isInteger(s.eA) && p.T >= 60;
    },
    random: function (rng, prev) { return draw(cap.gen, cap.valid, prev, rng); },
    cost: function (p, x) { return 0.5 * p.al * x * x + 0.5 * p.be * (p.T - x) * (p.T - x); },
    solve: function (p) {
      var eA = p.be * p.T / (p.al + p.be), eB = p.T - eA, lam = p.al * eA;
      var ct = cap.cost(p, eA), eq = cap.cost(p, p.T / 2);
      return { eA: eA, eB: eB, lam: lam, costA: 0.5 * p.al * eA * eA, costB: 0.5 * p.be * eB * eB,
        ct: ct, eq: eq, save: eq - ct, pct: (eq - ct) / eq };
    },
    domain: function (p) {
      var s = cap.solve(p), Y = niceCeil(1.8 * s.lam, 50);
      return { X: p.T, Y: Y, xs: 20, ys: Y <= 250 ? 50 : Y <= 600 ? 100 : 200 };
    },
    score: function (p, g) {
      var s = cap.solve(p);
      var e = Math.abs(g.x - s.eA) / (0.3 * p.T);
      return { total: Math.round(100 * clamp01(1 - e)), parts: [clamp01(1 - e)] };
    }
  };

  /* ---------- 11.3 Positive externality, Pigouvian subsidy ---------- */
  var pos = {
    defaults: function () { return { a: 100, c: 10, m: 20 }; },
    gen: function (rng) {
      return { a: pick(rng, range(80, 120, 10)), c: pick(rng, [0, 10, 20]), m: pick(rng, range(10, 40, 2)) };
    },
    valid: function (p) {
      var s = pos.solve(p);
      return s.Qs <= 0.75 * p.a && s.QE >= 0.3 * p.a;
    },
    random: function (rng, prev) { return draw(pos.gen, pos.valid, prev, rng); },
    solve: function (p) {
      var QE = (p.a - p.c) / 2, Qs = (p.a - p.c + p.m) / 2;
      return { QE: QE, PE: p.c + QE, Qs: Qs, Ps: p.c + Qs, sub: p.m, dwl: p.m * p.m / 4 };
    },
    withSub: function (p, s) {
      var Q = (p.a - p.c + s) / 2, Qs = (p.a - p.c + p.m) / 2;
      return { Q: Q, P: p.c + Q, dwl: (Q - Qs) * (Q - Qs) };
    },
    domain: function (p) { return { X: p.a, Y: niceCeil(p.a + p.m + 8, 20), xs: 20, ys: 20 }; },
    msb: function (p, q) { return p.a - q + p.m; },
    // g.draw: array of {x, y} samples of the student's curve; g.q: their Q*
    score: function (p, g) {
      var s = pos.solve(p), errs = 0, n = 0;
      (g.draw || []).forEach(function (pt) { if (pt) { errs += Math.abs(pt.y - pos.msb(p, pt.x)); n++; } });
      var sd = n ? clamp01(1 - (errs / n) / (1.4 * Math.max(p.m, 15))) : 0;
      var sq = g.q == null ? 0 : clamp01(1 - Math.abs(g.q - s.Qs) / (0.15 * p.a));
      return { total: Math.round(100 * (0.6 * sd + 0.4 * sq)), parts: [sd, sq], meanErr: n ? errs / n : null };
    }
  };

  /* ---------- 11.4 Public good, vertical summation ---------- */
  var pub = {
    names: ['Ana', 'Ben', 'Cai'],
    defaults: function () { return { v: [160, 120, 80], k: 180, Gm: 10 }; },
    gen: function (rng) {
      var vals = range(40, 200, 10);
      var v = [pick(rng, vals), pick(rng, vals), pick(rng, vals)].sort(function (x, y) { return y - x; });
      var A = v[0] + v[1] + v[2];
      var aloneCase = rng() < 0.3;
      var k = aloneCase ? pick(rng, range(v[1] + 10, v[0] - 10, 10)) : pick(rng, range(v[0] + 10, A - 10, 10));
      return { v: v, k: k, Gm: 10 };
    },
    valid: function (p) {
      var v = p.v, s;
      if (v[0] - v[1] < 40 || v[1] - v[2] < 40 || v[0] + v[1] + v[2] > 420) return false;   // lines far enough apart to label
      if (!(p.k > v[1] && p.k < v[0] + v[1] + v[2])) return false;
      s = pub.solve(p);
      return s.Gs >= 3 && s.Gs <= 8 && isTenth(s.Gs) && isTenth(s.Galone);
    },
    random: function (rng, prev) { return draw(pub.gen, pub.valid, prev, rng); },
    mb: function (p, i, G) { return Math.max(0, p.v[i] * (1 - G / p.Gm)); },
    sum: function (p, G) { return pub.mb(p, 0, G) + pub.mb(p, 1, G) + pub.mb(p, 2, G); },
    solve: function (p) {
      var A = p.v[0] + p.v[1] + p.v[2];
      var Gs = p.Gm * (1 - p.k / A);
      // voluntary provision: only the highest-value neighbor ever buys, up to her MB = cost
      var Galone = p.v[0] > p.k ? p.Gm * (1 - p.k / p.v[0]) : 0;
      return { A: A, Gs: Gs, Galone: Galone, surplus: 0.5 * Gs * (A - p.k), lost: 0.5 * (Gs - Galone) * (pub.sum(p, Galone) - p.k) };
    },
    domain: function (p) {
      var A = p.v[0] + p.v[1] + p.v[2], Y = niceCeil(A * 1.08, 50);
      return { X: p.Gm, Y: Y, xs: 2, ys: Y <= 300 ? 50 : 100 };
    },
    G2: 6,  // second handle of the student's line sits at G = 6
    score: function (p, g) {
      var A = pub.solve(p).A;
      var e = (Math.abs(g.y0 - A) + Math.abs(g.y6 - pub.sum(p, pub.G2))) / 2 / (0.25 * A);
      return { total: Math.round(100 * clamp01(1 - e)), parts: [clamp01(1 - e)] };
    }
  };

  /* ---------- 11.5 Coase theorem ---------- */
  var coase = {
    defaults: function () { return { a: 100, b: 2, d: 2 }; },
    gen: function (rng) { return { a: pick(rng, range(60, 120, 10)), b: pick(rng, [1, 2, 3]), d: pick(rng, [1, 2, 3, 4]) }; },
    valid: function (p) {
      var r = p.d / p.b, s;
      if (r < 0.5 || r > 2) return false;
      s = coase.solve(p);
      return Number.isInteger(s.Smax) && isTenth(s.Ss) && s.Smax <= 80 && s.Smax >= 20;
    },
    random: function (rng, prev) { return draw(coase.gen, coase.valid, prev, rng); },
    mb: function (p, S) { return Math.max(0, p.a - p.b * S); },
    md: function (p, S) { return p.d * S; },
    solve: function (p) {
      var Smax = p.a / p.b, Ss = p.a / (p.b + p.d), price = p.d * Ss;
      return {
        Smax: Smax, Ss: Ss, price: price,
        // factory holds the right: starts at Smax, neighbor pays it to cut back to S*
        fLoss: 0.5 * (Smax - Ss) * price,                       // factory's lost benefit, area under MB from S* to Smax
        nSave: 0.5 * p.d * (Smax * Smax - Ss * Ss),             // neighbor's avoided damage, area under MD
        // neighbor holds the right: starts at 0, factory pays for permission up to S*
        nHarm: 0.5 * p.d * Ss * Ss,                             // neighbor's damage from 0 to S*
        fGain: p.a * Ss - 0.5 * p.b * Ss * Ss                   // factory's benefit from 0 to S*
      };
    },
    domain: function (p) {
      var s = coase.solve(p), top = Math.max(p.a, p.d * s.Smax), Y = niceCeil(top * 1.06, 20);
      return { X: s.Smax, Y: Y, xs: s.Smax <= 30 ? 5 : 10, ys: Y <= 140 ? 20 : Y <= 300 ? 50 : 100 };
    },
    score: function (p, g) {
      var s = coase.solve(p);
      var e = (Math.abs(g.f - s.Ss) + Math.abs(g.n - s.Ss)) / 2 / (0.3 * s.Smax);
      return { total: Math.round(100 * clamp01(1 - e)), parts: [clamp01(1 - e)] };
    }
  };

  var api = { pigou: pigou, cap: cap, pos: pos, pub: pub, coase: coase, niceCeil: niceCeil, clamp01: clamp01, isTenth: isTenth };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.W11 = api;
})(this);
