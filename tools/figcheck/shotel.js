/* Screenshot one element by selector, after driving the page's sliders. */
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
const PAGE = process.env.PAGE;
const SEL = process.env.SEL;
const OUT = process.env.OUT;
const SET = process.env.SET || '';   /* "id=value;id=value" */

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await c.newPage();
  await p.goto(BASE + '/' + PAGE, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1800);
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(200); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1500);
  if (SET) {
    await p.evaluate(spec => {
      spec.split(';').filter(Boolean).forEach(pair => {
        const [id, v] = pair.split('=');
        const el = document.getElementById(id);
        if (!el) { console.warn('no control ' + id); return; }
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, SET);
    await p.waitForTimeout(900);
  }
  const el = await p.$(SEL);
  if (!el) { console.log('no element ' + SEL); await b.close(); return; }
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  await el.screenshot({ path: OUT });
  console.log('wrote ' + OUT);
  await b.close();
})();
