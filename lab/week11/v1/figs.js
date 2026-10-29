/* Week 11 figures for Manim Live. Models and defaults match week11-viz.html
 * and the Week 11 textbook (MB = 100 - Q, PMC = 10 + Q, MEC $20; MAC_A = 2e,
 * MAC_B = 8e, cap 100; MEB $20; streetlight cost $300, N = 3, v = $120;
 * Coase MB = 100 - 2S, MD = 2S, S* = 25).
 */
(function () {
  'use strict';
  var ML = window.ManimLive, money = ML.money, clamp = ML.clamp, lerp = ML.lerp;
  var C = {
    blue: '#1f6fb2', orange: '#c85a3c', green: '#2f7d55', red: '#b03a2e', gold: '#a07800', purple: '#6b52a8',
    grey: '#9aa3b0', ink: '#14181b', soft: '#4a5257',
    blueD: '#14568c', orangeD: '#a8431f', greenD: '#256647', redD: '#93301f', goldD: '#7d5a00', purpleD: '#5a4590'
  };
  var FILL_DWL = 'rgba(176,58,46,0.24)';
  var snap = function (v, step, lo, hi) { return clamp(Math.round(v / step) * step, lo, hi); };
  var LW = function (g) { return g.small ? 3.5 : 5; };
  var b = function (cls, s) { return '<b class="' + cls + '">' + s + '</b>'; };

  /* ================= Fig 11.1 Negative externality, Pigouvian tax ================= */
  var F111 = {
    id: 'f111', num: 'Figure 11.1', title: 'The Pigouvian tax',
    alt: 'Graph of marginal benefit, private marginal cost and social marginal cost, with the deadweight loss of overproduction and a Pigouvian tax that removes it.',
    dom: { x: [0, 100], y: [0, 110] },
    state: { m: 20, mb: 1, pmc: 1, smc: 1, opt: 1, dwl: 1, tax: 0, t: 0, mkt: 1 },
    blank: { mb: 0, pmc: 0, smc: 0, opt: 0, dwl: 0, mkt: 0, tax: 0, t: 0 },
    constrain: function (s) { s.t = s.tax >= 0.5 ? s.m : 0; },
    startBeat: 3,
    beats: [
      { to: { mb: 1, pmc: 1, mkt: 1, smc: 0, opt: 0, dwl: 0, tax: 0 }, dur: 1800,
        say: 'Demand is marginal benefit, ' + b('c-blue', 'MB = 100 - Q') + '. The firm\'s private marginal cost is ' + b('c-green', 'PMC = 10 + Q') + '. The market settles where they cross: Q = 45 at a price of $55.' },
      { to: { smc: 1 }, dur: 1400,
        say: 'But every unit also harms third parties: a marginal external cost of $20. Add it on top of private cost to get the ' + b('c-red', 'social marginal cost, SMC = PMC + MEC') + '.' },
      { to: { opt: 1 },
        say: 'The efficient output counts every cost. It is where SMC = MB: 30 + Q = 100 - Q, so ' + b('c-red', 'Q* = 35') + ', where buyers value the last unit at $65.' },
      { to: { dwl: 1 },
        say: 'The market ignores MEC, so it overproduces. Units 35 to 45 cost society more than buyers value them. The ' + b('c-red', 'red triangle') + ', 1/2 × 10 × 20 = $100, is the deadweight loss.' },
      { to: { tax: 1 }, dur: 1600,
        say: 'Now tax each unit ' + b('c-gold', '$20') + ', equal to MEC at Q*. The firm pays the external cost itself, so its cost curve, PMC + tax, rises onto SMC.' },
      { to: {},
        say: 'The market now lands on ' + b('c-red', 'Q* = 35') + ' by itself. Buyers pay $65, firms keep $45, and the deadweight loss is gone. Some pollution remains: the efficient amount is not zero.' }
    ],
    controls: [
      { type: 'stepper', key: 'm', label: 'External cost per unit', aria: 'external cost', min: 0, max: 50, step: 2, fmt: function (v) { return '$' + v; } },
      { type: 'seg', key: 'tax', label: 'Policy', options: [[0, 'No policy'], [1, 'Pigouvian tax']] }
    ],
    narrate: function (s) {
      var m = s.m, Qs = (90 - m) / 2;
      if (m === 0) return 'With no external cost, private and social cost are the same line. The market\'s 45 units are already efficient: ' + b('c-green', 'no deadweight loss') + ', and no tax is needed.';
      if (s.tax) return 'A tax of ' + b('c-gold', '$' + m) + ' per unit, equal to the external cost, lifts the firm\'s cost onto SMC. The market picks ' + b('c-red', 'Q* = ' + Qs) + ' by itself: buyers pay $' + (100 - Qs) + ', firms keep $' + (10 + Qs) + ', and the deadweight loss is gone.';
      return 'Each unit harms bystanders by $' + m + '. The market ignores that and makes 45 units, but the efficient amount is ' + b('c-red', 'Q* = ' + Qs) + ', where SMC meets MB at $' + (100 - Qs) + '. Units ' + Qs + ' to 45 cost more than they are worth: a ' + b('c-red', 'deadweight loss of ' + money(m * m / 4)) + '.';
    },
    table: {
      cols: ['No policy', 'With tax'],
      reveal: [0, 4],
      rows: [
        { label: 'Quantity', get: function (s) { return [num(45), { t: num((90 - s.m) / 2), c: C.redD }]; } },
        { label: 'Buyers pay', get: function (s) { return ['$55', '$' + num(100 - (90 - s.m) / 2)]; } },
        { label: 'DWL', color: C.redD, get: function (s) { return [{ t: money(s.m * s.m / 4), c: C.redD }, { t: '$0', c: C.greenD }]; } }
      ],
      active: function (t) { return t.tax ? 1 : 0; }
    },
    build: function (g, st) {
      g.axes({ xt: [0, 20, 40, 60, 80, 100], yt: [0, 20, 40, 60, 80, 100], xminor: true, yminor: true, ylab: '$ per unit', xlab: 'Quantity', skip0: true });
      var E = g.E = {}, lw = LW(g);
      E.dwl = g.area(FILL_DWL);
      E.pmc = g.path(null, C.green, lw);
      E.mb = g.path(null, C.blue, lw);
      E.smc = g.path(null, C.red, lw);
      E.taxl = g.path(null, C.red, lw);
      E.gOpt = g.path(g.over, C.redD, 2, { 'stroke-dasharray': '7 7' });
      E.gMkt = g.path(g.over, C.soft, 2, { 'stroke-dasharray': '7 7' });
      E.arrow = g.path(g.over, C.gold, 3.5);
      E.head = g.area(C.gold, g.over);
      E.dMkt = g.dot(C.ink); E.dOpt = g.dot(C.red);
      E.lMB = g.text(C.blueD); g.say(E.lMB, 'MB');
      E.lPMC = g.text(C.greenD); g.say(E.lPMC, g.small ? 'PMC' : 'PMC (supply)');
      E.lSMC = g.text(C.redD); g.say(E.lSMC, g.small ? 'SMC' : 'SMC = PMC + MEC');
      E.lTAXL = g.text(C.redD); g.say(E.lTAXL, g.small ? 'PMC + tax' : 'PMC + tax = SMC');
      E.lTax = g.text(C.goldD, { weight: 600, anchor: 'middle' });
      E.lDWL = g.text(C.redD);
      E.lQs = g.text(C.redD, { anchor: 'end' });
      E.lQm = g.text(C.soft, { weight: 600 });
      E.h = g.handle({
        label: 'External cost per unit', color: C.red, axis: 'y', hintDy: 18,
        drag: function (px, py) { return { m: snap(g.iY(py) - 16, 2, 0, 50) }; },
        key: function (d) { return { m: clamp(st.tgt.m + 2 * d, 0, 50) }; }
      });
    },
    draw: function (g, s, st) {
      var E = g.E, QE = 45, Qs = (90 - s.m) / 2, Qm = (90 - s.t) / 2, ms = s.m * s.smc;
      var MB = function (q) { return 100 - q; }, PMC = function (q) { return 10 + q; };
      var SMC = function (q) { return 10 + q + ms; }, TXL = function (q) { return 10 + q + s.t; };
      g.seg(E.mb, 0, 100, 100, 0, s.mb);
      g.seg(E.pmc, 0, 10, 100, 110, s.pmc);
      g.op(E.pmc, 1 - 0.62 * s.tax);
      var smcOp = clamp(s.smc * 4, 0, 1) * clamp(s.m / 2, 0, 1);
      g.seg(E.smc, 0, 10 + ms, 100 - ms, 110); g.op(E.smc, smcOp);
      g.seg(E.taxl, 0, 10 + s.t, 100 - s.t, 110); g.op(E.taxl, clamp(s.t / 1.5, 0, 1));

      // tax arrow at Q = 22
      var ax = 22, y0 = PMC(ax), y1 = y0 + s.t;
      var plen = g.Y(y0) - g.Y(y1);
      g.seg(E.arrow, ax, y0, ax, y1);
      var hs = g.small ? 7 : 9;
      if (plen > hs * 2) {
        var px = g.X(ax), py = g.Y(y1);
        E.head.setAttribute('d', 'M' + px + ',' + (py - 2) + 'L' + (px - hs) + ',' + (py + hs * 1.5) + 'L' + (px + hs) + ',' + (py + hs * 1.5) + 'Z');
        g.seg(E.arrow, ax, y0, ax, g.iY(py + hs));
      } else E.head.setAttribute('d', '');
      var arrOp = clamp(s.t / 3, 0, 1);
      g.op(E.arrow, arrOp); g.op(E.head, arrOp);
      g.say(E.lTax, 'tax = $' + Math.round(s.t));
      g.byLine(E.lTax, TXL, ax, 'above', 10, arrOp * (s.m <= 36 ? 1 : 0));

      // DWL triangle
      var dw = (s.m - s.t) * (s.m - s.t) / 4;
      var dop = s.dwl * clamp((Qm - Qs) * 2, 0, 1);
      g.poly(E.dwl, [[Qs, MB(Qs)], [Qm, MB(Qm)], [Qm, 10 + Qm + s.m]]);
      g.op(E.dwl, dop);
      g.say(E.lDWL, 'DWL ' + money(dw));
      g.byLine(E.lDWL, PMC, QE + (g.small ? 9 : 6), 'below', 6, dop * (dw >= 1 ? 1 : 0));

      // guides and points
      g.seg(E.gOpt, Qs, 0, Qs, MB(Qs)); g.op(E.gOpt, s.opt * smcOp);
      g.seg(E.gMkt, Qm, 0, Qm, MB(Qm)); g.op(E.gMkt, s.mkt * (1 - s.tax * s.opt));
      g.dotAt(E.dMkt, Qm, MB(Qm), s.mkt);
      g.dotAt(E.dOpt, Qs, MB(Qs), s.opt * smcOp);
      var by = g.B - (g.small ? 16 : 22);
      g.say(E.lQs, 'Q* = ' + Math.round(Qs));
      g.at(E.lQs, g.X(Qs) - 9, by, s.opt * smcOp);
      g.say(E.lQm, 'Q = ' + Math.round(Qm));
      g.at(E.lQm, g.X(Qm) + 9, by, s.mkt * (1 - s.tax * s.opt * clamp(s.m, 0, 1)));

      // curve labels
      g.byLine(E.lMB, MB, g.small ? 97 : 95, 'above', 8, s.mb);
      E.lMB.setAttribute('text-anchor', 'end');
      g.byLine(E.lPMC, PMC, 70, 'below', 10, s.pmc * (1 - 0.55 * s.tax));
      var smcLabOp = smcOp * clamp(s.smc * 3 - 2, 0, 1);
      [[E.lSMC, 1 - s.tax], [E.lTAXL, s.tax]].forEach(function (p) {
        var el = p[0];
        if (s.m < 34) { el.setAttribute('text-anchor', 'end'); g.byLine(el, SMC, 78 - ms, 'above', 8, smcLabOp * p[1]); }
        else { el.setAttribute('text-anchor', 'start'); g.byLine(el, SMC, 92 - ms, 'below', 8, smcLabOp * p[1]); }
      });

      // handle on SMC at Q = 6
      var hq = 6;
      E.h.at(g.X(hq), g.Y(16 + ms), clamp(s.smc * 3 - 2, 0, 1));
      E.h.value(st.tgt.m, '$' + st.tgt.m + ' per unit');
    }
  };
  function num(v) { return ML.num(v); }

  /* ================= Fig 11.2 Cap-and-trade ================= */
  var costOf = function (eA, T) { var eB = T - eA; return eA * eA + 4 * eB * eB; };
  var F112 = {
    id: 'f112', num: 'Figure 11.2', title: 'Cap-and-trade',
    alt: 'Two firms split a fixed amount of cleanup. Firm A\'s marginal abatement cost rises from the left wall, Firm B\'s from the right wall. Total cost is the shaded area, smallest where the two marginal costs are equal.',
    dom: { x: [0, 120], y: [0, 500] },
    margin: function (sm) { return sm ? { b: 92 } : { b: 112 }; },
    state: { T: 100, a: 1, bl: 1, eA: 50, mode: 0, cost: 1, lam: 0, split: 1 },
    blank: { a: 0, bl: 0, cost: 0, split: 0, lam: 0 },
    constrain: function (s) {
      if (s.mode === 0) s.eA = s.T / 2;
      else if (s.mode === 1) s.eA = 0.8 * s.T;
      else s.eA = clamp(s.eA, 0, s.T);
      s.lam = s.mode === 1 ? 1 : 0;
    },
    startBeat: 2,
    beats: [
      { to: { a: 1, bl: 0, cost: 0, split: 0, mode: 0 }, dur: 1600,
        say: 'The rule: clean up 100 units of pollution in total, split between two firms. Firm A cleans cheaply. Its cost of one more unit rises slowly: ' + b('c-blue', 'MAC = 2e') + ', measured from the left wall.' },
      { to: { bl: 1 }, dur: 1600,
        say: 'Firm B is a costly cleaner: ' + b('c-orange', 'MAC = 8e') + ', measured from the right wall. Every point on the floor between the walls is one way to split the 100 units.' },
      { to: { split: 1, cost: 1 },
        say: 'Equal shares: 50 each. A\'s last unit costs ' + b('c-blue', '$100') + ', B\'s costs ' + b('c-orange', '$400') + '. Total cost is the shaded area: $2,500 + $10,000 = ' + b('c-ink', '$12,500') + '.' },
      { to: { mode: 1 }, dur: 2600,
        say: 'Now let them trade permits. B pays A to clean more for it, so the work slides toward A until both last units cost the same: the ' + b('c-gold', 'permit price, $160') + '.' },
      { to: {},
        say: 'A cleans 80, B cleans 20. Total cost: $6,400 + $1,600 = ' + b('c-green', '$8,000') + '. The same 100 units, $4,500 cheaper, 36% less, because the cheap cleaner does the work.' }
    ],
    controls: [
      { type: 'stepper', key: 'T', label: 'Cleanup target', aria: 'cleanup target', min: 20, max: 120, step: 10, fmt: function (v) { return v + ' units'; } },
      { type: 'seg', key: 'mode', label: 'Split the work', options: [[0, 'Equal shares'], [1, 'Permit market']], dur: 1400 }
    ],
    narrate: function (s) {
      var T = s.T, eA = s.eA, eB = T - eA, c = costOf(eA, T), cmin = costOf(0.8 * T, T), lam = 1.6 * T;
      if (s.mode === 0) return 'Equal shares: each firm cleans ' + T / 2 + '. A\'s last unit costs ' + b('c-blue', '$' + T) + ', B\'s costs ' + b('c-orange', '$' + 4 * T) + '. Total cost is ' + money(c) + '. Moving work from B to A would save money.';
      if (s.mode === 1) return 'With a permit market both firms clean until their last unit costs the ' + b('c-gold', 'permit price, $' + lam) + '. A cleans ' + 0.8 * T + ', B cleans ' + 0.2 * T + ', and the total is ' + b('c-green', money(cmin)) + ', the least possible for ' + T + ' units.';
      var ma = 2 * eA, mb = 8 * eB;
      var tip = ma < mb ? 'A is still the cheaper cleaner at the margin, so moving work to A lowers the cost.' : ma > mb ? 'Now B is cheaper at the margin, so moving work back to B lowers the cost.' : '';
      return 'This split: A cleans ' + eA + ', B cleans ' + eB + '. A\'s last unit costs ' + b('c-blue', '$' + ma) + ', B\'s costs ' + b('c-orange', '$' + mb) + '. ' + tip + ' Total cost ' + money(c) + ', ' + money(c - cmin) + ' more than the permit market.';
    },
    table: {
      cols: ['Equal shares', 'Permit market'],
      reveal: [2, 3],
      rows: [
        { label: 'Firm A cleans', color: C.blueD, get: function (s) { return [num(s.T / 2), num(0.8 * s.T)]; } },
        { label: 'Firm B cleans', color: C.orangeD, get: function (s) { return [num(s.T / 2), num(0.2 * s.T)]; } },
        { label: 'Total cost', get: function (s) { return [money(costOf(s.T / 2, s.T)), { t: money(costOf(0.8 * s.T, s.T)), c: C.greenD }]; } }
      ],
      active: function (t) { return t.mode === 0 ? 0 : t.mode === 1 ? 1 : -1; }
    },
    build: function (g, st) {
      g._axT = null;
      var E = g.E = {}, lw = LW(g);
      E.cA = g.area('rgba(31,111,178,0.20)');
      E.cB = g.area('rgba(200,90,60,0.20)');
      E.wall = g.path(g.over, C.soft, 3);
      E.lam = g.path(g.plot, C.gold, 3, { 'stroke-dasharray': '10 8' });
      E.A = g.path(null, C.blue, lw);
      E.Bl = g.path(null, C.orange, lw);
      E.guide = g.path(g.over, C.ink, 2, { 'stroke-dasharray': '6 6' });
      E.dA = g.dot(C.blue); E.dB = g.dot(C.orange);
      E.brA = g.path(g.over, C.blue, 2.5); E.brB = g.path(g.over, C.orange, 2.5);
      E.lA = g.text(C.blueD); g.say(E.lA, g.small ? 'MAC A = 2e' : 'Firm A: MAC = 2e');
      E.lB = g.text(C.orangeD); g.say(E.lB, g.small ? 'MAC B = 8e' : 'Firm B: MAC = 8e');
      E.lWall = g.text(C.soft, { weight: 600, size: g.fs.ax });
      E.lLam = g.text(C.goldD);
      E.vA = g.text(C.blueD, { size: g.fs.val, anchor: 'end' });
      E.vB = g.text(C.orangeD, { size: g.fs.val });
      E.cAl = g.text(C.blueD, { size: g.fs.val, anchor: 'middle', weight: 600 });
      E.cBl = g.text(C.orangeD, { size: g.fs.val, anchor: 'middle', weight: 600 });
      E.bA = g.text(C.blueD, { size: g.fs.val, anchor: 'middle' });
      E.bB = g.text(C.orangeD, { size: g.fs.val, anchor: 'middle' });
      E.h = g.handle({
        label: 'Units cleaned by Firm A', color: C.ink, axis: 'x', hintAnchor: 'end', hintDy: -2,
        drag: function (px) {
          var T = st.tgt.T, v = snap(g.iX(px), 1, 0, T);
          return { eA: v, mode: v === T / 2 ? 0 : v === 0.8 * T ? 1 : 2 };
        },
        key: function (d) {
          var T = st.tgt.T, v = clamp(st.tgt.eA + d * 2, 0, T);
          return { eA: v, mode: v === T / 2 ? 0 : v === 0.8 * T ? 1 : 2 };
        }
      });
    },
    draw: function (g, s, st) {
      var E = g.E, T = s.T, eA = s.eA, eB = T - eA;
      // The camera eases with the target so the picture always fills the frame.
      var Tc = T, YM = 5 * Tc;
      g.xd = [0, 1.2 * Tc]; g.yd = [0, YM];
      if (g._axT !== Tc) {
        g._axT = Tc;
        var Tt = st.tgt.T, stp = [10, 20, 25, 50, 100, 200].filter(function (q) { return 5 * Tt / q <= 6; })[0], yt = [], xt = [];
        for (var yv = 0; yv <= YM + 0.01; yv += stp) yt.push(yv);
        for (var xv = 0; xv <= 1.2 * Tc + 0.01; xv += Tt / 10) xt.push(xv);
        g.axes({ xt: xt, xf: function () { return ''; }, yt: yt, yf: function (v) { return '$' + v; }, ylab: '$ per unit cleaned', skip0: false });
      }
      var A = function (x) { return 2 * x; }, Bf = function (x) { return 8 * (T - x); };
      // Cost areas
      g.poly(E.cA, [[0, 0], [eA, 0], [eA, A(eA)]]); g.op(E.cA, s.cost);
      g.poly(E.cB, [[eA, 0], [T, 0], [eA, Bf(eA)]]); g.op(E.cB, s.cost);
      // Lines (drawn on from their walls)
      g.seg(E.A, 0, 0, T, 2 * T, s.a);
      g.seg(E.Bl, T, 0, T - YM * 1.05 / 8, YM * 1.05, s.bl);
      // Wall
      E.wall.setAttribute('d', 'M' + g.X(T) + ',' + g.B + 'V' + (g.T - 10));
      g.say(E.lWall, g.small ? 'Target ' + Math.round(T) : 'Target: ' + Math.round(T) + ' units');
      var ww = g.tw(E.lWall);
      var wx = clamp(g.X(T), g.L + ww / 2 + (g.small ? 70 : 150), g.w - ww / 2 - 4);
      E.lWall.setAttribute('text-anchor', 'middle');
      g.at(E.lWall, wx, g.T - 26, 1);
      // Permit price
      var lam = 1.6 * T;
      g.seg(E.lam, 0, lam, T, lam); g.op(E.lam, s.lam);
      g.say(E.lLam, 'permit price $' + Math.round(lam));
      g.at(E.lLam, g.X(0.015 * T), g.Y(lam) - (g.small ? 15 : 20), s.lam);
      // Split guide and dots
      var top = Math.max(A(eA), Bf(eA));
      g.seg(E.guide, eA, 0, eA, Math.min(top, YM)); g.op(E.guide, s.split);
      g.dotAt(E.dA, eA, A(eA), s.split * s.a);
      g.dotAt(E.dB, eA, Math.min(Bf(eA), YM * 1.04), s.split * s.bl * (Bf(eA) <= YM * 1.01 ? 1 : 0));
      var same = Math.abs(A(eA) - Bf(eA)) < 1;
      g.say(E.vA, '$' + Math.round(A(eA)));
      var yBv = g.Y(Math.min(Bf(eA), 0.78 * YM)), yAv = g.Y(A(eA)) + g.fs.val * 0.85;
      var clash = Math.abs(yAv - yBv) < g.fs.val * 1.3;
      E.vA.setAttribute('text-anchor', clash ? 'end' : 'start');
      g.at(E.vA, g.X(eA) + (clash ? -14 : 14), clash ? g.Y(A(eA)) : yAv, s.split * (1 - s.lam) * (same ? 0 : 1));
      g.say(E.vB, '$' + Math.round(Bf(eA)));
      g.at(E.vB, g.X(eA) + 14, yBv, s.split * s.bl * (1 - s.lam) * (same ? 0 : 1));
      // Cost labels inside areas when they fit
      var fitA = (g.Y(0) - g.Y(A(eA))) > g.fs.val * 2.6 && (g.X(eA) - g.X(0)) > 2.2 * g.tw(E.cAl);
      g.say(E.cAl, money(eA * eA));
      g.at(E.cAl, g.X(eA * 2 / 3), g.Y(Math.max(A(eA) / 3, 0)), s.cost * (fitA ? 1 : 0));
      g.say(E.cBl, money(4 * eB * eB));
      var cbx = eA + 0.25 * eB, cby = A(cbx) < Bf(cbx) ? A(cbx) + (Math.min(Bf(cbx), YM) - A(cbx)) * 0.4 : Bf(cbx) / 2;
      var fitB = (g.Y(0) - g.Y(Math.min(Bf(eA), YM))) > g.fs.val * 2.6 && (g.X(T) - g.X(eA)) > 2.2 * g.tw(E.cBl);
      g.at(E.cBl, g.X(cbx) + g.tw(E.cBl) * 0.25, g.Y(cby), s.cost * (fitB ? 1 : 0));
      // Brackets under the floor
      var by = g.B + (g.small ? 26 : 32), tk = 7;
      var br = function (el, x1, x2) { el.setAttribute('d', 'M' + (x1 + 2) + ',' + (by - tk) + 'V' + by + 'H' + (x2 - 2) + 'V' + (by - tk)); };
      br(E.brA, g.X(0), g.X(eA)); br(E.brB, g.X(eA), g.X(T));
      g.op(E.brA, s.split * (eA > 0.5 ? 1 : 0)); g.op(E.brB, s.split * (eB > 0.5 ? 1 : 0));
      g.say(E.bA, g.small ? 'A: ' + Math.round(eA) : 'A cleans ' + Math.round(eA));
      g.say(E.bB, g.small ? 'B: ' + Math.round(eB) : 'B cleans ' + Math.round(eB));
      var wa = g.tw(E.bA), wb = g.tw(E.bB), gap = 14;
      var xa = (g.X(0) + g.X(eA)) / 2, xb = (g.X(eA) + g.X(T)) / 2;
      xa = Math.max(xa, g.L + wa / 2 - 30);
      xb = Math.min(xb, g.w - wb / 2 - 4);
      if (xb - wb / 2 < xa + wa / 2 + gap) {
        xa = g.X(eA) - gap / 2 - wa / 2; xb = g.X(eA) + gap / 2 + wb / 2;
        if (xb + wb / 2 > g.w - 4) { var sh = xb + wb / 2 - (g.w - 4); xa -= sh; xb -= sh; }
        if (xa - wa / 2 < 4) { var sh2 = 4 - (xa - wa / 2); xa += sh2; xb += sh2; }
      }
      var ly = by + (g.small ? 20 : 26);
      g.at(E.bA, xa, ly, s.split); g.at(E.bB, xb, ly, s.split);
      // Curve labels
      var lA = E.lA; lA.setAttribute('text-anchor', 'start');
      g.byLine(lA, A, 0.03 * T, 'above', 14, s.a);
      var lB = E.lB, wB = g.tw(lB) / g.ux(), yb = 0.9 * YM, xB = T - yb / 8;
      if (xB - 0.02 * T - wB >= 0.01 * T) { lB.setAttribute('text-anchor', 'end'); g.at(lB, g.X(xB - 0.025 * T), g.Y(yb), s.bl); }
      else { lB.setAttribute('text-anchor', 'start'); g.at(lB, g.X(xB + 0.025 * T), g.Y(yb), s.bl); }
      E.h.at(g.X(eA), g.B, s.split);
      E.h.value(st.tgt.eA, 'Firm A cleans ' + st.tgt.eA + ' of ' + st.tgt.T);
    }
  };

  /* ================= Fig 11.3 Positive externality, subsidy ================= */
  var F113 = {
    id: 'f113', num: 'Figure 11.3', title: 'Subsidizing a spillover',
    alt: 'Graph of private marginal benefit, marginal social benefit and marginal cost, with the deadweight loss of underproduction and a Pigouvian subsidy that removes it.',
    dom: { x: [0, 100], y: [0, 145] },
    state: { e: 20, mb: 1, mc: 1, msb: 1, opt: 1, dwl: 1, sub: 0, s: 0, mkt: 1 },
    blank: { mb: 0, mc: 0, msb: 0, opt: 0, dwl: 0, mkt: 0, sub: 0, s: 0 },
    constrain: function (s) { s.s = s.sub >= 0.5 ? s.e : 0; },
    startBeat: 3,
    beats: [
      { to: { mb: 1, mc: 1, mkt: 1, msb: 0, opt: 0, dwl: 0, sub: 0 }, dur: 1800,
        say: 'Demand is buyers\' own marginal benefit, ' + b('c-blue', 'MB = 100 - Q') + '. Marginal cost is ' + b('c-orange', 'MC = 10 + Q') + '. The market settles where they cross: Q = 45 at a price of $55.' },
      { to: { msb: 1 }, dur: 1400,
        say: 'But each unit also helps people who never buy it, by $20: think vaccines or schooling. Add that on top of MB to get the ' + b('c-green', 'marginal social benefit, MSB = MB + MEB') + '.' },
      { to: { opt: 1 },
        say: 'The efficient output counts every benefit. It is where MSB = MC: 120 - Q = 10 + Q, so ' + b('c-green', 'Q* = 55') + ', where the last unit costs $65 to make.' },
      { to: { dwl: 1 },
        say: 'The market ignores the spillover and stops at 45. Units 45 to 55 are worth more to society than they cost. The ' + b('c-red', 'red triangle') + ', 1/2 × 10 × 20 = $100, is the deadweight loss.' },
      { to: { sub: 1 }, dur: 1600,
        say: 'Now pay a subsidy of ' + b('c-gold', '$20') + ' per unit, equal to MEB at Q*. Buyers act as if each unit is worth MB + $20 to them, so demand rises onto MSB.' },
      { to: {},
        say: 'The market now makes ' + b('c-green', 'Q* = 55') + ' by itself. Sellers receive $65, buyers pay $45 after the subsidy, and the deadweight loss is gone. Taxpayers spend $20 × 55 = $1,100.' }
    ],
    controls: [
      { type: 'stepper', key: 'e', label: 'External benefit per unit', aria: 'external benefit', min: 0, max: 40, step: 2, fmt: function (v) { return '$' + v; } },
      { type: 'seg', key: 'sub', label: 'Policy', options: [[0, 'No policy'], [1, 'Pigouvian subsidy']] }
    ],
    narrate: function (s) {
      var e = s.e, Qs = (90 + e) / 2;
      if (e === 0) return 'With no external benefit, private and social benefit are the same line. The market\'s 45 units are already efficient: ' + b('c-green', 'no deadweight loss') + ', and no subsidy is needed.';
      if (s.sub) return 'A subsidy of ' + b('c-gold', '$' + e) + ' per unit, equal to the external benefit, lifts demand onto MSB. The market makes ' + b('c-green', 'Q* = ' + Qs) + ': sellers receive $' + (10 + Qs) + ', buyers pay $' + (10 + Qs - e) + ' after the subsidy, and the deadweight loss is gone. Taxpayers spend ' + money(e * Qs) + '.';
      return 'Each unit helps other people by $' + e + '. The market counts only buyers\' own benefit and stops at 45 units, short of ' + b('c-green', 'Q* = ' + Qs) + ' where MSB meets MC. Units 45 to ' + Qs + ' are worth more than they cost: a ' + b('c-red', 'deadweight loss of ' + money(e * e / 4)) + '.';
    },
    table: {
      cols: ['No policy', 'With subsidy'],
      reveal: [0, 4],
      rows: [
        { label: 'Quantity', get: function (s) { return ['45', { t: num((90 + s.e) / 2), c: C.greenD }]; } },
        { label: 'Sellers get', get: function (s) { return ['$55', '$' + num(10 + (90 + s.e) / 2)]; } },
        { label: 'DWL', color: C.redD, get: function (s) { return [{ t: money(s.e * s.e / 4), c: C.redD }, { t: '$0', c: C.greenD }]; } }
      ],
      active: function (t) { return t.sub ? 1 : 0; }
    },
    build: function (g, st) {
      g.axes({ xt: [0, 20, 40, 60, 80, 100], yt: [0, 20, 40, 60, 80, 100, 120, 140], xminor: true, yminor: false, ylab: '$ per unit', xlab: 'Quantity', skip0: true });
      var E = g.E = {}, lw = LW(g);
      E.dwl = g.area(FILL_DWL);
      E.mc = g.path(null, C.orange, lw);
      E.mb = g.path(null, C.blue, lw);
      E.msb = g.path(null, C.green, lw);
      E.subl = g.path(null, C.green, lw);
      E.gOpt = g.path(g.over, C.greenD, 2, { 'stroke-dasharray': '7 7' });
      E.gMkt = g.path(g.over, C.soft, 2, { 'stroke-dasharray': '7 7' });
      E.arrow = g.path(g.over, C.gold, 3.5);
      E.head = g.area(C.gold, g.over);
      E.dMkt = g.dot(C.ink); E.dOpt = g.dot(C.green);
      E.lMB = g.text(C.blueD, { anchor: 'end' }); g.say(E.lMB, 'MB');
      E.lMC = g.text(C.orangeD); g.say(E.lMC, g.small ? 'MC' : 'MC (supply)');
      E.lMSB = g.text(C.greenD); g.say(E.lMSB, g.small ? 'MSB' : 'MSB = MB + MEB');
      E.lSUB = g.text(C.greenD); g.say(E.lSUB, g.small ? 'MB + subsidy' : 'MB + subsidy = MSB');
      E.lSub = g.text(C.goldD, { weight: 600, anchor: 'middle' });
      E.lDWL = g.text(C.redD);
      E.lQs = g.text(C.greenD);
      E.lQm = g.text(C.soft, { weight: 600, anchor: 'end' });
      E.h = g.handle({
        label: 'External benefit per unit', color: C.green, axis: 'y', hintDy: -24,
        drag: function (px, py) { return { e: snap(g.iY(py) - 70, 2, 0, 40) }; },
        key: function (d) { return { e: clamp(st.tgt.e + 2 * d, 0, 40) }; }
      });
    },
    draw: function (g, s, st) {
      var E = g.E, QE = 45, Qs = (90 + s.e) / 2, Qm = (90 + s.s) / 2, es = s.e * s.msb;
      var MB = function (q) { return 100 - q; }, MC = function (q) { return 10 + q; };
      var MSB = function (q) { return 100 - q + es; };
      g.seg(E.mb, 0, 100, 100, 0, s.mb); g.op(E.mb, 1 - 0.62 * s.sub);
      g.seg(E.mc, 0, 10, 100, 110, s.mc);
      var msbOp = clamp(s.msb * 4, 0, 1) * clamp(s.e / 2, 0, 1);
      g.seg(E.msb, 0, 100 + es, 100, es); g.op(E.msb, msbOp);
      g.seg(E.subl, 0, 100 + s.s, 100, s.s); g.op(E.subl, clamp(s.s / 1.5, 0, 1));

      var ax = 13, y0 = MB(ax), y1 = y0 + s.s, hs = g.small ? 7 : 9;
      var plen = g.Y(y0) - g.Y(y1);
      g.seg(E.arrow, ax, y0, ax, y1);
      if (plen > hs * 2) {
        var px = g.X(ax), py = g.Y(y1);
        E.head.setAttribute('d', 'M' + px + ',' + (py - 2) + 'L' + (px - hs) + ',' + (py + hs * 1.5) + 'L' + (px + hs) + ',' + (py + hs * 1.5) + 'Z');
        g.seg(E.arrow, ax, y0, ax, g.iY(py + hs));
      } else E.head.setAttribute('d', '');
      var arrOp = clamp(s.s / 3, 0, 1);
      g.op(E.arrow, arrOp); g.op(E.head, arrOp);
      g.say(E.lSub, 'subsidy = $' + Math.round(s.s));
      g.byLine(E.lSub, MB, ax + 1, 'below', 12, arrOp);

      var dw = (s.e - s.s) * (s.e - s.s) / 4;
      var dop = s.dwl * clamp((Qs - Qm) * 2, 0, 1);
      g.poly(E.dwl, [[Qm, MC(Qm)], [Qm, 100 - Qm + s.e], [Qs, MC(Qs)]]);
      g.op(E.dwl, dop);
      g.say(E.lDWL, 'DWL ' + money(dw));
      g.byLine(E.lDWL, MC, Qs + (g.small ? 8 : 6), 'below', 6, dop * (dw >= 1 ? 1 : 0));

      g.seg(E.gOpt, Qs, 0, Qs, MC(Qs)); g.op(E.gOpt, s.opt * msbOp);
      g.seg(E.gMkt, Qm, 0, Qm, MC(Qm)); g.op(E.gMkt, s.mkt * (1 - s.sub * s.opt));
      g.dotAt(E.dMkt, Qm, MC(Qm), s.mkt);
      g.dotAt(E.dOpt, Qs, MC(Qs), s.opt * msbOp);
      var by = g.B - (g.small ? 16 : 22);
      g.say(E.lQs, 'Q* = ' + Math.round(Qs));
      g.at(E.lQs, g.X(Qs) + 9, by, s.opt * msbOp);
      g.say(E.lQm, 'Q = ' + Math.round(Qm));
      g.at(E.lQm, g.X(Qm) - 9, by, s.mkt * (1 - s.sub * s.opt * clamp(s.e, 0, 1)));

      g.byLine(E.lMB, MB, 97, 'above', 8, s.mb * (1 - 0.5 * s.sub));
      E.lMC.setAttribute('text-anchor', 'end');
      g.byLine(E.lMC, MC, 90, 'above', 10, s.mc);
      var lop = msbOp * clamp(s.msb * 3 - 2, 0, 1);
      g.byLine(E.lMSB, MSB, 3, 'above', 8, lop * (1 - s.sub));
      g.byLine(E.lSUB, MSB, 3, 'above', 8, lop * s.sub);

      E.h.at(g.X(30), g.Y(70 + es), clamp(s.msb * 3 - 2, 0, 1));
      E.h.value(st.tgt.e, '$' + st.tgt.e + ' per unit');
    }
  };

  /* ================= Fig 11.4 Public good, free riding ================= */
  var COST = 300;
  var pg = function (N, v, mode) {
    var total = N * v, eff = total > COST, alone = v >= COST;
    var built = alone || (mode === 1 && total > COST);
    return { total: total, eff: eff, alone: alone, built: built, raised: built ? COST : 0, surplus: built ? total - COST : 0 };
  };
  var niceMax = function (N, v) { var m = Math.max(400, N * v * 1.2, v * 1.25); return Math.ceil(m / 100) * 100; };
  var F114 = {
    id: 'f114', num: 'Figure 11.4', title: 'The free-rider problem',
    alt: 'Bar chart: one neighbor\'s value for a streetlight, the group\'s value stacked person by person, and the money actually raised, against the $300 cost.',
    dom: { x: [0, 3], y: [0, 400] },
    margin: function (sm) { return sm ? { b: 66, r: 64 } : { b: 70, r: 116 }; },
    state: { N: 3, v: 120, built: 1, stack: 3, costOp: 1, r3: 1, mode: 0, sur: 1, one: 1, ymax: 400, raised: 0 },
    blank: { built: 0, stack: 0, costOp: 0, r3: 0, sur: 0, one: 0 },
    constrain: function (s, st) {
      s.stack = s.built >= 0.5 ? s.N : 0;
      if (!(st && st.dragging)) s.ymax = niceMax(s.N, s.v);
      s.raised = pg(s.N, s.v, s.mode).raised;
    },
    startBeat: 3,
    beats: [
      { to: { one: 1, costOp: 1, built: 0, r3: 0, sur: 0, mode: 0 }, dur: 1400,
        say: 'A streetlight costs ' + b('c-ink', '$300') + '. Three neighbors each value it at ' + b('c-blue', '$120') + '. None of them would buy it alone: $120 is less than $300.' },
      { to: { built: 1 }, dur: 2800,
        say: 'But all three see by the same light. To find what the group values it at, stack each person\'s value on top of the others: ' + b('c-blue', 'vertical summation') + '. 3 × $120 = $360.' },
      { to: { sur: 1 },
        say: '$360 is more than the $300 cost, so building the light is efficient. It would create ' + b('c-green', '$60 of surplus') + '.' },
      { to: { r3: 1 },
        say: 'But no one can be kept from using it. Each neighbor waits for the others to pay. Everyone free-rides, ' + b('c-red', 'nobody pays') + ', and the light is never built.' },
      { to: { mode: 1 }, dur: 1400,
        say: 'The fix is to coordinate. With an ' + b('c-green', 'all-or-nothing pledge') + ' of $100 each, or a $100 tax, nobody pays unless the full $300 is raised. Each neighbor gains $20, so all three pledge and the light is built.' }
    ],
    controls: [
      { type: 'stepper', key: 'N', label: 'Neighbors sharing the light', aria: 'number of neighbors', min: 1, max: 8, step: 1, fmt: function (v) { return v; } },
      { type: 'seg', key: 'mode', label: 'How it gets paid for', options: [[0, 'Each decides alone'], [1, 'All-or-nothing pledge']] }
    ],
    narrate: function (s) {
      var N = s.N, v = s.v, r = pg(N, v, s.mode), share = COST / N;
      var who = N === 1 ? 'The one neighbor' : 'Together the ' + N + ' neighbors', vb = N === 1 ? ' values' : ' value';
      if (r.alone) return 'Each neighbor values the light at $' + v + ', at least its $300 cost, so ' + b('c-green', 'one of them buys it alone') + ' and the others enjoy it free. Free-riding does no harm here.';
      if (r.total === COST) return who + vb + ' the light at exactly $300, its cost. Building it creates no surplus, so leaving it unbuilt loses nothing.';
      if (!r.eff) return who + vb + ' the light at only ' + money(r.total) + ', less than its $300 cost. ' + b('c-ink', 'Not building it is the right call') + ', and no pledge scheme should change that.';
      if (s.mode === 1) return 'With an all-or-nothing pledge of ' + money(share, true) + ' each, nobody pays unless the full $300 is raised. Each neighbor gains ' + money(v - share, true) + ', so everyone pledges and ' + b('c-green', 'the light is built') + ': ' + money(r.total - COST) + ' of surplus.';
      return who + vb + ' the light at ' + money(r.total) + ', more than its $300 cost: building it would create ' + money(r.total - COST) + ' of surplus. But no one can be kept from using it, so each waits for the others. ' + b('c-red', 'Nobody pays, and it is never built') + '.';
    },
    table: {
      cols: ['Each alone', 'Pledge'],
      reveal: [3, 4],
      rows: [
        { label: 'Money raised', get: function (s, t) { return [money(pg(t.N, t.v, 0).raised), money(pg(t.N, t.v, 1).raised)]; } },
        { label: 'Light built?', get: function (s, t) { return [0, 1].map(function (m) { var r = pg(t.N, t.v, m); return { t: r.built ? 'Yes' : 'No', c: r.built ? C.greenD : (r.eff ? C.redD : '') }; }); } },
        { label: 'Surplus', color: C.greenD, get: function (s, t) { return [money(pg(t.N, t.v, 0).surplus), money(pg(t.N, t.v, 1).surplus)]; } }
      ],
      active: function (t) { return t.mode; }
    },
    build: function (g, st) {
      var E = g.E = {};
      E.ticks = ML.S('g', {}, g.axesG.parentNode);
      g.svg.insertBefore(E.ticks, g.axesG.nextSibling);
      E.axis = g.path(E.ticks, C.soft, g.small ? 2 : 2.5);
      E.tickG = ML.S('g', {}, E.ticks);
      E.ylab = ML.S('text', { class: 'axt', 'font-size': g.fs.ax, 'dominant-baseline': 'central', x: g.L - (g.small ? 40 : 56), y: g.T - 36 + (g.small ? 4 : 0) }, E.ticks);
      E.ylab.textContent = 'Value, $';
      E.bar1 = g.area(C.blue);
      E.blocks = [];
      for (var i = 0; i < 8; i++) {
        var r = g.area(i % 2 ? '#4f8fc6' : C.blue);
        r.setAttribute('stroke', '#eff1ee'); r.setAttribute('stroke-width', 2);
        E.blocks.push(r);
      }
      E.goal = g.path(g.under, C.soft, 2, { 'stroke-dasharray': '6 6' });
      E.bar3 = g.area(C.green);
      E.cost = g.path(g.over, C.ink, 3, { 'stroke-dasharray': '12 9' });
      E.lCost = g.text(C.ink, { size: g.fs.val });
      E.sur = g.path(g.over, C.green, 3);
      E.lSur = g.text(C.greenD, { size: g.fs.val });
      E.blockL = [];
      for (var j = 0; j < 8; j++) E.blockL.push(g.text('#ffffff', { size: g.fs.val - 1, anchor: 'middle', weight: 600, halo: false }));
      E.l1 = g.text('#ffffff', { size: g.fs.val - 1, anchor: 'middle', weight: 600, halo: false });
      E.t2 = g.text(C.blueD, { size: g.fs.lab, anchor: 'middle', weight: 800 });
      E.t3 = g.text(C.ink, { size: g.fs.lab, anchor: 'middle', weight: 800 });
      E.s3 = g.text(C.redD, { size: g.small ? g.fs.val : 19, anchor: 'middle' });
      E.cat = [0, 1, 2].map(function () { return g.text(C.soft, { size: g.small ? 16 : g.fs.ax, anchor: 'middle', weight: 600 }); });
      E.h = g.handle({
        label: 'Value of the light to each neighbor', color: C.blue, axis: 'y', hintDy: -20, hintAnchor: 'start', hintDx: 4,
        drag: function (px, py) { return { v: snap(g.iY(py), 10, 0, 320) }; },
        release: function () { return {}; },
        key: function (d) { return { v: clamp(st.tgt.v + 10 * d, 0, 320) }; }
      });
    },
    draw: function (g, s, st) {
      var E = g.E, N = s.N, v = s.v, t = st.tgt;
      g.yd = [0, s.ymax];
      // y axis rebuilt while the camera eases
      var step = t.ymax <= 500 ? 100 : t.ymax <= 1000 ? 200 : t.ymax <= 2000 ? 400 : 500;
      E.axis.setAttribute('d', 'M' + g.L + ',' + (g.T - 18) + 'V' + g.B + 'H' + (g.R + 6));
      var tg = E.tickG; tg.innerHTML = '';
      for (var y = 0; y <= s.ymax + 0.1; y += step) {
        var py = g.Y(y);
        ML.S('path', { d: 'M' + (g.L - 8) + ',' + py + 'H' + g.L, stroke: C.soft, 'stroke-width': 2 }, tg);
        var tx = ML.S('text', { x: g.L - 13, y: py, 'text-anchor': 'end', 'dominant-baseline': 'central', class: 'tick', 'font-size': g.fs.tick }, tg);
        tx.textContent = y.toLocaleString('en-US');
      }
      var hw = 0.32, cx = [0.5, 1.5, 2.5];
      var rect = function (el, x, y0, y1) { g.poly(el, [[x - hw, y0], [x + hw, y0], [x + hw, y1], [x - hw, y1]]); };
      // bar 1: one neighbor
      rect(E.bar1, cx[0], 0, v * s.one); g.op(E.bar1, s.one > 0.01 ? 1 : 0);
      var h1 = g.Y(0) - g.Y(v);
      g.say(E.l1, '$' + Math.round(v));
      g.at(E.l1, g.X(cx[0]), g.Y(v / 2), s.one * (h1 > g.fs.val * 1.6 ? 1 : 0));
      // bar 2: blocks fly over from bar 1 and stack
      var shown = 0;
      for (var i = 0; i < 8; i++) {
        var f = clamp(s.stack - i, 0, 1), el = E.blocks[i], lab = E.blockL[i];
        if (i >= Math.ceil(Math.max(N, s.stack)) || f <= 0.001) { g.op(el, 0); g.op(lab, 0); continue; }
        var ef = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
        var x = lerp(cx[0], cx[1], ef), base = lerp(0, i * v, ef);
        rect(el, x, base, base + v);
        g.op(el, 1);
        shown += f;
        var bh = g.Y(0) - g.Y(v);
        g.say(lab, '$' + Math.round(v));
        g.at(lab, g.X(x), g.Y(base + v / 2), (f > 0.98 && bh > g.fs.val * 1.5) ? 1 : 0);
      }
      var tot = v * Math.min(shown, N);
      g.say(E.t2, '$' + Math.round(tot).toLocaleString('en-US'));
      g.at(E.t2, g.X(cx[1]), g.Y(tot) - (g.small ? 16 : 22), clamp(s.stack, 0, 1));
      // surplus bracket
      var total = N * v, sop = s.sur * clamp(s.stack - N + 1, 0, 1) * (Math.abs(total - COST) > 0.5 ? 1 : 0);
      var bx = g.X(cx[1] + hw) + 10;
      E.sur.setAttribute('d', 'M' + (bx - 6) + ',' + g.Y(COST) + 'H' + bx + 'V' + g.Y(total) + 'H' + (bx - 6));
      E.sur.setAttribute('stroke', total >= COST ? C.green : C.red);
      g.op(E.sur, sop);
      E.lSur.setAttribute('fill', total >= COST ? C.greenD : C.redD);
      g.say(E.lSur, (total >= COST ? '+' : '-') + money(Math.abs(total - COST)).replace('-', ''));
      g.at(E.lSur, bx + 6, g.Y((COST + total) / 2), sop * (g.small ? 0 : 1));
      // bar 3: money raised against the $300 goal
      rect(E.goal, cx[2], 0, COST); g.op(E.goal, s.r3 * 0.9);
      rect(E.bar3, cx[2], 0, s.raised); g.op(E.bar3, s.r3 * (s.raised > 0.5 ? 1 : 0));
      g.say(E.t3, money(s.raised));
      var inside = !g.small, full = s.raised > COST / 2;
      E.t3.setAttribute('fill', inside && full ? '#ffffff' : C.ink);
      E.t3.setAttribute('class', inside && full ? 'lbl nohalo' : 'lbl');
      g.at(E.t3, g.X(cx[2]), inside ? g.Y(COST / 2) - 16 : g.Y(Math.max(s.raised, COST)) - 40, s.r3);
      var r = pg(t.N, t.v, t.mode);
      g.say(E.s3, r.built ? (r.alone && t.mode === 0 ? 'one buys it' : 'built') : (r.eff ? 'nobody pays' : 'not worth it'));
      E.s3.setAttribute('fill', inside && full ? '#ffffff' : r.built ? C.greenD : r.eff ? C.redD : C.soft);
      E.s3.setAttribute('class', inside && full ? 'lbl nohalo' : 'lbl');
      g.at(E.s3, g.X(cx[2]), inside ? g.Y(COST / 2) + 16 : g.Y(Math.max(s.raised, COST)) - 17, s.r3);
      // cost line
      g.seg(E.cost, 0, COST, 3, COST); g.op(E.cost, s.costOp);
      g.say(E.lCost, g.small ? 'cost' : 'cost $300');
      g.at(E.lCost, g.X(3) + 8, g.Y(COST), s.costOp);
      // categories
      var c0 = g.small ? 'One' : 'One neighbor', c1 = g.small ? 'All ' + N : 'All ' + N + ' together', c2 = g.small ? 'Raised' : 'Money raised';
      [c0, c1, c2].forEach(function (str, k) {
        g.say(E.cat[k], str);
        g.at(E.cat[k], g.X(cx[k]), g.B + (g.small ? 20 : 26), k === 0 ? s.one : k === 1 ? clamp(s.stack, 0, 1) : s.r3);
      });
      E.h.at(g.X(cx[0]), g.Y(v), s.one);
      E.h.value(t.v, '$' + t.v + ' per neighbor');
    }
  };

  /* ================= Fig 11.5 Coase theorem ================= */
  var F115 = {
    id: 'f115', num: 'Figure 11.5', title: 'The Coase theorem',
    alt: 'The factory\'s marginal benefit of polluting falls and the neighbor\'s marginal damage rises; they cross at S* = 25. Bargaining moves pollution to S* from either starting point.',
    dom: { x: [0, 50], y: [0, 105] },
    state: { S: 50, right: 1, mb: 1, md: 1, star: 1, sl: 1, wedge: 1 },
    blank: { mb: 0, md: 0, star: 0, sl: 0, wedge: 0 },
    constrain: function (s) { s.S = clamp(s.S, 0, 50); },
    startBeat: 2,
    beats: [
      { to: { mb: 1, md: 1, star: 0, sl: 0, wedge: 0, right: 0, S: 25 }, dur: 1800,
        say: 'A factory gains from polluting, but less with each unit: ' + b('c-blue', 'MB = 100 - 2S') + '. Its neighbor is harmed more with each unit: ' + b('c-red', 'MD = 2S') + '.' },
      { to: { star: 1 },
        say: 'They cross at ' + b('c-ink', 'S* = 25') + ', where one more unit is worth $50 to the factory and costs the neighbor $50. That is the efficient amount of pollution.' },
      { to: { right: 1, S: 50, sl: 1, wedge: 1 }, dur: 1500,
        say: 'Say the ' + b('c-blue', 'factory owns the right') + ' to pollute. It pollutes S = 50. Its last unit is worth $0 to it but costs the neighbor $100. ' + b('c-green', '$1,250 of gains') + ' are left on the table.' },
      { to: { S: 25 }, dur: 3200,
        say: 'So the neighbor pays the factory to cut back. Each unit cut saves the neighbor more than the factory gives up, until S* = 25. The neighbor saves $1,875, the factory gives up $625, and any payment in between works.' },
      { to: { right: 2, S: 0 }, dur: 1500,
        say: 'Now give the ' + b('c-red', 'neighbor the right') + ' to clean air. Pollution starts at S = 0. The first unit is worth $100 to the factory and costs the neighbor almost nothing.' },
      { to: { S: 25 }, dur: 3200,
        say: 'So the factory pays the neighbor for permission to pollute, unit by unit, until S* = 25. The factory gains $1,875, the neighbor bears $625 of damage, and the payment lands in between.' },
      { to: {},
        say: 'Same ' + b('c-ink', 'S* = 25') + ' either way. The right decides who pays whom, not how much pollution there is. That needs cheap bargaining between a few parties; with many, it breaks down.' }
    ],
    controls: [
      { type: 'seg', key: 'right', label: 'Who owns the right', options: [[1, 'Factory'], [2, 'Neighbor']], dur: 1300,
        extra: function (v) { return { S: v === 1 ? 50 : 0, sl: 1, wedge: 1, star: 1 }; } },
      { type: 'button', label: 'Bargain', text: 'Strike one deal',
        click: function (st) { var S = st.tgt.S; if (S === 25) return; var n = S > 25 ? Math.max(25, S - 5) : Math.min(25, S + 5); st.user({ S: n, sl: 1, wedge: 1, star: 1 }, 900); },
        enabled: function (t) { return t.S !== 25; } }
    ],
    narrate: function (s) {
      var S = s.S, mb = 100 - 2 * S, md = 2 * S, gl = 2 * (S - 25) * (S - 25);
      if (S === 25) return 'Bargaining stops at ' + b('c-ink', 'S* = 25') + ': the last unit is worth $50 to the factory and costs the neighbor $50, so no deal is left that helps both. ' + (s.right === 2 ? 'The factory paid the neighbor between $625 and $1,875 to get here.' : s.right === 1 ? 'The neighbor paid the factory between $625 and $1,875 to get here.' : '');
      if (S > 25) return 'At S = ' + S + ', the last unit is worth ' + b('c-blue', '$' + mb) + ' to the factory but costs the neighbor ' + b('c-red', '$' + md) + '. The neighbor will gladly pay the factory to cut back. ' + b('c-green', money(gl) + ' of gains') + ' are still on the table.';
      return 'At S = ' + S + ', one more unit is worth ' + b('c-blue', '$' + mb) + ' to the factory but costs the neighbor only ' + b('c-red', '$' + md) + '. The factory will gladly pay the neighbor to allow more. ' + b('c-green', money(gl) + ' of gains') + ' are still on the table.';
    },
    table: {
      cols: ['Factory\'s right', 'Neighbor\'s right'],
      reveal: [2, 4],
      rows: [
        { label: 'Starts at', get: function () { return ['S = 50', 'S = 0']; } },
        { label: 'Ends at', get: function () { return [{ t: 'S = 25', c: C.ink }, { t: 'S = 25', c: C.ink }]; } },
        { label: 'Who pays', get: function () { return ['Neighbor', 'Factory']; } },
        { label: 'Payment', get: function () { return ['$625 to $1,875', '$625 to $1,875']; } }
      ],
      active: function (t) { return t.right === 1 ? 0 : t.right === 2 ? 1 : -1; }
    },
    build: function (g, st) {
      g.axes({ xt: [0, 10, 20, 30, 40, 50], yt: [0, 20, 40, 60, 80, 100], xminor: true, yminor: true, ylab: '$ per unit', xlab: 'Pollution, S', skip0: true });
      var E = g.E = {}, lw = LW(g);
      E.wedge = g.area('rgba(47,125,85,0.22)');
      E.mb = g.path(null, C.blue, lw);
      E.md = g.path(null, C.red, lw);
      E.gStar = g.path(g.over, C.soft, 2, { 'stroke-dasharray': '7 7' });
      E.gS = g.path(g.over, C.ink, 2.5);
      E.dStar = g.dot(C.ink);
      E.dMB = g.dot(C.blue); E.dMD = g.dot(C.red);
      E.lMB = g.text(C.blueD); g.say(E.lMB, g.small ? 'MB' : 'MB to factory');
      E.lMD = g.text(C.redD, { anchor: 'end' }); g.say(E.lMD, g.small ? 'MD' : 'MD to neighbor');
      E.lStar = g.text(C.ink, { anchor: 'middle' }); g.say(E.lStar, 'S* = 25');
      E.vMB = g.text(C.blueD, { size: g.fs.val });
      E.vMD = g.text(C.redD, { size: g.fs.val });
      E.lW = g.text(C.greenD, { size: g.fs.val, anchor: 'middle' });
      E.h = g.handle({
        label: 'Pollution level S', color: C.ink, axis: 'x', hintDy: -30, hintAnchor: 'end', hintDx: 30,
        drag: function (px) { return { S: snap(g.iX(px), 1, 0, 50), sl: 1, wedge: 1, star: 1 }; },
        key: function (d) { return { S: clamp(st.tgt.S + d, 0, 50), sl: 1, wedge: 1, star: 1 }; }
      });
    },
    draw: function (g, s, st) {
      var E = g.E, S = s.S;
      var MB = function (x) { return 100 - 2 * x; }, MD = function (x) { return 2 * x; };
      g.seg(E.mb, 0, 100, 50, 0, s.mb);
      g.seg(E.md, 0, 0, 50, 100, s.md);
      g.poly(E.wedge, [[S, MB(S)], [S, MD(S)], [25, 50]]);
      g.op(E.wedge, s.wedge * clamp(Math.abs(S - 25), 0, 1));
      g.seg(E.gStar, 25, 0, 25, 50); g.op(E.gStar, s.star);
      g.dotAt(E.dStar, 25, 50, s.star);
      var dlt = 2 * (g.tw(E.lStar) / 2 + 8) / g.ux() + (g.fs.lab / 2 + 4) / g.uy();
      g.at(E.lStar, g.X(25), g.Y(50 + dlt), s.star);
      g.seg(E.gS, S, 0, S, Math.max(MB(S), MD(S))); g.op(E.gS, s.sl);
      var far = Math.abs(S - 25) > 1.2;
      g.dotAt(E.dMB, S, MB(S), s.sl * (far ? 1 : 0)); g.dotAt(E.dMD, S, MD(S), s.sl * (far ? 1 : 0));
      var right = S < 4 || (S >= 25 && S <= 44), off = right ? 14 : -14, anc = right ? 'start' : 'end';
      E.vMB.setAttribute('text-anchor', anc); E.vMD.setAttribute('text-anchor', anc);
      g.say(E.vMB, '$' + Math.round(MB(S))); g.say(E.vMD, '$' + Math.round(MD(S)));
      var sep = Math.abs(g.Y(MB(S)) - g.Y(MD(S))) > g.fs.val * 1.3;
      var lift = function (v) { return v < 9 ? g.Y(v) - (g.small ? 26 : 30) : g.Y(v); };
      g.at(E.vMB, g.X(S) + off, lift(MB(S)), s.sl * (sep ? 1 : 0));
      g.at(E.vMD, g.X(S) + off, lift(MD(S)), s.sl * (sep ? 1 : 0));
      // gains-left label inside the wedge when it fits
      var gl = 2 * (S - 25) * (S - 25);
      g.say(E.lW, g.small ? money(gl) : 'gains left ' + money(gl));
      var cxw = (2 * S + 25) / 3, wpx = Math.abs(g.X(S) - g.X(25)), hpx = Math.abs(g.Y(MB(S)) - g.Y(MD(S)));
      var fits = wpx > g.tw(E.lW) * 1.55 && hpx > g.fs.val * 3;
      g.at(E.lW, g.X(cxw), g.Y(50), s.wedge * (fits ? 1 : 0));
      g.byLine(E.lMB, MB, 8, 'above', 10, s.mb);
      g.byLine(E.lMD, MD, 40, 'above', 10, s.md);
      E.h.at(g.X(S), g.B, s.sl);
      E.h.value(st.tgt.S, 'S = ' + st.tgt.S);
    }
  };

  var mount = document.getElementById('figs');
  window.W11 = [F111, F112, F113, F114, F115].map(function (f) { return new ML.Stage(f, mount); });
})();
