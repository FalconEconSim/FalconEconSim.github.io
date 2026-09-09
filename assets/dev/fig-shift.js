/* fig-shift.js
 * Fig 2.4 "Shift vs. Pivot Explorer", rebuilt as one shared core so the ten
 * dev_week2_* layout experiments all run the SAME chart. Only the page layout
 * differs between them, which is the thing being compared.
 *
 * Three defects from the live figure are fixed here, and the fixes are written
 * to generalise to every figure on the site:
 *
 *  1. ARROWS OVERLAPPED THE TICK NUMBERS.
 *     The live version places the intercept-movement arrows at y = -0.09 * range
 *     and x = -0.09 * range, which is exactly the band the axis tick labels
 *     occupy. The two were guaranteed to collide.
 *     Fix: the board reserves a gutter below and left of the origin and splits
 *     it into two lanes, tick numbers next to the axis and arrows beyond them.
 *     Crucially the lanes are measured in PIXELS and converted to data units
 *     through the board's live unitX/unitY, then the bounding box is re-set to
 *     fit them. A first attempt used fixed data units and it broke the moment a
 *     layout gave the chart a different aspect ratio (variant 10, a 4:3 frame):
 *     the vertical gutter compressed and the arrow landed back on the numbers.
 *     Anything that depends on the container's shape has to be computed from
 *     the container, not assumed.
 *
 *  2. THE B-LABELS SAT ON THEIR OWN LINES.
 *     The live version anchors both labels at the same x (35% of the smaller
 *     intercept) and at the y OF THE LINE ITSELF, so each label starts on top of
 *     its curve, and with only a weak spring the inner one tends to stay there
 *     and drift into the other line.
 *     Fix: each label is anchored at a DIFFERENT fraction along its own line and
 *     pushed off it at a right angle, in the direction away from the other line,
 *     by a distance also measured in pixels. A short leader connects the label
 *     back to its anchor point.
 *
 *  3. THE CHART WAS SMALLER THAN ITS OWN READOUT.
 *     A layout problem, not a chart problem. That is what the ten variants are
 *     comparing, so it is deliberately not addressed in here.
 */
(function (global) {
  'use strict';

  var COL = {
    ink:  '#14181b',
    soft: '#4a5257',
    grid: '#e3e6e2',
    axis: '#9aa39c',
    orig: '#3d5a80',   /* B0, the original budget line */
    nu:   '#a8431f',   /* B1, the new budget line */
    move: '#7a1f5c'    /* intercept-movement arrows: the UI accent, never a curve colour */
  };

  var MAX = 50;          /* data range on both axes */

  /* Lane geometry, in PIXELS. These are the numbers that actually matter and
     they are honoured whatever shape the container is. */
  var PX = {
    tickGap:   16,   /* axis to the centre of the tick number */
    arrowLane: 40,   /* axis to the arrow lane, comfortably past the numbers */
    gutterPad: 16,   /* breathing room beyond the arrow lane */
    labelOff:  46,   /* how far a curve label sits off its curve */
    headroom:  18    /* space above/right of the plotted maximum */
  };

  var I0 = 100, PX0 = 5, PY0 = 4;

  function lineFor(I, px, py) {
    return { xi: I / px, yi: I / py, slope: -(px / py) };
  }

  function Fig(boardEl, onData) {
    var el = typeof boardEl === 'string' ? document.getElementById(boardEl) : boardEl;
    var board = JXG.JSXGraph.initBoard(el, {
      boundingbox: [-12, MAX + 6, MAX + 6, -12],
      keepAspectRatio: false,
      axis: false,
      showNavigation: false,
      showCopyright: false,
      pan: { enabled: false },
      zoom: { enabled: false }
    });

    var furniture = [];   /* grid, axes, ticks: rebuilt whenever the box changes */
    var series = [];      /* the two budget lines, labels and arrows */
    var state = { type: 'income-up', mag: 30 };
    var lane = {};        /* current lane positions, in data units */

    function clear(list) {
      list.forEach(function (o) { try { board.removeObject(o, false); } catch (e) {} });
      list.length = 0;
    }

    /* Convert the pixel lane spec into data units using the board's CURRENT
       scale, then resize the bounding box so the lanes actually fit. */
    function computeLanes() {
      var ux = board.unitX || 1, uy = board.unitY || 1;
      lane = {
        tickY:   -PX.tickGap / uy,
        tickX:   -PX.tickGap / ux,
        arrowY:  -PX.arrowLane / uy,
        arrowX:  -PX.arrowLane / ux,
        labelPx: PX.labelOff
      };
      var gutY = (PX.arrowLane + PX.gutterPad) / uy;
      var gutX = (PX.arrowLane + PX.gutterPad) / ux;
      var headY = PX.headroom / uy, headX = PX.headroom / ux;
      board.setBoundingBox([-gutX, MAX + headY, MAX + headX, -gutY], false);
      /* Units change when the box changes, so settle once more. */
      ux = board.unitX || ux; uy = board.unitY || uy;
      lane.tickY = -PX.tickGap / uy; lane.tickX = -PX.tickGap / ux;
      lane.arrowY = -PX.arrowLane / uy; lane.arrowX = -PX.arrowLane / ux;
    }

    function drawFurniture() {
      clear(furniture);
      var g;
      for (g = 10; g <= MAX; g += 10) {
        furniture.push(board.create('segment', [[0, g], [MAX, g]], { strokeColor: COL.grid, strokeWidth: 1, fixed: true, highlight: false, layer: 1 }));
        furniture.push(board.create('segment', [[g, 0], [g, MAX]], { strokeColor: COL.grid, strokeWidth: 1, fixed: true, highlight: false, layer: 1 }));
      }
      furniture.push(board.create('segment', [[0, 0], [MAX + 2, 0]], { strokeColor: COL.axis, strokeWidth: 1.4, fixed: true, highlight: false, lastArrow: { type: 2, size: 5 } }));
      furniture.push(board.create('segment', [[0, 0], [0, MAX + 2]], { strokeColor: COL.axis, strokeWidth: 1.4, fixed: true, highlight: false, lastArrow: { type: 2, size: 5 } }));

      var tickLenY = Math.abs(lane.tickY) * 0.32, tickLenX = Math.abs(lane.tickX) * 0.32;
      for (g = 10; g <= MAX; g += 10) {
        furniture.push(board.create('segment', [[g, 0], [g, -tickLenY]], { strokeColor: COL.axis, strokeWidth: 1, fixed: true, highlight: false }));
        furniture.push(board.create('text', [g, lane.tickY, String(g)], {
          fontSize: 13, color: COL.soft, anchorX: 'middle', anchorY: 'middle',
          fixed: true, highlight: false, cssStyle: 'font-family:inherit'
        }));
        furniture.push(board.create('segment', [[0, g], [-tickLenX, g]], { strokeColor: COL.axis, strokeWidth: 1, fixed: true, highlight: false }));
        furniture.push(board.create('text', [lane.tickX, g, String(g)], {
          fontSize: 13, color: COL.soft, anchorX: 'middle', anchorY: 'middle',
          fixed: true, highlight: false, cssStyle: 'font-family:inherit'
        }));
      }
      furniture.push(board.create('text', [MAX + 1, lane.tickY, 'X'], {
        fontSize: 14, color: COL.ink, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false,
        cssStyle: 'font-family:inherit;font-weight:600'
      }));
      furniture.push(board.create('text', [lane.tickX, MAX + 2, 'Y'], {
        fontSize: 14, color: COL.ink, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false,
        cssStyle: 'font-family:inherit;font-weight:600'
      }));
    }

    /* Distance in PIXELS from a data-space point to a data-space segment.
       Everything is converted through the board units first, because a label
       that looks clear on a square chart can be touching a curve on a wide one. */
    function pxDistToSeg(p, a, b) {
      var ux = board.unitX || 1, uy = board.unitY || 1;
      var Px = p[0] * ux, Py = p[1] * uy;
      var Ax = a[0] * ux, Ay = a[1] * uy;
      var Bx = b[0] * ux, By = b[1] * uy;
      var vx = Bx - Ax, vy = By - Ay;
      var L2 = vx * vx + vy * vy;
      var t = L2 ? Math.max(0, Math.min(1, ((Px - Ax) * vx + (Py - Ay) * vy) / L2)) : 0;
      return Math.hypot(Px - (Ax + vx * t), Py - (Ay + vy * t));
    }

    /* A label pushed off its own line at a right angle. The SIDE and the
       DISTANCE are chosen by measuring clearance from the other line rather
       than assumed: on a wide short chart the two budget lines converge in
       pixel terms near the shared intercept, and a fixed side put one label
       within 6px of the wrong curve. */
    function placeLabel(line, other, atFrac, text, colour, preferSide) {
      var ux = board.unitX || 1, uy = board.unitY || 1;
      var x = line.xi * atFrac;
      var y = line.slope * x + line.yi;

      var dxPx = 1 * ux, dyPx = line.slope * uy;
      var len = Math.hypot(dxPx, dyPx) || 1;

      var best = null;
      var sides = preferSide >= 0 ? [1, -1] : [-1, 1];
      var offsets = [lane.labelPx, lane.labelPx * 1.35, lane.labelPx * 1.75, lane.labelPx * 2.2];
      for (var si = 0; si < sides.length; si++) {
        for (var oi = 0; oi < offsets.length; oi++) {
          var side = sides[si], off = offsets[oi];
          var nxPx = (-dyPx / len) * side, nyPx = (dxPx / len) * side;
          var offX = (nxPx * off) / ux, offY = (nyPx * off) / uy;
          var lx = x + offX, ly = y + offY;
          if (lx < 1 || ly < 1 || lx > MAX || ly > MAX) continue;   /* keep it on the plot */
          var dOther = pxDistToSeg([lx, ly], [0, other.yi], [other.xi, 0]);
          var dOwn   = pxDistToSeg([lx, ly], [0, line.yi],  [line.xi, 0]);
          var score  = Math.min(dOther, dOwn);
          if (!best || score > best.score) best = { lx: lx, ly: ly, offX: offX, offY: offY, x: x, y: y, score: score };
          if (dOther >= 26 && dOwn >= 22) { best = { lx: lx, ly: ly, offX: offX, offY: offY, x: x, y: y, score: score }; si = 99; break; }
        }
      }
      if (!best) return;

      series.push(board.create("segment", [[best.x, best.y], [best.x + best.offX * 0.55, best.y + best.offY * 0.55]],
        { strokeColor: colour, strokeWidth: 1, dash: 2, fixed: true, highlight: false }));
      series.push(board.create("point", [best.x, best.y],
        { size: 2, fillColor: colour, strokeColor: colour, fixed: true, highlight: false, withLabel: false }));
      series.push(board.create("text", [best.lx, best.ly, text], {
        fontSize: 13, color: colour, fixed: true, highlight: false,
        anchorX: best.offX >= 0 ? "left" : "right", anchorY: "middle",
        cssStyle: "font-family:inherit;font-weight:600;white-space:nowrap"
      }));
    }

    function movementArrow(axis, from, to) {
      if (Math.abs(to - from) < 0.6) return;
      series.push(axis === 'x'
        ? board.create('arrow', [[from, lane.arrowY], [to, lane.arrowY]], { strokeColor: COL.move, strokeWidth: 2.6, fixed: true, highlight: false })
        : board.create('arrow', [[lane.arrowX, from], [lane.arrowX, to]], { strokeColor: COL.move, strokeWidth: 2.6, fixed: true, highlight: false }));
    }

    var LABELS = {
      'income-up': 'Income up', 'income-down': 'Income down',
      'px-up': 'Price of X up', 'px-down': 'Price of X down',
      'py-up': 'Price of Y up', 'py-down': 'Price of Y down'
    };

    function draw() {
      clear(series);
      var mag = state.mag / 100, t = state.type;
      var I2 = I0, px2 = PX0, py2 = PY0;
      if (t === 'income-up')   I2  = I0  * (1 + mag);
      if (t === 'income-down') I2  = I0  * (1 - mag);
      if (t === 'px-up')       px2 = PX0 * (1 + mag);
      if (t === 'px-down')     px2 = PX0 * (1 - mag);
      if (t === 'py-up')       py2 = PY0 * (1 + mag);
      if (t === 'py-down')     py2 = PY0 * (1 - mag);

      var L0 = lineFor(I0, PX0, PY0), L1 = lineFor(I2, px2, py2);

      board.suspendUpdate();
      series.push(board.create('segment', [[0, L0.yi], [L0.xi, 0]],
        { strokeColor: COL.orig, strokeWidth: 2.6, dash: 2, fixed: true, highlight: false }));
      series.push(board.create('segment', [[0, L1.yi], [L1.xi, 0]],
        { strokeColor: COL.nu, strokeWidth: 3.2, fixed: true, highlight: false }));

      placeLabel(L0, L1, 0.30, 'B₀ original', COL.orig, -1);
      placeLabel(L1, L0, 0.64, 'B₁ new',      COL.nu,   +1);

      movementArrow('x', L0.xi, L1.xi);
      movementArrow('y', L0.yi, L1.yi);
      board.unsuspendUpdate();

      if (onData) onData({
        type: t, mag: state.mag, label: LABELS[t] + ' ' + state.mag + '%',
        xi0: L0.xi, xi1: L1.xi, yi0: L0.yi, yi1: L1.yi,
        slope0: L0.slope, slope1: L1.slope,
        slopeChanged: Math.abs(L1.slope - L0.slope) > 1e-9,
        fixed: t.indexOf('income') === 0 ? 'neither intercept' : (t.indexOf('px') === 0 ? 'Y-intercept' : 'X-intercept'),
        kind: t.indexOf('income') === 0 ? 'parallel shift' : 'pivot'
      });
    }

    function relayout() {
      computeLanes();
      drawFurniture();
      draw();
    }

    this.setType = function (t) { state.type = t; draw(); };
    this.setMag  = function (m) { state.mag = m; draw(); };
    this.resize  = function () {
      try {
        board.resizeContainer(el.clientWidth || board.canvasWidth, el.clientHeight || board.canvasHeight, true);
      } catch (e) {}
      relayout();
    };
    this.relayout = relayout;

    relayout();

    /* The lanes depend on the container's pixel size, so they have to be
       recomputed whenever it changes, not only on a window resize. */
    if (global.ResizeObserver) {
      var pending = null, self = this;
      new ResizeObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(function () { self.resize(); }, 80);
      }).observe(el);
    }
  }

  global.FigShift = { create: function (el, cb) { return new Fig(el, cb); }, COL: COL };
})(window);
