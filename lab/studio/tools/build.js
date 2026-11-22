/* lab/studio/tools/build.js: build the EC224 studio (dev) from the live site.
 *
 *   node lab/studio/tools/build.js
 *
 * For each studio week (WEEKS below) it reads the live weekN-viz.html (never writes to it), and writes
 *   lab/studio/weekN.html           the same page and figures, set in Allo, with live equations (live/weekN.js)
 *                                   mounted into its sections and a link to the week's notebook
 *   lab/studio/weekN-notebook.html  the week's Python notebook page (notebooks/weekN.py, run by notebook.js)
 *   lab/studio/notebooks/weekN.ipynb the same notebook for Jupyter or Google Colab
 * plus lab/studio/kit.js (the site's figure kit, measuring labels in Allo instead of Libre Franklin).
 * The landing page lab/studio/index.html is hand-written. Nothing outside lab/studio/ is touched.
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), OUT = path.resolve(__dirname, '..');
const WEEKS = [
  { n: 2, title: 'Consumer Preferences & Choice', nbTitle: 'Utility, budgets and the best bundle', code: 'def U(X, Y):\n    return X**0.5 * Y**0.5' },
  { n: 4, title: 'Demand Elasticity', nbTitle: 'Elasticity and revenue', code: 'P = np.linspace(0, 30, 301)\nTR = P * (120 - 4 * P)' },
  { n: 8, title: 'Welfare & Monopoly', nbTitle: 'Monopoly by the numbers', code: 'Q = (a - c) / (2 * b)\nP = a - b * Q' },
];
const REPO = 'FalconEconSim/FalconEconSim.github.io';
const KATEX = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />\n  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>';
const read = f => fs.readFileSync(f, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const write = (f, s) => { fs.writeFileSync(f, s); console.log('wrote', path.relative(ROOT, f).replace(/\\/g, '/'), (s.length / 1024).toFixed(1) + ' KB'); };

function topbar(w, here) {
  const weeks = WEEKS.map(x => `<a href="week${x.n}.html"${x.n === w.n && here === 'fig' ? ' aria-current="page"' : ''}>Week ${x.n}</a>`).join('');
  return `<div class="studio-banner"><b>Dev</b><span>EC224 Studio: an experiment with Allo type, live equations and Python notebooks. The real site is unchanged.</span><a href="index.html">About the studio</a><a href="../../week${w.n}-viz.html">This week on the real site</a></div>
<div class="topbar">
  <a class="wordmark" href="index.html">EC224 Studio</a>
  <span class="crumb-sep">/</span>
  <a href="week${w.n}.html">Week ${w.n}</a>
  <span class="crumb-sep">/</span>
  <span class="crumb-here">${here === 'fig' ? 'Interactive Figures' : 'Notebook'}</span>
  <span class="topbar-end studio-weeks">${weeks}<a class="studio-nb-link" href="week${w.n}-notebook.html">Notebook</a></span>
</div>`;
}
function nbCard(w) {
  return `
      <aside class="studio-nbcard mathjax_ignore tex2jax_ignore">
        <pre>${w.code}</pre>
        <div><h3>Week ${w.n} notebook: ${w.nbTitle}</h3><p>The same models in Python, running right in your browser. Change the code, drag the numbers, and every plot below re-runs. Nothing to install.</p></div>
        <a class="go" href="week${w.n}-notebook.html">Open the notebook</a>
      </aside>`;
}

function buildWeek(w) {
  let s = read(path.join(ROOT, `week${w.n}-viz.html`));
  // relative URLs point back at the site root
  s = s.replace(/(\s(?:href|src|poster)=")(?!https?:|\/\/|#|data:|mailto:)([^"]+)"/g, (m, a, u) => a + '../../' + u + '"');
  s = s.replace('<html ', '<html data-studio ');
  s = s.replace(/<title>[^<]*<\/title>/, `<title>Week ${w.n} Studio · EC224 (dev)</title>\n  <meta name="robots" content="noindex" />`);
  // head: Allo replaces Libre Franklin; KaTeX for the live equations (week 8 already loads it, deferred)
  s = s.replace(/\s*<link[^>]*fonts\.googleapis\.com\/css2\?family=Libre\+Franklin[^>]*>/, '');
  const katex = /katex\.min\.js/.test(s) ? '' : '\n  ' + KATEX;
  s = s.replace('</head>', `  <link rel="stylesheet" href="studio.css" />${katex}\n</head>`);
  // top bar: the studio's own (the site's nav drawer and course AI are left out of the dev copy)
  s = s.replace(/<div class="topbar">[\s\S]*?\n<\/div>/, topbar(w, 'fig'));
  s = s.replace(/\s*<script src="\.\.\/\.\.\/assets\/(chatbot|ask-widget|ask-figures|nav)\.js"( defer)?><\/script>/g, '');
  // the rail gets the notebook as its last stop
  s = s.replace(/(<nav class="rail"[\s\S]*?)(\n\s*<\/ol>)/, (m, a, b) => a + `\n      <li><a href="week${w.n}-notebook.html"><span>Py</span><span class="rail-title">Python notebook</span></a></li>` + b);
  // the notebook card after the page header and again at the end of main
  s = s.replace(/(<\/header>)/, `$1${nbCard(w)}`);
  s = s.replace(/(\n\s*<\/main>)/, nbCard(w) + '$1');
  // the studio's kit (Allo label widths), then the live equations
  s = s.replace('src="../../assets/predict/kit/kit.js"', 'src="kit.js"');
  s = s.replace(/(\n<\/body>)/, `\n  <script src="tangle.js"></script>\n  <script src="live.js"></script>\n  <script src="live/week${w.n}.js"></script>$1`);
  if (!/studio-nbcard/.test(s)) console.warn('WARN week ' + w.n + ': notebook card not placed (no </header>?)');
  write(path.join(OUT, `week${w.n}.html`), s);
}

function buildNotebook(w) {
  const html = `<!DOCTYPE html>
<html lang="en-US" data-ds="v2" data-studio>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Week ${w.n} Notebook · EC224 Studio (dev)</title>
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg" />
  <link rel="stylesheet" href="../../shared.css" />
  <link rel="stylesheet" href="../../assets/vizpage.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
  <link rel="stylesheet" href="studio.css" />
  ${KATEX}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
</head>
<body>
${topbar(w, 'nb')}
<div class="nb-page">
  <header class="nb-hero">
    <p class="studio-live-k">Week ${w.n} · ${w.title} · Python notebook</p>
    <h1>${w.nbTitle}</h1>
    <p class="lede">Real Python, running in your browser. Edit any cell and press <strong>Run</strong> (or Shift+Enter); the cells below it re-run too. Drag the plum numbers in a knobs cell and the plots follow. Your edits stay in this browser.</p>
  </header>
  <div class="nb-top">
    <span id="nb-status" class="nb-status">Loading the notebook.</span>
    <span class="nb-actions">
      <button type="button" data-nb="runall">Run all</button>
      <button type="button" data-nb="ipynb">Download .ipynb</button>
      <a href="notebooks/week${w.n}.py" download>Download .py</a>
      <a href="https://colab.research.google.com/github/${REPO}/blob/main/lab/studio/notebooks/week${w.n}.ipynb" target="_blank" rel="noopener">Open in Colab</a>
      <button type="button" data-nb="reset">Undo my edits</button>
    </span>
  </div>
  <div id="nb" class="nb-root" data-src="notebooks/week${w.n}.py"></div>
  <p class="tg-notes">Back to <a href="week${w.n}.html">the Week ${w.n} figures</a>. Python runs on <a href="https://pyodide.org">Pyodide</a>; nothing is sent anywhere.</p>
</div>
<script src="tangle.js"></script>
<script src="notebook.js"></script>
</body>
</html>
`;
  write(path.join(OUT, `week${w.n}-notebook.html`), html);
}

// the same parser as notebook.js, to write an .ipynb for Jupyter / Colab
function toIpynb(text) {
  const cells = []; let cur = null;
  text.replace(/\r\n/g, '\n').split('\n').forEach(line => {
    const m = line.match(/^# %%(.*)$/);
    if (m) { const h = m[1]; cur = { md: /\[markdown\]/.test(h), tags: ((h.match(/tags=\[([^\]]*)\]/) || [, ''])[1].match(/"(\w+)"/g) || []).map(t => t.replace(/"/g, '')), lines: [] }; cells.push(cur); return; }
    if (cur) cur.lines.push(line);
  });
  const nb = { nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, cells: [] };
  cells.forEach(c => {
    let s = c.lines.join('\n').replace(/^\n+|\n+$/g, ''); if (!s.trim()) return;
    if (c.md) s = s.split('\n').map(l => l.replace(/^# ?/, '')).join('\n');
    const src = s.split('\n').map((l, i, a) => l + (i < a.length - 1 ? '\n' : ''));
    nb.cells.push(c.md ? { cell_type: 'markdown', metadata: {}, source: src } : { cell_type: 'code', metadata: c.tags.length ? { tags: c.tags } : {}, execution_count: null, outputs: [], source: src });
  });
  return JSON.stringify(nb, null, 1) + '\n';
}

// kit.js measures label widths with a canvas font; in the studio the figures are set in Allo
let kit = read(path.join(ROOT, 'assets/predict/kit/kit.js'));
const nfont = (kit.match(/"Libre Franklin"/g) || []).length;
kit = '/* GENERATED by lab/studio/tools/build.js from assets/predict/kit/kit.js: labels measured in Allo. Do not edit. */\n' + kit.replace(/"Libre Franklin"/g, '"Allo"');
write(path.join(OUT, 'kit.js'), kit);
if (!nfont) console.warn('WARN kit.js: no canvas font to swap');

WEEKS.forEach(w => {
  buildWeek(w); buildNotebook(w);
  const py = path.join(OUT, 'notebooks', `week${w.n}.py`);
  if (fs.existsSync(py)) write(path.join(OUT, 'notebooks', `week${w.n}.ipynb`), toIpynb(read(py)));
  else console.warn('WARN no notebook yet: ' + path.relative(ROOT, py));
  if (!fs.existsSync(path.join(OUT, 'live', `week${w.n}.js`))) console.warn('WARN no live equations yet: live/week' + w.n + '.js');
});
