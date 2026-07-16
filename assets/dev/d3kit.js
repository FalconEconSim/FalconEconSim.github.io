/* ════════════════════════════════════════════════════════════════════════
   d3kit.js: shared D3 SVG figure toolkit for EC224 (DEV)
   Extracted verbatim from week8-viz.html (the Fig 8.1 "blueprint"), which in
   turn was adapted from the S6/S8 gold-standard figures in testing.html.
   Force-laid-out draggable labels, NO anchor dots (connector line only).
   Requires d3 v7 to be loaded first.
   ════════════════════════════════════════════════════════════════════════ */

const D3W = 680, D3H = 320, D3H2 = 460, D3PAD = { top: 28, right: 36, bottom: 44, left: 54 };
const LABEL_H = 15;

// Welfare-region fill convention (filled-region diagrams):
//   CS → blue, PS/profit/transfer → gold, DWL → red, Gov't revenue → slate
const FILL_CS = 'rgba(26,86,219,0.22)',  STROKE_CS  = '#1a56db';
const FILL_PS = 'rgba(160,120,0,0.32)',  STROKE_PS  = '#a07800';
const FILL_DWL = 'rgba(192,57,43,0.30)', STROKE_DWL = '#c0392b';
const FILL_REV = 'rgba(44,62,80,0.22)',  STROKE_REV = '#2c3e50';

function d3MakeSvg(wrapId) {
  d3.select('#' + wrapId).selectAll('svg').remove();
  return d3.select('#' + wrapId).append('svg')
    .attr('viewBox', `0 0 ${D3W} ${D3H}`)
    .style('width', '100%').style('display', 'block')
    .style('font-family', "'DM Sans',system-ui,sans-serif");
}
function d3MakeSvgWH(wrapId, w, h) {
  d3.select('#' + wrapId).selectAll('svg').remove();
  return d3.select('#' + wrapId).append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .style('width', '100%').style('display', 'block')
    .style('font-family', "'DM Sans',system-ui,sans-serif");
}

// Axes for the standard 680×320 frame with caller-supplied linear scales.
function d3AddAxes(svg, scX, scY, xLabel, yLabel, fmtY, fmtX) {
  svg.append('g').selectAll('line').data(scY.ticks(4)).enter()
    .append('line').attr('x1', D3PAD.left).attr('x2', D3W - D3PAD.right)
    .attr('y1', d => scY(d)).attr('y2', d => scY(d)).attr('stroke', '#f0f0f0').attr('stroke-width', 1);
  svg.append('g').attr('transform', `translate(0,${D3H - D3PAD.bottom})`).call(
    d3.axisBottom(scX).ticks(8).tickSize(4).tickFormat(fmtX || null)
  ).call(g => { g.select('.domain').attr('stroke', '#ccc'); g.selectAll('.tick line').attr('stroke', '#ccc'); g.selectAll('.tick text').attr('fill', '#888').attr('font-size', 9).attr('font-family', "'DM Sans',sans-serif"); });
  svg.append('g').attr('transform', `translate(${D3PAD.left},0)`).call(
    d3.axisLeft(scY).ticks(6).tickSize(4).tickFormat(fmtY || null)
  ).call(g => { g.select('.domain').attr('stroke', '#ccc'); g.selectAll('.tick line').attr('stroke', '#ccc'); g.selectAll('.tick text').attr('fill', '#888').attr('font-size', 9).attr('font-family', "'DM Sans',sans-serif"); });
  if (xLabel) svg.append('text').attr('x', D3PAD.left + (D3W - D3PAD.left - D3PAD.right) / 2).attr('y', D3H - 6).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 10).text(xLabel);
  if (yLabel) svg.append('text').attr('transform', 'rotate(-90)').attr('x', -(D3PAD.top + (D3H - D3PAD.top - D3PAD.bottom) / 2)).attr('y', 14).attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', 10).text(yLabel);
}

// A straight line between two data points.
function d3Seg(svg, scX, scY, x1, y1, x2, y2, color, sw, dash) {
  return svg.append('line').attr('x1', scX(x1)).attr('y1', scY(y1)).attr('x2', scX(x2)).attr('y2', scY(y2))
    .attr('stroke', color).attr('stroke-width', sw || 2).attr('stroke-dasharray', dash || '');
}

// Plot a sampled curve y=fn(x) over [x0,x1], clipped to the y-domain.
function d3Curve(svg, scX, scY, fn, x0, x1, color, sw, dash, n) {
  n = n || 160;
  const yMin = scY.domain()[0], yMax = scY.domain()[1];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n;
    let y = fn(x);
    if (!isFinite(y)) continue;
    if (y < yMin - 0.001 || y > yMax + 0.001) { pts.push(null); continue; }
    pts.push([x, y]);
  }
  const line = d3.line().defined(d => d).x(d => scX(d[0])).y(d => scY(d[1])).curve(d3.curveBasis);
  return svg.append('path').datum(pts).attr('d', line)
    .attr('fill', 'none').attr('stroke', color).attr('stroke-width', sw || 2).attr('stroke-dasharray', dash || '');
}

// Draggable, force-laid-out labels: NO anchor dots, connector line only.
function d3AddLabels(svg, nodes, sim) {
  const conns = svg.selectAll(null).data(nodes).enter()
    .append('line').attr('stroke', d => d.color).attr('stroke-width', 0.9).attr('stroke-dasharray', '4,3').attr('opacity', 0.55);
  const gs = svg.selectAll(null).data(nodes).enter()
    .append('g').attr('class', 'draggable-label')
    .call(d3.drag()
      .on('start', (e, d) => { sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );
  gs.append('rect').attr('width', d => d.lw).attr('height', LABEL_H).attr('rx', 3)
    .attr('fill', 'white').attr('stroke', d => d.color).attr('stroke-width', 0.8).attr('opacity', 0.95);
  gs.append('text').attr('x', d => d.lw / 2).attr('y', LABEL_H - 4)
    .attr('text-anchor', 'middle').attr('fill', d => d.color).attr('font-size', 9).attr('font-weight', 600)
    .text(d => d.label);
  return { conns, gs };
}
function d3MakeSim(nodes) {
  return d3.forceSimulation(nodes)
    .force('collide', d3.forceCollide(d => d.lw * 0.55 + 4).strength(0.85))
    .force('x', d3.forceX(d => d.fx_anchor).strength(0.04))
    .force('y', d3.forceY(d => d.fy_anchor).strength(0.04));
}
function d3TickClamp(nodes, gs, conns) {
  nodes.forEach(d => {
    d.x = Math.max(D3PAD.left - 4, Math.min(D3W - d.lw - 4, d.x));
    d.y = Math.max(D3PAD.top, Math.min(D3H - D3PAD.bottom - LABEL_H, d.y));
  });
  gs.attr('transform', d => `translate(${d.x},${d.y})`);
  conns.attr('x1', d => d.fx_anchor).attr('y1', d => d.fy_anchor).attr('x2', d => d.x + d.lw / 2).attr('y2', d => d.y + LABEL_H / 2);
}
function d3Node(id, color, label, lw, ax, ay, extra) {
  const ang = Math.random() * 2 * Math.PI, r = 110 + Math.random() * 50;
  return Object.assign({ id, color, label, lw, ax, ay, fx_anchor: ax, fy_anchor: ay, x: ax + r * Math.cos(ang), y: ay + r * Math.sin(ang) }, extra || {});
}
// Re-scatter a sim's label nodes back around their anchors.
function d3ScatterLabels(nodes, sim) {
  if (!nodes || !sim) return;
  nodes.forEach(d => { d.x = d.fx_anchor + Math.cos(Math.random() * 6.28) * (110 + Math.random() * 50); d.y = d.fy_anchor + Math.sin(Math.random() * 6.28) * (110 + Math.random() * 50); d.vx = 0; d.vy = 0; d.fx = null; d.fy = null; });
  sim.alpha(0.5).restart();
}
// Move a label node's anchor (and the node with it) to a new screen point.
function d3MoveAnchor(node, nx, ny) {
  if (!node) return;
  const dx = nx - node.fx_anchor, dy = ny - node.fy_anchor;
  node.x += dx; node.y += dy; node.vx = 0; node.vy = 0;
  node.fx_anchor = nx; node.fy_anchor = ny;
}

// White-background "halo" behind a static value label so it reads ahead of
// curves, fills, dashed guides and axis ticks.
function d3HaloLabel(g, x, y, txt, opts) {
  opts = opts || {};
  var t = g.append('text').attr('x', x).attr('y', y)
    .attr('text-anchor', opts.anchor || 'middle')
    .attr('font-size', opts.size || 9)
    .attr('font-weight', opts.weight != null ? opts.weight : 600)
    .attr('fill', opts.color || '#2c3e50').text(txt);
  var bb = t.node().getBBox();
  var px = opts.padX != null ? opts.padX : 2.5, py = opts.padY != null ? opts.padY : 1;
  g.insert('rect', function () { return t.node(); })
    .attr('x', bb.x - px).attr('y', bb.y - py)
    .attr('width', bb.width + 2 * px).attr('height', bb.height + 2 * py).attr('rx', 2.5)
    .attr('fill', '#ffffff').attr('fill-opacity', opts.bgOpacity != null ? opts.bgOpacity : 0.85)
    .attr('stroke', opts.stroke || 'none').attr('stroke-width', 0.7).attr('stroke-opacity', 0.4);
  return t;
}

// Registry of sims for the global mousedown/mouseup alphaTarget pattern.
const SIM_REGISTRY = [];
function registerSliderSim(sliderId, getSim) {
  const sl = document.getElementById(sliderId);
  if (!sl) return;
  sl.addEventListener('mousedown', () => { const s = getSim(); if (s) s.alphaTarget(0.3).restart(); });
  sl.addEventListener('touchstart', () => { const s = getSim(); if (s) s.alphaTarget(0.3).restart(); }, { passive: true });
  SIM_REGISTRY.push(getSim);
}
window.addEventListener('mouseup', () => SIM_REGISTRY.forEach(g => { const s = g(); if (s) s.alphaTarget(0); }));
window.addEventListener('touchend', () => SIM_REGISTRY.forEach(g => { const s = g(); if (s) s.alphaTarget(0); }));
