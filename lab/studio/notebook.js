/* notebook.js: a small Python notebook for the EC224 studio (dev), running in the browser with Pyodide.
 *
 * Source format: a plain .py file in Jupyter's "percent" format (it opens in VS Code, JupyterLab with
 * jupytext, and converts to .ipynb), so a notebook is one readable text file:
 *
 *   # %% [markdown]                       a prose cell: "# " lines, Markdown with $math$
 *   # %% tags=["setup"]                   helper code, run first and folded away
 *   # %% tags=["knobs"]                   numbers you can drag. Lines are   name = 10  # label [min, max, step]
 *                                         and an optional first line   # knobs: Demand is P = {a} - {b}Q
 *                                         In Jupyter this is just a cell of assignments.
 *   # %%                                  a code cell students can edit and run
 *
 * Running: the notebook runs top to bottom once Python is ready. Running a cell (Shift+Enter or its button)
 * also re-runs every cell below it, so what you see never depends on the order you clicked in. Dragging a
 * knob re-runs everything below the knobs as you drag (the marimo idea, kept simple).
 * Edits are kept in this browser only (localStorage); Reset puts a cell back.
 */
(function () {
  'use strict';
  var PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var root = document.getElementById('nb'); if (!root) return;
  var src = root.getAttribute('data-src'), key = 'ec224-studio-nb:' + src;
  var status = document.getElementById('nb-status');
  var cells = [], py = null, G = null, running = false, pending = null;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function say(t, kind) { if (status) { status.textContent = t; status.className = 'nb-status' + (kind ? ' ' + kind : ''); } }
  function load() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
  function save() { try { var o = {}; cells.forEach(function (c, i) { if (c.cm && c.cm.getValue() !== c.src) o[i] = c.cm.getValue(); }); localStorage.setItem(key, JSON.stringify(o)); } catch (e) {} }

  /* ---------- parse the percent format ---------- */
  function parse(text) {
    var out = [], cur = null;
    text.replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
      var m = line.match(/^# %%(.*)$/);
      if (m) {
        var h = m[1], kind = /\[markdown\]/.test(h) ? 'md' : 'code', tags = (h.match(/tags=\[([^\]]*)\]/) || [, ''])[1];
        if (/"setup"/.test(tags)) kind = 'setup'; else if (/"knobs"/.test(tags)) kind = 'knobs';
        cur = { kind: kind, tags: tags, lines: [], title: (h.replace(/\[markdown\]|tags=\[[^\]]*\]/g, '').trim()) }; out.push(cur); return;
      }
      if (cur) cur.lines.push(line);
    });
    return out.map(function (c) {
      var s = c.lines.join('\n').replace(/^\n+|\n+$/g, '');
      if (c.kind === 'md') s = s.split('\n').map(function (l) { return l.replace(/^# ?/, ''); }).join('\n');
      return { kind: c.kind, src: s, title: c.title, show: /"show"/.test(c.tags || '') };
    }).filter(function (c) { return c.src.trim() || c.kind === 'code'; });
  }

  /* ---------- a small Markdown renderer (headings, lists, quotes, code, bold, links, $math$) ---------- */
  // code spans and math are set aside first, so a "**" in code or a "$5" price can't be misread.
  // $...$ is math only when the opening $ is not followed by a space or a digit and the closing $ has no
  // space before it and no digit after it (pandoc's rule), so "costs $5 and $7" stays money.
  function inline(s) {
    var keep = [];
    function stash(html) { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; }
    function tex(m, disp) {
      if (!window.katex) return esc(m);
      try { return katex.renderToString(m, { displayMode: disp, throwOnError: false }); } catch (e) { return esc(m); }
    }
    s = s.replace(/`([^`]+)`/g, function (_, c) { return stash('<code>' + esc(c) + '</code>'); });
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function (_, m) { return stash(tex(m, true)); });
    s = s.replace(/\$(?![\s\d])([^$\n]*?[^\s$])\$(?!\d)/g, function (_, m) { return stash(tex(m, false)); });
    s = esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, n) { return keep[+n]; });
  }
  function md(text) {
    // a heading line is its own block even without blank lines around it
    var html = '', blocks = text.replace(/^(#{1,4}\s.*)$/gm, '\n$1\n').split(/\n\s*\n/).filter(function (b) { return b.trim(); });
    blocks.forEach(function (b) {
      b = b.replace(/^\n+|\n+$/g, '');
      var lines = b.split('\n'), h = b.match(/^(#{1,4})\s+(.*)$/);
      if (h && lines.length === 1) { var n = Math.min(4, h[1].length + 1); html += '<h' + n + '>' + inline(h[2]) + '</h' + n + '>'; return; }
      if (/^\$\$/.test(b.trim())) { html += '<div class="nb-dmath">' + inline(b.trim()) + '</div>'; return; }
      if (lines.every(function (l) { return /^\s*[-*] /.test(l) || /^\s{2,}\S/.test(l); })) {
        html += '<ul>' + b.split(/\n(?=\s*[-*] )/).map(function (li) { return '<li>' + inline(li.replace(/^\s*[-*] /, '')) + '</li>'; }).join('') + '</ul>'; return;
      }
      if (lines.every(function (l) { return /^\s*\d+\. /.test(l) || /^\s{2,}\S/.test(l); })) {
        html += '<ol>' + b.split(/\n(?=\s*\d+\. )/).map(function (li) { return '<li>' + inline(li.replace(/^\s*\d+\. /, '')) + '</li>'; }).join('') + '</ol>'; return;
      }
      if (lines.every(function (l) { return /^>/.test(l); })) {
        var q = lines.map(function (l) { return l.replace(/^> ?/, ''); }).join('\n'), lab = q.match(/^\*\*([^*]+)\*\*\s*/);
        html += '<aside class="nb-try">' + inline(q) + '</aside>'; return;
      }
      html += '<p>' + inline(b) + '</p>';
    });
    return html;
  }

  /* ---------- knobs: "name = 10  # label [min, max, step]" ---------- */
  function parseKnobs(s) {
    var params = {}, prose = null, order = [];
    s.split('\n').forEach(function (l) {
      var k = l.match(/^#\s*knobs:\s*(.*)$/); if (k) { prose = k[1]; return; }
      var m = l.match(/^(\w+)\s*=\s*(-?[\d.]+)\s*(?:#\s*([^\[]*?)\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*\]\s*(\$|%)?)?\s*$/);
      if (!m) return;
      var p = { value: +m[2], label: (m[3] || m[1]).trim(), min: m[4] != null ? +m[4] : +m[2] - 10, max: m[5] != null ? +m[5] : +m[2] + 10, step: m[6] != null ? +m[6] : 1 };
      if (m[7] === '$') p.pre = '$'; if (m[7] === '%') p.post = '%';
      params[m[1]] = p; order.push(m[1]);
    });
    if (!prose) prose = order.map(function (n) { return params[n].label + ' {' + n + '}'; }).join(', ');
    return { params: params, prose: prose, order: order };
  }

  /* ---------- build the page ---------- */
  function build(list) {
    var saved = load();
    list.forEach(function (c, i) {
      c.i = i;
      if (c.kind === 'md') { var m = el('div', 'nb-md'); m.innerHTML = md(c.src); root.appendChild(m); c.node = m; return; }
      var box = el('section', 'nb-cell nb-' + c.kind); root.appendChild(box); c.node = box;
      if (c.kind === 'knobs') {
        var K = parseKnobs(c.src); c.knobs = K;
        var host = el('div', 'nb-knobs'); box.appendChild(host);
        var tip = el('p', 'nb-knob-tip', 'Drag a plum number sideways, or click it to type. Every cell below re-runs as you drag.'); box.appendChild(tip);
        var code = el('details', 'nb-knob-code', '<summary>As Python</summary><pre></pre>'); box.appendChild(code);
        function showCode(v) { code.querySelector('pre').textContent = K.order.map(function (n) { return n + ' = ' + v[n]; }).join('\n'); }
        c.values = {}; K.order.forEach(function (n) { c.values[n] = K.params[n].value; });
        Tangle.mount(host, { title: c.title || 'Knobs', params: K.params, prose: K.prose,
          onChange: function (v, k) { K.order.forEach(function (n) { c.values[n] = v[n]; }); showCode(v); schedule(i, k ? [k] : K.order.slice()); } });
        showCode(c.values);
        return;
      }
      var bar = el('div', 'nb-bar');
      var label = el('span', 'nb-label', c.kind === 'setup' ? 'Setup' : (c.title || 'Python'));
      var run = el('button', 'nb-run', '<span aria-hidden="true">&#9654;</span> Run'); run.type = 'button';
      run.title = 'Run this cell and the ones below it (Shift+Enter)';
      var rst = el('button', 'nb-rst', 'Reset'); rst.type = 'button'; rst.hidden = true;
      bar.appendChild(label); bar.appendChild(rst); bar.appendChild(run);
      if (c.kind === 'setup') {
        var det = el('details', 'nb-setup'); det.appendChild(el('summary', null, 'Setup code: imports, plot style and the answer checks. Open to read it.'));
        box.appendChild(det); det.appendChild(bar); var ed0 = el('div', 'nb-ed'); det.appendChild(ed0); c.edHost = ed0;
      } else {
        box.appendChild(bar); var ed = el('div', 'nb-ed');
        // long cells (mostly plotting) fold their code away and lead with the output, as marimo does; tags=["show"] keeps one open
        var n = c.src.split('\n').length;
        if (c.kind === 'code' && n > 24 && !c.show) {
          var fold = el('details', 'nb-fold'); fold.appendChild(el('summary', null, 'Show the code (' + n + ' lines)')); fold.appendChild(ed); box.appendChild(fold);
          fold.addEventListener('toggle', function () { if (fold.open && c.cm) c.cm.refresh(); });
          box.classList.add('folded');
        } else box.appendChild(ed);
        c.edHost = ed;
      }
      c.out = el('div', 'nb-out'); c.out.setAttribute('aria-live', 'polite'); box.appendChild(c.out);
      var start = saved[i] != null ? saved[i] : c.src;
      c.cm = CodeMirror(c.edHost, { value: start, mode: 'python', lineNumbers: false, lineWrapping: true, indentUnit: 4, viewportMargin: Infinity,
        extraKeys: { 'Shift-Enter': function () { schedule(i); }, 'Ctrl-Enter': function () { schedule(i); }, 'Cmd-Enter': function () { schedule(i); },
          Tab: function (cm) { cm.execCommand(cm.somethingSelected() ? 'indentMore' : 'insertSoftTab'); } } });
      c.cm.on('change', function () { rst.hidden = c.cm.getValue() === c.src; box.classList.add('edited'); save(); });
      rst.hidden = start === c.src;
      run.addEventListener('click', function () { schedule(i); });
      rst.addEventListener('click', function () { c.cm.setValue(c.src); save(); schedule(i); });
    });
  }

  /* ---------- running ---------- */
  var HELPER = [
    'import ast, io, sys, json, base64, traceback, contextlib',
    'import matplotlib',
    'matplotlib.use("Agg")',
    'import matplotlib.pyplot as plt',
    'G = {"__name__": "__main__"}',
    'def _nb_run(src):',
    '    out = io.StringIO(); res = None; err = None',
    '    plt.close("all")',
    '    try:',
    '        tree = ast.parse(src, "<cell>")',
    '        last = None',
    '        if tree.body and isinstance(tree.body[-1], ast.Expr):',
    '            last = ast.Expression(tree.body.pop().value)',
    '        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):',
    '            exec(compile(tree, "<cell>", "exec"), G)',
    '            if last is not None:',
    '                v = eval(compile(last, "<cell>", "eval"), G)',
    '                if v is not None and not hasattr(v, "figure") and not (isinstance(v, list) and v and hasattr(v[0], "figure")):',
    '                    res = repr(v)',
    '    except SyntaxError as e:',
    '        err = "line %s: %s\\n%s" % (e.lineno, (e.text or "").rstrip(), "SyntaxError: " + str(e.msg))',
    '    except Exception as e:',
    '        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "<cell>"]',
    '        where = ("line %d: %s\\n" % (frames[-1].lineno, src.split("\\n")[frames[-1].lineno - 1].strip())) if frames else ""',
    '        err = where + type(e).__name__ + ": " + str(e)',
    '    figs = []',
    '    for n in plt.get_fignums():',
    '        b = io.StringIO(); plt.figure(n).savefig(b, format="svg", bbox_inches="tight", transparent=True); figs.append(b.getvalue())',
    '    plt.close("all")',
    '    return json.dumps({"out": out.getvalue(), "res": res, "err": err, "figs": figs})',
    // what a cell defines and reads, for knob drags (marimo-style: re-run only what depends on the knob)
    'def _nb_deps(src):',
    '    try:',
    '        tree = ast.parse(src)',
    '    except SyntaxError:',
    '        return json.dumps({"defs": [], "uses": [], "funcs": {}, "bad": True})',
    '    defs, uses, funcs = set(), set(), {}',
    '    for node in tree.body:',
    '        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):',
    '            defs.add(node.name)',
    '            funcs[node.name] = sorted({n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)})',
    '            continue',
    '        for n in ast.walk(node):',
    '            if isinstance(n, ast.Name):',
    '                (defs if isinstance(n.ctx, (ast.Store, ast.Del)) else uses).add(n.id)',
    '            elif isinstance(n, (ast.Import, ast.ImportFrom)):',
    '                for a in n.names: defs.add((a.asname or a.name).split(".")[0])',
    '            elif isinstance(n, (ast.FunctionDef, ast.Lambda)):',
    '                pass',
    '    return json.dumps({"defs": sorted(defs), "uses": sorted(uses), "funcs": funcs})',
  ].join('\n');

  // pending = { from: cell index, names: null (re-run everything from there) or [knob names] (only what depends on them) }
  function schedule(from, names) {
    var p = { from: from, names: names || null };
    if (pending) {
      if (pending.names && p.names && pending.from === p.from) p.names = pending.names.concat(p.names.filter(function (n) { return pending.names.indexOf(n) < 0; }));
      else p = { from: Math.min(pending.from, p.from), names: null };
    }
    pending = p;
    if (!py) { say('Python is still starting. Your cell will run when it is ready.'); return; }
    if (!running) setTimeout(drain, 0);
  }
  var depCache = {};
  function deps(src) { if (!depCache[src]) depCache[src] = JSON.parse(py.globals.get('_nb_deps')(src)); return depCache[src]; }
  function drain() {
    if (pending == null) return;
    var job = pending; pending = null; running = true;
    var first = job.from, dirty = job.names ? new Set(job.names) : null, funcs = {};
    if (dirty) cells.forEach(function (c) { if (c.cm) { var d = deps(c.cm.getValue()); for (var f in d.funcs) funcs[f] = d.funcs[f]; } });
    // a cell depends on a name if it reads it, or calls a function (defined anywhere) whose body reads it
    function touches(d) {
      var seen = new Set(), stack = d.uses.slice();
      while (stack.length) { var n = stack.pop(); if (seen.has(n)) continue; seen.add(n); if (dirty.has(n)) return true; if (funcs[n]) stack.push.apply(stack, funcs[n]); }
      return false;
    }
    if (!dirty) cells.forEach(function (c) { if (c.i >= first && c.node) c.node.classList.add('stale'); });
    var t0 = performance.now(), ran = 0;
    (function step(i) {
      if (pending != null && pending.from < first) { running = false; return drain(); }   // a re-run from earlier is waiting: start over there
      if (i >= cells.length) { running = false; say((dirty ? 'Updated ' + ran + (ran === 1 ? ' cell' : ' cells') : 'Ran') + ' in ' + Math.round(performance.now() - t0) + ' ms', 'ok'); if (pending != null) drain(); return; }
      var c = cells[i];
      c.node && c.node.classList.remove('stale');
      if (c.kind === 'knobs') { Object.keys(c.values).forEach(function (n) { G.set(n, c.values[n]); }); return step(i + 1); }
      if (c.kind === 'md') return step(i + 1);
      if (dirty) {
        var d = deps(c.cm.getValue());
        if (!d.bad && !touches(d)) return step(i + 1);          // nothing it reads has changed: keep its output
        d.defs.forEach(function (n) { dirty.add(n); });
      }
      ran++;
      var r = JSON.parse(py.globals.get('_nb_run')(c.cm.getValue()));
      show(c, r);
      if (r.err) { for (var j = i + 1; j < cells.length; j++) if (cells[j].node) cells[j].node.classList.add('stale'); running = false; say('Stopped at an error. Fix the cell and run it again.', 'err'); if (pending != null) drain(); return; }
      setTimeout(function () { step(i + 1); }, 0);
    })(first);
  }
  function show(c, r) {
    var o = c.out; o.innerHTML = '';
    if (r.out) {
      var pre = el('pre', 'nb-stdout');
      pre.innerHTML = esc(r.out.replace(/\n$/, '')).replace(/^(✓.*)$/gm, '<span class="nb-ok">$1</span>').replace(/^(✗.*|Not yet.*)$/gm, '<span class="nb-no">$1</span>');
      o.appendChild(pre);
    }
    r.figs.forEach(function (s) { var f = el('div', 'nb-fig'); f.innerHTML = s.replace(/^[\s\S]*?(<svg)/, '$1'); var svg = f.querySelector('svg'); if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('role', 'img'); } o.appendChild(f); });
    if (r.res != null) o.appendChild(el('pre', 'nb-res', esc(r.res)));
    if (r.err) o.appendChild(el('pre', 'nb-err', esc(r.err)));
    o.hidden = !o.childNodes.length;
  }

  /* ---------- downloads: .py as written, and a Jupyter .ipynb built from the cells ---------- */
  function ipynb() {
    var nb = { nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, cells: [] };
    cells.forEach(function (c) {
      var s = c.cm ? c.cm.getValue() : c.src;
      var lines = s.split('\n').map(function (l, i, a) { return l + (i < a.length - 1 ? '\n' : ''); });
      if (c.kind === 'md') nb.cells.push({ cell_type: 'markdown', metadata: {}, source: lines });
      else nb.cells.push({ cell_type: 'code', metadata: c.kind === 'code' ? {} : { tags: [c.kind] }, execution_count: null, outputs: [],
        source: c.kind === 'knobs' ? Object.keys(c.values).map(function (n, i, a) { return n + ' = ' + c.values[n] + '  # ' + c.knobs.params[n].label + (i < a.length - 1 ? '\n' : ''); }) : lines });
    });
    return JSON.stringify(nb, null, 1);
  }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  document.querySelectorAll('[data-nb]').forEach(function (b) {
    b.addEventListener('click', function () {
      var base = src.split('/').pop().replace(/\.py$/, '');
      var what = b.getAttribute('data-nb');
      if (what === 'ipynb') download(base + '.ipynb', ipynb(), 'application/x-ipynb+json');
      else if (what === 'reset') { try { localStorage.removeItem(key); } catch (e) {} cells.forEach(function (c) { if (c.cm) c.cm.setValue(c.src); }); schedule(0); }
      else if (what === 'runall') schedule(0);
    });
  });

  /* ---------- start ---------- */
  fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
    cells = parse(text); build(cells);
    say('Starting Python in your browser. The first visit downloads about 15 MB; after that it is cached.');
    var s = document.createElement('script'); s.src = PYODIDE + 'pyodide.js';
    s.onload = function () {
      loadPyodide({ indexURL: PYODIDE }).then(function (p) {
        say('Loading numpy and matplotlib.');
        return p.loadPackage(['numpy', 'matplotlib']).then(function () { return p; });
      }).then(function (p) {
        p.runPython(HELPER); py = p; G = p.globals.get('G');
        say('Python is ready.', 'ok'); root.classList.add('ready');
        schedule(0);
      }).catch(function (e) { say('Python could not start: ' + e.message, 'err'); });
    };
    s.onerror = function () { say('Could not download Python (are you offline?). You can still read the notebook and download it.', 'err'); };
    document.head.appendChild(s);
  }).catch(function (e) { say('Could not load the notebook file (' + e.message + ').', 'err'); });
})();
