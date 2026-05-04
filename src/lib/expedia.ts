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

const EG_WIDGETS_BASE = 'https://creator.expediagroup.com/products/widgets';

export interface ExpediaWidgetIframeUrlOptions {
  widget: 'search';
  program: string;
  lobs: string;
  network: string;
  camref: string;
  pubref: string;
  instance: string;
}

const EG_WIDGETS_CSS = `${EG_WIDGETS_BASE}/assets/eg-widgets.css`;

let stylesPromise: Promise<void> | null = null;

export function loadExpediaWidgetStyles(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link.eg-widgets-style',
  );
  // Reuse the in-flight/resolved promise only if the link is still in the DOM.
  // (Tests, or external code, may remove the link; in that case we re-create.)
  if (stylesPromise !== null && existing !== null) return stylesPromise;
  // Stale link from a previous failed load — drop it before re-trying.
  if (existing) existing.remove();
  stylesPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.className = 'eg-widgets-style';
    link.rel = 'stylesheet';
    link.href = EG_WIDGETS_CSS;
    link.onload = () => resolve();
    link.onerror = () => {
      stylesPromise = null;
      reject(new Error(`Failed to load eg-widgets.css`));
    };
    document.head.appendChild(link);
  });
  return stylesPromise;
}

export function buildExpediaWidgetIframeUrl(
  opts: ExpediaWidgetIframeUrlOptions,
): string {
  const params = new URLSearchParams();
  const entries: Array<[string, string]> = [
    ['program', opts.program],
    ['lobs', opts.lobs],
    ['network', opts.network],
    ['camref', opts.camref],
    ['pubref', opts.pubref],
    ['instance', opts.instance],
  ];
  for (const [k, v] of entries) {
    if (v !== '') params.set(k, v);
  }
  return `${EG_WIDGETS_BASE}/${opts.widget}-widget?${params.toString()}`;
}

export interface ExpediaWidgetOptions {
  container: HTMLElement;
  camref: string;
  pubref: string;
  widget?: 'search';
  program?: string;
  lobs?: string;
  network?: string;
  onError?: (err: Error) => void;
}

const EG_WIDGETS_ORIGIN = new URL(EG_WIDGETS_BASE).origin;

interface EgResizeMessage {
  type: 'eg-widget/resize';
  meta?: { instance?: string };
  payload?: { frame?: { style?: { width?: string; height?: string } } };
}

function isEgResizeMessage(value: unknown): value is EgResizeMessage {
  if (typeof value !== 'object' || value === null) return false;
  return (value as { type?: unknown }).type === 'eg-widget/resize';
}

function generateInstanceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function mountExpediaWidget(opts: ExpediaWidgetOptions): () => void {
  const {
    container,
    camref,
    pubref,
    widget = 'search',
    program = 'us-expedia',
    lobs = 'stays,flights',
    network = 'pz',
    onError,
  } = opts;

  const instance = generateInstanceId();

  const iframe = document.createElement('iframe');
  iframe.className = `eg-widget-frame eg-${widget}-widget-frame`;
  iframe.src = buildExpediaWidgetIframeUrl({
    widget,
    program,
    lobs,
    network,
    camref,
    pubref,
    instance,
  });
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.margin = 'auto';
  iframe.style.border = 'none';
  iframe.title = 'Expedia hotel and flight search';
  container.classList.add('eg-widget', `eg-${widget}-widget`);
  container.appendChild(iframe);

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== EG_WIDGETS_ORIGIN) return;
    if (!isEgResizeMessage(event.data)) return;
    if (event.data.meta?.instance !== instance) return;
    const style = event.data.payload?.frame?.style;
    if (style?.width) iframe.style.width = style.width;
    if (style?.height) iframe.style.height = style.height;
  };
  window.addEventListener('message', handleMessage);

  loadExpediaWidgetStyles().catch((err) => {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  });

  return () => {
    window.removeEventListener('message', handleMessage);
    iframe.remove();
  };
}
