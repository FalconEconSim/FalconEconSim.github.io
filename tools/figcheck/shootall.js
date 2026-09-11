/* Every figure's plot area, at two slider settings, one PNG each.
   Just the bay, not the prose, so the images stay small enough to look at
   properly and what is in them is the part that can be wrong. */
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
const OUT = process.env.OUT || path.resolve(ROOT, 'tools', 'figcheck', 'shots');
const BASE = process.env.BASE || 'http://localhost:4321';
const ONLY = process.env.ONLY;
const FRACS = (process.env.FRACS || '0.25,0.8').split(',').map(parseFloat);
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  let n = 0;
  for (const f of pages) {
    const wk = f.replace('-viz.html', '');
    const c = await b.newContext({ viewport: { width: 1440, height: 1100 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(200); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1800);

    const secs = await p.evaluate(() => [...document.querySelectorAll('section.sec')]
      .filter(s => s.querySelector('svg, canvas'))
      .map(s => {
        const hd = s.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
        return { id: s.id, name: (hd ? hd.textContent : s.id).trim().replace(/[^\w.]+/g, '-') };
      }));

    for (let i = 0; i < FRACS.length; i++) {
      await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
        const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
        s.value = String(lo + (hi - lo) * v);
        s.dispatchEvent(new Event('input', { bubbles: true }));
      }), FRACS[i]);
      await p.waitForTimeout(600);
      for (const s of secs) {
        const sel = '#' + s.id + ' .fig-bay-inner, #' + s.id + ' .fig-bay, #' + s.id;
        let el = null;
        for (const one of sel.split(', ')) { el = await p.$(one); if (el) break; }
        if (!el) continue;
        try {
          await el.scrollIntoViewIfNeeded();
          await p.waitForTimeout(600);
          const box = await el.boundingBox();
          if (!box || box.width < 80 || box.height < 80) continue;
          const file = OUT + '/' + wk + '_' + s.name + '_s' + (i + 1) + '.png';
          await el.screenshot({ path: file });
          n++;
        } catch (e) { console.log('  skip ' + wk + ' ' + s.name + ': ' + e.message.split('\n')[0]); }
      }
    }
    console.log(wk + ' done');
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\n' + n + ' images in ' + OUT);
})();
