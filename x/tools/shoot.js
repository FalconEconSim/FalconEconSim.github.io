/* Screenshots and smoke checks for x/ pages (Playwright, Edge).
 *   node x/tools/shoot.js <outdir> <page>[@sel1,sel2...] ... [--w=1440,390] [--base=http://localhost:4396/x/]
 * For each page and width: console errors, page errors, failed requests, horizontal overflow,
 * then one viewport screenshot at the top and one per selector (scrolled to it). */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join('C:/MicroSite/review/node_modules', 'playwright-core'));

const args = process.argv.slice(2);
const out = args[0];
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const widths = opt('w', '1440,390').split(',').map(Number);
const base = opt('base', 'http://localhost:4396/x/');
const pages = args.slice(1).filter((a) => !a.startsWith('--'));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const report = [];
  for (const spec of pages) {
    const [pg, sels] = spec.split('@');
    for (const w of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, hasTouch: w < 600, isMobile: w < 600 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
      page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
      page.on('requestfailed', (r) => { const u = r.url(); if (!/kaltura|workers\.dev|google-analytics/.test(u)) errs.push('failed: ' + u + ' ' + (r.failure() || {}).errorText); });
      page.on('response', (r) => { if (r.status() >= 400 && !/workers\.dev/.test(r.url())) errs.push('http ' + r.status() + ': ' + r.url()); });
      await page.goto(base + pg, { waitUntil: 'load' });
      await page.waitForTimeout(1800);
      const ov = await page.evaluate(() => {
        const W = document.documentElement.clientWidth, bad = [];
        if (document.documentElement.scrollWidth > W + 1) bad.push('doc ' + document.documentElement.scrollWidth + '>' + W);
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > W + 2 && getComputedStyle(el).position !== 'fixed' && !el.closest('.ask-drawer,.pathbar ol,.k-hits,mjx-container')) bad.push((el.className && el.className.baseVal == null ? el.className : el.tagName) + ' ' + Math.round(r.right));
        });
        return bad.slice(0, 8);
      });
      const name = pg.replace(/[^\w]+/g, '_') + '_' + w;
      await page.screenshot({ path: path.join(out, name + '_0top.png') });
      let i = 1;
      for (const sel of (sels ? sels.split(',') : [])) {
        const ok = await page.evaluate((s) => {
          const el = document.querySelector(s); if (!el) return false;
          const topBar = 120;
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - topBar);
          return true;
        }, sel);
        await page.waitForTimeout(900);
        if (ok) await page.screenshot({ path: path.join(out, name + '_' + (i++) + '_' + sel.replace(/[^\w]+/g, '') + '.png') });
        else errs.push('selector missing: ' + sel);
      }
      report.push({ page: pg, w, errs: errs.slice(0, 12), overflow: ov });
      await ctx.close();
    }
  }
  await browser.close();
  for (const r of report) console.log(r.page, r.w, r.errs.length ? '\n  ' + r.errs.join('\n  ') : 'no errors', r.overflow.length ? '\n  OVERFLOW ' + r.overflow.join(' | ') : '');
})();
