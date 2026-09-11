/* Does the reset control actually put a figure back?

   For every figure that has one: record what all its controls hold, move each
   of them somewhere else, press Reset, and compare. Also checks the button is
   quiet to begin with and wakes up once something has moved. */
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

const STATE = () => {
  const out = {};
  document.querySelectorAll('section.sec').forEach(sec => {
    const btn = sec.querySelector('.fig-reset');
    if (!btn) return;
    const hd = sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const name = (hd ? hd.textContent : sec.id).trim();
    const vals = [...sec.querySelectorAll('input, select, textarea')]
      .filter(e => ['range', 'number', 'text', 'checkbox', 'radio'].includes(e.type) ||
                   ['select-one', 'select-multiple', 'textarea'].includes(e.type))
      .map(e => (e.type === 'checkbox' || e.type === 'radio') ? (e.checked ? '1' : '0') : String(e.value));
    const modes = [...sec.querySelectorAll('button')]
      .filter(b => !b.classList.contains('fig-reset'))
      .map(b => ['on', 'active', 'revealed', 'selected', 'active-rate'].some(c => b.classList.contains(c)) ? '1' : '0');
    out[name] = { id: sec.id, vals: vals.join('|'), modes: modes.join(''), disabled: btn.disabled };
  });
  return out;
};

const DISTURB = id => {
  const sec = document.getElementById(id);
  let n = 0;
  sec.querySelectorAll('input[type=range]').forEach(s => {
    const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
    const cur = parseFloat(s.value);
    /* somewhere clearly different from where it is */
    const want = Math.abs(cur - lo) > Math.abs(cur - hi) ? lo + (hi - lo) * 0.2 : lo + (hi - lo) * 0.8;
    s.value = String(want);
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    n++;
  });
  sec.querySelectorAll('select').forEach(sel => {
    if (sel.options.length < 2) return;
    sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    n++;
  });
  return n;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /^week\d+-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  let withBtn = 0, restored = 0, failed = [], quietOk = 0, wokeOk = 0;

  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(1800);
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(180); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1600);

    const before = await p.evaluate(STATE);
    const names = Object.keys(before);
    withBtn += names.length;
    let ok = 0;
    for (const name of names) {
      const id = before[name].id;
      if (before[name].disabled) quietOk++;
      const moved = await p.evaluate(DISTURB, id);
      if (!moved) { ok++; restored++; continue; }   /* nothing to move */
      await p.waitForTimeout(450);
      const mid = await p.evaluate(STATE);
      if (mid[name] && !mid[name].disabled) wokeOk++;
      await p.evaluate(i => {
        const btn = document.getElementById(i).querySelector('.fig-reset');
        if (btn) btn.click();
      }, id);
      await p.waitForTimeout(1400);
      const after = await p.evaluate(STATE);
      const a = before[name], z = after[name];
      if (z && a.vals === z.vals && a.modes === z.modes) { ok++; restored++; }
      else failed.push(f.replace('-viz.html', '') + '  ' + name +
        '\n      was  ' + a.vals + '  modes ' + a.modes +
        '\n      now  ' + (z ? z.vals : '(gone)') + '  modes ' + (z ? z.modes : ''));
    }
    console.log(f.replace('-viz.html', '').padEnd(9) +
      'figures with a reset: ' + String(names.length).padEnd(4) +
      'restored exactly: ' + ok + (errs.length ? '   JS ERRORS: ' + errs[0] : ''));
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\nfigures carrying a reset control: ' + withBtn);
  console.log('restored to their starting values exactly: ' + restored);
  console.log('quiet before anything moved: ' + quietOk + ',  woke up once something did: ' + wokeOk);
  if (failed.length) {
    console.log('\nnot restored:');
    failed.forEach(x => console.log('  ' + x));
  }
})();
