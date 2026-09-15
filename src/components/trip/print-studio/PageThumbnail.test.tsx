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
    // The label should be accessible to screen readers
    const label = screen.getByText('Preview of this trip');
    expect(label).toBeInTheDocument();

    // Neither the label nor any ancestor of it may be aria-hidden — an
    // own-attribute check alone would miss the whole tree (label included)
    // being wrapped in aria-hidden="true".
    expect(label.closest('[aria-hidden="true"]')).toBeNull();

    // The rendered page should be inside an aria-hidden="true" subtree
    const page = container.querySelector('[data-testid="thumb-page"]');
    expect(page?.closest('[aria-hidden="true"]')).toBeTruthy();
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
