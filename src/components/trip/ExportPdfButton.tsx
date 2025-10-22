/* src/components/trip/ExportPdfButton.tsx */
import React from 'react';

import PdfExportDialog, {
  PdfExportOptions,
} from './PdfExportDialog';             // existing dialog component
import { exportItineraryPdf } from '@/services/pdfmake-export'; // new pdfMake helper

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

/**
 * A thin wrapper that forwards the user-chosen options from
 * <PdfExportDialog /> to the pdfMake export helper.
 */
const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  tripId,
  className,
}) => {
  /** Called by PdfExportDialog when the user presses “Export PDF” */
  const handleExport = async (options: PdfExportOptions) => {
    await exportItineraryPdf(tripId, options); // one-click download
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
