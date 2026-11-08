// Usage: PORT=<your serve.js port> node lab/predict/tools/loadcheck.js [page ...]   (default: every lab/predict/weekN/ preview)
// Loads every lab/predict week page (and optional extra URLs) and reports console errors,
// failed requests and the number of mounted figures.
const { chromium } = require('C:/MicroSite/review/node_modules/playwright-core');
const BASE = 'http://localhost:' + (process.env.PORT || 4361) + '/';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => 'lab/predict/week' + n + '/');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  let bad = 0;
  for (const u of pages) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror ' + e.message));
    // a <video preload="metadata"> aborts its range request once it has the header: not an error
    p.on('requestfailed', r => { const ft = (r.failure() || {}).errorText || ''; if (!/fonts\.g/.test(r.url()) && !(/\.mp4$/.test(r.url()) && /ABORTED/.test(ft))) errs.push('reqfail ' + r.url() + ' ' + ft); });
    p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
    await p.goto(BASE + u, { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const n = await p.evaluate(() => window.__figs ? Object.keys(window.__figs).length : 0);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log((errs.length || !n ? 'BAD ' : 'ok  ') + u + ' figs=' + n + ' overflow=' + ov + (errs.length ? '\n   ' + errs.join('\n   ') : ''));
    if (errs.length || !n) bad++;
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
