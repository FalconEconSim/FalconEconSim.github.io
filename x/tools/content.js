/* Nothing a student has today is lost: for every week, count what the live pages carry and what
 * the x/ page carries (prose sections, films, kit figures, flashcards, lecture videos, slide PDFs,
 * textbook / notes / homework / practice links), and check that every word of the prose made it across.
 *   node x/tools/content.js */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./extract');
const X = path.resolve(__dirname, '..');
const words = (h) => E.text(String(h).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')).replace(new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']', 'g'), ' ').replace(/[^\w$%]+/g, ' ').trim().split(/\s+/).filter(Boolean);
let problems = 0;
function check(n, what, a, b) { const okay = a === b; if (!okay) problems++; return what + ' ' + a + (okay ? '' : ' != ' + b + ' MISMATCH'); }
for (let n = 1; n <= 12; n++) {
  const out = fs.readFileSync(path.join(X, 'week' + n + '.html'), 'utf8');
  const v = E.viz(n), L = E.lecture(n), cards = E.cards(n), hub = E.hub(n);
  const row = ['week ' + n + ':'];
  if (v) {
    const secs = v.blocks.filter((b) => b.type === 'section');
    row.push(check(n, 'sections', secs.length, (out.match(/<section class="fsec"/g) || []).length));
    row.push(check(n, 'films', secs.reduce((a, b) => a + b.films.length, 0), (out.match(/<figure class="film"/g) || []).length));
    row.push(check(n, 'figures', secs.reduce((a, b) => a + b.figs.length, 0), (out.match(/<div class="kit-bay"/g) || []).length));
    // prose: every word of the live prose appears in the x/ page's prose
    const live = words(secs.map((b) => b.heading + ' ' + b.prose).join(' ')).join(' ').replace(/\$/g, '');
    const mine = words((out.match(/<div class="fsec-hd">[\s\S]*?<\/section>/g) || []).map((s) => s.replace(/<figure class="film"[\s\S]*?<\/figure>/g, '')).join(' ')).join(' ').replace(/\$/g, '');
    const lw = live.split(' '), mw = new Set(mine.split(' '));
    const missing = lw.filter((w) => w && !mw.has(w));
    row.push('prose words ' + lw.length + (missing.length ? ' MISSING ' + [...new Set(missing)].slice(0, 8).join(',') : ' all present'));
    if (missing.length) problems++;
  }
  row.push(check(n, 'cards', cards.length, (out.match(/<span class="dq">/g) || []).length));
  const vids = L.groups.reduce((a, g) => a + g.items.length, 0);
  row.push(check(n, 'videos', vids, (out.match(/data-play="/g) || []).length));
  row.push(check(n, 'pdfs', L.pdfs.length, L.pdfs.filter((p) => out.includes(p.href.replace(/^assets\//, '../assets/'))).length));
  for (const h of hub) {
    if (/^(Lecture Slides & Videos|Interactive Figures|Flashcards)$/.test(h.title)) continue;   // these are the steps themselves
    let target = h.href;
    if (/practice/.test(target)) target = 'week' + n + '-practice.html';
    else if (/brightspace/.test(target)) target = 'brightspace.bentley.edu';
    else if (!/^https?:/.test(target)) target = '../' + target;
    const has = out.includes(target);
    if (!has) problems++;
    row.push(h.title + (has ? ' linked' : ' NOT LINKED'));
  }
  console.log(row.join(' | '));
}
console.log(problems ? problems + ' problem(s)' : 'everything the live weeks carry is on the x/ weeks');
