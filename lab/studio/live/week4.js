/* Week 4 studio: live equations. Elasticity along a linear demand curve, and the revenue rectangle. */
(function () {
  'use strict';
  var C = Tangle.C, fmt = Tangle.fmt;
  function word(e) { var a = Math.abs(e); return !isFinite(a) ? 'not defined (nothing sells)' : Math.abs(a - 1) < 1e-9 ? 'unit elastic' : a > 1 ? 'elastic' : 'inelastic'; }

  /* 4.2 Elasticity at a point */
  StudioLive.place('sec-4-2', {
    title: 'Elasticity at any point, as algebra',
    lede: 'Linear demand Q = a − bP. Drag the price to move along the curve, or drag a and b to reshape it.',
    params: {
      a: { value: 120, min: 60, max: 160, step: 5, label: 'demand intercept a' },
      b: { value: 4, min: 2, max: 8, step: 0.5, label: 'slope b' },
      P: { value: 10, min: 0.5, max: 39.5, step: 0.5, pre: '$', label: 'price' }
    },
    derive: function (v) {
      var Q = Math.max(0, v.a - v.b * v.P), e = Q > 0 ? -v.b * v.P / Q : -Infinity;
      var rev = !isFinite(e) ? 'is zero' : Math.abs(Math.abs(e) - 1) < 1e-9 ? 'does not change' : Math.abs(e) > 1 ? 'falls' : 'rises';
      return { Q: Q, e: e, TR: v.P * Q, w: word(e), pct: isFinite(e) ? Math.abs(e) : NaN, rev: rev, mid: v.a / (2 * v.b) };
    },
    outs: { Q: { dp: 2, c: 'blue' }, e: { dp: 2, c: 'orange' }, TR: { dp: 2, pre: '$', c: 'gold' }, w: { c: 'orange' }, pct: { dp: 2, post: '%' }, rev: {}, mid: { dp: 2, pre: '$' } },
    tex: [
      'Q = \\tangle{a} - \\tangle{b}\\cdot\\tangle{P} = \\out{Q}',
      '\\varepsilon = -b\\,\\frac{P}{Q} = -\\tangle{b}\\cdot\\frac{\\tangle{P}}{\\out{Q}} = \\out{e}'
    ],
    prose: 'Here demand is {=w}: a 1% price rise cuts quantity by about {=pct}, so total revenue ({=TR} now) {=rev}. The unit-elastic price, halfway up the line, is {=mid}.',
    chart: {
      x: function (v) { return [0, v.a * 1.08]; }, y: function (v) { return [0, v.a / v.b * 1.12]; }, xl: 'Q', yl: 'P',
      alt: 'Linear demand curve, elastic upper half and inelastic lower half, with the chosen point and its revenue rectangle',
      draw: function (g, v, d, v0, d0) {
        var top = v.a / v.b, mid = top / 2;
        if (d.Q > 0) g.area([[0, 0], [0, v.P], [d.Q, v.P], [d.Q, 0]], { c: 'gold', op: 0.22 });
        g.line([[0, top], [v.a / 2, mid]], { c: 'orange', w: 4 });
        g.line([[v.a / 2, mid], [v.a, 0]], { c: 'blue', w: 4 });
        g.text(v.a * 0.16, top * 0.86, 'elastic', { c: 'orange', dx: 8 });
        g.text(v.a * 0.78, top * 0.2, 'inelastic', { c: 'blue', dx: 8 });
        g.dot(v.a / 2, mid, { c: C.ink, r: 4 });
        g.text(v.a / 2, mid, '|ε| = 1', { c: 'ink', small: true, dx: 9, dy: 4 });
        if (d0 && d0.Q > 0) g.dot(d0.Q, v0.P, { c: C.grey, r: 5 });
        if (d.Q > 0) { g.guide(d.Q, v.P, {}); g.dot(d.Q, v.P, { c: C.plum, r: 7 }); g.text(d.Q, v.P, 'ε = ' + fmt(d.e, { dp: 2 }), { c: 'ink', dx: 10, dy: -10 }); }
        if (d.Q > 0) g.text(d.Q / 2, v.P / 2, 'TR', { c: 'gold', anchor: 'middle', dy: 5 });
      }
    },
    notes: 'The slope of the line is the same everywhere, but elasticity is not: it depends on P/Q, so it falls from very elastic near the top to zero at the bottom.'
  }, { after: 'figure', kicker: 'Live equation · 4.2' });

  /* 4.3 Revenue rectangle: the price effect and the quantity effect */
  StudioLive.place('sec-4-3', {
    title: 'Where the revenue goes when the price changes',
    lede: 'Demand Q = 120 − 4P. Drag the old and the new price. The change in revenue splits into a gain on the units still sold and a loss on the units no longer sold.',
    params: {
      P0: { value: 10, min: 1, max: 29, step: 1, pre: '$', label: 'old price' },
      P1: { value: 12, min: 1, max: 29, step: 1, pre: '$', label: 'new price' }
    },
    derive: function (v) {
      // price effect: the price change on the units still sold; quantity effect: the units gained or lost
      var Q0 = 120 - 4 * v.P0, Q1 = 120 - 4 * v.P1;
      return { Q0: Q0, Q1: Q1, TR0: v.P0 * Q0, TR1: v.P1 * Q1, pe: v.P1 >= v.P0 ? (v.P1 - v.P0) * Q1 : -(v.P0 - v.P1) * Q0, qe: v.P1 >= v.P0 ? -v.P0 * (Q0 - Q1) : v.P1 * (Q1 - Q0), dTR: v.P1 * Q1 - v.P0 * Q0 };
    },
    outs: { Q0: { dp: 0 }, Q1: { dp: 0 }, TR0: { dp: 0, pre: '$' }, TR1: { dp: 0, pre: '$', c: 'gold' }, pe: { dp: 0, pre: '$', c: 'green' }, qe: { dp: 0, pre: '$', c: 'red' }, dTR: { dp: 0, pre: '$', c: 'ink' } },
    tex: ['\\Delta TR = \\underbrace{\\out{TR1}}_{P_1 Q_1} - \\underbrace{\\out{TR0}}_{P_0 Q_0} = \\out{dTR}'],
    prose: 'Moving the price from {P0} to {P1}: the price effect is {=pe} and the quantity effect is {=qe}, for a net change of {=dTR}.',
    chart: {
      x: [0, 125], y: [0, 32], xl: 'Q', yl: 'P', alt: 'Demand curve with the old and new revenue rectangles; the gained strip is green and the lost strip is red',
      draw: function (g, v, d) {
        var lo = Math.min(v.P0, v.P1), hi = Math.max(v.P0, v.P1), Qlo = 120 - 4 * hi, Qhi = 120 - 4 * lo;
        g.area([[0, 0], [0, lo], [Qlo, lo], [Qlo, 0]], { c: 'gold', op: 0.25 });                 // kept either way
        if (v.P1 > v.P0) { g.area([[0, lo], [0, hi], [Qlo, hi], [Qlo, lo]], { c: 'green', op: 0.35 }); g.area([[Qlo, 0], [Qlo, lo], [Qhi, lo], [Qhi, 0]], { c: 'red', op: 0.3 }); }
        else if (v.P1 < v.P0) { g.area([[0, lo], [0, hi], [Qlo, hi], [Qlo, lo]], { c: 'red', op: 0.3 }); g.area([[Qlo, 0], [Qlo, lo], [Qhi, lo], [Qhi, 0]], { c: 'green', op: 0.35 }); }
        g.line([[0, 30], [120, 0]], { c: 'blue', w: 3 });
        g.text(112, 4.5, 'D', { c: 'blue' });
        g.dot(d.Q0, v.P0, { c: C.grey, r: 6 }); g.text(d.Q0, v.P0, 'old', { c: 'ink', small: true, dx: 9, dy: 4 });
        g.dot(d.Q1, v.P1, { c: C.plum, r: 7 }); g.text(d.Q1, v.P1, 'new', { c: 'ink', dx: 9, dy: -8 });
      }
    },
    notes: 'Green is revenue gained, red is revenue lost. Above the midpoint price ($15) the red strip wins when you raise the price: that is elastic demand.'
  }, { after: 'figure', kicker: 'Live equation · 4.3' });
})();
