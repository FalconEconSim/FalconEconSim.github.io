/* build-live.js: turn a classic weekN-viz.html into the "Predict, then see" live page.
 *
 *   node lab/predict/tools/build-live.js <N> <sectionId=figKey[+figKey]> ... [--lede "text"] [--keep-id id=figKey]
 *          [--edits edits.json] [--dry]
 *   edits.json: [["exact old text", "new text"], ...] applied to the built page (prose that names old controls)
 *   e.g. node lab/predict/tools/build-live.js 2 sec-ic-intro=f21 sec-budget=f23 sec-shifts=f24 \
 *          sec-optimum=f25 sec-mupd=f26 sec-mrs-slider=f28 sec-ic-cross=f29 sec-corner=f210
 *
 * Source: the classic page at git tag classic-site-2026-11-07 (so the build can be rerun at will).
 * Output: weekN-viz.html (CRLF, BOM kept as in the source). See lab/predict/SWITCHOVER.md "Integration pattern".
 *
 * What it does
 *  - head: keeps meta / title / favicon / fonts, shared.css and assets/vizpage.css; adds assets/predict/kit/kit.css
 *    and kit-site.css; keeps the page's inline <style> blocks but drops every rule whose selector names a class or
 *    id that no longer occurs in the new page or in the scripts it still loads (old figure CSS); copies any <style>
 *    block of the lab preview page (lab/predict/weekN/index.html); keeps the MathJax config and script (prose
 *    math). Drops JSXGraph, D3, figkit.js and every other inline head script (old figure code).
 *  - body: keeps the top bar, the layout, the rail and the page header verbatim (the lede is replaced when --lede
 *    is given). In each mapped section: drops the old figure bays (.fig-bay) and the stray .fig-hd headers, keeps the
 *    prose (.fig-prose) and any film (<figure class="film">, moved after the prose), and appends
 *    <div class="kit-bay"><div id="fNN" class="mathjax_ignore tex2jax_ignore"></div></div> for each mapped figure key.
 *    The section loses its fig-sec class (that is the old prose | bay split). Unmapped sections are kept as they are.
 *    Element ids inside a dropped bay that other pages link to must be listed with --keep-id id=fNN (put on that
 *    figure's bay).
 *  - end of body: keeps the footer; loads chatbot.js, ask-widget.js, nav.js, autoplay-video.js and film.js (films
 *    only), the rail tracker, then kit.js, the week's models.js and figs.js, and the lab page's own mount script with
 *    { films: false } added (the page shows the site's film player instead of the kit's).
 *  - prints what it dropped, so you can check nothing the page still needs went with it.
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const N = args.shift();
if (!N || !/^\d+$/.test(N)) { console.error('usage: build-live.js <N> sec=key ... [--lede text] [--keep-id id=key] [--dry]'); process.exit(2); }
const map = {}, keepIds = {}; let lede = null, dry = false, edits = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--lede') lede = args[++i];
  else if (a === '--dry') dry = true;
  else if (a === '--edits') edits = JSON.parse(fs.readFileSync(args[++i], 'utf8'));
  else if (a === '--keep-id') { const [id, k] = args[++i].split('='); keepIds[k] = (keepIds[k] || []).concat(id); }
  else { const [sec, keys] = a.split('='); map[sec] = keys.split('+'); }
}
const FILE = 'week' + N + '-viz.html';
let src = cp.execSync('git show classic-site-2026-11-07:' + FILE, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const BOM = src.charCodeAt(0) === 0xfeff ? '﻿' : '';
src = src.replace(/^﻿/, '').replace(/\r\n/g, '\n');
const log = [];

/* ---------- small HTML helpers (the pages are hand-written and regular; no DOM needed) ---------- */
// index just past the element that opens at i (balanced on its own tag name)
function endOf(s, i) {
  const tag = s.slice(i + 1).match(/^[a-zA-Z0-9]+/)[0], re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'g');
  re.lastIndex = i; let d = 0, m;
  while ((m = re.exec(s))) { if (m[1]) d--; else if (!/\/>$/.test(m[0])) d++; if (d === 0) return re.lastIndex; }
  throw new Error('unbalanced <' + tag + '> at ' + i);
}
function blocks(s, openRe) {   // [{start, end, html}] for each element whose opening tag matches openRe
  const out = []; let m; openRe = new RegExp(openRe.source, 'g');
  while ((m = openRe.exec(s))) { const e = endOf(s, m.index); out.push({ start: m.index, end: e, html: s.slice(m.index, e) }); openRe.lastIndex = e; }
  return out;
}

/* ---------- head ---------- */
const head = src.slice(0, src.indexOf('</head>'));
const keepHead = [];
(head.match(/<meta\b[^>]*>|<title>[\s\S]*?<\/title>|<link\b[^>]*>/g) || []).forEach(t => {
  if (/<link/.test(t) && /stylesheet/.test(t) && !/fonts\.googleapis|shared\.css|vizpage\.css/.test(t)) { log.push('head: dropped ' + t); return; }
  keepHead.push(t);
});
const styles = blocks(head, /<style\b[^>]*>/).map(b => b.html);
const mjConf = (head.match(/window\.MathJax\s*=\s*\{[\s\S]*?\n\s*\};/) || [null])[0];
const mjSrc = (head.match(/<script\b[^>]*src="[^"]*mathjax[^"]*"[^>]*><\/script>/) || [null])[0];
(head.match(/<script\b[^>]*>/g) || []).forEach(t => { if (!/mathjax/.test(t)) log.push('head: dropped ' + t + (/src=/.test(t) ? '' : ' (inline)')); });

/* ---------- body ---------- */
const bodyStart = src.indexOf('<body'), mainOpen = src.indexOf('<main', bodyStart), mainEnd = endOf(src, mainOpen);
let pre = src.slice(src.indexOf('>', bodyStart) + 1, src.indexOf('>', mainOpen) + 1);
let main = src.slice(src.indexOf('>', mainOpen) + 1, mainEnd - '</main>'.length);
if (lede != null) main = main.replace(/(<header class="page page-hd">[\s\S]*?<p class="lede">)[\s\S]*?(<\/p>)/, (m, a, b) => a + lede + b);

const secs = blocks(main, /<section\b[^>]*>/);
let out = '', last = 0;
const used = new Set();
secs.forEach(sec => {
  out += main.slice(last, sec.start); last = sec.end;
  const id = (sec.html.match(/^<section\b[^>]*\bid="([^"]+)"/) || [])[1];
  if (!id || !map[id]) { out += sec.html; if (id) log.push('section ' + id + ': kept as is (no figure mapped)'); return; }
  used.add(id);
  const open = sec.html.slice(0, sec.html.indexOf('>') + 1).replace(/\s*\bfig-sec\b/, '');
  const inner = sec.html.slice(sec.html.indexOf('>') + 1, sec.html.length - '</section>'.length);
  const prose = blocks(inner, /<div class="fig-prose">/).map(b => b.html);
  const films = blocks(inner, /<figure class="film"/).map(b => b.html);
  const bays = blocks(inner, /<div class="fig-bay">/);
  // anything else at the top level of the section that is not a bay or a .fig-hd (e.g. sec-hd + prose written loose)
  let rest = inner;
  [].concat(blocks(inner, /<div class="fig-prose">/), blocks(inner, /<figure class="film"/), bays, blocks(inner, /<div class="fig-hd">/))
    .sort((a, b) => b.start - a.start).forEach(b => { rest = rest.slice(0, b.start) + rest.slice(b.end); });
  rest = rest.replace(/<!--[\s\S]*?-->/g, '').trim();
  const ids = []; bays.forEach(b => (b.html.match(/\bid="[^"]+"/g) || []).forEach(x => ids.push(x.slice(4, -1))));
  log.push('section ' + id + ': ' + prose.length + ' prose, ' + films.length + ' film, dropped ' + bays.length + ' bay(s) with ids ' + ids.join(' '));
  let h = '\n      ' + open + '\n';
  if (rest) h += '      ' + rest + '\n';
  prose.forEach(p => { h += '      ' + p + '\n'; });
  films.forEach(f => { h += '      ' + f + '\n'; });
  map[id].forEach(k => {
    const extra = (keepIds[k] || []).map(x => ' id="' + x + '"').join('');
    h += '      <div class="kit-bay"' + extra + '><div id="' + k + '" class="mathjax_ignore tex2jax_ignore"></div></div>\n';
  });
  out += h + '    </section>';
});
out += main.slice(last);
Object.keys(map).forEach(k => { if (!used.has(k)) throw new Error('no section with id ' + k); });

const after = src.slice(mainEnd);
const footer = (after.match(/<footer\b[\s\S]*?<\/footer>/) || [''])[0];
const rail = (src.match(/\(function railTracking\(\) \{[\s\S]*?\n\}\)\(\);/) || [null])[0];
(after.match(/<script\b[^>]*>/g) || []).forEach(t => {
  if (!/chatbot|ask-widget|nav\.js|autoplay-video|film\.js/.test(t)) log.push('end: dropped ' + t + (/src=/.test(t) ? '' : ' (inline)'));
});
const hasFilm = /<figure class="film"/.test(out);

/* ---------- lab page: its own CSS and its mount script ---------- */
const lab = fs.readFileSync(path.join(ROOT, 'lab/predict/week' + N + '/index.html'), 'utf8').replace(/\r\n/g, '\n');
const labStyles = blocks(lab, /<style\b[^>]*>/).map(b => b.html);
const labScripts = blocks(lab, /<script>/).map(b => b.html).filter(s => /Kit\.mount/.test(s));
if (labScripts.length !== 1) throw new Error('lab page: expected one inline Kit.mount script');
const mount = labScripts[0].replace(/Kit\.mount\(([^,]+),\s*\{/, (m, a) => 'Kit.mount(' + a + ', { films: false,');

/* ---------- prune the page's inline CSS ---------- */
const keptJs = ['assets/chatbot.js', 'assets/ask-widget.js', 'assets/nav.js', 'assets/autoplay-video.js', 'assets/film.js',
  'assets/predict/kit/kit.js', 'assets/predict/week' + N + '/figs.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const liveText = pre + out + footer + keptJs + (rail || '');
const alive = tok => liveText.indexOf(tok) >= 0;
const liveHtml = (pre + out + footer).toLowerCase();
const TAGS_ALWAYS = /^(html|body|\*|:root|a|p|em|strong|b|i|sub|sup|ul|ol|li|h[1-6]|span|div|main|section|header|footer|nav|figure|figcaption|code|pre|small|br|hr|mjx-[\w-]+|svg|path|g|text|line|circle|rect|polyline|polygon|use)$/i;
function selAlive(sel) {
  // element names: an <input>, <canvas>, <table>... rule is dead when the page has no such element
  const tags = sel.replace(/\[[^\]]*\]|::?[\w-]+(\([^)]*\))?|[.#][\w-]+/g, ' ').split(/[\s>+~,]+/).filter(Boolean);
  if (!tags.every(t => TAGS_ALWAYS.test(t) || liveHtml.indexOf('<' + t.toLowerCase()) >= 0)) return false;
  const toks = sel.replace(/\[[^\]]*\]/g, '').replace(/:not\([^)]*\)/g, '').match(/[.#][A-Za-z_][\w-]*/g) || [];
  return toks.every(t => alive(t.slice(1)));
}
function pruneCss(css) {
  let o = '', i = 0, dropped = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { o += css[i++]; continue; }
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i) + 2; o += css.slice(i, j); i = j; continue; }
    const b = css.indexOf('{', i); if (b < 0) { o += css.slice(i); break; }
    const sel = css.slice(i, b).trim();
    if (sel.startsWith('@media') || sel.startsWith('@supports')) {
      let d = 1, j = b + 1; while (d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
      const r = pruneCss(css.slice(b + 1, j - 1)); dropped += r.dropped;
      if (/[{]/.test(r.css)) o += sel + ' {' + r.css + '}';
      i = j; continue;
    }
    if (sel.startsWith('@')) { let d = 1, j = b + 1; while (d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; } o += css.slice(i, j); i = j; continue; }
    const e = css.indexOf('}', b);
    const parts = sel.split(',').map(x => x.trim()).filter(selAlive);
    if (parts.length) o += parts.join(',\n') + ' ' + css.slice(b, e + 1); else dropped++;
    i = e + 1;
  }
  return { css: o.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/\s*(?=\/\*|$)/g, '').replace(/\n{3,}/g, '\n\n'), dropped: dropped };
}
const pruned = styles.map(st => {
  const open = st.slice(0, st.indexOf('>') + 1), css = st.slice(open.length, st.length - '</style>'.length), r = pruneCss(css);
  // @keyframes that no kept rule or script names are dead too
  r.css = r.css.replace(/@keyframes\s+([\w-]+)\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, (m, name) => {
    const rest = r.css.replace(m, '');
    if (rest.indexOf(name) >= 0 || liveText.indexOf(name) >= 0) return m;
    r.dropped++; return '';
  });
  log.push('css: ' + open + ' dropped ' + r.dropped + ' dead rules');
  return open + r.css.trim() + '\n</style>';
});

/* ---------- assemble ---------- */
const I = '  ';
let html = '<!DOCTYPE html>\n' + src.match(/<html\b[^>]*>/)[0] + '\n<head>\n' +
  keepHead.map(t => I + t).join('\n') + '\n' +
  I + '<!-- Predict, then see: the kit figure styles (scoped to .kfig) and their placement in the site page -->\n' +
  I + '<link rel="stylesheet" href="assets/predict/kit/kit.css" />\n' + I + '<link rel="stylesheet" href="assets/predict/kit/kit-site.css" />\n' +
  pruned.map(s => I + s).join('\n') + '\n' +
  labStyles.map(s => I + s.replace('<style>', '<style id="kit-page-css">')).join('\n') + (labStyles.length ? '\n' : '') +
  (mjConf ? I + '<script>\n    ' + mjConf.trim() + '\n  </script>\n' : '') + (mjSrc ? I + mjSrc + '\n' : '') +
  '</head>\n' + src.slice(bodyStart, src.indexOf('>', bodyStart) + 1) + '\n' + pre + out + '\n    </main>\n  </div>\n\n' + footer + '\n\n' +
  I + '<!-- Ask the Course AI, floating 24/7 assistant -->\n' +
  I + '<script src="assets/chatbot.js"></script>\n' + I + '<script src="assets/ask-widget.js"></script>\n' +
  I + '<script src="assets/nav.js" defer></script>\n' +
  (hasFilm ? I + '<script src="assets/autoplay-video.js"></script>\n' + I + '<script src="assets/film.js"></script>\n' : '') +
  (rail ? I + '<script>\n/* Section rail: mark the section being read. Scrolls the strip itself on mobile, never scrollIntoView. */\n' + rail + '\n  </script>\n' : '') +
  I + '<!-- Predict, then see: engine, this week\'s economics and figures (single source: assets/predict/) -->\n' +
  I + '<script src="assets/predict/kit/kit.js"></script>\n' +
  I + '<script src="assets/predict/week' + N + '/models.js"></script>\n' +
  I + '<script src="assets/predict/week' + N + '/figs.js"></script>\n' +
  I + mount + '\n</body>\n</html>\n';
edits.forEach(e => { if (html.split(e[0]).length !== 2) throw new Error('edit not found exactly once: ' + e[0].slice(0, 80)); html = html.replace(e[0], () => e[1]); log.push('edit: ' + e[0].slice(0, 60)); });
html = BOM + html.replace(/\n/g, '\r\n');
log.forEach(l => console.log(l));
if (!dry) { fs.writeFileSync(path.join(ROOT, FILE), html); console.log('wrote ' + FILE + ' (' + html.length + ' bytes, was ' + src.length + ')'); }
