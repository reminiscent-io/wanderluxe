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

  it('stacks title over time for long timegrid events', () => {
    const arg = {
      ...makeArg({ end: new Date(2026, 5, 30, 16, 0) }),
      view: { type: 'timeGridWeek' },
    } as unknown as import('@fullcalendar/core').EventContentArg;
    const { container } = render(<CalendarEventChip arg={arg} />);
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(screen.getByText('2:30pm')).toBeInTheDocument();
  });

  it('keeps the single-row layout for short timegrid events', () => {
    const arg = {
      ...makeArg({ end: new Date(2026, 5, 30, 15, 0) }),
      view: { type: 'timeGridWeek' },
    } as unknown as import('@fullcalendar/core').EventContentArg;
    const { container } = render(<CalendarEventChip arg={arg} />);
    expect(container.firstElementChild).not.toHaveClass('flex-col');
  });
});
