/* Interaction checks for x/ (Playwright, Edge): drives the parts that only work when used.
 *   node x/tools/flow.js <outdir> [--base=http://localhost:4396/x/]
 * 1. week page: flashcard reveal + rate, video play loads a player, done ticks persist
 * 2. a kit figure on a week page: skip-reveal, verdict shows, figure index updates
 * 3. review: start a mixed run, answer a card, reveal a figure, finish, summary
 * 4. home: progress and "pick up where you left off" reflect the above
 * 5. keyboard: tab order reaches the path bar, ask drawer opens and closes with Escape */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join('C:/MicroSite/review/node_modules', 'playwright-core'));
const out = process.argv[2];
const base = (process.argv.find((a) => a.startsWith('--base=')) || '--base=http://localhost:4396/x/').slice(7);
fs.mkdirSync(out, { recursive: true });
const results = [];
function ok(name, cond, extra) { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  (' + extra + ')' : '')); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, hasTouch: w < 600, isMobile: w < 600 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/workers\.dev|CORS|Failed to load resource|kaltura/i.test(m.text())) errs.push(m.text()); });
    const tag = '@' + w + ' ';

    // 1. week 4 page
    await page.goto(base + 'week4.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.locator('#check').scrollIntoViewIfNeeded();
    const q1 = await page.locator('.deck-stage .card-q').textContent();
    await page.locator('.deck-stage .show').click();
    const ansVisible = await page.locator('.deck-stage .card-a').isVisible();
    ok(tag + 'card answer shows', ansVisible);
    await page.locator('.deck-stage [data-r="good"]').click();
    const q2 = await page.locator('.deck-stage .card-q').textContent();
    ok(tag + 'rating moves to the next card', q1 !== q2);
    const known = await page.locator('.deck-top .known b').textContent();
    ok(tag + 'known count updates', known.trim() === '1', known);
    await page.locator('.rows [data-play]').first().click();
    const ifr = await page.locator('.vid-slot iframe').count();
    ok(tag + 'play loads a lecture player', ifr === 1);
    await page.locator('.rows .tick').first().click();
    ok(tag + 'watched tick toggles', (await page.locator('.rows .tick').first().getAttribute('aria-pressed')) === 'true');

    // 2. a figure: skip straight to the answer, then check the figure index
    await page.locator('#f41').scrollIntoViewIfNeeded();
    await page.locator('#f41 .skip').click();
    await page.waitForTimeout(2500);
    const verdict = await page.locator('#f41 .verdict').isVisible();
    ok(tag + 'figure 4.1 reveals', verdict);
    await page.locator('#f41 .newone').click();
    await page.waitForTimeout(600);
    ok(tag + 'try a new one restarts', await page.locator('#f41 .predict').isVisible());
    await page.screenshot({ path: path.join(out, 'flow_fig_' + w + '.png') });
    await page.goto(base + 'week4.html#figures', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const paths = await page.locator('.pathbar a[href="#watch"] .st').textContent();
    ok(tag + 'path bar counts persist', /^1 of/.test(paths.trim()), paths);

    // 5. keyboard + ask drawer
    await page.goto(base + 'week4.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement.className + ':' + document.activeElement.textContent.trim().slice(0, 20));
    ok(tag + 'first tab stop is the skip link', /skiplink/.test(first), first);
    await page.locator('.top [data-ask]').click();
    await page.waitForTimeout(500);
    ok(tag + 'ask drawer opens', await page.locator('.ask-drawer.open').count() === 1);
    await page.screenshot({ path: path.join(out, 'flow_ask_' + w + '.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    ok(tag + 'Escape closes the drawer', await page.locator('.ask-drawer.open').count() === 0);
    await page.locator('#f41').scrollIntoViewIfNeeded();
    await page.locator('#f41 .ecask-fig').click();
    await page.waitForTimeout(500);
    const ctxTxt = await page.locator('.ask-drawer').textContent();
    ok(tag + 'ask about this figure opens with the figure', /4\.1/.test(ctxTxt));
    await page.keyboard.press('Escape');

    // 3. review
    await page.goto(base + 'review.html?weeks=2-4', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.locator('input[name=len][value="8"]').check({ force: true });
    await page.locator('#rv-go').click();
    await page.waitForTimeout(2500);
    ok(tag + 'review starts', await page.locator('#session').isVisible());
    let figs = 0, cards = 0;
    for (let i = 0; i < 8; i++) {
      if (await page.locator('#rv-stage .card').count()) {
        cards++;
        await page.locator('#rv-stage .show').click();
        await page.locator('#rv-stage [data-r="hard"]').click();
      } else {
        await page.waitForSelector('#rv-stage .kfig', { timeout: 8000 });
        figs++;
        if (i === 0) await page.screenshot({ path: path.join(out, 'flow_review_' + w + '.png') });
        const sk = page.locator('#rv-stage .skip');
        if (await sk.isVisible()) { await sk.click(); await page.waitForTimeout(2600); }
        await page.locator('#rv-nextbtn').click();
      }
      await page.waitForTimeout(500);
      if (await page.locator('#summary').isVisible()) break;
    }
    ok(tag + 'review mixes figures and cards', figs > 0 && cards > 0, figs + ' figs, ' + cards + ' cards');
    ok(tag + 'review ends in a summary', await page.locator('#summary').isVisible());
    await page.screenshot({ path: path.join(out, 'flow_summary_' + w + '.png'), fullPage: false });

    // 4. home
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const resume = await page.locator('#resume').textContent();
    ok(tag + 'home offers to continue', /Pick up where you left off/.test(resume), resume.slice(0, 60));
    const started = await page.locator('.tp.started').count();
    ok(tag + 'home shows progress on started weeks', started >= 1, started + ' started');
    await page.screenshot({ path: path.join(out, 'flow_home_' + w + '.png') });

    ok(tag + 'no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
})();
