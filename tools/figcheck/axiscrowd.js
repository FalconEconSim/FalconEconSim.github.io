/* Does the rotated axis title run through the tick numbers?

   The gutter was sized for 12px ticks. At 16px "$1.8k" is forty pixels wide,
   and on Fig 12.1 it printed straight through the word "Dollars". Neither is
   a curve label, so the placement pass leaves both alone and nothing else
   would catch it. Compare the two boxes directly. */
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

const PROBE = () => {
  const out = [];
  const NUM = /^[-+(]?[$\u20ac\u00a3]?[-+]?\d[\d.,\s]*[%kKmMbB]?\)?$/;
  document.querySelectorAll('section.sec svg').forEach(svg => {
    const sb = svg.getBoundingClientRect();
    if (sb.width < 150) return;
    const sec = svg.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');
    const titles = [], ticks = [];
    svg.querySelectorAll('text').forEach(t => {
      const s = (t.textContent || '').trim();
      if (!s) return;
      const cs = getComputedStyle(t);
      if (cs.display === 'none' || parseFloat(cs.opacity) < 0.06) return;
      const r = t.getBoundingClientRect();
      if (!r.width) return;
      const box = { s, x: r.left, y: r.top, w: r.width, h: r.height };
      /* a rotated title is taller than it is wide */
      if (/rotate/.test(t.getAttribute('transform') || '') || r.height > r.width * 1.6) titles.push(box);
      else if (NUM.test(s)) ticks.push(box);
    });
    titles.forEach(a => ticks.forEach(b => {
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) out.push({ fig, title: a.s, tick: b.s, area: Math.round(ox * oy) });
    }));
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
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
    for (let y = 0; y < H; y += 600) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(220); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1500);
    let n = 0;
    for (const frac of [null, 0.9]) {
      if (frac !== null) {
        await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * v);
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }), frac);
        await p.waitForTimeout(900);
      }
      (await p.evaluate(PROBE)).forEach(r => {
        n++;
        const k = f.replace('-viz.html', '') + '  ' + r.fig + '  "' + r.title + '" over "' + r.tick + '"';
        worst[k] = Math.max(worst[k] || 0, r.area);
      });
    }
    grand += n;
    console.log(f.replace('-viz.html', '').padEnd(9) + 'axis title over a tick number: ' + n);
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\ntotal: ' + grand);
  Object.keys(worst).sort((x, y) => worst[y] - worst[x]).slice(0, 20)
    .forEach(k => console.log('  ' + String(worst[k]).padStart(5) + 'px²  ' + k));
})();
