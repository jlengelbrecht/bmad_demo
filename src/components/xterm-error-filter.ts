/**
 * Inline `<head>` script that suppresses xterm 5.x's init-race error
 * before Next.js's dev runtime can surface it in the error overlay.
 *
 * Why inline-head: `terminal-pane.tsx` (where xterm is instantiated) is
 * loaded via `next/dynamic({ ssr: false })`, which means any listener
 * registered from that module evaluates AFTER Next.js's dev runtime has
 * already wired its own `addEventListener("error")` handler. Capture-
 * phase listeners fire in registration order, so Next intercepts first.
 *
 * Inline-head injection runs synchronously before any JS bundle —
 * including Next's runtime — so our listener is first and can call
 * `stopImmediatePropagation()` to keep Next's overlay quiet.
 *
 * The filter is intentionally narrow: it requires "dimensions" in the
 * message AND ("_innerRefresh" or "Viewport") in the stack, so a real
 * bug that happens to mention "dimensions" still surfaces normally.
 *
 * This module is plain TS (no `"use client"`) so it can be imported
 * directly into the root server layout without crossing a client
 * boundary for a single string constant.
 */
/*
 * Three channels covered, in order of likelihood the dev overlay hooks them:
 *   (1) `window.addEventListener('error', ..., true)` — capture-phase listener
 *   (2) `window.onerror` slot — assignment-based; intercepted via property
 *       descriptor so any later assignment by Next's runtime gets WRAPPED,
 *       not replaced (our handler still fires first, suppresses, and
 *       conditionally delegates to whatever was assigned next).
 *   (3) `window.addEventListener('unhandledrejection', ...)` — RAF errors
 *       in some browser/library combos surface as rejected promises.
 *
 * The script logs `[xterm-filter] installed` to console on load so we can
 * confirm injection from devtools.
 */
// Note: NO `//` line comments inside the script body — the
// whitespace-collapse `.replace` below would turn any `//` into a
// "rest-of-file" comment after newlines are stripped. Block comments
// (/* ... */) are safe because they have explicit closers. The script
// body is intentionally comment-free; documentation lives here.
export const XTERM_ERROR_FILTER_SCRIPT = `
(function(){
try {
  function isXtermRace(stack, message) {
    var s = String(stack || '');
    var m = String(message || '');
    return m.indexOf('dimensions') >= 0 &&
      (s.indexOf('_innerRefresh') >= 0 || s.indexOf('Viewport') >= 0);
  }
  window.addEventListener('error', function(ev) {
    var stack = (ev.error && ev.error.stack) || '';
    var msg = (ev.error && ev.error.message) || ev.message || '';
    if (isXtermRace(stack, msg)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(ev) {
    var r = ev.reason || {};
    if (isXtermRace(r.stack, r.message)) ev.preventDefault();
  });
  var assigned = null;
  function ourHandler(message, source, lineno, colno, error) {
    var stack = (error && error.stack) || '';
    var msg = (error && error.message) || message || '';
    if (isXtermRace(stack, msg)) return true;
    if (typeof assigned === 'function') {
      return assigned.call(this, message, source, lineno, colno, error);
    }
    return false;
  }
  try {
    Object.defineProperty(window, 'onerror', {
      configurable: true,
      get: function() { return ourHandler; },
      set: function(h) { assigned = h; }
    });
  } catch (e) { /* some browsers reject redefining onerror */ }
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[xterm-filter] installed');
  }
} catch(e) { /* suppression is best-effort */ }
})();
`.replace(/\s+/g, ' ').trim();
