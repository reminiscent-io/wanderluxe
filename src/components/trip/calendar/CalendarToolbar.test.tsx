import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarToolbar from './CalendarToolbar';

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));

describe('CalendarToolbar (desktop)', () => {
  beforeEach(() => { mobile.value = false; });

  it('renders the title and switches views', () => {
    const onViewChange = vi.fn();
    render(<CalendarToolbar title="Jun 30 - Jul 6" activeView="timeGridWeek" onViewChange={onViewChange} onPrev={() => {}} onNext={() => {}} onToday={() => {}} />);
    expect(screen.getByText('Jun 30 - Jul 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(onViewChange).toHaveBeenCalledWith('dayGridMonth');
  });

  it('renders the day-window toggle when provided and hides it when null', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<CalendarToolbar title="Jun 30" activeView="timeGridWeek" onViewChange={() => {}} onPrev={() => {}} onNext={() => {}} onToday={() => {}} dayWindow={{ expanded: false, onToggle }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show full day' }));
    expect(onToggle).toHaveBeenCalled();
    rerender(<CalendarToolbar title="Jun 30" activeView="timeGridWeek" onViewChange={() => {}} onPrev={() => {}} onNext={() => {}} onToday={() => {}} dayWindow={null} />);
    expect(screen.queryByRole('button', { name: 'Show full day' })).not.toBeInTheDocument();
  });

  it('marks the active view with aria-pressed', () => {
    render(<CalendarToolbar title="Jun 30 - Jul 6" activeView="timeGridWeek" onViewChange={() => {}} onPrev={() => {}} onNext={() => {}} onToday={() => {}} />);
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('CalendarToolbar (mobile)', () => {
  beforeEach(() => { mobile.value = true; });

  it('maps the Day segment to the list view', () => {
    const onViewChange = vi.fn();
    render(<CalendarToolbar title="Jun 30" activeView="timeGridThreeDay" onViewChange={onViewChange} onPrev={() => {}} onNext={() => {}} onToday={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    expect(onViewChange).toHaveBeenCalledWith('listDay');
  });
});
