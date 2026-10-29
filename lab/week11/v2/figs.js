/* figs.js: the five Week 11 figures, built on kit.js.
 * Models and defaults follow week11-viz.html and the Week 11 textbook:
 *   11.1  MB = 100 - Q, PMC = 10 + Q, MEC $20  ->  Q_E 45, Q* 35, DWL $100, t* $20
 *   11.2  MAC_A = 2e_A, MAC_B = 8e_B, total abatement 100 -> e_A 80, e_B 20, price $160,
 *         $8,000 vs $12,500 under equal shares (saving $4,500, 36%)
 *   11.3  MB = 100 - Q, MC = 10 + Q, MEB $20 -> Q_E 45, Q* 55, DWL $100, s* $20
 *   11.4  three neighbours, $300 cost per streetlight; first-light values 140 + 120 + 100 = $360
 *         (the site's N = 3 at $120 average); each MB falls $10 per extra light
 *   11.5  MB = 100 - 2S, MD = 2S -> S* 25, MB = MD = $50
 */
(function () {
  'use strict';
  var C = TK.C, money = TK.money, num = TK.num;

  function b(cls, txt) { return '<b class="' + cls + '">' + txt + '</b>'; }
  function q(v) { return num(v, 1); }

  function mount(id, cfg) {
    var sec = document.getElementById(id);
    var host = sec.querySelector('.plot-host');
    cfg.caption = sec.querySelector('.caption');
    var init = JSON.stringify(cfg.state);
    var plot = new TK.Plot(host, cfg);
    var reset = sec.querySelector('.reset');
    if (reset) reset.addEventListener('click', function () {
      var fresh = JSON.parse(init);
      for (var k in fresh) plot.state[k] = fresh[k];
      plot.toast = null;
      plot.handles.forEach(function (h) { h._snapped = null; });
      plot.update();
    });
    return plot;
  }

  /* ===================================================== Fig 11.1 Pigou */
  window.F111 = mount('f111', {
    ariaLabel: 'Negative externality and the Pigouvian tax. Demand MB = 100 minus Q, private cost PMC = 10 plus Q, social cost SMC adds the harm to others.',
    state: { mec: 20, q: 45 },
    x: [0, 100], y: [0, 125],
    xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 20, 40, 60, 80, 100, 120],
    yFmt: function (v) { return '$' + v; },
    yTitle: '$ per unit', xTitle: 'Quantity',
    beckon: 'wedge',
    handles: [
      { key: 'wedge', name: 'Market point. Drag it up the demand curve to open a tax wedge', color: C.gold,
        min: 10, max: 45, step: 1,
        get: function (s) { return s.q; }, set: function (s, v) { s.q = v; },
        at: function (v) { return [v, 100 - v]; },
        snaps: function (s) {
          var Qs = (90 - s.mec) / 2;
          return [{ v: 45, label: 'Snapped: no tax, the market makes 45' },
                  { v: Qs, label: 'Snapped: tax = harm, Q* = ' + q(Qs) }];
        },
        valueText: function (v) { return 'Quantity ' + v + ', tax $' + (90 - 2 * v); } },
      { key: 'mec', name: 'Harm to others per unit. Drag the social cost curve up or down', color: C.red,
        min: 0, max: 34, step: 2,
        get: function (s) { return s.mec; }, set: function (s, v) { s.mec = v; },
        at: function (v) { return [75, 85 + v]; },
        snaps: function () { return [{ v: 20, label: 'Snapped: $20 harm, the textbook case' }]; },
        valueText: function (v) { return 'Harm $' + v + ' per unit'; } }
    ],
    render: function (p, s) {
      var Q = s.q, t = 90 - 2 * Q, mec = s.mec, Qs = (90 - mec) / 2;
      var MB = function (x) { return 100 - x; }, PMC = function (x) { return 10 + x; }, SMC = function (x) { return 10 + x + mec; };
      var qa = Math.min(Q, Qs), dwl = (Q - Qs) * (Q - Qs), ss = (90 - mec) * Q - Q * Q;
      // areas
      p.poly([[0, 100], [qa, MB(qa)], [qa, SMC(qa)], [0, SMC(0)]], { fill: C.fGreen });
      if (dwl > 0) p.poly([[Q, MB(Q)], [Q, SMC(Q)], [Qs, MB(Qs)]], { fill: C.fRed, stroke: C.red, sw: 2 });
      // curves
      p.line(0, 100, 100, 0, { color: C.blue });
      p.line(0, 10, 100, 110, { color: C.orange });
      var taxIsHarm = t === mec && t > 0;
      if (mec > 0) p.line(0, 10 + mec, 115 - mec, 125, { color: C.red, dash: taxIsHarm ? null : '11 8' });
      if (t > 0 && !taxIsHarm) p.line(0, 10 + t, 115 - t, 125, { color: C.gold, w: 3.5, dash: '3 7' });
      if (mec > 0) p.bracket(75, 85, 85 + mec, C.red, 3);
      // the wedge and the market quantity
      p.line(Q, 0, Q, PMC(Q), { color: C.soft, w: 2, dash: '4 6', obstacle: true });
      if (t > 0) p.line(Q, PMC(Q), Q, MB(Q), { color: C.gold, w: 10, cap: 'butt', noclip: true });
      if (t > 0) p.dot(Q, PMC(Q), C.gold, 6);
      // detents (snap targets) on the demand curve
      var h = p.handles[0];
      h.snaps(s).forEach(function (sn) { if (sn.v !== Q) { var d = p.pathPx(h, sn.v); p.detent(d[0], d[1], C.goldT); } });
      // axis readout for Q
      p.hideTicks.push(p.X(Q));
      axisValue(p, Q, (t === mec && mec > 0 ? 'Q* = ' : 'Q = ') + q(Q), C.ink);
      if (Math.abs(p.X(Q) - p.X(Qs)) > (p.phone ? 64 : 80)) { p.hideTicks.push(p.X(Qs)); axisValue(p, Qs, 'Q* ' + q(Qs), C.redT, true); }
      // labels: stable curve names first, then the moving numbers, extras last (dropped if crowded)
      var tip = p.P(Q, MB(Q)), foot = p.P(Q, PMC(Q));
      p.label([['MB', 'curve', C.blueT]], p.P(88, 12), { prefer: ['NE', 'N', 'E', 'SW'], dist: 8 });
      p.label([['PMC', 'curve', C.orangeT]], p.P(88, 98), { prefer: ['SE', 'E', 'S'], dist: 8 });
      var hm = p.handles[1];
      if (mec > 0) {
        p.label([[taxIsHarm ? 'SMC = PMC + tax' : 'SMC', 'curve', C.redT], [(p.phone ? 'harm ' : 'harm to others ') + money(mec), 'small', C.redT]],
          [hm.px, hm.py], { prefer: ['NW', 'W', 'N', 'SE'], dist: 24 });
      } else {
        p.label([['no harm to others', 'small', C.redT]], [hm.px, hm.py], { prefer: ['NW', 'N', 'W'], dist: 24 });
      }
      if (t > 0) p.label([['tax', 'small', C.goldT], [money(t), 'big', C.goldT]], [tip[0], (tip[1] + foot[1]) / 2], { prefer: ['W', 'E', 'SW', 'NW'], dist: 14 });
      if (dwl > 0) {
        var cx = p.X((Q + Q + Qs) / 3), cy = p.Y((MB(Q) + SMC(Q) + MB(Qs)) / 3);
        p.label([[p.phone ? 'DWL' : 'deadweight loss', 'small', C.redT], [money(dwl), 'big', C.redT]], [cx, cy], { prefer: ['E', 'SE', 'NE', 'S', 'W', 'SW'], dist: 22, leader: true });
      }
      if (qa > 3) {
        var gx = p.X(qa * 0.3), gy = p.Y(((100 + SMC(0)) / 2 + (MB(qa) + SMC(qa)) / 2) / 2);
        p.label([[p.phone ? 'surplus' : 'social surplus', 'small', C.greenT], [money(ss), 'big', C.greenT]], [gx, gy], { prefer: ['C', 'S', 'N', 'W'], dist: 0, steps: [0, 12, 26], optional: true });
      }
      if (t > 0 && !taxIsHarm && t >= 8) p.label([['PMC + tax', 'small', C.goldT]], p.P(Math.min(85 - t, 80), Math.min(95, 10 + t + Math.min(85 - t, 80))), { prefer: ['SE', 'E', 'NW'], dist: 10, optional: true });
      if (!p.touched) p.label([['drag me up the curve', 'small', C.plum]], [tip[0], tip[1]], { prefer: ['NE', 'E', 'N'], dist: 26, cls: 'hint', optional: true });
    },
    caption_text: function (s) {
      var Q = s.q, t = 90 - 2 * Q, mec = s.mec, Qs = (90 - mec) / 2, dwl = (Q - Qs) * (Q - Qs);
      if (mec === 0) return t === 0
        ? 'With no harm to others, private and social cost are the same line, so the market\'s 45 units are already efficient. Drag the red handle up to add some harm.'
        : 'There is no harm to correct, so this ' + money(t) + ' tax only shrinks a market that was already efficient: ' + b('r', money(dwl) + ' deadweight loss') + '.';
      if (t === 0) return 'No tax. The market makes ' + b('k', '45') + ' units, ' + q(45 - Qs) + ' past the efficient ' + b('k', q(Qs)) + '. Each extra unit costs society more than it is worth, a ' + b('r', money(dwl) + ' deadweight loss') + '. Pull the gold point up the demand curve to open a tax wedge.';
      if (t === mec) return 'A tax of ' + b('g', money(t)) + ' equals the harm each unit does, so the market stops at ' + b('k', 'Q* = ' + q(Q)) + ' on its own. Buyers pay ' + money(100 - Q) + ', firms keep ' + money(10 + Q) + ', and the deadweight loss is ' + b('gr', 'gone') + '.';
      if (t < mec) return 'A ' + money(t) + ' tax is smaller than the ' + money(mec) + ' harm. The market makes ' + b('k', q(Q)) + ' units, still ' + q(Q - Qs) + ' too many: ' + b('r', money(dwl) + ' deadweight loss') + '.';
      return 'A ' + money(t) + ' tax is bigger than the ' + money(mec) + ' harm. The market makes only ' + b('k', q(Q)) + ' units, ' + q(Qs - Q) + ' too few: ' + b('r', money(dwl) + ' deadweight loss') + ' from trades that never happen.';
    }
  });

  // value written under the x axis at data x (bold), replacing the tick there
  function axisValue(p, x, text, color, soft) {
    var t = TK.el('text', { x: p.X(x), y: p.B + 26, 'text-anchor': 'middle', class: 'axis-val' + (soft ? ' soft' : ''), fill: color,
      'font-size': p.fs.tick + (soft ? 1 : 3) }, p.gMarks);
    t.textContent = text;
    // keep inside the svg
    var bb = t.getBBox();
    if (bb.x + bb.width > p.W - 2) t.setAttribute('x', p.W - 2 - bb.width / 2);
    if (bb.x < 2) t.setAttribute('x', 2 + bb.width / 2);
    var b2 = t.getBBox();
    p.axisRects.push({ x: b2.x, y: b2.y, w: b2.width, h: b2.height });
  }

  /* ================================================ Fig 11.2 cap and trade */
  window.F112 = mount('f112', {
    ariaLabel: 'Cap and trade. Firm A abatement measured from the left, Firm B from the right, 100 units in total. MAC A = 2 e, MAC B = 8 e.',
    state: { a: 50 },
    x: [0, 100], y: [0, 500],
    yTicks: [0, 100, 200, 300, 400, 500],
    yFmt: function (v) { return '$' + v; },
    yTitle: '$ per unit cleaned up',
    phoneAspect: 1.2,
    margin: function (phone) { return { b: phone ? 96 : 100 }; },
    beckon: 'split',
    xTickRows: function (p, g) {
      var rows = [[C.blueT, function (v) { return v; }, 26], [C.orangeT, function (v) { return 100 - v; }, 50]];
      [0, 20, 40, 60, 80, 100].forEach(function (v) {
        var x = p.X(v);
        TK.el('line', { x1: x, y1: p.B, x2: x, y2: p.B + 7, class: 'axis' }, g);
        if (Math.abs(x - p.handles[0].px) < (p.phone ? 26 : 30)) return;
        rows.forEach(function (r) {
          var t = TK.el('text', { x: x, y: p.B + r[2], 'text-anchor': 'middle', class: 'tick', fill: r[0], 'font-size': p.fs.tick }, g);
          t.textContent = r[1](v);
        });
      });
      var fs = p.fs.title;
      var la = TK.el('text', { x: p.L, y: p.B + (p.phone ? 82 : 86), class: 'axis-title', fill: C.blueT, 'font-size': fs }, g);
      la.textContent = p.phone ? 'A abates →' : 'Firm A abates →';
      var lb = TK.el('text', { x: p.R, y: p.B + (p.phone ? 82 : 86), 'text-anchor': 'end', class: 'axis-title', fill: C.orangeT, 'font-size': fs }, g);
      lb.textContent = p.phone ? '← B abates' : '← Firm B abates';
    },
    handles: [
      { key: 'split', name: 'Split of the 100 units of cleanup. Drag right to move cleanup from Firm B to Firm A', color: C.plum,
        min: 40, max: 100, step: 1,
        get: function (s) { return s.a; }, set: function (s, v) { s.a = v; },
        at: function (v) { return [v, 0]; },
        snaps: function () { return [{ v: 50, label: 'Snapped: equal shares, 50 each' }, { v: 80, label: 'Snapped: both MACs equal $160' }]; },
        valueText: function (v) { return 'Firm A abates ' + v + ', Firm B abates ' + (100 - v); } }
    ],
    render: function (p, s) {
      var a = s.a, bb = 100 - a, mA = 2 * a, mB = 8 * bb, cost = a * a + 4 * bb * bb, waste = cost - 8000;
      p.poly([[0, 0], [a, 0], [a, mA]], { fill: C.fBlue });
      p.poly([[a, 0], [100, 0], [a, mB]], { fill: C.fOrange });
      if (waste > 0) p.poly([[a, mA], [a, mB], [80, 160]], { fill: C.fRed, stroke: C.red, sw: 2 });
      p.line(0, 0, 100, 200, { color: C.blue });
      p.line(37.5, 500, 100, 0, { color: C.orange });
      p.line(a, 0, a, Math.min(500, Math.max(mA, mB)), { color: C.ink, w: 2.5, dash: '6 6' });
      var h = p.handles[0];
      h.snaps(s).forEach(function (sn) { if (sn.v !== a) { var d = p.pathPx(h, sn.v); p.detent(d[0], d[1], C.plum); } });
      var same = Math.abs(mA - mB) < 0.5;
      var pa = p.dot(a, mA, C.blue, 7), pb = same ? pa : p.dot(a, mB, C.orange, 7);
      // stable labels first
      var trade = a > 50 ? 'A sells ' + (a - 50) + ' permits to B' : a < 50 ? 'B sells ' + (50 - a) + ' permits to A' : (p.phone ? 'no permits traded' : 'each firm keeps its 50 permits');
      var board = [['total cost', 'small'], [money(cost), 'big'], [p.phone ? 'least $8,000' : 'cheapest possible $8,000', 'small', C.soft]];
      // on a phone the trade joins the scoreboard; there is no room for it beside the handle
      if (p.phone) board.push([trade, 'small', C.plum]);
      p.label(board, [p.X(99.5), p.Y(496)], { prefer: ['SW', 'W', 'S'], dist: 0, steps: [0, 20, 40], align: 'end' });
      p.label(p.phone ? [['MAC A', 'curve', C.blueT]] : [['MAC', 'curve', C.blueT], ['Firm A = 2e', 'small', C.blueT]], p.P(93, 186), { prefer: ['NW', 'N', 'W'], dist: 12 });
      p.label(p.phone ? [['MAC B', 'curve', C.orangeT]] : [['MAC', 'curve', C.orangeT], ['Firm B = 8e', 'small', C.orangeT]], p.P(42, 464), { prefer: ['W', 'SW', 'NW'], dist: 12 });
      if (waste > 0) {
        var cx = p.X((a + a + 80) / 3), cy = p.Y((mA + mB + 160) / 3);
        p.label([['wasted', 'small', C.redT], [money(waste), 'big', C.redT]], [cx, cy], { prefer: ['C', 'E', 'W', 'N', 'S'], dist: 30, leader: true });
      }
      // the marginal costs at the split, right on the dots
      if (same) {
        p.label([['both last units', 'small'], ['$160', 'big'], ['= permit price', 'small']], pa, { prefer: ['E', 'W', 'NE', 'SE'], dist: 14 });
      } else {
        p.label([[p.phone ? 'A next unit' : "A's next unit", 'small', C.blueT], [money(mA), 'big', C.blueT]], pa, { prefer: mA < mB ? ['W', 'SW', 'NW', 'E'] : ['E', 'NE', 'W'], dist: 14, optional: true });
        if (mB <= 500) p.label([[p.phone ? 'B next unit' : "B's next unit", 'small', C.orangeT], [money(mB), 'big', C.orangeT]], pb, { prefer: mB > mA ? ['E', 'NE', 'SE', 'W'] : ['W', 'SW', 'E'], dist: 14, optional: true });
      }
      // the trade, said right at the divider
      if (!p.phone) p.label([[trade, 'small', C.plum]], [h.px, h.py], { prefer: ['NE', 'NW', 'N', 'E', 'W'], dist: 24 });
      p.label([['A spends', 'small', C.blueT], [money(a * a), 'mid', C.blueT]], [p.X(a * 0.66), p.Y(mA * 0.3)], { prefer: ['C', 'W', 'S', 'N'], dist: 0, steps: [0, 10], optional: true });
      p.label([['B spends', 'small', C.orangeT], [money(4 * bb * bb), 'mid', C.orangeT]], [p.X(a + bb * 0.34), p.Y(Math.min(mB, 500) * 0.3)], { prefer: ['C', 'E', 'S', 'N'], dist: 0, steps: [0, 10], optional: true });
      if (!p.touched) p.label([['drag the split', 'small', C.plum]], [h.px, h.py], { prefer: ['NW', 'N', 'NE'], dist: 26, cls: 'hint', optional: true });
    },
    caption_text: function (s) {
      var a = s.a, bb = 100 - a, mA = 2 * a, mB = 8 * bb, cost = a * a + 4 * bb * bb, waste = cost - 8000;
      if (a === 80) return 'Both firms\' last unit of cleanup costs ' + b('k', '$160') + ', so no trade can lower the bill. Firm A abates 80 and sells 30 permits to B at $160 each. The 100-unit target costs ' + b('gr', '$8,000') + ', the least possible, and $4,500 (36%) less than equal shares.';
      if (a === 50) return 'Equal shares: each firm abates 50. A\'s next unit of cleanup costs ' + b('b', '$100') + ' but B\'s costs ' + b('o', '$400') + ', so B would happily pay A to do it instead. Total ' + b('k', '$12,500') + '. Drag the split toward Firm B and let them trade.';
      if (mA < mB) return 'A abates ' + a + ', B abates ' + bb + '. A\'s next unit costs ' + b('b', money(mA)) + ', B\'s costs ' + b('o', money(mB)) + ', so B still gains by buying more permits from A. Total ' + b('k', money(cost)) + ', ' + b('r', money(waste) + ' above') + ' the cheapest way.';
      return 'Too far: A abates ' + a + ' and its next unit costs ' + b('b', money(mA)) + ', more than B\'s ' + b('o', money(mB)) + '. Shifting cleanup back to B saves money. Total ' + b('k', money(cost)) + ', ' + b('r', money(waste) + ' wasted') + '.';
    }
  });

  /* ============================================ Fig 11.3 positive externality */
  window.F113 = mount('f113', {
    ariaLabel: 'Positive externality and the Pigouvian subsidy. Demand MB = 100 minus Q, marginal cost MC = 10 plus Q, social benefit MSB adds the benefit to others.',
    state: { meb: 20, q: 45 },
    x: [0, 100], y: [0, 140],
    xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 20, 40, 60, 80, 100, 120, 140],
    yFmt: function (v) { return '$' + v; },
    yTitle: '$ per unit', xTitle: 'Quantity',
    beckon: 'q',
    handles: [
      { key: 'q', name: 'Quantity marker. Drag along the axis', color: C.ink,
        min: 0, max: 95, step: 1,
        get: function (s) { return s.q; }, set: function (s, v) { s.q = v; },
        at: function (v) { return [v, 0]; },
        snaps: function (s) {
          var Qs = 45 + s.meb / 2;
          return [{ v: 45, label: 'Snapped: the market, Q = 45' }, { v: Qs, label: 'Snapped: optimum, Q* = ' + q(Qs) }];
        },
        valueText: function (v) { return 'Quantity ' + v; } },
      { key: 'meb', name: 'Benefit to others per unit. Drag the social benefit curve up or down', color: C.green,
        min: 0, max: 40, step: 2,
        get: function (s) { return s.meb; }, set: function (s, v) { s.meb = v; },
        at: function (v) { return [85, 15 + v]; },
        snaps: function () { return [{ v: 20, label: 'Snapped: $20 benefit, the textbook case' }]; },
        valueText: function (v) { return 'Benefit to others $' + v + ' per unit'; } }
    ],
    render: function (p, s) {
      var Q = s.q, meb = s.meb, Qs = 45 + meb / 2;
      var MB = function (x) { return 100 - x; }, MC = function (x) { return 10 + x; }, MSB = function (x) { return 100 + meb - x; };
      var qa = Math.min(Q, Qs), dwl = (Q - Qs) * (Q - Qs), ss = (90 + meb) * Q - Q * Q;
      if (qa > 0) p.poly([[0, MSB(0)], [qa, MSB(qa)], [qa, MC(qa)], [0, 10]], { fill: C.fGreen });
      if (dwl > 0) p.poly([[Q, MSB(Q)], [Q, MC(Q)], [Qs, MC(Qs)]], { fill: C.fRed, stroke: C.red, sw: 2 });
      p.line(0, 100, 100, 0, { color: C.blue });
      if (meb > 0) p.line(0, 100 + meb, 100, meb, { color: C.green });
      p.line(0, 10, 100, 110, { color: C.orange });
      if (meb > 0) p.bracket(85, 15, 15 + meb, C.green, 3);
      var top = Math.max(MB(Q), MC(Q));
      p.line(Q, 0, Q, Math.min(MB(Q), MC(Q)), { color: C.soft, w: 2, dash: '4 6' });
      var gap = MC(Q) - MB(Q); // > 0 needs a subsidy, < 0 needs a tax
      if (Math.abs(gap) > 0.01) p.line(Q, MB(Q), Q, MC(Q), { color: C.gold, w: 10, cap: 'butt', noclip: true });
      var pB = p.dot(Q, MB(Q), C.blue, 6), pC = p.dot(Q, MC(Q), C.orange, 6);
      var h = p.handles[0];
      h.snaps(s).forEach(function (sn) { if (sn.v !== Q) { var d = p.pathPx(h, sn.v); p.detent(d[0], d[1], C.ink); } });
      p.hideTicks.push(p.X(Q));
      if (Math.abs(p.X(Q) - p.X(Qs)) > (p.phone ? 64 : 80)) { p.hideTicks.push(p.X(Qs)); axisValue(p, Qs, 'Q* ' + q(Qs), C.greenT, true); }
      p.label([['MB', 'curve', C.blueT]], p.P(70, 30), { prefer: ['SW', 'S', 'W'], dist: 10 });
      p.label([['MC', 'curve', C.orangeT]], p.P(86, 96), { prefer: ['SE', 'E', 'NW'], dist: 10 });
      var hm = p.handles[1];
      p.label(meb > 0 ? [['MSB', 'curve', C.greenT], ['+' + money(meb) + (p.phone ? '' : ' to others'), 'small', C.greenT]] : [['no benefit to others', 'small', C.greenT]],
        [hm.px, hm.py], { prefer: ['NE', 'E', 'N', 'NW'], dist: 24 });
      p.label([[(Q === Qs && meb > 0 ? 'Q* = ' : 'Q = ') + q(Q), 'mid']], [h.px, h.py], { prefer: ['NE', 'NW', 'E', 'W'], dist: 22 });
      if (Math.abs(gap) > 0.01) {
        var mid = [pB[0], (pB[1] + pC[1]) / 2];
        p.label([[gap > 0 ? (p.phone ? 'subsidy' : 'subsidy needed') : (p.phone ? 'tax' : 'tax needed'), 'small', C.goldT], [money(Math.abs(gap)), 'big', C.goldT]], mid, { prefer: ['E', 'W', 'NE', 'SE', 'NW', 'SW'], dist: 14 });
      } else {
        p.label([['no subsidy', 'small', C.goldT]], pB, { prefer: ['NE', 'E', 'N'], dist: 14, optional: true });
      }
      if (dwl > 0) {
        var cx = p.X((Q + Q + Qs) / 3), cy = p.Y((MSB(Q) + MC(Q) + MC(Qs)) / 3);
        p.label([[p.phone ? 'DWL' : 'deadweight loss', 'small', C.redT], [money(dwl), 'big', C.redT]], [cx, cy], { prefer: ['SE', 'E', 'S', 'NE', 'W'], dist: 24, leader: true });
      }
      if (qa > 3) {
        var gx = p.X(qa * 0.4), gy = p.Y(((MSB(0) + 10) / 2 + (MSB(qa) + MC(qa)) / 2) / 2);
        p.label([[p.phone ? 'surplus' : 'social surplus', 'small', C.greenT], [money(ss), 'big', C.greenT]], [gx, gy], { prefer: ['C', 'S', 'N', 'W'], dist: 0, steps: [0, 12, 26], optional: true });
      }
      if (!p.touched) p.label([['drag the quantity', 'small', C.plum]], [h.px, h.py], { prefer: ['NE', 'E', 'NW'], dist: 30, cls: 'hint', optional: true });
    },
    caption_text: function (s) {
      var Q = s.q, meb = s.meb, Qs = 45 + meb / 2, dwl = (Q - Qs) * (Q - Qs), gap = 2 * Q - 90;
      if (meb === 0 && Q === 45) return 'With no benefit to others, private and social benefit are the same line and the market\'s 45 units are efficient. Drag the green handle up to add a spillover.';
      if (Q === 45) return 'The market stops at ' + b('k', '45') + ', where buyers\' own benefit meets cost. Each unit is also worth ' + money(meb) + ' to other people, so the units from 45 to ' + q(Qs) + ' are lost: ' + b('r', money(dwl) + ' deadweight loss') + '. Drag the quantity to the right.';
      if (Q === Qs) return 'At ' + b('k', 'Q* = ' + q(Qs)) + ' social benefit meets cost. Getting buyers here takes a subsidy of ' + b('g', money(gap)) + ' per unit, exactly the benefit to others. Deadweight loss is ' + b('gr', 'gone') + '.';
      if (Q > 45 && Q < Qs) return 'A ' + money(gap) + ' subsidy gets the market to ' + b('k', q(Q)) + ', still short of Q* = ' + q(Qs) + ': ' + b('r', money(dwl) + ' deadweight loss') + '. The right subsidy equals the ' + money(meb) + ' benefit to others.';
      if (Q > Qs) return 'Overshoot: at ' + b('k', q(Q)) + ' units the last ones cost more than they are worth to anyone. A ' + money(gap) + ' subsidy is bigger than the ' + money(meb) + ' spillover: ' + b('r', money(dwl) + ' deadweight loss') + '.';
      return 'Fewer than the market\'s 45 units: getting here would take a ' + money(-gap) + ' tax, which makes the shortfall worse: ' + b('r', money(dwl) + ' deadweight loss') + '.';
    }
  });

  /* ================================================== Fig 11.4 public goods */
  var PEOPLE = [
    { name: 'Amara', color: C.blue, ink: C.blueT, hq: 7 },
    { name: 'Ben', color: C.purple, ink: C.purpleT, hq: 5 },
    { name: 'Chen', color: C.gold, ink: C.goldT, hq: 3 }
  ];
  var COST = 300, SLOPE = 10, XMAX = 12;
  function mbi(v, x) { return Math.max(0, v - SLOPE * x); }
  function sum(vs, x) { return vs.reduce(function (acc, v) { return acc + mbi(v, x); }, 0); }
  function pubSolve(vs) {
    var s0 = sum(vs, 0), Qs = 0;
    if (s0 > COST) {
      var lo = 0, hi = 60;
      for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (sum(vs, m) > COST) lo = m; else hi = m; }
      Qs = (lo + hi) / 2;
    }
    var vmax = Math.max.apply(null, vs);
    var Qp = vmax > COST ? (vmax - COST) / SLOPE : 0;
    // exact integral of (sum - cost) from Qp to Qs over the piecewise-linear sum
    var pts = [Qp, Qs];
    vs.forEach(function (v) { var k = v / SLOPE; if (k > Qp && k < Qs) pts.push(k); });
    pts.sort(function (a, c) { return a - c; });
    var lost = 0;
    for (var j = 1; j < pts.length; j++) lost += (pts[j] - pts[j - 1]) * ((sum(vs, pts[j]) - COST) + (sum(vs, pts[j - 1]) - COST)) / 2;
    return { s0: s0, Qs: Qs, Qp: Qp, lost: Math.max(0, lost), vmax: vmax };
  }
  function lights(x) { var r = Math.round(x * 10) / 10; return r + (r === 1 ? ' light' : ' lights'); }

  var pubHandles = PEOPLE.map(function (pp, i) {
    return { key: 'p' + i, name: pp.name + "'s marginal benefit curve. Drag up or down", color: pp.color,
      min: SLOPE * pp.hq + 20, max: 400, step: 10,
      get: function (s) { return s.v[i]; }, set: function (s, v) { s.v[i] = v; },
      at: function (v) { return [pp.hq, v - SLOPE * pp.hq]; },
      snaps: function (s) {
        var others = s.v.reduce(function (a, v, j) { return j === i ? a : a + v; }, 0);
        var out = [{ v: 300, label: 'Snapped: ' + pp.name + ' alone values it at $300' }];
        var be = COST - others;
        if (be >= SLOPE * pp.hq + 20 && be !== 300) out.push({ v: be, label: 'Snapped: together worth exactly $300' });
        return out;
      },
      valueText: function (v) { return pp.name + ' values the first light at $' + v; } };
  });
  pubHandles.push({ key: 'probe', name: 'Reading line. Drag along the axis to add up the three curves', color: C.ink,
    min: 0, max: XMAX, step: 0.5,
    get: function (s) { return s.q; }, set: function (s, v) { s.q = v; },
    at: function (v) { return [v, 0]; },
    snaps: function (s) {
      var r = pubSolve(s.v), out = [];
      if (r.Qs > 0 && r.Qs <= XMAX) out.push({ v: r.Qs, label: 'Snapped: sum = cost at Q* = ' + num(r.Qs, 1) });
      if (r.Qp > 0) out.push({ v: r.Qp, label: 'Snapped: what free riders get, ' + num(r.Qp, 1) });
      return out;
    },
    valueText: function (v) { return 'Reading at ' + v + ' lights'; } });

  window.F114 = mount('f114', {
    ariaLabel: 'Public good. Three neighbours each have a falling marginal benefit curve for streetlights. Their vertical sum is compared with a cost of $300 per light.',
    state: { v: [140, 120, 100], q: 1 },
    x: [0, XMAX], y: [0, 600],
    xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: [0, 100, 200, 300, 400, 500, 600],
    yFmt: function (v) { return '$' + v; },
    yTitle: '$ per streetlight', xTitle: 'Streetlights',
    phoneAspect: 1.22,
    beckon: 'p1',
    handles: pubHandles,
    render: function (p, s) {
      var r = pubSolve(s.v), Qs = Math.min(r.Qs, XMAX);
      // vertical-sum polyline
      var ks = [0, XMAX];
      s.v.forEach(function (v) { if (v / SLOPE > 0 && v / SLOPE < XMAX) ks.push(v / SLOPE); });
      ks.sort(function (a, c) { return a - c; });
      // lost area between the sum and the cost line, Qp..Qs
      if (r.lost > 0.5) {
        var poly = [[r.Qp, COST]];
        var xs = [r.Qp].concat(ks.filter(function (k) { return k > r.Qp && k < Qs; }), [Qs]);
        xs.forEach(function (x) { poly.push([x, sum(s.v, x)]); });
        poly.push([Qs, COST]);
        p.poly(poly, { fill: C.fRed, stroke: C.red, sw: 2 });
      }
      if (r.Qp > 0) {
        var gpoly = [[0, COST]];
        [0].concat(ks.filter(function (k) { return k > 0 && k < r.Qp; }), [r.Qp]).forEach(function (x) { gpoly.push([x, sum(s.v, x)]); });
        gpoly.push([r.Qp, COST]);
        p.poly(gpoly, { fill: C.fGreen });
      }
      // individual curves
      PEOPLE.forEach(function (pp, i) {
        var v = s.v[i];
        if (v > 0) p.line(0, v, Math.min(v / SLOPE, XMAX), v - SLOPE * Math.min(v / SLOPE, XMAX), { color: pp.color, w: 3.5 });
      });
      // cost
      p.line(0, COST, XMAX, COST, { color: C.orange, w: 4 });
      // the sum, thick ink
      for (var k = 1; k < ks.length; k++) p.line(ks[k - 1], sum(s.v, ks[k - 1]), ks[k], sum(s.v, ks[k]), { color: C.ink, w: 5.5 });
      // efficient quantity marker
      if (r.Qs > 0 && r.Qs <= XMAX) p.line(r.Qs, 0, r.Qs, COST, { color: C.soft, w: 2, dash: '4 6' });
      // the reading stack at the probe: the vertical sum made literal
      var hq = s.q, y0 = 0, bw = p.phone ? 16 : 20, px = p.X(hq);
      var parts = PEOPLE.map(function (pp, i) { return mbi(s.v[i], hq); });
      PEOPLE.forEach(function (pp, i) {
        var y1 = y0 + parts[i];
        if (parts[i] > 0) {
          TK.el('rect', { x: px - bw / 2, y: Math.max(p.T, p.Y(Math.min(y1, 600))), width: bw, height: Math.max(0, p.Y(y0) - Math.max(p.T, p.Y(Math.min(y1, 600)))),
            fill: pp.color, stroke: C.paper, 'stroke-width': 1.5 }, p.gMarks);
        }
        y0 = y1;
      });
      var tot = y0;
      p.rects.push({ x: px - bw / 2 - 2, y: p.Y(Math.min(tot, 600)), w: bw + 4, h: p.Y(0) - p.Y(Math.min(tot, 600)) });
      var hProbe = p.handles[3];
      hProbe.snaps(s).forEach(function (sn) { if (Math.abs(sn.v - hq) > 1e-6) { var d = p.pathPx(hProbe, sn.v); p.detent(d[0], d[1], C.ink); } });
      p.hideTicks.push(px);
      // labels: stable ones first
      p.label([[p.phone ? 'cost $300' : 'cost $300 per light', 'small', C.orangeT]], p.P(XMAX - 0.1, COST), { prefer: ['NW', 'SW', 'N', 'S'], dist: 8 });
      var sx = 9.5;
      p.label([[p.phone ? 'sum' : 'sum of all three', 'curve', C.ink]], p.P(sx, sum(s.v, sx)), { prefer: ['NE', 'N', 'E', 'SW'], dist: 10 });
      PEOPLE.forEach(function (pp, i) {
        var hh = p.handles[i];
        p.label(p.phone ? [[pp.name + ' ' + money(s.v[i]), 'small', pp.ink]] : [[pp.name, 'curve', pp.ink], ['first light ' + money(s.v[i]), 'small', pp.ink]],
          [hh.px, hh.py], { prefer: ['NE', 'E', 'SE', 'N', 'S'], dist: 22 });
      });
      var eq = [];
      PEOPLE.forEach(function (pp, i) { if (eq.length) eq.push([' + ', C.soft]); eq.push([String(Math.round(parts[i])), pp.ink]); });
      var good = tot > COST;
      p.label([[eq, 'small'], ['= ' + money(tot), 'big', good ? C.greenT : tot === COST ? C.ink : C.redT]], [px, p.Y(Math.min(tot, 590))],
        { prefer: ['NE', 'E', 'NW', 'N', 'SE', 'W'], dist: 14 });
      if (r.lost > 0.5) {
        var lx = p.X((r.Qp + Qs) / 2), ly = p.Y((COST + sum(s.v, (r.Qp + Qs) / 2)) / 2);
        p.label([[p.phone ? 'lost' : 'lost to free-riding', 'small', C.redT], [money(r.lost), 'big', C.redT]], [lx, ly], { prefer: ['NE', 'N', 'E', 'NW', 'SE', 'S'], dist: 26, leader: true });
      }
      if (r.Qs > 0) {
        var qsx = Math.min(r.Qs, XMAX);
        p.label([[r.Qs > XMAX ? 'efficient: over 12' : 'efficient ' + lights(r.Qs), 'small', C.ink]], p.P(qsx, COST), { prefer: ['SE', 'NE', 'S', 'E', 'N'], dist: 12, optional: true });
      }
      if (!p.touched) p.label([['drag any curve', 'small', C.plum]], [p.handles[1].px, p.handles[1].py], { prefer: ['S', 'SE', 'SW', 'E'], dist: 26, cls: 'hint', optional: true });
    },
    caption_text: function (s) {
      var r = pubSolve(s.v), top = PEOPLE[s.v.indexOf(r.vmax)].name;
      var tot0 = r.s0;
      if (tot0 <= COST) return 'Together the three value the first light at only ' + b('k', money(tot0)) + ', no more than its $300 cost. Buying none is the efficient choice here, so nothing is lost.';
      var qs = r.Qs > XMAX ? 'more than 12' : num(r.Qs, 1);
      if (r.Qp > 0) return top + ' values the first light at ' + money(r.vmax) + ', more than $300, so ' + top + ' buys ' + b('k', lights(r.Qp)) + ' alone while the others free-ride. The efficient number is ' + b('k', qs) + ', where the vertical sum meets cost, so ' + b('r', money(r.lost) + ' is still lost') + '.';
      return 'No one values a light at $300 on their own, so each waits for the others and ' + b('r', 'none get bought') + '. Together they value the first light at ' + b('k', money(tot0)) + ', and the efficient number is ' + b('k', qs) + ', where the vertical sum meets cost. Lost to free-riding: ' + b('r', money(r.lost)) + '.';
    }
  });

  /* ======================================================= Fig 11.5 Coase */
  function cMB(x) { return 100 - 2 * x; }
  function cMD(x) { return 2 * x; }
  function between(a, c) { var lo = Math.min(a, c), hi = Math.max(a, c); return Math.abs(100 * (hi - lo) - 2 * (hi * hi - lo * lo)); }
  function intMB(a, c) { var lo = Math.min(a, c), hi = Math.max(a, c); return 100 * (hi - lo) - (hi * hi - lo * lo); }
  function intMD(a, c) { var lo = Math.min(a, c), hi = Math.max(a, c); return hi * hi - lo * lo; }

  window.F115 = mount('f115', {
    ariaLabel: 'Coase theorem. Factory marginal benefit of polluting MB = 100 minus 2S, neighbour marginal damage MD = 2S, efficient S* = 25.',
    state: { right: 'factory', s: 50 },
    x: [0, 50], y: [0, 115],
    xTicks: [0, 10, 20, 30, 40, 50], yTicks: [0, 20, 40, 60, 80, 100],
    yFmt: function (v) { return '$' + v; },
    yTitle: '$ per unit of pollution', xTitle: 'Pollution S',
    beckon: 's',
    handles: [
      { key: 's', name: 'Bargaining point, the pollution level both sides agree to. Drag along the axis', color: C.plum,
        min: 0, max: 50, step: 1,
        get: function (s) { return s.s; }, set: function (s, v) { s.s = v; },
        at: function (v) { return [v, 0]; },
        snaps: function () { return [{ v: 25, label: 'Snapped: S* = 25, MB = MD = $50' }]; },
        valueText: function (v) { return 'Pollution ' + v; } }
    ],
    render: function (p, s) {
      var S = s.s, st = s.right === 'factory' ? 50 : 0, gEnd, fac = s.right === 'factory';
      // gains toward S*, loss past it, and what is still left on the table
      gEnd = fac ? Math.max(S, 25) : Math.min(S, 25);
      var quad = function (a, c, o) { p.poly([[a, cMB(a)], [c, cMB(c)], [c, cMD(c)], [a, cMD(a)]], o); };
      if (gEnd !== st) quad(st, gEnd, { fill: C.fGreen, stroke: C.green, sw: 2 });
      if (gEnd !== 25) quad(gEnd, 25, { fill: p.hatchUrl });
      var pastS = fac ? S < 25 : S > 25;
      if (pastS) quad(25, S, { fill: C.fRed, stroke: C.red, sw: 2 });
      p.line(0, 100, 50, 0, { color: C.blue });
      p.line(0, 0, 50, 100, { color: C.red });
      p.line(25, 0, 25, 50, { color: C.soft, w: 2, dash: '4 6', obstacle: false });
      if (S !== 25) p.line(S, 0, S, Math.max(cMB(S), cMD(S)), { color: C.plum, w: 2, dash: '4 6' });
      var h = p.handles[0];
      if (S !== 25) { var dd = p.pathPx(h, 25); p.detent(dd[0], dd[1], C.plum); }
      p.hideTicks.push(p.X(S));

      // tappable "who holds the right" chips, in the two empty side wedges
      chip(p, s, 'neighbor', p.X(0) + 10, p.Y(50), 'start');
      chip(p, s, 'factory', p.X(50) - 10, p.Y(50), 'end');

      // curve names first: they never move
      p.label([[p.phone ? 'MB' : 'MB of polluting', 'curve', C.blueT]], p.P(p.phone ? 4 : 8, p.phone ? 92 : 84), { prefer: ['NE', 'E', 'N'], dist: 8 });
      p.label([[p.phone ? 'MD' : 'MD to neighbor', 'curve', C.redT]], p.P(p.phone ? 46 : 42, p.phone ? 92 : 84), { prefer: ['NW', 'W', 'N'], dist: 8 });
      // the deal, said big at the top
      var msg;
      var stop = fac ? Math.max(S, 25) : Math.min(S, 25);
      if (S === st) msg = [[p.phone ? 'drag toward S* = 25' : 'drag the bargaining point toward S* = 25', 'small', C.plum]];
      else {
        var F = intMB(st, stop), D = intMD(st, stop);
        msg = fac ? [['neighbor pays the factory', 'small', C.plum], [money(F) + ' to ' + money(D), 'big', C.plum]]
                  : [['factory pays the neighbor', 'small', C.plum], [money(D) + ' to ' + money(F), 'big', C.plum]];
      }
      p.label(msg, [p.X(25), p.Y(114)], { prefer: ['S', 'C'], dist: 0, steps: [0, 10, 20], strict: true });
      p.label([['S = ' + S, 'mid']], [h.px, h.py], { prefer: S > 40 ? ['NW', 'N', 'W'] : S < 10 ? ['NE', 'N', 'E'] : ['NE', 'NW', 'N'], dist: 22 });

      var gains = between(st, gEnd), left = between(gEnd, 25), lost = pastS ? between(25, S) : 0;
      var wedgeY = p.phone ? 50 : 50;
      if (lost > 0) {
        p.label([[p.phone ? 'destroyed' : 'value destroyed', 'small', C.redT], [money(lost), 'big', C.redT]], [p.X((25 + S) / 2), p.Y(wedgeY)], { prefer: ['C', 'N', 'S'], dist: 0, box: 'rgba(239,241,238,0.9)' });
      }
      if (gains > 0) {
        var gx = fac ? p.X(st - (st - gEnd) * 0.3) : p.X(st + (gEnd - st) * 0.3);
        p.label([[p.phone ? 'gains' : 'gains so far', 'small', C.greenT], [money(gains), 'big', C.greenT]], [gx, p.Y(wedgeY)], { prefer: ['C', 'N', 'S'], dist: 0 });
      }
      // values at the bargaining point
      if (S === 25) {
        var pc = p.dot(25, 50, C.plum, 7);
        p.label([['MB = MD', 'small'], ['$50', 'big']], pc, { prefer: ['S', 'N'], dist: 14 });
      } else {
        var pb = p.dot(S, cMB(S), C.blue, 6), pd = p.dot(S, cMD(S), C.red, 6);
        p.label(p.phone ? [[money(cMB(S)), 'mid', C.blueT]] : [["factory's MB", 'small', C.blueT], [money(cMB(S)), 'mid', C.blueT]], pb, { prefer: S < 25 ? ['NE', 'E', 'N'] : ['SW', 'W', 'S', 'E'], dist: 12, optional: true });
        p.label(p.phone ? [[money(cMD(S)), 'mid', C.redT]] : [["neighbor's MD", 'small', C.redT], [money(cMD(S)), 'mid', C.redT]], pd, { prefer: S > 25 ? ['NW', 'W', 'N'] : ['SE', 'E', 'S', 'W'], dist: 12, optional: true });
      }
      if (left > 0) {
        var lx = p.X((gEnd + 25) / 2);
        p.label([[p.phone ? 'left' : 'still on the table', 'small', C.greenT], [money(left), 'mid', C.greenT]], [lx, p.Y(50)], { prefer: ['C', 'N', 'S'], dist: 0, box: 'rgba(239,241,238,0.9)', optional: true });
      }
      if (S !== 25) p.label([['S* = 25', 'mid', C.ink]], p.P(25, 14), { prefer: ['C', 'S', 'N'], dist: 0, optional: true });
      if (!p.touched) p.label([['drag to bargain', 'small', C.plum]], [h.px, h.py], { prefer: ['NW', 'N', 'W'], dist: 40, cls: 'hint', optional: true });
    },
    caption_text: function (s) {
      var S = s.s, fac = s.right === 'factory', st = fac ? 50 : 0;
      if (S === st) return fac
        ? 'The factory holds the right, so pollution starts at 50. There, one more unit is worth ' + b('b', '$0') + ' to the factory but costs the neighbor ' + b('r', '$100') + '. Drag the bargaining point left: the neighbor will pay to cut pollution.'
        : 'The neighbor holds the right, so pollution starts at 0. There, the first unit is worth ' + b('b', '$100') + ' to the factory but costs the neighbor only ' + b('r', '$0') + '. Drag the bargaining point right: the factory will pay to pollute.';
      if (S === 25) return 'Deal done at ' + b('k', 'S* = 25') + '. ' + (fac ? 'The neighbor pays the factory' : 'The factory pays the neighbor') + ' between $625 and $1,875, and the pair gains ' + b('gr', '$1,250') + '. Now tap the ' + (fac ? 'neighbor' : 'factory') + ' to hand them the right instead: the deal lands at 25 again. Only who pays whom changes.';
      var past = fac ? S < 25 : S > 25;
      if (past) return 'Past S* the deal falls apart: at S = ' + S + ', ' + (fac ? 'cutting one more unit costs the factory ' + b('b', money(cMB(S))) + ' but saves the neighbor only ' + b('r', money(cMD(S))) : 'one more unit is worth ' + b('b', money(cMB(S))) + ' to the factory but costs the neighbor ' + b('r', money(cMD(S)))) + '. Nobody would agree to this step.';
      return fac
        ? 'At S = ' + S + ', cutting one more unit saves the neighbor ' + b('r', money(cMD(S))) + ' and costs the factory only ' + b('b', money(cMB(S))) + ', so there is still a deal to make. Keep going toward 25.'
        : 'At S = ' + S + ', one more unit is worth ' + b('b', money(cMB(S))) + ' to the factory and costs the neighbor only ' + b('r', money(cMD(S))) + ', so the factory will still pay for it. Keep going toward 25.';
    }
  });

  function chip(p, s, who, x, y, align) {
    var on = s.right === who;
    var g = TK.el('g', { class: 'chip' + (on ? ' on' : ''), tabindex: on ? -1 : 0, role: 'button',
      'aria-pressed': on ? 'true' : 'false', 'aria-label': (who === 'factory' ? 'Give the factory' : 'Give the neighbor') + ' the right' }, p.gLabels);
    var lines = on ? [who === 'factory' ? 'Factory' : 'Neighbor', 'holds the right'] : [who === 'factory' ? 'Factory' : 'Neighbor', 'tap to give it', 'the right'];
    if (!on && who === 'neighbor') lines = ['Neighbor', 'tap to give', 'them the right'];
    var fsz = p.fs.small, t = TK.el('text', { class: 'chip-t', 'text-anchor': align }, g);
    lines.forEach(function (l, i) {
      var ts = TK.el('tspan', { x: x + (align === 'start' ? 10 : -10), dy: i ? fsz * 1.15 : 0, 'font-size': i ? fsz : fsz + 2, 'font-weight': i ? 600 : 800 }, t);
      ts.textContent = l;
    });
    var bb = t.getBBox();
    t.setAttribute('transform', 'translate(0,' + (y - (bb.y + bb.height / 2)).toFixed(1) + ')');
    bb = { x: bb.x - 10, y: y - bb.height / 2 - 8, w: bb.width + 20, h: bb.height + 16 };
    var r = TK.el('rect', { x: bb.x, y: bb.y, width: bb.w, height: bb.h, rx: 10, class: 'chip-b' });
    g.insertBefore(r, t);
    p.rects.push(bb);
    var act = function (e) {
      if (on) return;
      if (e) e.preventDefault();
      s.right = who; s.s = who === 'factory' ? 50 : 0;
      p.handles[0]._snapped = null; p.toast = null;
      p.touch();
      p.say(who === 'factory' ? 'The factory now holds the right: start at 50' : 'The neighbor now holds the right: start at 0', p.handles[0]);
      p.unsay(1800);
      setTimeout(function () { var c = p.svg.querySelector('.chip:not(.on)'); if (document.activeElement === document.body && c) c.focus({ preventScroll: true }); }, 30);
    };
    g.addEventListener('click', act);
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') act(e); });
  }
})();
