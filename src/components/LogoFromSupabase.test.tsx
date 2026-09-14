import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LogoFromSupabase from './LogoFromSupabase';

describe('LogoFromSupabase', () => {
  // A static render runs no effects, so this is the markup a browser lays out
  // (and the prerenderer writes) before the PNG has arrived. If the box is not
  // reserved here, the logo's full height lands as a layout shift on load.
  it("reserves a known logo's box on the very first render", () => {
    const html = renderToStaticMarkup(
      <LogoFromSupabase logoName="White Full" className="h-auto w-[300px]" />,
    );

    expect(html).toContain('<img');
    expect(html).toContain('aspect-ratio:1563 / 1563');
    expect(html).not.toContain('animate-pulse');
  });

  it('keeps the aspect ratio of the wide wordmarks', () => {
    const html = renderToStaticMarkup(
      <LogoFromSupabase logoName="Sand Simple" className="h-8 object-contain" />,
    );

    expect(html).toContain('aspect-ratio:1416 / 238');
  });
});
