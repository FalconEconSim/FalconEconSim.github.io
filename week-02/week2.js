/* ═══════════════════════════════════════════════════════════════════════════
   WEEK 2 — Consumer Choice: All JSXGraph Visualizations
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Shared board config ──────────────────────────────────────────────────────
const BOARD_DEFAULTS = {
  axis: true,
  keepaspectratio: false,
  showNavigation: false,
  showCopyright: false,
  grid: false,
  defaultAxes: {
    x: {
      name: 'X', withLabel: true, label: { offset: [0, -14], anchorX: 'right', fontSize: 13 },
      ticks: { insertTicks: true, minorTicks: 0, strokeColor: '#ccc', label: { fontSize: 10 } }
    },
    y: {
      name: 'Y', withLabel: true, label: { offset: [-14, 0], anchorY: 'top', fontSize: 13 },
      ticks: { insertTicks: true, minorTicks: 0, strokeColor: '#ccc', label: { fontSize: 10 } }
    }
  }
};

function makeBoard(id, bbox, extra = {}) {
  return JXG.JSXGraph.initBoard(id, {
    boundingbox: bbox,
    ...BOARD_DEFAULTS,
    ...extra
  });
}

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  accent:  '#3d5a80',
  accent2: '#6b8cae',
  accent3: '#9db5cc',
  accent4: '#c5d9eb',
  green:   '#2e8b57',
  red:     '#c0392b',
  amber:   '#d4813a',
  purple:  '#6b52a8',
  gray:    '#888',
  budget:  '#1a1a2a',
  budget2: '#c0392b',
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. INDIFFERENCE CURVE EXPLORER
   ═══════════════════════════════════════════════════════════════════════════ */
let icBoard, icCurves = [];

const IC_INFO = {
  cobb: {
    label: 'Cobb-Douglas',
    fn:    '\\(U(X,Y) = X^{\\alpha} \\cdot Y^{1-\\alpha}\\)',
    shape: 'Smooth &amp; convex (bowed toward origin)',
    mrs:   'Diminishing: \\(\\displaystyle MRS = \\frac{\\alpha Y}{(1-\\alpha)X}\\)',
    desc:  'The consumer substitutes \\(X\\) for \\(Y\\) at a <em>decreasing rate</em> — the convex shape reflects a preference for variety. Moving outward (upper-right) reaches higher utility. The \\(\\alpha\\) slider shifts how much the consumer values \\(X\\) relative to \\(Y\\).',
  },
  substitutes: {
    label: 'Perfect Substitutes',
    fn:    '\\(U(X,Y) = a \\cdot X + b \\cdot Y\\)',
    shape: 'Straight parallel lines, slope \\(-a/b\\)',
    mrs:   'Constant: \\(MRS = a/b\\) everywhere',
    desc:  'The consumer treats the goods as <em>perfectly interchangeable</em>. The MRS is constant — willingness to trade never changes no matter how much of each good is held. The optimal bundle is typically a <strong>corner solution</strong>: spend everything on whichever good gives more utility per dollar.',
  },
  complements: {
    label: 'Perfect Complements',
    fn:    '\\(U(X,Y) = \\min(X,\\, Y)\\)',
    shape: 'L-shaped, kink on the 45° line',
    mrs:   '\\(0\\), \\(\\infty\\), or undefined at the kink',
    desc:  'Goods must be consumed in a fixed ratio — extra units of one without the other add <em>no utility</em>. The kink point \\((k,k)\\) is the only place on each IC where both goods are fully used. The optimum is always at the kink: use the condition \\(X = Y\\) plus the budget constraint.',
  },
  neutral: {
    label: 'Neutral Good (Y useless)',
    fn:    '\\(U(X,Y) = X\\)',
    shape: 'Vertical lines — independent of \\(Y\\)',
    mrs:   '\\(\\infty\\) — \\(Y\\) adds nothing to utility',
    desc:  'Good \\(Y\\) is completely irrelevant to this consumer. Utility depends only on \\(X\\), so the consumer is indifferent across all bundles with the same \\(X\\) regardless of \\(Y\\). Higher utility means moving <em>rightward only</em> — the indifference curves are vertical lines.',
  },
  bad: {
    label: 'Economic Bad (Y harmful)',
    fn:    '\\(U(X,Y) = X - Y\\)',
    shape: 'Upward-sloping lines',
    mrs:   'Negative — more \\(Y\\) requires compensation in \\(X\\)',
    desc:  'More \\(Y\\) <em>reduces</em> utility. To stay at the same utility level as \\(Y\\) rises, the consumer must receive more \\(X\\) as compensation — hence the upward slope. Higher utility lies to the right (more \\(X\\)) or downward (less of the bad \\(Y\\)). Classic examples: pollution, commute time, noise.',
  },
};

function initICExplorer() {
  icBoard = makeBoard('jxg-ic', [-0.5, 10.5, 10.5, -0.5]);
  drawICType('cobb', 0.5, 1);

  // Type buttons
  document.getElementById('ic-type-btns').addEventListener('click', e => {
    if (!e.target.classList.contains('type-btn')) return;
    document.querySelectorAll('#ic-type-btns .type-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const type = e.target.dataset.type;
    const alpha = parseFloat(document.getElementById('alpha-slider').value);
    const subst = parseFloat(document.getElementById('subst-slider').value);
    updateICControls(type);
    drawICType(type, alpha, subst);
    updateICInfo(type);
  });

  // Alpha slider
  document.getElementById('alpha-slider').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    document.getElementById('alpha-val').textContent = v.toFixed(2);
    const type = document.querySelector('#ic-type-btns .type-btn.active').dataset.type;
    const subst = parseFloat(document.getElementById('subst-slider').value);
    drawICType(type, v, subst);
  });

  // Subst slider
  document.getElementById('subst-slider').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    document.getElementById('subst-val').textContent = v.toFixed(1);
    const type = document.querySelector('#ic-type-btns .type-btn.active').dataset.type;
    const alpha = parseFloat(document.getElementById('alpha-slider').value);
    drawICType(type, alpha, v);
  });

  updateICInfo('cobb');
}

function updateICControls(type) {
  document.getElementById('alpha-ctrl').style.display = type === 'cobb' ? '' : 'none';
  document.getElementById('subst-ctrl').style.display = type === 'substitutes' ? '' : 'none';
}

function updateICInfo(type) {
  const info = IC_INFO[type];
  document.getElementById('ic-type-label').textContent = info.label;
  // Use innerHTML so MathJax \(...\) delimiters are parsed
  document.getElementById('ic-utility-fn').innerHTML = info.fn;
  document.getElementById('ic-shape').innerHTML      = info.shape;
  document.getElementById('ic-mrs').innerHTML        = info.mrs;
  document.getElementById('ic-description').innerHTML = info.desc;
  // Re-render any new LaTeX injected into the right panel
  window.retypeset(document.getElementById('jxg-ic').closest('.viz-wrapper').querySelector('.viz-panel-right'));
}

function drawICType(type, alpha, substA) {
  // Clear old curves
  icCurves.forEach(obj => { try { icBoard.removeObject(obj); } catch(e){} });
  icCurves = [];

  const levels = [1.5, 2.5, 3.5, 5.0, 7.0];
  const N = 300;
  const xMax = 10;

  levels.forEach((k, idx) => {
    const t = idx / (levels.length - 1);
    const col = lerpColor('#c5d9eb', '#3d5a80', t);
    const strokeW = idx === 1 ? 2.8 : 1.6;

    if (type === 'cobb') {
      const b = 1 - alpha;
      const xs = [], ys = [];
      for (let i = 0; i <= N; i++) {
        const x = 0.05 + (xMax - 0.05) * i / N;
        const y = Math.pow(k / Math.pow(x, alpha), 1 / b);
        if (y >= 0 && y <= 12) { xs.push(x); ys.push(y); }
      }
      const curve = icBoard.create('curve', [xs, ys], {
        strokeColor: col, strokeWidth: strokeW, fixed: true
      });
      icCurves.push(curve);

    } else if (type === 'substitutes') {
      // Y = (k - a*X) / 1
      const a = substA;
      const x0 = 0, y0 = k / 1;
      const x1 = Math.min(xMax, k / a);
      const line = icBoard.create('line', [[x0, y0], [x1, 0]], {
        strokeColor: col, strokeWidth: strokeW, fixed: true, straightFirst: false, straightLast: false
      });
      icCurves.push(line);

    } else if (type === 'complements') {
      // L-shape: kink at (k, k)
      // Horizontal arm: y = k, x from k to xMax
      // Vertical arm: x = k, y from k to yMax
      if (k > xMax) return;
      const xKink = k, yKink = k;
      const seg1 = icBoard.create('segment', [[xKink, yKink], [xMax, yKink]], {
        strokeColor: col, strokeWidth: strokeW, fixed: true
      });
      const seg2 = icBoard.create('segment', [[xKink, yKink], [xKink, xMax]], {
        strokeColor: col, strokeWidth: strokeW, fixed: true
      });
      icCurves.push(seg1, seg2);

    } else if (type === 'neutral') {
      // Vertical lines at X = k
      if (k > xMax) return;
      const line = icBoard.create('segment', [[k, 0], [k, 10]], {
        strokeColor: col, strokeWidth: strokeW, fixed: true
      });
      icCurves.push(line);

    } else if (type === 'bad') {
      // U = X - Y  => same IC: X - Y = k  => Y = X - k
      // Upward-sloping lines
      const xs2 = [Math.max(0, k), xMax];
      const ys2 = [Math.max(0, k) - k, xMax - k];
      if (ys2[1] > 11) return;
      const seg = icBoard.create('segment', [[xs2[0], ys2[0]], [xs2[1], Math.min(ys2[1], 10)]], {
        strokeColor: col, strokeWidth: strokeW, fixed: true
      });
      icCurves.push(seg);
    }
  });

  // Increasing utility arrow annotation
  let arrowEl = document.getElementById('ic-arrow-label');
  if (arrowEl) arrowEl.remove();
  icBoard.update();
}

function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
  const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
  const r  = Math.round(r1 + t*(r2-r1));
  const g  = Math.round(g1 + t*(g2-g1));
  const b  = Math.round(b1 + t*(b2-b1));
  return `rgb(${r},${g},${b})`;
}


/* ═══════════════════════════════════════════════════════════════════════════
   2. 3D UTILITY SURFACE — Canvas renderer
   ═══════════════════════════════════════════════════════════════════════════ */
function init3DSurface() {
  const canvas = document.getElementById('canvas-3d');
  if (!canvas) return;
  drawSurface3D();

  document.getElementById('surf-alpha').addEventListener('input', e => {
    document.getElementById('surf-alpha-val').textContent = parseFloat(e.target.value).toFixed(2);
    drawSurface3D();
  });
  document.getElementById('surf-angle').addEventListener('input', e => {
    document.getElementById('surf-angle-val').textContent = e.target.value + '°';
    drawSurface3D();
  });
}

function drawSurface3D() {
  const canvas = document.getElementById('canvas-3d');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const alpha = parseFloat(document.getElementById('surf-alpha').value);
  const tiltDeg = parseFloat(document.getElementById('surf-angle').value);
  const tilt = tiltDeg * Math.PI / 180;

  const GRID = 28;
  const XMIN = 0.2, XMAX = 7, YMIN = 0.2, YMAX = 7, ZMAX = 6;

  // Projection: isometric-style
  const scale = 42;
  const cx = W * 0.42, cy = H * 0.78;

  function project(gx, gy, gz) {
    // Rotate around Y-axis by tilt
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    const px = (gx - (XMAX+XMIN)/2) * cosT + gz * sinT * 0.45;
    const py = -(gy - (YMAX+YMIN)/2) * 0.7 - gz * cosT * 0.5;
    return [cx + px * scale, cy + py * scale];
  }

  function utilZ(x, y) {
    return Math.min(x**alpha * y**(1-alpha), ZMAX);
  }

  // Build grid cells
  const cells = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x0 = XMIN + (XMAX-XMIN)*i/GRID;
      const x1 = XMIN + (XMAX-XMIN)*(i+1)/GRID;
      const y0 = YMIN + (YMAX-YMIN)*j/GRID;
      const y1 = YMIN + (YMAX-YMIN)*(j+1)/GRID;
      const z00 = utilZ(x0,y0), z10 = utilZ(x1,y0);
      const z01 = utilZ(x0,y1), z11 = utilZ(x1,y1);
      const zAvg = (z00+z10+z01+z11)/4;
      cells.push({x0,x1,y0,y1,z00,z10,z01,z11,zAvg,i,j});
    }
  }

  // Sort back-to-front (painter's algorithm)
  cells.sort((a, b) => {
    const cosT = Math.cos(tilt);
    const aMid = a.x0*cosT + a.y0;
    const bMid = b.x0*cosT + b.y0;
    return aMid - bMid;
  });

  // Draw surface
  cells.forEach(({x0,x1,y0,y1,z00,z10,z01,z11,zAvg}) => {
    const [p0x,p0y] = project(x0,y0,z00);
    const [p1x,p1y] = project(x1,y0,z10);
    const [p2x,p2y] = project(x1,y1,z11);
    const [p3x,p3y] = project(x0,y1,z01);

    const t = Math.pow(zAvg/ZMAX, 0.7);
    const r = Math.round(61  + t*(220-61));
    const g = Math.round(90  + t*(240-90));
    const b = Math.round(128 + t*(220-128));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(p0x,p0y); ctx.lineTo(p1x,p1y);
    ctx.lineTo(p2x,p2y); ctx.lineTo(p3x,p3y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  });

  // Draw level curves (ICs) on the surface
  const levels = [1, 1.8, 2.8, 4, 5.5];
  const colors = ['#c0392b','#e67e22','#2e8b57','#6b52a8','#1a1a2a'];
  levels.forEach((k, ki) => {
    ctx.beginPath();
    let started = false;
    for (let t = 0; t <= 1; t += 0.008) {
      const x = XMIN + (XMAX-XMIN)*t;
      // Cobb-Douglas IC: Y = (k / x^alpha)^(1/(1-alpha))
      const b = 1-alpha;
      const y = Math.pow(k / Math.pow(x, alpha), 1/b);
      if (y < YMIN || y > YMAX) { started = false; continue; }
      const z = utilZ(x,y);
      const [px,py] = project(x,y,z+0.04);
      if (!started) { ctx.moveTo(px,py); started = true; }
      else ctx.lineTo(px,py);
    }
    ctx.strokeStyle = colors[ki];
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Label
    const xLbl = XMIN + (XMAX-XMIN)*0.35;
    const b = 1-alpha;
    const yLbl = Math.pow(k / Math.pow(xLbl, alpha), 1/b);
    if (yLbl >= YMIN && yLbl <= YMAX) {
      const z = utilZ(xLbl,yLbl);
      const [lx,ly] = project(xLbl,yLbl,z+0.3);
      ctx.fillStyle = colors[ki];
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`U=${k}`, lx+3, ly-3);
    }
  });

  // Axis labels
  ctx.fillStyle = '#444';
  ctx.font = '12px Source Serif 4, serif';
  const [ax,ay] = project(XMAX+0.3, (YMAX+YMIN)/2, 0);
  ctx.fillText('X →', ax, ay);
  const [bx,by] = project((XMAX+XMIN)/2, YMAX+0.3, 0);
  ctx.fillText('Y →', bx, by);
  const [zx,zy] = project(XMIN, YMIN, ZMAX+0.2);
  ctx.fillStyle = '#3d5a80';
  ctx.font = 'bold 11px Source Serif 4, serif';
  ctx.fillText('U(X,Y) ↑', zx-30, zy);

  // Caption
  ctx.fillStyle = '#888';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillText(`Colored lines = indifference curves (level curves of U at fixed heights)`, 12, H-8);
}


/* ═══════════════════════════════════════════════════════════════════════════
   3. BUDGET CONSTRAINT
   ═══════════════════════════════════════════════════════════════════════════ */
let bcBoard, bcObjects = [];

function initBudgetBoard() {
  bcBoard = makeBoard('jxg-budget', [-0.5, 32, 32, -0.5]);
  drawBudgetLine();

  ['bc-I','bc-Px','bc-Py'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (id==='bc-I')  document.getElementById('bc-I-val').textContent  = v;
      if (id==='bc-Px') document.getElementById('bc-Px-val').textContent = v;
      if (id==='bc-Py') document.getElementById('bc-Py-val').textContent = v;
      drawBudgetLine();
    });
  });
}

function drawBudgetLine() {
  bcObjects.forEach(o => { try { bcBoard.removeObject(o); } catch(e){} });
  bcObjects = [];

  const I  = parseFloat(document.getElementById('bc-I').value);
  const Px = parseFloat(document.getElementById('bc-Px').value);
  const Py = parseFloat(document.getElementById('bc-Py').value);

  const xInt = I / Px;
  const yInt = I / Py;
  const slope = -Px / Py;

  // Shaded affordable region
  const poly = bcBoard.create('polygon', [[0,0],[xInt,0],[0,yInt]], {
    fillColor: C.accent, fillOpacity: 0.08, strokeWidth: 0, fixed: true, vertices: { visible: false }
  });

  // Budget line
  const line = bcBoard.create('segment', [[0, yInt], [xInt, 0]], {
    strokeColor: C.budget, strokeWidth: 2.5, fixed: true
  });

  // Intercept dots
  const dotX = bcBoard.create('point', [xInt, 0], {
    color: C.red, size: 5, name: `X-int = ${xInt.toFixed(1)}`, withLabel: true,
    label: { fontSize: 11, offset: [6, -12] }, fixed: true
  });
  const dotY = bcBoard.create('point', [0, yInt], {
    color: C.red, size: 5, name: `Y-int = ${yInt.toFixed(1)}`, withLabel: true,
    label: { fontSize: 11, offset: [6, 4] }, fixed: true
  });

  bcObjects.push(poly, line, dotX, dotY);

  // Adjust bounding box
  const m = Math.max(xInt, yInt) * 1.3;
  bcBoard.setBoundingBox([-0.5, m, m, -0.5], false);

  // Update sidebar
  document.getElementById('bc-equation').textContent = `${Px}X + ${Py}Y = ${I}`;
  document.getElementById('bc-x-int').textContent    = xInt.toFixed(2);
  document.getElementById('bc-y-int').textContent    = yInt.toFixed(2);
  document.getElementById('bc-slope').textContent    = slope.toFixed(3);
  document.getElementById('bc-opp-cost').textContent = Math.abs(slope).toFixed(2);

  bcBoard.update();
}


/* ═══════════════════════════════════════════════════════════════════════════
   4. SHIFT vs PIVOT
   ═══════════════════════════════════════════════════════════════════════════ */
let shiftBoard, shiftObjects = [];
const BASE = { I: 100, Px: 5, Py: 4 };

function initShiftBoard() {
  shiftBoard = makeBoard('jxg-shifts', [-0.5, 38, 38, -0.5]);
  drawShiftPivot();

  document.getElementById('shift-type').addEventListener('change', drawShiftPivot);
  document.getElementById('shift-mag').addEventListener('input', e => {
    document.getElementById('shift-mag-val').textContent = '+' + e.target.value + '%';
    drawShiftPivot();
  });
}

function drawShiftPivot() {
  shiftObjects.forEach(o => { try { shiftBoard.removeObject(o); } catch(e){} });
  shiftObjects = [];

  const type = document.getElementById('shift-type').value;
  const mag  = parseFloat(document.getElementById('shift-mag').value) / 100;

  let I2 = BASE.I, Px2 = BASE.Px, Py2 = BASE.Py;
  let changeLabel = '', fixedLabel = '', desc = '';

  switch(type) {
    case 'income-up':
      I2 = BASE.I * (1 + mag);
      changeLabel = `Income ↑ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'Neither (parallel shift)';
      desc = 'Both intercepts move outward by the same proportion. The slope is unchanged because prices did not change. This is a <strong>parallel shift</strong>.';
      break;
    case 'income-down':
      I2 = BASE.I * (1 - mag);
      changeLabel = `Income ↓ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'Neither (parallel shift)';
      desc = 'Both intercepts move inward proportionally. The slope is unchanged. <strong>Parallel shift inward</strong>.';
      break;
    case 'px-down':
      Px2 = BASE.Px * (1 - mag);
      changeLabel = `P_X ↓ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'Y-intercept (I/P_Y fixed)';
      desc = 'The Y-intercept is anchored — P_Y and I did not change. The X-intercept moves outward (X is cheaper). The line <strong>pivots out</strong> around the Y-intercept and becomes flatter.';
      break;
    case 'px-up':
      Px2 = BASE.Px * (1 + mag);
      changeLabel = `P_X ↑ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'Y-intercept (I/P_Y fixed)';
      desc = 'X is more expensive, so the X-intercept moves inward. The Y-intercept stays fixed. The line <strong>pivots in</strong> and becomes steeper.';
      break;
    case 'py-down':
      Py2 = BASE.Py * (1 - mag);
      changeLabel = `P_Y ↓ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'X-intercept (I/P_X fixed)';
      desc = 'The X-intercept is anchored. The Y-intercept moves outward (Y is cheaper). The line <strong>pivots out</strong> and becomes steeper (in terms of the X/Y trade-off).';
      break;
    case 'py-up':
      Py2 = BASE.Py * (1 + mag);
      changeLabel = `P_Y ↑ ${(mag*100).toFixed(0)}%`;
      fixedLabel  = 'X-intercept (I/P_X fixed)';
      desc = 'The X-intercept stays fixed. The Y-intercept moves inward. The line <strong>pivots in</strong> and becomes flatter.';
      break;
  }

  const xInt1 = BASE.I/BASE.Px, yInt1 = BASE.I/BASE.Py;
  const xInt2 = I2/Px2, yInt2 = I2/Py2;
  const slope1 = -(BASE.Px/BASE.Py);
  const slope2 = -(Px2/Py2);

  const maxV = Math.max(xInt1, yInt1, xInt2, yInt2) * 1.3;
  shiftBoard.setBoundingBox([-0.5, maxV, maxV, -0.5], false);

  // Original line (dashed)
  const l1 = shiftBoard.create('segment', [[0,yInt1],[xInt1,0]], {
    strokeColor: C.accent, strokeWidth: 2, strokeOpacity: 0.45,
    dash: 2, fixed: true
  });
  const t1 = shiftBoard.create('text', [xInt1/2+1, yInt1/2+0.5, 'Original'], {
    fontSize: 11, color: C.accent, fixed: true
  });

  // New line (solid)
  const l2 = shiftBoard.create('segment', [[0,yInt2],[xInt2,0]], {
    strokeColor: C.red, strokeWidth: 2.5, fixed: true
  });
  const t2 = shiftBoard.create('text', [xInt2/2+0.5, yInt2/2+0.5, 'New'], {
    fontSize: 11, color: C.red, fixed: true
  });

  // Pivot point marker (if it's a pivot)
  if (type.startsWith('px')) {
    const pivotDot = shiftBoard.create('point', [0, yInt1], {
      color: C.amber, size: 6, name: 'Pivot', withLabel: true,
      label: { fontSize: 10, offset: [6, 0] }, fixed: true
    });
    shiftObjects.push(pivotDot);
  }
  if (type.startsWith('py')) {
    const pivotDot = shiftBoard.create('point', [xInt1, 0], {
      color: C.amber, size: 6, name: 'Pivot', withLabel: true,
      label: { fontSize: 10, offset: [0, -12] }, fixed: true
    });
    shiftObjects.push(pivotDot);
  }

  shiftObjects.push(l1, t1, l2, t2);

  document.getElementById('shift-change-label').textContent = changeLabel;
  document.getElementById('shift-slope1').textContent       = slope1.toFixed(3);
  document.getElementById('shift-slope2').textContent       = slope2.toFixed(3);
  document.getElementById('shift-fixed').textContent        = fixedLabel;
  document.getElementById('shift-description').innerHTML    = desc;

  shiftBoard.update();
}


/* ═══════════════════════════════════════════════════════════════════════════
   5. CONSUMER OPTIMUM
   ═══════════════════════════════════════════════════════════════════════════ */
let optBoard, optObjects = [];

function initOptimumBoard() {
  optBoard = makeBoard('jxg-optimum', [-0.5, 32, 32, -0.5]);
  drawOptimum();

  ['opt-type','opt-I','opt-Px','opt-Py','opt-alpha'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value) || el.value;
      if (id==='opt-I')     document.getElementById('opt-I-val').textContent     = v;
      if (id==='opt-Px')    document.getElementById('opt-Px-val').textContent    = v;
      if (id==='opt-Py')    document.getElementById('opt-Py-val').textContent    = v;
      if (id==='opt-alpha') document.getElementById('opt-alpha-val').textContent = parseFloat(v).toFixed(2);
      const showAlpha = document.getElementById('opt-type').value === 'cobb';
      document.getElementById('opt-alpha-ctrl').style.display = showAlpha ? '' : 'none';
      drawOptimum();
    });
    el.addEventListener('change', () => {
      const showAlpha = document.getElementById('opt-type').value === 'cobb';
      document.getElementById('opt-alpha-ctrl').style.display = showAlpha ? '' : 'none';
      drawOptimum();
    });
  });
}

function computeOptimum(type, I, Px, Py, alpha) {
  if (type === 'cobb') {
    const b = 1 - alpha;
    return { x: alpha*I/Px, y: b*I/Py, method: 'Tangency: \\(P_X/P_Y = MU_X/MU_Y\\)' };
  }
  if (type === 'complements') {
    const x = I/(Px+Py);
    return { x, y: x, method: 'Kink condition: \\(X^* = Y^*\\)' };
  }
  if (type === 'substitutes') {
    if (1/Px > 1/Py) return { x: I/Px, y: 0, method: 'Corner: all on \\(X\\) &nbsp;(\\(MU_X/P_X > MU_Y/P_Y\\))' };
    if (1/Py > 1/Px) return { x: 0,    y: I/Py, method: 'Corner: all on \\(Y\\) &nbsp;(\\(MU_Y/P_Y > MU_X/P_X\\))' };
    return { x: I/(2*Px), y: I/(2*Py), method: 'Indifferent across entire budget line' };
  }
  if (type === 'ql') {
    const x = Py/Px;
    const y = Math.max(0, (I - Px*x)/Py);
    if (Px*x > I) return { x: I/Px, y: 0, method: 'Corner: all on \\(X\\)' };
    return { x, y, method: 'Tangency: \\(1/X = P_X/P_Y\\)' };
  }
  return { x: 0, y: 0, method: '—' };
}

function drawOptimum() {
  optObjects.forEach(o => { try { optBoard.removeObject(o); } catch(e){} });
  optObjects = [];

  const type  = document.getElementById('opt-type').value;
  const I     = parseFloat(document.getElementById('opt-I').value);
  const Px    = parseFloat(document.getElementById('opt-Px').value);
  const Py    = parseFloat(document.getElementById('opt-Py').value);
  const alpha = parseFloat(document.getElementById('opt-alpha').value);

  const xInt = I/Px, yInt = I/Py;
  const { x: xStar, y: yStar, method } = computeOptimum(type, I, Px, Py, alpha);

  const m = Math.max(xInt, yInt) * 1.35;
  optBoard.setBoundingBox([-0.5, m, m, -0.5], false);

  // Budget line + shading
  const poly = optBoard.create('polygon', [[0,0],[xInt,0],[0,yInt]], {
    fillColor: C.accent, fillOpacity: 0.06, strokeWidth: 0, fixed: true, vertices: {visible:false}
  });
  const budgetLine = optBoard.create('segment', [[0,yInt],[xInt,0]], {
    strokeColor: C.budget, strokeWidth: 2.2, fixed: true
  });

  // Draw ICs
  const N = 300;
  const uStar = calcU(type, alpha, xStar, yStar);
  const icLevels = [uStar * 0.4, uStar * 0.65, uStar, uStar * 1.35];
  const icColors = [C.accent4, C.accent3, C.accent, C.accent2];

  icLevels.forEach((k, idx) => {
    const isOpt = idx === 2;
    const col  = isOpt ? C.accent : icColors[idx];
    const w    = isOpt ? 2.8 : 1.5;

    if (type === 'cobb') {
      const b = 1-alpha;
      const xs = [], ys = [];
      for (let i = 0; i <= N; i++) {
        const x = 0.05 + m * i / N;
        const y = Math.pow(k / Math.pow(x, alpha), 1/b);
        if (y >= 0 && y <= m) { xs.push(x); ys.push(y); }
      }
      const c = optBoard.create('curve', [xs, ys], {
        strokeColor: col, strokeWidth: w, fixed: true,
        dash: isOpt ? 0 : 0
      });
      optObjects.push(c);
    } else if (type === 'complements') {
      if (k > m) return;
      const s1 = optBoard.create('segment', [[k,k],[m,k]], { strokeColor: col, strokeWidth: w, fixed: true });
      const s2 = optBoard.create('segment', [[k,k],[k,m]], { strokeColor: col, strokeWidth: w, fixed: true });
      optObjects.push(s1, s2);
    } else if (type === 'substitutes') {
      // U = X+Y, IC: X+Y=k => Y=k-X
      const xs2 = [0, Math.min(k, m)];
      const ys2 = [k, Math.max(0, k-m)];
      if (xs2[0]>m && ys2[0]>m) return;
      const s = optBoard.create('segment', [[xs2[0],Math.min(ys2[0],m)],[Math.min(xs2[1],m),Math.max(ys2[1],0)]], {
        strokeColor: col, strokeWidth: w, fixed: true
      });
      optObjects.push(s);
    } else if (type === 'ql') {
      // U = ln(X)+Y=k => Y=k-ln(X)
      const xs3 = [], ys3 = [];
      for (let i = 0; i <= N; i++) {
        const x = 0.05 + m * i / N;
        const y = k - Math.log(x);
        if (y >= 0 && y <= m) { xs3.push(x); ys3.push(y); }
      }
      const c2 = optBoard.create('curve', [xs3, ys3], { strokeColor: col, strokeWidth: w, fixed: true });
      optObjects.push(c2);
    }
  });

  // Tangency indicator
  if (type === 'cobb' && xStar > 0.1 && yStar > 0.1) {
    const tan = optBoard.create('segment',
      [[Math.max(0, xStar-2), yStar + (Px/Py)*2],
       [Math.min(m, xStar+2), yStar - (Px/Py)*2]], {
      strokeColor: C.amber, strokeWidth: 1.5, dash: 2, fixed: true, opacity: 0.6
    });
    optObjects.push(tan);
  }

  // Dashed lines to axes
  if (xStar > 0 && yStar > 0) {
    const dh = optBoard.create('segment', [[0,yStar],[xStar,yStar]], {
      strokeColor: '#aaa', strokeWidth: 1, dash: 2, fixed: true
    });
    const dv = optBoard.create('segment', [[xStar,0],[xStar,yStar]], {
      strokeColor: '#aaa', strokeWidth: 1, dash: 2, fixed: true
    });
    optObjects.push(dh, dv);
  }

  // Optimum star
  const star = optBoard.create('point', [xStar, yStar], {
    color: C.red, size: 6, name: `(${xStar.toFixed(1)}, ${yStar.toFixed(1)})`,
    withLabel: true, label: { fontSize: 11, offset: [8, 4] }, fixed: true
  });

  optObjects.push(poly, budgetLine, star);

  // Utility
  const util = calcU(type, alpha, xStar, yStar);
  const budgetUsed = Px*xStar + Py*yStar;
  const mrs = calcMRS(type, alpha, xStar, yStar);

  // Update sidebar
  document.getElementById('opt-method').innerHTML     = method;
  document.getElementById('opt-x-star').textContent   = xStar.toFixed(4);
  document.getElementById('opt-y-star').textContent   = yStar.toFixed(4);
  document.getElementById('opt-utility').textContent  = util.toFixed(4);
  document.getElementById('opt-budget-check').textContent =
    `${budgetUsed <= I+0.01 ? '✓' : '✗'} $${budgetUsed.toFixed(2)} = $${I}`;
  document.getElementById('opt-tangency-check').innerHTML =
    type === 'cobb'        ? `✓ &nbsp;\\(MRS = P_X/P_Y = ${(Px/Py).toFixed(3)}\\)` :
    type === 'complements' ? '✓ &nbsp;At kink — \\(MRS\\) undefined' :
    type === 'substitutes' ? '✓ &nbsp;Corner solution' :
                             `✓ &nbsp;\\(MRS = ${(Px/Py).toFixed(3)}\\)`;

  // Re-render any LaTeX in the right panel
  window.retypeset(document.getElementById('jxg-optimum').closest('.viz-wrapper').querySelector('.viz-panel-right'));

  optBoard.update();
}

function calcU(type, alpha, x, y) {
  if (x <= 0 || y < 0) return 0;
  if (type === 'cobb')        return Math.pow(x, alpha) * Math.pow(Math.max(y,1e-9), 1-alpha);
  if (type === 'complements') return Math.min(x, y);
  if (type === 'substitutes') return x + y;
  if (type === 'ql')          return Math.log(Math.max(x,0.001)) + y;
  return 0;
}

function calcMRS(type, alpha, x, y) {
  if (type === 'cobb')        return (alpha * y) / ((1-alpha) * x);
  if (type === 'substitutes') return 1;
  return null;
}


/* ═══════════════════════════════════════════════════════════════════════════
   6. BANG FOR THE BUCK
   ═══════════════════════════════════════════════════════════════════════════ */
let bfbBoard, bfbObjects = [];

function initBFBBoard() {
  bfbBoard = makeBoard('jxg-bfb', [-0.5, 32, 32, -0.5]);
  drawBFB();

  ['bfb-spendX','bfb-Px','bfb-Py','bfb-alpha'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (id==='bfb-spendX') document.getElementById('bfb-spendX-val').textContent = v;
      if (id==='bfb-Px')     document.getElementById('bfb-Px-val').textContent     = v;
      if (id==='bfb-Py')     document.getElementById('bfb-Py-val').textContent     = v;
      if (id==='bfb-alpha')  document.getElementById('bfb-alpha-val').textContent  = v.toFixed(2);
      drawBFB();
    });
  });
}

function drawBFB() {
  bfbObjects.forEach(o => { try { bfbBoard.removeObject(o); } catch(e){} });
  bfbObjects = [];

  const I      = 100;
  const spendX = parseFloat(document.getElementById('bfb-spendX').value);
  const Px     = parseFloat(document.getElementById('bfb-Px').value);
  const Py     = parseFloat(document.getElementById('bfb-Py').value);
  const alpha  = parseFloat(document.getElementById('bfb-alpha').value);
  const beta   = 1 - alpha;

  const spendY = I - spendX;
  const X = spendX / Px;
  const Y = Math.max(spendY / Py, 1e-6);

  const MUx = alpha * Math.pow(X, alpha-1) * Math.pow(Y, beta);
  const MUy = beta  * Math.pow(X, alpha)   * Math.pow(Y, beta-1);
  const bangX = MUx / Px;
  const bangY = MUy / Py;

  // Optimal
  const xOpt = alpha*I/Px, yOpt = beta*I/Py;
  const xInt = I/Px, yInt = I/Py;

  const m = Math.max(xInt, yInt) * 1.3;
  bfbBoard.setBoundingBox([-0.5, m, m, -0.5], false);

  // Budget line
  const bLine = bfbBoard.create('segment', [[0,yInt],[xInt,0]], {
    strokeColor: C.budget, strokeWidth: 2, fixed: true
  });

  // IC at current bundle
  const uCurr = Math.pow(X, alpha) * Math.pow(Y, beta);
  const uOpt  = Math.pow(xOpt, alpha) * Math.pow(yOpt, beta);

  [uCurr, uOpt].forEach((k, idx) => {
    const col = idx === 0 ? C.accent3 : C.accent;
    const w   = idx === 0 ? 1.6 : 2.5;
    const xs = [], ys = [];
    for (let i = 0; i <= 300; i++) {
      const x = 0.05 + m * i / 300;
      const y = Math.pow(k / Math.pow(x, alpha), 1/beta);
      if (y >= 0 && y <= m) { xs.push(x); ys.push(y); }
    }
    const c = bfbBoard.create('curve', [xs, ys], { strokeColor: col, strokeWidth: w, fixed: true });
    bfbObjects.push(c);
  });

  // Current bundle
  const currPt = bfbBoard.create('point', [X, Y], {
    color: C.amber, size: 5, name: 'Current', withLabel: true,
    label: { fontSize: 10, offset: [8, 4] }, fixed: true
  });

  // Optimal
  const optPt = bfbBoard.create('point', [xOpt, yOpt], {
    color: C.red, size: 6, name: 'Optimum', withLabel: true,
    label: { fontSize: 10, offset: [8, 4] }, fixed: true
  });

  // Arrow from current to optimal (if not already at optimum)
  const dist = Math.sqrt((xOpt-X)**2 + (yOpt-Y)**2);
  if (dist > 0.3) {
    const arr = bfbBoard.create('arrow', [[X,Y],[xOpt,yOpt]], {
      strokeColor: C.amber, strokeWidth: 1.8, fixed: true,
      lastArrow: { type: 1, size: 6 }
    });
    bfbObjects.push(arr);
  }

  bfbObjects.push(bLine, currPt, optPt);

  // Update stats
  const tol = 0.01;
  let verdict, action;
  if (Math.abs(bangX - bangY) < tol) {
    verdict = '✓ Ratios equal — at the optimum';
    action  = 'No reallocation needed';
  } else if (bangX > bangY) {
    verdict = 'MU(X)/P(X) > MU(Y)/P(Y)';
    action  = '→ Shift spending toward X';
  } else {
    verdict = 'MU(Y)/P(Y) > MU(X)/P(X)';
    action  = '→ Shift spending toward Y';
  }

  document.getElementById('bfb-mux-px').textContent   = bangX.toFixed(4);
  document.getElementById('bfb-muy-py').textContent   = bangY.toFixed(4);
  document.getElementById('bfb-verdict').textContent  = verdict;
  document.getElementById('bfb-action').textContent   = action;

  bfbBoard.update();
}


/* ═══════════════════════════════════════════════════════════════════════════
   7. COBB-DOUGLAS DEMAND
   ═══════════════════════════════════════════════════════════════════════════ */
let cdBoard, cdObjects = [];

function initCobbBoard() {
  cdBoard = makeBoard('jxg-cobb', [-0.5, 50, 50, -0.5]);
  drawCobb();

  ['cd-alpha','cd-beta','cd-I','cd-Px','cd-Py'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (id==='cd-alpha') document.getElementById('cd-alpha-val').textContent = v.toFixed(2);
      if (id==='cd-beta')  document.getElementById('cd-beta-val').textContent  = v.toFixed(2);
      if (id==='cd-I')     document.getElementById('cd-I-val').textContent     = v;
      if (id==='cd-Px')    document.getElementById('cd-Px-val').textContent    = v;
      if (id==='cd-Py')    document.getElementById('cd-Py-val').textContent    = v;
      drawCobb();
    });
  });
}

function drawCobb() {
  cdObjects.forEach(o => { try { cdBoard.removeObject(o); } catch(e){} });
  cdObjects = [];

  const alpha = parseFloat(document.getElementById('cd-alpha').value);
  const beta  = parseFloat(document.getElementById('cd-beta').value);
  const I     = parseFloat(document.getElementById('cd-I').value);
  const Px    = parseFloat(document.getElementById('cd-Px').value);
  const Py    = parseFloat(document.getElementById('cd-Py').value);

  const shareX = alpha/(alpha+beta);
  const shareY = beta/(alpha+beta);
  const xStar  = shareX * I / Px;
  const yStar  = shareY * I / Py;
  const xInt   = I/Px, yInt = I/Py;

  const m = Math.max(xInt, yInt) * 1.4;
  cdBoard.setBoundingBox([-0.5, m, m, -0.5], false);

  // Budget line
  const bLine = cdBoard.create('segment', [[0,yInt],[xInt,0]], {
    strokeColor: C.budget, strokeWidth: 2, fixed: true
  });

  // Draw 3 ICs
  const uStar = Math.pow(xStar, alpha) * Math.pow(yStar, beta);
  [uStar*0.5, uStar, uStar*1.6].forEach((k, idx) => {
    const col = [C.accent4, C.accent, C.accent3][idx];
    const w   = idx === 1 ? 2.8 : 1.5;
    const xs  = [], ys = [];
    for (let i = 0; i <= 300; i++) {
      const x = 0.05 + m * i / 300;
      const y = Math.pow(k / Math.pow(x, alpha), 1/beta);
      if (y >= 0 && y <= m) { xs.push(x); ys.push(y); }
    }
    const c = cdBoard.create('curve', [xs, ys], { strokeColor: col, strokeWidth: w, fixed: true });
    cdObjects.push(c);
  });

  // Dashed lines
  const dh = cdBoard.create('segment', [[0,yStar],[xStar,yStar]], {
    strokeColor: '#aaa', strokeWidth: 1, dash: 2, fixed: true
  });
  const dv = cdBoard.create('segment', [[xStar,0],[xStar,yStar]], {
    strokeColor: '#aaa', strokeWidth: 1, dash: 2, fixed: true
  });

  // Spending split labels on axes
  const xLbl = cdBoard.create('text', [xStar/2, -m*0.03,
    `← ${(shareX*100).toFixed(0)}% of I →`], {
    fontSize: 10, color: C.accent, fixed: true, anchorX: 'middle'
  });
  const yLbl = cdBoard.create('text', [-m*0.04, yStar/2,
    `← ${(shareY*100).toFixed(0)}%`], {
    fontSize: 10, color: C.purple, fixed: true, anchorX: 'right'
  });

  const star = cdBoard.create('point', [xStar, yStar], {
    color: C.red, size: 6, name: `X*=${xStar.toFixed(1)}, Y*=${yStar.toFixed(1)}`,
    withLabel: true, label: { fontSize: 11, offset: [8, 4] }, fixed: true
  });

  cdObjects.push(bLine, dh, dv, xLbl, yLbl, star);

  // Update sidebar
  document.getElementById('cd-share-x').textContent  = (shareX*100).toFixed(1)+'%';
  document.getElementById('cd-share-y').textContent  = (shareY*100).toFixed(1)+'%';
  document.getElementById('cd-x-star').textContent   = xStar.toFixed(4);
  document.getElementById('cd-y-star').textContent   = yStar.toFixed(4);
  document.getElementById('cd-spend-x').textContent  = '$'+(Px*xStar).toFixed(2);
  document.getElementById('cd-spend-y').textContent  = '$'+(Py*yStar).toFixed(2);

  cdBoard.update();
}


/* ═══════════════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initICExplorer();
  init3DSurface();
  initBudgetBoard();
  initShiftBoard();
  initOptimumBoard();
  initBFBBoard();
  initCobbBoard();
});
