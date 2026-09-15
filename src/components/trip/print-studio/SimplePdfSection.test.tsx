import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimplePdfSection from './SimplePdfSection';

const exportItineraryPdf = vi.fn();
vi.mock('@/services/pdfmake-export', () => ({
  exportItineraryPdf: (...args: unknown[]) => exportItineraryPdf(...args),
}));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }));

beforeEach(() => {
  exportItineraryPdf.mockReset().mockResolvedValue(undefined);
  toastError.mockReset();
  toastSuccess.mockReset();
});

describe('SimplePdfSection', () => {
  it('exports with photos and costs on by default', async () => {
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(exportItineraryPdf).toHaveBeenCalledTimes(1));
    const [tripId, options] = exportItineraryPdf.mock.calls[0];
    expect(tripId).toBe('trip-1');
    expect(options.showImages).toBe(true);
    expect(options.showCosts).toBe(true);
  });

  it("passes the traveler's choices through to the export", async () => {
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('switch', { name: /prices/i }));
    fireEvent.click(screen.getByRole('button', { name: /^A4$/ }));
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(exportItineraryPdf).toHaveBeenCalled());
    const [, options] = exportItineraryPdf.mock.calls[0];
    expect(options.showCosts).toBe(false);
    expect(options.pageSize).toBe('A4');
  });

  it('reports a failed export instead of failing silently', async () => {
    exportItineraryPdf.mockRejectedValue(new Error('boom'));
    render(<SimplePdfSection tripId="trip-1" />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/boom/);
  });
});
