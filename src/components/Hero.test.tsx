import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ session: null as object | null }) }));
vi.mock('./LogoFromSupabase', () => ({ default: () => <span>WanderLuxe</span> }));
vi.mock('./UnsplashImage', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

const boot = vi.hoisted(() => ({ prerendered: false, markPrerenderedMounted: vi.fn() }));
vi.mock('@/lib/prerenderedBoot', () => ({
  arrivedPrerendered: (path: string) => boot.prerendered && path === '/',
  markPrerenderedMounted: boot.markPrerenderedMounted,
}));

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

// Framer writes an `initial` state to inline style on the first render.
function hiddenElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[style]')).filter(
    (el) => el.style.opacity === '0',
  );
}

describe('Hero entrance', () => {
  beforeEach(() => {
    boot.markPrerenderedMounted.mockClear();
  });

  it('fades in on a normal mount', () => {
    boot.prerendered = false;
    const { container } = renderHero();
    expect(hiddenElements(container).length).toBeGreaterThan(0);
  });

  it('starts fully visible when it replaces the prerendered hero, so nothing blanks', () => {
    boot.prerendered = true;
    const { container } = renderHero();
    expect(hiddenElements(container)).toEqual([]);
    expect(screen.getByRole('heading', { name: 'Plan the trip together.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Start planning, free' })).toBeVisible();
  });

  it('marks the prerendered landing as consumed once mounted', () => {
    boot.prerendered = true;
    renderHero();
    expect(boot.markPrerenderedMounted).toHaveBeenCalledTimes(1);
  });
});
