// ─── CODE PANEL TOGGLE ───────────────────────────────────────────────────────
function initCodeToggles() {
  document.querySelectorAll('.code-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const visible = target.classList.toggle('visible');
      btn.classList.toggle('open', visible);
      btn.querySelector('.arrow').textContent = visible ? '▶' : '▶';
    });
  });
}

// ─── ACTIVE SIDEBAR LINK ON SCROLL ───────────────────────────────────────────
function initScrollSpy() {
  const sections = document.querySelectorAll('.section-block[id]');
  const links = document.querySelectorAll('.sidebar nav a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const a = document.querySelector(`.sidebar nav a[href="#${e.target.id}"]`);
        if (a) a.classList.add('active');
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  sections.forEach(s => observer.observe(s));
}

// ─── PYODIDE SETUP ────────────────────────────────────────────────────────────
let pyodideReady = false;
let pyodideInstance = null;
let pyodideLoadPromise = null;

async function getPyodide() {
  if (pyodideReady) return pyodideInstance;
  if (pyodideLoadPromise) return pyodideLoadPromise;
  pyodideLoadPromise = (async () => {
    pyodideInstance = await loadPyodide();
    pyodideReady = true;
    return pyodideInstance;
  })();
  return pyodideLoadPromise;
}

async function runPythonCode(code, outputEl) {
  outputEl.textContent = '⏳ Loading Python runtime…';
  outputEl.className = 'code-output pyodide-loading';
  try {
    const py = await getPyodide();
    outputEl.textContent = '⏳ Running…';
    // Capture stdout
    py.runPython(`
import sys, io
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture
`);
    try {
      py.runPython(code);
      const out = py.runPython(`_stdout_capture.getvalue()`);
      outputEl.textContent = out || '✓ Ran successfully (no output)';
      outputEl.className = 'code-output';
    } catch (err) {
      outputEl.textContent = '✗ ' + err.message;
      outputEl.className = 'code-output error';
    } finally {
      py.runPython(`sys.stdout = sys.__stdout__`);
    }
  } catch (err) {
    outputEl.textContent = '✗ Failed to load Python: ' + err.message;
    outputEl.className = 'code-output error';
  }
}

function initRunButtons() {
  document.querySelectorAll('.code-run-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const editorId = btn.dataset.editor;
      const outputId = btn.dataset.output;
      const editor = document.getElementById(editorId);
      const output = document.getElementById(outputId);
      if (!editor || !output) return;
      await runPythonCode(editor.value, output);
    });
  });
}

// ─── INIT ALL ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCodeToggles();
  initScrollSpy();
  initRunButtons();
});
