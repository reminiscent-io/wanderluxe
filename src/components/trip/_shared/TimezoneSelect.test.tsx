import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import TimezoneSelect from './TimezoneSelect';

beforeAll(() => {
  // cmdk + Radix need these in jsdom
  Element.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  // cmdk's CommandList calls `new ResizeObserver(...)` directly; the global
  // jsdom setup mocks it with an arrow-function implementation, which isn't
  // constructable and throws under cmdk's usage. Override with a real class.
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
});

describe('TimezoneSelect', () => {
  it('shows the current value on the trigger', () => {
    render(<TimezoneSelect value="America/New_York" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('America/New_York');
  });

  it('shows the placeholder when empty', () => {
    render(<TimezoneSelect value={null} onChange={() => {}} placeholder="Timezone" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Timezone');
  });

  it('filters and selects a zone', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimezoneSelect value={null} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText(/search/i), 'Tokyo');
    await user.click(await screen.findByText('Asia/Tokyo'));
    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo');
  });
});
