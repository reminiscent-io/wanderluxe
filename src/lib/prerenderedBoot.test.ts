import { afterEach, describe, expect, it, vi } from 'vitest';

// The module reads #root and the path once, at import time, so each case sets
// the page up first and then imports a fresh copy.
async function boot(path: string, rootHtml: string) {
  window.history.replaceState(null, '', path);
  document.body.innerHTML = `<div id="root">${rootHtml}</div>`;
  vi.resetModules();
  return import('./prerenderedBoot');
}

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('prerenderedBoot', () => {
  it('reports the landing page as prerendered when #root already holds markup', async () => {
    const mod = await boot('/', '<main><h1>Plan the trip together.</h1></main>');
    expect(mod.arrivedPrerendered('/')).toBe(true);
  });

  it('is false for a different page than the one the visitor landed on', async () => {
    const mod = await boot('/explore', '<main></main>');
    expect(mod.arrivedPrerendered('/')).toBe(false);
  });

  it('is false when #root is empty (dev server, or a route that was not prerendered)', async () => {
    const mod = await boot('/', '');
    expect(mod.arrivedPrerendered('/')).toBe(false);
  });

  it('ignores whitespace in an otherwise empty #root', async () => {
    const mod = await boot('/', '\n  ');
    expect(mod.arrivedPrerendered('/')).toBe(false);
  });

  it('turns off once the landing page has mounted, so a later visit animates', async () => {
    const mod = await boot('/', '<main></main>');
    mod.markPrerenderedMounted();
    expect(mod.arrivedPrerendered('/')).toBe(false);
  });
});
