/* Reads the live site's pages (never writes them) and returns the course content as data.
 * Used by build.js. Every string a student reads on x/ comes through here from its one source. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const exists = (f) => fs.existsSync(path.join(ROOT, f));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', middot: '·', rsaquo: '›', hellip: '…', times: '×', minus: '−' };
function decode(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}
const text = (html) => decode(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/* Find the element that starts at index i (at its '<'), return [start, end) including its closing tag. */
function elementAt(html, i) {
  const m = /^<([a-zA-Z0-9]+)/.exec(html.slice(i));
  if (!m) throw new Error('no element at ' + i);
  const tag = m[1].toLowerCase();
  const re = new RegExp('<(/?)' + tag + '(?=[\\s>/])[^>]*>', 'gi');
  re.lastIndex = i;
  let depth = 0, mm;
  while ((mm = re.exec(html))) {
    const selfClose = /\/>$/.test(mm[0]);
    if (mm[1]) depth--; else if (!selfClose) depth++;
    if (depth === 0) return [i, mm.index + mm[0].length];
  }
  throw new Error('unclosed <' + tag + '> at ' + i);
}
function inner(html, range) {
  const s = html.slice(range[0], range[1]);
  return s.slice(s.indexOf('>') + 1, s.lastIndexOf('</'));
}
/* All top-level elements matching an opening-tag regex, in order. */
function findAll(html, openRe) {
  const out = []; const re = new RegExp(openRe.source, 'g'); let m;
  while ((m = re.exec(html))) { const r = elementAt(html, m.index); out.push({ range: r, html: html.slice(r[0], r[1]), open: m[0] }); re.lastIndex = r[1]; }
  return out;
}

/* ---------- home: week titles, descriptions and cover drawings ---------- */
function weeks() {
  const s = read('index.html');
  const out = {};
  for (const a of findAll(s, /<a class="wk" href="week(\d+)\.html"[^>]*>/)) {
    const n = +/week(\d+)/.exec(a.open)[1];
    const svg = /<svg[\s\S]*?<\/svg>/.exec(a.html)[0];
    out[n] = {
      n,
      title: text(/<h2 class="wk-title">([\s\S]*?)<\/h2>/.exec(a.html)[1]),
      desc: text(/<p class="wk-desc">([\s\S]*?)<\/p>/.exec(a.html)[1]),
      cover: svg,
    };
  }
  return out;
}

/* ---------- the week hub: what exists for a week ---------- */
function hub(n) {
  const s = read('week' + n + '.html');
  const items = [];
  let group = '';
  const re = /<div class="hub-group">([^<]*)<\/div>|<a class="hub-item" href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1] != null) { group = text(m[1]); continue; }
    items.push({ group, href: m[2], title: text(/hub-title">([\s\S]*?)<\/div>/.exec(m[3])[1]), desc: text(/hub-desc">([\s\S]*?)<\/div>/.exec(m[3])[1]) });
  }
  return items;
}

/* ---------- lecture slides (PDFs) and lecture videos ---------- */
function lecture(n) {
  const pdfs = [], groups = [];
  const slidesFile = 'week' + n + '-slides.html';
  const pages = [];
  if (exists(slidesFile)) pages.push(slidesFile);
  if (exists('week' + n + '-videos.html')) pages.push('week' + n + '-videos.html');
  for (const f of pages) {
    const s = read(f);
    const main = s.slice(s.indexOf('<main'), s.lastIndexOf('</main>'));
    // PDFs
    const re = /<a class="hub-item" href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/g; let m;
    while ((m = re.exec(main))) pdfs.push({ href: m[1], title: text(/hub-title">([\s\S]*?)<\/div>/.exec(m[2])[1]), desc: text(/hub-desc">([\s\S]*?)<\/div>/.exec(m[2])[1]) });
    // videos, in document order, grouped by the section dividers that precede them
    let cur = null;
    const vre = /<div class="section-divider"[^>]*>([\s\S]*?)<\/div>|<span class="(?:vid-num|video-badge)">([\s\S]*?)<\/span>\s*<(?:span|div) class="(?:vid-item-title|video-card-title)">([\s\S]*?)<\/(?:span|div)>[\s\S]*?<iframe([\s\S]*?)>/g;
    while ((m = vre.exec(main))) {
      if (m[1] != null) {
        const name = text(m[1]);
        if (/^lecture videos$/i.test(name)) continue;
        cur = { name: name.replace(/\s*·\s*/g, ': '), items: [] }; groups.push(cur); continue;
      }
      if (!cur) { cur = { name: '', items: [] }; groups.push(cur); }
      const attrs = m[4];
      cur.items.push({
        num: text(m[2]).replace(/^Video\s+/i, ''),
        title: text(m[3]),
        src: decode(/src="([^"]*)"/.exec(attrs)[1]),
        ftitle: text((/title="([^"]*)"/.exec(attrs) || [, ''])[1]),
      });
    }
  }
  return { pdfs, groups: groups.filter((g) => g.items.length) };
}

/* ---------- flashcards ---------- */
function cards(n) {
  const s = read('week' + n + '-flashcards.html');
  const i = s.indexOf('const CARDS');
  const st = s.indexOf('[', i);
  let d = 0, j = st;
  for (; j < s.length; j++) { if (s[j] === '[') d++; else if (s[j] === ']') { d--; if (!d) break; } }
  const arr = vm.runInNewContext('(' + s.slice(st, j + 1) + ')');
  return arr.map((c, k) => ({ id: 'w' + n + '-' + (c.id != null ? c.id : k + 1), type: c.type, q: c.q, a: c.a }));
}

/* ---------- figure catalog from the kit specs ---------- */
function figCatalog(n) {
  const f = 'assets/predict/week' + n + '/figs.js';
  if (!exists(f)) return [];
  const s = read(f);
  const out = [];
  const re = /key: '(f\d+)', num: '([\d.]+)', topic: '([^']*)'(?:, short: '([^']*)')?/g; let m;
  while ((m = re.exec(s))) out.push({ key: m[1], num: m[2], topic: decode(m[3]), short: decode(m[4] || m[3]), week: n });
  const order = /window\.W\d+FIGS = \[([^\]]*)\]/.exec(s)[1].split(',').map((x) => x.trim());
  const ef = new Set();
  // explore-first specs: find the key nearest above each exploreFirst line
  const lines = s.split('\n'); let lastKey = null;
  for (const ln of lines) { const k = /key: '(f\d+)'/.exec(ln); if (k) lastKey = k[1]; if (/exploreFirst: true/.test(ln) && lastKey) ef.add(lastKey); }
  return order.map((k) => { const o = out.find((x) => x.key === k); o.exploreFirst = ef.has(k); return o; });
}

/* ---------- the figures page: prose sections, films, figure slots ---------- */
function viz(n) {
  const f = 'week' + n + '-viz.html';
  if (!exists(f)) return null;
  const s = read(f);
  const head = s.slice(0, s.indexOf('</head>'));
  const mj = /<script>\s*(window\.MathJax\s*=[\s\S]*?)<\/script>/.exec(head);
  const kitCss = /<style id="kit-page-css">([\s\S]*?)<\/style>/.exec(head);
  const main = s.slice(s.indexOf('<main'), s.lastIndexOf('</main>'));
  const lede = /<p class="lede">([\s\S]*?)<\/p>/.exec(main);
  const blocks = [];
  const re = /<div class="sec-divider">([\s\S]*?)<\/div>|<section class="sec page" id="([^"]+)">/g; let m;
  while ((m = re.exec(main))) {
    if (m[1] != null) { blocks.push({ type: 'divider', text: text(m[1]) }); continue; }
    const r = elementAt(main, m.index);
    const sec = main.slice(r[0], r[1]);
    re.lastIndex = r[1];
    const proseEl = findAll(sec, /<div class="fig-prose">/)[0];
    let prose = proseEl ? inner(sec, proseEl.range) : '';
    const hd = /<div class="sec-hd">[\s\S]*?<h2>([\s\S]*?)<\/h2>\s*<\/div>/.exec(prose);
    const heading = hd ? hd[1].trim() : '';
    if (hd) prose = prose.replace(hd[0], '');
    const films = findAll(sec, /<figure class="film"[^>]*>/).map((x) => x.html);
    const figs = [];
    const bre = /<div class="kit-bay"(?: id="([^"]+)")?><div id="(f\d+)"/g; let b;
    while ((b = bre.exec(sec))) figs.push({ key: b[2], bayId: b[1] || null });
    blocks.push({ type: 'section', id: m[2], heading, prose: prose.trim(), films, figs });
  }
  return {
    mathjax: mj ? mj[1].trim() : null,
    usesMath: /mathjax/i.test(head),
    kitCss: kitCss ? kitCss[1].trim() : '',
    lede: lede ? lede[1].trim() : '',
    blocks,
  };
}

/* ---------- practice problem generators (weeks 2 to 4) ---------- */
function practice(n) {
  const f = 'week' + n + '-practice.html';
  if (!exists(f)) return null;
  const s = read(f);
  const head = s.slice(0, s.indexOf('</head>'));
  const styles = [...head.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]);
  const extHead = [...head.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https:\/\/cdnjs[^"]+)"[^>]*>/g)].map((x) => (/^<script/.test(x[0]) ? x[0] + '</script>' : x[0]));
  const body = s.slice(s.indexOf('<body'), s.lastIndexOf('</body>'));
  const main = body.slice(body.indexOf('<main'), body.lastIndexOf('</main>'));
  const afterHd = main.slice(main.indexOf('</header>') + 9);
  const content = afterHd.slice(0, afterHd.search(/<!--\s*Footer|<footer/));
  const scripts = [...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  const title = text((/<h1>([\s\S]*?)<\/h1>/.exec(main) || [, 'Practice problems'])[1]);
  return { styles, extHead, content: content.trim(), scripts, title };
}

module.exports = { ROOT, read, exists, decode, text, elementAt, findAll, weeks, hub, lecture, cards, figCatalog, viz, practice };
