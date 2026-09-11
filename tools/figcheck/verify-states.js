/* The label checks so far ran with every figure at its default state. Figures
   redraw when a control moves, so a figure can be clean at load and collide at
   a slider extreme. This drives every slider and every mode button on every
   figure and re-measures after each change. */
const path = require('path');
/* the site root is two directories up from tools/figcheck */
const ROOT = path.resolve(__dirname, '..', '..');
/* playwright is not a dependency of the site; find it wherever it is */
function loadPlaywright() {
  const tries = ['playwright-core', 'playwright',
                 path.resolve(ROOT, '..', 'review', 'node_modules', 'playwright-core'),
                 path.resolve(ROOT, 'node_modules', 'playwright-core')];
  for (const t of tries) { try { return require(t); } catch (e) {} }
  throw new Error('playwright-core not found. npm i -D playwright-core, then rerun.');
}
const { chromium } = loadPlaywright();
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:4321';

const MEASURE = () => {
  const CELL = 4;
  const isNum = s => !s || /^[-+$(]?[\d.,%\s)]+$/.test(s.trim());
  const isCurveLabel = el => {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 36 || isNum(t)) return false;
    /* a lone symbol is a plot marker, not a label; it belongs on the curve */
    if (t.length <= 2 && !/[\p{L}\p{N}]/u.test(t)) return false;
    if (el.closest && el.closest('.tick, .domain, .readout-row, .fig-state, .ctrl-row')) return false;
    return true;
  };
  const hosts = [];
  document.querySelectorAll('.fig-plot, .jxgbox, .demo-svg-wrap').forEach(e => hosts.push(e));
  document.querySelectorAll('div').forEach(d => {
    const kid = d.querySelector(':scope > svg, :scope > canvas');
    if (!kid) return;
    const r = kid.getBoundingClientRect();
    if (r.width < 160 || r.height < 120) return;
    if (d.closest('mjx-container')) return;
    if (hosts.some(h => h === d || h.contains(d))) return;
    hosts.push(d);
  });

  const shownEl = el => {
    let n = el;
    for (let i = 0; i < 6 && n && n.nodeType === 1; i++) {
      const cs = getComputedStyle(n);
      if (!cs) return true;
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (parseFloat(cs.opacity || "1") < 0.05) return false;
      if (n.tagName && n.tagName.toLowerCase() === "svg") break;
      n = n.parentElement;
    }
    return true;
  };

  let bad = 0, total = 0;
  hosts.forEach(host => {
    const hb = host.getBoundingClientRect();
    if (!hb.width || !hb.height) return;
    const W = Math.ceil(hb.width / CELL), H = Math.ceil(hb.height / CELL);
    const grid = new Uint8Array(W * H);
    const mark = (x, y) => { const gx = (x / CELL) | 0, gy = (y / CELL) | 0; if (gx >= 0 && gy >= 0 && gx < W && gy < H) grid[gy * W + gx] = 1; };
    host.querySelectorAll('svg').forEach(svg => {
      const sb = svg.getBoundingClientRect();
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const sx = sb.width / (vb && vb.width ? vb.width : sb.width || 1);
      const sy = sb.height / (vb && vb.height ? vb.height : sb.height || 1);
      const ox = sb.x - hb.x, oy = sb.y - hb.y;
      svg.querySelectorAll('path, line, polyline').forEach(el => {
        const st = (el.getAttribute('stroke') || '').toLowerCase();
        if (!st || st === 'none') return;
        if (parseFloat(el.getAttribute('stroke-width') || '1') < 1.6) return;
        if (el.closest('.tick, .domain')) return;
        try {
          const L = el.getTotalLength(); if (!L || !isFinite(L)) return;
          const n = Math.min(220, Math.max(10, Math.round(L / 4)));
          for (let i = 0; i <= n; i++) { const p = el.getPointAtLength(L * i / n); mark(ox + p.x * sx, oy + p.y * sy); }
        } catch (e) {}
      });
    });
    host.querySelectorAll('canvas').forEach(cv => {
      const cb = cv.getBoundingClientRect(); if (!cb.width) return;
      let d; try { d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return; }
      const sx = cb.width / cv.width, sy = cb.height / cv.height, ox = cb.x - hb.x, oy = cb.y - hb.y;
      for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
        const i = (y * cv.width + x) * 4;
        if (d[i + 3] < 40) continue;
        if (d[i] > 226 && d[i + 1] > 226 && d[i + 2] > 226) continue;
        mark(ox + x * sx, oy + y * sy);
      }
    });
    const clear = (x, y, w, h) => {
      const x0 = (x / CELL) | 0, y0 = (y / CELL) | 0, x1 = ((x + w) / CELL) | 0, y1 = ((y + h) / CELL) | 0;
      for (let r = 0; r <= 4; r++) {
        for (let gy = y0 - r; gy <= y1 + r; gy++) for (let gx = x0 - r; gx <= x1 + r; gx++) {
          const onRing = (gx === x0 - r || gx === x1 + r || gy === y0 - r || gy === y1 + r);
          if (r > 0 && !onRing) continue;
          if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
          if (grid[gy * W + gx]) return r * CELL;
        }
      }
      return 16;
    };
    host.querySelectorAll('svg text, .JXGtext').forEach(t => {
      if (!isCurveLabel(t)) return;
      if (!shownEl(t)) return;
      const b = t.getBoundingClientRect();
      if (!b.width) return;
      total++;
      let backed = false;
      const sibs = t.parentNode ? t.parentNode.children : [];
      for (const r of sibs) {
        if (r === t || r.tagName.toLowerCase() !== 'rect') continue;
        const f = (r.getAttribute('fill') || '').toLowerCase();
        if (!(f === '#fff' || f === '#ffffff' || f === 'white')) continue;
        const rb = r.getBoundingClientRect();
        if (!rb.width) continue;
        if (!(rb.right < b.left - 2 || b.right < rb.left - 2 || rb.bottom < b.top - 2 || b.bottom < rb.top - 2)) { backed = true; break; }
      }
      if (!backed && t.tagName.toLowerCase() !== 'text') backed = getComputedStyle(t).backgroundColor !== 'rgba(0, 0, 0, 0)';
      if (!backed) {
        const po = (t.getAttribute && t.getAttribute('paint-order')) || '';
        const st = (t.getAttribute && t.getAttribute('stroke')) || '';
        const sw = parseFloat((t.getAttribute && t.getAttribute('stroke-width')) || '0');
        if (po.indexOf('stroke') >= 0 && st && st !== 'none' && sw >= 2) backed = true;
      }
      if (!backed && clear(b.x - hb.x, b.y - hb.y, b.width, b.height) < 6) bad++;
    });
  });
  return { bad, total };
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f)).sort();
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const results = [];
  for (const f of pages) {
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 80)));
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 30000 });
    await p.waitForTimeout(3200);

    const states = [];
    // slider sweeps
    for (const frac of [0.1, 0.5, 0.9]) {
      await p.evaluate(fr => {
        document.querySelectorAll('input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * fr);
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }, frac);
      await p.waitForTimeout(1100);
      states.push({ label: 'sliders@' + Math.round(frac * 100) + '%', ...(await p.evaluate(MEASURE)) });
    }
    // click every button that looks like a mode toggle (skip nav/expand/zoom)
    const nBtn = await p.evaluate(() => document.querySelectorAll('section.sec button').length);
    for (let i = 0; i < Math.min(nBtn, 14); i++) {
      await p.evaluate(idx => {
        const bs = [...document.querySelectorAll('section.sec button')]
          .filter(x => !/expand|close|all weeks|reset labels/i.test(x.textContent + (x.getAttribute('aria-label') || '')));
        if (bs[idx]) bs[idx].click();
      }, i);
      await p.waitForTimeout(650);
    }
    states.push({ label: 'after button sweep', ...(await p.evaluate(MEASURE)) });

    const worst = states.reduce((a, s) => s.bad > a.bad ? s : a, states[0]);
    results.push({ f: f.replace('-viz.html', ''), states, worst, errs: errs.length });
    await p.close();
  }
  await b.close();

  console.log('page      sliders@10%  sliders@50%  sliders@90%  after buttons   worst   labels   errors');
  let anyBad = 0, totErr = 0;
  results.forEach(r => {
    const g = i => r.states[i] ? r.states[i].bad : '-';
    if (r.worst.bad > 0) anyBad++;
    totErr += r.errs;
    console.log(r.f.padEnd(9) + ' ' + String(g(0)).padEnd(12) + ' ' + String(g(1)).padEnd(12) + ' ' +
      String(g(2)).padEnd(12) + ' ' + String(g(3)).padEnd(15) + ' ' +
      String(r.worst.bad).padEnd(7) + ' ' + String(r.worst.total).padEnd(8) + ' ' + r.errs);
  });
  console.log('\npages where any driven state put a label on ink unbacked: ' + anyBad + ' of ' + results.length);
  console.log('JS errors raised while driving every control: ' + totErr);
})();
