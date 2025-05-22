import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import { formatDate as formatDateHelper } from 'date-fns';
import { parseISO } from 'date-fns';

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDateHelper(date, 'MMMM d, yyyy');
  } catch (error) {
    return dateString;
  }
};

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ tripId, className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { days } = useTripDays(tripId);

  // Create a simple PDF with essential trip information
  const createTripPdf = async () => {
    if (!tripId) {
      toast.error('Trip ID is required to export PDF');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create PDF document
      const doc = new jsPDF();
      let y = 20; // Starting vertical position
      
      // Try to get trip data
      let tripDestination = 'Trip';
      let tripStartDate = '';
      let tripEndDate = '';
      
      try {
        const { data: tripData } = await supabase
          .from('trips')
          .select('destination, start_date, end_date')
          .eq('trip_id', tripId)
          .single();
        
        if (tripData) {
          tripDestination = tripData.destination || 'Trip';
          tripStartDate = tripData.start_date || '';
          tripEndDate = tripData.end_date || '';
        }
      } catch (error) {
        console.error('Error fetching trip data:', error);
      }
      
      // Add header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`${tripDestination} Itinerary`, 20, y);
      y += 10;
      
      // Add date range if available
      if (tripStartDate && tripEndDate) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatDate(tripStartDate)} - ${formatDate(tripEndDate)}`, 20, y);
        y += 15;
      } else {
        y += 5;
      }
      
      // Add days and activities
      if (days && days.length > 0) {
        for (const day of days) {
          // Check if we need a new page
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          
          // Add day header
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          const dayDate = day.date ? formatDate(day.date) : 'Day';
          const dayTitle = day.title ? `${day.title} - ${dayDate}` : dayDate;
          doc.text(dayTitle, 20, y);
          y += 10;
          
          // Add activities if available
          if (day.activities && day.activities.length > 0) {
            for (const activity of day.activities) {
              // Check if we need a new page
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
              
              // Activity title
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text(`• ${activity.title || 'Activity'}`, 25, y);
              y += 7;
              
              // Activity description if available
              if (activity.description) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(activity.description, 160);
                doc.text(descLines, 30, y);
                y += 5 * descLines.length;
              }
              
              // Add spacing after activity
              y += 3;
            }
          } else {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'italic');
            doc.text("No activities scheduled", 25, y);
            y += 7;
          }
          
          // Add spacing after day
          y += 10;
        }
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.text("No days found in this trip. Add some days to see them here.", 20, y);
      }
      
      // Save the PDF
      const safeDestination = tripDestination.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeDestination}-itinerary.pdf`);
      
      toast.success('Trip itinerary exported successfully');
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className={className || "bg-earth-500 hover:bg-earth-600 text-white"}
      disabled={isLoading}
      onClick={createTripPdf}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Export PDF
    </Button>
  );
};

export default ExportPdfButton;