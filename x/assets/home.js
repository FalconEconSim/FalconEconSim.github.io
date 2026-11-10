/* Home: the "pick up where you left off" block and each week's progress, from this browser only. */
(function () {
  'use strict';
  var D = X.D;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function paintTiles() {
    document.querySelectorAll('[data-prog]').forEach(function (el) {
      var n = +el.getAttribute('data-prog'), p = X.progress(n);
      if (!p.any) return;
      el.classList.add('started');
      el.querySelector('i').style.width = Math.round(p.pct * 100) + '%';
      var fig = p.parts.filter(function (x) { return x.k === 'figures'; })[0];
      var card = p.parts.filter(function (x) { return x.k === 'check'; })[0];
      el.querySelector('.tl').textContent = Math.round(p.pct * 100) + '% done' + (fig ? ', ' + fig.done + ' of ' + fig.total + ' figures' : card ? ', ' + card.done + ' of ' + card.total + ' cards' : '');
    });
  }

  function paintResume() {
    var L = X.S.last, box = document.getElementById('resume');
    if (!box || !L || !L.w) return;
    var w = X.weekOf(L.w); if (!w) return;
    var p = X.progress(L.w), next = null;
    // the first step of that week that is not finished
    p.parts.forEach(function (part) { if (!next && part.done < part.total) next = part; });
    var where = L.at ? '#' + L.at : '';
    var label = L.label ? 'You were at ' + esc(L.label) + '.' : '';
    var nextTxt = next ? ' Next up: ' + { watch: 'the lecture videos', read: 'the reading', figures: 'the figures', check: 'the flashcards' }[next.k] + ' (' + next.done + ' of ' + next.total + ' done).' : ' Every part of this week is done.';
    box.innerHTML = '<p class="k">Pick up where you left off</p><h2>Week ' + w.n + ': ' + esc(w.title) + '</h2><p>' + label + nextTxt + '</p>' +
      '<div class="acts"><a class="btn plum" href="week' + w.n + '.html' + where + '">Continue week ' + w.n + '</a>' +
      (w.n < 12 && !next ? '<a class="btn line" href="week' + (w.n + 1) + '.html">Go to week ' + (w.n + 1) + '</a>' : '') + '</div>';
  }

  function paintPrep() {
    var el = document.getElementById('prep-stat'); if (!el) return;
    var tried = 0, total = 0, due = 0;
    Object.keys(D.figs).forEach(function (k) { total++; if (X.figTried(k)) tried++; });
    Object.keys(X.S.cards).forEach(function (id) { if (X.S.cards[id].d <= X.today()) due++; });
    if (!tried && !due) return;
    el.innerHTML = 'So far you have tried <b>' + tried + ' of ' + total + '</b> figures' + (due ? ' and have <b>' + due + '</b> cards due' : '') + '.';
  }

  paintTiles(); paintResume(); paintPrep();
})();
