import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrintStudioShowcase from './PrintStudioShowcase';

vi.mock('../print-showcase/ShowcaseStage', () => ({
  default: () => <div data-testid="showcase-stage" />,
}));

const renderSection = () =>
  render(
    <MemoryRouter>
      <PrintStudioShowcase />
    </MemoryRouter>
  );

describe('PrintStudioShowcase', () => {
  it('puts its heading and pitch in the static markup, for prerendering and SEO', () => {
    renderSection();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/print studio/i)).toBeInTheDocument();
  });

  it('is linkable from the pricing section', () => {
    const { container } = renderSection();
    expect(container.querySelector('#print-studio')).toBeTruthy();
  });

  it('holds the stage’s space without mounting it until it is near the screen', () => {
    renderSection();
    // jsdom's IntersectionObserver never fires, which is exactly the
    // "not scrolled there yet" case.
    expect(screen.queryByTestId('showcase-stage')).not.toBeInTheDocument();
    expect(screen.getByTestId('showcase-placeholder')).toBeInTheDocument();
  });

  it('offers a way in without stealing the page’s one sunset button', () => {
    renderSection();
    const cta = screen.getByRole('link', { name: /try it on your trip/i });
    expect(cta).toHaveAttribute('href', '/auth?mode=signup');
    expect(cta.className).not.toMatch(/sunset/);
  });
});
