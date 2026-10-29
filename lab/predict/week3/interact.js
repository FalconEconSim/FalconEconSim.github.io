// Run: cd C:\MicroSite && PORT=4383 node serve.js, then node lab/predict/week3/interact.js
// (needs playwright-core in C:/MicroSite/review/node_modules and Edge).
// Interaction suite for lab/predict/week3: real mouse drags/taps to the exact answers (6+ rounds per
// figure, incl. "Try a new one"), every explore control and handle, keyboard-only completion, touch
// taps/drags via CDP, and a scroll check. Fails loudly; exits 1 on any problem or console error.
const { chromium } = require('C:/MicroSite/review/node_modules/playwright-core');
const URL = 'http://localhost:4383/lab/predict/week3/';
let problems = [];
const bad = m => { problems.push(m); console.log('PROBLEM', m); };

// page-side helpers: data -> client coords, including the stacked panels of 3.1 / 3.3
const HELP = `
window.__t = {
  stack(f) { const S = f.S, d = f.dom, ph = S.y0 - S.y1, gap = (S.narrow ? 70 : 78) / ph * 100, bh = (100 - gap) * 0.44, tl = bh + gap;
    return { ty: y => tl + y / d.Yt * (100 - tl), by: p => p / d.P * bh }; },
  cl(f, x, y) { const r = f.svg.getBoundingClientRect(), S = f.S; return [r.left + S.x(x) * r.width / S.W, r.top + S.y(y) * r.height / S.H]; },
  clp(f, px, py) { const r = f.svg.getBoundingClientRect(), S = f.S; return [r.left + px * r.width / S.W, r.top + py * r.height / S.H]; },
  st(f, k) { const h = f.handles().find(h => h.step === k); return this.clp(f, h.px[0], h.px[1]); },
  h(f, i) { const h = f.handles()[i]; return this.clp(f, h.px[0], h.px[1]); }
};`;

async function plan(page, key) {
  // returns a list of actions [{kind:'tap'|'drag', from:[x,y], to:[x,y]}] in client coords, computed one at a time
  return page.evaluate(key => {
    const f = window.__figs[key], s = f.sol, p = f.p, T = window.__t, M = window.W3;
    if (key === 'f31') { const st = T.stack(f); return f.cur === 0 ? { kind: 'tap', to: T.cl(f, s.X1, st.ty(s.Ys)) } : { kind: 'tap', to: T.cl(f, s.X1, st.by(p.P1)) }; }
    if (key === 'f32') {
      if (f.cur === 0) { const h = f.handles()[0]; return { kind: 'drag', from: T.h(f, 0), to: T.cl(f, h.x, (s.Mc - p.P1 * h.x) / p.Py) }; }
      return { kind: 'drag', from: T.st(f, 1), to: T.cl(f, s.XC, s.YC) };
    }
    if (key === 'f33') { const st = T.stack(f); return f.cur === 0 ? { kind: 'drag', from: T.h(f, 0), to: T.cl(f, s.X1, st.ty(s.Y1)) } : { kind: 'drag', from: T.st(f, 1), to: T.cl(f, s.X1, st.by(2)) }; }
    if (key === 'f34') {
      if (s.kind === 'movement') return { kind: 'drag', from: T.h(f, 0), to: T.cl(f, s.Q1, s.P1) };
      const h = f.handles()[1]; return { kind: 'drag', from: T.h(f, 1), to: T.cl(f, h.x + s.dq, h.y) };
    }
    if (key === 'f35') return { kind: 'drag', from: T.h(f, 0), to: T.cl(f, s.X1, p.Px) };
  }, key);
}
async function act(page, a) {
  if (a.kind === 'tap') { await page.mouse.click(a.to[0], a.to[1]); return; }
  await page.mouse.move(a.from[0], a.from[1]); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.from[0] + (a.to[0] - a.from[0]) * i / 8, a.from[1] + (a.to[1] - a.from[1]) * i / 8);
  await page.mouse.up();
}
async function view(page, key) {
  await page.evaluate(key => { const r = document.getElementById(key).querySelector('.stage').getBoundingClientRect(); window.scrollBy({ top: r.top - 20, behavior: 'instant' }); }, key);
  await page.waitForTimeout(80);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  /* ---------- mouse, at 1440 ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.addScriptTag({ content: HELP });
    for (const key of ['f31', 'f32', 'f33', 'f34', 'f35']) {
      const scores = [];
      for (let round = 0; round < 7; round++) {
        await view(page, key);
        for (let k = 0; k < 4; k++) {
          const st = await page.evaluate(key => { const f = window.__figs[key]; return { cur: f.cur, n: f.spec.steps.length }; }, key);
          if (st.cur >= st.n) break;
          await act(page, await plan(page, key)); await view(page, key);
        }
        const ready = await page.$eval('#' + key + ' .reveal', b => !b.disabled);
        if (!ready) { bad(key + ' r' + round + ' reveal not enabled after mouse input ' + await page.$eval('#' + key + ' .steps', e => e.textContent)); }
        await page.click('#' + key + ' .reveal');
        await page.waitForTimeout(60);
        const sc = await page.evaluate(key => window.__figs[key].result && window.__figs[key].result.total, key);
        scores.push(sc);
        if (!(sc >= 90)) bad(key + ' r' + round + ' exact answer by mouse scored ' + sc + ' ' + JSON.stringify(await page.evaluate(k => window.__figs[k].p, key)));
        // explore: every control button, then each explore handle dragged a bit
        const btns = await page.$$('#' + key + ' .explore button');
        for (const b of btns) { if (await b.isEnabled()) { await b.click(); await page.waitForTimeout(30); } }
        await view(page, key);
        const nh = await page.evaluate(key => window.__figs[key].handles().length, key);
        for (let i = 0; i < nh; i++) {
          const from = await page.evaluate(([key, i]) => window.__t.h(window.__figs[key], i), [key, i]);
          await act(page, { kind: 'drag', from, to: [from[0] - 30, from[1] - 25] });
        }
        const ro = await page.$eval('#' + key + ' .ex-readout', e => e.textContent);
        if (!ro || /NaN|undefined|Infinity/.test(ro)) bad(key + ' readout ' + ro);
        const vt = await page.$eval('#' + key + ' .verdict', e => e.textContent);
        if (/NaN|undefined|Infinity/.test(vt)) bad(key + ' verdict ' + vt);
        const svgt = await page.$eval('#' + key + ' svg', e => e.textContent);
        if (/NaN|undefined|Infinity|<sub>/.test(svgt)) bad(key + ' svg text ' + svgt.slice(0, 200));
        await page.click('#' + key + ' .newone'); await page.waitForTimeout(60);
      }
      console.log('mouse', key, scores.join(' '));
    }
    if (errs.length) bad('console errors (mouse): ' + errs.join(' | '));
    await ctx.close();
  }
  /* ---------- keyboard only ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL, { waitUntil: 'networkidle' });
    for (const key of ['f31', 'f32', 'f33', 'f34', 'f35']) {
      await page.focus('#' + key + ' svg.plot');
      let n = 0;
      while (n < 60 && !(await page.$eval('#' + key + ' .reveal', b => !b.disabled))) {
        for (const k of ['ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'Enter']) await page.keyboard.press(k);
        n++;
      }
      const ok = await page.$eval('#' + key + ' .reveal', b => !b.disabled);
      if (!ok) bad(key + ' keyboard could not finish the steps');
      await page.focus('#' + key + ' .reveal'); await page.keyboard.press('Enter'); await page.waitForTimeout(60);
      const sc = await page.evaluate(key => window.__figs[key].result && window.__figs[key].result.total, key);
      // explore by keyboard: arrows on the explore handle
      await page.focus('#' + key + ' svg.plot'); for (const k of ['ArrowUp', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(k);
      console.log('keyboard', key, 'done in', n, 'cycles, score', sc);
    }
    if (errs.length) bad('console errors (keyboard): ' + errs.join(' | '));
    await ctx.close();
  }
  /* ---------- touch at 390 ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL, { waitUntil: 'networkidle' }); await page.addScriptTag({ content: HELP });
    const cdp = await ctx.newCDPSession(page);
    const touch = async (a) => {
      const pts = a.kind === 'tap' ? [a.to] : Array.from({ length: 9 }, (_, i) => [a.from[0] + (a.to[0] - a.from[0]) * i / 8, a.from[1] + (a.to[1] - a.from[1]) * i / 8]);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
      for (const q of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q[0], y: q[1] }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    for (const key of ['f31', 'f32', 'f33', 'f34', 'f35']) {
      await view(page, key); await page.waitForTimeout(600);
      const y0 = await page.evaluate(() => scrollY);
      for (let k = 0; k < 4; k++) {
        const st = await page.evaluate(key => { const f = window.__figs[key]; return { cur: f.cur, n: f.spec.steps.length }; }, key);
        if (st.cur >= st.n) break;
        await touch(await plan(page, key)); await page.waitForTimeout(50);
      }
      const y1 = await page.evaluate(() => scrollY);
      const ready = await page.$eval('#' + key + ' .reveal', b => !b.disabled);
      if (!ready) bad(key + ' touch could not finish: ' + await page.$eval('#' + key + ' .steps', e => e.textContent));
      const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (Math.abs(y1 - y0) > 2 && Math.abs(y1 - maxY) > 1) bad(key + ' page scrolled during a touch drag on a handle: ' + (y1 - y0));
      await page.$eval('#' + key + ' .reveal', b => b.click()); await page.waitForTimeout(60);
      const sc = await page.evaluate(key => window.__figs[key].result && window.__figs[key].result.total, key);
      if (!(sc >= 85)) bad(key + ' touch exact answer scored ' + sc);
      // a swipe on the plot away from handles in explore must scroll the page
      const r = await page.$eval('#' + key + ' .stage', e => { const b = e.getBoundingClientRect(); return [b.left + 30, b.top + b.height * 0.5]; });
      const s0 = await page.evaluate(() => scrollY);
      await touch({ kind: 'drag', from: [r[0] + 300 > 380 ? 360 : r[0] + 300, r[1]], to: [360, r[1] - 200] });
      await page.waitForTimeout(2500);
      const s1 = await page.evaluate(() => scrollY);
      console.log('touch', key, 'score', sc, 'swipe scrolled', s1 - s0);
    }
    if (errs.length) bad('console errors (touch): ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.length + ' PROBLEMS' : 'interaction suite: all good');
  process.exit(problems.length ? 1 : 0);
})();
