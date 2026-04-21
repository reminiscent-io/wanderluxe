// Expedia Group affiliate (Partnerize network) configuration and helpers.
//
// Two camrefs: the widget embed carries its own campaign code
// (`EXPEDIA_WIDGET_CAMREF`), while direct deep-links (e.g. the "Book on
// Expedia" button on AI chat hotel cards) are tagged with the Partnerize
// affiliate ID (`EXPEDIA_PARTNERIZE_CAMREF`).

export const EXPEDIA_WIDGET_CAMREF = '1101l5IQx5';
export const EXPEDIA_PARTNERIZE_CAMREF = '1011l429118';
export const EXPEDIA_FALLBACK_URL =
  'https://expedia.com/affiliates/wanderluxe_travel/wanderluxe';

export function buildExpediaHotelSearchUrl(opts: {
  name: string;
  address?: string;
  pubref: string;
}): string {
  const destination = [opts.name, opts.address].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    destination,
    camref: EXPEDIA_PARTNERIZE_CAMREF,
    pubref: opts.pubref,
  });
  return `https://www.expedia.com/Hotel-Search?${params.toString()}`;
}

export function trackExpediaClick(
  pubref: string,
  extra?: Record<string, unknown>,
): void {
  window.gtag?.('event', 'expedia_click', {
    event_category: 'Affiliate',
    event_label: pubref,
    ...extra,
  });
}

const EG_WIDGETS_SRC =
  'https://creator.expediagroup.com/products/widgets/assets/eg-widgets.js';

// Injects the Expedia widget script as a sibling AFTER the given `.eg-widget`
// node and resolves once loaded. The upstream copy-paste embed places the
// script directly next to the widget div, so the script reads
// `document.currentScript` / nearby siblings to locate and initialize it —
// injecting the script in `document.head` doesn't work in a SPA.
//
// Any previously-loaded copies of the script are removed first so the browser
// re-executes it on every BookingView mount, forcing a fresh scan of the DOM.
export function loadExpediaWidgetScript(anchor: Element): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  document.querySelectorAll('script.eg-widgets-script').forEach((s) => s.remove());
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.className = 'eg-widgets-script';
    s.src = EG_WIDGETS_SRC;
    // Match the upstream copy-paste embed (no async attribute). Dynamically
    // inserted scripts are async-by-default; opting out keeps the execution
    // order predictable and preserves `document.currentScript` in browsers
    // that don't set it for async scripts.
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Expedia widget script'));
    anchor.insertAdjacentElement('afterend', s);
  });
}
