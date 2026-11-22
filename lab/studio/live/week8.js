/* Week 8 studio: live equations. The monopoly two-step rule and the welfare it costs. */
(function () {
  'use strict';
  var C = Tangle.C, fmt = Tangle.fmt;

  StudioLive.place('sec-84', {
    title: 'The two-step rule, with every number live',
    lede: 'Demand P = a − bQ and a constant marginal cost c (the film uses a = 10, b = 1, c = 2). Drag any plum number.',
    params: {
      a: { value: 10, min: 6, max: 20, step: 0.5, pre: '$', label: 'demand intercept a' },
      b: { value: 1, min: 0.5, max: 3, step: 0.25, label: 'demand slope b' },
      c: { value: 2, min: 0, max: 8, step: 0.5, pre: '$', label: 'marginal cost c' }
    },
    derive: function (v) {
      var Q = Math.max(0, (v.a - v.c) / (2 * v.b)), P = v.a - v.b * Q, Qc = Math.max(0, (v.a - v.c) / v.b);
      return { Q: Q, P: P, Qc: Qc, pi: (P - v.c) * Q, cs: 0.5 * (v.a - P) * Q, dwl: 0.5 * (P - v.c) * (Qc - Q), ts: 0.5 * (v.a - v.c) * Qc, two: 2 * v.b };
    },
    outs: { Q: { dp: 2, c: 'blue' }, P: { dp: 2, pre: '$', c: 'blue' }, Qc: { dp: 2 }, pi: { dp: 2, pre: '$', c: 'gold' }, cs: { dp: 2, pre: '$', c: 'blue' }, dwl: { dp: 2, pre: '$', c: 'red' }, ts: { dp: 2, pre: '$' }, two: { dp: 2 } },
    tex: [
      'MR = \\tangle{a} - \\out{two}\\,Q \\;=\\; MC = \\tangle{c} \\;\\Rightarrow\\; Q^{*} = \\frac{\\tangle{a} - \\tangle{c}}{2 \\cdot \\tangle{b}} = \\out{Q}',
      'P^{*} = \\tangle{a} - \\tangle{b}\\,Q^{*} = \\out{P} \\qquad \\pi = (P^{*} - c)\\,Q^{*} = \\out{pi}',
      'DWL = \\tfrac12 (P^{*} - c)(Q_c - Q^{*}) = \\out{dwl}'
    ],
    prose: 'The monopolist sells {=Q} units at {=P}. A competitive market would sell {=Qc} at {c}. Of the {=ts} of surplus competition would create, buyers keep {=cs}, the firm takes {=pi}, and {=dwl} is lost.',
    chart: {
      x: function (v) { return [0, v.a / v.b * 1.06]; }, y: function (v) { return [0, v.a * 1.1]; }, xl: 'Q', yl: 'P',
      alt: 'Demand, marginal revenue and marginal cost with consumer surplus, profit and deadweight loss shaded',
      draw: function (g, v, d, v0, d0) {
        var top = v.a, Qmax = v.a / v.b;
        if (d.Q > 0) {
          g.area([[0, top], [0, d.P], [d.Q, d.P]], { c: 'blue', op: 0.2 });
          g.area([[0, d.P], [d.Q, d.P], [d.Q, v.c], [0, v.c]], { c: 'gold', op: 0.32 });
          g.area([[d.Q, d.P], [d.Qc, v.c], [d.Q, v.c]], { c: 'red', op: 0.3 });
        }
        if (d0 && d0.Q > 0) g.dot(d0.Q, d0.P, { c: C.grey, r: 5 });
        g.line([[0, top], [Qmax, 0]], { c: 'blue', w: 3 });
        g.line([[0, top], [Qmax / 2, 0]], { c: 'orange', w: 3 });
        g.line([[0, v.c], [Qmax * 1.06, v.c]], { c: 'ink', w: 2.5 });
        g.text(Qmax * 0.93, v.b * Qmax * 0.07 + 0.5, 'D', { c: 'blue' });
        g.text(Qmax * 0.47, top * 0.06, 'MR', { c: 'orange', anchor: 'end', dx: -6 });
        g.text(Qmax * 1.04, v.c, 'MC', { c: 'ink', anchor: 'end', dy: -8 });
        if (d.Q > 0) {
          g.guide(d.Q, d.P, {});
          g.dot(d.Q, v.c, { c: C.orange, r: 5 });
          g.dot(d.Q, d.P, { c: C.plum, r: 7 });
          g.text(d.Q, d.P, 'P* = ' + fmt(d.P, { dp: 2, pre: '$' }), { c: 'ink', dx: 10, dy: -10 });
          if (d.pi > 0.5) g.text(d.Q / 2, (d.P + v.c) / 2, 'profit', { c: 'gold', anchor: 'middle', dy: 5, small: true });
          if (d.dwl > 0.5) g.text(d.Q + (d.Qc - d.Q) / 3, v.c + (d.P - v.c) / 3, 'DWL', { c: 'red', anchor: 'middle', dy: 5, small: true });
        }
      }
    },
    notes: 'Notice the shares never change, whatever you drag: with linear demand and constant MC, profit is always half of the surplus competition would create, and consumer surplus and the deadweight loss a quarter each. The gap a − c and the slope b only change the size of the pie.'
  }, { after: 'figure', kicker: 'Live equation · 8.4' });
})();
