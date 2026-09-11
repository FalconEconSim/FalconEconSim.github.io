/* A leader that reaches SOMETHING is not the same as a leader that reaches the
   thing its label names. Every label on this site is coloured to match its own
   curve, so the test is cheap: at the point the leader ends, is the ink that
   colour?

   Only judged where there is an answer to be had. A label whose colour appears
   nowhere in the figure has nothing to be checked against, and one ending on a
   filled region is naming an area rather than a line. */
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

const PROBE = () => {
  const out = [];
  const rgb = c => {
    if (!c) return null;
    const m = String(c).match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    const t = String(c).match(/([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    return t ? [+t[1], +t[2], +t[3]] : null;
  };
  const gap = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

  document.querySelectorAll('section.sec').forEach(sec => {
    const hd = sec.querySelector('.fig-hd .fig-n, .sec-hd .sec-n');
    const fig = hd ? hd.textContent.trim() : sec.id;
    sec.querySelectorAll('svg').forEach(svg => {
      const leaders = [...svg.querySelectorAll('[data-place-leader]')];
      if (!leaders.length) return;

      /* every stroked curve in this svg, sampled, with its colour */
      const strokes = [];
      svg.querySelectorAll('path, line, polyline').forEach(el => {
        if (el.hasAttribute('data-place-leader') || el.hasAttribute('data-fl-leader')) return;
        if (el.closest('.tick, .domain') || el.closest('.fig-label')) return;
        const w = parseFloat(el.getAttribute('stroke-width') || '0');
        if (w < 1.4) return;
        if (parseFloat(getComputedStyle(el).opacity) < 0.2) return;
        const c = rgb(getComputedStyle(el).stroke) || rgb(el.getAttribute('stroke'));
        if (!c) return;
        try {
          const L = el.getTotalLength();
          if (!L || !isFinite(L)) return;
          const n = Math.max(8, Math.min(240, Math.round(L / 3)));
          const pts = [];
          for (let i = 0; i <= n; i++) { const p = el.getPointAtLength(L * i / n); pts.push([p.x, p.y]); }
          strokes.push({ c, pts });
        } catch (e) {}
      });
      svg.querySelectorAll('circle').forEach(el => {
        const r = parseFloat(el.getAttribute('r') || '0');
        if (r < 2 || r > 14) return;
        const c = rgb(getComputedStyle(el).fill) || rgb(el.getAttribute('fill'));
        if (!c) return;
        strokes.push({ c, pts: [[+el.getAttribute('cx'), +el.getAttribute('cy')]] });
      });
      if (!strokes.length) return;

      /* filled areas: a label may legitimately end inside one */
      const fills = [];
      svg.querySelectorAll('polygon, rect, path').forEach(el => {
        if (typeof el.isPointInFill !== 'function') return;
        const c = rgb(getComputedStyle(el).fill) || rgb(el.getAttribute('fill'));
        if (!c || (c[0] > 244 && c[1] > 244 && c[2] > 244)) return;
        if (parseFloat(el.getAttribute('opacity') || '1') < 0.05) return;
        fills.push(el);
      });

      leaders.forEach(L => {
        const cs = getComputedStyle(L);
        if (cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return;
        const ax = +L.getAttribute('x1'), ay = +L.getAttribute('y1');
        const bx = +L.getAttribute('x2'), by = +L.getAttribute('y2');
        if (!isFinite(ax) || Math.hypot(bx - ax, by - ay) < 4) return;
        const mine = rgb((L.__data__ || {}).color) || rgb(L.getAttribute('stroke'));
        if (!mine) return;
        const label = (L.__data__ || {}).label || '?';
        /* A label naming an area rather than a line is judged by neither test:
           it belongs in the middle of its region and matches the region's
           colour, not any curve's. */
        let p = null;
        try { p = svg.createSVGPoint(); p.x = ax; p.y = ay; } catch (e) {}
        if (p && fills.some(el => { try { const m = el.getCTM(); return el.isPointInFill(m ? p.matrixTransform(m.inverse()) : p); } catch (e) { return false; } })) return;
        /* A label whose colour is drawn nowhere in its own figure cannot be
           matched to anything, and that is itself worth knowing: on this site a
           label is supposed to be the colour of the curve it names. */
        if (!strokes.some(s => gap(s.c, mine) <= 90)) {
          out.push({ fig, label, orphan: true, want: mine.join(',') });
          return;
        }

        let best = null;
        strokes.forEach(s => s.pts.forEach(q => {
          const d = Math.hypot(q[0] - ax, q[1] - ay);
          if (!best || d < best.d) best = { d, c: s.c };
        }));
        if (!best) return;
        out.push({ fig, label, ok: gap(best.c, mine) <= 90,
                   want: mine.join(','), got: best.c.join(','), d: Math.round(best.d) });
      });
    });
  });
  return out;
};

(async () => {
  const pages = fs.readdirSync(ROOT).filter(f => /-viz\.html$/.test(f))
    .filter(f => !ONLY || f.indexOf(ONLY) === 0)
    .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const b = await chromium.launch({ channel: 'chrome' });
  let checked = 0, wrong = 0;
  const seen = {};
  const orphans = {};

  for (const f of pages) {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    await p.goto(BASE + '/' + f, { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(2000);
    const H = await p.evaluate(() => document.body.scrollHeight);
    const walk = async () => {
      for (let y = 0; y < H; y += 600) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(240); }
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(700);
    };
    await walk();
    let n = 0, bad = 0;
    for (const frac of [null, 0.3, 0.75]) {
      if (frac !== null) {
        await p.evaluate(v => document.querySelectorAll('input[type=range]').forEach(s => {
          const lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
          s.value = String(lo + (hi - lo) * v);
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }), frac);
        await p.waitForTimeout(600);
        await walk();
      }
      (await p.evaluate(PROBE)).forEach(r => {
        n++;
        if (r.orphan) { orphans[f.replace('-viz.html','') + '  ' + r.fig + '  "' + r.label + '"  ' + r.want] = 1; return; }
        if (!r.ok) {
          bad++;
          const k = f.replace('-viz.html', '') + ' ' + r.fig + '  "' + r.label + '"  wants ' + r.want + ' found ' + r.got + ' at ' + r.d + 'px';
          seen[k] = (seen[k] || 0) + 1;
        }
      });
    }
    checked += n; wrong += bad;
    console.log(f.replace('-viz.html', '').padEnd(9) + 'judged ' + String(n).padEnd(6) + 'landed on another curve: ' + bad);
    await p.close(); await c.close();
  }
  await b.close();
  console.log('\nleaders judged: ' + checked + ',  landing on a curve of the wrong colour: ' + wrong);
  Object.keys(seen).slice(0, 30).forEach(k => console.log('  ' + k));
  const ok = Object.keys(orphans);
  console.log('\nlabels whose colour matches no curve in their own figure: ' + ok.length);
  ok.slice(0, 30).forEach(k => console.log('  ' + k));
})();
