/* build-live.js: turn a classic weekN-viz.html into the "Predict, then see" live page.
 *
 *   node lab/predict/tools/build-live.js <N> <sectionId=figKey[+figKey]> ... [--lede "text"] [--keep-id id=figKey]
 *          [--edits edits.json] [--dry] [--out file]
 *   edits.json: [["exact old text", "new text"], ...] applied to the built page (prose that names old controls)
 *   e.g. node lab/predict/tools/build-live.js 2 sec-ic-intro=f21 sec-budget=f23 sec-shifts=f24 \
 *          sec-optimum=f25 sec-mupd=f26 sec-mrs-slider=f28 sec-ic-cross=f29 sec-corner=f210
 *
 * Source: the classic page at git tag classic-site-2026-11-07 (so the build can be rerun at will).
 * Output: weekN-viz.html, written with CRLF line ends (git stores LF: core.autocrlf), with a BOM only when the classic
 * page had one (week 2). See lab/predict/SWITCHOVER.md "Integration pattern".
 *
 * What it does
 *  - head: keeps meta / title / favicon / fonts, shared.css and assets/vizpage.css; adds assets/predict/kit/kit.css
 *    and kit-site.css; keeps the page's inline <style> blocks but drops every rule whose selector names a class or
 *    id that no longer occurs in the new page or in the scripts it still loads (old figure CSS); copies any <style>
 *    block of the lab preview page (lab/predict/weekN/index.html); keeps the MathJax config and script (prose
 *    math). Drops JSXGraph, D3, figkit.js and every other inline head script (old figure code).
 *  - body: keeps the top bar, the layout, the rail and the page header verbatim (the lede is replaced when --lede
 *    is given; a WARN when the header has no p.lede). In each mapped section: drops the old figure bays (.fig-bay),
 *    keeps the prose (.fig-prose) and any film (<figure class="film">, moved after the prose), moves a .fig-hd that
 *    sits directly in the section (not in the prose) to the top of the prose, as the other sections have it, and appends
 *    <div class="kit-bay"><div id="fNN" class="mathjax_ignore tex2jax_ignore"></div></div> for each mapped figure key.
 *    The section loses its fig-sec class (that is the old prose | bay split). Unmapped sections are kept as they are.
 *    Element ids inside a dropped bay that other pages link to must be listed with --keep-id id=fNN (put on that
 *    figure's bay).
 *  - end of body: keeps the footer; loads chatbot.js, ask-widget.js, ask-figures.js ("Ask about this figure"), nav.js, autoplay-video.js and film.js (films
 *    only), the rail tracker, then kit.js, the week's models.js and figs.js, and the lab page's own mount script with
 *    { films: false } added (the page shows the site's film player instead of the kit's).
 *  - CSS pruning runs twice: before the --edits (so an edit can still name kept CSS) and after them (rules the edits
 *    left dead go too). A class / id counts as used only as a whole token (".toc" is not kept alive by "stock").
 *  - prints what it dropped, so you can check nothing the page still needs went with it, and WARN lines for what a
 *    person must look at: text inside a dropped bay (teaching content?), old controls or empty boxes left in the kept
 *    prose, kept page CSS that names a class the kit also uses inside its figures, a --lede with nothing to replace.
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const N = args.shift();
if (!N || !/^\d+$/.test(N)) { console.error('usage: build-live.js <N> sec=key ... [--lede text] [--keep-id id=key] [--dry]'); process.exit(2); }
const map = {}, keepIds = {}; let lede = null, dry = false, edits = [], outFile = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--lede') lede = args[++i];
  else if (a === '--dry') dry = true;
  else if (a === '--out') outFile = args[++i];
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
const warn = m => log.push('WARN ' + m);
if (lede != null) {
  const ledeRe = /(<header class="page page-hd">[\s\S]*?<p class="lede">)[\s\S]*?(<\/p>)/;
  if (ledeRe.test(main)) main = main.replace(ledeRe, (m, a, b) => a + lede + b);
  else warn('--lede did nothing: the page header has no <p class="lede">; add the lede with an --edits entry instead');
}
const textOf = h => h.replace(/<(script|style)\b[\s\S]*?<\/(script|style)>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// old figure controls, and empty boxes an old script used to fill, that a kept prose block can still hold
const CONTROLS = /<(button|input|select|canvas|textarea)\b[^>]*>|<div\b[^>]*\bid="[^"]+"[^>]*>\s*<\/div>/g;

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
  // .fig-hd blocks directly in the section (not inside the prose or a bay)
  const inside = (b, list) => list.some(x => b.start >= x.start && b.end <= x.end);
  const proseB = blocks(inner, /<div class="fig-prose">/);
  const hds = blocks(inner, /<div class="fig-hd">/).filter(b => !inside(b, proseB) && !inside(b, bays));
  // anything else at the top level of the section that is not a bay or a .fig-hd (e.g. sec-hd + prose written loose)
  let rest = inner;
  // cut only the outermost blocks (a .fig-hd inside the prose is cut with the prose; cutting it first would shift the
  // prose's offsets and eat the markup after it)
  const cuts = [].concat(proseB, blocks(inner, /<figure class="film"/), bays, blocks(inner, /<div class="fig-hd">/));
  cuts.filter(b => !cuts.some(o => o !== b && b.start >= o.start && b.end <= o.end))
    .sort((a, b) => b.start - a.start).forEach(b => { rest = rest.slice(0, b.start) + rest.slice(b.end); });
  rest = rest.replace(/<!--[\s\S]*?-->/g, '').trim();
  const ids = []; bays.forEach(b => (b.html.match(/\bid="[^"]+"/g) || []).forEach(x => ids.push(x.slice(4, -1))));
  log.push('section ' + id + ': ' + prose.length + ' prose, ' + films.length + ' film, dropped ' + bays.length + ' bay(s) with ids ' + ids.join(' '));
  bays.forEach(b => { const t = textOf(b.html); if (t) warn('section ' + id + ': dropped bay text (teaching content? keep it with an edit): "' + (t.length > 1500 ? t.slice(0, 1500) + ' ...' : t) + '"'); });
  // Headings. The classic pages title each figure with a .fig-hd ("Fig 4.3" + h3), some inside the prose, some
  // directly in the section beside the bay. On the live page the kit prints "Figure 4.3" itself, so each .fig-hd
  // becomes the section heading, the pattern of weeks 2, 3 and 12:
  //   <div class="sec-hd"><span class="sec-n">§ 4.3</span><h2>Title</h2></div>
  // in place inside the prose, or at the top of the prose (the section top when there is no prose) for a
  // section-level one. A section that already has its own heading (week 2: a .sec-hd) keeps it, and its
  // section-level .fig-hd (the old figure title) is dropped.
  const toSec = hdHtml => {
    const n = (hdHtml.match(/<span class="fig-n">\s*Fig\s+([^<\s]+)\s*<\/span>/) || [])[1], t = (hdHtml.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1];
    if (!n || t == null) { warn('section ' + id + ': a .fig-hd without "Fig N.M" or an h3, kept as it was: ' + textOf(hdHtml)); return hdHtml; }
    return '<div class="sec-hd"><span class="sec-n">§ ' + n + '</span><h2>' + t.trim().replace(/\s+/g, ' ') + '</h2></div>';
  };
  const hasSec = /class="sec-hd"|<h2\b/.test(prose.join('') + rest);
  if (hasSec) {
    if (hds.length) log.push('section ' + id + ': dropped its section-level .fig-hd "' + textOf(hds.map(b => b.html).join(' ')) + '" (the section has its own heading)');
  } else {
    for (let j = 0; j < prose.length; j++) prose[j] = prose[j].replace(/<div class="fig-hd">[\s\S]*?<\/div>/g, m => { const r = toSec(m); log.push('section ' + id + ': .fig-hd "' + textOf(m) + '" in the prose -> section heading'); return r; });
    if (hds.length) log.push('section ' + id + ': section-level .fig-hd "' + textOf(hds.map(b => b.html).join(' ')) + '" -> section heading at the top of the ' + (prose.length ? 'prose' : 'section (no .fig-prose here: check the loose markup)'));
  }
  const hd = hasSec ? '' : hds.map(b => toSec(b.html)).join('\n        ');
  if (hd && prose.length) prose[0] = prose[0].replace(/^<div class="fig-prose">/, m => m + '\n        ' + hd);
  let h = '\n      ' + open + '\n';
  if (hd && !prose.length) h += '      ' + hd + '\n';
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
const TAGS_ALWAYS = /^(html|body|\*|:root|a|p|em|strong|b|i|sub|sup|ul|ol|li|h[1-6]|span|div|main|section|header|footer|nav|figure|figcaption|code|pre|small|br|hr|mjx-[\w-]+|svg|path|g|text|line|circle|rect|polyline|polygon|use)$/i;
// classes the kit uses inside its figures (from kit.css): a kept page rule naming one of them could restyle a figure
const KIT_CLASSES = new Set((fs.readFileSync(path.join(ROOT, 'assets/predict/kit/kit.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{[^{}]*\}/g, ' ').match(/\.[A-Za-z_][\w-]*/g) || []).map(t => t.slice(1)).filter(t => t !== 'kfig'));
// ctx: { toks: every token of the page body and the scripts it loads, html: the body markup without scripts (lowercase) }
function liveCtx(markup, scripts) {
  return { toks: new Set((markup + '\n' + scripts).match(/[A-Za-z_][\w-]*/g) || []), html: markup.replace(/<script\b[\s\S]*?<\/script>/g, '').toLowerCase() };
}
function selAlive(sel, ctx) {
  // element names: an <input>, <canvas>, <table>... rule is dead when the page has no such element
  const tags = sel.replace(/\[[^\]]*\]|::?[\w-]+(\([^)]*\))?|[.#][\w-]+/g, ' ').split(/[\s>+~,]+/).filter(Boolean);
  if (!tags.every(t => TAGS_ALWAYS.test(t) || new RegExp('<' + t.toLowerCase() + '[\\s>/]').test(ctx.html))) return false;
  // classes and ids: alive when the page or a kept script has that exact token (not as part of a longer word)
  const toks = sel.replace(/\[[^\]]*\]/g, '').replace(/:not\([^)]*\)/g, '').match(/[.#][A-Za-z_][\w-]*/g) || [];
  return toks.every(t => ctx.toks.has(t.slice(1)));
}
function pruneCss(css, ctx, kept) {
  let o = '', i = 0, dropped = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { o += css[i++]; continue; }
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i) + 2; o += css.slice(i, j); i = j; continue; }
    const b = css.indexOf('{', i); if (b < 0) { o += css.slice(i); break; }
    const sel = css.slice(i, b).trim();
    if (sel.startsWith('@media') || sel.startsWith('@supports')) {
      let d = 1, j = b + 1; while (d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
      const r = pruneCss(css.slice(b + 1, j - 1), ctx, kept); dropped += r.dropped;
      if (/[{]/.test(r.css)) o += sel + ' {' + r.css + '}';
      i = j; continue;
    }
    if (sel.startsWith('@')) { let d = 1, j = b + 1; while (d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; } o += css.slice(i, j); i = j; continue; }
    const e = css.indexOf('}', b);
    const parts = sel.split(',').map(x => x.trim()).filter(x => selAlive(x, ctx));
    if (parts.length) { o += parts.join(',\n') + ' ' + css.slice(b, e + 1); if (kept) parts.forEach(kept); } else dropped++;
    i = e + 1;
  }
  return { css: o.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/\s*(?=\/\*|$)/g, '').replace(/\n{3,}/g, '\n\n'), dropped: dropped };
}
// prune one <style> block; returns '' when nothing is left in it
function pruneStyle(st, ctx, kept) {
  const open = st.slice(0, st.indexOf('>') + 1), css = st.slice(open.length, st.length - '</style>'.length), r = pruneCss(css, ctx, kept);
  // @keyframes that no kept rule or script names are dead too
  r.css = r.css.replace(/@keyframes\s+([\w-]+)\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, (m, name) => {
    const rest = r.css.replace(m, '');
    if (rest.indexOf(name) >= 0 || ctx.toks.has(name)) return m;
    r.dropped++; return '';
  });
  const body = r.css.trim().replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return { html: body ? open + r.css.trim() + '\n</style>' : '', dropped: r.dropped, open: open };
}
// pass 1, before the edits: against the body as built
const ctx1 = liveCtx(pre + out + footer, keptJs + (rail || ''));
const pruned = styles.map(st => {
  const r = pruneStyle(st, ctx1);
  log.push('css: ' + r.open + ' dropped ' + r.dropped + ' dead rules' + (r.html ? '' : ', nothing left: block removed'));
  return r.html;
}).filter(Boolean);

/* ---------- assemble ---------- */
const I = '  ';
let html = '<!DOCTYPE html>\n' + src.match(/<html\b[^>]*>/)[0] + '\n<head>\n' +
  keepHead.map(t => I + t).join('\n') + '\n' +
  I + '<!-- Predict, then see: the kit figure styles (scoped to .kfig) and their placement in the site page -->\n' +
  I + '<link rel="stylesheet" href="assets/predict/kit/kit.css" />\n' + I + '<link rel="stylesheet" href="assets/predict/kit/kit-site.css" />\n' +
  (pruned.length ? pruned.map(s => I + s).join('\n') + '\n' : '') +
  labStyles.map(s => I + s.replace('<style>', '<style id="kit-page-css">')).join('\n') + (labStyles.length ? '\n' : '') +
  (mjConf ? I + '<script>\n    ' + mjConf.trim() + '\n  </script>\n' : '') + (mjSrc ? I + mjSrc + '\n' : '') +
  '</head>\n' + src.slice(bodyStart, src.indexOf('>', bodyStart) + 1) + '\n' + pre + out + '\n    </main>\n  </div>\n\n' + footer + '\n\n' +
  I + '<!-- Ask the Course AI, floating 24/7 assistant -->\n' +
  I + '<script src="assets/chatbot.js"></script>\n' + I + '<script src="assets/ask-widget.js"></script>\n' +
  I + '<script src="assets/ask-figures.js"></script>\n' +
  I + '<script src="assets/nav.js" defer></script>\n' +
  (hasFilm ? I + '<script src="assets/autoplay-video.js"></script>\n' + I + '<script src="assets/film.js"></script>\n' : '') +
  (rail ? I + '<script>\n/* Section rail: mark the section being read. Scrolls the strip itself on mobile, never scrollIntoView. */\n' + rail + '\n  </script>\n' : '') +
  I + '<!-- Predict, then see: engine, this week\'s economics and figures (single source: assets/predict/) -->\n' +
  I + '<script src="assets/predict/kit/kit.js"></script>\n' +
  I + '<script src="assets/predict/week' + N + '/models.js"></script>\n' +
  I + '<script src="assets/predict/week' + N + '/figs.js"></script>\n' +
  I + mount + '\n</body>\n</html>\n';
edits.forEach(e => { if (html.split(e[0]).length !== 2) throw new Error('edit not found exactly once: ' + e[0].slice(0, 80)); html = html.replace(e[0], () => e[1]); log.push('edit: ' + e[0].slice(0, 60)); });
// old controls or empty boxes still in the page after the edits (films keep their own buttons; the kit roots are empty on purpose)
{
  const m = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<figure class="film"[\s\S]*?<\/figure>/g, '');
  const c = (m.match(CONTROLS) || []).filter(x => !/\bid="f\d+"/.test(x));
  if (c.length) warn('the page still holds old controls or empty boxes (remove them with --edits): ' + c.map(x => x.replace(/\s+/g, ' ').slice(0, 70)).join(' | '));
}
// pass 2, after the edits: rules that only the removed markup used are dead now too (the page's own <style> blocks;
// the lab page's kit-page-css is the week's and is kept whole). Then warn about kept rules that name a kit class.
const ctx2 = liveCtx(html.slice(html.indexOf('<body')), keptJs);
const kitHits = [];
const headEnd = html.indexOf('</head>');
html = html.slice(0, headEnd).replace(/( *)(<style\b(?![^>]*id="kit-page-css")[^>]*>[\s\S]*?<\/style>)\n?/g, (m, ind, st) => {
  const r = pruneStyle(st, ctx2, sel => {
    const toks = (sel.replace(/:not\([^)]*\)/g, '').match(/\.[A-Za-z_][\w-]*/g) || []).map(t => t.slice(1)).filter(t => KIT_CLASSES.has(t));
    if (toks.length) kitHits.push(sel.replace(/\s+/g, ' ') + '  [' + toks.join(' ') + ']');
  });
  if (r.dropped || !r.html) log.push('css (after the edits): ' + r.open + ' dropped ' + r.dropped + ' more dead rules' + (r.html ? '' : ', nothing left: block removed'));
  return r.html ? ind + r.html + '\n' : '';
}) + html.slice(headEnd);
if (kitHits.length) warn('kept page CSS names classes the kit also uses inside its figures; check in a browser that none reaches a .kfig element:\n    ' + kitHits.join('\n    '));
// the course now calls these pages "Interactive Figures" (hubs and drawer say so); match the crumb and the tab title
html = html.replace('<span class="crumb-here">Visualizations</span>', '<span class="crumb-here">Interactive Figures</span>')
  .replace(/<title>([^<]*)<\/title>/, (m, t) => '<title>' + t.replace(/Interactive Visualizations/, 'Interactive Figures').replace(/ Visualizations:/, ' Interactive Figures:') + '</title>');
html = BOM + html.replace(/\n/g, '\r\n');
log.forEach(l => console.log(l));
// --out <file>: write somewhere else (to diff a rebuild against the committed page)
if (!dry) { const to = outFile ? path.resolve(outFile) : path.join(ROOT, FILE); fs.writeFileSync(to, html); console.log('wrote ' + (outFile || FILE) + ' (' + html.length + ' bytes, was ' + src.length + ')'); }
