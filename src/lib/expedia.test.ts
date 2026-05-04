import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildExpediaWidgetIframeUrl, loadExpediaWidgetStyles, mountExpediaWidget } from './expedia';

describe('buildExpediaWidgetIframeUrl', () => {
  it('builds the search-widget URL with all params and instance', () => {
    const url = buildExpediaWidgetIframeUrl({
      widget: 'search',
      program: 'us-expedia',
      lobs: 'stays,flights',
      network: 'pz',
      camref: '1101l5IQx5',
      pubref: 'booking_page_widget',
      instance: 'abc123',
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://creator.expediagroup.com');
    expect(parsed.pathname).toBe('/products/widgets/search-widget');
    expect(parsed.searchParams.get('program')).toBe('us-expedia');
    expect(parsed.searchParams.get('lobs')).toBe('stays,flights');
    expect(parsed.searchParams.get('network')).toBe('pz');
    expect(parsed.searchParams.get('camref')).toBe('1101l5IQx5');
    expect(parsed.searchParams.get('pubref')).toBe('booking_page_widget');
    expect(parsed.searchParams.get('instance')).toBe('abc123');
  });

  it('omits empty params (optional or required)', () => {
    const url = buildExpediaWidgetIframeUrl({
      widget: 'search',
      program: '',
      lobs: '',
      network: 'pz',
      camref: 'x',
      pubref: 'y',
      instance: 'z',
    });
    const params = new URL(url).searchParams;
    expect(params.has('lobs')).toBe(false);
    expect(params.has('program')).toBe(false);
    expect(params.has('camref')).toBe(true);
  });
});

describe('loadExpediaWidgetStyles', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link.eg-widgets-style').forEach((n) => n.remove());
  });

  it('injects exactly one stylesheet link, even when called twice', async () => {
    const p1 = loadExpediaWidgetStyles();
    const p2 = loadExpediaWidgetStyles();
    // Resolve the link load synchronously in jsdom by firing onload manually.
    document
      .head
      .querySelectorAll<HTMLLinkElement>('link.eg-widgets-style')
      .forEach((l) => l.dispatchEvent(new Event('load')));
    await Promise.all([p1, p2]);
    const links = document.head.querySelectorAll('link.eg-widgets-style');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('rel')).toBe('stylesheet');
    expect(links[0].getAttribute('href')).toBe(
      'https://creator.expediagroup.com/products/widgets/assets/eg-widgets.css',
    );
  });

  it('rejects when the link errors', async () => {
    const p = loadExpediaWidgetStyles();
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('error'));
    await expect(p).rejects.toThrow(/eg-widgets.css/);
  });
});

describe('mountExpediaWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    document.head.querySelectorAll('link.eg-widgets-style').forEach((n) => n.remove());
  });

  it('appends an iframe to the container with widget URL', async () => {
    const container = document.getElementById('container')!;
    const cleanup = mountExpediaWidget({
      container,
      camref: 'CAM',
      pubref: 'PUB',
    });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();

    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    const u = new URL(iframe.src);
    expect(u.pathname).toBe('/products/widgets/search-widget');
    expect(u.searchParams.get('camref')).toBe('CAM');
    expect(u.searchParams.get('pubref')).toBe('PUB');
    expect(u.searchParams.get('instance')).toBeTruthy();

    cleanup();
    expect(container.querySelector('iframe.eg-widget-frame')).toBeNull();
  });

  it('resizes the iframe on a valid postMessage', async () => {
    const container = document.getElementById('container')!;
    mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();
    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    const instance = new URL(iframe.src).searchParams.get('instance')!;

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://creator.expediagroup.com',
        data: {
          type: 'eg-widget/resize',
          meta: { instance },
          payload: { frame: { style: { width: '100%', height: '420px' } } },
        },
      }),
    );

    expect(iframe.style.width).toBe('100%');
    expect(iframe.style.height).toBe('420px');
  });

  it('ignores postMessages from other origins', async () => {
    const container = document.getElementById('container')!;
    mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();
    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    const instance = new URL(iframe.src).searchParams.get('instance')!;
    const before = iframe.style.height;

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: 'eg-widget/resize',
          meta: { instance },
          payload: { frame: { style: { width: '100%', height: '999px' } } },
        },
      }),
    );

    expect(iframe.style.height).toBe(before);
  });

  it('rejects via onError callback when CSS load fails', async () => {
    const container = document.getElementById('container')!;
    const onError = vi.fn();
    mountExpediaWidget({ container, camref: 'C', pubref: 'P', onError });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('error'));
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalled();
  });

  it('ignores resize messages for a different instance', async () => {
    const container = document.getElementById('container')!;
    mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    document
      .head
      .querySelector<HTMLLinkElement>('link.eg-widgets-style')!
      .dispatchEvent(new Event('load'));
    await Promise.resolve();
    const iframe = container.querySelector('iframe.eg-widget-frame') as HTMLIFrameElement;
    const before = iframe.style.height;

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://creator.expediagroup.com',
        data: {
          type: 'eg-widget/resize',
          meta: { instance: 'some-other-instance' },
          payload: { frame: { style: { width: '100%', height: '999px' } } },
        },
      }),
    );

    expect(iframe.style.height).toBe(before);
  });

  it('cleanup is idempotent', () => {
    const container = document.getElementById('container')!;
    const cleanup = mountExpediaWidget({ container, camref: 'C', pubref: 'P' });
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });
});
