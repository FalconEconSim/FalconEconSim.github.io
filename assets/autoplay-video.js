/* autoplay-video.js - start figure animations by themselves, no click needed.
 *
 * Opt in per video:
 *     <video data-autoplay controls playsinline preload="metadata"> ... </video>
 *
 * Behaviour:
 *   - Plays when the video scrolls into view, pauses when it scrolls out.
 *     "Autoplay on page load" would fire every animation at once, including the
 *     ones far below the fold, so a student scrolling down would arrive at a
 *     figure whose animation already finished without them. Playing on entry
 *     means the animation starts exactly when they get to it, which is what
 *     "just starts playing" actually needs to mean on a long page.
 *   - Muted. Browsers block autoplay with sound, so an unmuted autoplay would
 *     simply never start. These are silent Manim renders, so nothing is lost.
 *   - If the student pauses, scrubs, or otherwise takes control, this stops
 *     managing that video for the rest of the page's life. Their intent wins.
 *   - Respects prefers-reduced-motion: no autoplay at all, controls stay, the
 *     student can still play it deliberately.
 *   - Rewinds to the start when a video that never finished scrolls back into
 *     view, so a half-seen animation replays from the top rather than resuming
 *     mid-story. A finished video stays finished.
 *
 * Self-contained, no deps. Safe to include on pages with no videos.
 */
(function () {
  'use strict';

  function init() {
    var vids = document.querySelectorAll('video[data-autoplay]');
    if (!vids.length) return;

    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    vids.forEach(function (v) {
      // Required for autoplay to be allowed at all, and for iOS to not go
      // fullscreen. Set as properties, not attributes, so they apply even if
      // the markup forgot them.
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');

      if (reduce) return; // leave it entirely under student control

      // Once the student takes control, stop auto-managing this video.
      var released = false;
      function release() { released = true; }

      /* Our own pause()/currentTime writes also fire 'pause'/'seeking', and we
         must not mistake those for the student taking control. The events are
         delivered asynchronously, so a flag cleared right after the call is
         already gone by the time the handler runs. Each self-inflicted event is
         therefore counted here and decremented by the handler that consumes it. */
      var selfPause = 0, selfSeek = 0;

      v.addEventListener('pause', function () {
        if (selfPause > 0) { selfPause--; return; }
        release();
      });
      v.addEventListener('seeking', function () {
        if (selfSeek > 0) { selfSeek--; return; }
        release();
      });
      v.addEventListener('volumechange', function () { if (!v.muted) release(); });

      if (!('IntersectionObserver' in window)) return;

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (released) return;
          if (e.isIntersecting) {
            // Replay from the top if it never got to finish.
            if (!v.ended && v.currentTime > 0 && v.paused) {
              selfSeek++;
              try { v.currentTime = 0; } catch (_) { selfSeek--; }
            }
            var p = v.play();
            // Autoplay can still be refused. Not worth surfacing: controls are
            // right there. But a refusal must not count as the student pausing,
            // or the video could never start.
            if (p && p.catch) p.catch(function () {});
          } else if (!v.paused) {
            selfPause++;
            v.pause();
          }
        });
      }, { threshold: 0.5 });

      io.observe(v);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
