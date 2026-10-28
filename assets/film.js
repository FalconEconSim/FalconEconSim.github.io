/* film.js - the small controls under each animated film (.film).
 *
 *   <figure class="film">
 *     <div class="film-frame"><video data-autoplay ...></video></div>
 *     <figcaption>
 *       ...
 *       <div class="film-ctl">
 *         <button type="button" data-film="replay">Replay</button>
 *         <span class="film-rates">
 *           <button type="button" data-rate="0.5">0.5x</button> ...
 *         </span>
 *       </div>
 *     </figcaption>
 *   </figure>
 *
 * Speed buttons set the video's playbackRate and mark themselves pressed.
 * Replay rewinds and plays. Autoplay itself is assets/autoplay-video.js.
 * Self-contained, no deps.
 */
(function () {
  'use strict';

  function init() {
    document.querySelectorAll('.film').forEach(function (film) {
      var v = film.querySelector('video');
      if (!v) return;
      var rates = film.querySelectorAll('[data-rate]');

      function mark() {
        rates.forEach(function (b) {
          b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === v.playbackRate));
        });
      }

      rates.forEach(function (b) {
        b.addEventListener('click', function () {
          v.playbackRate = Number(b.dataset.rate);
          v.defaultPlaybackRate = v.playbackRate;
        });
      });
      v.addEventListener('ratechange', mark);
      mark();

      var replay = film.querySelector('[data-film="replay"]');
      if (replay) replay.addEventListener('click', function () {
        v.currentTime = 0;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
