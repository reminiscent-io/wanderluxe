import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssistantDock from './AssistantDock';

describe('AssistantDock', () => {
  it('renders children in the docked column when open in docked mode', () => {
    render(
      <AssistantDock open mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('lg:w-[42%]');
    expect(dock.className).not.toContain('fixed');
    expect(screen.queryByRole('button', { name: /open trip assistant/i })).not.toBeInTheDocument();
  });

  it('renders a fixed bottom-right overlay when open in overlay mode', () => {
    render(
      <AssistantDock open mode="overlay" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('fixed');
    expect(dock.className).toContain('z-40');
    expect(dock.className).not.toContain('lg:w-[42%]');
  });

  it('hides the wrapper but keeps children mounted when collapsed, and shows the floating button', () => {
    const onOpen = vi.fn();
    render(
      <AssistantDock open={false} mode="docked" onOpen={onOpen}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    // Children stay mounted (state preservation) — only CSS-hidden.
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    const fab = screen.getByRole('button', { name: /open trip assistant/i });
    fireEvent.click(fab);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('preserves the same child DOM node across collapse/expand and mode switches', () => {
    const { rerender } = render(
      <AssistantDock open mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    const node = screen.getByTestId('panel');
    rerender(
      <AssistantDock open={false} mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    rerender(
      <AssistantDock open mode="overlay" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    expect(screen.getByTestId('panel')).toBe(node);
  });
});
