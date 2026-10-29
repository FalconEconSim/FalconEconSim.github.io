/* Week 8 economics for "Predict, then see". Pure functions, no DOM. Loaded by the page and by
 * verify.js in node (module.exports), so every number the page shows is a number the script checked.
 *
 * Defaults match week8-viz.html (and textbook ch. 8) except where a live default is a degenerate
 * question; those first rounds are noted here and in NOTES.md:
 *   8.1  D: P = 20 - Q, S: P = 4 + Q, P* = $12, Q* = 8, TS max $64. Live price slider starts AT P*
 *        (no question), so the first round holds the price at $15: buyers want 5, sellers 11,
 *        5 trade, CS $12.50, PS $42.50, DWL $9.
 *   8.2  D: P = 10 - Q, MC = $2, Q* = 8, restricted to Q = 4: P = $6, transfer $16, DWL $8.
 *   8.3  D: P = 20 - Q, S: P = 4 + Q, P_W = $6. Live tariff starts at $0 (no question), so the first
 *        round adds a $2 tariff: P_t = $8, Q_s 2 -> 4, Q_d 14 -> 12, revenue $16, DWL $4.
 *   8.4  D: P = 10 - Q, MC = $2 (film): MR hits 0 at 5, Q_M = 4, P_M = $6, profit $16.
 *   8.5  D: P = 10 - Q, MC = $2: competition CS $32; monopoly P $6, CS $8, profit $16, DWL $8.
 *   8.7  D: P = 10 - Q, MC = $2: perfect price discrimination sells 8, the last unit at $2, profit $32.
 *   8.8  D: P = 10 - Q, MC = $2. Live tiers start at n = 1 (the plain monopoly of 8.4), so the first
 *        round uses n = 3: blocks end at 2, 4, 6 (prices $8, $6, $4), profit $24, CS $6, DWL $2.
 *   8.9  D1: P = 100 - Q, D2: P = 50 - Q/2, MC = $20: Q1 40 at $60, Q2 30 at $35 (textbook example).
 *   8.10 D: P = 20 - Q, TC = 50 + 2Q: monopoly Q 9 at $11 (profit $31, DWL $40.50); P = AC at
 *        Q = 9 + sqrt(31) = 14.57, P = 11 - sqrt(31) = $5.43 (DWL $5.89); P = MC loses $50.
 *   8.11 same costs, low tier P_R = $2: the lowest break-even P_A = 11 - sqrt(31) = $5.43
 *        (the live slider starts at P_A = $9, which is where the handle starts).
 */
(function (root) {
  'use strict';

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(a, b, step) { var out = []; for (var v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function isMult(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-9; }
  function same(p, q) { return JSON.stringify(p) === JSON.stringify(q); }
  function lin(e, full, zero) { e = Math.abs(e); return e <= full ? 1 : clamp01(1 - (e - full) / (zero - full)); }
  function draw(gen, valid, prev, rng) {
    for (var i = 0; i < 50000; i++) {
      var p = gen(rng);
      if (valid(p) && (!prev || !same(p, prev))) return p;
    }
    throw new Error('no valid draw');
  }
  // an axis that reaches past vmax with at most 7 ticks on a 1-2-5 step
  function niceAxis(vmax) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100];
    for (var i = 0; i < steps.length; i++) { var s = steps[i], D = Math.ceil(vmax / s - 1e-9) * s; if (D / s <= 7) return { D: D, s: s }; }
    return { D: Math.ceil(vmax / 200) * 200, s: 200 };
  }
  function sq(v) { return v * v; }

  /* ---------- 8.1 CS / PS anatomy: a price held away from P* ---------- */
  // D: P = a - Q, S: P = b + Q (live sliders: a 14..24, b 1..8)
  var welfare = {
    defaults: function () { return { a: 20, b: 4, P: 15 }; },
    gen: function (rng) {
      var a = 14 + Math.floor(rng() * 11), b = 1 + Math.floor(rng() * 8);
      return { a: a, b: b, P: pick(rng, range(b + 1, a - 1, 0.5)) };
    },
    valid: function (p) {
      var s = welfare.solve(p), gap = Math.abs(p.P - s.Ps);
      return p.a - p.b >= 8 && gap >= 1.5 && gap >= 0.25 * s.Qe && gap <= 0.7 * s.Qe && s.Qt >= 1.5 && isMult(p.P, 0.5);
    },
    random: function (rng, prev) { return draw(welfare.gen, welfare.valid, prev, rng); },
    // at price P: buyers want Qd, sellers offer Qs, the short side trades
    at: function (p, P) {
      var Qd = Math.max(0, p.a - P), Qs = Math.max(0, P - p.b), Qt = Math.min(Qd, Qs);
      var CS = (p.a - P) * Qt - 0.5 * Qt * Qt, PS = (P - p.b) * Qt - 0.5 * Qt * Qt, TSmax = sq(p.a - p.b) / 4;
      return { Qd: Qd, Qs: Qs, Qt: Qt, CS: CS, PS: PS, TS: CS + PS, DWL: TSmax - CS - PS };
    },
    solve: function (p) {
      var Qs0 = (p.a - p.b) / 2, Ps = (p.a + p.b) / 2, w = welfare.at(p, p.P);
      return { Qe: Qs0, Ps: Ps, TSmax: sq(p.a - p.b) / 4, Qd: w.Qd, Qs: w.Qs, Qt: w.Qt, CS: w.CS, PS: w.PS, TS: w.TS, DWL: w.DWL,
        above: p.P > Ps, Pd: p.a - w.Qt, Psup: p.b + w.Qt };   // Pd, Psup: demand and supply prices at the traded quantity
    },
    domain: function (p) { var x = niceAxis(p.a * 1.06), y = niceAxis(p.a * 1.1); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = welfare.solve(p);
      return { total: Math.round(100 * lin((g.Q - s.Qt) / s.Qe, 0.03, 0.35)) };
    }
  };

  /* ---------- 8.2 Transfer vs destruction: output held below Q* ---------- */
  // D: P = a - bQ, MC = c, output restricted to Q
  var transfer = {
    defaults: function () { return { a: 10, b: 1, c: 2, Q: 4 }; },
    gen: function (rng) {
      var b = pick(rng, [0.5, 1, 1, 2]), a = pick(rng, range(8, 20, 1)), c = pick(rng, range(0, 6, 1)), Qs = (a - c) / b;
      return { a: a, b: b, c: c, Q: pick(rng, range(0.5, Qs, 0.5)) };
    },
    valid: function (p) {
      var Qs = (p.a - p.c) / p.b, PQ = p.a - p.b * p.Q;
      return Qs >= 6 && Qs <= 24 && p.a - p.c >= 6 && p.Q >= 0.15 * Qs && p.Q <= 0.75 * Qs && isMult(PQ, 0.5) && isMult(Qs, 0.5) && p.a <= 20;
    },
    random: function (rng, prev) { return draw(transfer.gen, transfer.valid, prev, rng); },
    at: function (p, Q) {
      var Qs = (p.a - p.c) / p.b, PQ = p.a - p.b * Q;
      return { PQ: PQ, transfer: Q * (PQ - p.c), dwl: 0.5 * (Qs - Q) * (PQ - p.c), csRem: 0.5 * Q * (p.a - PQ) };
    },
    solve: function (p) {
      var Qs = (p.a - p.c) / p.b, w = transfer.at(p, p.Q), CSc = 0.5 * Qs * (p.a - p.c);
      return { Qs: Qs, PQ: w.PQ, transfer: w.transfer, dwl: w.dwl, csRem: w.csRem, CSc: CSc, lost: CSc - w.csRem, Qeq: Qs / 3 };
    },
    domain: function (p) { var x = niceAxis(p.a / p.b * 1.06), y = niceAxis(p.a * 1.12); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = transfer.solve(p);
      var s1 = g.mp ? lin((g.P - s.PQ) / (p.a - p.c), 0.02, 0.35) : 0, s2 = g.mx ? lin((g.X - s.Qs) / s.Qs, 0.02, 0.35) : 0;
      return { total: Math.round(100 * (0.5 * s1 + 0.5 * s2)), parts: [s1, s2] };
    }
  };

  /* ---------- 8.3 Trade and tariffs ---------- */
  // D: P = a - Q, S: P = b + Q, world price Pw, specific tariff t
  var tariff = {
    defaults: function () { return { a: 20, b: 4, Pw: 6, t: 2 }; },
    gen: function (rng) {
      var a = 16 + Math.floor(rng() * 9), b = 1 + Math.floor(rng() * 6);
      return { a: a, b: b, Pw: b + 1 + Math.floor(rng() * 8), t: 1 + Math.floor(rng() * 4) };
    },
    valid: function (p) {
      var Ps = (p.a + p.b) / 2;
      return Ps - p.b >= 5 && p.Pw >= p.b + 1 && p.Pw <= Ps - 3 && p.Pw + p.t <= Ps - 1;
    },
    random: function (rng, prev) { return draw(tariff.gen, tariff.valid, prev, rng); },
    // everything at the world price Pw and tariff t (a tariff that reaches P* is prohibitive)
    at: function (p, Pw, t) {
      var Ps = (p.a + p.b) / 2, Pt = Math.min(Pw + t, Ps), ta = Pt - Pw;
      var Qs0 = Math.max(0, Pw - p.b), Qd0 = p.a - Pw, Qs = Math.max(0, Pt - p.b), Qd = p.a - Pt;
      var CS0 = 0.5 * sq(p.a - Pw), PS0 = 0.5 * sq(Qs0), CS = 0.5 * sq(p.a - Pt), PS = 0.5 * sq(Qs);
      var CSa = 0.5 * sq(p.a - Ps), PSa = 0.5 * sq(Ps - p.b);
      var rev = ta * Math.max(0, Qd - Qs), dwlP = 0.5 * ta * (Qs - Qs0), dwlC = 0.5 * ta * (Qd0 - Qd);
      return { Ps: Ps, Qa: Ps - p.b, Pt: Pt, ta: ta, Qs0: Qs0, Qd0: Qd0, Qs: Qs, Qd: Qd, imp0: Qd0 - Qs0, imp: Math.max(0, Qd - Qs),
        CS0: CS0, PS0: PS0, CS: CS, PS: PS, CSa: CSa, PSa: PSa, gain: CS0 + PS0 - CSa - PSa,
        dCS: CS - CS0, dPS: PS - PS0, rev: rev, dwlP: dwlP, dwlC: dwlC, dwl: dwlP + dwlC, prohibitive: Pw + t >= Ps - 1e-9 };
    },
    solve: function (p) { return tariff.at(p, p.Pw, p.t); },
    // zoomed on the trade band: the demand intercept may sit above the frame
    domain: function (p) { var Ps = (p.a + p.b) / 2, x = niceAxis((p.a - p.Pw) * 1.18), y = niceAxis(Ps + 0.35 * (p.a - Ps)); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = tariff.solve(p);
      var sp = g.mp ? lin((g.P - s.Pt) / p.t, 0.05, 0.8) : 0;
      var sqs = g.ms ? lin((g.qs - s.Qs) / p.t, 0.05, 0.8) : 0, sqd = g.md ? lin((g.qd - s.Qd) / p.t, 0.05, 0.8) : 0;
      return { total: Math.round(100 * (0.4 * sp + 0.3 * sqs + 0.3 * sqd)), parts: [sp, sqs, sqd] };
    }
  };

  /* ---------- 8.4 Monopoly two-step rule (has a film) ---------- */
  // D: P = a - Q, MR = a - 2Q, MC = c. Q_M = (a - c)/2, P_M = (a + c)/2, profit (a - c)^2 / 4
  var mono = {
    defaults: function () { return { a: 10, c: 2 }; },
    gen: function (rng) { return { a: 6 + Math.floor(rng() * 11), c: Math.floor(rng() * 7) }; },
    valid: function (p) { return p.a - p.c >= 4; },
    random: function (rng, prev) { return draw(mono.gen, mono.valid, prev, rng); },
    solve: function (p) {
      var a = p.a, c = p.c, Qm = (a - c) / 2, Pm = (a + c) / 2, Qc = a - c;
      return { mr0: a / 2, Qm: Qm, Pm: Pm, Qc: Qc, pi: Qm * (Pm - c), CS: 0.5 * Qm * (a - Pm), DWL: 0.5 * (Qc - Qm) * (Pm - c), CSc: 0.5 * Qc * (a - c) };
    },
    domain: function (p) { var x = niceAxis(p.a * 1.08); return { X: x.D, Y: x.D, xs: x.s, ys: x.s }; },
    score: function (p, g) {
      var s = mono.solve(p);
      var s1 = g.mm ? lin((g.mr - s.mr0) / p.a, 0.02, 0.3) : 0, s2 = g.mq ? lin((g.q - s.Qm) / s.Qc, 0.03, 0.4) : 0, s3 = g.mp ? lin((g.p - s.Pm) / s.Qc, 0.03, 0.4) : 0;
      return { total: Math.round(100 * (0.25 * s1 + 0.4 * s2 + 0.35 * s3)), parts: [s1, s2, s3] };
    }
  };

  /* ---------- 8.5 Competition vs monopoly: the biggest profit rectangle ---------- */
  var compare = {
    defaults: function () { return { a: 10, c: 2 }; },
    gen: function (rng) { return { a: 8 + Math.floor(rng() * 9), c: Math.floor(rng() * 9) }; },
    valid: function (p) { return p.a - p.c >= 4; },
    random: function (rng, prev) { return draw(compare.gen, compare.valid, prev, rng); },
    profit: function (p, P) { return (P - p.c) * Math.max(0, p.a - P); },
    solve: function (p) { return mono.solve(p); },
    domain: function (p) { var x = niceAxis(p.a * 1.08); return { X: x.D, Y: x.D, xs: x.s, ys: x.s }; },
    start: function (p) { return Math.round((p.c + 0.15 * (p.a - p.c)) * 2) / 2; },
    score: function (p, g) { var s = mono.solve(p); return { total: Math.round(100 * lin((g.P - s.Pm) / (p.a - p.c), 0.02, 0.3)) }; }
  };

  /* ---------- 8.7 Perfect price discrimination ---------- */
  var ppd = {
    defaults: function () { return { a: 10, c: 2 }; },
    gen: function (rng) { return { a: 8 + Math.floor(rng() * 9), c: Math.floor(rng() * 7) }; },
    valid: function (p) { return p.a - p.c >= 4; },
    random: function (rng, prev) { return draw(ppd.gen, ppd.valid, prev, rng); },
    solve: function (p) { var s = mono.solve(p); s.ppdQ = s.Qc; s.ppdP = p.c; s.ppdPi = s.CSc; return s; },
    domain: function (p) { var x = niceAxis(p.a * 1.08); return { X: x.D, Y: x.D, xs: x.s, ys: x.s }; },
    score: function (p, g) { var s = ppd.solve(p); return { total: Math.round(100 * lin((g.Q - s.Qc) / s.Qc, 0.02, 0.35)) }; }
  };

  /* ---------- 8.8 Block pricing (second degree) ---------- */
  // D: P = a - Q, MC = c, Q* = a - c. n blocks; each priced at the WTP of its last unit.
  // Profit-maximizing block ends are equally spaced: q_i = i Q*/(n+1).
  // Closed forms with TS = Q*^2/2: profit = TS n/(n+1), CS = TS n/(n+1)^2, DWL = TS/(n+1)^2.
  var blocks = {
    defaults: function () { return { a: 10, c: 2, n: 3 }; },
    gen: function (rng) {
      var n = pick(rng, [2, 3, 4]), k = pick(rng, range(1, 6, 0.5)), Qs = k * (n + 1), c = Math.floor(rng() * 6);
      return { a: Qs + c, c: c, n: n };
    },
    valid: function (p) { var Qs = p.a - p.c; return Qs >= 6 && Qs <= 18 && p.a <= 20 && isMult(Qs / (p.n + 1), 0.5); },
    random: function (rng, prev) { return draw(blocks.gen, blocks.valid, prev, rng); },
    // outcome of any increasing list of block ends qs (each block sells from the previous end to q at a - q)
    outcome: function (p, qs) {
      var prev = 0, pi = 0, cs = 0;
      qs.forEach(function (q) { var P = p.a - q, w = q - prev; pi += (P - p.c) * w; cs += 0.5 * w * w; prev = q; });
      var Qs = p.a - p.c, TS = 0.5 * Qs * Qs, Qn = qs.length ? qs[qs.length - 1] : 0;
      // surplus from units actually sold minus... DWL = surplus on units never sold (if Qn < Q*)
      var dwl = Qn < Qs ? 0.5 * sq(Qs - Qn) : 0, excess = Qn > Qs ? 0.5 * sq(Qn - Qs) : 0;
      return { pi: pi, cs: cs, dwl: dwl, excess: excess, TS: TS, Qn: Qn };
    },
    ends: function (p, n) { var Qs = p.a - p.c, out = []; for (var i = 1; i <= n; i++) out.push(i * Qs / (n + 1)); return out; },
    solve: function (p) {
      var Qs = p.a - p.c, TS = 0.5 * Qs * Qs, n = p.n, q = blocks.ends(p, n);
      return { Qs: Qs, TS: TS, q: q, prices: q.map(function (v) { return p.a - v; }), pi: TS * n / (n + 1), cs: TS * n / sq(n + 1), dwl: TS / sq(n + 1), Qn: q[n - 1],
        piM: TS / 2 };
    },
    start: function (p) { var Qs = p.a - p.c, out = []; for (var i = 1; i <= p.n; i++) out.push(Math.round(Qs * (0.06 + 0.12 * (i - 1)) * 4) / 4); return out; },
    domain: function (p) { var x = niceAxis(p.a * 1.06), y = niceAxis(p.a * 1.12); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = blocks.solve(p), e = 0, qs = g.q.slice().sort(function (x, y) { return x - y; });
      for (var i = 0; i < p.n; i++) e += Math.abs(qs[i] - s.q[i]) / s.Qs;
      return { total: Math.round(100 * lin(e / p.n, 0.02, 0.2)) };
    }
  };

  /* ---------- 8.9 Market separation (third degree) ---------- */
  // M1: P = a1 - Q (MR1 = a1 - 2Q), M2: P = a2 - Q/2 (MR2 = a2 - Q), MC = c
  var separate = {
    defaults: function () { return { a1: 100, a2: 50, c: 20 }; },
    gen: function (rng) { return { a1: pick(rng, range(60, 140, 10)), a2: pick(rng, range(30, 80, 5)), c: pick(rng, range(5, 40, 1)) }; },
    valid: function (p) {
      var s = separate.solve(p);
      return p.a2 - p.c >= 10 && p.a1 - p.a2 >= 20 && s.P1 - s.uP >= 0.2 * (p.a1 - p.c) && s.uP - s.P2 >= 0.2 * (p.a2 - p.c) && isMult(s.P1, 0.5) && isMult(s.P2, 0.5) && s.uP < p.a2 - 1;
    },
    random: function (rng, prev) { return draw(separate.gen, separate.valid, prev, rng); },
    q1: function (p, P) { return Math.max(0, p.a1 - P); },
    q2: function (p, P) { return Math.max(0, 2 * (p.a2 - P)); },
    // uniform price: both markets buy if P < a2 (Q = a1 + 2 a2 - 3P), else only market 1
    uniform: function (p) {
      var c = p.c, pBoth = (p.a1 + 2 * p.a2 + 3 * c) / 6, pOne = (p.a1 + c) / 2;
      var piAt = function (P) { return (P - c) * (separate.q1(p, P) + separate.q2(p, P)); };
      var P = pBoth < p.a2 && piAt(pBoth) >= piAt(pOne) ? pBoth : pOne;
      return { P: P, pi: piAt(P), Q1: separate.q1(p, P), Q2: separate.q2(p, P) };
    },
    solve: function (p) {
      var c = p.c, Q1 = Math.max(0, (p.a1 - c) / 2), P1 = (p.a1 + c) / 2, served2 = c < p.a2;
      var Q2 = served2 ? p.a2 - c : 0, P2 = (p.a2 + c) / 2;
      var pi1 = (P1 - c) * Q1, pi2 = served2 ? (P2 - c) * Q2 : 0, u = separate.uniform(p);
      var e1 = Q1 > 0 ? -P1 / Q1 : -Infinity, e2 = Q2 > 0 ? -2 * P2 / Q2 : -Infinity;
      return { Q1: Q1, P1: P1, Q2: Q2, P2: P2, served2: served2, pi1: pi1, pi2: pi2, pi: pi1 + pi2, e1: e1, e2: e2,
        L1: (P1 - c) / P1, L2: served2 ? (P2 - c) / P2 : 0, uP: u.P, uPi: u.pi, uQ1: u.Q1, uQ2: u.Q2, gain: pi1 + pi2 - u.pi,
        start: Math.round(u.P * 2) / 2 };
    },
    domain: function (p) { var x = niceAxis(Math.max(p.a1, 2 * p.a2) * 1.05), y = niceAxis(p.a1 * 1.1); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = separate.solve(p);
      var s1 = g.m1 ? lin((g.P1 - s.P1) / (p.a1 - p.c), 0.02, 0.3) : 0, s2 = g.m2 ? lin((g.P2 - s.P2) / (p.a2 - p.c), 0.02, 0.3) : 0;
      return { total: Math.round(100 * (s1 + s2) / 2), parts: [s1, s2] };
    }
  };

  /* ---------- 8.10 Natural monopoly regulation ---------- */
  // D: P = a - Q, TC = F + cQ, AC = F/Q + c, MC = c
  var NM = [[16, 2], [18, 2], [20, 2], [22, 2], [24, 2], [20, 1], [20, 3], [24, 4], [18, 1], [22, 3], [16, 1], [24, 3]];
  var natmono = {
    defaults: function () { return { a: 20, F: 50, c: 2 }; },
    gen: function (rng) { var l = pick(rng, NM); return { a: l[0], c: l[1], F: pick(rng, range(20, 100, 5)) }; },
    valid: function (p) { var r = 4 * p.F / sq(p.a - p.c); return r >= 0.56 && r <= 0.85; },
    random: function (rng, prev) { return draw(natmono.gen, natmono.valid, prev, rng); },
    AC: function (p, Q) { return p.F / Q + p.c; },
    // break-even on demand: (a - Q - c) Q = F; the larger root is the lower price
    acRoot: function (p) { var m = p.a - p.c, d = Math.sqrt(m * m - 4 * p.F); return (m + d) / 2; },
    solve: function (p) {
      var a = p.a, c = p.c, Qm = (a - c) / 2, Pm = (a + c) / 2, Qc = a - c, Qa = natmono.acRoot(p), Pa = a - Qa;
      return { Qm: Qm, Pm: Pm, ACm: natmono.AC(p, Qm), piM: Qm * (Pm - c) - p.F, dwlM: 0.5 * (Qc - Qm) * (Pm - c), csM: 0.5 * Qm * (a - Pm),
        Qc: Qc, Pc: c, ACc: natmono.AC(p, Qc), lossC: p.F, csC: 0.5 * Qc * (a - c),
        Qa: Qa, Pa: Pa, piA: Qa * (Pa - c) - p.F, dwlA: 0.5 * (Qc - Qa) * (Pa - c), csA: 0.5 * Qa * (a - Pa) };
    },
    domain: function (p) { var x = niceAxis(p.a * 1.06), y = niceAxis(p.a * 1.1); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) {
      var s = natmono.solve(p), m = p.a - p.c;
      var s1 = g.mm ? lin((g.Pm - s.Pm) / m, 0.02, 0.3) : 0, s2 = g.ma ? lin((g.Pa - s.Pa) / m, 0.015, 0.25) : 0;
      return { total: Math.round(100 * (0.4 * s1 + 0.6 * s2)), parts: [s1, s2] };
    }
  };

  /* ---------- 8.11 Two-tier pricing and cross-subsidy ---------- */
  // same cost structure; high tier pays P_A (Q_A = a - P_A buyers), low tier P_R (buyers Q_A..Q_R)
  var twotier = {
    defaults: function () { return { a: 20, F: 50, c: 2, PR: 2, PA0: 9 }; },
    gen: function (rng) {
      var a = pick(rng, [18, 20, 22, 24]), c = pick(rng, [1, 2, 3]), F = pick(rng, range(30, 80, 10)), PR = pick(rng, range(c, c + 4, 0.5));
      var p = { a: a, F: F, c: c, PR: PR, PA0: 0 }, r = twotier.root(p);
      if (isFinite(r)) p.PA0 = Math.ceil((r + 0.65 * ((a + PR) / 2 - r)) * 2) / 2;
      return p;
    },
    valid: function (p) {
      var r = twotier.root(p), QR = p.a - p.PR;
      return isFinite(r) && r >= p.PR + 1.5 && r <= p.a - 3 && twotier.AC(p, QR) - p.PR >= 0.75 && p.PA0 - r >= Math.max(2, 0.16 * (p.a - p.PR)) && p.PA0 <= p.a - 1.5 && twotier.profit(p, p.PA0) > 0;
    },
    random: function (rng, prev) { return draw(twotier.gen, twotier.valid, prev, rng); },
    AC: function (p, Q) { return p.F / Q + p.c; },
    // net profit as a function of P_A for the round's P_R
    profit: function (p, PA, PR) {
      PR = PR == null ? p.PR : PR;
      var QA = Math.max(0, p.a - PA), QR = Math.max(0, p.a - PR);
      return PA * QA + PR * (QR - QA) - p.F - p.c * QR;
    },
    // P_A^2 - (a + P_R) P_A + (P_R^2 + F + c a - c P_R) = 0, smaller root = lowest break-even P_A
    root: function (p, PR) {
      PR = PR == null ? p.PR : PR;
      var B = p.a + PR, K = PR * PR + p.F + p.c * p.a - p.c * PR, d = B * B - 4 * K;
      return d < 0 ? NaN : (B - Math.sqrt(d)) / 2;
    },
    parts: function (p, PA, PR) {
      PR = PR == null ? p.PR : PR;
      var QA = Math.max(0, p.a - PA), QR = Math.max(0, p.a - PR), ACR = twotier.AC(p, QR);
      var hi = (PA - ACR) * QA, lo = (PR - ACR) * (QR - QA);
      return { QA: QA, QR: QR, ACR: ACR, hi: hi, lo: lo, green: Math.max(0, hi) + Math.max(0, lo), red: Math.max(0, -hi) + Math.max(0, -lo), net: hi + lo };
    },
    solve: function (p) {
      var r = twotier.root(p), w = twotier.parts(p, r);
      return { PA: r, QA: w.QA, QR: w.QR, ACR: w.ACR, green: w.green, red: w.red, net: twotier.profit(p, r), start: twotier.parts(p, p.PA0), single: p.a - natmono.acRoot(p) };
    },
    // zoomed on the low prices where the tiers live: the top of demand may sit above the frame
    domain: function (p) { var x = niceAxis(p.a * 1.06), y = niceAxis(Math.max(p.PA0, twotier.AC(p, p.a - p.PR) + 1) * 1.35); return { X: x.D, Y: y.D, xs: x.s, ys: y.s }; },
    score: function (p, g) { var s = twotier.solve(p), m = p.a - p.PR; return { total: Math.round(100 * lin((g.PA - s.PA) / m, 0.012, 0.15)) }; }
  };

  var W8 = { welfare: welfare, transfer: transfer, tariff: tariff, mono: mono, compare: compare, ppd: ppd, blocks: blocks, separate: separate, natmono: natmono, twotier: twotier,
    util: { lin: lin, niceAxis: niceAxis, isMult: isMult, pick: pick, range: range, clamp: clamp } };
  if (typeof module !== 'undefined' && module.exports) module.exports = W8;
  else root.W8 = W8;
})(this);
