import { useEffect } from 'react';

/**
 * Loads a design's Google Fonts pairing. The preconnect matters here: the
 * whole document is a type specimen, so a late stylesheet shows it in
 * fallback faces first.
 */
export function useGoogleFonts(googleQuery: string | null) {
  useEffect(() => {
    if (!googleQuery) return;
    const nodes: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, crossOrigin?: string) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      nodes.push(link);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', '');
    add('stylesheet', `https://fonts.googleapis.com/css2?${googleQuery}&display=swap`);
    return () => {
      for (const node of nodes) node.remove();
    };
  }, [googleQuery]);
}
