/* Do the dashed leaders on the real figures reach what they point at?

   Everything is measured in SCREEN pixels, so a figure that draws its curves as
   svg geometry and one that paints them on a canvas are checked the same way,
   and figures with different viewBoxes are comparable.

   For each plot: collect the ink (svg curves mapped through their screen matrix,
   plus any canvas's non-white pixels), then for each dashed leader take the end
   that is meant to touch the figure and measure the distance to the nearest ink.
   Independent of the placement code: it reads only what was rendered. */
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
const ONLY = process.env.ONLY;

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

  /* A leader carries a marker. The dashed guide lines the figures draw for
     themselves, droplines to the axis and so on, share the same dash pattern
     but are not leaders and are supposed to end on the axis. */
  const isLeader = el => el.hasAttribute('data-place-leader') || el.hasAttribute('data-fl-leader');

  hosts.forEach(host => {
    const hb = host.getBoundingClientRect();
    if (!hb.width) return;

    /* every leader inside this plot, with its anchor end in screen pixels */
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
      /* A label sitting on its own anchor has a leader with no length. It
         draws nothing, so there is no line for a reader to follow into empty
         space and nothing here to judge. */
      if (el.tagName.toLowerCase() === 'line') {
        const dx = +el.getAttribute('x2') - ax, dy = +el.getAttribute('y2') - ay;
        if (Math.hypot(dx, dy) < 4) return;
      }
      try {
        const m = el.getScreenCTM();
        if (!m) return;
        leads.push({ el, x: m.a * ax + m.c * ay + m.e, y: m.b * ax + m.d * ay + m.f });
      } catch (e) {}
    });
    if (!leads.length) return;

    /* Shapes with a fill. A label naming a region, "Transfer", "DWL", "CS",
       anchors in the middle of the region, so its leader lands on colour
       rather than on a stroke. That is not white space and must not be
       counted as a miss. */
    const fills = [];
    host.querySelectorAll('svg').forEach(svg => {
      svg.querySelectorAll('polygon, rect, path').forEach(el => {
        const f = (el.getAttribute('fill') || '').toLowerCase();
        if (!f || f === 'none' || f === 'transparent' || f === 'white' || f === '#fff' || f === '#ffffff') return;
        if (parseFloat(el.getAttribute('opacity') || '1') < 0.05) return;
        if (typeof el.isPointInFill !== 'function') return;
        let m;
        try { m = el.getScreenCTM(); } catch (e) { return; }
        if (!m) return;
        fills.push({ el, inv: m.inverse() });
      });
    });
    const inAFill = (X, Y) => fills.some(F => {
      try {
        const p = new DOMPoint(X, Y).matrixTransform(F.inv);
        return F.el.isPointInFill(p);
      } catch (e) { return false; }
    });

    /* the ink, in screen pixels */
    const ink = [];
    host.querySelectorAll('svg').forEach(svg => {
      svg.querySelectorAll('path, line, polyline, circle').forEach(el => {
        if (isLeader(el)) return;
        if (el.closest('.tick, .domain')) return;
        let m;
        try { m = el.getScreenCTM(); } catch (e) { return; }
        if (!m) return;
        const toScreen = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
        if (el.tagName.toLowerCase() === 'circle') {
          const r = parseFloat(el.getAttribute('r') || '0');
          if (r < 2 || r > 16) return;
          ink.push(toScreen(+el.getAttribute('cx'), +el.getAttribute('cy')));
          return;
        }
        const w = parseFloat(el.getAttribute('stroke-width') || '0');
        const st = (el.getAttribute('stroke') || '').toLowerCase();
        if (!st || st === 'none' || w < 1.4) return;
        try {
          const L = el.getTotalLength();
          if (!L || !isFinite(L)) return;
          const n = Math.max(6, Math.min(320, Math.round(L / 2)));
          for (let i = 0; i <= n; i++) { const p = el.getPointAtLength(L * i / n); ink.push(toScreen(p.x, p.y)); }
        } catch (e) {}
      });
    });
    host.querySelectorAll('canvas').forEach(cv => {
      const cb = cv.getBoundingClientRect();
      if (!cb.width || !cv.width) return;
      let data;
      try { data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; }
      catch (e) { return; }
      const sx = cb.width / cv.width, sy = cb.height / cv.height;
      for (let y = 0; y < cv.height; y += 3) {
        for (let x = 0; x < cv.width; x += 3) {
          const i = (y * cv.width + x) * 4;
          if (data[i + 3] < 40) continue;
          if (data[i] > 228 && data[i + 1] > 228 && data[i + 2] > 228) continue;
          ink.push([cb.x + x * sx, cb.y + y * sy]);
        }
      }
    });
    if (!ink.length) return;

    const sec = host.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');

    /* The canvas sweep above steps every three pixels, which is fine for
       finding curves but can step straight over a single hairline: at 0% change
       Fig 4.4 has no bars at all and its labels point at the zero rule, 1.5px
       thick, which the sweep missed entirely. Look properly, pixel by pixel,
       in the small square around each leader's end before deciding it has
       landed on nothing. */
    const canvases = [...host.querySelectorAll('canvas')];
    const onInkDense = (X, Y) => canvases.some(cv => {
      const cb = cv.getBoundingClientRect();
      if (!cb.width || !cv.width) return false;
      const sx = cv.width / cb.width, sy = cv.height / cb.height;
      const cx = Math.round((X - cb.x) * sx), cy = Math.round((Y - cb.y) * sy);
      const rad = Math.max(2, Math.round(4 * sx));
      let d;
      try { d = cv.getContext('2d', { willReadFrequently: true })
                  .getImageData(Math.max(0, cx - rad), Math.max(0, cy - rad), rad * 2 + 1, rad * 2 + 1).data; }
      catch (e) { return false; }
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        if (d[i] > 228 && d[i + 1] > 228 && d[i + 2] > 228) continue;
        return true;
      }
      return false;
    });

    leads.forEach(L => {
      if (inAFill(L.x, L.y)) { out.push({ fig, gap: 0 }); return; }
      if (canvases.length && onInkDense(L.x, L.y)) { out.push({ fig, gap: 0 }); return; }
      let best = 1e9;
      for (let i = 0; i < ink.length; i++) {
        const dd = Math.hypot(ink[i][0] - L.x, ink[i][1] - L.y);
        if (dd < best) { best = dd; if (best < 1) break; }
      }
      out.push({ fig, gap: best });
    });
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  let grand = 0, grandAdrift = 0;
  const worstFigs = {};

  /* A fresh context per page. Sharing one across all eleven quietly changed
     the answer: week4 measured 22 adrift on its own and 6 in the middle of a
     full run, and a number that depends on what was loaded before it is not a
     number worth acting on. */
  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    /* Figures further down the page only build themselves once they are
       scrolled into view, so walk the whole page before measuring anything or
       the count silently depends on how tall the window happens to be. */
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) {
      await p.evaluate(v => window.scrollTo(0, v), y);
      await p.waitForTimeout(220);
    }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2200);
    let total = 0, adrift = 0, worst = 0;
    for (const frac of [null, 0.15, 0.5, 0.85]) {
      if (frac !== null) {
        await p.evaluate(v => {
          document.querySelectorAll('input[type=range]').forEach(s => {
            const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
            s.value = String(lo + (hi - lo) * v);
            s.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }, frac);
        await p.waitForTimeout(700);
        /* A figure out of view is entitled to postpone re-placing its labels
           until someone looks at it, so walk the page before measuring or the
           reading is of a frame no reader would ever see. */
        for (let y = 0; y < H; y += 600) {
          await p.evaluate(v => window.scrollTo(0, v), y);
          await p.waitForTimeout(260);
        }
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.waitForTimeout(700);
      }
      const rows = await p.evaluate(PROBE);
      rows.forEach(r => {
        total++;
        if (r.gap > 6) {
          adrift++;
          const k = f.replace('-viz.html', '') + ' ' + r.fig;
          worstFigs[k] = Math.max(worstFigs[k] || 0, Math.round(r.gap));
        }
        if (r.gap > worst) worst = r.gap;
      });
    }
    grand += total; grandAdrift += adrift;
    console.log(f.replace('-viz.html', '').padEnd(9) +
      'leaders ' + String(total).padEnd(7) +
      'adrift ' + String(adrift).padEnd(7) +
      'worst ' + Math.round(worst) + 'px');
    await p.close();
    await c.close();
  }
  await b.close();

  console.log('\nleaders checked: ' + grand + ',  ending more than 6px from anything drawn: ' + grandAdrift);
  const keys = Object.keys(worstFigs).sort((x, y) => worstFigs[y] - worstFigs[x]);
  if (keys.length) {
    console.log('\nfigures with a leader adrift:');
    keys.slice(0, 30).forEach(k => console.log('  ' + k.padEnd(26) + worstFigs[k] + 'px'));
  }
})();
