/* What size do figure labels and tick numbers actually RENDER at?

   Not what the attribute says. Most of these figures declare a font size in
   their own viewBox units and are then drawn at about 0.92 of that, so a
   declared 12 arrives on screen as 11. Design 21's target of 18px for a curve
   label and 16px for a tick is a screen measurement, so this measures screen
   pixels, and reports the room each plot has for bigger text: its size, and
   how many labels are competing for it. */
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
  const NUM = /^[-+(]?[$\u20ac\u00a3]?[-+]?\d[\d.,\s]*[%kKmMbB]?\)?$/;
  const rows = [];
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

  hosts.forEach(host => {
    const hb = host.getBoundingClientRect();
    if (hb.width < 100) return;
    const sec = host.closest('section.sec');
    const hd = sec && sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : (sec ? sec.id : '?');
    const labels = [], ticks = [];
    host.querySelectorAll('svg text, .JXGtext').forEach(t => {
      const s = (t.textContent || '').trim();
      if (!s) return;
      const cs = getComputedStyle(t);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.06) return;
      const r = t.getBoundingClientRect();
      if (!r.height) return;
      /* The declared size is in the svg's own units, and the svg is scaled to
         fit its box, so the size a reader sees is the two multiplied. */
      let scale = 1;
      try { const m = t.getScreenCTM(); if (m) scale = Math.hypot(m.a, m.b) || 1; } catch (e) {}
      const px = Math.round(parseFloat(cs.fontSize) * scale * 10) / 10;
      if (t.closest('.tick') || NUM.test(s)) ticks.push(px);
      else if (s.length <= 36) labels.push(px);
    });
    if (!labels.length && !ticks.length) return;
    const med = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
    rows.push({ fig, w: Math.round(hb.width), h: Math.round(hb.height),
                nLabels: labels.length, label: med(labels), tick: med(ticks) });
  });
  return rows;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  const all = [];
  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(200); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1800);
    (await p.evaluate(MEASURE)).forEach(r => all.push(Object.assign({ page: f.replace('-viz.html', '') }, r)));
    await p.close(); await c.close();
  }
  await b.close();

  console.log('page     figure        plot        labels  label px  tick px');
  all.forEach(r => console.log(
    r.page.padEnd(9) + String(r.fig).slice(0, 12).padEnd(14) +
    (r.w + 'x' + r.h).padEnd(12) + String(r.nLabels).padEnd(8) +
    String(r.label).padEnd(10) + r.tick));

  const lab = all.map(r => r.label).filter(Boolean).sort((a, b) => a - b);
  const tik = all.map(r => r.tick).filter(Boolean).sort((a, b) => a - b);
  const pct = (a, q) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : 0;
  console.log('\nplots measured: ' + all.length);
  console.log('label text, rendered px:  smallest ' + lab[0] + '   median ' + pct(lab, 0.5) + '   largest ' + lab[lab.length - 1]);
  console.log('tick numbers, rendered px: smallest ' + tik[0] + '   median ' + pct(tik, 0.5) + '   largest ' + tik[tik.length - 1]);
  console.log('plots whose label text renders under 15px: ' + all.filter(r => r.label && r.label < 15).length);
  console.log('plots whose tick numbers render under 14px: ' + all.filter(r => r.tick && r.tick < 14).length);
})();
