/* Flashcards with spaced repetition (a five-box Leitner schedule), kept in X.S.cards.
 *  Again:  box 0, back in this session a few cards later
 *  Hard:   box 1, due tomorrow
 *  Got it: up one box (a new card goes straight to box 2), due after 0/1/2/4/8/16 days by box
 * A card counts as known from box 2. Card text is the live site's decks, unchanged.
 * XDeck.mount(root, ids, opts)   a whole deck session (week pages)
 * XDeck.one(root, id, done)      one card, then done(rating) (review mode) */
(function () {
  'use strict';
  var GAP = [0, 1, 2, 4, 8, 16];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function typeset(el) { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([el]).catch(function () {}); }
  function card(id) { return X.D.cards[id]; }
  function rec(id) { return X.S.cards[id]; }

  function rate(id, r) {
    var c = X.S.cards[id] || { b: 0, d: 0, n: 0 };
    if (r === 'again') c.b = 0;
    else if (r === 'hard') c.b = Math.max(1, Math.min(c.b, 1));
    else c.b = c.n === 0 && c.b === 0 ? 2 : Math.min(5, c.b + 1);
    c.d = X.today() + (r === 'again' ? 0 : r === 'hard' ? 1 : GAP[c.b]);
    c.n++;
    X.S.cards[id] = c; X.save(); X.emit();
    return c;
  }
  function due(id) { var c = rec(id); return !c || c.d <= X.today(); }

  var TYPES = { 'Def': 'Definition', 'Eq': 'Equation', 'T/F': 'True or false', 'TF': 'True or false', 'Graph': 'Graph', 'Mistake': 'Common mistake', 'Concept': 'Concept', 'Formula': 'Formula', 'App': 'Application' };

  /* draw one card into el; calls onRate(r) */
  function face(el, id, onRate, meta) {
    var c = card(id);
    el.innerHTML =
      '<div class="card" role="group" aria-label="Flashcard">' +
        '<p class="card-meta"><span class="wk">' + esc(meta || ('Week ' + c.w)) + '</span><span>' + esc(TYPES[c.type] || c.type || '') + '</span></p>' +
        '<p class="card-q">' + esc(c.q) + '</p>' +
        '<div class="card-a" hidden>' + esc(c.a) + '</div>' +
        '<div class="card-act">' +
          '<button type="button" class="btn show">Show the answer</button>' +
          '<div class="rate" hidden role="group" aria-label="How did you do?">' +
            '<button type="button" class="btn again" data-r="again">Again</button>' +
            '<button type="button" class="btn hard" data-r="hard">Hard</button>' +
            '<button type="button" class="btn plum" data-r="good">Got it</button>' +
          '</div>' +
          '<span class="hint">Space shows the answer. 1, 2, 3 rate it.</span>' +
        '</div>' +
      '</div>';
    var show = el.querySelector('.show'), a = el.querySelector('.card-a'), rt = el.querySelector('.rate');
    function reveal() { a.hidden = false; show.hidden = true; rt.hidden = false; rt.querySelector('.plum').focus({ preventScroll: true }); }
    show.addEventListener('click', reveal);
    rt.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) onRate(b.getAttribute('data-r')); });
    el._key = function (e) {
      if (e.target.closest('input, textarea, select')) return;
      if ((e.key === ' ' || e.key === 'Enter') && !show.hidden && document.activeElement === document.body) { e.preventDefault(); reveal(); }
      else if (!rt.hidden && /^[123]$/.test(e.key)) onRate(['again', 'hard', 'good'][+e.key - 1]);
    };
    typeset(el);
    return { reveal: reveal, show: show };
  }

  function mount(root, ids, opts) {
    opts = opts || {};
    var top = root.querySelector('.deck-top'), barEl = root.querySelector('.deck-bar'), stage = root.querySelector('.deck-stage');
    var queue = [], all = false, seen = 0, active = false;
    function stats() {
      var known = 0, learning = 0, dueN = 0;
      ids.forEach(function (id) { var c = rec(id); if (c && c.b >= 2) known++; else if (c) learning++; if (due(id)) dueN++; });
      return { known: known, learning: learning, due: dueN, total: ids.length };
    }
    function paintTop() {
      var s = stats();
      top.innerHTML = '<span class="known"><b>' + s.known + '</b> of ' + s.total + ' known</span>' +
        '<span><b>' + s.due + '</b> to review today</span>' + (queue.length && active ? '<span><b>' + queue.length + '</b> left in this round</span>' : '');
      barEl.innerHTML = '<span class="k" style="width:' + (100 * s.known / s.total) + '%"></span><span class="l" style="width:' + (100 * s.learning / s.total) + '%"></span>';
    }
    function build(everything) {
      all = !!everything;
      var d = ids.filter(function (id) { return rec(id) && due(id); }).sort(function (a, b) { return rec(a).b - rec(b).b; });
      var fresh = ids.filter(function (id) { return !rec(id); });
      queue = all ? ids.slice() : d.concat(fresh);
    }
    function next() {
      paintTop();
      if (!queue.length) return finish();
      active = true;
      var id = queue.shift();
      face(stage, id, function (r) {
        rate(id, r); seen++;
        if (r === 'again') queue.splice(Math.min(3, queue.length), 0, id);
        next();
        var q = stage.querySelector('.show'); if (q) q.focus({ preventScroll: true });
      }, opts.meta);
      paintTop();
    }
    function finish() {
      active = false;
      var s = stats(), later = ids.map(rec).filter(Boolean).map(function (c) { return c.d; }).filter(function (d) { return d > X.today(); });
      var soon = later.length ? Math.min.apply(null, later) - X.today() : 0;
      stage.innerHTML = '<div class="deck-done"><h3>' + (seen ? 'Round done.' : 'Nothing due today.') + '</h3>' +
        '<p>You know ' + s.known + ' of ' + s.total + ' cards in this deck.' + (soon ? ' The next ones come back in ' + soon + (soon === 1 ? ' day' : ' days') + '.' : '') +
        ' Cards you know come back less often; cards you miss come back sooner.</p>' +
        '<button type="button" class="btn line all">Go through all ' + s.total + ' cards anyway</button></div>';
      stage.querySelector('.all').addEventListener('click', function () { build(true); seen = 0; next(); });
      paintTop();
    }
    document.addEventListener('keydown', function (e) { if (stage._key && stage.contains(document.activeElement) || (stage._key && document.activeElement === document.body && inView(stage))) stage._key(e); });
    function inView(el) { var r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }
    document.addEventListener('x:progress', function () { if (!active) paintTop(); });
    build(false);
    if (!queue.length) finish(); else next();
  }

  function one(root, id, done, meta) {
    var f = face(root, id, function (r) { rate(id, r); document.removeEventListener('keydown', key); done(r); }, meta);
    function key(e) { if (root._key) root._key(e); }
    document.addEventListener('keydown', key);
    return f;
  }

  window.XDeck = { mount: mount, one: one, rate: rate, due: due, TYPES: TYPES };
})();
