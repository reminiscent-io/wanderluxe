// Pure helpers for scripts/prerender.ts, kept apart so vitest can run them
// under jsdom without launching a browser.

/**
 * Prerender serves every route from dist/index.html, the SPA shell. Rendering
 * `/` overwrites that file with the home page, head tags included, so every
 * route rendered after it inherited the home page's og:title, description and
 * JSON-LD ahead of its own, and link-preview crawlers read the first one. `/`
 * goes last so every other route boots from the pristine shell.
 */
export function orderRoutesForPrerender(routes: string[]): string[] {
  return [...routes.filter((r) => r !== '/'), ...routes.filter((r) => r === '/')];
}

/** Identity of a head tag a crawler reads one of: two with the same key compete. */
function headKey(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'title') return 'title';
  if (tag === 'meta') {
    const property = el.getAttribute('property');
    if (property) return `property:${property}`;
    const name = el.getAttribute('name');
    if (name) return `name:${name}`;
  }
  if (tag === 'link' && el.getAttribute('rel') === 'canonical') return 'canonical';
  return null;
}

/**
 * Settle the head before it is written out. index.html carries a fallback
 * <title> and description marked `data-shell`; once the page renders its own
 * (React 19 hoists them into <head> beside the shell's), the shell copy goes.
 *
 * Returns the keys still duplicated afterwards. Those mean two components
 * emitted the same tag, a bug to fix at the source, so nothing here picks a
 * winner for them.
 */
export function settleHeadTags(doc: Document): string[] {
  const groups = new Map<string, Element[]>();
  for (const el of Array.from(doc.head.children)) {
    const key = headKey(el);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), el]);
  }

  const duplicates: string[] = [];
  for (const [key, els] of groups) {
    const own = els.filter((el) => !el.hasAttribute('data-shell'));
    if (own.length > 0) {
      for (const el of els) if (el.hasAttribute('data-shell')) el.remove();
    }
    if (own.length > 1) duplicates.push(key);
  }
  return duplicates;
}
