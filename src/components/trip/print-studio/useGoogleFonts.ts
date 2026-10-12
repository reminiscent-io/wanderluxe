import { useEffect, useState } from 'react';

/**
 * How long the Print button waits on the type. Past this the edition prints
 * in its fallback faces rather than not at all (a blocked fonts.gstatic.com
 * must not strand the button).
 */
export const FONT_WAIT_MS = 6000;

/**
 * Every face a css2 query declares, as FontFaceSet.load() shorthands.
 * "family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Marcellus" gives
 * '400 16px "Fraunces"', '600 16px "Fraunces"' and '400 16px "Marcellus"'.
 */
export function fontFacesFor(googleQuery: string): string[] {
  return googleQuery.split('&').flatMap((part) => {
    const [rawName, axes] = part.replace(/^family=/, '').split(':');
    const name = rawName.replace(/\+/g, ' ');
    const [axisNames = '', tuples = ''] = (axes ?? '').split('@');
    const wght = axisNames.split(',').indexOf('wght');
    if (wght < 0) return [`400 16px "${name}"`];
    return tuples.split(';').map((tuple) => `${tuple.split(',')[wght]} 16px "${name}"`);
  });
}

/**
 * Loads a design's Google Fonts pairing, and reports when its faces are in.
 * The preconnect matters here: the whole document is a type specimen, so a
 * late stylesheet shows it in fallback faces first.
 *
 * The flag exists for printing. The browser lays the page out once for print
 * with whatever faces it has at that moment, so a Print pressed before the
 * pairing arrives commits the fallback stack to paper, at different metrics
 * and so different page breaks.
 */
export function useGoogleFonts(googleQuery: string | null): boolean {
  const [readyQuery, setReadyQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!googleQuery) return;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      setReadyQuery(googleQuery);
    };
    const nodes: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, crossOrigin?: string) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      nodes.push(link);
      return link;
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', '');
    const sheet = add('stylesheet', `https://fonts.googleapis.com/css2?${googleQuery}&display=swap`);

    // Ask for each declared face outright rather than trusting fonts.ready
    // alone: right after the sheet lands, layout may not have requested
    // anything yet, and ready resolves on an idle set. ready then covers the
    // subsets layout asked for on its own (latin-ext for a "Zürich").
    sheet.addEventListener('load', () => {
      if (!document.fonts) return settle();
      Promise.all(fontFacesFor(googleQuery).map((face) => document.fonts.load(face)))
        .then(() => document.fonts.ready)
        .catch((): void => undefined)
        .then(settle);
    });
    sheet.addEventListener('error', settle);
    const timer = window.setTimeout(settle, FONT_WAIT_MS);

    return () => {
      done = true;
      window.clearTimeout(timer);
      for (const node of nodes) node.remove();
    };
  }, [googleQuery]);

  return googleQuery !== null && readyQuery === googleQuery;
}
