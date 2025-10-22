/* src/components/trip/ExportPdfButton.tsx
   Sends options to server → downloads PDF or shows detailed error
*/
import React from 'react';
import PdfExportDialog, { PdfExportOptions } from './PdfExportDialog';
import { toast } from 'sonner';

const EXPORT_API = '/api/export-itinerary-pdf';

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ tripId, className }) => {
  const handleExport = async (options: PdfExportOptions) => {
    try {
      const res = await fetch(EXPORT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, options }),
      });

      const contentType = res.headers.get('Content-Type') || '';

      if (!res.ok) {
        // Try to parse JSON error for details
        let detail = `HTTP ${res.status}`;
        if (contentType.includes('application/json')) {
          const j = await res.json().catch(() => null);
          if (j?.detail) detail = `${detail}: ${j.detail}`;
          else if (j?.error) detail = `${detail}: ${j.error}`;
        } else {
          const text = await res.text().catch(() => '');
          if (text) detail = `${detail}: ${text.slice(0, 300)}`;
        }
        toast.error(`Failed to generate itinerary PDF`, { description: detail });
        return;
      }

      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const disp = res.headers.get('Content-Disposition') || '';
        const match = /filename="?([^"]+)"?/.exec(disp);
        const filename = match?.[1] || 'trip-itinerary.pdf';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast.success('PDF exported successfully');
      } else {
        // Server sent JSON instead of a PDF (likely an error with details)
        const j = await res.json().catch(() => null);
        toast.error('Failed to generate itinerary PDF', {
          description: j?.detail || j?.error || 'Unexpected server response',
        });
      }
    } catch (err: any) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate itinerary PDF', { description: err?.message || 'Network error' });
    }
  };

  return (
    <PdfExportDialog
      tripId={tripId}
      className={className}
      onExport={handleExport}
    />
  );
};

export default ExportPdfButton;
