/* figs.js: the five Week 11 figures as living documents. */
(function () {
  'use strict';
  var $ = LV.money, o = LV.out;

  /* A vertical size arrow with its value. Tall enough: label sits beside the arrow.
     Too short: label goes past the arrow head, on the side away from the lines
     ('left' for rising lines, 'right' for falling ones). */
  var INK = { orange: 'orange-ink', gold: 'gold-ink', green: 'green-ink', red: 'red-ink', purple: 'purple-ink', blue: 'blue-ink' };
  function bracket(c, x, lo, hi, str, col, link, side) {
    c.vArrow(x, lo, hi, { color: col, link: link });
    if (hi <= lo) return;
    if (c.Y(lo) - c.Y(hi) >= (c.narrow ? 32 : 40)) c.text(x, (lo + hi) / 2, str, { anchor: 'start', dx: c.narrow ? 7 : 9, dy: 2, color: INK[col], link: link });
    else c.text(x, lo, str, { anchor: side === 'left' ? 'start' : 'end', dx: side === 'left' ? 4 : -4, dy: c.narrow ? 20 : 24, color: INK[col], link: link });
  }

  /* ===================== Fig 11.1 Pigouvian tax =====================
     MB = 100 - Q, PMC = 10 + Q, SMC = PMC + MEC.
     Market with tax t: 10 + Q + t = 100 - Q  ->  Q = (90 - t) / 2.
     Optimum: Q* = (90 - MEC) / 2. DWL = (Q_t - Q*)^2 (gap grows 2 per unit). */
  new LV.Figure(document.getElementById('f111'), {
    state: { mec: 20, tax: 0 },
    actions: {
      match: function (f) { f.tween('tax', f.state.mec); }
    },
    chart: {
      title: 'Marginal benefit, private cost and social cost against quantity',
      x: [0, 100], y: [0, 110],
      xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 20, 40, 60, 80, 100],
      yFmt: function (v) { return '$' + v; },
      xLabel: 'Quantity', yLabel: '$ per unit'
    },
    update: function (f) {
      var M = f.state.mec, t = f.state.tax;
      var QE = 45, Qs = (90 - M) / 2, Qt = (90 - t) / 2;
      var d = Qt - Qs, dwl = d * d, dwl0 = (QE - Qs) * (QE - Qs);

      f.clause('base', M === 0
        ? 'With no harm, the factory&rsquo;s cost is the whole cost. Left alone, the market makes ' + o('mkt0', '45', 'green') + ' units, which is already the best amount, and nothing is wasted.'
        : 'Left alone, the market makes ' + o('mkt0', '45', 'green') + ' units, where buyers&rsquo; value meets the factory&rsquo;s own cost. Counting the harm, the best amount is ' +
          o('opt', String(Qs), 'ink') + ', so the market makes ' + o('extra0', String(QE - Qs), 'red') + ' too many, wasting ' + o('dwl0', $(dwl0), 'red') +
          (t === 0 ? ' (the red triangle).' : '.'));

      var act = ' <button class="act" type="button" data-act="match">Match the tax to the harm</button>.';
      var tc;
      if (t === 0) tc = M === 0 ? 'No tax is needed here.' : 'Try raising it, or' + act.replace('Match', 'match');
      else if (t === M) tc = 'That equals the harm, so the factory now feels the full cost of every unit. The market lands on the best amount, ' + o('mkt opt', String(Qt), 'ink') +
        ' units, all by itself, and nothing is wasted. Buyers pay ' + o('pb', $(100 - Qt), 'blue') + ' and the factory keeps ' + o('ps', $(10 + Qt), 'green') +
        '. Some pollution remains: the best amount is not zero.';
      else if (t < M) tc = 'The market cuts back to ' + o('mkt', String(Qt), 'green') + ' units, still ' + o('extra', String(d), 'red') + ' too many, so ' +
        o('dwl', $(dwl), 'red') + ' is still wasted.' + act;
      else tc = 'That is ' + (M === 0 ? 'a tax with no harm to fix' : 'more than the harm') + ', so now the market makes too little: ' + o('mkt', String(Qt), 'green') + ' units, ' +
        o('extra', String(-d), 'red') + ' short of the best, wasting ' + o('dwl', $(dwl), 'red') + '.' + (M === 0 ? '' : act);
      f.clause('tax', tc);

      f.chart.draw(function (c) {
        var mb = function (q) { return 100 - q; };
        // deadweight triangle between the market quantity and the optimum
        if (d !== 0) c.poly([[Qs, mb(Qs)], [Qt, mb(Qt)], [Qt, 10 + Qt + M]], { fill: 'red', opacity: 0.3, link: 'dwl extra' + (t === 0 ? ' dwl0 extra0' : '') });
        c.line(0, 100, 100, 0, { color: 'blue', link: 'mb pb' });
        c.line(0, 10, 100, 110, { color: 'green', link: 'pmc ps' });
        if (M > 0) c.line(0, 10 + M, 100, 110 + M, { color: 'orange', link: 'mec smc' });
        if (t > 0) c.line(0, 10 + t, 100, 110 + t, { color: 'gold', link: 'tax', dash: t === M ? '14 14' : '12 8', w: t === M ? 4.5 : 4 });

        // curve names: MB at its foot, rising lines just above where they leave the plot
        c.text(c.narrow ? 99 : 97, mb(c.narrow ? 99 : 97), 'MB', { anchor: 'end', dy: -14, color: 'blue', link: 'mb', avoid: false });
        c.text(100, 110, 'PMC', { anchor: 'end', dy: -12, color: 'green', link: 'pmc' });
        if (M > 0 && t === M) c.text(100 - M, 110, 'SMC = PMC + tax', { anchor: 'middle', dy: -12, color: 'orange-ink', link: 'mec smc tax' });
        else {
          if (M > 0) c.text(100 - M, 110, 'SMC', { anchor: 'middle', dy: -12, color: 'orange-ink', link: 'mec smc' });
          if (t > 0) c.text(100 - t, 110, 'PMC + tax', { anchor: 'middle', dy: -12, color: 'gold-ink', link: 'tax', drop: true });
        }

        // the untaxed market, as a ghost once a tax moves it
        if (t > 0 && M > 0) c.dot(QE, mb(QE), { color: 'grey', r: c.narrow ? 5 : 6, link: 'mkt0' });
        // optimum and market points
        var same = Qt === Qs;
        c.line(Qs, 0, Qs, mb(Qs), { color: 'ink', w: 2, dash: '5 6', curve: false, link: 'opt', hit: false });
        if (!same) c.line(Qt, 0, Qt, mb(Qt), { color: 'green', w: 2, dash: '5 6', curve: false, link: 'mkt' + (t === 0 ? ' mkt0' : ''), hit: false });
        var left = Math.min(Qs, Qt), right = Math.max(Qs, Qt);
        if (same) {
          c.text(Qs, 0, 'Q* = ' + Qs, { anchor: 'start', dx: 8, dy: -12, color: 'ink', link: 'opt mkt' });
        } else {
          c.text(left, 0, (left === Qs ? 'Q* = ' : 'Q = ') + left, { anchor: 'end', dx: -8, dy: -12, color: left === Qs ? 'ink' : 'green-ink', link: left === Qs ? 'opt' : 'mkt' });
          c.text(right, 0, (right === Qs ? 'Q* = ' : 'Q = ') + right, { anchor: 'start', dx: 8, dy: -12, color: right === Qs ? 'ink' : 'green-ink', link: right === Qs ? 'opt' : 'mkt' + (t === 0 ? ' mkt0' : '') });
        }
        c.dot(Qs, mb(Qs), { color: 'ink', link: 'opt' });
        if (!same) c.dot(Qt, mb(Qt), { color: 'green', link: 'mkt' + (t === 0 ? ' mkt0' : '') });
        // harm bracket (PMC to SMC) and tax bracket (PMC to PMC + t), placed last so they yield
        var hx = c.narrow ? 10 : 12, tx = c.narrow ? 27 : 25;
        if (M > 0) bracket(c, hx, 10 + hx, 10 + hx + M, $(M), 'orange', 'mec', 'left');
        if (t > 0) bracket(c, tx, 10 + tx, 10 + tx + t, $(t), 'gold', 'tax', 'left');
      });
    }
  });

  /* ===================== Fig 11.2 Cap and trade =====================
     MAC_A = 2 eA, MAC_B = 8 eB, eA + eB = T. Trading: 2eA = 8eB -> eA = 0.8T, eB = 0.2T,
     price = 1.6T. Cost = area under each MAC = eA^2 + 4 eB^2 = 0.8 T^2.
     Equal shares: eA = eB = T/2, cost = 1.25 T^2. Saving 0.45 T^2 = 36%. */
  new LV.Figure(document.getElementById('f112'), {
    state: { T: 100, mode: 'trade' },
    chart: {
      title: 'Marginal abatement cost of two firms against tons cut',
      x: [0, 100], y: [0, 500],
      xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 100, 200, 300, 400, 500],
      yFmt: function (v) { return '$' + v; },
      xLabel: 'Tons cut by a firm', yLabel: '$ for the next ton'
    },
    update: function (f) {
      var T = f.state.T, trade = f.state.mode === 'trade';
      var eA = trade ? 0.8 * T : T / 2, eB = trade ? 0.2 * T : T / 2;
      var p = 1.6 * T, costT = 0.8 * T * T, costE = 1.25 * T * T, save = costE - costT;
      if (trade) {
        f.clause('mode', 'Permits sell for ' + o('price', $(p), 'gold') + ' a ton, and each firm cuts until its next ton costs that much. Cheap Firm A cuts ' +
          o('a', String(eA), 'blue') + ' tons, dear Firm B only ' + o('b', String(eB), 'orange') + '. The bill, the two shaded triangles, comes to ' + o('cost', $(costT), 'ink') + '.');
        f.clause('compare', 'Equal shares would cost ' + o('alt', $(costE), 'ink') + ', so trading saves ' + o('save', $(save), 'green') + ', or ' + o('save', '36%', 'green') + '.');
      } else {
        f.clause('mode', 'Each firm cuts ' + o('a b', String(T / 2), 'ink') + ' tons. Firm A&rsquo;s last ton costs ' + o('a', $(T), 'blue') + ' but Firm B&rsquo;s costs ' +
          o('b', $(4 * T), 'orange') + ', so moving a ton of cleanup from B to A would save ' + o('gap', $(3 * T), 'purple') + '. The bill, the two shaded triangles, comes to ' + o('cost', $(costE), 'ink') + '.');
        f.clause('compare', 'Trading permits would hit the same ' + o('cap', String(T), 'purple') + ' tons for ' + o('alt', $(costT), 'ink') + ', saving ' + o('save', $(save), 'green') + '.');
      }
      f.chart.draw(function (c) {
        c.poly([[0, 0], [eB, 0], [eB, 8 * eB]], { fill: 'orange', opacity: 0.26, link: 'b cost' });
        c.poly([[0, 0], [eA, 0], [eA, 2 * eA]], { fill: 'blue', opacity: 0.22, link: 'a cost' });
        c.line(0, 0, 100, 200, { color: 'blue', link: 'a' });
        c.line(0, 0, 62.5, 500, { color: 'orange', link: 'b' });
        c.text(c.narrow ? 99 : 98, 196, 'Firm A', { anchor: 'end', dy: -16, color: 'blue', link: 'a' });
        c.text(500 / 8, 500, 'Firm B', { anchor: 'start', dx: 12, dy: 20, color: 'orange-ink', link: 'b' });
        if (trade) {
          c.line(0, p, 100, p, { color: 'gold', w: 3, dash: '10 8', link: 'price' });
          var plab = (c.narrow ? 'price ' : 'permit price ') + $(p);
          if (T >= 60) c.text(eB, p, plab, { anchor: 'start', dx: 22, dy: -12, color: 'gold-ink', link: 'price' });
          else c.text(100, p, plab, { anchor: 'end', dy: -12, color: 'gold-ink', link: 'price' });
          c.line(eA, 0, eA, p, { color: 'blue', w: 2, dash: '5 6', curve: false, link: 'a', hit: false });
          c.line(eB, 0, eB, p, { color: 'orange', w: 2, dash: '5 6', curve: false, link: 'b', hit: false });
          c.dot(eA, p, { color: 'blue', link: 'a' });
          c.dot(eB, p, { color: 'orange', link: 'b' });
          c.text(eA, 0, 'A: ' + eA, { anchor: 'start', dx: 8, dy: -12, color: 'blue-ink', link: 'a' });
          c.text(eB, 0, 'B: ' + eB, { anchor: 'start', dx: 8, dy: -12, color: 'orange-ink', link: 'b' });
        } else {
          var e = T / 2;
          c.line(e, 0, e, 4 * T, { color: 'ink', w: 2, dash: '5 6', curve: false, link: 'a b', hit: false });
          c.vArrow(e, T, 4 * T, { color: 'purple', link: 'gap', both: true });
          c.text(e, 2.5 * T, $(3 * T) + ' gap', { anchor: 'start', dx: 12, dy: 7, color: 'purple-ink', link: 'gap' });
          c.dot(e, T, { color: 'blue', link: 'a' });
          c.dot(e, 4 * T, { color: 'orange', link: 'b' });
          c.text(e, 0, 'each: ' + e, { anchor: 'start', dx: 8, dy: -12, color: 'ink', link: 'a b' });
        }
      });
    }
  });

  /* ===================== Fig 11.3 Pigouvian subsidy =====================
     MB = 100 - Q, MC = 10 + Q, MSB = MB + MEB.
     With subsidy s: 100 - Q + s = 10 + Q -> Q = (90 + s) / 2. Optimum Q* = (90 + MEB) / 2.
     DWL = (Q_s - Q*)^2. At MEB 20, s 0: Q 45, Q* 55, DWL 100 (= MEB^2 / 4 on the site). */
  new LV.Figure(document.getElementById('f113'), {
    state: { meb: 20, sub: 0 },
    actions: { match: function (f) { f.tween('sub', f.state.meb); } },
    chart: {
      title: 'Private benefit, social benefit and cost against quantity of flu shots',
      x: [0, 100], y: [0, 150],
      xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 25, 50, 75, 100, 125, 150],
      yFmt: function (v) { return '$' + v; },
      xLabel: 'Flu shots', yLabel: '$ per shot'
    },
    update: function (f) {
      var B = f.state.meb, s = f.state.sub;
      var QE = 45, Qs = (90 + B) / 2, Qt = (90 + s) / 2;
      var d = Qs - Qt, dwl = d * d, dwl0 = (Qs - QE) * (Qs - QE);
      f.clause('base', B === 0
        ? 'With no benefit to others, your value is the whole value. Left alone, people buy ' + o('mkt0', '45', 'blue') + ' shots, already the best amount.'
        : 'Left alone, people buy ' + o('mkt0', '45', 'blue') + ' shots, ignoring that benefit. Counting it, the best amount is ' + o('opt', String(Qs), 'ink') +
          ', so the market falls ' + o('short0', String(Qs - QE), 'red') + ' short, losing ' + o('dwl0', $(dwl0), 'red') + ' of value' + (s === 0 ? ' (the red triangle).' : '.'));
      var act = ' <button class="act" type="button" data-act="match">Match the subsidy to the benefit</button>.';
      var sc;
      if (s === 0) sc = B === 0 ? 'No subsidy is needed here.' : 'Try raising it, or' + act.replace('Match', 'match');
      else if (s === B) sc = 'That equals the benefit to others, so buyers now count it. People buy the best amount, ' + o('mkt opt', String(Qt), 'ink') +
        ' shots, and no value is lost. A shot sells for ' + o('pb', $(10 + Qt), 'orange') + ', but with the subsidy it costs the buyer only ' + o('pn', $(100 - Qt), 'blue') + '.';
      else if (s < B) sc = 'People buy ' + o('mkt', String(Qt), 'blue') + ' shots, still ' + o('short', String(d), 'red') + ' short, so ' + o('dwl', $(dwl), 'red') + ' of value is still lost.' + act;
      else sc = 'That is ' + (B === 0 ? 'a subsidy with no spillover to pay for' : 'more than the benefit') + ', so now people buy too many: ' + o('mkt', String(Qt), 'blue') + ' shots, ' +
        o('short', String(-d), 'red') + ' past the best, wasting ' + o('dwl', $(dwl), 'red') + '.' + (B === 0 ? '' : act);
      f.clause('sub', sc);

      f.chart.draw(function (c) {
        var mc = function (q) { return 10 + q; };
        if (d !== 0) c.poly([[Qs, mc(Qs)], [Qt, mc(Qt)], [Qt, 100 - Qt + B]], { fill: 'red', opacity: 0.3, link: 'dwl short' + (s === 0 ? ' dwl0 short0' : '') });
        c.line(0, 10, 100, 110, { color: 'orange', link: 'mc pb' });
        c.line(0, 100, 100, 0, { color: 'blue', link: 'mb pn' });
        if (B > 0) c.line(0, 100 + B, 100, B, { color: 'green', link: 'meb msb' });
        if (s > 0) c.line(0, 100 + s, 100, s, { color: 'gold', link: 'sub', dash: s === B ? '14 14' : '12 8', w: s === B ? 4.5 : 4 });

        // curve names at the right edge, stacked from the bottom up
        c.text(c.narrow ? 99 : 98, 0, 'MB', { anchor: 'end', dy: -10, color: 'blue', link: 'mb', nudge: -1 });
        if (B > 0 && s === B) c.text(100, B, 'MSB = MB + subsidy', { anchor: 'end', dy: -14, color: 'green-ink', link: 'meb msb sub' });
        else {
          if (B > 0) c.text(100, B, 'MSB', { anchor: 'end', dy: -14, color: 'green-ink', link: 'meb msb' });
          if (s > 0) c.text(100, s, 'MB + subsidy', { anchor: 'end', dy: -14, color: 'gold-ink', link: 'sub', drop: true });
        }
        c.text(c.narrow ? 99 : 90, mc(c.narrow ? 99 : 90), 'MC', { anchor: 'end', dx: -12, dy: -4, color: 'orange-ink', link: 'mc' });

        if (s > 0 && B > 0) c.dot(QE, mc(QE), { color: 'grey', r: c.narrow ? 5 : 6, link: 'mkt0' });
        var same = Qt === Qs;
        c.line(Qs, 0, Qs, mc(Qs), { color: 'ink', w: 2, dash: '5 6', curve: false, link: 'opt', hit: false });
        if (!same) c.line(Qt, 0, Qt, mc(Qt), { color: 'blue', w: 2, dash: '5 6', curve: false, link: 'mkt' + (s === 0 ? ' mkt0' : ''), hit: false });
        var left = Math.min(Qs, Qt), right = Math.max(Qs, Qt);
        var qlab = [];
        if (same) qlab.push(c.text(Qs, 0, 'Q* = ' + Qs, { anchor: 'middle', dy: c.narrow ? 23 : 27, avoid: false, color: 'ink', link: 'opt mkt' }));
        else {
          qlab.push(c.text(left, 0, (left === Qs ? 'Q* = ' : 'Q = ') + left, { anchor: 'end', dx: -4, dy: c.narrow ? 23 : 27, avoid: false, color: left === Qs ? 'ink' : 'blue-ink', link: left === Qs ? 'opt' : 'mkt' + (s === 0 ? ' mkt0' : '') }));
          qlab.push(c.text(right, 0, (right === Qs ? 'Q* = ' : 'Q = ') + right, { anchor: 'start', dx: 4, dy: c.narrow ? 23 : 27, avoid: false, color: right === Qs ? 'ink' : 'blue-ink', link: right === Qs ? 'opt' : 'mkt' }));
        }
        c.dot(Qs, mc(Qs), { color: 'ink', link: 'opt' });
        if (!same) c.dot(Qt, mc(Qt), { color: 'blue', link: 'mkt' + (s === 0 ? ' mkt0' : '') });
        c.hideTicksUnder(qlab);
        var hx = c.narrow ? 8 : 9, tx = c.narrow ? 25 : 22;
        if (B > 0) bracket(c, hx, 100 - hx, 100 - hx + B, $(B), 'green', 'meb', 'right');
        if (s > 0) bracket(c, tx, 100 - tx, 100 - tx + s, $(s), 'gold', 'sub', 'right');
      });
    }
  });

  /* ===================== Fig 11.4 Public goods =====================
     A guard costs c. N neighbors each value it at v. Non-rival, so values add vertically:
     total = N v. Efficient iff N v > c. Provided privately only if someone's own v >= c. */
  function niceMax(v) {
    var steps = [100, 200, 250, 500, 1000];
    for (var i = 0; i < steps.length; i++) { var s = steps[i]; if (v / s <= 6) return { max: Math.ceil(v / s) * s, step: s }; }
    return { max: Math.ceil(v / 500) * 500, step: 500 };
  }
  function scale114(st) { return niceMax(Math.max(st.n * st.v, st.cost, 300) * 1.12); }
  new LV.Figure(document.getElementById('f114'), {
    state: { n: 3, cost: 300, v: 120 },
    chart: {
      title: 'Neighbors’ values stacked against the cost of the guard',
      x: [0, 100], y: function (st) { return [0, scale114(st).max]; },
      xTicks: [], yTicks: function (st) { var s = scale114(st), a = []; for (var v = 0; v <= s.max; v += s.step) a.push(v); return a; },
      yFmt: function (v) { return '$' + v.toLocaleString('en-US'); },
      xLabel: '', yLabel: '$ a month',
      margin: { wide: { l: 78, b: 60 }, narrow: { l: 58, b: 52 } }
    },
    update: function (f) {
      var N = f.state.n, v = f.state.v, C = f.state.cost, total = N * v, gap = total - C;
      var people = N === 1 ? 'one neighbor' : N + ' neighbors';
      var txt;
      if (N === 1) txt = 'With only one neighbor, the guard is worth ' + o('total', $(total), 'blue') + ' to the street. ';
      else txt = 'Everyone is protected by the same guard, so their values stack on top of each other: to all ' + o('n', String(N), 'blue') + ' together the guard is worth ' + o('total', $(total), 'blue') + '. ';
      if (v >= C) txt += 'A single neighbor already values it at ' + o('v', $(v), 'blue') + ', at least the ' + o('cost', $(C), 'orange') + ' it costs, so someone hires the guard alone. No free-rider problem here.';
      else if (gap > 0) txt += 'That beats the cost by ' + o('surplus', $(gap), 'green') + ', so hiring the guard is worth it. But no one values it at ' + o('cost', $(C), 'orange') +
        (N === 1 ? '.' : ' alone, and each would rather let the others pay. Everyone waits, nobody pays, and the ' + o('surplus', $(gap), 'green') + ' gain is lost.');
      else if (gap === 0) txt += 'That exactly equals the cost, so hiring the guard creates no gain and leaving it unhired loses nothing.';
      else txt += 'That falls ' + o('short', $(-gap), 'red') + ' short of the ' + o('cost', $(C), 'orange') + ' cost, so not hiring the guard is the right call. Free riding costs nothing here.';
      f.clause('sum', txt);

      f.chart.draw(function (c) {
        var cx = c.narrow ? 34 : 32, half = c.narrow ? 19 : 16, sx = c.narrow ? 80 : 76;
        // stacked blocks: one per neighbor
        for (var i = 0; i < N; i++) {
          if (v > 0) c.rect(cx - half, i * v, cx + half, (i + 1) * v, { fill: i % 2 ? '#3d86c6' : 'blue', stroke: '#eff1ee', sw: 2, link: 'n v total' });
        }
        var blockPx = c.Y(0) - c.Y(v);
        if (v > 0 && blockPx >= 30) {
          for (var j = 0; j < N; j++) if (Math.abs(c.Y(j * v + v / 2) - c.Y(C)) > 16) c.raw('text', { x: c.X(cx), y: c.Y(j * v + v / 2) + 7, 'text-anchor': 'middle', fill: '#fff', class: 'lbl', style: 'stroke:none', 'data-link': 'v' }, 'labels').textContent = $(v);
        }
        // one neighbor alone
        if (v > 0) c.rect(sx - half, 0, sx + half, v, { fill: 'blue', stroke: '#eff1ee', sw: 2, link: 'v' });
        if (v > 0 && blockPx >= 30 && Math.abs(c.Y(v / 2) - c.Y(C)) > 16) c.raw('text', { x: c.X(sx), y: c.Y(v / 2) + 7, 'text-anchor': 'middle', fill: '#fff', class: 'lbl', style: 'stroke:none', 'data-link': 'v' }, 'labels').textContent = $(v);
        // surplus or shortfall bracket beside the stack
        var bx = cx + half + (c.narrow ? 7 : 5);
        if (gap > 0) {
          c.rect(cx - half, C, cx + half, total, { fill: 'green', opacity: 0.0, stroke: 'green', sw: 4, link: 'surplus' });
          c.vArrow(bx, C, total, { color: 'green', link: 'surplus', both: true });
          c.text(bx, (C + total) / 2, '+' + $(gap), { anchor: 'start', dx: 12, dy: 7, color: 'green-ink', link: 'surplus' });
        } else if (gap < 0) {
          c.vArrow(bx, total, C, { color: 'red', link: 'short', both: true });
          c.text(bx, (C + total) / 2, '−' + $(-gap), { anchor: 'start', dx: 12, dy: 7, color: 'red-ink', link: 'short' });
        }
        // cost line across both columns
        c.line(0, C, 100, C, { color: 'orange', w: 4, dash: '12 8', link: 'cost', top: true });
        c.text(100, C, 'cost ' + $(C), { anchor: 'end', dy: -12, color: 'orange-ink', link: 'cost' });
        // column captions
        c.text(cx, 0, N === 1 ? 'The only neighbor' : 'All ' + N + ' together', { anchor: 'middle', dy: c.narrow ? 24 : 30, color: 'ink', soft: true, link: 'n total', avoid: false });
        c.text(sx, 0, 'One neighbor', { anchor: 'middle', dy: c.narrow ? 24 : 30, color: 'ink', soft: true, link: 'v', avoid: false });
        c.text(cx, total, $(total), { anchor: 'middle', dy: -12, color: 'blue-ink', link: 'total' });
      });
    }
  });

  /* ===================== Fig 11.5 Coase =====================
     MB(S) = 100 - 2S (factory), MD(S) = 2S (neighbor). S* = 25.
     Gains from moving S to 25 = area between curves = 2 (S - 25)^2.
     S > 25: neighbor pays factory, between factory's lost benefit 100S - S^2 - 1875 and the
     neighbor's avoided damage S^2 - 625. S < 25: factory pays neighbor, between the
     neighbor's added damage 625 - S^2 and the factory's gain 1875 - 100S + S^2. */
  new LV.Figure(document.getElementById('f115'), {
    state: { owner: 'factory', S: 50, tc: 0 },
    actions: {
      'choose:owner': function (f, who) { f.render(); f.tween('S', who === 'factory' ? 50 : 0, 520); }
    },
    chart: {
      title: 'Factory marginal benefit and neighbor marginal damage against pollution',
      x: [0, 50], y: [0, 100],
      xTicks: [0, 10, 20, 30, 40, 50], yTicks: [0, 20, 40, 60, 80, 100],
      yFmt: function (v) { return '$' + v; },
      xLabel: 'Pollution, S', yLabel: '$ per unit'
    },
    update: function (f) {
      var S = f.state.S, tc = f.state.tc;
      var mb = 100 - 2 * S, md = 2 * S, gains = 2 * (S - 25) * (S - 25);
      var lo, hi, pos;
      f.clause('start', 'so pollution starts at ' + o('S', String(S), 'plum') + ' units.');
      if (S > 25) {
        lo = 100 * S - S * S - 1875; hi = S * S - 625;
        pos = 'There the next unit costs the neighbor ' + o('mdS', $(md), 'red') + ' but is worth only ' + o('mbS', $(mb), 'blue') + ' to the factory, so the neighbor will pay the factory to cut back.';
      } else if (S < 25) {
        lo = 625 - S * S; hi = 1875 - 100 * S + S * S;
        pos = 'There the next unit is worth ' + o('mbS', $(mb), 'blue') + ' to the factory but costs the neighbor only ' + o('mdS', $(md), 'red') + ', so the factory will pay the neighbor for permission to pollute more.';
      } else pos = 'That is already the efficient level: the next unit is worth $50 to the factory and costs the neighbor $50, so there is nothing to bargain over.';
      if (S !== 25) pos += ' Moving to 25 creates ' + o('gains', $(gains), 'green') + ' of gains, the green wedge, and the payment lands somewhere between ' +
        o('lo', $(lo), 'ink') + ' and ' + o('hi', $(hi), 'ink') + '.';
      f.clause('pos', pos);
      var deal = S === 25 ? '' : tc < gains
        ? 'That is less than the gains, so they strike a deal and pollution ends at ' + o('opt', '25', 'ink') + ', whoever owns the right.'
        : 'That swallows all ' + o('gains', $(gains), 'green') + ' of the gains, so no deal is struck and pollution stays at ' + o('S', String(S), 'plum') + ', ' + (S > 25 ? 'too high' : 'too low') + '. Coase needs cheap bargaining.';
      f.clause('deal', deal);

      f.chart.draw(function (c) {
        if (S !== 25) {
          var a = Math.min(S, 25), b = Math.max(S, 25);
          c.poly([[a, 100 - 2 * a], [a, 2 * a], [b, 2 * b], [b, 100 - 2 * b]], { fill: 'green', opacity: tc < gains ? 0.3 : 0.12, link: 'gains lo hi' });
        }
        c.line(0, 100, 50, 0, { color: 'blue', link: 'mb mbS' });
        c.line(0, 0, 50, 100, { color: 'red', link: 'md mdS' });
        c.text(8, 100 - 2 * 8, 'Factory’s benefit', { anchor: 'start', dx: 14, dy: 6, color: 'blue', link: 'mb' });
        c.text(8, 2 * 8, 'Neighbor’s damage', { anchor: 'start', dx: 14, dy: 6, color: 'red-ink', link: 'md' });
        // S* marker
        c.line(25, 0, 25, 50, { color: 'ink', w: 2, dash: '5 6', curve: false, link: 'opt', hit: false });
        // where pollution starts
        if (S !== 25) {
          c.line(S, 0, S, Math.max(mb, md), { color: 'plum', w: 2.5, dash: '5 6', curve: false, link: 'S', hit: false });
          c.dot(S, mb, { color: 'blue', link: 'mbS' });
          c.dot(S, md, { color: 'red', link: 'mdS' });
          c.text(S, Math.max(mb, md), 'S = ' + S, { anchor: S >= 45 ? 'end' : S <= 5 ? 'start' : 'middle', dx: S >= 45 ? -16 : S <= 5 ? 16 : 0, dy: S >= 45 || S <= 5 ? -2 : -16, color: 'plum', link: 'S' });
          if (tc < gains) c.hArrow(c.narrow ? 4 : 4, S, 25, { color: 'green', link: 'gains opt' });
        }
        c.dot(25, 50, { color: 'ink', link: 'opt' });
        c.text(25, 50, 'S* = 25', { anchor: 'start', dx: 14, dy: 6, color: 'ink', link: 'opt' });
      });
    }
  });

  // First-time hint sits on the first number on the page.
  LV.showHint(document.querySelector('#f111 .scrub'));
})();
