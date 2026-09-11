/* Does any figure text now run outside the plot it belongs to?

   The type is a good deal larger than it was, so a label that used to sit
   inside its frame may not any more: an axis title pushed past the bottom, a
   tick number off the left, a curve label hanging over the edge. SVG does not
   clip by default, so nothing looks broken from the DOM's point of view; the
   text simply prints over whatever is next to it.

   Measured against the plot's own box, with a small tolerance because tick
   numbers are meant to sit just outside the axis line. */
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
  document.querySelectorAll('section.sec svg').forEach(svg => {
    const sb = svg.getBoundingClientRect();
    if (sb.width < 120) return;
    const sec = svg.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');
    svg.querySelectorAll('text').forEach(t => {
      const s = (t.textContent || '').trim();
      if (!s) return;
      const cs = getComputedStyle(t);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.06) return;
      const r = t.getBoundingClientRect();
      if (!r.width) return;
      const over = Math.max(sb.left - r.left, r.right - sb.right, sb.top - r.top, r.bottom - sb.bottom);
      if (over > 1.5) out.push({ fig, s: s.slice(0, 22), over: Math.round(over) });
    });
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  let grand = 0;
  const worst = {};
  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    const H = await p.evaluate(() => document.body.scrollHeight);
    const walk = async () => {
      for (let y = 0; y < H; y += 600) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(230); }
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(650);
    };
    await walk();
    let n = 0;
    for (const frac of [null, 0.15, 0.85]) {
      if (frac !== null) {
        await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * v);
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }), frac);
        await p.waitForTimeout(600);
        await walk();
      }
      (await p.evaluate(PROBE)).forEach(r => {
        n++;
        const k = f.replace('-viz.html', '') + '  ' + r.fig + '  "' + r.s + '"';
        worst[k] = Math.max(worst[k] || 0, r.over);
      });
    }
    grand += n;
    console.log(f.replace('-viz.html', '').padEnd(9) + 'text outside its plot: ' + n);
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\ntotal readings of text outside its plot: ' + grand);
  const keys = Object.keys(worst).sort((x, y) => worst[y] - worst[x]);
  keys.slice(0, 25).forEach(k => console.log('  ' + String(worst[k]).padStart(4) + 'px  ' + k));
})();
