/* Is there any figure a reader can change but not put back? Lists every
   section holding a control, and says which reset it has: the shared one, its
   own, or none. */
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

const SCAN = () => {
  const out = [];
  document.querySelectorAll('section.sec').forEach(sec => {
    const controls = [...sec.querySelectorAll('input, select, textarea')]
      .filter(e => ['range', 'number', 'text', 'checkbox', 'radio'].includes(e.type) ||
                   e.tagName === 'SELECT' || e.tagName === 'TEXTAREA');
    if (!controls.length) return;
    const hd = sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const name = (hd ? hd.textContent : sec.id).trim();
    const shared = !!sec.querySelector('.fig-reset');
    let own = '';
    sec.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('fig-reset')) return;
      const t = (b.textContent || '').trim();
      if (/reset/i.test(t)) own = own || t;
    });
    out.push({ name, controls: controls.length, shared, own });
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /^week\d+-viz\.html$/.test(f))
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  const gaps = [], owns = [];
  let total = 0, shared = 0;
  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(1800);
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(180); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1500);
    (await p.evaluate(SCAN)).forEach(r => {
      total++;
      const tag = f.replace('-viz.html', '') + '  ' + r.name + '  (' + r.controls + ' controls)';
      if (r.shared) shared++;
      else if (r.own) owns.push(tag + '  -> its own "' + r.own + '"');
      else gaps.push(tag);
    });
    await p.close(); await c.close();
  }
  await b.close();
  console.log('sections holding a control: ' + total);
  console.log('  with the shared reset : ' + shared);
  console.log('  with a reset of their own: ' + owns.length);
  owns.forEach(x => console.log('      ' + x));
  console.log('  with no way back at all: ' + gaps.length);
  gaps.forEach(x => console.log('      ' + x));
})();
