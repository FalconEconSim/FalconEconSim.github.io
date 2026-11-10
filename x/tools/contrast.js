/* Measured text contrast on x/ pages (WCAG 2.x ratio from computed colours).
 *   node x/tools/contrast.js [page ...] [--base=http://localhost:4396/x/]
 * For every element that directly holds visible text: its computed colour (with opacity) against
 * the first opaque background found up the tree, blended. Flags anything under 4.5:1, or under
 * 3:1 for large text (24px+, or 18.67px+ bold). Kit figures are skipped: they are settled and
 * were measured when they were built. Prints the lowest pairs per page. */
'use strict';
const path = require('path');
const { chromium } = require(path.join('C:/MicroSite/review/node_modules', 'playwright-core'));
const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('--base=')) || '--base=http://localhost:4396/x/').slice(7);
const pages = args.filter((a) => !a.startsWith('--'));
if (!pages.length) pages.push('index.html', 'week1.html', 'week2.html', 'week5.html', 'week8.html', 'week11.html', 'review.html', 'ask.html', 'week3-practice.html');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  let worst = 99, fails = 0;
  for (const pg of pages) {
    for (const w of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(base + pg, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      // open things that are closed by default so their text is measured too
      await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); const s = document.querySelector('.deck-stage .show'); if (s) s.click(); });
      await page.waitForTimeout(300);
      const res = await page.evaluate(() => {
        function parse(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
        function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
        function blend(fg, bg) { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
        function bgOf(el) {
          const stack = [];
          for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
          let bg = { r: 255, g: 255, b: 255, a: 1 };
          for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
          return bg;
        }
        function opacity(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; }
        const out = [];
        document.querySelectorAll('body *').forEach((el) => {
          if (el.closest('.kfig, svg, mjx-container, iframe, script, style, .sr-only, [hidden], video')) return;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          const bg = bgOf(el); let fg = parse(cs.color); if (!fg) return;
          fg = { ...fg, a: fg.a * opacity(el) };
          const c = blend(fg, bg);
          const L1 = lum(c), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
          const large = size >= 24 || (bold && size >= 18.66);
          const need = large ? 3 : 4.5;
          out.push({ ratio: Math.round(ratio * 100) / 100, need, txt: el.textContent.trim().slice(0, 40), cls: String(el.className).slice(0, 30), size });
        });
        return out;
      });
      const bad = res.filter((x) => x.ratio < x.need);
      const min = res.reduce((m, x) => Math.min(m, x.ratio), 99);
      worst = Math.min(worst, min); fails += bad.length;
      const low = res.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 3).map((x) => x.ratio + ' [' + x.cls + '] "' + x.txt + '"');
      console.log(pg + ' @' + w + ': ' + res.length + ' text elements, min ' + min + ', ' + bad.length + ' under AA' + (bad.length ? '\n   ' + bad.slice(0, 6).map((x) => x.ratio + '<' + x.need + ' [' + x.cls + '] ' + x.size + 'px "' + x.txt + '"').join('\n   ') : '') + '\n   lowest: ' + low.join(' | '));
      await page.close();
    }
  }
  await browser.close();
  console.log('worst ratio ' + worst + ', ' + fails + ' failures');
})();
