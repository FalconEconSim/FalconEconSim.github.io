/* EC224 experimental site: shared runtime for every x/ page.
 *  - X.store: progress kept in this browser (localStorage 'ec224x-v1'), never sent anywhere
 *  - figure scores are read from the kit's own per-week stores ('ec224-wN-predict'), so rounds
 *    played on the main site count here too, and the other way round
 *  - the week menu, the sticky week path, lecture videos that load on demand, done ticks
 * Requires window.XDATA (assets/course-data.js). */
(function () {
  'use strict';
  var KEY = 'ec224x-v1';
  var D = window.XDATA || { weeks: [], figs: {}, cards: {} };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var S = load();
  ['done', 'cards', 'viewed'].forEach(function (k) { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: keep in memory */ } }

  function tally(week) { try { return JSON.parse(localStorage.getItem('ec224-w' + week + '-predict')) || {}; } catch (e) { return {}; } }
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }

  function weekOf(n) { for (var i = 0; i < D.weeks.length; i++) if (D.weeks[i].n === n) return D.weeks[i]; return null; }

  /* a figure counts as tried when a round was scored, or (explore-first figures, which have no
     score) when it was opened */
  function figTried(key) {
    var f = D.figs[key]; if (!f) return false;
    var t = tally(f.week)[key];
    return !!(t && t.played) || !!S.viewed[key];
  }
  function cardKnown(id) { var c = S.cards[id]; return !!(c && c.b >= 3); }

  /* progress of one week as parts: [{k, done, total}] and a 0..1 mean */
  function progress(n) {
    var w = weekOf(n); if (!w) return { parts: [], pct: 0, any: false };
    var parts = [];
    if (w.videos.length) parts.push({ k: 'watch', done: w.videos.filter(function (v) { return S.done[v]; }).length, total: w.videos.length });
    if (w.reads.length) parts.push({ k: 'read', done: w.reads.filter(function (r) { return S.done[r]; }).length, total: w.reads.length });
    if (w.figs.length) parts.push({ k: 'figures', done: w.figs.filter(figTried).length, total: w.figs.length });
    var ids = D.cardIds[n] || [];
    if (ids.length) parts.push({ k: 'check', done: ids.filter(cardKnown).length, total: ids.length });
    var pct = 0, any = false;
    parts.forEach(function (p) { pct += p.total ? p.done / p.total : 0; if (p.done) any = true; });
    return { parts: parts, pct: parts.length ? pct / parts.length : 0, any: any };
  }

  function setDone(id, v) { if (v) S.done[id] = 1; else delete S.done[id]; save(); emit(); }
  function emit() { document.dispatchEvent(new CustomEvent('x:progress')); }

  window.X = {
    D: D, S: S, save: save, tally: tally, today: today, weekOf: weekOf, figTried: figTried,
    cardKnown: cardKnown, progress: progress, setDone: setDone, emit: emit,
    remember: function (week, where, label) { S.last = { w: week, at: where || '', label: label || '', t: Date.now() }; save(); }
  };

  /* ---------- week menu (a <details>) ---------- */
  function initMenu() {
    var d = document.querySelector('.weeksel'); if (!d) return;
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; d.querySelector('summary').focus(); } });
  }

  /* ---------- a week page ---------- */
  function initWeek() {
    var root = document.querySelector('[data-week]'); if (!root) return;
    var n = +root.getAttribute('data-week');
    var bar = document.querySelector('.pathbar');
    if (bar) document.documentElement.style.setProperty('--pathbar', bar.offsetHeight + 'px');

    // done ticks (videos, readings)
    document.querySelectorAll('.tick[data-done]').forEach(function (b) {
      var id = b.getAttribute('data-done');
      function paint() { var on = !!S.done[id]; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('.tl').textContent = on ? b.getAttribute('data-on') : b.getAttribute('data-off'); }
      paint();
      b.addEventListener('click', function () { setDone(id, !S.done[id]); paint(); });
    });

    // lecture videos load only when asked for (each is a Kaltura player)
    document.querySelectorAll('[data-play]').forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.closest('li'), box = li.querySelector('.vid-slot');
        if (box.firstChild) { box.innerHTML = ''; b.textContent = 'Play'; b.setAttribute('aria-expanded', 'false'); return; }
        var f = document.createElement('iframe');
        f.src = b.getAttribute('data-play');
        f.title = b.getAttribute('data-title') || 'Lecture video';
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('allow', 'autoplay *; fullscreen *; encrypted-media *');
        f.setAttribute('sandbox', 'allow-downloads allow-forms allow-same-origin allow-scripts allow-top-navigation allow-pointer-lock allow-popups allow-modals allow-orientation-lock allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation');
        var wrap = document.createElement('div'); wrap.className = 'vid-frame'; wrap.appendChild(f);
        box.appendChild(wrap);
        b.textContent = 'Close'; b.setAttribute('aria-expanded', 'true');
        var t = li.querySelector('.tick');
        if (t && !S.done[t.getAttribute('data-done')]) { /* opening is not watching: the tick stays the student's call */ }
      });
    });

    // figure index statuses
    function paintFigs() {
      var t = tally(n);
      document.querySelectorAll('.figindex [data-fig]').forEach(function (el) {
        var k = el.getAttribute('data-fig'), r = t[k], f = D.figs[k];
        if (f && f.ef) { el.textContent = S.viewed[k] ? 'explored' : 'explore'; el.classList.toggle('has', !!S.viewed[k]); return; }
        el.textContent = r && r.played ? 'best ' + r.best : 'not tried';
        el.classList.toggle('has', !!(r && r.played));
      });
    }
    paintFigs();
    document.addEventListener('kit:tally', function () { paintFigs(); emit(); });

    // explore-first figures count as done once a student has had them on screen
    if ('IntersectionObserver' in window) {
      var efo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && e.intersectionRatio > 0.45) { var k = e.target.id; if (!S.viewed[k]) { S.viewed[k] = 1; save(); paintFigs(); emit(); } }
        });
      }, { threshold: [0.45] });
      (D.weeks.filter(function (w) { return w.n === n; })[0] || { figs: [] }).figs.forEach(function (k) {
        if (D.figs[k] && D.figs[k].ef) { var el = document.getElementById(k); if (el) efo.observe(el); }
      });
    }

    // the path bar: counts, current step, current section
    function paintPath() {
      var p = progress(n);
      p.parts.forEach(function (part) {
        var a = document.querySelector('.pathbar a[href="#' + part.k + '"]'); if (!a) return;
        var st = a.querySelector('.st'); if (st) st.textContent = part.done + ' of ' + part.total;
        a.classList.toggle('done', part.total > 0 && part.done >= part.total);
      });
    }
    paintPath();
    document.addEventListener('x:progress', paintPath);

    var links = [].slice.call(document.querySelectorAll('.pathbar a[href^="#"]'));
    var steps = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var secs = [].slice.call(document.querySelectorAll('.fsec[id]'));
    var now = document.querySelector('.pathbar .now');
    var ticking = false, lastSaved = '';
    function onScroll() {
      ticking = false;
      var y = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 60) + (bar ? bar.offsetHeight : 0) + 40;
      var cur = -1;
      steps.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= y) cur = i; });
      links.forEach(function (a, i) {
        var on = i === cur; a.classList.toggle('on', on);
        if (on) { a.setAttribute('aria-current', 'step'); var ol = a.closest('ol'); if (ol.scrollWidth > ol.clientWidth) ol.scrollLeft = Math.max(0, a.parentNode.offsetLeft - 16); }
        else a.removeAttribute('aria-current');
      });
      var sec = null;
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= y + 80) sec = s; });
      var inFigs = cur >= 0 && links[cur].getAttribute('href') === '#figures';
      if (now) now.textContent = inFigs && sec ? sec.getAttribute('data-title') : '';
      var where = inFigs && sec ? sec.id : (cur >= 0 ? links[cur].getAttribute('href').slice(1) : '');
      var label = inFigs && sec ? sec.getAttribute('data-title') : (cur >= 0 ? links[cur].querySelector('.lb').textContent : '');
      if (where && where !== lastSaved) { lastSaved = where; window.X.remember(n, where, label); }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener('resize', function () { if (bar) document.documentElement.style.setProperty('--pathbar', bar.offsetHeight + 'px'); onScroll(); });
    onScroll();
    if (!S.last || S.last.w !== n) window.X.remember(n, '', '');
  }

  function start() { initMenu(); initWeek(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
