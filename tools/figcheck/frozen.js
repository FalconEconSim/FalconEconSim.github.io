/* Do the labels actually follow the figure when a slider moves?

   The point of the placement pass is that a label re-decides where to sit for
   the frame that is on screen. If the page never asks for that after its own
   redraw, the boxes and their leaders stay exactly where they were first put
   while the curves move away underneath, and nothing looks obviously broken
   until you notice a leader pointing at nothing.

   For each figure with a slider: record every label anchor and box position,
   move that figure's own slider, and see whether anything moved. A figure
   whose curves genuinely do not depend on that slider is reported separately
   from one whose anchors moved but whose boxes did not. */
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

const SNAP = () => {
  const out = {};
  document.querySelectorAll('section.sec').forEach(sec => {
    const hd = sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const name = hd ? hd.textContent.trim() : sec.id;
    const leaders = [...sec.querySelectorAll('[data-place-leader]')];
    if (!leaders.length) return;
    out[name] = {
      anchors: leaders.map(L => Math.round(+L.getAttribute('x1')) + ',' + Math.round(+L.getAttribute('y1'))).join(' '),
      boxes: leaders.map(L => Math.round(+L.getAttribute('x2')) + ',' + Math.round(+L.getAttribute('y2'))).join(' '),
      sliders: [...sec.querySelectorAll('input[type=range]')].map(s => s.id)
    };
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  const frozen = [], moving = [], noSlider = [];

  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(200); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2200);

    /* One section at a time, scrolled into view, because a figure that is not
       on screen is entitled to skip the work. */
    const ids = await p.evaluate(() => [...document.querySelectorAll('section.sec')]
      .filter(s => s.querySelector('[data-place-leader]') && s.querySelector('input[type=range]'))
      .map(s => s.id));
    const before = {}, after = {};
    const seen = await p.evaluate(() => { const m = {}; document.querySelectorAll("section.sec").forEach(sec => { const hd = sec.querySelector(".fig-hd .fig-n, .sec-hd .sec-n"); m[hd ? hd.textContent.trim() : sec.id] = sec.id; }); return m; });
    for (const id of ids) {
      await p.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'center' }), id);
      await p.waitForTimeout(700);
      // only this section: a whole-page snapshot taken later would
      // overwrite the "before" of every section already visited
      const s0 = await p.evaluate(SNAP); Object.keys(s0).forEach(k => { if (seen[k] === id) before[k] = s0[k]; });
      for (const v of [0.28, 0.76]) {
        await p.evaluate(([i, x]) => document.querySelectorAll('#' + i + ' input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * x);
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }), [id, v]);
        await p.waitForTimeout(800);
      }
      const s1 = await p.evaluate(SNAP); Object.keys(s1).forEach(k => { if (seen[k] === id) after[k] = s1[k]; });
    }

    Object.keys(before).forEach(k => {
      const a = before[k], z = after[k];
      if (!z) return;
      const tag = f.replace('-viz.html', '') + ' ' + k;
      if (!a.sliders.length) { noSlider.push(tag); return; }
      const anchorsMoved = a.anchors !== z.anchors;
      const boxesMoved = a.boxes !== z.boxes;
      if (!anchorsMoved && !boxesMoved) frozen.push(tag + '  (nothing moved)');
      else if (anchorsMoved && !boxesMoved) frozen.push(tag + '  (anchors moved, boxes did not)');
      else if (!anchorsMoved && boxesMoved) moving.push(tag + '  (boxes re-solved, anchors fixed)');
      else moving.push(tag);
    });
    await p.close(); await c.close();
  }
  await b.close();

  console.log('figures whose labels follow the slider: ' + moving.length);
  console.log('figures with a slider whose labels do not: ' + frozen.length);
  frozen.forEach(x => console.log('   ' + x));
  if (noSlider.length) console.log('\n(no slider in the section, not judged: ' + noSlider.length + ')');
})();
