#!/usr/bin/env node
/* Builds the experimental EC224 site in x/ from the live site's own pages.
 *
 *   node x/tools/build.js
 *
 * Reads (never writes) index.html, weekN.html, weekN-viz.html, weekN-slides.html,
 * weekN-videos.html, weekN-flashcards.html, weekN-practice.html and assets/predict/weekN/figs.js
 * (see extract.js), plus the authored structure in course.js. Writes only inside x/:
 *   x/index.html, x/week1.html .. x/week12.html, x/week2-practice.html .. x/week4-practice.html,
 *   x/review.html, x/ask.html, x/assets/course-data.js
 * The generated HTML is committed output: edit the sources or these tools, then rebuild. */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./extract');
const C = require('./course');

const X = path.join(E.ROOT, 'x');
const MATHJAX = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js';
const FONTS = 'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400..800;1,400..700&display=swap';
const BRIGHTSPACE = 'https://brightspace.bentley.edu';

const EN = String.fromCharCode(0x2013), EM = String.fromCharCode(0x2014);   // spelled out so no dash sits in this file
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NUMW = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen'];
const words = (n) => NUMW[n] || String(n);
function list(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]; }
function write(rel, s) {
  const f = path.join(X, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, s.replace(/\r\n/g, '\n'));
  OUT.push(rel);
}
const OUT = [];

/* ---------------- gather ---------------- */
const WEEKS = E.weeks();
const unitOf = (n) => C.UNITS.find((u) => u.weeks.includes(n));
const FIGS = {};
const DATA = { units: C.UNITS, weeks: [], figs: {}, cardIds: {}, cards: {}, threads: C.THREADS };
const W = {};
for (let n = 1; n <= 12; n++) {
  const w = Object.assign({}, WEEKS[n]);
  w.unit = unitOf(n).n;
  w.hub = E.hub(n);
  w.lecture = E.lecture(n);
  w.viz = E.viz(n);
  w.cards = E.cards(n);
  w.figs = E.figCatalog(n);
  w.practice = E.practice(n);
  w.textbook = w.hub.find((h) => /^Textbook$/i.test(h.title));
  w.notes = w.hub.find((h) => /Lecture Notes/i.test(h.title));
  w.homework = w.hub.find((h) => /Graded Homework/i.test(h.title));
  // ids for the progress store
  w.videoIds = [];
  w.lecture.groups.forEach((g) => g.items.forEach((v) => { v.id = 'w' + n + ':v:' + v.num.replace(/\W+/g, ''); w.videoIds.push(v.id); }));
  w.reads = [];
  if (w.notes) w.reads.push({ id: 'w' + n + ':r:notes', href: w.notes.href, title: 'Lecture notes', desc: w.notes.desc, kind: 'PDF' });
  if (w.textbook) w.reads.push({ id: 'w' + n + ':r:book', href: w.textbook.href, title: 'Textbook, week ' + n + ' chapter', desc: w.textbook.desc, kind: /\.pdf$/.test(w.textbook.href) ? 'PDF' : 'Web page' });
  W[n] = w;
  w.figs.forEach((f) => { FIGS[f.key] = f; DATA.figs[f.key] = { num: f.num, topic: f.topic, short: f.short, week: n, ef: f.exploreFirst }; });
  DATA.cardIds[n] = w.cards.map((c) => c.id);
  w.cards.forEach((c) => { DATA.cards[c.id] = { w: n, type: c.type, q: c.q, a: c.a }; });
  DATA.weeks.push({ n, unit: w.unit, title: w.title, desc: w.desc, figs: w.figs.map((f) => f.key), videos: w.videoIds, reads: w.reads.map((r) => r.id), practice: !!w.practice });
}
// sanity: threads only name real figures
for (const t of C.THREADS) for (const k of t.figs) if (!FIGS[k]) throw new Error('thread ' + t.id + ' names unknown figure ' + k);

/* ---------------- text clean-up for extracted HTML ---------------- */
function rel(html) {
  return html
    .replace(/(src|href|poster)="(media\/|assets\/)/g, '$1="../$2')
    .replace(/href="week(\d+)-viz\.html#([^"]+)"/g, 'href="week$1.html#$2"')
    .replace(/href="week(\d+)-viz\.html"/g, 'href="week$1.html#figures"')
    .replace(/href="week(\d+)-(flashcards)\.html"/g, 'href="week$1.html#check"')
    .replace(/href="(index|ask)\.html"/g, 'href="$1.html"');
}
function noDashes(html) {
  // the course's standing rule: no em or en dashes; ranges read "1 to 3", minus signs become hyphens
  return html
    .replace(new RegExp('(\\d)\\s*[' + EN + EM + ']\\s*(\\d)', 'g'), '$1 to $2')
    .replace(new RegExp('\\s*' + EM + '\\s*', 'g'), ', ')
    .replace(new RegExp(EN, 'g'), '-');
}
function tidyStyles(html) {
  // the prose's inline sizes were tuned for 14px text; this site sets its own type scale
  return html.replace(/style="([^"]*)"/g, (m, s) => {
    const kept = s.split(';').map((d) => d.trim()).filter(Boolean)
      .filter((d) => !/^(font-size|font-family|line-height|letter-spacing|text-transform)\s*:/i.test(d));
    return kept.length ? 'style="' + kept.join(';') + '"' : '';
  }).replace(/<(\w+) >/g, '<$1>').replace(/ +>/g, '>');
}
function dollarMath(html) {
  // week 2 wrote its math as $...$; this site typesets \( \) only (cards and prose share one config)
  const keep = [];
  let s = html.replace(/\$(?=\d)/g, () => { keep.push('$'); return '\u0000' + (keep.length - 1) + '\u0000'; });
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, '\\[$1\\]').replace(/\$([^$\n]{1,240}?)\$/g, '\\($1\\)');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}
function film(html) {
  return noDashes(rel(html))
    .replace(/<span class="film-k">Animation\s*·\s*(\d+)s<\/span>/, (m, s) => '<span class="film-k">Animation, ' + s + ' seconds</span>')
    .replace(/\s·\s/g, ', ');
}

/* ---------------- shared chrome ---------------- */
const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 3v24h24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="square"/><path d="M9 7c2 9 7 13 18 14" fill="none" stroke="var(--plum)" stroke-width="3.4" stroke-linecap="round"/></svg>';
const ASK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 3.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V5A1.5 1.5 0 0 1 4 3.5z" stroke-width="2.2"/><path d="M6.5 7C7.2 11 9.8 12.8 17.5 13" stroke-width="2.2"/></svg>';
const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function head(o) {
  return '<!DOCTYPE html>\n<html lang="en"' + (o.unit ? ' data-unit="' + o.unit + '"' : '') + '>\n<head>\n' +
    '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex, nofollow">\n' +
    '<title>' + esc(o.title) + '</title>\n<meta name="description" content="' + esc(o.desc) + '">\n' +
    '<link rel="icon" type="image/svg+xml" href="../favicon.svg">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="' + FONTS + '">\n' +
    (o.kit ? '<link rel="stylesheet" href="../assets/predict/kit/kit.css">\n' : '') +
    '<link rel="stylesheet" href="assets/x.css">\n' +
    (o.extraHead || '') +
    (o.math ? '<script>window.MathJax = { tex: { inlineMath: [[\'\\\\(\', \'\\\\)\']], displayMath: [[\'\\\\[\', \'\\\\]\']] }, options: { skipHtmlTags: [\'script\', \'noscript\', \'style\', \'textarea\', \'pre\', \'code\'] }, svg: { fontCache: \'global\' } };</script>\n' +
      '<script src="' + MATHJAX + '"' + (o.mathSync ? '' : ' async') + '></script>\n' : '') +
    '</head>\n';
}

function weekMenu(cur) {
  let s = '<div class="weekmenu">';
  for (const u of C.UNITS) {
    s += '<h3>Unit ' + u.n + ': ' + esc(u.name) + '</h3>';
    for (const n of u.weeks) s += '<a href="week' + n + '.html"' + (n === cur ? ' aria-current="page"' : '') + '><b>' + n + '</b><span>' + esc(W[n].title) + '</span></a>';
  }
  return s + '</div>';
}
function top(o) {
  o = o || {};
  return '<a class="skiplink" href="#main">Skip to content</a>\n<header class="top"><div class="wrap">' +
    '<a class="mark" href="index.html" aria-label="EC224 home">' + MARK + 'EC224<span>&nbsp;Intermediate Microeconomics</span></a>' +
    '<nav aria-label="Site">' +
      '<details class="weeksel"><summary class="top-link"><span>' + (o.week ? 'Week ' + o.week : 'Weeks') + '</span>' + CHEV + '</summary>' + weekMenu(o.week) + '</details>' +
      '<a class="top-link" href="review.html"' + (o.page === 'review' ? ' aria-current="page"' : '') + '>Review</a>' +
      (o.page === 'ask' ? '<a class="top-link" href="ask.html" aria-current="page">' + ASK_ICON + 'Ask</a>'
        : '<button type="button" class="top-link" data-ask>' + ASK_ICON + 'Ask</button>') +
    '</nav></div></header>\n';
}
function foot() {
  return '<footer class="foot"><div>' +
    '<a href="https://www.bentley.edu" target="_blank" rel="noopener">Bentley University</a>' +
    '<span>EC224 Intermediate Microeconomics, Prof. Naveen Sunder</span>' +
    '<a href="../index.html">The current course site</a>' +
    '</div><img src="../assets/bentleylogo.png" alt="Bentley University" width="104" height="26"></div></footer>\n';
}
function aiScripts(withFigs) {
  return '<script src="../assets/chatbot.js"></script>\n<script src="assets/ask-drawer.js"></script>\n' +
    (withFigs ? '<script src="../assets/ask-figures.js"></script>\n' : '') +
    '<script src="../assets/feedback.js"></script>\n';
}

/* ---------------- the week's signature drawing (from the home page covers) ---------------- */
function poster(svg) {
  return svg
    .replace(/<svg[^>]*>/, '<svg viewBox="0 0 320 200" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">')
    .replace(/<(path|polyline|line|rect|circle)\b([^>]*?)\/?>/g, (m, tag, attrs) => {
      let cls;
      if (tag === 'circle') cls = 'dt';
      else if (/fill="var\(--d-/.test(attrs)) cls = 'ar';
      else if (/stroke="currentColor"/.test(attrs)) cls = 'ax';
      else if (/stroke="var\(--d-primary\)"/.test(attrs)) cls = 'c1';
      else cls = 'c2';
      attrs = attrs.replace(/\s(stroke|fill)="var\([^)]*\)"/g, '').replace(/\sstroke="(#fff|currentColor)"/g, '');
      return '<' + tag + ' class="' + cls + '"' + attrs + '/>';
    });
}

/* ---------------- a week page ---------------- */
function videoRows(w) {
  let s = '';
  for (const g of w.lecture.groups) {
    if (g.name) s += '<h3 class="rows-group">' + esc(noDashes(g.name)) + '</h3>';
    s += '<ol class="rows">';
    for (const v of g.items) {
      s += '<li><div class="row"><span class="rn">' + esc(v.num) + '</span><span class="rt">' + esc(v.title) + '</span>' +
        '<span class="ra"><button type="button" class="btn small" data-play="' + esc(v.src) + '" data-title="' + esc(v.ftitle || v.title) + '" aria-expanded="false" aria-label="Play ' + esc(v.title) + '">Play</button>' +
        '<button type="button" class="tick" data-done="' + v.id + '" data-on="Watched" data-off="Mark watched" aria-pressed="false" aria-label="Watched: ' + esc(v.title) + '"><span class="tl">Mark watched</span></button></span></div>' +
        '<div class="vid-slot"></div></li>';
    }
    s += '</ol>';
  }
  return s;
}
function pdfRows(w) {
  if (!w.lecture.pdfs.length) return '';
  let s = '<h3 class="rows-group">The slides</h3><ol class="rows">';
  for (const p of w.lecture.pdfs) {
    s += '<li><a class="row" href="' + esc(rel('href="' + p.href + '"').slice(6, -1)) + '" target="_blank" rel="noopener"><span class="rn">PDF</span>' +
      '<span class="rt">' + esc(noDashes(p.title)) + '<span class="rd">' + esc(noDashes(p.desc)) + '</span></span><span class="ra"><span class="kind">Opens in a new tab</span></span></a></li>';
  }
  return s + '</ol>';
}
function readRows(w) {
  let s = '<ol class="rows">';
  for (const r of w.reads) {
    const href = /^https?:/.test(r.href) ? r.href : '../' + r.href;
    s += '<li><div class="row"><span class="rn">' + (r.kind === 'PDF' ? 'PDF' : 'Web') + '</span>' +
      '<span class="rt"><a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a><span class="rd">' + esc(noDashes(r.desc)) + '</span></span>' +
      '<span class="ra"><button type="button" class="tick" data-done="' + r.id + '" data-on="Read" data-off="Mark read" aria-pressed="false" aria-label="Read: ' + esc(r.title) + '"><span class="tl">Mark read</span></button></span></div></li>';
  }
  return s + '</ol>';
}
function figLabel(keys) {
  if (!keys.length) return '';
  const nums = keys.map((k) => FIGS[k].num);
  return (nums.length === 1 ? 'Figure ' : 'Figures ') + list(nums);
}
function figuresStep(w, num) {
  const v = w.viz;
  let s = '<section class="step" id="figures" aria-labelledby="figures-h"><div class="wrap">' +
    stepHd(num, 'figures-h', 'Work the figures',
      words(w.figs.length) + ' figures, each with a question to answer on the graph. The teaching notes sit above each one.') +
    '<ol class="howto">' +
      '<li><b>Predict</b>Answer on the graph by tapping, dragging or drawing. Your guess shows in <span class="you">plum</span>.</li>' +
      '<li><b>See</b>Reveal the answer and watch it draw in, with a score out of 100 and the reason.</li>' +
      '<li><b>Explore</b>Change the numbers, then try a new one. Every round draws new numbers, checked by script.</li>' +
    '</ol>' +
    '<ol class="figindex" aria-label="Figures this week">';
  for (const f of w.figs) {
    const sec = v.blocks.find((b) => b.type === 'section' && b.figs.some((x) => x.key === f.key));
    s += '<li><a href="#' + f.key + '"><span class="fn">' + esc(f.num) + '</span><span class="ft">' + esc(f.short.replace(/&/g, 'and')) + '</span><span class="fs" data-fig="' + f.key + '"></span></a></li>';
    void sec;
  }
  s += '</ol>';
  for (const b of v.blocks) {
    if (b.type === 'divider') { s += '<div class="group-hd"><h3>' + esc(noDashes(b.text)) + '</h3></div>'; continue; }
    let prose = noDashes(tidyStyles(rel(b.prose)));
    if (w.n === 2) prose = dollarMath(prose);
    const title = E.text(b.heading);
    s += '<section class="fsec" id="' + b.id + '" data-title="' + esc(title) + '" aria-labelledby="' + b.id + '-h">' +
      '<div class="fsec-hd">' + (b.figs.length ? '' : '') +
      '<h3 id="' + b.id + '-h">' + noDashes(b.heading) + '</h3></div>' +
      '<div class="prose">' + prose + '</div>' +
      b.films.map(film).join('') +
      b.figs.map((x) => '<div class="kit-bay"' + (x.bayId ? ' id="' + x.bayId + '"' : '') + '><div id="' + x.key + '" class="mathjax_ignore tex2jax_ignore"></div></div>').join('') +
      '</section>';
  }
  return s + '</div></section>';
}
function stepHd(num, id, h, p) {
  return '<div class="step-hd"><span class="num" aria-hidden="true">' + num + '</span><div><h2 id="' + id + '">' + h + '</h2>' + (p ? '<p>' + p + '</p>' : '') + '</div></div>';
}
function checkStep(w, num) {
  const n = w.n;
  let s = '<section class="step" id="check" aria-labelledby="check-h"><div class="wrap">' +
    stepHd(num, 'check-h', 'Check yourself',
      words(w.cards.length) + ' flashcards on this week. They come back on a schedule: the ones you miss soon, the ones you know days later.') +
    '<div class="deck" id="deck"><div class="deck-top" aria-live="polite"></div><div class="deck-bar" aria-hidden="true"></div><div class="deck-stage"></div>' +
    '<details class="deck-list"><summary>See all ' + w.cards.length + ' cards with answers</summary><ol>' +
    w.cards.map((c) => '<li><span class="dq">' + esc(c.q) + '</span><span class="da">' + esc(c.a) + '</span></li>').join('') +
    '</ol></details></div>';
  s += '<div class="more">';
  if (w.practice) s += '<a href="week' + n + '-practice.html"><b>Practice problems</b><span>' + esc(noDashes(w.hub.find((h) => /Practice Problems/.test(h.title)).desc)) + '</span></a>';
  s += '<a href="review.html?weeks=' + (n === 1 ? '1' : '1-' + n) + '"><b>Mixed review, weeks 1' + (n === 1 ? '' : ' to ' + n) + '</b><span>Figures and cards from every week so far, the ones you find hardest first.</span></a>';
  if (w.homework) s += '<a href="' + BRIGHTSPACE + '" target="_blank" rel="noopener"><b>Graded homework</b><span>' + esc(noDashes(w.homework.desc)) + '</span></a>';
  s += '</div></div></section>';
  return s;
}
function buildsOn(n) {
  const on = C.BUILDS_ON[n] || [];
  const leads = Object.keys(C.BUILDS_ON).map(Number).filter((k) => (C.BUILDS_ON[k] || []).some((x) => x[0] === n));
  let s = '';
  if (on.length) s += 'Builds on ' + list(on.map(([k, why]) => '<a href="week' + k + '.html">Week ' + k + '</a> <span>(' + esc(why) + ')</span>')) + '. ';
  else s += 'This is where the course starts. ';
  if (leads.length) s += 'Comes back in ' + (leads.length === 1 ? 'Week ' : 'Weeks ') + list(leads.map((k) => '<a href="week' + k + '.html">' + k + '</a>')) + '.';
  return s;
}
function weekPage(n) {
  const w = W[n];
  const steps = [];
  const totalVids = w.videoIds.length;
  if (totalVids) steps.push({ k: 'watch', lb: 'Watch' });
  if (w.reads.length) steps.push({ k: 'read', lb: 'Read' });
  if (w.figs.length) steps.push({ k: 'figures', lb: 'Figures' });
  steps.push({ k: 'check', lb: 'Check yourself' });
  const numOf = (k) => steps.findIndex((x) => x.k === k) + 1;
  const TITLES = { watch: 'Watch the lecture', read: 'Read the chapter', figures: 'Work the figures', check: 'Check yourself' };
  const nextOf = (k) => {
    const i = steps.findIndex((x) => x.k === k), nx = steps[i + 1];
    return nx ? '<p class="step-next"><a href="#' + nx.k + '">Next, step ' + (i + 2) + ': ' + TITLES[nx.k] + '</a></p>' : '';
  };
  const kitCss = w.viz && w.viz.kitCss ? '<style>' + w.viz.kitCss + '</style>\n' : '';
  let s = head({ title: 'Week ' + n + ': ' + w.title + ' | EC224', desc: w.desc, unit: w.unit, kit: !!w.figs.length, math: true, extraHead: kitCss });
  s += '<body>\n' + top({ week: n }) +
    '<main id="main" data-week="' + n + '">\n' +
    '<header class="band"><div class="wrap"><div>' +
      '<span class="band-unit">Unit ' + w.unit + ', ' + esc(unitOf(n).name.toLowerCase()) + '</span>' +
      '<span class="band-n" aria-hidden="true">' + String(n).padStart(2, '0') + '</span>' +
      '<h1><span class="sr-only">Week ' + n + ': </span>' + esc(w.title) + '</h1>' +
      '<p class="desc">' + esc(w.desc) + '</p>' +
      '<p class="builds">' + buildsOn(n) + '</p>' +
    '</div><div class="art poster">' + poster(w.cover) + '</div></div></header>\n' +
    '<nav class="pathbar" aria-label="This week, step by step"><div class="wrap" style="display:flex"><ol>' +
      steps.map((x, i) => '<li><a href="#' + x.k + '"><span class="n">' + (i + 1) + '</span><span class="lb">' + x.lb + '</span><span class="st"></span></a></li>').join('') +
    '</ol><span class="now" aria-hidden="true"></span></div></nav>\n';

  if (totalVids) {
    s += '<section class="step" id="watch" aria-labelledby="watch-h"><div class="wrap">' +
      stepHd(numOf('watch'), 'watch-h', 'Watch the lecture',
        words(totalVids) + ' lecture videos by Prof. Sunder. Watch them before you read: that is the order he recommends.') +
      videoRows(w) + pdfRows(w) + nextOf('watch') + '</div></section>\n';
  }
  if (w.reads.length) {
    const book = w.textbook && /\.pdf$/.test(w.textbook.href);
    s += '<section class="step" id="read" aria-labelledby="read-h"><div class="wrap">' +
      stepHd(numOf('read'), 'read-h', 'Read the chapter',
        (w.notes ? 'The full lecture notes and the textbook chapter.' : 'The textbook chapter for this week' + (book ? ', as a PDF.' : ', on the course textbook site.')) +
        (!totalVids && w.lecture.pdfs.length === 0 && n > 1 ? ' Lecture recordings for this week are not on this site.' : '')) +
      readRows(w) + nextOf('read') + '</div></section>\n';
  }
  if (w.figs.length) s += figuresStep(w, numOf('figures')).replace(/<\/div><\/section>$/, nextOf('figures') + '</div></section>') + '\n';
  s += checkStep(w, numOf('check')) + '\n';

  // neighbours
  const prev = W[n - 1], next = W[n + 1];
  s += '<div class="wrap"><nav class="next-week" aria-label="Other weeks">' +
    (prev ? '<a class="prev" href="week' + (n - 1) + '.html" style="--wu:var(--u' + prev.unit + ')"><span class="dir">Previous, week ' + (n - 1) + '</span><span class="nn">' + esc(prev.title) + '</span></a>' : '<a class="prev" href="index.html"><span class="dir">Back to the start</span><span class="nn">The course map</span></a>') +
    (next ? '<a class="nxt" href="week' + (n + 1) + '.html" style="--wu:var(--u' + next.unit + ')"><span class="dir">Next, week ' + (n + 1) + '</span><span class="nn">' + esc(next.title) + '</span></a>' : '<a class="nxt" href="review.html?weeks=1-12"><span class="dir">You reached the end</span><span class="nn">Review all twelve weeks</span></a>') +
    '</nav></div>\n</main>\n' + foot();

  s += '<script src="assets/course-data.js"></script>\n<script src="assets/x.js"></script>\n<script src="assets/deck.js"></script>\n' +
    '<script>XDeck.mount(document.getElementById("deck"), X.D.cardIds[' + n + '], { meta: "Week ' + n + '" });</script>\n';
  if (w.figs.length) {
    s += '<script src="../assets/autoplay-video.js"></script>\n<script src="../assets/film.js"></script>\n' +
      '<script src="../assets/predict/kit/kit.js"></script>\n<script src="../assets/predict/week' + n + '/models.js"></script>\n<script src="../assets/predict/week' + n + '/figs.js"></script>\n' +
      '<script>Kit.mount(window.W' + n + 'FIGS, { films: false, store: "ec224-w' + n + '-predict", board: "#no-board" });</script>\n';
  }
  s += aiScripts(!!w.figs.length) + '</body>\n</html>\n';
  write('week' + n + '.html', s);
}

/* ---------------- practice pages (weeks 2 to 4): the live generators in this site's frame ---------------- */
const PRACTICE_SHIM = ':root { --paper-raised: #ffffff; --paper-sunk: #e4e8e4; --brand-wash: var(--plum-wash); --brand: var(--u);' +
  ' --d-gain: #256647; --d-loss: #93301f; --d-transfer: #7d5a00; --t-body-sm: 18px; --t-body: 19px; --t-lead: 22px; --t-h2: 34px; --t-h3: 26px;' +
  ' --measure-wide: 48rem; --font-body: inherit; --u1-ink: var(--u); --rule2: var(--line); --radius: 12px;' +
  ' --dur-state: .2s; --ease-out: ease-out; --s-10: 128px; --accent: var(--u); --edge: var(--ink); --ink-mute: var(--soft); }\n' +
  '.practice-host { font-size: 19px; } .practice-host button { font-family: inherit; }\n';
function practicePage(n) {
  const w = W[n], p = w.practice;
  let s = head({
    title: 'Week ' + n + ' practice problems | EC224', desc: 'Randomly generated practice problems for week ' + n + ', with worked solutions.',
    unit: w.unit, math: true, mathSync: true,
    extraHead: p.extHead.join('\n') + '\n<style>' + PRACTICE_SHIM + p.styles.join('\n') + '</style>\n',
  });
  s += '<body>\n' + top({ week: n }) + '<main id="main">\n' +
    '<header class="band"><div class="wrap"><div><span class="band-unit"><a href="week' + n + '.html#check">Week ' + n + ': ' + esc(w.title) + '</a></span>' +
    '<h1>Practice problems</h1><p class="desc">' + esc(noDashes(w.hub.find((h) => /Practice Problems/.test(h.title)).desc)) + '</p></div>' +
    '<div class="art poster">' + poster(w.cover) + '</div></div></header>\n' +
    '<div class="wrap"><div class="practice-host">' + noDashes(rel(p.content)) + '</div>' +
    '<nav class="more" aria-label="Back to the week"><a href="week' + n + '.html#check"><b>Back to week ' + n + '</b><span>Flashcards, the figures and the rest of the week.</span></a>' +
    '<a href="review.html?weeks=1-' + n + '"><b>Mixed review</b><span>Figures and cards from weeks 1 to ' + n + '.</span></a></nav></div>\n' +
    '</main>\n' + foot() +
    '<script src="assets/course-data.js"></script>\n<script src="assets/x.js"></script>\n' +
    p.scripts.map((x) => '<script>' + x.replace(/\.focus\(\)/g, '.focus({ preventScroll: true })') + '</script>').join('\n') + '\n' + aiScripts(false) + '</body>\n</html>\n';
  write('week' + n + '-practice.html', s);
}

/* ---------------- home ---------------- */
function homePage() {
  const nFigs = Object.keys(FIGS).length, nCards = Object.keys(DATA.cards).length;
  let s = head({ title: 'EC224 Intermediate Microeconomics (experimental)', desc: 'EC224 at Bentley University: twelve weeks of microeconomics as a path you can follow, with figures that ask you to predict first.' });
  s += '<body>\n' + top({}) + '<main id="main">\n<div class="wrap">' +
    '<section class="hero">' +
      '<p class="who">EC224 at Bentley University, with Prof. Naveen Sunder</p>' +
      '<h1><span>Intermediate</span> <span>Micro&shy;economics</span></h1><div class="hero-grid">' +
      '<p class="lead">Twelve weeks, from one consumer\'s choice to whole markets that fail. Each week is one path: watch, read, work the figures, check yourself.</p>' +
    '<div class="resume" id="resume"><p class="k">Start here</p><h2>Week 1: ' + esc(W[1].title) + '</h2><p>' + esc(W[1].desc) + '</p><div class="acts"><a class="btn" href="week1.html">Open week 1</a></div></div></div></section>' +
    '<section class="map" aria-labelledby="map-h"><h2 id="map-h" class="sr-only">The twelve weeks</h2>';
  for (const u of C.UNITS) {
    s += '<div class="map-unit" style="--u:var(--u' + u.n + ')"><h2>' + esc(u.name) + '<small>Unit ' + u.n + ', weeks ' + u.weeks[0] + ' to ' + u.weeks[u.weeks.length - 1] + '</small></h2><div class="tiles">';
    for (const n of u.weeks) {
      const w = W[n];
      s += '<a class="tile" href="week' + n + '.html" data-w="' + n + '"><span class="poster" aria-hidden="true">' + poster(w.cover) + '<span class="tn">' + String(n).padStart(2, '0') + '</span></span>' +
        '<span class="tt"><span class="sr-only">Week ' + n + ': </span>' + esc(w.title) + '</span><span class="td">' + esc(w.desc) + '</span>' +
        '<span class="tp" data-prog="' + n + '"><span class="bar"><i></i></span><span class="tl">' + (w.figs.length ? w.figs.length + ' figures, ' : '') + w.cards.length + ' cards</span></span></a>';
    }
    s += '</div></div>';
  }
  s += '</section>' +
    '<section class="prep" aria-labelledby="prep-h"><div><h2 id="prep-h">Exam coming up?</h2>' +
      '<p>Pick the weeks it covers. Review mixes questions from all ' + nFigs + ' figures with the ' + nCards + ' flashcards, and sends the ones you find hardest first. Every figure question draws new numbers each time.</p></div>' +
      '<div class="acts"><a class="btn" href="review.html">Start a review</a>' +
      C.UNITS.map((u) => '<a class="btn unit" style="--cu:var(--u' + u.n + ')" href="review.html?weeks=' + u.weeks[0] + '-' + u.weeks[u.weeks.length - 1] + '">' + esc(u.name) + ', weeks ' + u.weeks[0] + ' to ' + u.weeks[u.weeks.length - 1] + '</a>').join('') +
      '<span class="stat" id="prep-stat"></span></div></section>' +
    '<section class="threads" aria-labelledby="threads-h"><div class="sect-hd"><h2 id="threads-h">Ideas that come back</h2>' +
      '<p>The same few ideas run through the whole course. Each line below follows one of them across the twelve weeks; every stop is a figure you can open.</p></div>' +
      '<div class="tl-head tl-row" aria-hidden="true"><span>Week</span><ol class="tl-weeks">' +
      Array.from({ length: 12 }, (_, i) => '<li style="--cu:var(--u' + W[i + 1].unit + ')">' + (i + 1) + '</li>').join('') + '</ol></div><ul class="thread-list">';
  for (const t of C.THREADS) {
    const wk = t.figs.map((k) => FIGS[k].week);
    const lo = Math.min(...wk), hi = Math.max(...wk);
    const row = {};
    const stops = t.figs.map((k) => {
      const f = FIGS[k]; row[f.week] = (row[f.week] || 0) + 1;
      return '<a class="stop c' + unitOf(f.week).n + '" style="grid-column:' + f.week + ';--r:' + row[f.week] + '" href="week' + f.week + '.html#' + k + '" aria-label="Figure ' + f.num + ', ' + esc(f.topic) + '" title="' + esc(f.topic) + '">' + f.num + '</a>';
    });
    s += '<li class="thread tl-row"><div><h3>' + esc(t.name) + '</h3><p>' + esc(t.line) + '</p>' +
      '<a class="btn line small go" href="review.html?thread=' + t.id + '">Review these ' + t.figs.length + '</a></div>' +
      '<div class="track">' + (hi > lo ? '<span class="ln" style="grid-column:' + lo + ' / ' + (hi + 1) + ';--n:' + (hi - lo + 1) + '"></span>' : '') + stops.join('') + '</div>' +
      '<div class="chips">' + t.figs.map((k) => '<a class="chip c' + unitOf(FIGS[k].week).n + '" href="week' + FIGS[k].week + '.html#' + k + '">' + FIGS[k].num + ' ' + esc(FIGS[k].short.replace(/&amp;|&/g, 'and')) + '</a>').join('') + '</div></li>';
  }
  s += '</ul></section>' +
    '<section class="askband" aria-labelledby="ask-h">' + ASK_ICON.replace('<svg ', '<svg role="img" aria-label="" ') +
      '<div><h2 id="ask-h">Stuck on something?</h2><p>Ask the course AI in your own words. It answers from these pages and the textbook, and shows you the page its answer came from.</p></div>' +
      '<button type="button" class="btn" data-ask>Ask a question</button></section>' +
    '</div>\n</main>\n' + foot() +
    '<script src="assets/course-data.js"></script>\n<script src="assets/x.js"></script>\n<script src="assets/home.js"></script>\n' + aiScripts(false) + '</body>\n</html>\n';
  write('index.html', s);
}

/* ---------------- review ---------------- */
function reviewPage() {
  const kitCss = [];
  for (let n = 2; n <= 12; n++) if (W[n].viz && W[n].viz.kitCss && !/\.board/.test(W[n].viz.kitCss)) kitCss.push(W[n].viz.kitCss);
  let s = head({ title: 'Review | EC224', desc: 'Exam review for EC224: figure questions and flashcards from the weeks you pick, hardest first.', kit: true, math: true, extraHead: '<style>' + kitCss.join('\n') + '</style>\n' });
  s += '<body>\n' + top({ page: 'review' }) + '<main id="main">\n' +
    '<div class="wrap" id="setup"><section class="rv-hero"><h1>Review</h1>' +
      '<p>Questions from the weeks you pick, mixed together the way an exam mixes them. Figures you have not tried, or scored low on, come up first; cards come back when they are due.</p></section>' +
      '<form class="setup-grid" id="rv-form"><div>' +
        '<fieldset class="field"><legend>Which weeks?</legend><p class="help">Pick the weeks your exam covers.</p><div class="wkpick">' +
          Array.from({ length: 12 }, (_, i) => i + 1).map((n) => '<label style="--cu:var(--u' + W[n].unit + ')"><input type="checkbox" name="w" value="' + n + '"><span>' + n + '<span class="sr-only">, week ' + n + ': ' + esc(W[n].title) + '</span></span></label>').join('') +
        '</div><div class="presets">' + C.UNITS.map((u) => '<button type="button" class="btn line small" data-preset="' + u.weeks.join(',') + '">' + esc(u.name) + '</button>').join('') +
          '<button type="button" class="btn line small" data-preset="1,2,3,4,5,6,7,8,9,10,11,12">All 12</button><button type="button" class="btn line small" data-preset="">Clear</button></div></fieldset>' +
        '<fieldset class="field"><legend>What to practise</legend><div class="seg">' +
          '<label><input type="radio" name="mode" value="mix" checked><span>Figures and cards</span></label>' +
          '<label><input type="radio" name="mode" value="figs"><span>Figures only</span></label>' +
          '<label><input type="radio" name="mode" value="cards"><span>Cards only</span></label></div></fieldset>' +
        '<fieldset class="field"><legend>How long?</legend><div class="seg">' +
          '<label><input type="radio" name="len" value="8"><span>8 questions</span></label>' +
          '<label><input type="radio" name="len" value="15" checked><span>15 questions</span></label>' +
          '<label><input type="radio" name="len" value="30"><span>30 questions</span></label></div></fieldset>' +
        '<div id="thread-note"></div>' +
        '<button type="submit" class="btn plum" id="rv-go">Start</button> <span class="note" id="rv-msg" aria-live="polite"></span>' +
      '</div><aside class="rv-side" aria-labelledby="weak-h"><h2 id="weak-h">Your weakest figures</h2><div id="weak"></div></aside></form></div>' +
    '<div id="session" hidden><div class="session-bar"><div class="wrap"><span class="count" id="rv-count"></span><span class="prog" aria-hidden="true"><i id="rv-prog"></i></span>' +
      '<button type="button" class="btn line small" id="rv-end">End review</button></div></div>' +
      '<div class="wrap"><div class="item-hd" id="rv-hd"></div><div class="rv-stage" id="rv-stage"></div>' +
      '<div class="rv-next" id="rv-next" hidden><button type="button" class="btn" id="rv-nextbtn">Next question</button><span class="msg" id="rv-nextmsg"></span></div></div></div>' +
    '<div class="wrap" id="summary" hidden></div>' +
    '</main>\n' + foot() +
    '<script src="assets/course-data.js"></script>\n<script src="assets/x.js"></script>\n<script src="assets/deck.js"></script>\n' +
    '<script src="../assets/predict/kit/kit.js"></script>\n<script src="assets/review.js"></script>\n' + aiScripts(true) + '</body>\n</html>\n';
  write('review.html', s);
}

/* ---------------- ask ---------------- */
function askPage() {
  // the live ask.html's own script, unchanged apart from its starters and the asset path
  const src = E.read('ask.html');
  const script = /<script src="assets\/chatbot\.js"><\/script>\s*<script>([\s\S]*?)<\/script>/.exec(src)[1];
  const pageCss = /<style>([\s\S]*?)<\/style>/.exec(src.slice(0, src.indexOf('</head>')))[1];
  let s = head({ title: 'Ask the course AI | EC224', desc: 'Ask the EC224 course AI a question; the answer comes from the course pages and textbook.', extraHead: '<style>' + pageCss + '</style>\n' });
  s += '<body>\n' + top({ page: 'ask' }) + '<main id="main"><div class="wrap ask-page">' +
    '<h1>Ask the course AI</h1>' +
    '<p class="lead">Ask about EC224 in your own words. The answer comes from the course pages and the textbook, and the page it came from opens alongside, scrolled to the passage and highlighted.</p>' +
    '<div class="ea-split"><div class="ea-thread" id="ea-thread"></div>' +
      '<section class="ea-pv" aria-label="Source page"><div class="ea-pv-bar"><b id="ea-pv-title">Source page</b><span class="ea-pv-status" id="ea-pv-status" aria-live="polite"></span>' +
      '<a class="ea-pv-open" id="ea-pv-open" target="_blank" rel="noopener" hidden>Open in a new tab</a></div>' +
      '<div class="ea-pv-empty" id="ea-pv-empty"><b>The source shows up here</b><span>Once a question is answered, the course page it came from opens here with the passage highlighted.</span></div>' +
      '<iframe class="ea-pv-frame" id="ea-pv-frame" title="Course page the answer came from" hidden></iframe></section></div>' +
    '</div></main>\n' + foot() +
    '<span id="ea-hero-mark" hidden></span>\n<script src="../assets/chatbot.js"></script>\n<script>' + script + '</script>\n<script src="../assets/feedback.js"></script>\n</body>\n</html>\n';
  write('ask.html', s);
}

/* ---------------- run ---------------- */
write('assets/course-data.js', '/* Generated by x/tools/build.js from the live site. Do not edit. */\nwindow.XDATA = ' + JSON.stringify(DATA) + ';\n');
for (let n = 1; n <= 12; n++) weekPage(n);
for (let n = 1; n <= 12; n++) if (W[n].practice) practicePage(n);
homePage();
reviewPage();
askPage();

// guard: no em or en dash in anything a student reads
let bad = 0;
for (const f of OUT) {
  const t = fs.readFileSync(path.join(X, f), 'utf8');
  const m = t.match(new RegExp('.{0,40}[' + EN + EM + '].{0,40}', 'g'));
  if (m) { bad += m.length; console.warn('DASH in ' + f + ':\n  ' + m.slice(0, 5).join('\n  ')); }
}
console.log('built ' + OUT.length + ' files' + (bad ? ', ' + bad + ' dash(es) to fix' : ', no em or en dashes'));
