/* Week 2 studio: live equations. Consumer choice: the tangency test, and Cobb-Douglas demand. */
(function () {
  'use strict';
  var C = Tangle.C;

  /* 2.7 The consumer's best choice: pick a bundle on the budget line, compare MRS with the price ratio. */
  StudioLive.place('sec-optimum', {
    title: 'Is this bundle the best one?',
    lede: 'U = X<sup>½</sup>Y<sup>½</sup>, income $100, P<sub>X</sub> = $5, P<sub>Y</sub> = $10. Drag X to slide along the budget line and watch the two slopes.',
    params: { X: { value: 4, min: 1, max: 19, step: 0.5, label: 'units of X' } },
    derive: function (v) {
      var I = 100, px = 5, py = 10, X = v.X, Y = (I - px * X) / py, mrs = Y / X, r = px / py;
      var verdict = Math.abs(mrs - r) < 1e-9 ? 'the best affordable bundle: MRS = price ratio' :
        mrs > r ? 'not the best: MRS is above the price ratio, so buy more X' : 'not the best: MRS is below the price ratio, so buy less X';
      return { Y: Y, U: Math.sqrt(X * Y), mrs: mrs, r: r, verdict: verdict };
    },
    outs: { Y: { dp: 2 }, U: { dp: 2, c: 'blue' }, mrs: { dp: 2, c: 'blue' }, r: { dp: 2, c: 'orange' }, verdict: {} },
    tex: [
      'Y = \\frac{100 - 5\\,\\tangle{X}}{10} = \\out{Y}',
      'MRS = \\frac{MU_X}{MU_Y} = \\frac{Y}{X} = \\out{mrs} \\quad\\text{vs}\\quad \\frac{P_X}{P_Y} = \\out{r}'
    ],
    prose: 'At X = {X} the consumer gets utility {=U}. This bundle is {=verdict}.',
    chart: {
      x: [0, 21], y: [0, 11], xl: 'X', yl: 'Y', alt: 'Budget line with the chosen bundle, its indifference curve, and the optimal indifference curve',
      draw: function (g, v, d, v0) {
        var U = d.U, Ustar = Math.sqrt(10 * 5);
        g.line([[0, 10], [20, 0]], { c: 'ink', w: 3 });
        g.text(17.2, 2.2, 'budget', { c: 'ink' });
        g.fn(function (x) { return Ustar * Ustar / x; }, { from: 2.3, to: 21, c: 'blue', w: 2, dash: true, op: 0.7 });
        g.text(19, Ustar * Ustar / 19 + 0.9, 'best IC', { c: 'blue', small: true, anchor: 'end' });
        if (v0) { var Y0 = (100 - 5 * v0.X) / 10; g.dot(v0.X, Y0, { c: C.grey, r: 5 }); }
        g.fn(function (x) { return U * U / x; }, { from: Math.max(0.5, U * U / 11), to: 21, c: 'blue', w: 3 });
        g.guide(v.X, d.Y, {});
        g.dot(v.X, d.Y, { c: C.plum, r: 7 });
        g.text(v.X, d.Y, '(' + Tangle.fmt(v.X, { dp: 1 }) + ', ' + Tangle.fmt(d.Y, { dp: 1 }) + ')', { c: 'ink', dx: 10, dy: -10 });
      }
    },
    notes: 'The best bundle is X = 10, Y = 5, where the indifference curve just touches the budget line. Left of it the curve through your bundle is steeper than the budget line (MRS > 0.5); right of it, flatter.'
  }, { after: 'figure', kicker: 'Live equation · 2.7' });

  /* 2.9 Cobb-Douglas demand functions */
  StudioLive.place('sec-cobb', {
    title: 'Cobb-Douglas demand, live',
    lede: 'Every number in plum can be dragged. Change a price and see which demand moves, and which spending share does not.',
    params: {
      al: { value: 0.5, min: 0.1, max: 0.9, step: 0.1, label: 'α, the weight on X' },
      be: { value: 0.5, min: 0.1, max: 0.9, step: 0.1, label: 'β, the weight on Y' },
      I: { value: 120, min: 60, max: 160, step: 10, pre: '$', label: 'income' },
      px: { value: 4, min: 4, max: 10, step: 0.5, pre: '$', label: 'price of X' },
      py: { value: 6, min: 4, max: 10, step: 0.5, pre: '$', label: 'price of Y' }
    },
    derive: function (v) {
      var s = v.al / (v.al + v.be);
      return { X: s * v.I / v.px, Y: (1 - s) * v.I / v.py, sx: 100 * s, sy: 100 * (1 - s), spx: s * v.I };
    },
    outs: { X: { dp: 2, c: 'blue' }, Y: { dp: 2, c: 'blue' }, sx: { dp: 0, post: '%', c: 'orange' }, sy: { dp: 0, post: '%', c: 'orange' }, spx: { dp: 2, pre: '$' } },
    tex: [
      'X^{*} = \\frac{\\tangle{al}}{\\tangle{al} + \\tangle{be}} \\cdot \\frac{\\tangle{I}}{\\tangle{px}} = \\out{X}',
      'Y^{*} = \\frac{\\tangle{be}}{\\tangle{al} + \\tangle{be}} \\cdot \\frac{\\tangle{I}}{\\tangle{py}} = \\out{Y}'
    ],
    prose: 'The consumer spends {=sx} of income on X ({=spx}) and {=sy} on Y. Drag P<sub>X</sub>: X* moves, Y* and the shares do not.',
    chart: {
      x: [0, 42], y: [0, 42], xl: 'X', yl: 'Y', alt: 'Budget line, the indifference curve through the optimal bundle, and the income expansion path',
      draw: function (g, v, d, v0, d0) {
        var a = v.al, b = v.be;
        if (v0) g.line([[0, v0.I / v0.py], [v0.I / v0.px, 0]], { c: 'grey', w: 2, dash: true });
        g.line([[0, 0], [42, 42 * d.Y / d.X]], { c: 'grey', w: 1.5, dash: '2 5' });
        g.line([[0, v.I / v.py], [v.I / v.px, 0]], { c: 'ink', w: 3 });
        var U = Math.pow(d.X, a) * Math.pow(d.Y, b);
        g.fn(function (x) { return Math.pow(U / Math.pow(x, a), 1 / b); }, { from: 0.4, to: 42, c: 'blue', w: 3 });
        if (d0) g.dot(d0.X, d0.Y, { c: C.grey, r: 5 });
        g.guide(d.X, d.Y, {});
        g.dot(d.X, d.Y, { c: C.blue, r: 7 });
        g.text(d.X, d.Y, 'X* = ' + Tangle.fmt(d.X, { dp: 1 }) + ', Y* = ' + Tangle.fmt(d.Y, { dp: 1 }), { c: 'blue', dx: 10, dy: -12 });
        var ex = Math.min(40, 40 * d.X / Math.max(d.Y, d.X));
        g.text(ex, ex * d.Y / d.X, 'expansion path', { c: 'ink', small: true, anchor: 'end', dy: -8 });
      }
    },
    notes: 'The dotted ray is the income expansion path: drag income and the bundle slides along it, so both goods scale in proportion (homotheticity). While you drag, the dashed line and grey dot show where you started.'
  }, { after: 'prose', kicker: 'Live equation · 2.9' });
})();
