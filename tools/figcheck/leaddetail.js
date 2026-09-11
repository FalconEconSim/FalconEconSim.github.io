/* Which label's leader is adrift, and by how much, with the label's text.
   Same measurement as siteleaders.js, but it names names. */
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
const BASE = process.env.BASE || 'http://localhost:4321';
const PAGE = process.env.PAGE || 'week5-viz.html';
const FRACS = (process.env.FRACS || 'null,0.15,0.5,0.85').split(',').map(s => s === 'null' ? null : parseFloat(s));

const PROBE = () => {
  const out = [];
  const hosts = [];
  document.querySelectorAll('section.sec .fig-plot, section.sec .jxgbox, section.sec .demo-svg-wrap, section.sec .cvs-ovl-host').forEach(e => hosts.push(e));
  document.querySelectorAll('section.sec div').forEach(d => {
    const kid = d.querySelector(':scope > svg, :scope > canvas');
    if (!kid) return;
    const r = kid.getBoundingClientRect();
    if (r.width < 160 || r.height < 110) return;
    if (hosts.some(h => h === d || h.contains(d))) return;
    hosts.push(d);
  });
  const isLeader = el => el.hasAttribute('data-place-leader') || el.hasAttribute('data-fl-leader');

  hosts.forEach(host => {
    const leads = [];
    host.querySelectorAll('line, path').forEach(el => {
      if (!isLeader(el)) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return;
      let ax, ay;
      if (el.tagName.toLowerCase() === 'line') { ax = +el.getAttribute('x1'); ay = +el.getAttribute('y1'); }
      else {
        const d = (el.getAttribute('d') || '').replace(/[ML]/g, ' ').trim().split(/[\s,]+/).map(Number);
        if (d.length < 4) return;
        ax = d[d.length - 2]; ay = d[d.length - 1];
      }
      if (!isFinite(ax) || !isFinite(ay)) return;
      if (el.tagName.toLowerCase() === 'line') {
        const dx = +el.getAttribute('x2') - ax, dy = +el.getAttribute('y2') - ay;
        if (Math.hypot(dx, dy) < 4) return;   /* zero-length: draws nothing */
      }
      let m; try { m = el.getScreenCTM(); } catch (e) { return; }
      if (!m) return;
      /* the datum d3 bound to it, so the label can be named */
      let nm = '';
      try { const dd = el.__data__; if (dd) nm = dd.label || dd.id || dd.text || ''; } catch (e) {}
      leads.push({ nm, ux: ax, uy: ay, x: m.a * ax + m.c * ay + m.e, y: m.b * ax + m.d * ay + m.f });
    });
    if (!leads.length) return;

    const fills = [];
    host.querySelectorAll('svg').forEach(svg => {
      svg.querySelectorAll('polygon, rect, path').forEach(el => {
        const f = (el.getAttribute('fill') || '').toLowerCase();
        if (!f || f === 'none' || f === 'transparent' || f === 'white' || f === '#fff' || f === '#ffffff') return;
        if (parseFloat(el.getAttribute('opacity') || '1') < 0.05) return;
        if (typeof el.isPointInFill !== 'function') return;
        let m; try { m = el.getScreenCTM(); } catch (e) { return; }
        if (!m) return;
        fills.push({ el, inv: m.inverse() });
      });
    });
    const inAFill = (X, Y) => fills.some(F => {
      try { return F.el.isPointInFill(new DOMPoint(X, Y).matrixTransform(F.inv)); } catch (e) { return false; }
    });

    const ink = [];
    host.querySelectorAll('svg').forEach(svg => {
      svg.querySelectorAll('path, line, polyline, circle').forEach(el => {
        if (isLeader(el) || el.closest('.tick, .domain')) return;
        let m; try { m = el.getScreenCTM(); } catch (e) { return; }
        if (!m) return;
        const T = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
        if (el.tagName.toLowerCase() === 'circle') {
          const r = parseFloat(el.getAttribute('r') || '0');
          if (r < 2 || r > 16) return;
          ink.push(T(+el.getAttribute('cx'), +el.getAttribute('cy')));
          return;
        }
        const w = parseFloat(el.getAttribute('stroke-width') || '0');
        const st = (el.getAttribute('stroke') || '').toLowerCase();
        if (!st || st === 'none' || w < 1.4) return;
        try {
          const L = el.getTotalLength();
          if (!L || !isFinite(L)) return;
          const n = Math.max(6, Math.min(320, Math.round(L / 2)));
          for (let i = 0; i <= n; i++) { const p = el.getPointAtLength(L * i / n); ink.push(T(p.x, p.y)); }
        } catch (e) {}
      });
    });
    host.querySelectorAll('canvas').forEach(cv => {
      const cb = cv.getBoundingClientRect();
      if (!cb.width || !cv.width) return;
      let data;
      try { data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return; }
      const sx = cb.width / cv.width, sy = cb.height / cv.height;
      for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
        const i = (y * cv.width + x) * 4;
        if (data[i + 3] < 40) continue;
        if (data[i] > 228 && data[i + 1] > 228 && data[i + 2] > 228) continue;
        ink.push([cb.x + x * sx, cb.y + y * sy]);
      }
    });

    const sec = host.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');
    const hb = host.getBoundingClientRect();

    leads.forEach(L => {
      let gap = 0;
      if (!inAFill(L.x, L.y)) {
        gap = 1e9;
        for (let i = 0; i < ink.length; i++) {
          const dd = Math.hypot(ink[i][0] - L.x, ink[i][1] - L.y);
          if (dd < gap) gap = dd;
        }
        if (!ink.length) gap = -1;
      }
      out.push({ fig, nm: L.nm, gap: Math.round(gap),
                 ux: Math.round(L.ux), uy: Math.round(L.uy),
                 relx: Math.round(L.x - hb.x), rely: Math.round(L.y - hb.y),
                 hw: Math.round(hb.width), hh: Math.round(hb.height), inks: ink.length });
    });
  });
  return out;
};

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await p.goto(BASE + '/' + PAGE, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(2000);
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 700) {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await p.waitForTimeout(220);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(2200);
  for (const frac of FRACS) {
    if (frac !== null) {
      await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
        const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
        s.value = String(lo + (hi - lo) * v);
        s.dispatchEvent(new Event('input', { bubbles: true }));
      }), frac);
      await p.waitForTimeout(950);
    }
    const rows = (await p.evaluate(PROBE)).filter(r => r.gap > 6 || r.gap < 0);
    if (!rows.length) continue;
    console.log('\n--- sliders at ' + (frac === null ? 'default' : frac));
    rows.forEach(r => console.log('  ' + r.fig.padEnd(10) + String(r.nm).slice(0, 22).padEnd(24) +
      'gap ' + String(r.gap).padEnd(6) + 'anchor(user) ' + (r.ux + ',' + r.uy).padEnd(12) +
      'in host ' + (r.relx + ',' + r.rely).padEnd(12) + 'host ' + r.hw + 'x' + r.hh + '  ink ' + r.inks));
  }
  await b.close();
})();
