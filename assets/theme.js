/* theme.js — light/dark toggle for the EC224 hub pages (chrome only).
   Runs in <head> (no defer) so the theme is set before first paint. */
(function () {
  var KEY = 'ec224-theme';
  function set(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (!saved) saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  set(saved);

  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.querySelector('.top-bar');
    if (!bar) return;
    var b = document.createElement('button');
    b.className = 'theme-toggle';
    b.type = 'button';
    b.setAttribute('aria-label', 'Toggle light/dark mode');
    var cur = function () { return document.documentElement.getAttribute('data-theme'); };
    b.textContent = cur() === 'dark' ? '☀' : '☾';
    b.addEventListener('click', function () {
      var n = cur() === 'dark' ? 'light' : 'dark';
      set(n);
      b.textContent = n === 'dark' ? '☀' : '☾';
    });
    bar.appendChild(b);
  });
})();
