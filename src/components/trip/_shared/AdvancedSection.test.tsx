import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdvancedSection from './AdvancedSection';

function renderSection(notes: string | null, travelerCount: number) {
  render(
    <AdvancedSection notesLabel="Details" notes={notes} travelerCount={travelerCount}>
      <p>inside</p>
    </AdvancedSection>,
  );
}

describe('AdvancedSection', () => {
  it('starts collapsed and opens on click', () => {
    renderSection(null, 0);
    expect(screen.queryByText('inside')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByText('inside')).toBeTruthy();
  });

  it('names what it holds in the trigger', () => {
    renderSection('Gate B12', 1);
    expect(screen.getByRole('button', { name: 'Advanced: Details, 1 traveler' })).toBeTruthy();
  });

  it('ignores blank notes', () => {
    renderSection('   ', 3);
    expect(screen.getByRole('button', { name: 'Advanced: 3 travelers' })).toBeTruthy();
  });
});
