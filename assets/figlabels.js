/* figlabels.js
 * Site-wide figure label pass, generalising the dev_week2_21 prototype.
 *
 * WHAT IT DOES
 * For every plot on the page it builds one OCCUPANCY GRID of everything a
 * label must not sit on, then moves each curve label to the best free spot
 * near its original position and gives it an opaque plate so it stays readable
 * wherever it lands.
 *
 * WHY A GRID
 * The site draws figures three different ways: JSXGraph, raw canvas, and d3.
 * A label engine that understands "curves" would need each figure to hand over
 * its geometry, which is 79 bespoke edits. A grid does not care what drew the
 * ink:
 *   - SVG paths and lines are sampled with getPointAtLength
 *   - canvas plots are read back as pixels, so week4 and week5, whose curves
 *     are painted to a canvas while their labels live in an SVG overlay, are
 *     covered by exactly the same code
 *   - tick numbers and already-placed labels are stamped in as rectangles
 * One representation, one scoring function, every engine.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 * Axis tick numbers, axis titles, and anything outside a plot container. It
 * moves curve labels only.
 */
(function () {
  'use strict';
  if (window.__ec224FigLabels) return;
  window.__ec224FigLabels = true;

  var CELL = 4;            /* occupancy grid resolution, px */
  var CLEAR = 12;          /* target clearance from ink, px */
  var LABEL_FONT = 15;     /* floor; the plate scales with it */
  var MAX_RING = 13;       /* how far out the scorer will look, in cells */
  var PLOT_SEL = '.fig-plot, .jxgbox, .demo-svg-wrap';

  /* A tick number: "24", "-3", "$200", "1,200", "50%", "$1.0k", "(0.5)".
     Not "Q*=8", "MR", "Dollars". Week 12 formats its axis in thousands, and
     without the k suffix here "$1.0k" failed this test, was taken for an axis
     title, and got slid out of the tick column and parked under the x-axis.
     Ticks are never moved and never plated, so this one test decides a lot. */
  var NUMBERISH = /^[-+(]?[$\u20ac\u00a3]?[-+]?\d[\d.,\s]*[%kKmMbB]?\)?$/;
  function isNumericLabel(s) {
    s = (s || '').trim();
    return !s || NUMBERISH.test(s);
  }
  function isNumberish(v) { v = (v || '').trim(); return !!v && NUMBERISH.test(v); }

  /* A curve label is text inside a plot that is not a tick number, not part of
     a d3 axis, and short enough to be a name rather than a sentence. */
  function isCurveLabel(el) {
    var t = (el.textContent || '').trim();
    if (!t || t.length > 36) return false;
    if (isNumericLabel(t)) return false;
    if (el.closest && el.closest('.tick, .domain, .axis-label, .readout-row, .fig-state, .ctrl-row')) return false;
    return true;
  }

  function Grid(w, h) {
    this.w = Math.max(1, Math.ceil(w / CELL));
    this.h = Math.max(1, Math.ceil(h / CELL));
    this.a = new Uint8Array(this.w * this.h);
  }
  Grid.prototype.mark = function (x, y) {
    var gx = (x / CELL) | 0, gy = (y / CELL) | 0;
    if (gx < 0 || gy < 0 || gx >= this.w || gy >= this.h) return;
    this.a[gy * this.w + gx] = 1;
  };
  Grid.prototype.markRect = function (x, y, w, h) {
    var x0 = Math.max(0, (x / CELL) | 0), y0 = Math.max(0, (y / CELL) | 0);
    var x1 = Math.min(this.w - 1, ((x + w) / CELL) | 0), y1 = Math.min(this.h - 1, ((y + h) / CELL) | 0);
    for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) this.a[gy * this.w + gx] = 1;
  };
  Grid.prototype.occupied = function (gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.w || gy >= this.h) return true;   /* outside counts as blocked */
    return this.a[gy * this.w + gx] === 1;
  };
  /* Distance in px from a rect to the nearest occupied cell, capped. */
  Grid.prototype.clearance = function (x, y, w, h) {
    var x0 = (x / CELL) | 0, y0 = (y / CELL) | 0;
    var x1 = ((x + w) / CELL) | 0, y1 = ((y + h) / CELL) | 0;
    for (var r = 0; r <= MAX_RING; r++) {
      for (var gy = y0 - r; gy <= y1 + r; gy++) {
        for (var gx = x0 - r; gx <= x1 + r; gx++) {
          var onRing = (gx === x0 - r || gx === x1 + r || gy === y0 - r || gy === y1 + r);
          if (r > 0 && !onRing) continue;
          if (this.occupied(gx, gy)) return r * CELL;
        }
      }
    }
    return MAX_RING * CELL;
  };

  /* ---- obstacle collection -------------------------------------------- */

  function addSvgInk(grid, svg, host) {
    var hb = host.getBoundingClientRect(), sb = svg.getBoundingClientRect();
    var sx = sb.width / (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal.width : sb.width || 1);
    var sy = sb.height / (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height ? svg.viewBox.baseVal.height : sb.height || 1);
    var ox = sb.x - hb.x, oy = sb.y - hb.y;
    svg.querySelectorAll('path, line, polyline, polygon, circle, rect').forEach(function (el) {
      var stroke = (el.getAttribute('stroke') || '').toLowerCase();
      var fill = (el.getAttribute('fill') || '').toLowerCase();
      var sw = parseFloat(el.getAttribute('stroke-width') || '1');
      var inked = (stroke && stroke !== 'none' && sw >= 1.6) || (fill && fill !== 'none' && fill !== 'transparent');
      if (!inked) return;
      if (el.closest('.tick, .domain')) return;
      try {
        if (typeof el.getTotalLength === 'function' && el.tagName.toLowerCase() !== 'rect') {
          var L = el.getTotalLength();
          if (L && isFinite(L)) {
            var n = Math.min(400, Math.max(12, Math.round(L / 3)));
            for (var i = 0; i <= n; i++) {
              var p = el.getPointAtLength((L * i) / n);
              grid.mark(ox + p.x * sx, oy + p.y * sy);
            }
            return;
          }
        }
        var bb = el.getBBox();
        grid.markRect(ox + bb.x * sx, oy + bb.y * sy, bb.width * sx, bb.height * sy);
      } catch (e) {}
    });
  }

  /* Canvas figures: read the pixels. This is what makes week4 and week5 work,
     where the curves are painted to a canvas and only the labels are SVG. */
  function addCanvasInk(grid, cv, host) {
    var hb = host.getBoundingClientRect(), cb = cv.getBoundingClientRect();
    if (!cb.width || !cb.height) return;
    var W = Math.min(cv.width || cb.width, 1400), H = Math.min(cv.height || cb.height, 1400);
    var ctx, data;
    try {
      ctx = cv.getContext('2d', { willReadFrequently: true });
      data = ctx.getImageData(0, 0, W, H).data;
    } catch (e) { return; }
    var sx = cb.width / W, sy = cb.height / H;
    var ox = cb.x - hb.x, oy = cb.y - hb.y;
    var step = 2;
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        var i = (y * W + x) * 4;
        var a = data[i + 3];
        if (a < 40) continue;
        var r = data[i], g = data[i + 1], b = data[i + 2];
        /* Skip the paper and the faint gridlines: only real ink blocks. */
        if (r > 226 && g > 226 && b > 226) continue;
        grid.mark(ox + x * sx, oy + y * sy);
      }
    }
  }

  /* ---- label handling --------------------------------------------------- */

  function plate(el, colour, plain) {
    if (el.tagName.toLowerCase() === 'text') {
      var p = el.parentNode;
      var prev = el.previousSibling;
      if (prev && prev.nodeType === 1 && prev.getAttribute && prev.getAttribute('data-fl-plate') === '1') {
        return prev;
      }
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('data-fl-plate', '1');
      r.setAttribute('rx', '4');
      r.setAttribute('fill', '#ffffff');
      r.setAttribute('stroke', plain ? 'none' : colour);
      r.setAttribute('stroke-width', plain ? '0' : '1');
      r.setAttribute('opacity', plain ? '0.9' : '0.96');
      p.insertBefore(r, el);
      return r;
    }
    el.style.background = '#ffffff';
    el.style.border = plain ? '0' : ('1px solid ' + colour);
    el.style.borderRadius = '5px';
    el.style.padding = '2px 7px';
    el.dataset.flPlated = '1';
    return null;
  }

  /* The plate has to carry the SAME transform as its text.
     getBBox() reports a LOCAL box that ignores the element's transform, so
     sizing the rect from it and leaving the rect untransformed put every plate
     at the label's pre-move position: the figures rendered with empty boxes
     floating away from their labels. Copying the transform keeps the two
     locked together wherever the label ends up. */
  function sizePlate(rect, el, host) {
    if (!rect) return;
    try {
      var bb = el.getBBox();
      rect.setAttribute('x', bb.x - 5);
      rect.setAttribute('y', bb.y - 3);
      rect.setAttribute('width', bb.width + 10);
      rect.setAttribute('height', bb.height + 6);
      var tr = el.getAttribute('transform');
      if (tr) rect.setAttribute('transform', tr);
      else rect.removeAttribute('transform');
      var ta = el.getAttribute('text-anchor') || (el.style && el.style.textAnchor);
      if (ta === 'middle') rect.setAttribute('x', bb.x - 5);
      if (ta === 'end') rect.setAttribute('x', bb.x - 5);
    } catch (e) {}
  }

  function relToHost(el, host) {
    var hb = host.getBoundingClientRect(), b = el.getBoundingClientRect();
    return { x: b.x - hb.x, y: b.y - hb.y, w: b.width, h: b.height };
  }

  /* Screen pixels per user unit for the space this element's transform acts
     in, which is its parent's. Uses the live CTM so nested group transforms
     are accounted for, not just the viewBox. */
  function userScale(el) {
    var p = el.parentNode;
    try {
      if (p && p.getScreenCTM) {
        var m = p.getScreenCTM();
        if (m) {
          var sx = Math.sqrt(m.a * m.a + m.b * m.b);
          var sy = Math.sqrt(m.c * m.c + m.d * m.d);
          if (sx > 0.01 && sy > 0.01) return { x: sx, y: sy };
        }
      }
    } catch (e) {}
    var own = el.ownerSVGElement;
    if (own) {
      var b = own.getBoundingClientRect();
      var vb = own.viewBox && own.viewBox.baseVal;
      if (vb && vb.width && vb.height && b.width && b.height) {
        return { x: b.width / vb.width, y: b.height / vb.height };
      }
    }
    return { x: 1, y: 1 };
  }

  function move(el, dx, dy) {
    if (el.tagName.toLowerCase() === 'text') {
      var sc = userScale(el);
      dx = dx / sc.x; dy = dy / sc.y;
      var t = el.getAttribute('transform') || '';
      var m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
      var bx = m ? parseFloat(m[1]) : 0, by = m ? parseFloat(m[2]) : 0;
      var rest = t.replace(/translate\([^)]*\)/, '').trim();
      el.setAttribute('transform', ('translate(' + (bx + dx) + ',' + (by + dy) + ') ' + rest).trim());
    } else {
      var cs = getComputedStyle(el);
      var left = parseFloat(el.style.left || cs.left) || 0;
      var top = parseFloat(el.style.top || cs.top) || 0;
      el.style.left = (left + dx) + 'px';
      el.style.top = (top + dy) + 'px';
    }
  }

  /* An axis title is not a curve label. Rotated text is always an axis title,
     and so is text sitting in the margin away from any ink. */
  function isAxisTitle(el) {
    var tr = (el.getAttribute && el.getAttribute('transform')) || '';
    if (/rotate/i.test(tr)) return true;
    var cs = getComputedStyle(el);
    if (cs.writingMode && cs.writingMode !== 'horizontal-tb') return true;
    return false;
  }

  /* Several pages (week8, 10, 11, 12) already draw a white rect behind each
     label. Those labels are ALREADY readable over a curve, which is the whole
     point of a plate, so this pass must leave them alone. Moving the text
     without the figure's own rect is what left white ghosts sitting on the
     curves. If a label is already backed, it is not our problem. */
  /* Text painted with a thick paper-coloured stroke under its fill reads
     cleanly over a curve without any box. week5 labels every figure this
     way. It is backing, so leave it alone. */
  function isHaloed(el) {
    if (!el.getAttribute) return false;
    var po = el.getAttribute('paint-order') || '';
    if (po.indexOf('stroke') < 0) {
      try { po = getComputedStyle(el).paintOrder || ''; } catch (e) { po = ''; }
      if (po.indexOf('stroke') < 0) return false;
    }
    var st = (el.getAttribute('stroke') || '').toLowerCase();
    if (!st || st === 'none') return false;
    return parseFloat(el.getAttribute('stroke-width') || '0') >= 2;
  }
  /* A label the figure has hidden (opacity 0, or inside a hidden group) is
     not on screen, so it must not be moved, plated, or counted as occupying
     part of the plot. */
  function shown(el) {
    var n = el;
    for (var i = 0; i < 6 && n && n.nodeType === 1; i++) {
      var cs;
      try { cs = getComputedStyle(n); } catch (e) { return true; }
      if (!cs) return true;
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity || '1') < 0.05) return false;
      if (n.tagName && n.tagName.toLowerCase() === 'svg') break;
      n = n.parentElement;
    }
    return true;
  }

  function alreadyBacked(el, host) {
    var b = el.getBoundingClientRect();
    if (!b.width) return false;
    if (isHaloed(el)) return true;
    var sibs = el.parentNode ? el.parentNode.children : [];
    for (var i = 0; i < sibs.length; i++) {
      var r = sibs[i];
      if (r === el || r.tagName.toLowerCase() !== 'rect') continue;
      if (r.hasAttribute('data-fl-plate')) continue;
      var rb = r.getBoundingClientRect();
      if (!rb.width) continue;
      var overlap = !(rb.right < b.left - 2 || b.right < rb.left - 2 || rb.bottom < b.top - 2 || b.bottom < rb.top - 2);
      if (!overlap) continue;
      var f = (r.getAttribute('fill') || '').toLowerCase();
      if (f === '#fff' || f === '#ffffff' || f === 'white' || f === 'var(--paper-raised)') return true;
    }
    return false;
  }

  /* Axis titles are not always rotated: "Quantity (Q)" sits flat under the
     x-axis. Anything hard against the bottom or left margin is a title. */
  /* "Q*=8", "P*=$12", "CS = $32", "slope = -1.25": a reading off the chart, not
     the name of an axis. These may be moved anywhere the grid is clear. */

  function isValueAnnotation(el) {
    var s2 = (el.textContent || '').trim();
    if (!s2 || s2.length > 34) return false;
    return /[=:]\s*[-+$(]?\d/.test(s2) || /^[A-Za-z][A-Za-z0-9*'\u2080-\u2089\u207a-\u207f\u00b9\u00b2\u00b3]{0,4}\s*=/.test(s2);
  }

  function inAxisMargin(el, host) {
    if (isValueAnnotation(el)) return false;
    var hb = host.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!b.width) return false;
    return (b.bottom > hb.bottom - 34) || (b.left < hb.left + 34);
  }

  function origTransform(el) {
    if (el.tagName.toLowerCase() !== 'text') return null;
    var stored = el.getAttribute('data-fl-t0');
    if (stored === null) {
      stored = el.getAttribute('transform') || '';
      el.setAttribute('data-fl-t0', stored);
    }
    return stored;
  }

  function resetLabel(el) {
    if (el.tagName.toLowerCase() === 'text') {
      var t0 = origTransform(el);
      if (t0) el.setAttribute('transform', t0); else el.removeAttribute('transform');
    } else {
      if (el.dataset.flL0 !== undefined) { el.style.left = el.dataset.flL0; el.style.top = el.dataset.flT0; }
      else { el.dataset.flL0 = el.style.left || ''; el.dataset.flT0 = el.style.top || ''; }
      if (el.dataset.flPlated) {
        el.style.background = '';
        el.style.border = '';
        el.style.borderRadius = '';
        el.style.padding = '';
        delete el.dataset.flPlated;
      }
    }
  }

  /* The box a label may be moved within: its own panel, not the whole wrapper.
     Returned in host-relative coordinates so it drops straight into the
     candidate test. */
  function ownerBounds(el, host) {
    var hb = host.getBoundingClientRect();
    var own = el.ownerSVGElement || (el.closest ? el.closest('svg') : null);
    var full = { x0: 0, y0: 0, x1: hb.width, y1: hb.height };
    if (!own) return full;
    var b = own.getBoundingClientRect();
    if (!b.width || !b.height) return full;
    var r = {
      x0: Math.max(0, b.x - hb.x),
      y0: Math.max(0, b.y - hb.y),
      x1: Math.min(hb.width, b.x - hb.x + b.width),
      y1: Math.min(hb.height, b.y - hb.y + b.height)
    };
    return (r.x1 - r.x0 > 40 && r.y1 - r.y0 > 40) ? r : full;
  }

  /* The ink map built for a host by placeIn, kept so the axis-title pass can
     ask the same questions about curves instead of only about ticks. */
  var gridFor = new WeakMap();

  /* The rect a figure drew behind this label. Found by overlap, so look it up
     while label and rect are still in step, never after one has moved. */
  function ownBackingRect(el) {
    if (!el.parentNode || el.tagName.toLowerCase() !== 'text') return null;
    var b = el.getBoundingClientRect();
    if (!b.width) return null;
    var sibs = el.parentNode.children;
    for (var i = 0; i < sibs.length; i++) {
      var r = sibs[i];
      if (r === el || r.tagName.toLowerCase() !== 'rect') continue;
      if (r.hasAttribute('data-fl-plate')) continue;
      var f = (r.getAttribute('fill') || '').toLowerCase();
      if (!(f === '#fff' || f === '#ffffff' || f === 'white' || f === 'var(--paper-raised)')) continue;
      var rb = r.getBoundingClientRect();
      if (!rb.width) continue;
      if (!(rb.right < b.left - 2 || b.right < rb.left - 2 ||
            rb.bottom < b.top - 2 || b.bottom < rb.top - 2)) return r;
    }
    return null;
  }

  /* Remember where an element started, for any svg element, not just text. */
  function origT(el) {
    var stored = el.getAttribute('data-fl-t0');
    if (stored === null) {
      stored = el.getAttribute('transform') || '';
      el.setAttribute('data-fl-t0', stored);
    }
    return stored;
  }

  function shiftEl(el, dx, dy) {
    var sc = userScale(el);
    dx = dx / sc.x; dy = dy / sc.y;
    var t = el.getAttribute('transform') || '';
    var m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
    var bx = m ? parseFloat(m[1]) : 0, by = m ? parseFloat(m[2]) : 0;
    var rest = t.replace(/translate\([^)]*\)/, '').trim();
    el.setAttribute('transform', ('translate(' + (bx + dx) + ',' + (by + dy) + ') ' + rest).trim());
  }

  /* Put a label and its own backing rect back where the figure drew them. */
  function resetPair(el) {
    var own = ownBackingRect(el);
    resetLabel(el);
    if (own) {
      var r0 = origT(own);
      if (r0) own.setAttribute('transform', r0); else own.removeAttribute('transform');
    }
  }

  /* Map a point from screen coordinates into the user space of an element,
     so a leader drawn as a sibling of the label lands where it should even
     inside a scaled viewBox or a transformed group. */
  function toUser(parent, sx, sy) {
    try {
      var svg = parent.ownerSVGElement || parent;
      var m = parent.getScreenCTM && parent.getScreenCTM();
      if (!m || !svg.createSVGPoint) return null;
      var pt = svg.createSVGPoint();
      pt.x = sx; pt.y = sy;
      var p = pt.matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    } catch (e) { return null; }
  }

  /* Where a segment from an outside point first meets a box, so the leader
     stops at the label instead of running under it. */
  function edgePoint(box, fromX, fromY) {
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    var dx = fromX - cx, dy = fromY - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var tx = dx ? (box.width / 2 + 2) / Math.abs(dx) : Infinity;
    var ty = dy ? (box.height / 2 + 2) / Math.abs(dy) : Infinity;
    var t = Math.min(tx, ty, 1);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  var LEADER_MIN = 28;   /* px: below this the label still reads as attached */

  /* fromScreen is where the label was before it was moved. */
  function leader(el, fromScreenX, fromScreenY, colour) {
    var parent = el.parentNode;
    if (!parent || !parent.ownerSVGElement) return;
    var box = el.getBoundingClientRect();
    if (!box.width) return;
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    var far = Math.sqrt((cx - fromScreenX) * (cx - fromScreenX) + (cy - fromScreenY) * (cy - fromScreenY));
    if (far < LEADER_MIN) return;
    var stop = edgePoint(box, fromScreenX, fromScreenY);
    var a = toUser(parent, fromScreenX, fromScreenY);
    var b = toUser(parent, stop.x, stop.y);
    if (!a || !b) return;
    var sc = userScale(el);
    var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('data-fl-leader', '1');
    ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
    ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
    ln.setAttribute('stroke', colour || '#4a5257');
    ln.setAttribute('stroke-width', (0.9 / (sc.x || 1)).toFixed(3));
    ln.setAttribute('stroke-dasharray', (3 / (sc.x || 1)).toFixed(2) + ',' + (2.5 / (sc.x || 1)).toFixed(2));
    ln.setAttribute('opacity', '0.5');
    ln.setAttribute('pointer-events', 'none');
    parent.insertBefore(ln, parent.firstChild);
  }

  function placeIn(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return 0;

    /* The pass must be idempotent. Figures redraw on every control change and
       d3 replaces its text nodes, which orphaned the plates from the previous
       run and left empty boxes sitting on the curves. And because move()
       ADDS to an existing translate, running twice without resetting made
       labels drift further each time. So: drop every plate, put every label
       back where the figure drew it, then decide again from scratch. */
    host.querySelectorAll('[data-fl-plate], [data-fl-leader]').forEach(function (r) { r.remove(); });

    var all = [], backedOnes = [], tickRects = [];
    host.querySelectorAll('svg text, .JXGtext').forEach(function (t) {
      if (!isCurveLabel(t) || isAxisTitle(t)) return;
      if (!shown(t)) return;
      if (inAxisMargin(t, host)) return;
      if (alreadyBacked(t, host)) { resetPair(t); backedOnes.push(t); return; }
      resetLabel(t); all.push(t);
    });

    var grid = new Grid(w, h);
    host.querySelectorAll('svg').forEach(function (s2) { addSvgInk(grid, s2, host); });
    host.querySelectorAll('canvas').forEach(function (cv) { addCanvasInk(grid, cv, host); });
    host.querySelectorAll('svg text, .JXGtext').forEach(function (t) {
      if (isCurveLabel(t) && !isAxisTitle(t)) return;
      if (!shown(t)) return;
      var r = relToHost(t, host);
      if (r.w) grid.markRect(r.x, r.y, r.w, r.h);
      var v = (t.textContent || '').trim();
      if (r.w && isNumberish(v)) tickRects.push(r);
    });
    gridFor.set(host, grid);

    if (!all.length && !backedOnes.length) return 0;

    var moved = 0;
    all.forEach(function (t) {
      var r0 = relToHost(t, host);
      if (!r0.w) return;
      var startClear = grid.clearance(r0.x, r0.y, r0.w, r0.h);

      /* Leave well-placed labels completely alone. The point of this pass is
         to fix labels that collide, not to restyle every label on the site:
         plating a label that was already clear only adds a box to the figure. */
      if (startClear >= CLEAR) { grid.markRect(r0.x, r0.y, r0.w, r0.h); return; }

      var colour = (t.getAttribute && t.getAttribute('fill')) || getComputedStyle(t).fill || getComputedStyle(t).color || '#14181b';
      if (!colour || colour === 'none') colour = '#14181b';

      var lb = ownerBounds(t, host);
      var best = null;
      for (var a = 0; a < 16; a++) {
        for (var d = 1; d <= 6; d++) {
          var ang = (Math.PI / 8) * a, dist = 16 * d;
          var nx = r0.x + Math.cos(ang) * dist, ny = r0.y - Math.sin(ang) * dist;
          if (nx < lb.x0 + 2 || ny < lb.y0 + 2 ||
              nx + r0.w > lb.x1 - 2 || ny + r0.h > lb.y1 - 2) continue;
          /* A label that travels a long way stops labelling the curve it
             names. Distance is priced high enough that a merely-adequate
             spot nearby beats a perfect one across the panel. */
          var sc = grid.clearance(nx, ny, r0.w, r0.h) - dist * 0.09;
          if (!best || sc > best.sc) best = { x: nx, y: ny, sc: sc };
        }
      }

      var wasBox = t.getBoundingClientRect();
      var fromX = wasBox.left + wasBox.width / 2, fromY = wasBox.top + wasBox.height / 2;
      if (best && best.sc > startClear + 0.5) {
        move(t, best.x - r0.x, best.y - r0.y);
        moved++;
        leader(t, fromX, fromY, colour);
      }
      /* Whether or not it found somewhere better, a label this close to ink
         gets a plate so it stays readable over whatever is behind it. */
      var rect = plate(t, colour);
      sizePlate(rect, t, host);
      var rf = relToHost(t, host);
      grid.markRect(rf.x, rf.y, rf.w, rf.h);
    });

    /* Labels the figure already backs: readable as drawn, so left exactly
       where their author put them, with one exception. A label covering a
       tick number is the "arrows overlap the numbers, hard to read" problem,
       so nudge that one, minimally, rect and all. */
    function hitsTick(r) {
      for (var i = 0; i < tickRects.length; i++) {
        var q = tickRects[i];
        if (!(r.x + r.w <= q.x || q.x + q.w <= r.x ||
              r.y + r.h <= q.y || q.y + q.h <= r.y)) return true;
      }
      return false;
    }
    backedOnes.forEach(function (t) {
      var r0 = relToHost(t, host);
      if (!r0.w) return;
      if (!hitsTick(r0)) { grid.markRect(r0.x, r0.y, r0.w, r0.h); return; }
      var own = ownBackingRect(t);
      var lb = ownerBounds(t, host);
      var picked = null;
      for (var d = 1; d <= 5 && !picked; d++) {
        for (var a = 0; a < 12; a++) {
          var ang = (Math.PI / 6) * a, dist = 9 * d;
          var nx = r0.x + Math.cos(ang) * dist, ny = r0.y - Math.sin(ang) * dist;
          if (nx < lb.x0 + 2 || ny < lb.y0 + 2 ||
              nx + r0.w > lb.x1 - 2 || ny + r0.h > lb.y1 - 2) continue;
          if (hitsTick({ x: nx, y: ny, w: r0.w, h: r0.h })) continue;
          if (grid.clearance(nx, ny, r0.w, r0.h) < 6) continue;
          picked = { x: nx, y: ny };
          break;
        }
      }
      if (picked) {
        var nb = t.getBoundingClientRect();
        var nFromX = nb.left + nb.width / 2, nFromY = nb.top + nb.height / 2;
        shiftEl(t, picked.x - r0.x, picked.y - r0.y);
        if (own) shiftEl(own, picked.x - r0.x, picked.y - r0.y);
        moved++;
        var nc = (t.getAttribute && t.getAttribute('fill')) || '#4a5257';
        leader(t, nFromX, nFromY, nc);
      }
      var rf = relToHost(t, host);
      grid.markRect(rf.x, rf.y, rf.w, rf.h);
    });

    return moved;
  }

  /* Plot containers are found by SHAPE, not only by class name. Four plots
     were being missed because their container is a bare <div id="jxg-ic-3d">
     with no class at all: Fig 2.1's 3D and 2D panels on week2, and two on
     week7. Anything that directly holds a chart-sized svg or canvas is a plot,
     whatever it happens to be called. */
  function hosts() {
    var found = [];
    var seen = [];
    document.querySelectorAll(PLOT_SEL).forEach(function (e) { found.push(e); seen.push(e); });
    document.querySelectorAll('div').forEach(function (d) {
      var kid = d.querySelector(':scope > svg, :scope > canvas');
      if (!kid) return;
      var r = kid.getBoundingClientRect();
      if (r.width < 160 || r.height < 120) return;
      if (d.closest('mjx-container')) return;
      for (var i = 0; i < seen.length; i++) { if (seen[i] === d || seen[i].contains(d)) return; }
      found.push(d);
    });
    return found;
  }

  /* ── axis titles ───────────────────────────────────────────────────────────
     The other half of the original report: the Y title clipped by the top of
     the plot, and the X title sitting on the last tick number. Both are drawn
     by each figure's own code, so they are corrected here for the same reason
     the curve labels are: 66 figures, four drawing styles, one pass.

     A title is nudged ALONG its own axis first (an X title slides sideways, a
     Y title slides up or down), because moving it outward is what pushed it off
     the edge in the first place. Outward is only tried if sliding fails. */
  function isTitleish(el, host) {
    var s2 = (el.textContent || '').trim();
    if (!s2 || s2.length > 34) return false;
    if (isValueAnnotation(el)) return false;
    if (isNumberish(s2)) return false;
    var tr = (el.getAttribute && el.getAttribute('transform')) || '';
    if (/rotate/i.test(tr)) return true;
    var hb = host.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!b.width) return false;
    return b.bottom > hb.bottom - 34 || b.left < hb.left + 34 || b.top < hb.top + 20;
  }

  function placeAxisTitles(host) {
    var hb = host.getBoundingClientRect();
    if (!hb.width) return 0;
    var inkGrid = gridFor.get(host);

    var ticks = [];
    host.querySelectorAll('svg text, .JXGtext').forEach(function (t) {
      var v = (t.textContent || '').trim();
      if (!isNumberish(v)) return;
      if (!shown(t)) return;
      var b = t.getBoundingClientRect();
      if (b.width) ticks.push(b);
    });

    var fixed = 0;
    host.querySelectorAll('svg text, .JXGtext').forEach(function (t) {
      if (!isTitleish(t, host)) return;
      if (!shown(t)) return;
      /* Reset to where the figure drew it before deciding anything, so repeat
         runs cannot accumulate offsets. */
      resetLabel(t);
      var tr0 = (t.getAttribute && t.getAttribute('transform')) || '';
      var rotated = /rotate/i.test(tr0);

      function boxAt(dx, dy) {
        move(t, dx, dy);
        var b = t.getBoundingClientRect();
        move(t, -dx, -dy);
        return b;
      }
      var ob = t.ownerSVGElement ? t.ownerSVGElement.getBoundingClientRect() : hb;
      if (!ob.width || !ob.height) ob = hb;
      function outside(b) {
        return b.left < ob.left + 1 || b.right > ob.right - 1 || b.top < ob.top + 1 || b.bottom > ob.bottom - 1;
      }
      /* A title resting on a curve is just as unreadable as one resting on a
         tick number, and until now only the second was checked. */
      function onInk(b) {
        if (!inkGrid) return false;
        return inkGrid.clearance(b.left - hb.left, b.top - hb.top, b.width, b.height) < 6;
      }
      /* How much a candidate position costs. Infinity means unusable. */
      function cost(b, dx, dy) {
        if (outside(b)) return Infinity;
        /* moving out of the plot is nearly free; sliding along the axis is
           priced so the title stays near where its figure put it */
        var outDist = rotated ? Math.max(0, -dx) : Math.max(0, dy);
        var alongDist = rotated ? Math.abs(dy) : Math.abs(dx);
        var c = outDist * 0.02 + alongDist * 0.11;
        if (onInk(b)) c += 30;
        for (var i = 0; i < ticks.length; i++) {
          var tb = ticks[i];
          if (!(b.right + 2 <= tb.left || tb.right + 2 <= b.left ||
                b.bottom + 2 <= tb.top || tb.bottom + 2 <= b.top)) c += 18;
        }
        return c;
      }

      var here = cost(t.getBoundingClientRect(), 0, 0);
      if (here === 0) return;               /* already clear of everything */

      /* Candidates, in the order they should be preferred:
         out  = away from the plot, the direction an axis title has room in
         along = sideways for an x-title, up or down for a y-title
         Never inward: a title inside the plot reads as a stray annotation. */
      var tries = [[0, 0]];
      var outward = rotated ? [-1, 0] : [0, 1];      // y-title left, x-title down
      var along = rotated ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (var o = 4; o <= 48; o += 4) tries.push([outward[0] * o, outward[1] * o]);
      for (var d = 8; d <= 120; d += 8) {
        along.forEach(function (v) { tries.push([v[0] * d, v[1] * d]); });
      }
      for (var o2 = 6; o2 <= 30; o2 += 6) {
        along.forEach(function (v) {
          for (var dd = 16; dd <= 96; dd += 16) {
            tries.push([v[0] * dd + outward[0] * o2, v[1] * dd + outward[1] * o2]);
          }
        });
      }
      var best = null;
      for (var k = 0; k < tries.length; k++) {
        var dx = tries[k][0], dy = tries[k][1];
        var c = cost(dx === 0 && dy === 0 ? t.getBoundingClientRect() : boxAt(dx, dy), dx, dy);
        if (best === null || c < best.c) best = { c: c, dx: dx, dy: dy };
        if (best.c === 0) break;
      }
      if (!best || best.c === Infinity) best = { c: here, dx: 0, dy: 0 };
      if (best.dx || best.dy) { move(t, best.dx, best.dy); fixed++; }

      /* Still touching something after choosing the least-bad spot: back it
         so it stays readable over whatever it is sitting on. */
      if (best.c === 0) return;
      var tcol = (t.getAttribute && t.getAttribute('fill')) || getComputedStyle(t).fill || getComputedStyle(t).color || '#14181b';
      if (!tcol || tcol === 'none') tcol = '#14181b';
      var trect = plate(t, tcol, true);   // plain white, no coloured outline
      if (trect) { sizePlate(trect, t, host); fixed++; }
    });
    return fixed;
  }

  /* The host list is stable between redraws, and finding it means measuring
     every div on the page, so it is worth caching. */
  var hostCache = null;
  function hostList(fresh) {
    if (fresh || !hostCache) hostCache = hosts();
    return hostCache;
  }

  /* Pass a list to re-solve only the plots that changed. No argument means all
     of them, which is what the public run() and the first load want. */
  function runAll(only) {
    var list = only || hostList(true);
    var live = [];
    list.forEach(function (h) { if (h.getBoundingClientRect().width) live.push(h); });
    var n = 0;
    live.forEach(function (host) { try { n += placeIn(host); } catch (e) {} });
    /* One more sweep, now that every label's final box is known. Crowded plots
       need it: the first pass places labels against a grid that does not yet
       contain the labels placed after them. */
    live.forEach(function (host) { try { n += placeIn(host); } catch (e) {} });
    live.forEach(function (host) { try { n += placeAxisTitles(host); } catch (e) {} });
    return n;
  }

  /* ── scheduling ──────────────────────────────────────────────────────────
     Two things used to make this feel broken while you drag a slider.

     A pass is expensive, 150 to 310ms on the crowded pages, because it reads
     back every canvas and re-solves every label. It cannot run per frame.

     And the pass writes to the DOM, plates plus a transform on each label it
     moves, which wakes the very observer that triggers it. One nudge on week 6
     set off nine passes chasing each other, and any request that arrived while
     a pass was running was dropped rather than queued, so labels sat on the
     curve until some unrelated mutation happened to wake the pass again.

     So: ignore our own writes, never drop a queued request, and re-solve only
     the plots that actually changed. */
  var pending = null, busy = false, muting = false, firstAsk = 0;
  var dirty = null;              /* null means "every plot"; an array means those */
  var MAX_WAIT = 320;            /* a sustained drag still refreshes this often */

  function ownerHost(node) {
    var el = (node && node.nodeType === 1) ? node : (node && node.parentElement);
    var list = hostList();
    while (el) {
      if (list.indexOf(el) >= 0) return el;
      el = el.parentElement;
    }
    return null;
  }

  /* A control lives outside the plot it drives, so an event is attributed to
     every plot in its figure rather than to one element. */
  function markSection(node) {
    if (dirty === null) return;
    var el = (node && node.nodeType === 1) ? node : (node && node.parentElement);
    var sec = el && el.closest ? el.closest('section.sec, .fig-bay, figure') : null;
    if (!sec) { dirty = null; return; }
    var list = hostList(), hit = false;
    for (var i = 0; i < list.length; i++) {
      if (sec.contains(list[i]) && dirty.indexOf(list[i]) < 0) { dirty.push(list[i]); hit = true; }
      else if (sec.contains(list[i])) hit = true;
    }
    if (!hit) dirty = null;
  }

  function markHost(node) {
    if (dirty === null) return;
    var h = ownerHost(node);
    if (!h) { dirty = null; return; }
    if (dirty.indexOf(h) < 0) dirty.push(h);
  }

  function runNow() {
    busy = true;
    muting = true;
    var todo = (dirty === null) ? hostList(true) : dirty.slice();
    dirty = [];
    firstAsk = 0;
    try { runAll(todo); } catch (e) {}
    /* Our plates and transforms are already sitting in the observer's queue.
       Let two frames go by before listening again so the pass does not read its
       own writes as a fresh redraw. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { muting = false; busy = false; });
    });
  }

  /* scope: an element to attribute the change to, 'section' to widen it to the
     whole figure, or nothing at all to mean every plot. false keeps the scope
     already queued, which is what a deferred retry wants. */
  function schedule(delay, node, wide) {
    if (node === false) { /* keep the current scope */ }
    else if (!node) dirty = null;
    else if (wide) markSection(node);
    else markHost(node);

    var now = Date.now();
    if (!firstAsk) firstAsk = now;
    if (busy) {
      clearTimeout(pending);
      pending = setTimeout(function () { schedule(0, false); }, 90);
      return;
    }
    var want = (delay == null) ? 140 : delay;
    var d = Math.max(0, Math.min(want, MAX_WAIT - (now - firstAsk)));
    clearTimeout(pending);
    pending = setTimeout(function () { requestAnimationFrame(runNow); }, d);
  }

  function start() {
    schedule(700);
    /* Figures redraw on every control change, which rewrites their labels, so
       the pass has to run again after each redraw rather than once on load. */
    var obs = new MutationObserver(function (recs) {
      if (muting) return;                       /* our own plates and nudges */
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].target && recs[i].target.closest &&
            recs[i].target.closest('[data-fl-plate]')) continue;
        schedule(180, recs[i].target);
      }
    });
    hostList(true).forEach(function (h) {
      obs.observe(h, { childList: true, subtree: true, attributes: true, attributeFilter: ['d', 'transform', 'x', 'y', 'points'] });
    });
    addEventListener('resize', function () { hostCache = null; schedule(220); });
    document.addEventListener('input', function (e) { schedule(200, e.target, true); }, true);
    document.addEventListener('click', function (e) { schedule(240, e.target, true); }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.EC224FigLabels = { run: runAll };
})();
