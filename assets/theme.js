/* theme.js: the site is fixed light. This file enforces that and explains why.
 *
 * WHAT WAS BROKEN
 * This script used to read prefers-color-scheme and stamp data-theme="dark" on
 * <html> before first paint, then look for a `.top-bar` element to hang a
 * toggle button on. Two things went wrong:
 *
 *   1. `.top-bar` is v1 chrome. Every migrated page uses `.topbar` (no hyphen),
 *      so the toggle was never injected on any page a student can reach. Dark
 *      mode could be turned on by the operating system and could not be turned
 *      off by anyone.
 *   2. The dark block in shared.css redefines only v1 tokens (--white, --text,
 *      --accent...). Not one v2 token (--paper, --ink, --unit, --rule2) has a
 *      dark value. So on a machine set to dark, the page background stayed
 *      cream while the v1-styled navigation flipped to #15171c with #6ea0ff
 *      links: a black panel with bright blue text over a cream page, with the
 *      sub-items at #9aa3b2 on near-black. Confirmed in the browser.
 *
 * WHY FIXED LIGHT RATHER THAN A WORKING TOGGLE
 * A correct dark mode here is not a token swap. Every figure is drawn on white
 * with colour literals in canvas and JSXGraph calls (var() is invalid in
 * ctx.fillStyle, which is why DESIGN.md section 9 records 89 of them being
 * restored to literals). Dark mode means a full second v2 palette AND a second
 * pass over every figure's ink, verified for contrast. That is its own piece of
 * work, and half of it shipped is worse than none of it.
 *
 * This is a decision, not a deferral dressed up as one: a course reader whose
 * content is diagrams printed on white has a real reason for a fixed light
 * theme (antislop R-21 asks for a reason, and this is it). When dark mode is
 * built properly, it replaces this file.
 *
 * Runs in <head> with no defer so the attribute is settled before first paint.
 */
(function () {
  var STALE_KEY = 'ec224-theme';

  // Defensive: strip any data-theme, including one stamped by an older cached
  // copy of this script, so the dead v1 dark block can never match.
  document.documentElement.removeAttribute('data-theme');

  // Drop the stale preference so a future, correct implementation starts from a
  // clean slate rather than inheriting a value the user never chose.
  try { localStorage.removeItem(STALE_KEY); } catch (e) {}
})();
