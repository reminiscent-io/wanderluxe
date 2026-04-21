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

// Idempotent loader — safe to call on every BookingView mount. Resolves
// immediately if the script tag is already in the document. The widget's
// auto-scan runs on insertion of `.eg-widget` elements, so no explicit
// re-init API is needed for SPA remounts.
export function loadExpediaWidgetScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (document.querySelector('script.eg-widgets-script')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.className = 'eg-widgets-script';
    s.src = 'https://creator.expediagroup.com/products/widgets/assets/eg-widgets.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('eg-widgets load failed'));
    document.head.appendChild(s);
  });
}
