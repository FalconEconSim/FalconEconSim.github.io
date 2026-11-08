// Usage: PORT=<your serve.js port> [OUT=<screenshot folder>] [SKIP_WAIT=ms] node lab/predict/tools/livecheck.js [weekN-viz.html] [figKey]
//   (SWITCHOVER.md, Integration pattern, checklist). figKey: the figure for the keyboard and touch-swipe checks (default: the
//   page's first figure that is not explore-first). SKIP_WAIT: how long "Just show me" may take to reach Explore (default 6000).
// Live page checks: rail anchors, nav drawer, ask widget, keyboard on a figure (with tag), touch scroll
// over a plot, every figure revealed + explore + new round, console errors, overflow. node livecheck.js [page]
const { chromium } = require('C:/MicroSite/review/node_modules/playwright-core');
const PAGE = process.argv[2] || 'week2-viz.html', KEY0 = process.argv[3] || null, SKIP_WAIT = +(process.env.SKIP_WAIT || 6000);
const OUT = require('path').join(process.env.OUT || require('os').tmpdir(), '/');
const problems = []; const bad = m => { problems.push(m); console.log('PROBLEM', m); };
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const W of [1440, 390]) {
    const touch = W < 600;
    const ctx = await b.newContext({ viewport: { width: W, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror ' + e.message));
    await p.goto('http://localhost:' + (process.env.PORT || 4361) + '/' + PAGE, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    await p.waitForTimeout(600);
    // 1. rail: every link has a target, and clicking puts the section heading below the sticky chrome
    const links = await p.$$eval('.rail a', as => as.map(a => a.getAttribute('href')));
    for (const h of links) {
      if (!(await p.$(h))) { bad(W + ' rail target missing ' + h); continue; }
      await p.click('.rail a[href="' + h + '"]'); await p.waitForTimeout(250);
      const top = await p.$eval(h, e => e.getBoundingClientRect().top);
      const chrome = await p.evaluate(() => { const r = document.querySelector('.rail').getBoundingClientRect(); return getComputedStyle(document.querySelector('.rail')).position === 'sticky' && r.top < 100 && r.width > innerWidth * 0.6 ? r.bottom : document.querySelector('.topbar').getBoundingClientRect().bottom; });
      if (top < chrome - 2 || top > 400) bad(W + ' rail ' + h + ' lands at ' + Math.round(top) + ' (chrome ' + Math.round(chrome) + ')');
    }
    // 2. nav drawer opens and closes
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click('[data-nav-open]'); await p.waitForTimeout(400);
    const drawer = await p.evaluate(() => { const d = [...document.querySelectorAll('nav, aside, dialog, [role=dialog], .nav-drawer, .drawer')].find(e => { const r = e.getBoundingClientRect(); return r.width > 150 && r.height > 300 && getComputedStyle(e).visibility !== 'hidden' && r.left < innerWidth && r.right > 0 && !e.classList.contains('rail'); }); return d ? d.className || d.tagName : null; });
    if (!drawer) bad(W + ' nav drawer did not open');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // 3. ask widget opens
    const ask = await p.evaluate(() => { const c = [...document.querySelectorAll('button, a')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return (s.position === 'fixed' || (e.closest('[style*=fixed]'))) || (r.right > innerWidth - 120 && r.bottom > innerHeight - 140 && r.width > 30); }); return c.map(e => e.className || e.id || e.tagName).slice(0, 4); });
    if (!ask.length) bad(W + ' no floating ask button found');
    else {
      const before = await p.evaluate(() => document.querySelectorAll('iframe, [role=dialog], .ask-panel, .chat-panel').length);
      const sel = await p.evaluate(() => { const e = document.querySelector('.ecfab-btn'); if (!e) return null; e.setAttribute('data-test-ask', '1'); return true; });
      if (sel) { await p.click('[data-test-ask]'); await p.waitForTimeout(700); await p.screenshot({ path: OUT + 'ask-' + W + '.png' }); await p.keyboard.press('Escape'); }
      const opened = await p.evaluate(() => [...document.querySelectorAll('[class*=ecfab], [class*=ecbot]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 250 && r.height > 250; }).length); if (!opened) bad(W + ' ask panel did not open'); console.log(W, 'ask panel elements', opened, 'candidates', ask.join(' | '), 'dialogs before', before);
    }
    // 4. keyboard on the chosen figure: focus the plot, arrows move a handle (a place step: Enter drops the point first)
    //    and the tag shows
    const K = KEY0 || await p.evaluate(() => Object.keys(__figs).find(k => !__figs[k].spec.exploreFirst));
    if (!K || !(await p.evaluate(k => !!__figs[k], K))) { bad(W + ' no figure ' + K + ' for the keyboard check'); }
    else {
      await p.evaluate(k => { __figs[k].stage.scrollIntoView({ block: 'center' }); }, K);
      await p.waitForTimeout(1200);
      await p.focus('#' + K + ' svg.plot');
      const placeStep = await p.evaluate(k => { const f = __figs[k], st = f.spec.steps[f.cur]; return !!(f.predicting && st && st.kind === 'place'); }, K);
      if (placeStep) await p.keyboard.press('Enter');
      await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
      const tag = await p.$eval('#' + K + ' .k-tag', e => e.textContent).catch(() => null);
      if (!tag) bad(W + ' no tag after keyboard move on ' + K); else console.log(W, K, 'keyboard tag:', tag, '| sr:', await p.$eval('#' + K + ' .sr', e => e.textContent));
      await p.screenshot({ path: OUT + 'kbd-' + K + '-' + W + '.png' });
    }
    // 5. touch: a swipe over a plot, from a point that no knob claims (in a drag step), scrolls the page
    if (touch && K) {
      // a point of the stage whose press the kit would not take (no knob within reach, not a tap / draw area)
      const r = await p.evaluate(k => {
        const f = __figs[k], rr = f.svg.getBoundingClientRect(), sc = f.S.W / rr.width;
        for (const fy of [0.35, 0.5, 0.2, 0.65, 0.8]) for (const fx of [0.6, 0.4, 0.8, 0.25, 0.5]) {
          const pt = { x: fx * f.S.W, y: fy * rr.height * sc };
          if (!f.target(pt, true)) return [rr.left + fx * rr.width, rr.top + fy * rr.height];
        }
        return null;
      }, K);
      if (!r) { console.log(W, K, 'every point of the plot is a touch target in this step (place / draw): swipe check skipped'); }
      else {
      const y0 = await p.evaluate(() => scrollY);
      const c = await ctx.newCDPSession(p);
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r[0], y: r[1] }] });
      for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r[0], y: r[1] - i * 20 }] }); await p.waitForTimeout(16); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(400);
      const y1 = await p.evaluate(() => scrollY);
      if (y1 - y0 < 50) bad(W + ' touch swipe over the ' + K + ' plot did not scroll (' + y0 + ' -> ' + y1 + ')'); else console.log(W, K, 'touch swipe scrolled', y1 - y0);
      }
    }
    // 6. every figure: reveal by "just show me", explore control, new round
    const keys = await p.evaluate(() => Object.keys(__figs));
    for (const k of keys) {
      await p.evaluate(k => __figs[k].stage.scrollIntoView({ block: 'center' }), k); await p.waitForTimeout(150);
      // explore-first figures open in Explore and have no "Just show me"
      const ef = await p.evaluate(k => !!__figs[k].spec.exploreFirst, k);
      if (!ef) { await p.click('#' + k + ' .skip'); await p.waitForFunction(k => __figs[k].exploring, k, { timeout: SKIP_WAIT }).catch(() => {}); }
      const st = await p.evaluate(k => { const f = __figs[k]; return { ex: f.exploring, ctl: f.root.querySelectorAll('[data-ctl]').length, ro: (f.root.querySelector('.ex-readout') || {}).textContent }; }, k);
      if (!st.ex) bad(W + ' ' + k + ' not exploring after skip');
      if (st.ctl) { await p.click('#' + k + ' [data-ctl]:not([disabled])'); await p.waitForTimeout(600); }
      if (k === 'f21' || k === 'f25') await p.screenshot({ path: OUT + 'explore-' + k + '-' + W + '.png' });
      await p.click('#' + k + ' .newone'); await p.waitForTimeout(1100);
      if (!(await p.evaluate(([k, ef]) => ef ? __figs[k].exploring : __figs[k].predicting, [k, ef]))) bad(W + ' ' + k + (ef ? ' not exploring after new round (explore-first)' : ' not predicting after new round'));
      // the "Try a new one" scroll must leave the question visible below the sticky chrome
      const qt = await p.$eval('#' + k + ' .fig-head', e => e.getBoundingClientRect().top);
      if (qt < 40) bad(W + ' ' + k + ' question hidden under the top bar after new round (' + Math.round(qt) + ')');
    }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > 0) bad(W + ' horizontal overflow ' + ov);
    if (errs.length) bad(W + ' console: ' + errs.join(' | '));
    console.log(W, 'done; overflow', ov, 'errors', errs.length);
    await ctx.close();
  }
  await b.close();
  console.log(problems.length ? problems.length + ' PROBLEMS' : 'ALL OK');
  process.exit(problems.length ? 1 : 0);
})();
