/* Week 2 figures as predict-then-see specs on the shared kit (../kit/kit.js, README there).
 * Economics lives in models.js; verify.js checks every randomized draw.
 * Colors follow the fig25 film: budget line orange, indifference curves purple (lavender for the
 * background family), answers in ink, value labels blue. Plum always means "you". */
(function () {
  'use strict';
  var C = Kit.C, num = Kit.num, money = Kit.money, clamp = Kit.clamp, lerp = Kit.lerp, G = Kit.G;
  var M = window.W2, PLUM = C.plum;
  var BUD = C.orange, BUDT = C.tOrange, IC = C.purple, ICT = C.tPurple, ICF = '#c9c0e2', VAL = C.tBlue;
  var AX = { xtitle: 'Good X', ytitle: 'Good Y' };

  function pt(x, y, dp) { return '(' + num(x, dp) + ', ' + num(y, dp) + ')'; }
  function eq(Px, Py, I) { return num(Px, 2) + 'X + ' + num(Py, 2) + 'Y = ' + num(I); }
  function uCD(a) { return 'X<sup>' + num(a, 2) + '</sup>Y<sup>' + num(1 - a, 2) + '</sup>'; }
  var PX = 'P<sub>X</sub>', PY = 'P<sub>Y</sub>', PXt = 'P_X', PYt = 'P_Y';
  // label a straight segment (x1,y1)-(x2,y2) at fractions along it
  function segLabel(D, s, x1, y1, x2, y2, fracs, o) {
    var c = []; fracs.forEach(function (t) { c.push.apply(c, D.along(function () { return lerp(y1, y2, t); }, [lerp(x1, x2, t)], o && o.d, o && o.pref)); });
    return D.label(s, c, Object.assign({ size: D.S.fs }, o || {}));
  }
  // nearest x on y = fn(x) to a pointer at data (X, Y), measured in pixels
  function nearX(S, fn, a, b, X, Y) {
    var pts = G.sample(fn, a, b, 400).map(function (p) { return p && p[1] >= 0 && p[1] <= S.Y ? p : null; });
    var sx = (S.x1 - S.x0) / S.X, sy = (S.y0 - S.y1) / S.Y;
    var n = G.nearest(X, Y, pts, sx, sy);
    return n.x == null ? null : n.x;
  }
  // the x where y = fn(x) enters the top of the frame (fn decreasing)
  function xTop(fn, Y, lo, hi) { return G.bisect(function (x) { return fn(x) - Y; }, lo, hi); }
  function youTag(f, D, x, y, s) { if (f.ghostOn() && f.gOp() > 0.5) D.near(x, y, s || 'you', { c: PLUM, size: D.S.ss, op: 0.85, ring: 70 }); }

  /* =====================================================================
     2.1  Indifference curves: which bundles are just as good as P?
     ===================================================================== */
  var TNAME = { cobb: 'Cobb-Douglas', subs: 'Perfect substitutes', comp: 'Perfect complements', neutral: 'Neutral good', bad: 'Economic bad' };
  function tasteText(p) {
    if (p.type === 'cobb') return 'She has <b>Cobb-Douglas</b> tastes, U = ' + uCD(p.a) + ': she likes both goods and likes a mix.';
    if (p.type === 'subs') return 'To her X and Y are <b>perfect substitutes</b>, U = X + Y: one unit of either is as good as one of the other.';
    if (p.type === 'comp') return 'X and Y are <b>perfect complements</b> to her, U = min(X, Y), like left and right shoes: only pairs count.';
    if (p.type === 'neutral') return 'Y is a <b>neutral good</b> to her, U = X: more Y neither helps nor hurts.';
    return 'Y is an <b>economic bad</b> to her, U = X - Y, like noise or pollution: more Y makes her worse off.';
  }
  function farFromP(key) {
    return function (f) {
      var q = f.g[key], p = f.p; if (!q) return false;
      if (Math.hypot(q.x - p.x0, q.y - p.y0) < 0.75) return 'That is P itself. Drag it to a different bundle.';
      var clash = ['b1', 'b2', 'b3'].some(function (k) { return k !== key && f.g[k] && Math.hypot(f.g[k].x - q.x, f.g[k].y - q.y) < 0.6; });
      return clash ? 'You already have a bundle there. Drag this one somewhere new.' : true;
    };
  }
  var f21 = {
    key: 'f21', num: '2.1', topic: 'Indifference curves', short: 'Indifference curves', model: M.prefs, axes: AX,
    aspect: 0.8,
    question: 'Which other bundles does she like exactly as much as P?',
    setup: function (f) { return tasteText(f.p) + ' P is the bundle ' + pt(f.p.x0, f.p.y0) + '.'; },
    steps: [
      { kind: 'place', key: 'b1', snap: 0.1, label: 'A bundle just as good as P', prompt: 'Tap a bundle she likes exactly as much as P.', check: farFromP('b1'), kstart: function () { return { x: 8, y: 2 }; } },
      { kind: 'place', key: 'b2', snap: 0.1, label: 'Another one', prompt: 'Tap another, somewhere else on the graph.', check: farFromP('b2'), kstart: function () { return { x: 2, y: 8 }; } },
      { kind: 'place', key: 'b3', snap: 0.1, label: 'And a third', prompt: 'One more. Spread them out.', check: farFromP('b3'), kstart: function () { return { x: 8, y: 8 }; } }
    ],
    initGuess: function () { return { b1: null, b2: null, b3: null }; },
    handles: function (f) {
      if (!f.exploring) return [];
      return [{ x: f.p.x0, y: f.p.y0, c: C.ink, snap: 0.5, active: true, set: function (f, X, Y) { f.p.x0 = clamp(X, 0.5, 9.5); f.p.y0 = clamp(Y, 0.5, 9.5); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base();
      if (f.truth) {
        var cp = f.t('curve');
        D.path(s.pts, { c: IC, w: 5, pr: cp });
        if (cp > 0.9) D.pathLabel(f.exploring && f.ex.touched ? 'her IC through P' : 'her IC through P', s.pts, [0.82, 0.65, 0.92, 0.3, 0.15], { c: ICT });
        if (f.ghostOn()) {
          var gp = f.t('gaps');
          ['b1', 'b2', 'b3'].forEach(function (k) {
            var q = g[k]; if (!q) return;
            var n = M.prefs.gap(p, q);
            if (gp > 0 && n.d > 0.12) D.line(q.x, q.y, lerp(q.x, n.x, gp), lerp(q.y, n.y, gp), { c: n.d < 0.25 ? C.green : C.red, w: 3, dash: '3 5', layer: 'over' });
            D.ghost(q.x, q.y, { op: f.gOp() });
          });
          var tagged = ['b1', 'b2', 'b3'].filter(function (k) { return g[k]; })[0];
          if (tagged) youTag(f, D, g[tagged].x, g[tagged].y);
        }
        var bt = f.t('better');
        if (bt > 0) {
          var v = M.prefs.better(p), L = 1.9, ex = p.x0 + v[0] * L * bt, ey = p.y0 + v[1] * L * bt;
          D.arrow(p.x0 + v[0] * 0.45, p.y0 + v[1] * 0.45, ex, ey, { c: C.gold, w: 4.5 });
          if (bt > 0.6) D.near(ex, ey, 'better', { c: C.tGold, op: bt });
        }
      }
      if (!f.exploring) D.dot(p.x0, p.y0, { c: C.ink, r: 10, pr: b });
      if (b > 0.5) D.near(p.x0, p.y0, 'P', { c: C.ink, d: 18, size: S.fs });
    },
    reveal: function () { return [['ghost', 0, 400], ['curve', 250, 1300], ['gaps', 1500, 600], ['better', 2050, 650]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, rows = [];
      ['b1', 'b2', 'b3'].forEach(function (k, i) {
        var q = g[k]; if (!q) return;
        var n = M.prefs.gap(p, q);
        rows.push(['Bundle ' + (i + 1), pt(q.x, q.y), n.d < 0.25 ? 'on her IC' : 'nearest ' + pt(n.x, n.y)]);
      });
      if (!rows.length) rows.push(['Her IC', '', p.type === 'neutral' ? 'X = ' + num(p.x0) : 'U = ' + num(s.U, 2)]);
      var why = {
        cobb: 'Every bundle on the curve gives the same utility, U = ' + num(s.U, 2) + '. It bows in toward the origin: as Y gets scarce she asks for more and more X to give up one more Y. That is a diminishing MRS, and at P it is ' + num(s.mrs, 2) + '.',
        subs: 'She only cares about the total, X + Y = ' + num(s.U) + ', so the curve is a straight line with slope -1: anywhere on it she swaps one for one.',
        comp: 'Only pairs count: U = min(X, Y) = ' + num(s.U) + '. Extra X without extra Y adds nothing, and the reverse, so the curve is an L with its corner at ' + pt(s.U, s.U) + '.' +
          (p.x0 !== p.y0 ? ' P sits on one arm of the L, holding goods she gets no use from.' : ''),
        neutral: 'Y does nothing for her, so every bundle with X = ' + num(p.x0) + ' is just as good as P: the curve is a vertical line. Only more X makes her better off.',
        bad: 'More Y makes her worse off, so to stay just as happy with more Y she needs more X too: the curve slopes up, Y = X - ' + num(s.U) + '. Better bundles lie down and to the right.'
      }[p.type];
      return { rows: rows, why: why };
    },
    explore: {
      hint: 'Drag P anywhere, or switch her tastes, and watch the curve through P change shape.',
      controls: [{ kind: 'seg', label: 'Her tastes', options: [['cobb', 'Cobb-Douglas'], ['subs', 'Substitutes'], ['comp', 'Complements'], ['neutral', 'Neutral Y'], ['bad', 'Y is a bad']],
        get: function (f) { return f.p.type; }, set: function (f, v) { f.p.type = v; } }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        var tail = p.type === 'cobb' ? ' MRS at P: <b>' + num(s.mrs, 2) + '</b>, she would give up ' + num(s.mrs, 2) + ' Y for one more X.' :
          p.type === 'subs' ? ' MRS is <b>1</b> everywhere.' : p.type === 'comp' ? ' The corner sits at <b>' + pt(s.U, s.U) + '</b>.' :
          p.type === 'neutral' ? ' Only X matters.' : ' Up and to the left is worse.';
        return '<b>' + TNAME[p.type] + '</b>. P = ' + pt(p.x0, p.y0) + ', U = <b>' + num(s.U, 2) + '</b>.' + tail;
      }
    }
  };

  /* =====================================================================
     2.3  The budget line: where does it hit each axis?
     ===================================================================== */
  function endHandles(f, S, gx, gy, setx, sety, col, step, act) {
    return [
      { x: gx, y: 0, c: col, grip: 'h', snap: { x: 0.5, y: 0 }, step: step, active: act && !f.g.mx,
        hit: function (pt) { return Math.abs(pt.y - S.y0) < 30 ? Math.abs(pt.x - S.x(gx)) : 1e9; }, set: function (f, X) { setx(f, X); } },
      { x: 0, y: gy, c: col, grip: 'v', snap: { x: 0, y: 0.5 }, step: step, active: act && !f.g.my,
        hit: function (pt) { return Math.abs(pt.x - S.x0) < 30 ? Math.abs(pt.y - S.y(gy)) : 1e9; }, set: function (f, X, Y) { sety(f, Y); } }
    ];
  }
  function endLabels(D, S, gx, gy, col, op) {
    D.label('X = ' + num(gx), [{ x: S.x(gx), y: S.y0 - 30, anchor: 'middle' }, { x: S.x(gx) + 20, y: S.y0 - 26, anchor: 'start' }, { x: S.x(gx) - 20, y: S.y0 - 26, anchor: 'end' }], { c: col, op: op });
    D.label('Y = ' + num(gy), [{ x: S.x0 + 24, y: S.y(gy) + 6, anchor: 'start' }, { x: S.x0 + 22, y: S.y(gy) - 22, anchor: 'start' }, { x: S.x0 + 22, y: S.y(gy) + 32, anchor: 'start' }], { c: col, op: op });
  }
  var f23 = {
    key: 'f23', num: '2.3', topic: 'The budget constraint', short: 'Budget line', model: M.budget, axes: AX, aspect: 0.8,
    question: 'Where does her budget line hit each axis?',
    setup: function (f) {
      var p = f.p;
      return 'Her income is <b>' + money(p.I) + '</b>. Good X costs ' + PX + ' = <b>' + money(p.Px) + '</b> and good Y costs ' + PY + ' = <b>' + money(p.Py) +
        '</b>. Her budget line is every bundle that costs exactly ' + money(p.I) + ': <b>' + eq(p.Px, p.Py, p.I) + '</b>.';
    },
    steps: [{ kind: 'drag', label: 'Both ends of the line',
      prompt: function (f) { return f.g.mx || f.g.my ? 'Good. Now drag the other end.' : 'Drag the two plum handles: one to where she spends it all on X, one to where she spends it all on Y.'; },
      check: function (f) { return f.g.mx && f.g.my; } }],
    initGuess: function () { return { x: M.budget.START, y: M.budget.START, mx: false, my: false }; },
    handles: function (f, S) {
      var p = f.p;
      if (f.predicting) return endHandles(f, S, f.g.x, f.g.y, function (f, X) { f.g.x = clamp(X, 1, f.dom.X); f.g.mx = true; }, function (f, Y) { f.g.y = clamp(Y, 1, f.dom.Y); f.g.my = true; }, PLUM, 0, true);
      if (!f.exploring) return [];
      var s = f.sol, D = f.dom.X, minP = function (I) { return Math.ceil(I / D * 4) / 4; };
      return [
        { x: s.xI, y: 0, c: C.ink, grip: 'h', active: true, hit: function (pt) { return Math.abs(pt.y - S.y0) < 30 ? Math.abs(pt.x - S.x(s.xI)) : 1e9; },
          set: function (f, X) { f.p.Px = clamp(Math.round(f.p.I / Math.max(X, 1) * 4) / 4, minP(f.p.I), 100); }, key: function (f, dx, dy) { f.p.Px = clamp(f.p.Px - 0.25 * (dx || dy), minP(f.p.I), 100); f.ex.touched = true; f.resolve(); } },
        { x: 0, y: s.yI, c: C.ink, grip: 'v', active: true, hit: function (pt) { return Math.abs(pt.x - S.x0) < 30 ? Math.abs(pt.y - S.y(s.yI)) : 1e9; },
          set: function (f, X, Y) { f.p.Py = clamp(Math.round(f.p.I / Math.max(Y, 1) * 4) / 4, minP(f.p.I), 100); }, key: function (f, dx, dy) { f.p.Py = clamp(f.p.Py - 0.25 * (dy || dx), minP(f.p.I), 100); f.ex.touched = true; f.resolve(); } }
      ];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g;
      if (f.predicting) {
        D.area([[0, 0], [g.x, 0], [0, g.y]], { fill: PLUM, fo: 0.07 });
        D.line(0, g.y, g.x, 0, { c: PLUM, w: 4.5 });
        endLabels(D, S, g.x, g.y, PLUM);
        return;
      }
      var ln = f.t('line'), en = f.t('ends'), ar = f.t('area'), sl = f.t('slope');
      var p0 = f.p0, moved = p.I !== p0.I || p.Px !== p0.Px || p.Py !== p0.Py;
      if (f.exploring && moved) {
        D.line(0, p0.I / p0.Py, p0.I / p0.Px, 0, { c: C.grey, w: 3.5, dash: '9 8' });
        segLabel(D, 'before', 0, p0.I / p0.Py, p0.I / p0.Px, 0, [0.82, 0.18, 0.6], { c: C.soft, size: S.ss, pref: 'below' });
      }
      if (ar > 0) D.area([[0, 0], [s.xI, 0], [0, s.yI]], { fill: BUD, fo: 0.13, op: ar });
      if (f.ghostOn()) {
        D.line(0, g.y, g.x, 0, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        D.ghost(g.x, 0, { op: f.gOp() }); D.ghost(0, g.y, { op: f.gOp() });
        youTag(f, D, g.x * 0.5, g.y * 0.5);
      }
      D.line(0, s.yI, s.xI, 0, { c: BUD, w: 5, pr: ln });
      if (ln > 0.9) segLabel(D, eq(p.Px, p.Py, p.I), 0, s.yI, s.xI, 0, [0.5, 0.35, 0.65, 0.22], { c: BUDT });
      if (en > 0) {
        if (!f.exploring) { D.dot(s.xI, 0, { c: C.ink, pr: en }); D.dot(0, s.yI, { c: C.ink, pr: en }); }
        D.label(num(p.I) + ' / ' + num(p.Px, 2) + ' = ' + num(s.xI, 2), [{ x: S.x(s.xI), y: S.y0 - 32, anchor: 'middle' }, { x: S.x(s.xI) + 22, y: S.y0 - 30, anchor: 'start' }, { x: S.x(s.xI) - 22, y: S.y0 - 30, anchor: 'end' }], { c: VAL, op: en, prio: 0 });
        D.label(num(p.I) + ' / ' + num(p.Py, 2) + ' = ' + num(s.yI, 2), [{ x: S.x0 + 26, y: S.y(s.yI) - 14, anchor: 'start' }, { x: S.x0 + 26, y: S.y(s.yI) + 30, anchor: 'start' }], { c: VAL, op: en, prio: 0 });
      }
      if (sl > 0) segLabel(D, 'slope -' + PXt + '/' + PYt + ' = ' + num(s.slope, 3), 0, s.yI, s.xI, 0, [0.62, 0.75, 0.45], { c: C.ink, op: sl, pref: 'below', size: S.ls });
      if (ar > 0.6) D.label('she can afford this', D.aroundP(S.x(s.xI * 0.27), S.y(s.yI * 0.27), 4), { c: BUDT, size: S.ss, op: ar });
    },
    reveal: function () { return [['ghost', 0, 400], ['ends', 300, 600], ['line', 500, 1000], ['area', 1500, 600], ['slope', 2000, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Ends on the X axis', num(g.x, 2), num(s.xI, 2)], ['Ends on the Y axis', num(g.y, 2), num(s.yI, 2)]],
        why: 'Spend all ' + money(p.I) + ' on X and she gets ' + num(p.I) + ' / ' + num(p.Px, 2) + ' = <b>' + num(s.xI, 2) + '</b> units; all on Y gets ' + num(p.I) + ' / ' + num(p.Py, 2) + ' = <b>' + num(s.yI, 2) +
          '</b>. The line between them has slope -' + PX + '/' + PY + ' = ' + num(s.slope, 3) + ': one more X costs her ' + num(s.opp, 3) + ' Y. Everything on or under the line is affordable.'
      };
    },
    explore: {
      hint: 'Drag an end of the line to change that good\'s price, or step her income. The dashed line is where you started.',
      controls: [{ kind: 'stepper', label: 'Income', get: function (f) { return f.p.I; }, set: function (f, v) { f.p.I = v; },
        step: 10, min: 40, max: 200, fmt: money }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        return '<b>' + eq(p.Px, p.Py, p.I) + '</b>. Ends at <b>' + num(s.xI, 2) + '</b> X and <b>' + num(s.yI, 2) + '</b> Y. Slope ' + num(s.slope, 3) + ': one more X costs ' + num(s.opp, 3) + ' Y.';
      }
    }
  };

  /* =====================================================================
     2.4  Shift or pivot: where does the new line go?
     ===================================================================== */
  function changeText(p, s) {
    var c = M.shift.CHANGES[p.type];
    if (c.what === 'I') return c.name.toLowerCase() + ' ' + p.m + '%, from ' + money(M.shift.I0) + ' to ' + money(s.I);
    if (c.what === 'Px') return c.name.toLowerCase() + ' ' + p.m + '%, from ' + money(M.shift.Px0) + ' to ' + money(s.Px);
    return c.name.toLowerCase() + ' ' + p.m + '%, from ' + money(M.shift.Py0) + ' to ' + money(s.Py);
  }
  var f24 = {
    key: 'f24', num: '2.4', topic: 'Income and price changes', short: 'Shift or pivot', model: M.shift, axes: AX, aspect: 0.8,
    film: { name: 'fig24-budget-shifts', label: 'Animation: shift or pivot', title: 'Watch first, 44 seconds',
      caption: 'An income change slides the budget line out without changing its slope. A price change swings it around the other good\'s intercept. Then try one yourself.' },
    question: function (f) { return M.shift.CHANGES[f.p.type].name + ' ' + f.p.m + '%. Where does her new budget line go?'; },
    setup: function (f) {
      var s = f.sol, t = changeText(f.p, s);
      return 'She starts with income $100, ' + PX + ' = $5 and ' + PY + ' = $4: the grey line, from 20 X to 25 Y. Now ' + t + '.';
    },
    steps: [{ kind: 'drag', label: 'The new line', prompt: 'Drag the plum handles to the ends of her new line. If an end does not move, leave it where it is.',
      check: function (f) { return f.g.mx || f.g.my; } }],
    initGuess: function () { return { x: 20, y: 25, mx: false, my: false }; },
    handles: function (f, S) {
      if (!f.predicting) return [];
      var hs = endHandles(f, S, f.g.x, f.g.y, function (f, X) { f.g.x = clamp(X, 1, f.dom.X); f.g.mx = true; }, function (f, Y) { f.g.y = clamp(Y, 1, f.dom.Y); f.g.my = true; }, PLUM, 0, true);
      hs.forEach(function (h) { h.active = !f.done[0]; });
      return hs;
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base();
      D.line(0, s.yI0, s.xI0, 0, { c: C.grey, w: 4, dash: '10 8', pr: b });
      if (b > 0.9) segLabel(D, 'before', 0, s.yI0, s.xI0, 0, [0.15, 0.85, 0.3], { c: C.soft, size: S.ls });
      if (f.predicting) {
        D.line(0, g.y, g.x, 0, { c: PLUM, w: 4.5 });
        endLabels(D, S, g.x, g.y, PLUM);
        return;
      }
      var mv = f.t('move'), ar = f.t('arrows'), kd = f.t('kind');
      if (f.ghostOn()) {
        D.line(0, g.y, g.x, 0, { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        D.ghost(g.x, 0, { op: f.gOp() }); D.ghost(0, g.y, { op: f.gOp() });
      }
      var xa = lerp(s.xI0, s.xI1, mv), ya = lerp(s.yI0, s.yI1, mv);
      D.line(0, ya, xa, 0, { c: BUD, w: 5 });
      if (mv > 0.95) segLabel(D, 'after', 0, ya, xa, 0, [0.5, 0.65, 0.35], { c: BUDT });
      D.dot(xa, 0, { c: C.ink, r: 8 }); D.dot(0, ya, { c: C.ink, r: 8 });
      if (ar > 0) {
        if (Math.abs(s.xI1 - s.xI0) > 0.3) D.arrowP(S.x(s.xI0), S.y0 - 16, S.x(lerp(s.xI0, s.xI1, ar)), S.y0 - 16, { c: C.gold, w: 4, reg: true });
        if (Math.abs(s.yI1 - s.yI0) > 0.3) D.arrowP(S.x0 + 16, S.y(s.yI0), S.x0 + 16, S.y(lerp(s.yI0, s.yI1, ar)), { c: C.gold, w: 4, reg: true });
        D.label(num(s.xI1, 2), [{ x: S.x(s.xI1), y: S.y0 - 32, anchor: 'middle' }, { x: S.x(s.xI1) + 16, y: S.y0 - 32, anchor: 'start' }, { x: S.x(s.xI1) - 16, y: S.y0 - 32, anchor: 'end' }], { c: VAL, op: ar, prio: 0 });
        D.label(num(s.yI1, 2), [{ x: S.x0 + 30, y: S.y(s.yI1) - 12, anchor: 'start' }, { x: S.x0 + 30, y: S.y(s.yI1) + 28, anchor: 'start' }], { c: VAL, op: ar, prio: 0 });
        if (s.fixed !== 'none') {
          var fx = s.fixed === 'x' ? S.x(s.xI0) : S.x0, fy = s.fixed === 'x' ? S.y0 : S.y(s.yI0);
          D.add('over', Kit.K.ring(fx, fy, { r: 15, c: C.gold, w: 3.5, fill: 'none', op: ar }));
          D.label('stays put', D.aroundP(fx, fy, 24).slice(s.fixed === 'x' ? 2 : 0), { c: C.tGold, op: ar, size: S.ls });
        }
      }
      if (kd > 0) {
        var msg = s.kind === 'shift' ? 'Parallel shift: slope stays ' + num(s.slope1, 3) : 'Pivot: slope ' + num(s.slope0, 3) + ' to ' + num(s.slope1, 3);
        D.label(msg, [{ x: S.x1 - 6, y: S.y1 + 8, anchor: 'end' }, { x: S.x1 - 6, y: S.y1 + 40, anchor: 'end' }], { c: C.ink, op: kd, size: S.ls });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['move', 350, 1300], ['arrows', 1500, 600], ['kind', 2000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, c = M.shift.CHANGES[p.type];
      var why = c.what === 'I'
        ? 'Prices did not change, so the slope -' + PX + '/' + PY + ' stays ' + num(s.slope1, 3) + ' and both ends move by the same ' + p.m + '%: ' + num(s.I) + ' / 5 = ' + num(s.xI1, 2) + ' and ' + num(s.I) + ' / 4 = ' + num(s.yI1, 2) + '. A parallel shift.'
        : c.what === 'Px'
          ? 'Only X got ' + (c.dir > 0 ? 'dearer' : 'cheaper') + ', so the Y end stays at 100 / 4 = 25: all-Y bundles cost the same. The X end moves to 100 / ' + num(s.Px, 2) + ' = ' + num(s.xI1, 2) + '. The line pivots around the Y end and the slope goes from -1.25 to ' + num(s.slope1, 3) + '.'
          : 'Only Y got ' + (c.dir > 0 ? 'dearer' : 'cheaper') + ', so the X end stays at 100 / 5 = 20. The Y end moves to 100 / ' + num(s.Py, 2) + ' = ' + num(s.yI1, 2) + '. The line pivots around the X end and the slope goes from -1.25 to ' + num(s.slope1, 3) + '.';
      return { rows: [['Ends on the X axis', num(g.x, 2), num(s.xI1, 2)], ['Ends on the Y axis', num(g.y, 2), num(s.yI1, 2)], ['Slope', num(-(g.x > 0 ? g.y / g.x : 0), 3), num(s.slope1, 3)]], why: why };
    },
    explore: {
      hint: 'Pick a change and its size. The quick test: did the slope change? Then a price moved.',
      controls: [
        { kind: 'seg', label: 'What changes', options: [['iu', 'Income up'], ['id', 'Income down'], ['xu', 'P_X up'], ['xd', 'P_X down'], ['yu', 'P_Y up'], ['yd', 'P_Y down']],
          get: function (f) { return f.p.type; }, set: function (f, v) { f.p.type = v; } },
        { kind: 'stepper', label: 'By', get: function (f) { return f.p.m; }, set: function (f, v) { f.p.m = v; }, step: 5, min: 5, max: 50, fmt: function (v) { return Math.round(v) + '%'; } }
      ],
      readout: function (f) {
        var s = f.sol;
        return (s.kind === 'shift' ? '<b>Parallel shift.</b> Both ends move, slope stays ' : '<b>Pivot</b> around the ' + (s.fixed === 'x' ? 'X' : 'Y') + ' end. Slope now ') +
          '<b>' + num(s.slope1, 3) + '</b>. Ends at <b>' + num(s.xI1, 2) + '</b> X and <b>' + num(s.yI1, 2) + '</b> Y.';
      }
    }
  };

  /* =====================================================================
     2.5  The consumer optimum (has a film)
     ===================================================================== */
  function budFn(p) { return function (x) { return (p.I - p.Px * x) / p.Py; }; }
  var LEVELS = [0.6, 0.82, 1.22, 1.5];
  var f25 = {
    key: 'f25', num: '2.5', topic: 'The consumer optimum', short: 'Consumer optimum', model: M.optimum, axes: AX, aspect: 0.8,
    film: { name: 'fig25-consumer-optimum', label: 'Animation: finding the best bundle', title: 'Watch first, 36 seconds',
      caption: 'She walks along her budget line, reaching higher indifference curves, until the curve just touches the line. Then find the best bundle yourself.' },
    question: 'Which bundle is her best choice?',
    setup: function (f) {
      var p = f.p;
      return 'Income <b>' + money(p.I) + '</b>, ' + PX + ' = <b>' + money(p.Px) + '</b>, ' + PY + ' = <b>' + money(p.Py) + '</b>, and U = ' + uCD(p.a) +
        '. The purple curves are a few of her indifference curves; further out is better.';
    },
    steps: [{ kind: 'place', key: 'pt', snap: 0.1, label: 'Her best bundle', prompt: 'Tap the best bundle she can afford. Drag it to fine-tune.',
      kstart: function (f) { return { x: f.sol.xI * 0.2, y: f.sol.yI * 0.8 }; } }],
    initGuess: function () { return { pt: null }; },
    handles: function (f) {
      if (!f.exploring) return [];
      var p = f.p, bl = budFn(p), x = clamp(f.ex.x, 0.02 * f.sol.xI, 0.98 * f.sol.xI);
      return [{ x: x, y: bl(x), c: C.ink, active: true, kstep: { x: f.sol.xI / 100, y: 0 },
        set: function (f, X, Y) { var nx = nearX(f.S, budFn(f.p), 0, f.sol.xI, X, Y); if (nx != null) f.ex.x = Math.round(nx * 10) / 10; },
        key: function (f, dx, dy) { f.ex.x = clamp(f.ex.x + 0.1 * (dx || dy), 0.02 * f.sol.xI, 0.98 * f.sol.xI); f.ex.touched = true; } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), bl = budFn(p), icAt = function (U) { return function (x) { return M.optimum.ic(p, U, x); }; };
      D.area([[0, 0], [s.xI, 0], [0, s.yI]], { fill: BUD, fo: 0.07, op: b });
      var U0 = M.optimum.solve(f.p0).U;
      LEVELS.forEach(function (k) { D.fn(icAt(U0 * k), 0.02, S.X, { c: ICF, w: 3, pr: b }); });
      D.line(0, s.yI, s.xI, 0, { c: BUD, w: 5, pr: b });
      if (b > 0.9) {
        segLabel(D, 'budget line: ' + eq(p.Px, p.Py, p.I), 0, s.yI, s.xI, 0, [0.1, 0.22, 0.75], { c: BUDT, pref: 'below' });
        D.curveLabel(S.narrow ? 'her ICs' : 'indifference curves', icAt(U0 * LEVELS[3]), [0.82, 0.7, 0.9, 0.6], { c: ICT });
      }
      if (f.predicting) return;
      var w = f.t('walk'), tan = f.t('tan'), dr = f.t('drops'), mr = f.t('mrs');
      if (f.ghostOn() && g.pt) { D.ghost(g.pt.x, g.pt.y, { op: f.gOp() }); youTag(f, D, g.pt.x, g.pt.y); }
      if (f.revealing && w > 0 && tan <= 0) {
        var wx = lerp(f.ws, s.xs, w), wy = bl(wx);
        D.fn(icAt(M.util.cdU(p.a, wx, wy)), 0.02, S.X, { c: IC, w: 3.5, op: 0.9 });
        D.dot(wx, wy, { c: C.ink, r: 9 });
      }
      if (tan > 0) {
        D.fn(icAt(s.U), 0.02, S.X, { c: IC, w: 5, pr: tan });
        D.dot(s.xs, s.ys, { c: C.ink, r: 10, pr: tan });
      }
      if (dr > 0) {
        D.drop(s.xs, s.ys, { pr: dr });
        D.xval(s.xs, 'X* = ' + num(s.xs, 2), { c: VAL, op: dr, anchor: 'start', dx: 8 });
        D.label('Y* = ' + num(s.ys, 2), [{ x: S.x0 + 10, y: S.y(s.ys) - 10, anchor: 'start' }, { x: S.x0 + 10, y: S.y(s.ys) + 26, anchor: 'start' }], { c: VAL, op: dr, prio: 0 });
      }
      if (mr > 0) D.near(s.xs, s.ys, 'MRS = ' + PXt + '/' + PYt + ' = ' + num(s.ratio, 3), { c: ICT, op: mr, d: 22 });
      if (f.exploring && f.ex.touched) {
        var x = f.ex.x, y = bl(x);
        D.fn(icAt(M.util.cdU(p.a, x, y)), 0.02, S.X, { c: IC, w: 3, op: 0.75, dash: '9 7' });
      }
    },
    reveal: function (f) {
      var s = f.sol, gx;
      if (f.g.pt && !f.skipped) {
        var n = G.nearest(f.g.pt.x, f.g.pt.y, [[0, s.yI], [s.xI, 0]], 1 / s.xI, 1 / s.yI); gx = n.x;
      } else gx = f.p.a >= 0.5 ? 0.12 * s.xI : 0.88 * s.xI;
      f.ws = clamp(gx, 0.08 * s.xI, 0.92 * s.xI);
      var long = Math.abs(f.ws - s.xs) > 0.03 * s.xI;
      return long ? [['ghost', 0, 400], ['walk', 300, 1800], ['tan', 2150, 700], ['drops', 2750, 500], ['mrs', 3150, 500]]
        : [['ghost', 0, 400], ['tan', 300, 800], ['drops', 1000, 500], ['mrs', 1400, 500]];
    },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, q = g.pt || { x: 0, y: 0 }, spend = p.Px * q.x + p.Py * q.y;
      var where = !g.pt ? '' : spend > p.I * 1.03 ? ' Your bundle costs ' + money(spend) + ', more than she has.' : spend < p.I * 0.97 ? ' Your bundle costs only ' + money(spend) + ', leaving money unspent.' : '';
      return {
        rows: [['X', num(q.x, 1), num(s.xs, 2)], ['Y', num(q.y, 1), num(s.ys, 2)], ['Cost', money(spend), money(p.I)]],
        why: 'The best bundle is where an indifference curve just touches the budget line: MRS = ' + PX + '/' + PY + ' = ' + num(s.ratio, 3) + '. With U = ' + uCD(p.a) + ' she spends ' + Math.round(p.a * 100) +
          '% of her income on X: X* = ' + num(p.a, 2) + ' x ' + num(p.I) + ' / ' + num(p.Px) + ' = <b>' + num(s.xs, 2) + '</b>, Y* = <b>' + num(s.ys, 2) + '</b>.' + where
      };
    },
    explore: {
      init: function (f) { f.ex.x = f.sol.xs; },
      hint: 'Drag the black bundle along the line: the dashed curve through it cuts the line unless MRS equals the price ratio. Or change ' + PX + '.',
      controls: [{ kind: 'stepper', label: 'P_X', get: function (f) { return f.p.Px; },
        set: function (f, v) { var old = f.p.I / f.p.Px; f.p.Px = v; f.ex.x = clamp(f.ex.x * (f.p.I / v) / old, 0, f.p.I / v); },
        step: 1, min: 1, max: 12, fmt: money, dur: 400 }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (s.xI > f.dom.X) return 'At ' + PX + ' = ' + money(p.Px) + ' the line runs off the graph. X* = <b>' + num(s.xs, 2) + '</b>, Y* = <b>' + num(s.ys, 2) + '</b>.';
        var x = f.ex.x, y = (p.I - p.Px * x) / p.Py, m = M.optimum.mrs(p, x, y);
        var near = Math.abs(x - s.xs) < 0.02 * s.xI;
        return 'Bundle ' + pt(x, y, 1) + ': MRS <b>' + num(m, 2) + '</b> vs price ratio <b>' + num(s.ratio, 3) + '</b>. ' +
          (near ? '<span class="good">Tangent: the best she can do.</span>' : m > s.ratio ? 'She values X more than it costs: buy more X.' : 'X is worth less to her than it costs: buy more Y.');
      }
    }
  };

  /* =====================================================================
     2.6  Marginal utility per dollar
     ===================================================================== */
  function barsPanel(D, S, v, vmax, op, tag) {
    var Wp = Math.min(S.narrow ? 230 : 290, (S.x1 - S.x0) * 0.66), xr = S.x1 - 4, xl = xr - Wp, y0 = S.y1 + 2, ls = S.narrow ? 15 : 17;
    D.L.rect(xl - 6, y0 - 18, Wp + 10, 104);
    var s = '';
    var ttl = 'Utility from $1 more' + (tag ? ', ' + tag : '');
    if (Kit.tw(ttl, ls) > Wp) ttl = 'Per extra $1' + (tag ? ', ' + tag : '');
    if (Kit.tw(ttl, ls) > Wp) ttl = tag || 'Per extra $1';
    s += Kit.K.text(xl, y0, ttl, { size: ls, c: C.soft, weight: 600, op: op });
    [['on X', v.rx, C.blue, C.tBlue], ['on Y', v.ry, C.green, C.tGreen]].forEach(function (r, i) {
      var y = y0 + 30 + i * 34, bx = xl + 46, bw = Wp - 46 - 62, len = Math.max(2, bw * clamp(r[1] / vmax, 0, 1));
      s += Kit.K.text(xl, y + 6, r[0], { size: ls, c: r[3], op: op });
      s += '<rect x="' + bx.toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="18" rx="4" fill="#e3e7e3"' + (op < 1 ? ' opacity="' + op.toFixed(2) + '"' : '') + '/>';
      s += '<rect x="' + bx.toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" width="' + len.toFixed(1) + '" height="18" rx="4" fill="' + r[2] + '"' + (op < 1 ? ' opacity="' + op.toFixed(2) + '"' : '') + '/>';
      s += Kit.K.text(xr, y + 6, num(r[1], 3), { size: ls, c: r[3], anchor: 'end', op: op });
    });
    D.add('over', s);
  }
  var f26 = {
    key: 'f26', num: '2.6', topic: 'Marginal utility per dollar', short: 'MU per dollar', model: M.mupd, axes: AX, aspect: 0.8,
    question: 'Which way should she move, and how far?',
    setup: function (f) {
      var p = f.p, s = f.sol, b0 = s.start;
      return 'Income <b>' + money(p.I) + '</b>, ' + PX + ' = ' + money(p.Px) + ', ' + PY + ' = ' + money(p.Py) + ', U = ' + uCD(p.a) + '. Right now she spends <b>' + money(p.s0) +
        ' on X</b>: bundle B. Her last dollar on X adds <b class="c-blue">' + num(b0.rx, 3) + '</b> utils, her last dollar on Y <b class="c-green">' + num(b0.ry, 3) + '</b>.';
    },
    steps: [{ kind: 'drag', label: 'Her best split', prompt: 'Slide the plum bundle along the budget line to where one more dollar buys the same extra utility on either good.',
      check: function (f) { return Math.abs(f.g.s - f.p.s0) >= 3 ? true : 'Slide it further: that is still bundle B.'; } }],
    initGuess: function (f) { return { s: f.p.s0 }; },
    kbdHint: 'Keyboard: left and right arrows move the bundle one dollar (Shift for five), Enter confirms.',
    handles: function (f) {
      var p = f.p, onLine = function (key, obj, col, step, act) {
        var sv = obj[key];
        return { x: sv / p.Px, y: (p.I - sv) / p.Py, c: col, step: step, active: act,
          set: function (f, X, Y) { var nx = nearX(f.S, budFn(f.p), 0, f.p.I / f.p.Px, X, Y); if (nx != null) obj[key] = clamp(Math.round(nx * f.p.Px), 2, f.p.I - 2); },
          key: function (f, dx, dy) { obj[key] = clamp(obj[key] + (dx || dy), 2, f.p.I - 2); if (f.exploring) f.ex.touched = true; } };
      };
      if (f.predicting) return [onLine('s', f.g, PLUM, 0, !f.done[0])];
      if (f.exploring) return [onLine('s', f.ex, C.ink, null, true)];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), at = M.mupd.at, icAt = function (U) { return function (x) { return M.util.cd(p.a, U, x); }; };
      var vmax = Math.max(s.start.rx, s.start.ry, s.star.rx) * 1.08;
      D.area([[0, 0], [s.xI, 0], [0, s.yI]], { fill: BUD, fo: 0.07, op: b });
      D.line(0, s.yI, s.xI, 0, { c: BUD, w: 5, pr: b });
      if (b > 0.9) segLabel(D, eq(p.Px, p.Py, p.I), 0, s.yI, s.xI, 0, [0.82, 0.7, 0.12], { c: BUDT, pref: 'below' });
      var B = s.start;
      D.dot(B.x, B.y, { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(B.x, B.y, 'B', { c: C.ink, size: S.fs, d: 18 });
      if (f.predicting) {
        barsPanel(D, S, B, vmax, 1, 'at B');
        var q = at(p, g.s);
        D.near(q.x, q.y, money(g.s) + ' on X', { c: PLUM, d: 22 });
        return;
      }
      var w = f.t('walk'), ic = f.t('ic'), dr = f.t('drops');
      if (f.ghostOn()) { var gq = at(p, g.s); D.ghost(gq.x, gq.y, { op: f.gOp() }); youTag(f, D, gq.x, gq.y); }
      if (f.revealing) {
        var ws = lerp(p.s0, s.ss, w), wq = at(p, ws);
        if (ic <= 0) D.dot(wq.x, wq.y, { c: C.ink, r: 9 });
        barsPanel(D, S, wq, vmax, 1, money(Math.round(ws)) + ' on X');
      }
      if (ic > 0) {
        D.fn(icAt(s.star.U), 0.02, S.X, { c: IC, w: 5, pr: ic });
        D.dot(s.xs, s.ys, { c: C.ink, r: 10, pr: ic });
      }
      if (dr > 0) {
        D.drop(s.xs, s.ys, { pr: dr });
        D.xval(s.xs, 'X* = ' + num(s.xs, 2), { c: VAL, op: dr, anchor: 'start', dx: 8 });
        D.near(s.xs, s.ys, money(s.ss) + ' on X', { c: VAL, op: dr, d: 20 });
      }
      if (f.exploring) {
        var e = at(p, f.ex.s);
        barsPanel(D, S, e, vmax, 1, money(Math.round(f.ex.s)) + ' on X');
        if (f.ex.touched) D.fn(icAt(e.U), 0.02, S.X, { c: IC, w: 3, op: 0.75, dash: '9 7' });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['walk', 300, 2000], ['ic', 2400, 700], ['drops', 3000, 500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, b0 = s.start, more = b0.rx > b0.ry ? 'X' : 'Y';
      var dirOK = Math.sign(g.s - p.s0) === s.dir;
      return {
        rows: [['Dollars on X', money(g.s), money(s.ss)], ['Direction', g.s > p.s0 ? 'more X' : 'more Y', s.dir > 0 ? 'more X' : 'more Y'], ['Utility per $', '', num(s.star.rx, 3) + ' each']],
        why: 'At B a dollar on ' + more + ' buys more utility (' + num(Math.max(b0.rx, b0.ry), 3) + ' vs ' + num(Math.min(b0.rx, b0.ry), 3) + '), so moving dollars to ' + more + ' raises utility. ' +
          'As she does, that good\'s marginal utility falls and the other\'s rises, until MU<sub>X</sub>/' + PX + ' = MU<sub>Y</sub>/' + PY + ' = ' + num(s.star.rx, 3) +
          ' at <b>' + money(s.ss) + ' on X</b>, X* = ' + num(s.xs, 2) + '. That is the tangency again, MRS = ' + PX + '/' + PY + ', written per dollar.' + (dirOK || f.skipped ? '' : ' You moved the other way.')
      };
    },
    explore: {
      init: function (f) { f.ex.s = f.sol.ss; },
      hint: 'Drag the black bundle: the bars show the last dollar\'s worth on each good. Or change ' + PX + '.',
      controls: [{ kind: 'stepper', label: 'P_X', get: function (f) { return f.p.Px; },
        set: function (f, v) { f.p.Px = v; }, step: 1, min: 1, max: 10, fmt: money, dur: 400 }],
      readout: function (f) {
        var p = f.p, s = f.sol, e = M.mupd.at(p, f.ex.s), eqd = Math.abs(f.ex.s - s.ss) < 1.5;
        if (s.xI > f.dom.X * 1.02) return 'At ' + PX + ' = ' + money(p.Px) + ' the line runs off the graph. Best split: <b>' + money(s.ss) + '</b> on X.';
        return 'With ' + money(f.ex.s) + ' on X: <b class="c-blue">' + num(e.rx, 3) + '</b> vs <b class="c-green">' + num(e.ry, 3) + '</b> per dollar. ' +
          (eqd ? '<span class="good">Equal: the best split.</span>' : e.rx > e.ry ? 'Move dollars to X.' : 'Move dollars to Y.') + ' Best: <b>' + money(s.ss) + '</b> on X, always ' + Math.round(p.a * 100) + '% of income.';
      }
    }
  };

  /* =====================================================================
     2.8  MRS along the curve
     ===================================================================== */
  function mrsWords(m) { return m === 1 ? 'one Y for one X' : m === 2 ? 'two Y for one X' : 'half a Y for one X'; }
  function tanPts(x, y, m, L) { return [x - L, y + L * m, x + L, y - L * m]; }
  function snapM(m) { return m < 1 ? Math.round(m * 20) / 20 : m < 4 ? Math.round(m * 10) / 10 : Math.round(m * 4) / 4; }
  function triangle(D, S, x, y, m, op, col) {
    var dx = m < 1 ? 2 : 1, dy = dx * m;
    D.line(x, y, x + dx, y, { c: C.green, w: 3.5, op: op, layer: 'over' });
    D.line(x + dx, y, x + dx, y - dy, { c: C.red, w: 3.5, op: op, layer: 'over' });
    D.label('+' + dx + ' X', [{ x: S.x(x + dx / 2), y: S.y(y) - 10, anchor: 'middle' }, { x: S.x(x + dx / 2), y: S.y(y) + 24, anchor: 'middle' }], { c: C.tGreen, op: op, size: S.ss });
    D.label('-' + num(dy, 2) + ' Y', [{ x: S.x(x + dx) + 10, y: S.y(y - dy / 2) + 6, anchor: 'start' }, { x: S.x(x + dx) - 10, y: S.y(y - dy / 2) + 6, anchor: 'end' }], { c: C.tRed, op: op, size: S.ss });
  }
  var f28 = {
    key: 'f28', num: '2.8', topic: 'The marginal rate of substitution', short: 'MRS along the curve', model: M.mrs, axes: AX, aspect: 0.8,
    question: function (f) { return 'How steep is the curve at P, and where would she trade ' + mrsWords(f.p.m) + '?'; },
    setup: function (f) {
      var p = f.p;
      return 'Her tastes: U = ' + uCD(p.a) + '. The purple curve is every bundle with U = ' + p.U + '. The MRS is how many Y she would give up for one more X: the steepness of the curve.';
    },
    steps: [
      { kind: 'drag', label: 'The tangent at P', prompt: 'Turn the plum line by its handle until it just touches the curve at P.',
        check: function (f) { return f.g.mm; } },
      { kind: 'drag', label: function (f) { return 'Where the MRS is ' + num(f.p.m, 2); }, prompt: function (f) { return 'Slide the plum point Q along the curve to where she would trade ' + mrsWords(f.p.m) + ' (MRS = ' + num(f.p.m, 2) + ').'; },
        check: function (f) { return f.g.qm; } }
    ],
    kbdHint: 'Keyboard: up and down arrows turn the line, Enter confirms. Then left and right slide Q, Enter confirms.',
    initGuess: function (f) {
      var s = f.sol, p = f.p, q0 = s.xt > 9 ? xTop(function (x) { return M.mrs.y(p, x); }, 17, 0.2, 20) : 16;
      return { m: 1, mm: false, q: q0, qm: false };
    },
    tanHandle: function (f, S, x0, y0, m, col, step, act) {
      var sx = (S.x1 - S.x0) / S.X, sy = (S.y0 - S.y1) / S.Y, R = S.narrow ? 86 : 118;
      var ux = sx, uy = m * sy, L = Math.hypot(ux, uy); ux /= L; uy /= L;
      var hx = S.x(x0) + R * ux, hy = S.y(y0) + R * uy;
      if (hx > S.x1 - 8 || hy > S.y0 - 8) { hx = S.x(x0) - R * ux; hy = S.y(y0) - R * uy; }
      return { px: [hx, hy], c: col, grip: 'r', step: step, active: act,
        set: function (f, X, Y) { var dX = X - x0, dY = Y - y0; var mm = Math.abs(dX) < 1e-6 ? 40 : Math.abs(dY / dX); f.g.m = snapM(clamp(mm, 0.05, 40)); f.g.mm = true; },
        key: function (f, dx, dy) { f.g.m = snapM(clamp(f.g.m * Math.pow(1.06, (dy || -dx)), 0.05, 40)); f.g.mm = true; } };
    },
    handles: function (f, S) {
      var p = f.p, s = f.sol, g = f.g, yf = function (x) { return M.mrs.y(p, x); }, xmin = xTop(yf, S.Y, 0.05, S.X);
      if (f.predicting) {
        var hs = [f28.tanHandle(f, S, p.x0, s.y0, g.m, PLUM, 0, f.cur === 0)];
        if (f.cur >= 1 || f.done[1]) hs.push({ x: g.q, y: yf(g.q), step: 1, active: f.cur === 1,
          set: function (f, X, Y) { var nx = nearX(S, yf, xmin, S.X, X, Y); if (nx != null) { f.g.q = Math.round(nx * 20) / 20; f.g.qm = true; } },
          key: function (f, dx, dy) { f.g.q = clamp(Math.round((f.g.q + 0.1 * (dx || dy)) * 20) / 20, xmin, S.X); f.g.qm = true; } });
        return hs;
      }
      if (f.exploring) return [{ x: f.ex.x, y: yf(f.ex.x), c: C.ink, active: true,
        set: function (f, X, Y) { var nx = nearX(S, yf, xmin, S.X, X, Y); if (nx != null) f.ex.x = Math.round(nx * 20) / 20; },
        key: function (f, dx, dy) { f.ex.x = clamp(f.ex.x + 0.1 * (dx || dy), xmin, S.X); f.ex.touched = true; } }];
      return [];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), yf = function (x) { return M.mrs.y(p, x); };
      D.fn(yf, 0.02, S.X, { c: IC, w: 5, pr: b });
      if (b > 0.9) D.curveLabel('U = ' + p.U, yf, [0.86, 0.78, 0.94, 0.66], { c: ICT });
      if (!f.exploring) {
        D.dot(p.x0, s.y0, { c: C.ink, r: 9, pr: b });
        if (b > 0.5) D.label('P', D.around(p.x0, s.y0, 18).slice(1).concat(D.around(p.x0, s.y0, 18).slice(0, 1)), { c: C.ink, size: S.fs });
      }
      if (f.predicting) {
        var t = tanPts(p.x0, s.y0, g.m, 40);
        D.line(t[0], t[1], t[2], t[3], { c: PLUM, w: 4 });
        var h = f28.tanHandle(f, S, p.x0, s.y0, g.m, PLUM);
        D.label('slope -' + num(g.m, 2), D.aroundP(h.px[0], h.px[1], 24), { c: PLUM });
        if (f.cur >= 1 || f.done[1]) D.label('Q', D.around(g.q, yf(g.q), 22), { c: PLUM, size: S.fs });
        return;
      }
      var tn = f.t('tan'), tr = f.t('tri'), sl = f.t('slide');
      if (f.ghostOn()) {
        var gt = tanPts(p.x0, s.y0, g.m, 40);
        D.line(gt[0], gt[1], gt[2], gt[3], { c: PLUM, w: 3, dash: '4 7', op: 0.6 * f.gOp(), reg: false });
        if (g.qm) { D.ghost(g.q, yf(g.q), { op: f.gOp() }); youTag(f, D, g.q, yf(g.q), 'your Q'); }
      }
      if (f.revealing || (f.exploring && !f.ex.touched)) {
        if (tn > 0) {
          var L = 40 * tn, a = tanPts(p.x0, s.y0, s.mrs0, L);
          D.line(a[0], a[1], a[2], a[3], { c: C.gold, w: 4.5 });
        }
        if (tr > 0) {
          triangle(D, S, p.x0, s.y0, s.mrs0, tr);
          D.label('MRS = ' + num(s.mrs0, 2), D.around(p.x0, s.y0, 26).slice(1, 2).concat(D.around(p.x0, s.y0, 26)), { c: C.tGold, op: tr });
        }
        if (sl > 0) {
          var xs = Math.exp(lerp(Math.log(p.x0), Math.log(s.xt), sl)), ys = yf(xs), ms = M.mrs.at(p, xs), at = tanPts(xs, ys, ms, 40);
          D.line(at[0], at[1], at[2], at[3], { c: C.gold, w: 3, op: 0.8 });
          D.dot(xs, ys, { c: C.ink, r: 9 });
          D.near(xs, ys, 'MRS = ' + num(ms, 2), { c: C.tGold, d: 22 });
        }
      }
      if (f.exploring && f.ex.touched) {
        var x = f.ex.x, y = yf(x), m = M.mrs.at(p, x), e = tanPts(x, y, m, 40);
        D.line(e[0], e[1], e[2], e[3], { c: C.gold, w: 4 });
        triangle(D, S, x, y, m, 1);
        D.near(x, y, 'MRS = ' + num(m, 2), { c: C.tGold, d: 24 });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['tan', 300, 900], ['tri', 1150, 600], ['slide', 1900, 1500]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g;
      return {
        rows: [['Slope at P', '-' + num(g.m, 2), '-' + num(s.mrs0, 2)], ['X where MRS = ' + num(p.m, 2), num(g.q, 2), num(s.xt, 2)]],
        why: 'For U = ' + uCD(p.a) + ' the MRS is MU<sub>X</sub>/MU<sub>Y</sub> = (' + num(p.a, 2) + '/' + num(1 - p.a, 2) + ') x Y/X. At P that is <b>' + num(s.mrs0, 2) + '</b>: she would give up ' + num(s.mrs0, 2) +
          ' Y for one more X, so the tangent has slope -' + num(s.mrs0, 2) + '. Moving right, X gets plentiful and Y scarce, so the MRS falls: it reaches ' + num(p.m, 2) + ' at X = <b>' + num(s.xt, 2) + '</b>, Y = ' + num(s.yt, 2) + '.'
      };
    },
    explore: {
      init: function (f) { f.ex.x = f.p.x0; },
      hint: 'Drag the black point along the curve and watch the tangent flatten. Or change her taste for X.',
      controls: [{ kind: 'stepper', label: 'Taste for X, a', get: function (f) { return f.p.a; }, set: function (f, v) { f.p.a = v; }, step: 0.1, min: 0.3, max: 0.7, fmt: function (v) { return num(v, 2); }, dur: 400 }],
      readout: function (f) {
        var p = f.p, x = f.ex.x, y = M.mrs.y(p, x), m = M.mrs.at(p, x);
        return 'At ' + pt(x, y, 2) + ' the MRS is <b>' + num(m, 2) + '</b>: she would give up ' + num(m, 2) + ' Y for one more X. ' + (m > 1 ? 'Steep: Y is plentiful here.' : m < 1 ? 'Flat: Y is scarce here.' : 'One for one.');
      }
    }
  };

  /* =====================================================================
     2.9  Why indifference curves cannot cross
     ===================================================================== */
  var f29 = {
    key: 'f29', num: '2.9', topic: 'Indifference curves cannot cross', short: 'ICs cannot cross', model: M.cross, axes: AX, aspect: 0.8,
    question: 'Draw her indifference curve through B.',
    setup: function (f) {
      var p = f.p;
      return 'One consumer, one set of tastes: U = ' + uCD(p.a) + '. The purple curve is her indifference curve through bundle A ' + pt(p.xA, p.yA) + '. B ' + pt(p.xB, p.yB) + ' is another bundle.';
    },
    steps: [{ kind: 'draw', key: 'curve', bins: 48, label: 'Her curve through B', prompt: 'Draw it with your finger or mouse, through B, across the graph.',
      kstart: function (f, x) { return f.p.yB - (x - f.p.xB); },
      check: function (f) { var sp = M.cross.span(f.p, f.sol.UB); return f.coverage('curve', sp[0], sp[1]) >= 0.45 ? true : 'Keep going: draw across more of the graph.'; } }],
    kbdHint: 'Keyboard: arrow keys raise or lower a straight line through the graph, Enter accepts it.',
    initGuess: function () { return {}; },
    scoreInput: function (f) { return { drawn: f.drawn('curve') }; },
    handles: function (f) {
      if (!f.exploring) return [];
      return [{ x: f.p.xB, y: f.p.yB, c: C.ink, snap: 0.5, active: true, set: function (f, X, Y) { f.p.xB = clamp(X, 0.5, 15.5); f.p.yB = clamp(Y, 0.5, 15.5); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, b = f.base(), fA = function (x) { return M.cross.y(p, s.UA, x); }, fB = function (x) { return M.cross.y(p, s.UB, x); };
      D.fn(fA, 0.02, S.X, { c: IC, w: 5, pr: b });
      if (b > 0.9) D.curveLabel('her IC through A', fA, [0.85, 0.75, 0.93, 0.6], { c: ICT });
      D.drawing('curve');
      var tr = f.t('truth'), co = f.t('contra');
      if (tr > 0) {
        D.fn(fB, 0.02, S.X, { c: IC, w: 5, pr: tr });
        if (tr > 0.9) D.curveLabel(f.exploring && f.ex.touched ? 'her IC through B' : 'her real IC through B', fB, [0.7, 0.8, 0.6, 0.9], { c: ICT, pref: s.higher ? 'aboveOnly' : 'below' });
      }
      if (co > 0 && f.result && f.result.crossed && f.ghostOn()) {
        var xs = M.cross.crossings(p, f.drawn('curve'));
        xs.slice(0, 2).forEach(function (c, i) {
          D.add('over', Kit.K.ring(S.x(c.x), S.y(c.y), { r: 14 * Kit.easeOut(co), c: C.red, w: 4, fill: 'none' }));
          if (i === 0) D.near(c.x, c.y, 'your curve meets A\'s here', { c: C.tRed, op: co, d: 22 });
        });
      }
      D.dot(p.xA, p.yA, { c: C.ink, r: 9, pr: b }); if (b > 0.5) D.near(p.xA, p.yA, 'A', { c: C.ink, size: S.fs });
      if (!f.exploring) D.dot(p.xB, p.yB, { c: C.ink, r: 9, pr: b });
      if (b > 0.5) D.near(p.xB, p.yB, 'B', { c: C.ink, size: S.fs });
    },
    reveal: function () { return [['ghost', 0, 400], ['truth', 300, 1200], ['contra', 1600, 700]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, r = f.result || {};
      var rel = s.higher ? 'higher' : 'lower', hint = s.higher ? 'better' : 'worse';
      var rows = [['Crosses A\'s curve', r.crossed == null ? '' : r.crossed ? 'yes' : 'no', 'never'], ['Utility at B', '', num(s.UB, 2) + ' vs ' + num(s.UA, 2) + ' at A']];
      if (r.err != null) rows.unshift(['Typical miss', num(r.err * 16, 1) + ' units', 'on the curve']);
      var why = 'B gives U = ' + num(s.UB, 2) + ' and A gives ' + num(s.UA, 2) + ', so B\'s curve is a ' + rel + ' one, and every bundle on it is ' + hint + ' than every bundle on A\'s. Two curves of one person can never meet: ' +
        'if they crossed at a bundle C, she would like C as much as A and as much as B, so A ~ B by transitivity. But one curve lies above the other, and more of both goods is better. Contradiction.';
      if (r.crossed) why = 'Your curve crosses A\'s, and that is impossible. ' + why;
      return { rows: rows, why: why };
    },
    explore: {
      hint: 'Drag B anywhere. Its curve slides in or out but never touches A\'s. Change her tastes and both curves bend together.',
      controls: [{ kind: 'stepper', label: 'Taste for X, a', get: function (f) { return f.p.a; }, set: function (f, v) { f.p.a = v; }, step: 0.1, min: 0.3, max: 0.7, fmt: function (v) { return num(v, 2); }, dur: 400 }],
      readout: function (f) {
        var s = f.sol, same = Math.abs(s.UB - s.UA) < 1e-6;
        if (same) return 'B is on A\'s curve: one curve, U = <b>' + num(s.UA, 2) + '</b>.';
        return 'B: U = <b>' + num(s.UB, 2) + '</b>. A: U = <b>' + num(s.UA, 2) + '</b>. ' + (s.higher ? 'B\'s curve lies wholly above A\'s.' : 'B\'s curve lies wholly below A\'s.');
      }
    }
  };

  /* =====================================================================
     2.10  Corner solutions with perfect substitutes
     ===================================================================== */
  var f210 = {
    key: 'f210', num: '2.10', topic: 'Corner solutions', short: 'Corner solutions', model: M.corner, axes: AX, aspect: 0.8,
    question: 'Which bundle does she buy?',
    setup: function (f) {
      var p = f.p, dflt = p.I === 80 && p.Px === 6 && p.Py === 4 && p.a === 3 && p.b === 3;
      return 'To her X and Y are <b>perfect substitutes</b>: U = ' + p.a + 'X + ' + p.b + 'Y, so MU<sub>X</sub> = ' + p.a + ' and MU<sub>Y</sub> = ' + p.b + '. Income <b>' + money(p.I) + '</b>, ' +
        PY + ' = <b>' + money(p.Py) + '</b>, ' + PX + (dflt ? ' has just risen from $4 to <b>$6</b>' : ' = <b>' + money(p.Px) + '</b>') + '. The faint lines are her indifference curves.';
    },
    steps: [{ kind: 'place', key: 'pt', snap: 0.1, label: 'Her best bundle', prompt: 'Tap the bundle she buys. Drag it to fine-tune.',
      kstart: function (f) { return { x: f.sol.xI * 0.5, y: f.sol.yI * 0.5 }; } }],
    initGuess: function () { return { pt: null }; },
    handles: function (f, S) {
      if (!f.exploring) return [];
      var p = f.p, s = f.sol, minP = Math.ceil(p.I / S.X * 2) / 2;
      return [{ x: s.xI, y: 0, c: C.ink, grip: 'h', active: true, hit: function (pt) { return Math.abs(pt.y - S.y0) < 30 ? Math.abs(pt.x - S.x(s.xI)) : 1e9; },
        set: function (f, X) { f.p.Px = clamp(Math.round(p.I / Math.max(X, 1) * 2) / 2, minP, 40); },
        key: function (f, dx, dy) { f.p.Px = clamp(f.p.Px - 0.5 * (dx || dy), minP, 40); f.ex.touched = true; f.resolve(); } }];
    },
    render: function (f, S, D) {
      var p = f.p, s = f.sol, g = f.g, b = f.base(), Uref = Math.max(p.a * s.xI, p.b * s.yI);
      D.area([[0, 0], [s.xI, 0], [0, s.yI]], { fill: BUD, fo: 0.07, op: b });
      [0.3, 0.55, 0.8, 1.15].forEach(function (k) { D.line(0, Uref * k / p.b, Uref * k / p.a, 0, { c: ICF, w: 3, pr: b }); });
      D.line(0, s.yI, s.xI, 0, { c: BUD, w: 5, pr: b });
      if (b > 0.9) {
        segLabel(D, 'budget line: ' + eq(p.Px, p.Py, p.I), 0, s.yI, s.xI, 0, [0.5, 0.35, 0.65], { c: BUDT, pref: 'below' });
        segLabel(D, S.narrow ? 'her ICs' : 'indifference curves', 0, Uref * 1.15 / p.b, Uref * 1.15 / p.a, 0, [0.62, 0.5, 0.75, 0.3], { c: ICT });
      }
      if (f.predicting) return;
      var sw = f.t('sweep'), ld = f.t('land'), rt = f.t('ratio');
      if (f.ghostOn() && g.pt) { D.ghost(g.pt.x, g.pt.y, { op: f.gOp() }); youTag(f, D, g.pt.x, g.pt.y); }
      if (s.knife) {
        D.line(0, s.yI, s.xI, 0, { c: IC, w: 9, op: 0.55 });
        segLabel(D, 'every bundle here is best', 0, s.yI, s.xI, 0, [0.55, 0.4], { c: ICT, size: S.ls });
      } else {
        var U = f.exploring ? s.U : lerp(0.15 * s.U, s.U, sw);
        if (sw > 0 || f.exploring) D.line(0, U / p.b, U / p.a, 0, { c: IC, w: 5 });
        if (ld > 0 || f.exploring) {
          D.dot(s.xs, s.ys, { c: C.ink, r: 10, pr: f.exploring ? 1 : ld });
          D.near(s.xs, s.ys, s.side === 'x' ? 'all X: ' + pt(s.xs, 0, 2) : 'all Y: ' + pt(0, s.ys, 2), { c: VAL, op: f.exploring ? 1 : ld, d: 24 });
        }
      }
      if (rt > 0) {
        var wx = s.rX > s.rY, ls = S.ls;
        D.label('MU_X/P_X = ' + p.a + '/' + num(p.Px, 2) + ' = ' + num(s.rX, 3), [{ x: S.x1 - 4, y: S.y1 + 22, anchor: 'end' }], { c: C.tBlue, op: rt, size: ls, weight: wx ? 800 : 500, prio: 0, fixed: true });
        D.label('MU_Y/P_Y = ' + p.b + '/' + num(p.Py, 2) + ' = ' + num(s.rY, 3), [{ x: S.x1 - 4, y: S.y1 + 50, anchor: 'end' }], { c: C.tGreen, op: rt, size: ls, weight: wx ? 500 : 800, prio: 0, fixed: true });
      }
    },
    reveal: function () { return [['ghost', 0, 400], ['sweep', 300, 1700], ['land', 2000, 450], ['ratio', 2350, 600]]; },
    verdict: function (f) {
      var p = f.p, s = f.sol, g = f.g, q = g.pt || { x: 0, y: 0 }, good = s.side === 'x' ? 'X' : 'Y';
      return {
        rows: [['X', num(q.x, 1), num(s.xs, 2)], ['Y', num(q.y, 1), num(s.ys, 2)], ['Utility', num(p.a * q.x + p.b * q.y, 1), num(s.U, 2)]],
        why: 'A dollar on X buys ' + p.a + '/' + num(p.Px, 2) + ' = ' + num(s.rX, 3) + ' utils, a dollar on Y ' + p.b + '/' + num(p.Py, 2) + ' = ' + num(s.rY, 3) + '. ' + good + ' wins every time, so every dollar goes to ' + good +
          ': the corner ' + pt(s.xs, s.ys, 2) + '. Her straight indifference curves are ' + (s.mrs > s.ratio ? 'steeper' : 'flatter') + ' than the budget line (MRS ' + num(s.mrs, 2) + ' vs ' + PX + '/' + PY + ' = ' + num(s.ratio, 3) +
          '), so no tangency exists. Note it is not always the cheaper good: it is the one with more utility per dollar.'
      };
    },
    explore: {
      hint: 'Drag the X end of the budget line to change ' + PX + ', or change MU<sub>X</sub>. Watch the corner flip, and find the knife edge.',
      controls: [{ kind: 'stepper', label: 'MU_X', get: function (f) { return f.p.a; }, set: function (f, v, fin) { f.p.a = fin ? v : Math.round(v); }, step: 1, min: 1, max: 6, fmt: function (v) { return num(v); } }],
      readout: function (f) {
        var p = f.p, s = f.sol;
        if (s.knife) return 'MU<sub>X</sub>/' + PX + ' = MU<sub>Y</sub>/' + PY + ' = <b>' + num(s.rX, 3) + '</b>. <span class="good">The knife edge: every bundle on the line is equally good.</span>';
        return 'Per dollar: X <b class="c-blue">' + num(s.rX, 3) + '</b>, Y <b class="c-green">' + num(s.rY, 3) + '</b>. All ' + money(p.I) + ' goes to <b>' + (s.side === 'x' ? 'X' : 'Y') + '</b>.';
      }
    }
  };

  window.W2FIGS = [f21, f23, f24, f25, f26, f28, f29, f210];
})();
