import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageThumbnail from './PageThumbnail';

describe('PageThumbnail', () => {
  it('renders its document even when no ResizeObserver callback ever fires', () => {
    render(
      <PageThumbnail label="Preview of this trip">
        <p>Ten Days in Tokyo</p>
      </PageThumbnail>
    );
    expect(screen.getByText('Ten Days in Tokyo')).toBeInTheDocument();
  });

  it('describes itself to assistive tech and hides the rendered page from it', () => {
    const { container } = render(
      <PageThumbnail label="Preview of this trip">
        <p>Ten Days in Tokyo</p>
      </PageThumbnail>
    );
    expect(screen.getByText('Preview of this trip')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('lays the page out at its natural width, scaled from the top left', () => {
    const { container } = render(
      <PageThumbnail label="Preview" pageWidth={736}>
        <p>x</p>
      </PageThumbnail>
    );
    const page = container.querySelector('[data-testid="thumb-page"]') as HTMLElement;
    expect(page.style.width).toBe('736px');
    expect(page.style.transformOrigin).toBe('top left');
  });
});
