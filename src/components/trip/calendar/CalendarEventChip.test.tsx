import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarEventChip from './CalendarEventChip';

function makeArg(overrides: Record<string, unknown>) {
  return {
    event: {
      title: 'Louvre',
      allDay: false,
      start: new Date(2026, 5, 30, 14, 30),
      extendedProps: { entityType: 'activity' },
      ...overrides,
    },
    timeText: '2:30pm',
  } as unknown as import('@fullcalendar/core').EventContentArg;
}

describe('CalendarEventChip', () => {
  it('renders the title and a type icon', () => {
    render(<CalendarEventChip arg={makeArg({})} />);
    expect(screen.getByText('Louvre')).toBeInTheDocument();
    expect(screen.getByTestId('chip-icon-activity')).toBeInTheDocument();
  });
});
