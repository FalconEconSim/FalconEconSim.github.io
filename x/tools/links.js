/* Every internal link and asset reference in x/*.html resolves: the file exists, and an #anchor
 * into an x/ page exists in that page (ids in the HTML, plus figure ids the kit mounts, which are
 * the empty <div id="fNN"> slots). Also lists the external hosts linked, for a glance.
 *   node x/tools/links.js */
'use strict';
const fs = require('fs');
const path = require('path');
const X = path.resolve(__dirname, '..');
const ROOT = path.resolve(X, '..');
const pages = fs.readdirSync(X).filter((f) => f.endsWith('.html'));
const ids = {};
for (const p of pages) ids[p] = new Set([...fs.readFileSync(path.join(X, p), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
let bad = 0, n = 0;
const ext = {};
for (const p of pages) {
  const s = fs.readFileSync(path.join(X, p), 'utf8');
  for (const m of s.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (/^(mailto:|javascript:|data:)/.test(u)) continue;
    if (/^https?:/.test(u)) { const h = new URL(u).host; ext[h] = (ext[h] || 0) + 1; continue; }
    n++;
    const [file, hash] = u.split('#');
    const clean = file.split('?')[0];
    const target = clean ? path.resolve(X, clean) : path.join(X, p);
    if (!fs.existsSync(target)) { bad++; console.log('MISSING ' + p + ' -> ' + u); continue; }
    if (hash && target.startsWith(X) && target.endsWith('.html')) {
      const t = path.basename(target);
      if (!ids[t] || !ids[t].has(hash)) { bad++; console.log('NO ANCHOR ' + p + ' -> ' + u); }
    }
    if (!target.startsWith(ROOT)) { bad++; console.log('OUTSIDE SITE ' + p + ' -> ' + u); }
  }
}
console.log(n + ' internal references in ' + pages.length + ' pages, ' + bad + ' broken');
console.log('external hosts: ' + Object.entries(ext).map(([h, c]) => h + ' (' + c + ')').join(', '));
