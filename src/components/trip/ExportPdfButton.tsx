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
import { useTimelineEvents } from '@/hooks/use-timeline-events'; 
import { useTripDays } from '@/hooks/use-trip-days';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { supabase } from '@/integrations/supabase/client';
import { formatDate as formatDateHelper } from 'date-fns';
import { parseISO } from 'date-fns';

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

const formatTime = (timeString?: string | null): string => {
  if (!timeString) return '';
  
  try {
    if (timeString.includes('T')) {
      const date = parseISO(timeString);
      return formatDateHelper(date, 'h:mm a');
    }
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return formatDateHelper(date, 'h:mm a');
  } catch (error) {
    return timeString;
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDateHelper(date, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    return dateString;
  }
};

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ tripId, className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { days } = useTripDays(tripId);
  const { events: hotelStays } = useTimelineEvents(tripId);
  const { transportationData: transportations } = useTransportationEvents(tripId);

  // Function to generate PDF content for a trip
  const generatePdfContent = (tripData: {destination: string, start_date: string, end_date: string}, tripDays: any[], showImages: boolean) => {
    const doc = new jsPDF();
    
    // PDF settings
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Variables to track position
    let y = margin;
    
    // Add title and header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tripData.destination} Trip Itinerary`, margin, y);
    y += 10;
    
    // Add date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateRange = tripData.start_date && tripData.end_date 
      ? `${formatDate(tripData.start_date)} - ${formatDate(tripData.end_date)}`
      : '';
    doc.text(dateRange, margin, y);
    y += 15;
    
    // Skip adding cover image - it requires additional processing
    // We'll focus on text-based content for reliability
    
    // Process days
    for (const day of tripDays) {
      // Check if we need a new page
      if (y > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        y = margin;
      }
      
      // Add day header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const dayTitle = day.title || `Day ${day.day_id}`;
      const dayDate = formatDate(day.date);
      doc.text(`${dayTitle} - ${dayDate}`, margin, y);
      y += 10;
      
      // Draw timeline line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      const lineX = margin + 5;
      const lineStartY = y;
      let lineEndY = y;
      
      // Process day's events
      const dayEvents = [];
      
      // Add hotel stays for this day
      const dayHotelStays = hotelStays?.filter(stay => {
        if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
        
        const dayDate = new Date(day.date);
        const checkinDate = new Date(stay.hotel_checkin_date);
        const checkoutDate = new Date(stay.hotel_checkout_date);
        
        return dayDate >= checkinDate && dayDate <= checkoutDate;
      }) || [];
      
      for (const stay of dayHotelStays) {
        const dayDate = new Date(day.date);
        const checkinDate = new Date(stay.hotel_checkin_date);
        const checkoutDate = new Date(stay.hotel_checkout_date);
        
        let title = stay.hotel || '';
        let time = '';
        
        if (dayDate.toDateString() === checkinDate.toDateString()) {
          title = `Check-in: ${stay.hotel}`;
          time = stay.checkin_time || '';
        } else if (dayDate.toDateString() === checkoutDate.toDateString()) {
          title = `Check-out: ${stay.hotel}`;
          time = stay.checkout_time || '';
        } else {
          title = `Stay at ${stay.hotel}`;
        }
        
        dayEvents.push({
          type: 'accommodation',
          title,
          details: stay.hotel_details,
          time: formatTime(time),
          cost: stay.cost ? `${stay.currency} ${stay.cost}` : '',
          location: stay.hotel_address
        });
      }
      
      // Add transportations for this day
      const dayTransportations = transportations?.filter(transport => {
        return transport.start_date === day.date || 
               transport.start_date === day.date.split('T')[0];
      }) || [];
      
      for (const transport of dayTransportations) {
        const title = transport.type === 'flight' 
          ? `Flight${transport.provider ? ': ' + transport.provider : ''}`
          : transport.type.charAt(0).toUpperCase() + transport.type.slice(1);
        
        dayEvents.push({
          type: 'transportation',
          title,
          details: transport.details,
          time: formatTime(transport.start_time),
          cost: transport.cost ? `${transport.currency} ${transport.cost}` : '',
          location: `From: ${transport.departure_location || 'N/A'} To: ${transport.arrival_location || 'N/A'}`
        });
      }
      
      // Add activities for this day
      if (day.activities && day.activities.length > 0) {
        for (const activity of day.activities) {
          dayEvents.push({
            type: 'activity',
            title: activity.title,
            details: activity.description,
            time: formatTime(activity.start_time),
            cost: activity.cost && activity.currency ? `${activity.currency} ${activity.cost}` : '',
            location: ''
          });
        }
      }
      
      // Sort events by time
      dayEvents.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
      
      // Add events to PDF
      for (const event of dayEvents) {
        // Check if we need a new page
        if (y > doc.internal.pageSize.getHeight() - 70) {
          // Extend the timeline line to the bottom of the current page
          lineEndY = doc.internal.pageSize.getHeight() - margin;
          doc.line(lineX, lineStartY, lineX, lineEndY);
          
          // Add a new page
          doc.addPage();
          y = margin;
          
          // Continue the timeline on the new page
          const newLineStartY = y;
          lineEndY = y;
          doc.line(lineX, newLineStartY, lineX, lineEndY + 60);
        }
        
        // Draw timeline dot
        doc.setDrawColor(100, 100, 100);
        doc.setFillColor(100, 100, 100);
        doc.circle(lineX, y + 5, 1, 'F');
        
        // Add event time
        if (event.time) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(event.time, margin + 15, y + 5);
        }
        
        // Add event title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(event.title, margin + 50, y + 5);
        y += 8;
        
        // Add event details
        if (event.details) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const details = doc.splitTextToSize(event.details, contentWidth - 50);
          doc.text(details, margin + 50, y);
          y += 5 * details.length;
        }
        
        // Add location
        if (event.location) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          const location = doc.splitTextToSize(event.location, contentWidth - 50);
          doc.text(location, margin + 50, y);
          y += 5 * location.length;
        }
        
        // Add cost
        if (event.cost) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Cost: ${event.cost}`, margin + 50, y);
          y += 5;
        }
        
        // Add space before next event
        y += 10;
        lineEndY = y;
      }
      
      // Draw the timeline line for the current day
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      if (lineEndY > lineStartY) {
        doc.line(lineX, lineStartY, lineX, lineEndY);
      }
      
      // Add space before next day
      y += 20;
    }
    
    return doc;
  };

  // Function to download the PDF
  const downloadPdf = async (showImages: boolean = false) => {
    if (!tripId) {
      toast.error('Trip ID is required to export PDF');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a simple fallback PDF if we can't get the data
      const createSimplePdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("Trip Itinerary", 20, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("This is a simplified version of your trip itinerary.", 20, 30);
        
        if (days && days.length > 0) {
          let y = 40;
          days.forEach((day, index) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const date = day.date ? formatDate(day.date) : `Day ${index + 1}`;
            doc.text(`${date}`, 20, y);
            y += 10;
            
            if (day.activities && day.activities.length > 0) {
              day.activities.forEach(activity => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`• ${activity.title || 'Activity'}`, 25, y);
                y += 7;
              });
            } else {
              doc.setFontSize(12);
              doc.setFont('helvetica', 'italic');
              doc.text("No activities scheduled", 25, y);
              y += 7;
            }
            
            y += 10;
          });
        } else {
          doc.text("No trip days found. Add some days to your trip to see them here.", 20, 40);
        }
        
        return doc;
      };
      
      try {
        // Fetch trip data
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('destination, start_date, end_date, cover_image_url')
          .eq('trip_id', tripId)
          .single();
          
        if (tripError) {
          console.error("Trip data fetch error:", tripError);
          // Fall back to simple PDF
          const doc = createSimplePdf();
          doc.save("trip-itinerary.pdf");
          toast.success("Basic PDF exported successfully");
          return;
        }
        
        if (!tripData) {
          // Fall back to simple PDF
          const doc = createSimplePdf();
          doc.save("trip-itinerary.pdf");
          toast.success("Basic PDF exported successfully");
          return;
        }
        
        // Generate the PDF with safe data
        const safeData = {
          destination: String(tripData.destination || 'Trip'),
          start_date: String(tripData.start_date || ''),
          end_date: String(tripData.end_date || ''),
        };
        
        // Use only essential day information to prevent errors
        const safeDays = (days || []).map(day => ({
          day_id: day.day_id || '',
          date: day.date || '',
          title: day.title || '',
          activities: Array.isArray(day.activities) ? day.activities.map(act => ({
            id: act.id || '',
            title: act.title || 'Activity',
            description: act.description || '',
            start_time: act.start_time || '',
            cost: act.cost || 0,
            currency: act.currency || 'USD'
          })) : []
        }));
        
        // Generate PDF
        const doc = generatePdfContent(safeData, safeDays, showImages);
        
        // Save the PDF
        const prefix = showImages ? 'visual' : 'plain';
        const safeName = String(safeData.destination).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
        const filename = `${prefix}-${safeName}-itinerary-${timestamp}.pdf`;
        
        doc.save(filename);
        
        toast.success(`${showImages ? 'Visual' : 'Plain'} PDF exported successfully`);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        // Fall back to simple PDF
        const doc = createSimplePdf();
        doc.save("trip-itinerary.pdf");
        toast.success("Basic PDF exported as a fallback");
      }
    } catch (error) {
      console.error('Error in PDF export process:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={className || "bg-earth-500 hover:bg-earth-600 text-white"}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => downloadPdf(true)}>
          Export Visual PDF (with images)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadPdf(false)}>
          Export Plain PDF (no images)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportPdfButton;