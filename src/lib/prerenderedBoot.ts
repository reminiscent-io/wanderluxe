// The build prerenders the public routes to static HTML (scripts/prerender.ts),
// so a visitor sees the finished page before any JavaScript runs. main.tsx then
// mounts with createRoot, which throws that HTML away and renders the page
// again from scratch. An entrance fade on that first mount blanks content the
// visitor was already looking at and fades it back in: the page reads as
// loading twice, with a white flash between.
//
// This module is read at import time, before main.tsx reaches createRoot, so
// anything inside #root can only be the prerendered markup.
const root = typeof document === 'undefined' ? null : document.getElementById('root');
const bootPath = typeof window === 'undefined' ? null : window.location.pathname;
let pending = Boolean(root && root.children.length > 0);

/**
 * True while `path` is the page the visitor landed on and its prerendered HTML
 * is still the thing on screen. Components use it to start their first mount
 * at the end state of an entrance animation instead of replaying it.
 */
export function arrivedPrerendered(path: string): boolean {
  return pending && bootPath === path;
}

/** Call once the landing page has mounted: a later visit animates normally. */
export function markPrerenderedMounted(): void {
  pending = false;
}
