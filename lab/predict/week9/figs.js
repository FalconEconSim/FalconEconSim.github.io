/* Week 9 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow week9-viz.html: demand blue, MR orange (dashed), MC slate, AC gold; consumer surplus
 * (the fixed fee) blue, firm profit gold, deadweight loss and losses red, Nash cells green; in the
 * game, Player A's payoffs and best replies blue, Player B's orange. Plum always means "you".
 *
 * Fig 9.3 is a payoff matrix, not an x-y graph. It is drawn on the kit's SVG stage (the kit's axes
 * are painted over) and answered by tapping payoffs. Two small per-figure extensions sit on top of
 * the kit without changing it (see bindGame): the figure's target() is wrapped so a tap anywhere in
 * the grid maps to the right step (A's payoffs to step 1, B's to step 2, in any order, re-tappable
 * until the reveal), and a capture-phase keydown on the stage gives the grid its own keyboard
 * cursor (arrows move between the eight payoffs, Enter or Space circles one, + and - edit in Explore). */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G, seg = Kit.seg, K = Kit.K, esc = Kit.esc;
  var M = window.W9, U = M.util, Qd = U.Qd, Pd = U.Pd, PLUM = C.plum;
  var DEM = C.blue, DEMT = C.tBlue, MRC = C.orange, MRT = C.tOrange, MCC = '#2c3e50', ACC = C.gold, ACT = C.tGold;
  var MINUS = '−';

  function box(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  // "Q/10", "Q", "2Q", "0.3Q"
  function bq(b) { var r = 1 / b; return b === 1 ? 'Q' : Math.abs(r - Math.round(r)) < 1e-9 ? 'Q/' + Math.round(r) : num(b, 2) + 'Q'; }
  function demEq(p) { return 'P = ' + num(p.a, 2) + ' - ' + bq(p.b); }
  // tick labels: "$1.50" on a laptop; on a phone the "$" goes (the axis title says it) so "3.50" fits the margin
  function dollars(D, narrow) { return function (v) { var t = D.ys < 1 ? v.toFixed(2) : num(v, 2); return narrow && D.ys < 1 ? t : '$' + t; }; }
  function axesFor(f) { return { xtitle: 'Quantity (Q)', ytitle: '$ per unit', yfmt: dollars(f.dom, f.S && f.S.narrow) }; }
  // prices with cents always, so a table never mixes "$1" and "$1.60"
  function cents(v) { return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); }
  function signed(v) { return v < 0 ? MINUS + num(-v, 2) : num(v, 2); }
  // price of the point on P = a - bQ nearest the pointer (measured in pixels), snapped and clamped
  function projP(S, p, X, Y, lo, hi, snap) {
    var n = G.nearest(X, Y, [[0, p.a], [p.a / p.b, 0]], (S.x1 - S.x0) / S.X, (S.y0 - S.y1) / S.Y);
    var P = snap ? Math.round(n.y / snap) * snap : n.y;
    return clamp(+P.toFixed(6), lo, hi);
  }
  // a handle that slides along the demand line; setP(f, P) stores the price
  function onDem(f, P, setP, o) {
    var p = f.p, lo = o.lo, hi = o.hi, sn = o.snap;
    return { x: Qd(p, P), y: P, c: o.c || C.ink, step: o.step, active: o.active, noAutoDone: o.noAuto,
      set: function (f, X, Y) { setP(f, projP(f.S, f.p, X, Y, lo, hi, sn)); },
      key: function (f, dx, dy) { setP(f, clamp(+(P + (dy - dx) * sn).toFixed(6), lo, hi)); if (f.exploring) { f.ex.touched = true; f.resolve(); } } };
  }
  function demLabel(D, S, p, fracs) {
    var fn = function (q) { return Pd(p, q); };
    D.label(S.narrow ? 'D' : 'Demand', D.along(fn, fracs.map(function (t) { return t * p.a / p.b; }), 12), { c: DEMT, size: S.fs });
  }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }
  // label at the centre of a data rectangle if it fits there
  function inRect(D, S, s, x0, y0, x1, y1, o) {
    var w = Math.abs(S.x(x1) - S.x(x0)), h = Math.abs(S.y(y1) - S.y(y0)), size = (o && o.size) || S.ls;
    if (w < Kit.tw(s, size) + 10 || h < size + 6) return false;
    var cands = [];
    [0.5, 0.35, 0.65, 0.25, 0.75].forEach(function (t) { [0.5, 0.3, 0.7].forEach(function (u) {
      var hw = Kit.tw(s, size) / 2 + 6, cx = clamp(S.x(lerp(x0, x1, u)), Math.min(S.x(x0), S.x(x1)) + hw, Math.max(S.x(x0), S.x(x1)) - hw);
      cands.push({ x: cx, y: S.y(lerp(y0, y1, t)) + size * 0.35, anchor: 'middle' }); }); });
    D.label(s, cands, Object.assign({ prio: 0, ring: 1 }, o || {}));
    return true;
  }
  var KBD_LINE = 'Keyboard: arrow keys slide the point along the curve (Shift for bigger steps), Enter confirms.';

  /* =====================================================================
     9.1  Two-part pricing benchmark
     ===================================================================== */
  var TP = M.twopart;
  function tpAreas(D, p, P, op, labels, S) {
    var at = TP.at(p, P), q = at.Q, Qe = (p.a - p.mc) / p.b;
    if (q > 0) D.area([[0, P], [0, p.a], [q, P]], { fill: C.blue, fo: 0.2, op: op, stroke: C.blue, sw: 1.5 });
    if (q > 0 && P > p.mc) D.area(box(0, p.mc, q, P), { fill: C.gold, fo: 0.32, op: op, stroke: C.gold, sw: 1.5 });
    if (q > 0 && P < p.mc) D.area(box(0, P, q, p.mc), { fill: C.red, fo: 0.18, op: op, stroke: C.red, sw: 1.5 });
    if (P > p.mc && P < p.a) D.area([[q, P], [q, p.mc], [Qe, p.mc]], { fill: C.red, fo: 0.28, op: op, stroke: C.red, sw: 1.5 });
    if (P < p.mc) D.area([[Qe, p.mc], [q, p.mc], [q, P]], { fill: C.red, fo: 0.28, op: op, stroke: C.red, sw: 1.5 });
    if (!labels || op < 0.3) return at;
    // fee label inside the triangle, in its fat upper-left part
    var fx = q * 0.18, fy = P + (p.a - P) * 0.42;
    if (q > 0) D.label('F = ' + money(at.F), [{ x: S.x(fx), y: S.y(fy), anchor: 'start' }, { x: S.x(fx), y: S.y(P + (p.a - P) * 0.25), anchor: 'start' }], { c: DEMT, op: op, prio: 0, ring: 60 });
    if (P > p.mc && q > 0) inRect(D, S, (S.narrow ? '' : 'usage ') + money(at.use), 0, p.mc, q, P, { c: ACT, op: op, size: S.ss });
    if (P < p.mc && q > 0) inRect(D, S, 'loss ' + money(-at.use), 0, P, q, p.mc, { c: C.tRed, op: op, size: S.ss });
    return at;
  }
  var f91 = {
    key: 'f91', num: '9.1', topic: 'Two-part pricing benchmark', short: 'Two-part pricing', model: TP, axes: axesFor,
    question: 'Which usage charge p earns the most when a fixed fee comes on top?',
    setup: function (f) {
      var p = f.p;
      return 'Demand is <b>' + demEq(p) + '</b> and MC = AC = <b>' + money(p.mc) + '</b>. The firm charges every buyer a fixed fee F, set to all the consumer surplus left at the usage charge p, plus p per unit. Total profit is F + (p - MC) &times; Q.';
    },
    steps: [
      { kind: 'drag', label: 'Usage charge p', prompt: 'Slide the plum point along demand to the per-unit charge that makes total profit largest.',
        check: function (f) { return f.g.moved ? true : 'Slide it along the curve first.'; } },
      { kind: 'place', key: 'm', label: 'For comparison: one price, no fee', prompt: 'Tap where a monopolist charging a single price for every unit would sell. MR is the dashed line.',
        kstart: function (f) { return { x: f.sol.Qe * 0.75, y: f.p.mc + (f.p.a - f.p.mc) * 0.3 }; } }
    ],
    kbdHint: 'Keyboard: arrow keys slide the point along the curve, Enter confirms; then Enter drops the second point, arrows move it, Enter confirms.',
    initGuess: function (f) { return { p: f.sol.start, moved: false, m: null }; },
    handles: function (f) {
      var p = f.p, hi = +(p.a - Math.max(0.05, p.a * 0.02)).toFixed(2);
      if (f.predicting) return [onDem(f, f.g.p, function (f, P) { f.g.p = P; f.g.moved = true; }, { c: PLUM, step: 0, active: f.cur === 0, lo: 0, hi: hi, snap: 0.05, noAuto: true })];
      if (f.exploring) return [onDem(f, f.ex.p, function (f, P) { f.ex.p = P; }, { active: !f.ex.touched, lo: 0, hi: hi, snap: 0.05 })];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, live = f.exploring && f.ex.touched;   // Explore shows the answer until the first touch
      if (live) tpAreas(D, p, f.ex.p, 1, true, S);
      D.line(0, p.mc, S.X, p.mc, { c: MCC, w: 3, dash: '9 7', pr: b });
      D.line(0, p.a, s.choke / 2, 0, { c: MRC, w: 3.5, dash: '10 8', pr: b });
      D.line(0, p.a, s.choke, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) {
        demLabel(D, S, p, [0.86, 0.78, 0.93]);
        D.label('MR', D.along(function (q) { return p.a - 2 * p.b * q; }, [0.42 * s.choke, 0.36 * s.choke, 0.3 * s.choke], 12), { c: MRT, size: S.fs });
        D.label(S.narrow ? 'MC = ' + money(p.mc) : 'MC = AC = ' + money(p.mc), [{ x: S.x1 - 4, y: S.y(p.mc) - 10, anchor: 'end' }, { x: S.x1 - 4, y: S.y(p.mc) + 26, anchor: 'end' }], { c: MCC, size: S.ls });
      }
      if (f.predicting) {
        var q = Qd(p, g.p);
        D.line(0, g.p, q, g.p, { c: PLUM, w: 2.5, dash: '6 6', layer: 'over' });
        D.near(q, g.p, 'p = ' + cents(g.p), { c: PLUM, d: 22, ring: 90 });
        if (g.m) D.near(g.m.x, g.m.y, 'one price', { c: PLUM, d: 22, size: S.ls, ring: 90 });
        return;
      }
      var sl = f.t('slide'), fee = f.t('fee'), mono = f.t('mono');
      if (f.ghostOn()) {
        D.ghost(Qd(p, g.p), g.p, { op: f.gOp() }); youTag(f, D, Qd(p, g.p), g.p, 'your p');
        if (g.m) { D.ghost(g.m.x, g.m.y, { op: f.gOp() }); youTag(f, D, g.m.x, g.m.y, 'your one price'); }
      }
      if (live) {
        var at = TP.at(p, f.ex.p), qq = at.Q;
        D.line(0, f.ex.p, qq, f.ex.p, { c: C.ink, w: 2.5, dash: '6 6', layer: 'over' });
        D.near(qq, f.ex.p, 'p = ' + cents(f.ex.p), { c: C.ink, d: 22, ring: 90, prio: 0 });
        // the one-price benchmark stays as an outline for comparison
        D.add('over', '<rect x="' + S.x(0).toFixed(1) + '" y="' + S.y(s.Pm).toFixed(1) + '" width="' + (S.x(s.Qm) - S.x(0)).toFixed(1) + '" height="' + (S.y(p.mc) - S.y(s.Pm)).toFixed(1) + '" fill="none" stroke="' + C.tGold + '" stroke-width="2.5" stroke-dasharray="7 5"/>');
        D.label('one price ' + money(s.piM), [{ x: S.x(s.Qm) + 8, y: S.y(s.Pm) - 8, anchor: 'start' }, { x: S.x(s.Qm) - 8, y: S.y(s.Pm) - 8, anchor: 'end' }], { c: C.tGold, size: S.ss, ring: 60 });
        return;
      }
      if (sl > 0 && fee < 1) {
        var Pn = lerp(g.p, p.mc, sl), qn = Qd(p, Pn);
        D.dot(qn, Pn, { c: C.ink, r: 10 });
        D.line(0, Pn, qn, Pn, { c: C.ink, w: 2.5, dash: '6 6', layer: 'over' });
      }
      if (fee > 0) {
        D.area([[0, p.mc], [0, p.a], [s.Qe, p.mc]], { fill: C.blue, fo: 0.2, op: fee, stroke: C.blue, sw: 1.5 });
        D.dot(s.Qe, p.mc, { c: C.ink, r: 10, pr: Math.max(fee, sl >= 1 ? 1 : 0) });
        D.label((S.narrow ? 'F = ' : 'F = CS = ') + money(s.F), [{ x: S.x(s.Qm) + 8, y: S.y(p.mc) - 10, anchor: 'start' }, { x: S.x(s.Qm) + 8, y: S.y(p.mc + (p.a - p.mc) * 0.18), anchor: 'start' },
          { x: S.x(s.Qe * 0.05), y: S.y(p.mc + (p.a - p.mc) * 0.8), anchor: 'start' }], { c: DEMT, op: fee, prio: 0, ring: 40, size: S.fs });
        D.label(S.narrow ? 'p = MC' : 'p = MC, Q = ' + num(s.Qe, 2), [{ x: S.x(s.Qe) + 14, y: S.y(p.mc) - 12, anchor: 'start' }, { x: S.x(s.Qe) + 14, y: S.y(p.mc) + 28, anchor: 'start' }], { c: C.ink, op: fee, ring: 60, prio: 0 });
      }
      if (mono > 0) {
        var up = seg(mono, 0, 0.5);
        D.line(s.Qm, p.mc, s.Qm, lerp(p.mc, s.Pm, up), { c: C.soft, w: 2.5, dash: '6 6', layer: 'over' });
        D.area(box(0, p.mc, s.Qm, s.Pm), { fill: C.gold, fo: 0.4, op: seg(mono, 0.4, 1), stroke: C.gold, sw: 2 });
        D.dot(s.Qm, s.Pm, { c: C.ink, r: 9, pr: seg(mono, 0.4, 1) });
        inRect(D, S, 'π_M = ' + money(s.piM), 0, p.mc, s.Qm, s.Pm, { c: ACT, op: seg(mono, 0.5, 1), size: S.ls });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['slide', 300, 900], ['fee', 1100, 700], ['mono', 1900, 1100]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, at = TP.at(p, g.p);
      return {
        rows: [['Usage charge p', cents(g.p), cents(p.mc)], ['Total profit at that p', cents(at.total), cents(s.F)],
          ['One price: Q and P', g.m ? num(g.m.x, 1) + ' at ' + cents(g.m.y) : '', num(s.Qm, 2) + ' at ' + cents(s.Pm)]],
        why: 'Pricing each unit at MC makes the surplus pie as big as it gets: Q = ' + num(s.Qe, 2) + ' and CS = &frac12;(' + num(p.a, 2) + ' - ' + num(p.mc, 2) + ')(' + num(s.Qe, 2) + ') = <b>' + money(s.F) +
          '</b>, which the fee takes whole. Above MC the pie shrinks; below MC (even p = 0) every unit loses money. With one price, MR = MC gives Q = ' + num(s.Qm, 2) + ' at ' + money(s.Pm) + ' and profit ' + money(s.piM) + ': exactly half.'
      };
    },
    explore: {
      init: function (f) { f.ex.p = f.p.mc; },
      hint: 'Drag the usage charge along demand, below MC too. The blue fee, gold usage profit and red losses update; total profit peaks at p = MC.',
      controls: [],
      readout: function (f) {
        var p = f.p, s = f.sol, at = TP.at(p, f.ex.p), best = Math.abs(f.ex.p - p.mc) < 1e-9;
        return 'Fee ' + money(at.F) + (at.use >= 0 ? ' + usage profit ' + money(at.use) : ' - loss on units ' + money(-at.use)) + ' = <b>total ' + money(at.total) + '</b>. Deadweight loss ' + money(at.dwl) + '. ' +
          (best ? '<span class="good">The maximum: twice the one-price profit of ' + money(s.piM) + '.</span>' : '<span class="bad">' + money(s.F - at.total) + ' short of the ' + money(s.F) + ' maximum.</span>');
      }
    }
  };

  /* =====================================================================
     9.2  Natural monopoly: four regulatory regimes
     ===================================================================== */
  var NM = M.natmon;
  function placeOnDem(key) {
    return function (f, X, Y) { var p = f.p, c = p.a; var P = projP(f.S, p, X, Y, 0.5, c - 0.5, 0.5); f.g[key] = { x: Qd(p, P), y: P }; };
  }
  var REG = { unreg: 'Unregulated (MR = MC)', mc: 'MC pricing (P = MC)', ac: 'AC pricing (P = AC)', tp: 'Two-part (p = MC + fee)' };
  function nmBase(f, S, D, b) {
    var p = f.p, s = f.sol, q0 = p.F / (S.Y * 0.97 - p.c);
    D.line(0, p.c, S.X, p.c, { c: MCC, w: 3.5, pr: b });
    D.line(0, p.a, s.choke / 2, 0, { c: MRC, w: 3.5, dash: '10 8', pr: b });
    D.fn(function (q) { return NM.AC(p, q); }, Math.max(q0, 0.01), S.X, { c: ACC, w: 4.5, pr: b });
    D.line(0, p.a, s.choke, 0, { c: DEM, w: 5, pr: b });
    if (b > 0.9) {
      demLabel(D, S, p, [0.12, 0.2, 0.06]);
      D.label('MR', D.along(function (q) { return p.a - 2 * p.b * q; }, [0.36 * s.choke, 0.3 * s.choke, 0.42 * s.choke], 12), { c: MRT, size: S.fs });
      D.label('AC', D.along(function (q) { return NM.AC(p, q); }, [0.95 * S.X, 0.88 * S.X, 0.8 * S.X], 10, 'aboveOnly'), { c: ACT, size: S.fs });
      D.label('MC = ' + money(p.c), [{ x: S.x0 + 8, y: S.y(p.c) + 22, anchor: 'start' }, { x: S.x0 + 8, y: S.y(p.c) - 10, anchor: 'start' }, { x: S.x(S.X * 0.62), y: S.y(p.c) - 10, anchor: 'start' }, { x: S.x1 - 4, y: S.y(p.c) - 10, anchor: 'end' }], { c: MCC, size: S.ls, ring: 40 });
    }
  }
  function nmRegime(f, S, D, r, op) {
    var p = f.p, s = f.sol, R = s.reg[r], top = Math.max(R.P, R.AC), bot = Math.min(R.P, R.AC);
    var fill = r === 'tp' ? C.gold : R.pi >= -1e-6 ? C.green : C.red, tc = r === 'tp' ? ACT : R.pi >= -1e-6 ? C.tGreen : C.tRed;
    if (top - bot > 1e-6) {
      D.area(box(0, bot, R.Q, top), { fill: fill, fo: r === 'tp' ? 0.32 : 0.22, op: op, stroke: fill, sw: 2 });
      var t = r === 'tp' ? (S.narrow ? 'fee ' : 'fee covers F: ') + money(p.F) : R.pi >= 0 ? 'profit ' + money(R.pi) : 'loss ' + money(-R.pi);
      if (!inRect(D, S, t, 0, bot, R.Q, top, { c: tc, op: op })) D.label(t, [{ x: S.x(R.Q * 0.5), y: S.y(top) - 10, anchor: 'middle' }], { c: tc, op: op, prio: 0, ring: 80 });
    }
    D.drop(R.Q, R.P, { op: op });
    D.dot(R.Q, R.P, { c: C.ink, r: 10, op: op });
    D.near(R.Q, R.P, 'Q ' + num(R.Q, 1) + ', ' + money(R.P), { c: C.ink, op: op, d: 22, ring: 90, prio: 0 });
  }
  var f92 = {
    key: 'f92', num: '9.2', topic: 'Natural monopoly: four regulatory regimes', short: 'Natural monopoly', model: NM, axes: axesFor,
    question: 'Where does the firm end up if left alone, and under average-cost pricing?',
    setup: function (f) {
      var p = f.p;
      return 'Demand is <b>' + demEq(p) + '</b>; total cost is <b>TC = ' + num(p.F) + ' + ' + num(p.c) + 'Q</b>, so MC = ' + money(p.c) + ' and AC = ' + num(p.F) + '/Q + ' + num(p.c) +
        ' falls across the whole market: a natural monopoly. MR = ' + num(p.a) + ' - ' + bq(2 * p.b) + '.';
    },
    steps: [
      { kind: 'place', key: 'u', handle: false, label: 'Left alone', prompt: 'Tap the point on demand where the unregulated monopolist ends up. Taps snap onto the demand curve; drag to adjust.',
        place: placeOnDem('u'), kstart: function (f) { var P = Math.round(f.p.a * 0.7); return { x: Qd(f.p, P), y: P }; } },
      { kind: 'place', key: 'ac', handle: false, label: 'Average-cost pricing', prompt: 'Now tap where the regulator\'s rule P = AC puts the firm.',
        place: placeOnDem('ac'), kstart: function (f) { var P = Math.round(f.p.a * 0.3); return { x: Qd(f.p, P), y: P }; },
        check: function (f) { return f.g.ac && f.g.u && Math.abs(f.g.ac.x - f.g.u.x) < 0.01 * f.sol.choke ? 'That is your first point. Pick a different spot.' : true; } }
    ],
    kbdHint: 'Keyboard: Enter drops the point on the curve, arrow keys slide it, Enter confirms.',
    initGuess: function () { return { u: null, ac: null }; },
    handles: function (f) {
      var g = f.g, p = f.p, hs = [];
      if (!f.predicting) return [];
      var o = function (i) { return { c: PLUM, step: i, active: f.cur === i, lo: 0.5, hi: p.a - 0.5, snap: 0.5 }; };
      if (g.u) hs.push(onDem(f, g.u.y, function (f, P) { f.g.u = { x: Qd(f.p, P), y: P }; }, o(0)));
      if (g.ac) hs.push(onDem(f, g.ac.y, function (f, P) { f.g.ac = { x: Qd(f.p, P), y: P }; }, o(1)));
      return hs;
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g;
      nmBase(f, S, D, b);
      if (f.predicting) {
        if (g.u) { D.drop(g.u.x, g.u.y, { c: PLUM, op: 0.5 }); D.near(g.u.x, g.u.y, 'left alone', { c: PLUM, d: 22, ring: 90 }); }
        if (g.ac) { D.drop(g.ac.x, g.ac.y, { c: PLUM, op: 0.5 }); D.near(g.ac.x, g.ac.y, 'P = AC', { c: PLUM, d: 22, ring: 90 }); }
        return;
      }
      if (f.exploring && f.ex.reg) { nmRegime(f, S, D, f.ex.reg, 1); return; }   // until a regime is picked, Explore keeps the answer
      var u = f.t('u'), pr = f.t('profit'), ac = f.t('ac'), mc = f.t('mc');
      if (f.ghostOn()) {
        if (g.u) { D.ghost(g.u.x, g.u.y, { op: f.gOp() }); youTag(f, D, g.u.x, g.u.y, 'your left alone'); }
        if (g.ac) { D.ghost(g.ac.x, g.ac.y, { op: f.gOp() }); youTag(f, D, g.ac.x, g.ac.y, 'your P = AC'); }
      }
      if (u > 0) {
        D.dot(s.Qu, p.c, { c: MRC, r: 7, pr: seg(u, 0, 0.3) });
        D.line(s.Qu, p.c, s.Qu, lerp(p.c, s.Pu, seg(u, 0.25, 0.8)), { c: C.soft, w: 2.5, dash: '6 6', layer: 'over' });
        D.dot(s.Qu, s.Pu, { c: C.ink, r: 10, pr: seg(u, 0.7, 1) });
        D.near(s.Qu, s.Pu, (S.narrow ? '' : 'MR = MC: ') + 'Q ' + num(s.Qu, 2) + ', ' + money(s.Pu), { c: C.ink, op: seg(u, 0.75, 1), d: 22, ring: 90, prio: 0 });
      }
      if (pr > 0) {
        D.area(box(0, s.ACu, s.Qu, s.Pu), { fill: C.green, fo: 0.22, op: pr, stroke: C.green, sw: 2 });
        inRect(D, S, 'profit ' + money(s.piU), 0, s.ACu, s.Qu, s.Pu, { c: C.tGreen, op: pr });
      }
      if (ac > 0) {
        D.drop(s.Qac, s.Pac, { pr: ac });
        D.dot(s.Qac, s.Pac, { c: C.ink, r: 10, pr: ac });
        var ca = D.around(s.Qac, s.Pac, 22);
        D.label((S.narrow ? '' : 'P = AC: ') + 'Q ' + num(s.Qac, 1) + ', ' + money(s.Pac), [ca[5], ca[2], ca[1], ca[4], ca[0]], { c: C.ink, op: ac, ring: 110, prio: 0 });
      }
      if (mc > 0) {
        D.add('over', K.ring(S.x(s.Qmc), S.y(p.c), { r: 8, c: C.soft, op: mc }));
        var cm = D.around(s.Qmc, p.c, 16);
        D.label('P = MC', [cm[3], cm[6], cm[7], cm[0]], { c: C.soft, op: mc, size: S.ss, ring: 60 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['u', 300, 1300], ['profit', 1500, 500], ['ac', 2000, 700], ['mc', 2600, 400]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var pt = function (q) { return q ? 'Q ' + num(q.x, 1) + ', ' + money(q.y) : ''; };
      return {
        rows: [['Left alone', pt(g.u), 'Q ' + num(s.Qu, 2) + ', ' + money(s.Pu)], ['AC pricing', pt(g.ac), 'Q ' + num(s.Qac, 2) + ', ' + money(s.Pac)],
          ['Profit, left alone', g.u ? money((g.u.y - NM.AC(p, g.u.x)) * g.u.x) : '', money(s.piU)]],
        why: 'Left alone, the firm sets MR = MC: ' + num(p.a) + ' - ' + bq(2 * p.b) + ' = ' + num(p.c) + ' gives Q = ' + num(s.Qu, 2) + ', then charges what demand allows, ' + money(s.Pu) +
          '. Under P = AC, price just covers cost: ' + num(p.a) + ' - ' + bq(p.b) + ' = ' + num(p.F) + '/Q + ' + num(p.c) + ' at the larger root, Q = ' + num(s.Qac, 2) + ', P = ' + money(s.Pac) +
          ': zero profit, no subsidy, a little short of the efficient Q = ' + num(s.Qmc, 2) + ', where P = MC would lose the ' + money(p.F) + ' fixed cost.'
      };
    },
    explore: {
      init: function (f) { f.ex.reg = null; },
      hint: 'Switch regimes, or change the fixed cost. MC pricing always loses exactly the fixed cost; AC pricing always breaks even.',
      controls: function (f) {
        var cap = NM.Fmax(f.p), st = cap > 1500 ? 100 : 50;
        return [
          { kind: 'seg', label: 'Regime', options: [['unreg', 'Left alone'], ['mc', 'P = MC'], ['ac', 'P = AC'], ['tp', 'Two-part']], get: function (f) { return f.ex.reg; }, set: function (f, v) { f.ex.reg = v; } },
          { kind: 'stepper', label: 'Fixed cost', get: function (f) { return f.p.F; }, set: function (f, v, fin) { f.p.F = fin ? Math.round(v) : v; }, step: st, min: st, max: Math.floor(cap * 0.92 / st) * st, fmt: money, dur: 400 }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, r = f.ex.reg, R = s.reg[r];
        if (!r) return 'Pick a regime to see its quantity, price and profit on the graph.';
        var pi = r === 'tp' ? 'profit ' + money(0) + ' after the ' + money(p.F) + ' fee' : R.pi >= -0.005 ? 'profit ' + money(Math.max(0, R.pi)) : '<span class="bad">loss ' + money(-R.pi) + '</span>';
        var dwl = r === 'mc' || r === 'tp' ? 'no deadweight loss' : 'deadweight loss ' + money(s.dwl(R.Q));
        return '<b>' + REG[r] + '</b>: Q ' + num(R.Q, 1) + ', P ' + money(R.P) + ', AC ' + money(R.AC) + '; ' + pi + ', ' + dwl + '.';
      }
    }
  };

  /* =====================================================================
     9.3  Game theory: the circle (best-response) method
     ===================================================================== */
  var GM = M.game;
  // grid geometry in pixels for the current frame
  function gameGeo(f) {
    var S = f.S, n = S.narrow, L = f.p.labels, hs = n ? 16 : 19;
    var rowW = Math.max(Kit.tw(L.r[0], hs), Kit.tw(L.r[1], hs)) * 0.92 + (n ? 10 : 18);
    var nameW = n ? 24 : 34, gx0 = Math.max(S.x0 + 2, nameW + rowW + 4), gx1 = S.W - (n ? 4 : 10);
    var gy0 = n ? 66 : 92, gy1 = S.H - (n ? 58 : 70);
    var cw = (gx1 - gx0) / 2, ch = (gy1 - gy0) / 2;
    // payoff size: big, but long payoffs (OPEC's 1200) shrink so two circled numbers never touch
    var len = 1; f.p.pay.forEach(function (r) { r.forEach(function (c) { c.forEach(function (v) { len = Math.max(len, pv(v).length); }); }); });
    // (payoff centres sit at 0.3 and 0.7 of the cell; a ring adds about 16px a side on a laptop, 10px on a phone)
    var pfs = n ? Math.min(cw < 130 ? 22 : 24, (cw * 0.6 - 22) / (len * 0.58)) : Math.min(36, (cw * 0.4 - 40) / (len * 0.58));
    return { n: n, hs: hs, pfs: pfs, nameW: nameW, gx0: gx0, gx1: gx1, gy0: gy0, gy1: gy1, cw: cw, ch: ch, W: S.W, H: S.H };
  }
  function cellXY(Gm, i, j) { return { x: Gm.gx0 + j * Gm.cw, y: Gm.gy0 + i * Gm.ch }; }
  // centre of a payoff (who 'a' or 'b') in cell (i, j)
  function slotXY(Gm, i, j, who) {
    var c = cellXY(Gm, i, j);
    if (Gm.n) return who === 'a' ? { x: c.x + Gm.cw * 0.3, y: c.y + Gm.ch * 0.66 } : { x: c.x + Gm.cw * 0.7, y: c.y + Gm.ch * 0.36 };
    return { x: c.x + Gm.cw * (who === 'a' ? 0.3 : 0.7), y: c.y + Gm.ch * 0.5 };
  }
  // which payoff is under a pixel point?
  function slotAt(f, px, py) {
    var Gm = gameGeo(f);
    if (px < Gm.gx0 || px > Gm.gx1 || py < Gm.gy0 || py > Gm.gy1) return null;
    var j = Math.min(1, Math.floor((px - Gm.gx0) / Gm.cw)), i = Math.min(1, Math.floor((py - Gm.gy0) / Gm.ch));
    var lx = (px - Gm.gx0 - j * Gm.cw) / Gm.cw;
    return { i: i, j: j, who: lx < 0.5 ? 'a' : 'b' };
  }
  function pv(v) { return v < 0 ? MINUS + Math.abs(v) : String(v); }
  function cellName(p, ij) { return '(' + p.labels.r[ij[0]] + ', ' + p.labels.c[ij[1]] + ')'; }
  function cellList(p, cells) { return cells.length ? cells.map(function (c) { return cellName(p, c); }).join(' and ') : 'none'; }
  function ring(x, y, rx, ry, o) {
    var pr = o.pr == null ? 1 : o.pr; if (pr <= 0.01 || (o.op != null && o.op <= 0.01)) return '';
    return '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="none" stroke="' + o.c + '" stroke-width="' + (o.w || 4) +
      '" pathLength="100" stroke-dasharray="' + (o.dash || (pr < 1 ? (pr * 100).toFixed(2) + ' 100' : 'none')) + '"' + (o.op != null ? ' opacity="' + o.op.toFixed(3) + '"' : '') + ' transform="rotate(-8 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
  }
  function placeA(f, X, Y) { var sl = slotAt(f, f.S.x(X), f.S.y(Y)); if (sl) f.g.a[sl.j] = sl.i; }
  function placeB(f, X, Y) { var sl = slotAt(f, f.S.x(X), f.S.y(Y)); if (sl) f.g.b[sl.i] = sl.j; }
  function picks(arr) { return arr.filter(function (v) { return v != null; }).length; }

  function gameSay(f, s) { f.$('.sr').textContent = s; }
  function slotWords(f, c) {
    var p = f.p, L = p.labels, v = p.pay[c.i][c.j][c.who === 'a' ? 0 : 1];
    return (c.who === 'a' ? L.a : L.b) + '\'s payoff ' + pv(v) + ' in ' + cellName(p, [c.i, c.j]);
  }
  function setPay(f, c, v) { f.p.pay[c.i][c.j][c.who === 'a' ? 0 : 1] = v; }
  function getPay(f, c) { return f.p.pay[c.i][c.j][c.who === 'a' ? 0 : 1]; }
  function gameKey(f, e) {
    var k = e.key, arrows = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1 };
    if (f.revealing) return;
    var edit = f.exploring && (k === '+' || k === '=' || k === '-' || k === '_');
    if (!arrows[k] && k !== 'Enter' && k !== ' ' && !edit) return;
    e.preventDefault(); e.stopPropagation();
    var c = f.kc || (f.kc = { i: 0, j: 0, who: 'a' });
    if (!f.kbd) { f.kbd = true; if (arrows[k]) { gameSay(f, slotWords(f, c) + '. Enter circles it.'); f.render(); return; } }
    if (arrows[k]) {
      var idx = c.j * 2 + (c.who === 'b' ? 1 : 0);
      if (k === 'ArrowRight') idx = Math.min(3, idx + 1);
      if (k === 'ArrowLeft') idx = Math.max(0, idx - 1);
      if (k === 'ArrowUp') c.i = 0;
      if (k === 'ArrowDown') c.i = 1;
      c.j = idx >> 1; c.who = idx & 1 ? 'b' : 'a';
      gameSay(f, slotWords(f, c) + '.');
    } else if (edit) {
      var sel = f.ex.sel, u = f.p.unit || 1, d = (k === '+' || k === '=') ? u : -u;
      setPay(f, sel, clamp(getPay(f, sel) + d, u === 1 ? -20 : -1000, u === 1 ? 20 : 2000));
      f.ex.touched = true; f.resolve(); f.syncControls();
      gameSay(f, slotWords(f, sel) + '.');
    } else if (f.predicting) {
      if (c.who === 'a') { f.g.a[c.j] = c.i; f.completeStep(0); } else { f.g.b[c.i] = c.j; f.completeStep(1); }
      gameSay(f, 'Circled ' + slotWords(f, c) + '. ' + (f.done.every(Boolean) ? 'All four circled. Press Reveal the answer.' : ''));
    } else if (f.exploring) {
      f.ex.sel = { i: c.i, j: c.j, who: c.who }; f.ex.touched = true; f.syncControls();
      gameSay(f, 'Selected ' + slotWords(f, c) + '. Plus and minus change it.');
    }
    f.render();
  }
  // per-figure input on top of the kit: taps anywhere in the grid, and the grid's own keyboard cursor
  function bindGame(f) {
    if (f._g9) return; f._g9 = true;
    var kitTarget = f.target;
    f.target = function (pt, touch) {
      if (f.revealing) return null;
      var sl = slotAt(f, pt.x, pt.y);
      if (!sl) return null;
      if (f.predicting) return { kind: 'place', step: sl.who === 'a' ? 0 : 1 };
      if (f.exploring) return { kind: 'handle', h: { px: [pt.x, pt.y], set: function (f, X, Y) { var s2 = slotAt(f, f.S.x(X), f.S.y(Y)); if (s2) { f.ex.sel = s2; f.syncControls(); } } } };
      return kitTarget.call(f, pt, touch);
    };
    f.capturesPlot = function () { return f.predicting; };
    f.stage.addEventListener('keydown', function (e) { gameKey(f, e); }, true);
    f._slot = function (i, j, who) { return slotXY(gameGeo(f), i, j, who); };   // test hook: pixel centre of a payoff
  }

  var f93 = {
    key: 'f93', num: '9.3', topic: 'Game theory: the circle (best-response) method', short: 'Circle method', model: GM,
    axes: { xtitle: '', ytitle: '', zero: false }, aspect: 0.62, narrowAspect: 1.0, maxH: 520,
    question: 'Circle each player\'s best replies. Where is the Nash equilibrium?',
    setup: function (f) {
      var L = f.p.labels;
      return 'Each cell shows the payoffs (<b class="c-blue">' + esc(L.a) + '</b>, <b class="c-orange">' + esc(L.b) + '</b>). ' + esc(L.a) + ' picks the row, ' + esc(L.b) + ' the column, at the same time. ' +
        'A cell where both payoffs are circled is a Nash equilibrium; your circles shade it as you go.';
    },
    steps: [
      { kind: 'place', label: function (f) { return esc(f.p.labels.a) + '\'s best replies'; }, place: placeA,
        prompt: function (f) { var L = f.p.labels; return 'In each column (each thing ' + esc(L.b) + ' might do), tap ' + esc(L.a) + '\'s better payoff, the blue number. ' + picks(f.g.a) + ' of 2 circled.'; },
        check: function (f) { return picks(f.g.a) === 2; } },
      { kind: 'place', label: function (f) { return esc(f.p.labels.b) + '\'s best replies'; }, place: placeB,
        prompt: function (f) { var L = f.p.labels; return 'In each row, tap ' + esc(L.b) + '\'s better payoff, the orange number. ' + picks(f.g.b) + ' of 2 circled.'; },
        check: function (f) { return picks(f.g.b) === 2; } }
    ],
    kbdHint: 'Keyboard: arrow keys move between the eight payoffs, Enter or Space circles one. In Explore, Enter selects a payoff and plus or minus changes it.',
    initGuess: function () { return { a: [null, null], b: [null, null] }; },
    handles: function () { return []; },
    render: function (f, S, D) {
      bindGame(f);
      var p = f.p, s = f.sol, g = f.g, L = p.labels, Gm = gameGeo(f), b = f.base(), out = '';
      var T = function (x, y, str, o) { out += K.text(x, y, str, Object.assign({ halo: false }, o)); };
      out += '<rect x="0" y="0" width="' + S.W + '" height="' + S.H + '" fill="' + C.paper + '"/>';   // paints over the kit's axes
      var gw = Gm.gx1 - Gm.gx0, gh = Gm.gy1 - Gm.gy0;
      // headers
      T(Gm.gx0 + gw / 2, Gm.n ? 22 : 30, L.b, { size: Gm.n ? 18 : 22, weight: 800, c: C.tOrange, anchor: 'middle', op: b });
      for (var j = 0; j < 2; j++) T(Gm.gx0 + Gm.cw * (j + 0.5), Gm.gy0 - (Gm.n ? 14 : 18), L.c[j], { size: Gm.hs, weight: 700, c: C.ink, anchor: 'middle', op: b });
      var ax = Gm.n ? 17 : 24, ay = Gm.gy0 + gh / 2;
      out += '<text x="' + ax + '" y="' + ay + '" transform="rotate(-90 ' + ax + ' ' + ay + ')" font-size="' + (Gm.n ? 18 : 22) + '" font-weight="800" fill="' + C.tBlue + '" text-anchor="middle" opacity="' + b.toFixed(3) + '">' + esc(L.a) + '</text>';
      for (var i = 0; i < 2; i++) T(Gm.gx0 - (Gm.n ? 8 : 14), Gm.gy0 + Gm.ch * (i + 0.5) + 6, L.r[i], { size: Gm.hs, weight: 700, c: C.ink, anchor: 'end', op: b });
      // cells
      var nashT = f.t('ne'), mine = GM.implied(g), all = f.done.every(Boolean);
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
        var c = cellXY(Gm, i, j), fill = '#fff';
        out += '<rect x="' + c.x.toFixed(1) + '" y="' + c.y.toFixed(1) + '" width="' + Gm.cw.toFixed(1) + '" height="' + Gm.ch.toFixed(1) + '" fill="' + fill + '" opacity="' + b.toFixed(3) + '"/>';
        var isMine = mine.some(function (m) { return m[0] === i && m[1] === j; }), isNash = s.nash.some(function (m) { return m[0] === i && m[1] === j; });
        if (f.predicting && isMine) out += '<rect x="' + (c.x + 3).toFixed(1) + '" y="' + (c.y + 3).toFixed(1) + '" width="' + (Gm.cw - 6).toFixed(1) + '" height="' + (Gm.ch - 6).toFixed(1) + '" fill="' + PLUM + '" fill-opacity="0.12"/>';
        if (!f.predicting && isNash && nashT > 0) out += '<rect x="' + (c.x + 3).toFixed(1) + '" y="' + (c.y + 3).toFixed(1) + '" width="' + (Gm.cw - 6).toFixed(1) + '" height="' + (Gm.ch - 6).toFixed(1) + '" fill="' + C.green + '" fill-opacity="' + (0.2 * nashT).toFixed(3) + '"/>';
        if (Gm.n) out += K.pline(c.x + 6, c.y + 6, c.x + Gm.cw - 6, c.y + Gm.ch - 6, { c: C.line, w: 1.5 });
        var A = slotXY(Gm, i, j, 'a'), B = slotXY(Gm, i, j, 'b'), dy = Gm.pfs * 0.35;
        T(A.x, A.y + dy, pv(p.pay[i][j][0]), { size: Gm.pfs, weight: 800, c: C.tBlue, anchor: 'middle', op: b });
        if (!Gm.n) T(Gm.gx0 + Gm.cw * (j + 0.5), A.y + dy, ',', { size: Gm.pfs, weight: 700, c: C.soft, anchor: 'middle', op: b });
        T(B.x, B.y + dy, pv(p.pay[i][j][1]), { size: Gm.pfs, weight: 800, c: C.tOrange, anchor: 'middle', op: b });
        if (!f.predicting && isNash && nashT > 0.3) T(c.x + Gm.cw - 10, Gm.n ? c.y + Gm.ch - 10 : c.y + 26, 'Nash', { size: Gm.n ? 15 : 17, weight: 800, c: C.tGreen, anchor: 'end', op: nashT });
      }
      // grid lines
      out += '<g opacity="' + b.toFixed(3) + '">' + K.pline(Gm.gx0, Gm.gy0 + Gm.ch, Gm.gx1, Gm.gy0 + Gm.ch, { c: C.ink, w: 2 }) + K.pline(Gm.gx0 + Gm.cw, Gm.gy0, Gm.gx0 + Gm.cw, Gm.gy1, { c: C.ink, w: 2 }) +
        '<rect x="' + Gm.gx0 + '" y="' + Gm.gy0 + '" width="' + gw.toFixed(1) + '" height="' + gh.toFixed(1) + '" fill="none" stroke="' + C.ink + '" stroke-width="2.5"/></g>';
      var rxA = function (i, j, who) { return Kit.tw(pv(p.pay[i][j][who === 'a' ? 0 : 1]), Gm.pfs) / 2 + (Gm.n ? 6 : 16); }, ry = Gm.pfs * (Gm.n ? 0.78 : 0.72);
      // student's circles: solid plum while predicting, dashed ghosts after
      var gop = f.predicting ? 1 : f.ghostOn() ? f.gOp() : 0;
      if (gop > 0.01) {
        for (j = 0; j < 2; j++) if (g.a[j] != null) { var pa = slotXY(Gm, g.a[j], j, 'a'); out += ring(pa.x, pa.y, rxA(g.a[j], j, 'a'), ry, { c: PLUM, w: 3.5, op: gop, dash: f.predicting ? null : '5 4' }); }
        for (i = 0; i < 2; i++) if (g.b[i] != null) { var pb = slotXY(Gm, i, g.b[i], 'b'); out += ring(pb.x, pb.y, rxA(i, g.b[i], 'b'), ry, { c: PLUM, w: 3.5, op: gop, dash: f.predicting ? null : '5 4' }); }
      }
      // the truth: A's best replies (blue), then B's (orange), drawn in like a pen stroke
      var ta = f.t('a'), tb = f.t('b'), grow = f.predicting ? 0 : Gm.n ? 4 : 7;
      if (ta > 0) for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) if (s.aIs(i, j)) { var qa = slotXY(Gm, i, j, 'a'); out += ring(qa.x, qa.y, rxA(i, j, 'a') + grow, ry + grow, { c: C.blue, w: 4.5, pr: seg(ta, j * 0.4, j * 0.4 + 0.6) }); }
      if (tb > 0) for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) if (s.bIs(i, j)) { var qb = slotXY(Gm, i, j, 'b'); out += ring(qb.x, qb.y, rxA(i, j, 'b') + grow, ry + grow, { c: C.orange, w: 4.5, pr: seg(tb, i * 0.4, i * 0.4 + 0.6) }); }
      // keyboard cursor and the Explore selection
      var box2 = function (c, col, dash) {
        var q = slotXY(Gm, c.i, c.j, c.who), w = rxA(c.i, c.j, c.who) * 2 + (Gm.n ? 8 : 18), h = ry * 2 + (Gm.n ? 10 : 16);
        return '<rect x="' + (q.x - w / 2).toFixed(1) + '" y="' + (q.y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="10" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-dasharray="' + dash + '"/>';
      };
      if (f.exploring && f.ex.sel && f.ex.touched) out += box2(f.ex.sel, C.ink, '7 5');
      if (f.kbd && f.kc && !f.revealing) out += box2(f.kc, PLUM, '3 4');
      // status line under the grid
      var sy = Gm.gy1 + (Gm.n ? 36 : 44), sz = Gm.n ? 17 : 20, sx = Gm.n ? 4 : Gm.gx0;
      // one line under the grid, shrunk to fit the frame
      var fit = function (str) { return Math.max(13, Math.min(sz, sz * (Gm.W - sx - 6) / Kit.tw(str, sz))); };
      T = function (x, y, str, o) { out += K.text(sx, y, str, Object.assign({ halo: false }, o, { size: fit(str) })); };
      if (f.predicting) {
        var n4 = picks(g.a) + picks(g.b);
        if (n4 < 4) T(Gm.gx0, sy, n4 + ' of 4 circled', { size: sz, weight: 700, c: C.soft, op: b });
        else T(Gm.gx0, sy, mine.length ? (Gm.n ? 'Yours: ' : 'Your equilibrium: ') + cellList(p, mine) : 'Your circles: no cell has both', { size: sz, weight: 800, c: PLUM });
      } else if (nashT > 0) {
        var st = s.nash.length ? (s.nash.length > 1 ? 'Nash equilibria: ' : 'Nash equilibrium: ') + cellList(p, s.nash) : 'No pure-strategy Nash equilibrium';
        T(Gm.gx0, sy, st, { weight: 800, c: s.nash.length ? C.tGreen : C.tRed, op: nashT });
      }
      D.add('over', out);
    },
    reveal: function () { return [['ghost', 0, 400], ['a', 300, 1100], ['b', 1400, 1100], ['ne', 2500, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, L = p.labels, mine = GM.implied(g), rows = [];
      var two = function (v, names) { return v.map(function (x) { return x == null ? '?' : esc(names[x]); }).join(', '); };
      rows.push([esc(L.a) + '\'s replies to ' + esc(L.c[0]) + ', ' + esc(L.c[1]), two(g.a, L.r), two(s.aBR, L.r)]);
      rows.push([esc(L.b) + '\'s replies to ' + esc(L.r[0]) + ', ' + esc(L.r[1]), two(g.b, L.c), two(s.bBR, L.c)]);
      var j, i;
      rows.push(['Nash equilibrium', esc(cellList(p, mine)), esc(cellList(p, s.nash))]);
      var dom = function (who) {
        var d = who === 'a' ? s.domA : s.domB, nm = who === 'a' ? L.a : L.b;
        return d != null ? esc(nm) + ' has a dominant strategy, <b>' + esc(who === 'a' ? L.r[d] : L.c[d]) + '</b>: best whatever the other does. ' : esc(nm) + '\'s best reply changes with the other\'s choice. ';
      };
      var why = dom('a') + dom('b');
      if (!s.nash.length) why += 'No cell has both payoffs circled, so there is <b>no pure-strategy Nash equilibrium</b>: in every cell someone wants to switch.';
      else if (s.nash.length === 1) why += 'Only <b>' + esc(cellName(p, s.nash[0])) + '</b> has both payoffs circled: neither player gains by switching alone.';
      else why += 'Two cells have both payoffs circled, <b>' + esc(cellList(p, s.nash)) + '</b>: two equilibria, and the players must somehow coordinate on one.';
      // a prisoner's dilemma: some other cell is better for both than the equilibrium
      if (s.nash.length === 1) {
        var e = p.pay[s.nash[0][0]][s.nash[0][1]];
        for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) if (p.pay[i][j][0] > e[0] && p.pay[i][j][1] > e[1]) why += ' Yet ' + esc(cellName(p, [i, j])) + ' would leave both better off: the dilemma.';
      }
      return { rows: rows, why: why };
    },
    explore: {
      init: function (f) { f.ex.game = 'round'; f.ex.sel = { i: 0, j: 0, who: 'a' }; },
      hint: 'Load a classic game, or tap any payoff and change it with the stepper. The circles and the green equilibrium cells follow.',
      controls: function (f) {
        return [
          { kind: 'seg', label: 'Game', options: [['round', 'This round'], ['pd', 'Prisoner\'s Dilemma'], ['opec', 'OPEC'], ['coord', 'Coordination'], ['adv', 'Advertising']],
            get: function (f) { return f.ex.game; }, set: function (f, v) { f.ex.game = v; f.p = U.clone(v === 'round' ? f.p0 : GM.presets[v]); } },
          { kind: 'stepper', label: 'Selected payoff', get: function (f) { return getPay(f, f.ex.sel); }, set: function (f, v) { setPay(f, f.ex.sel, Math.round(v)); },
            get step() { return f.p.unit || 1; }, get min() { return f.p.unit === 100 ? -1000 : -20; }, get max() { return f.p.unit === 100 ? 2000 : 20; }, fmt: pv, dur: 1 }
        ];
      },
      readout: function (f) {
        var p = f.p, s = f.sol, L = p.labels;
        var br = function (who) {
          var out = [];
          for (var k = 0; k < 2; k++) {
            if (who === 'a') out.push('vs ' + esc(L.c[k]) + ': ' + (s.aTie[k] ? 'either' : esc(L.r[s.aBR[k]])));
            else out.push('vs ' + esc(L.r[k]) + ': ' + (s.bTie[k] ? 'either' : esc(L.c[s.bBR[k]])));
          }
          return out.join(', ');
        };
        return 'Selected: ' + esc(slotWords(f, f.ex.sel)) + '.<br><span class="c-blue"><b>' + esc(L.a) + '</b></span> ' + br('a') + '. <span class="c-orange"><b>' + esc(L.b) + '</b></span> ' + br('b') +
          '.<br>' + (s.nash.length ? '<span class="good">Nash: ' + esc(cellList(p, s.nash)) + '</span>' : '<span class="bad">No pure-strategy Nash equilibrium.</span>');
      }
    }
  };

  /* =====================================================================
     9.4  Block pricing: a staircase toward perfect discrimination
     ===================================================================== */
  var BK = M.blocks;
  function words(n) { return ['zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] || String(n); }
  function edgeLabels(D, S, s, n, op) {
    var gap = S.x(s.w) - S.x(0), last = num(s.Qe, 2);
    for (var i = 1; i <= n; i++) {
      var t = num(i * s.w, 2);
      var onTick = Math.abs(i * s.w / S.xs - Math.round(i * s.w / S.xs)) < 1e-9;
      if (!onTick && (gap > Kit.tw(t, S.ss) + 10 || i === n)) D.xval(i * s.w, t, { c: C.soft, size: S.ss, op: op });
    }
    return last;
  }
  var f94 = {
    key: 'f94', num: '9.4', topic: 'Block pricing: a staircase toward perfect discrimination', short: 'Block pricing', model: BK, axes: axesFor,
    question: function (f) { return words(f.p.n) + ' price blocks. What should each block charge per unit?'; },
    setup: function (f) {
      var p = f.p, s = f.sol;
      return 'Demand is <b>' + demEq(p) + '</b>, MC = <b>' + money(p.mc) + '</b>. The firm splits the efficient output, Q = ' + num(s.Qe, 2) + ', into ' + p.n + ' equal blocks of ' + num(s.w, 2) +
        ' units and charges a lower rate for each later block, like an electricity tariff. Each rate is set as high as it can go while that whole block still sells.';
    },
    steps: [{ kind: 'drag', label: 'Each block\'s price', prompt: function (f) { return 'Drag each plum bar up or down to that block\'s price per unit. ' + f.g.moved.filter(Boolean).length + ' of ' + f.p.n + ' set.'; },
      check: function (f) { return f.g.moved.every(Boolean) ? true : false; } }],
    kbdHint: 'Keyboard: arrow keys move the highlighted bar up or down, Space switches bars, Enter confirms.',
    initGuess: function (f) { var n = f.p.n, s = f.sol; return { pr: new Array(n).fill(s.start), moved: new Array(n).fill(false) }; },
    handles: function (f) {
      if (!f.predicting) return [];
      var p = f.p, s = f.sol;
      return f.g.pr.map(function (P, i) {
        return { x: (i + 0.5) * s.w, y: P, c: PLUM, grip: 'v', step: 0, active: !f.g.moved[i], snap: { x: 0, y: 0.05 },
          set: function (f, X, Y) { f.g.pr[i] = clamp(+Y.toFixed(2), 0, p.a); f.g.moved[i] = true; },
          key: function (f, dx, dy) { f.g.pr[i] = clamp(+(f.g.pr[i] + dy * 0.05).toFixed(2), 0, p.a); f.g.moved[i] = true; } };
      });
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), g = f.g, n = p.n;
      D.line(0, p.mc, S.X, p.mc, { c: MCC, w: 3, dash: '9 7', pr: b });
      // block edges, up to the demand curve
      for (var i = 1; i <= n; i++) D.line(i * s.w, 0, i * s.w, Pd(p, i * s.w), { c: C.grey, w: 2, dash: '4 5', pr: b, reg: false });
      if (b > 0.9) {
        edgeLabels(D, S, s, n, 1);
        D.label('MC = ' + money(p.mc), [{ x: S.x1 - 4, y: S.y(p.mc) - 10, anchor: 'end' }, { x: S.x1 - 4, y: S.y(p.mc) + 26, anchor: 'end' }], { c: MCC, size: S.ls });
      }
      var stairs = f.t('stairs'), left = f.t('left'), tot = f.t('tot');
      if (f.predicting) {
        g.pr.forEach(function (P, i) {
          D.area(box(i * s.w, p.mc, (i + 1) * s.w, P), { fill: PLUM, fo: 0.08 });
          D.line(i * s.w, P, (i + 1) * s.w, P, { c: PLUM, w: 5, layer: 'over' });
          if (g.moved[i] && !S.narrow) D.label(cents(P), D.around((i + 0.5) * s.w, P, 22).slice(2, 4).concat(D.around((i + 0.5) * s.w, P, 22).slice(0, 2)), { c: PLUM, size: S.ss, ring: 50 });
        });
      } else {
        if (f.ghostOn()) g.pr.forEach(function (P, i) { D.line(i * s.w, P, (i + 1) * s.w, P, { c: PLUM, w: 3, dash: '6 5', op: f.gOp(), layer: 'over', reg: false }); });
        var nn = f.exploring ? n : n;
        for (i = 0; i < nn; i++) {
          var k = f.exploring ? 1 : seg(stairs, i / nn, (i + 1) / nn);
          if (k <= 0) continue;
          var P = s.pr[i], top = lerp(p.mc, P, Math.min(1, k * 1.4));
          D.area(box(i * s.w, p.mc, (i + 1) * s.w, top), { fill: C.gold, fo: 0.32, stroke: C.gold, sw: 1.5 });
          D.line(i * s.w, top, (i + 1) * s.w, top, { c: C.tGold, w: 4.5, layer: 'over' });
          D.dot((i + 1) * s.w, P, { c: C.ink, r: n > 6 ? 6 : 8, pr: seg(k, 0.5, 1) });
          if (!f.exploring && !S.narrow) D.label(cents(P), D.around((i + 0.5) * s.w, P, 18).slice(2, 3), { c: C.tGold, size: S.ss, op: seg(k, 0.6, 1), ring: 40 });
        }
        if (left > 0) {
          for (i = 0; i < n; i++) D.area([[i * s.w, s.pr[i]], [i * s.w, Pd(p, i * s.w)], [(i + 1) * s.w, s.pr[i]]], { fill: C.blue, fo: 0.2, op: left });
        }
        if (tot > 0) {
          var lab = (S.narrow ? 'profit ' : 'firm captures ') + money(s.profit) + ' of ' + money(s.max);
          D.label(lab, [{ x: S.x1 - 6, y: S.y1 + 14, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 44, anchor: 'end' }], { c: C.tGold, op: tot, prio: 0, size: S.fs });
          D.label(S.narrow ? 'buyers keep' : 'buyers keep the blue', D.around(s.w * 0.25, Pd(p, s.w * 0.25), 20).slice(0, 1).concat(D.around(s.w * 0.6, Pd(p, s.w * 0.6), 20)), { c: DEMT, op: tot, size: S.ss, ring: 90 });
        }
      }
      D.line(0, p.a, s.choke, 0, { c: DEM, w: 5, pr: b });
      if (b > 0.9) demLabel(D, S, p, [0.86, 0.78, 0.93]);
    },
    reveal: function (f) { return [['ghost', 0, 400], ['stairs', 300, 600 + 450 * f.p.n, 'linear'], ['left', 700 + 450 * f.p.n, 500], ['tot', 1000 + 450 * f.p.n, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      var rows = s.pr.map(function (P, i) { return ['Block ' + (i + 1) + ', Q ' + num(i * s.w, 2) + ' to ' + num((i + 1) * s.w, 2), cents(g.pr[i]), cents(P)]; });
      rows.push(['Profit captured', '', money(s.profit) + ' of ' + money(s.max)]);
      return {
        rows: rows,
        why: 'A block sells only if the buyer values its <b>last</b> unit at the rate or more, so each rate is the demand price at the block\'s right edge: ' + num(p.a, 2) + ' - ' + bq(p.b) + ' at Q = ' +
          s.pr.map(function (P, i) { return num((i + 1) * s.w, 2); }).join(', ') + '. The last block lands on MC. Profit is the gold staircase, ' + money(s.max) + ' &times; (' + p.n + ' - 1)/' + p.n + ' = <b>' + money(s.profit) +
          '</b>; the blue triangles are what buyers keep. More blocks, smaller triangles.'
      };
    },
    explore: {
      hint: 'Add or remove blocks. With one block priced at MC the firm captures nothing; as blocks multiply the staircase hugs demand and profit approaches the perfect-discrimination maximum.',
      controls: [{ kind: 'stepper', label: 'Price blocks', get: function (f) { return f.p.n; }, set: function (f, v, fin) { f.p.n = fin ? Math.round(v) : Math.max(1, Math.round(v)); }, step: 1, min: 1, max: 10, fmt: function (v) { return num(v, 0); }, dur: 1 }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        return p.n === 1 ? 'One block priced at MC: the competitive outcome, <b>' + money(0) + '</b> captured.' :
          '<b>' + p.n + ' blocks</b> capture <b>' + money(s.profit) + '</b>, ' + num(100 * s.share, 0) + '% of the ' + money(s.max) + ' maximum.' + (p.n >= 8 ? ' In the limit of one price per unit, the staircase sits on demand: perfect (first-degree) price discrimination.' : '');
      }
    }
  };

  window.W9FIGS = [f91, f92, f93, f94];
})();
