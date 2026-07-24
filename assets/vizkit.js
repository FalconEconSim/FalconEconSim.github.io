/* vizkit.js - shared d3 chart helpers for the weekN-viz figure pages.
 *
 * These are the same helpers the earlier viz pages (week5-8) carry inline,
 * lifted into one file so the Week 9-12 figures stay visually identical without
 * each page copying the block. Canvas / d3 cannot resolve CSS var(), so figure
 * colours are read once from :root here; CSS and SVG attributes use var()
 * directly. Load this AFTER d3 and BEFORE the page's figure scripts.
 *
 * Every figure is an SVG with a viewBox and width:100%, so it scales crisply to
 * any container width, which is what makes the large-screen widening and the
 * figure pop-out (see figkit.js) look sharp.
 */
(function () {
  'use strict';

  var css = getComputedStyle(document.documentElement);
  function g(n, f) { return (css.getPropertyValue(n) || '').trim() || f; }

  // Figure palette (fixed site-wide meanings, mirrors shared.css --d-*).
  window.EC = {
    primary: g('--d-primary', '#1f6fb2'),
    second:  g('--d-second', '#c85a3c'),
    gain:    g('--d-gain', '#2f7d55'),
    loss:    g('--d-loss', '#b03a2e'),
    transfer:g('--d-transfer', '#a07800'),
    ghost:   g('--d-ghost', '#9aa3b0'),
    indicator: g('--indicator', '#7d3c98'),
    slate:   g('--slate', '#2c3e50')
  };

  // Standard frame + fills (welfare-region convention, matches week 8).
  window.D3W = 680; window.D3H = 560;
  window.D3PAD = { top: 28, right: 36, bottom: 46, left: 56 };
  window.LABEL_H = 15;
  window.FILL_CS = 'rgba(31,111,178,0.20)';  window.STROKE_CS = EC.primary;
  window.FILL_PS = 'rgba(160,120,0,0.30)';   window.STROKE_PS = EC.transfer;
  window.FILL_DWL = 'rgba(176,58,46,0.28)';  window.STROKE_DWL = EC.loss;
  window.FILL_GAIN = 'rgba(47,125,85,0.20)'; window.STROKE_GAIN = EC.gain;

  window.d3MakeSvg = function (wrapId) {
    return window.d3MakeSvgWH(wrapId, D3W, D3H);
  };
  window.d3MakeSvgWH = function (wrapId, w, h) {
    d3.select('#' + wrapId).selectAll('svg').remove();
    return d3.select('#' + wrapId).append('svg')
      .attr('viewBox', '0 0 ' + w + ' ' + h)
      .style('width', '100%').style('display', 'block')
      .style('font-family', "'DM Sans',system-ui,sans-serif");
  };

  // Axes for a caller-supplied pair of linear scales on the standard frame.
  window.d3AddAxes = function (svg, scX, scY, xLabel, yLabel, fmtX, fmtY) {
    svg.append('g').selectAll('line').data(scY.ticks(5)).enter()
      .append('line').attr('x1', D3PAD.left).attr('x2', D3W - D3PAD.right)
      .attr('y1', function (d) { return scY(d); }).attr('y2', function (d) { return scY(d); })
      .attr('stroke', '#f0f0f0').attr('stroke-width', 1);
    svg.append('g').attr('transform', 'translate(0,' + (D3H - D3PAD.bottom) + ')')
      .call(d3.axisBottom(scX).ticks(8).tickSize(4).tickFormat(fmtX || null))
      .call(function (gg) { gg.select('.domain').attr('stroke', '#ccc'); gg.selectAll('.tick line').attr('stroke', '#ccc'); gg.selectAll('.tick text').attr('fill', '#8a8a8a').attr('font-size', 10); });
    svg.append('g').attr('transform', 'translate(' + D3PAD.left + ',0)')
      .call(d3.axisLeft(scY).ticks(6).tickSize(4).tickFormat(fmtY || null))
      .call(function (gg) { gg.select('.domain').attr('stroke', '#ccc'); gg.selectAll('.tick line').attr('stroke', '#ccc'); gg.selectAll('.tick text').attr('fill', '#8a8a8a').attr('font-size', 10); });
    if (xLabel) svg.append('text').attr('x', D3PAD.left + (D3W - D3PAD.left - D3PAD.right) / 2).attr('y', D3H - 8).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 11).text(xLabel);
    if (yLabel) svg.append('text').attr('transform', 'rotate(-90)').attr('x', -(D3PAD.top + (D3H - D3PAD.top - D3PAD.bottom) / 2)).attr('y', 15).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 11).text(yLabel);
  };

  // A straight segment between two data points.
  window.d3Seg = function (svg, scX, scY, x1, y1, x2, y2, color, sw, dash) {
    return svg.append('line').attr('x1', scX(x1)).attr('y1', scY(y1)).attr('x2', scX(x2)).attr('y2', scY(y2))
      .attr('stroke', color).attr('stroke-width', sw || 2).attr('stroke-dasharray', dash || '');
  };

  // A filled polygon from an array of [x,y] data points.
  window.d3Poly = function (svg, scX, scY, pts, fill, stroke) {
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + scX(p[0]) + ' ' + scY(p[1]); }).join(' ') + ' Z';
    return svg.append('path').attr('d', d).attr('fill', fill).attr('stroke', stroke || 'none').attr('stroke-width', 1);
  };

  // A white-haloed text label so it reads ahead of curves and fills.
  window.d3Halo = function (svg, x, y, txt, opts) {
    opts = opts || {};
    var t = svg.append('text').attr('x', x).attr('y', y)
      .attr('text-anchor', opts.anchor || 'middle')
      .attr('font-size', opts.size || 11)
      .attr('font-weight', opts.weight != null ? opts.weight : 600)
      .attr('fill', opts.color || EC.slate).text(txt);
    var bb = t.node().getBBox(), px = 3, py = 1.5;
    svg.insert('rect', function () { return t.node(); })
      .attr('x', bb.x - px).attr('y', bb.y - py)
      .attr('width', bb.width + 2 * px).attr('height', bb.height + 2 * py).attr('rx', 3)
      .attr('fill', '#fff').attr('fill-opacity', opts.bg != null ? opts.bg : 0.86);
    return t;
  };

  // A small labelled marker dot.
  window.d3Dot = function (svg, x, y, color, r) {
    return svg.append('circle').attr('cx', x).attr('cy', y).attr('r', r || 5.5)
      .attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 2);
  };
})();
