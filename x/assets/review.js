/* Review: a mixed run of figure questions and flashcards from the weeks a student picks.
 * Figures come from the 69 kit specs (assets/predict/weekN/figs.js, loaded only for the weeks in
 * play), each mounted on its own and started on a fresh random round, so the answer is new and
 * verified. Not tried and low-scoring figures are picked first; cards that are due come first. */
(function () {
  'use strict';
  var D = X.D;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function unitOf(n) { for (var i = 0; i < D.units.length; i++) if (D.units[i].weeks.indexOf(n) >= 0) return D.units[i].n; return 1; }

  /* ---------- setup ---------- */
  var form = $('rv-form');
  var params = new URLSearchParams(location.search);
  var thread = null;
  if (params.get('thread')) thread = D.threads.filter(function (t) { return t.id === params.get('thread'); })[0] || null;
  function parseWeeks(s) {
    var out = [];
    (s || '').split(',').forEach(function (p) {
      var m = /^(\d+)-(\d+)$/.exec(p.trim());
      if (m) for (var i = +m[1]; i <= +m[2]; i++) out.push(i); else if (/^\d+$/.test(p.trim())) out.push(+p);
    });
    return out.filter(function (n) { return n >= 1 && n <= 12; });
  }
  function setWeeks(ws) { form.querySelectorAll('input[name=w]').forEach(function (b) { b.checked = ws.indexOf(+b.value) >= 0; }); }
  function getWeeks() { return [].slice.call(form.querySelectorAll('input[name=w]:checked')).map(function (b) { return +b.value; }); }

  var start = parseWeeks(params.get('weeks'));
  if (!start.length && X.S.last && X.S.last.w) { for (var i = 1; i <= X.S.last.w; i++) start.push(i); }
  if (thread) start = thread.figs.map(function (k) { return D.figs[k].week; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  setWeeks(start);
  form.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { thread = null; paintThread(); setWeeks(parseWeeks(b.getAttribute('data-preset'))); });
  });
  form.querySelectorAll('input[name=w]').forEach(function (b) { b.addEventListener('change', function () { if (thread) { thread = null; paintThread(); } }); });

  function paintThread() {
    var el = $('thread-note');
    if (!thread) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="note"><b>' + esc(thread.name) + '.</b> This review uses the ' + thread.figs.length + ' figures of this idea: ' +
      thread.figs.map(function (k) { return D.figs[k].num; }).join(', ') + '. Change the weeks to review by week instead.</p>';
    form.querySelector('input[name=mode][value=figs]').checked = true;
  }
  paintThread();

  function figBest(k) { var f = D.figs[k], t = X.tally(f.week)[k]; return t && t.played ? t.best : null; }
  (function weak() {
    var rows = Object.keys(D.figs).filter(function (k) { return !D.figs[k].ef && figBest(k) !== null; })
      .sort(function (a, b) { return figBest(a) - figBest(b); }).slice(0, 6);
    $('weak').innerHTML = rows.length ? '<ul>' + rows.map(function (k) {
      var f = D.figs[k];
      return '<li><a href="week' + f.week + '.html#' + k + '">' + f.num + ' ' + esc(f.short) + '</a><span>best <b>' + figBest(k) + '</b></span></li>';
    }).join('') + '</ul>' : '<p class="empty">Nothing here yet. Figures you score low on in the weeks or in a review show up here, so you know what to go back to.</p>';
  })();

  /* ---------- picking ---------- */
  function figWeight(k) {
    var b = figBest(k);
    if (D.figs[k].ef) return 0.6;
    if (b === null) return 3; if (b < 45) return 2.6; if (b < 70) return 2; if (b < 90) return 1; return 0.45;
  }
  function pickWeighted(pool, w) {
    var tot = 0; pool.forEach(function (k) { tot += w(k); });
    var r = Math.random() * tot;
    for (var i = 0; i < pool.length; i++) { r -= w(pool[i]); if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function plan(weeks, mode, len) {
    var figs = thread ? thread.figs.slice() : [], cards = [];
    weeks.forEach(function (n) {
      var wk = D.weeks[n - 1];
      if (!thread) figs = figs.concat(wk.figs);
      cards = cards.concat(D.cardIds[n] || []);
    });
    if (mode === 'cards') figs = []; if (mode === 'figs') cards = [];
    var today = X.today();
    var due = cards.filter(function (id) { var c = X.S.cards[id]; return c && c.d <= today; }).sort(function (a, b) { return X.S.cards[a].b - X.S.cards[b].b; });
    var fresh = shuffle(cards.filter(function (id) { return !X.S.cards[id]; }));
    var rest = shuffle(cards.filter(function (id) { var c = X.S.cards[id]; return c && c.d > today; }));
    var cardQ = due.concat(fresh, rest);
    var items = [], fpool = figs.slice();
    for (var i = 0; i < len; i++) {
      var wantFig = mode === 'figs' || (mode === 'mix' && i % 2 === 0);
      if ((wantFig || !cardQ.length) && fpool.length) {
        var k = pickWeighted(fpool, figWeight); fpool.splice(fpool.indexOf(k), 1);
        if (!fpool.length) fpool = figs.filter(function (x) { return x !== k; });
        items.push({ kind: 'fig', key: k });
      } else if (cardQ.length) items.push({ kind: 'card', id: cardQ.shift() });
    }
    return items;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- loading a week's figures on demand ---------- */
  var loaded = {};
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('could not load ' + src)); }; document.body.appendChild(s); }); }
  function loadWeek(n) {
    if (!loaded[n]) loaded[n] = loadScript('../assets/predict/week' + n + '/models.js').then(function () { return loadScript('../assets/predict/week' + n + '/figs.js'); });
    return loaded[n];
  }

  /* ---------- the session ---------- */
  var items = [], idx = 0, results = [], settings = null;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var weeks = getWeeks(), mode = form.querySelector('input[name=mode]:checked').value, len = +form.querySelector('input[name=len]:checked').value;
    if (!thread && !weeks.length) { $('rv-msg').textContent = 'Pick at least one week first.'; return; }
    if (!thread && mode === 'figs' && weeks.length === 1 && weeks[0] === 1) { $('rv-msg').textContent = 'Week 1 has no figures. Add a week, or choose cards.'; return; }
    settings = { weeks: weeks, mode: mode, len: len };
    run();
  });
  function run() {
    items = plan(settings.weeks, settings.mode, settings.len);
    if (!items.length) { $('rv-msg').textContent = 'Nothing to review in those weeks yet.'; return; }
    idx = 0; results = [];
    $('setup').hidden = true; $('summary').hidden = true; $('session').hidden = false;
    show();
  }
  $('rv-end').addEventListener('click', finish);
  $('rv-nextbtn').addEventListener('click', function () { idx++; if (idx >= items.length) finish(); else show(); });

  var curFig = null;
  function show() {
    var it = items[idx];
    $('rv-count').textContent = 'Question ' + (idx + 1) + ' of ' + items.length;
    $('rv-prog').style.width = (100 * idx / items.length) + '%';
    var stage = $('rv-stage'), hd = $('rv-hd'), nx = $('rv-next');
    stage.innerHTML = ''; nx.hidden = true; curFig = null;
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (it.kind === 'card') {
      var c = D.cards[it.id];
      hd.style.setProperty('--cu', 'var(--u' + unitOf(c.w) + ')');
      hd.innerHTML = '<span class="wk">Week ' + c.w + ' flashcard</span><a href="week' + c.w + '.html#check">Open week ' + c.w + '</a>';
      XDeck.one(stage, it.id, function (r) {
        results.push({ it: it, label: c.q, r: r });
        idx++; if (idx >= items.length) finish(); else show();
      }, 'Week ' + c.w);
      var b = stage.querySelector('.show'); if (b) b.focus({ preventScroll: true });
      return;
    }
    var f = D.figs[it.key];
    hd.style.setProperty('--cu', 'var(--u' + unitOf(f.week) + ')');
    hd.innerHTML = '<span class="wk">Week ' + f.week + ', figure ' + f.num + '</span><a href="week' + f.week + '.html#' + it.key + '">Read the notes for this figure</a>';
    stage.innerHTML = '<p class="note">Loading the figure.</p>';
    loadWeek(f.week).then(function () {
      var spec = (window['W' + f.week + 'FIGS'] || []).filter(function (s) { return s.key === it.key; })[0];
      if (!spec) throw new Error('no spec ' + it.key);
      stage.innerHTML = '<div id="' + it.key + '" class="mathjax_ignore tex2jax_ignore"></div>';
      var figs = Kit.mount([spec], { films: false, store: 'ec224-w' + f.week + '-predict', board: '#no-board' });
      curFig = figs[it.key];
      curFig.newRound(true);
      if (f.ef) { X.S.viewed[it.key] = 1; X.save(); nextReady('This one has no score: explore it, then go on.'); results.push({ it: it, label: f.num + ' ' + f.topic, s: null, ef: true }); }
      else { $('rv-nextbtn').textContent = 'Skip this one'; $('rv-next').hidden = false; $('rv-nextmsg').textContent = 'Answer on the graph, then reveal.'; }
    }).catch(function (e) {
      stage.innerHTML = '<p class="note">This figure did not load. Check the connection, then go on to the next question.</p>';
      nextReady(''); console.error(e);
    });
  }
  function nextReady(msg) {
    $('rv-nextbtn').textContent = idx + 1 >= items.length ? 'See how it went' : 'Next question';
    $('rv-nextmsg').textContent = msg || '';
    $('rv-next').hidden = false;
  }
  document.addEventListener('kit:tally', function () {
    if (!curFig || D.figs[curFig.id].ef) return;
    var it = items[idx]; if (!it || it.kind !== 'fig') return;
    var s = curFig.result ? curFig.result.total : null;
    var prev = results.filter(function (r) { return r.it === it; })[0];
    if (prev) prev.s = s; else results.push({ it: it, label: D.figs[it.key].num + ' ' + D.figs[it.key].topic, s: s });
    nextReady(s === null ? 'No score this round.' : 'Scored ' + s + '. Explore it, or go on.');
  });

  function finish() {
    $('session').hidden = true;
    var sum = $('summary'); sum.hidden = false;
    var figs = results.filter(function (r) { return r.it.kind === 'fig' && r.s != null; });
    var cards = results.filter(function (r) { return r.it.kind === 'card'; });
    var avg = figs.length ? Math.round(figs.reduce(function (a, r) { return a + r.s; }, 0) / figs.length) : null;
    var got = cards.filter(function (r) { return r.r === 'good'; }).length;
    var line = [];
    if (figs.length) line.push('An average of ' + avg + ' on ' + figs.length + (figs.length === 1 ? ' figure' : ' figures'));
    if (cards.length) line.push(got + ' of ' + cards.length + ' cards known');
    sum.innerHTML = '<div class="summary"><h2>' + (results.length ? 'Review done.' : 'Review ended.') + '</h2>' +
      '<p class="sum-line">' + (line.length ? line.join(', ') + '.' : 'No questions answered this time.') + ' Low scores come back first next time.</p>' +
      (results.length ? '<ol>' + results.map(function (r) {
        var wk = r.it.kind === 'fig' ? D.figs[r.it.key].week : D.cards[r.it.id].w;
        var score = r.it.kind === 'fig' ? (r.s == null ? (r.ef ? 'explored' : 'answer shown') : r.s) : { again: 'again', hard: 'hard', good: 'got it' }[r.r];
        var link = r.it.kind === 'fig' ? 'week' + wk + '.html#' + r.it.key : 'week' + wk + '.html#check';
        return '<li style="--cu:var(--u' + unitOf(wk) + ')"><span class="n">' + (r.it.kind === 'fig' ? D.figs[r.it.key].num : 'Card') + '</span><a href="' + link + '">' + esc(r.it.kind === 'fig' ? D.figs[r.it.key].topic : r.label) + '</a><span class="s">' + score + '</span></li>';
      }).join('') + '</ol>' : '') +
      '<div class="acts" style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" class="btn plum" id="rv-again">Another round</button><button type="button" class="btn line" id="rv-change">Change the weeks</button></div></div>';
    $('rv-again').addEventListener('click', run);
    $('rv-change').addEventListener('click', function () { sum.hidden = true; $('setup').hidden = false; window.scrollTo(0, 0); });
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([sum]).catch(function () {});
    window.scrollTo(0, 0);
    $('rv-again').focus({ preventScroll: true });
  }
})();
