/* Do any two labels in the same plot sit on top of each other?

   Ink collisions are already checked elsewhere; this is the other half. Two
   labels overlapping is the failure the twelve-slot placement is meant to
   prevent, and it is the one a reader notices first. Measured in screen
   pixels on the rendered text, at several slider positions, walking the page
   so every figure has actually been looked at. */
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

const MEASURE = () => {
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

  const shown = el => {
    let n = el;
    for (let i = 0; i < 6 && n; i++) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.06) return false;
      n = n.parentElement;
    }
    return true;
  };
  /* a tick number is not a label anyone chose to place */
  const NUM = /^[-+(]?[$\u20ac\u00a3]?[-+]?\d[\d.,\s]*[%kKmMbB]?\)?$/;

  hosts.forEach(host => {
    const sec = host.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');
    const boxes = [];
    host.querySelectorAll('svg text, .JXGtext').forEach(t => {
      const s = (t.textContent || '').trim();
      if (!s || s.length > 40 || NUM.test(s)) return;
      if (t.closest('.tick, .domain, .readout-row, .fig-state, .ctrl-row')) return;
      if (!shown(t)) return;
      const r = t.getBoundingClientRect();
      if (!r.width || !r.height) return;
      boxes.push({ s, x: r.x, y: r.y, w: r.width, h: r.height });
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 1 && oy > 1) {
          out.push({ fig, a: a.s, b: b.s, area: Math.round(ox * oy), ox: Math.round(ox), oy: Math.round(oy) });
        }
      }
    }
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
      for (let y = 0; y < H; y += 600) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(250); }
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(700);
    };
    await walk();
    let n = 0;
    for (const frac of [null, 0.1, 0.45, 0.9]) {
      if (frac !== null) {
        await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * v);
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }), frac);
        await p.waitForTimeout(700);
        await walk();
      }
      (await p.evaluate(MEASURE)).forEach(r => {
        n++;
        const k = f.replace('-viz.html', '') + ' ' + r.fig + '  "' + r.a + '" / "' + r.b + '"';
        worst[k] = Math.max(worst[k] || 0, r.area);
      });
    }
    grand += n;
    console.log(f.replace('-viz.html', '').padEnd(9) + 'overlapping label pairs: ' + n);
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\ntotal overlapping label pairs across every state: ' + grand);
  const keys = Object.keys(worst).sort((x, y) => worst[y] - worst[x]);
  keys.slice(0, 25).forEach(k => console.log('  ' + worst[k] + 'px²  ' + k));
})();
