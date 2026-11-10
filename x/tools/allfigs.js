/* Review mode can mount every one of the 69 figures on its own and start it on a random round.
 * Loads x/review.html, then for each figure in XDATA: loads its week's scripts, mounts the single
 * spec the way review.js does, calls newRound(true) three times, reveals without a guess, and
 * checks the verdict shows. Reports any error per figure.
 *   node x/tools/allfigs.js [--base=http://localhost:4396/x/] */
'use strict';
const path = require('path');
const { chromium } = require(path.join('C:/MicroSite/review/node_modules', 'playwright-core'));
const base = (process.argv.find((a) => a.startsWith('--base=')) || '--base=http://localhost:4396/x/').slice(7);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/workers\.dev|CORS|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.goto(base + 'review.html', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const keys = await p.evaluate(() => Object.keys(XDATA.figs));
  let bad = 0;
  for (const k of keys) {
    errs.length = 0;
    const r = await p.evaluate(async (key) => {
      const f = XDATA.figs[key];
      const load = (src) => new Promise((ok, no) => { if (document.querySelector('script[src="' + src + '"]')) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.body.appendChild(s); });
      await load('../assets/predict/week' + f.week + '/models.js');
      await load('../assets/predict/week' + f.week + '/figs.js');
      const spec = window['W' + f.week + 'FIGS'].find((s) => s.key === key);
      const stage = document.getElementById('rv-stage');
      document.getElementById('setup').hidden = true; document.getElementById('session').hidden = false;
      stage.innerHTML = '<div id="' + key + '"></div>';
      const figs = Kit.mount([spec], { films: false, store: 'x-allfigs-test', board: '#none' });
      const fig = figs[key];
      for (let i = 0; i < 3; i++) fig.newRound(true);
      if (!f.ef) fig.reveal(true);
      for (let t = 0; t < 40 && !f.ef && document.querySelector('#' + key + ' .verdict').hidden; t++) await new Promise((res) => setTimeout(res, 250));
      return { verdict: !document.querySelector('#' + key + ' .verdict').hidden || f.ef, svg: document.querySelectorAll('#' + key + ' svg *').length };
    }, k);
    const ok = r.verdict && r.svg > 10 && !errs.length;
    if (!ok) bad++;
    if (!ok) console.log('BAD ' + k + ' ' + JSON.stringify(r) + ' ' + errs.join(' | '));
  }
  await p.evaluate(() => localStorage.removeItem('x-allfigs-test'));
  console.log(keys.length + ' figures mounted singly with random rounds, ' + bad + ' problems');
  await b.close();
})();
