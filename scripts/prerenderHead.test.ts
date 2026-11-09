import { describe, expect, it } from 'vitest';
import { orderRoutesForPrerender, settleHeadTags } from './prerenderHead';

function docWithHead(head: string): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html><head>${head}</head><body></body></html>`,
    'text/html',
  );
}

const SHELL = `
  <title data-shell>WanderLuxe: Free Collaborative Trip Planner</title>
  <meta data-shell name="description" content="Generic site description">
`;

describe('orderRoutesForPrerender', () => {
  it('renders / last so later routes never boot from the prerendered home page', () => {
    expect(
      orderRoutesForPrerender(['/', '/explore', '/guide', '/explore/6-days-in-tokyo']),
    ).toEqual(['/explore', '/guide', '/explore/6-days-in-tokyo', '/']);
  });

  it('leaves the list alone when / is absent', () => {
    expect(orderRoutesForPrerender(['/explore', '/guide'])).toEqual(['/explore', '/guide']);
  });
});

describe('settleHeadTags', () => {
  it('drops the shell title and description once the page renders its own', () => {
    const doc = docWithHead(`
      <title>6 Days in Tokyo Itinerary | WanderLuxe</title>
      ${SHELL}
      <meta name="description" content="Tokyo, day by day">
      <meta property="og:title" content="6 Days in Tokyo Itinerary | WanderLuxe">
    `);

    expect(settleHeadTags(doc)).toEqual([]);
    expect(Array.from(doc.querySelectorAll('title')).map((t) => t.textContent)).toEqual([
      '6 Days in Tokyo Itinerary | WanderLuxe',
    ]);
    const descriptions = doc.querySelectorAll('meta[name="description"]');
    expect(descriptions).toHaveLength(1);
    expect(descriptions[0].getAttribute('content')).toBe('Tokyo, day by day');
    expect(doc.querySelectorAll('[data-shell]')).toHaveLength(0);
  });

  it('keeps the shell tags on a page that renders none of its own', () => {
    const doc = docWithHead(SHELL);
    expect(settleHeadTags(doc)).toEqual([]);
    expect(doc.querySelectorAll('[data-shell]')).toHaveLength(2);
  });

  it('reports, without resolving, tags two components both emitted', () => {
    // The shape of the original bug: the home page's tags baked into the shell
    // ahead of the trip page's.
    const doc = docWithHead(`
      ${SHELL}
      <meta property="og:title" content="WanderLuxe: Free Collaborative Trip Planner | WanderLuxe">
      <meta name="twitter:title" content="WanderLuxe: Free Collaborative Trip Planner | WanderLuxe">
      <meta property="og:title" content="6 Days in Tokyo Itinerary | WanderLuxe">
      <meta name="twitter:title" content="6 Days in Tokyo Itinerary | WanderLuxe">
    `);

    expect(settleHeadTags(doc)).toEqual(['property:og:title', 'name:twitter:title']);
    expect(doc.querySelectorAll('meta[property="og:title"]')).toHaveLength(2);
  });

  it('ignores tags that legitimately repeat', () => {
    const doc = docWithHead(`
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com">
      <script type="application/ld+json">{}</script>
      <script type="application/ld+json">{}</script>
    `);
    expect(settleHeadTags(doc)).toEqual([]);
    expect(doc.head.children).toHaveLength(4);
  });
});
