import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarToolbar from './CalendarToolbar';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('CalendarToolbar (desktop)', () => {
  it('renders the title and switches views', () => {
    const onViewChange = vi.fn();
    render(<CalendarToolbar title="Jun 30 - Jul 6" activeView="timeGridWeek" onViewChange={onViewChange} onPrev={() => {}} onNext={() => {}} onToday={() => {}} />);
    expect(screen.getByText('Jun 30 - Jul 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(onViewChange).toHaveBeenCalledWith('dayGridMonth');
  });
});
