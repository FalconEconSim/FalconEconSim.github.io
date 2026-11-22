/* live.js: place live equations (tangle.js) into the studio week pages.
 *   StudioLive.place('sec-84', spec, { after: 'figure' | 'prose', kicker: 'Live equation' })
 * Mounting waits for DOMContentLoaded, so KaTeX (deferred on some pages) is ready. */
(function () {
  'use strict';
  var queue = [];
  function mountAll() {
    queue.forEach(function (q) {
      var sec = document.getElementById(q.sec); if (!sec) { console.warn('studio: no section ' + q.sec); return; }
      var wrap = document.createElement('div'); wrap.className = 'studio-live mathjax_ignore tex2jax_ignore';
      var k = document.createElement('p'); k.className = 'studio-live-k'; k.textContent = q.o.kicker || 'Live equation'; wrap.appendChild(k);
      var host = document.createElement('div'); wrap.appendChild(host);
      var anchor = q.o.after === 'prose' ? sec.querySelector('.fig-prose') : (sec.querySelectorAll('.kit-bay')[sec.querySelectorAll('.kit-bay').length - 1] || sec.querySelector('.fig-prose'));
      if (anchor) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      else sec.appendChild(wrap);
      try { Tangle.mount(host, q.spec); } catch (e) { host.textContent = 'Live equation failed: ' + e.message; console.error(e); }
    });
  }
  window.StudioLive = { place: function (sec, spec, o) { queue.push({ sec: sec, spec: spec, o: o || {} }); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else setTimeout(mountAll, 0);
})();
