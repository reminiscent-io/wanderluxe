import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import { formatDate as formatDateHelper, format } from 'date-fns';
import { parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

const formatTime = (timeString?: string | null): string => {
  if (!timeString) return 'All-day';
  
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
    return timeString || 'All-day';
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

const formatShortDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDateHelper(date, 'MMM d');
  } catch (error) {
    return dateString;
  }
};

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ tripId, className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { days } = useTripDays(tripId);
  const { events: hotelStays } = useTimelineEvents(tripId);
  const { transportationData: transportations } = useTransportationEvents(tripId);

  // Create an HTML-based PDF with a timeline layout
  const createTimelinePdf = async (showImages: boolean = true) => {
    if (!tripId) {
      toast.error('Trip ID is required to export PDF');
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to get trip data
      let tripData;
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('destination, arrival_date, departure_date, cover_image_url')
          .eq('trip_id', tripId)
          .single();
        
        if (error) throw error;
        
        // Map the column names to be consistent with our code
        tripData = {
          destination: data.destination,
          start_date: data.arrival_date,
          end_date: data.departure_date,
          cover_image_url: data.cover_image_url
        };
      } catch (error) {
        console.error('Error fetching trip data:', error);
        toast.error('Could not fetch trip data');
        return;
      }

      // Process all timeline events for each day
      const processedDays = days?.map(day => {
        // Get hotel stays for this day
        const dayHotelStays = hotelStays?.filter(stay => {
          if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
          
          const dayDate = new Date(day.date);
          const checkinDate = new Date(stay.hotel_checkin_date);
          const checkoutDate = new Date(stay.hotel_checkout_date);
          
          return dayDate >= checkinDate && dayDate <= checkoutDate;
        }) || [];
        
        // Process each hotel stay to create timeline items
        const hotelTimelineItems = dayHotelStays.map(stay => {
          const dayDate = new Date(day.date);
          const checkinDate = new Date(stay.hotel_checkin_date);
          const checkoutDate = new Date(stay.hotel_checkout_date);
          
          let title = stay.hotel || '';
          let time = '';
          let details = stay.hotel_details || '';
          let location = stay.hotel_address || '';
          
          if (dayDate.toDateString() === checkinDate.toDateString()) {
            title = `Check-in: ${stay.hotel}`;
            time = stay.checkin_time || '';
          } else if (dayDate.toDateString() === checkoutDate.toDateString()) {
            title = `Check-out: ${stay.hotel}`;
            time = stay.checkout_time || '';
          } else {
            title = `Stay at ${stay.hotel}`;
          }
          
          return {
            type: 'accommodation',
            title,
            details,
            time: formatTime(time),
            location,
            cost: stay.cost ? `${stay.currency} ${stay.cost}` : ''
          };
        });
        
        // Get transportation for this day
        const dayTransportations = transportations?.filter(transport => {
          return transport.start_date === day.date || 
                 transport.start_date === day.date.split('T')[0];
        }) || [];
        
        // Process each transportation to create timeline items
        const transportationTimelineItems = dayTransportations.map(transport => {
          const title = transport.type === 'flight' 
            ? `Flight${transport.provider ? ': ' + transport.provider : ''}`
            : transport.type.charAt(0).toUpperCase() + transport.type.slice(1);
          
          const location = `From: ${transport.departure_location || 'N/A'} To: ${transport.arrival_location || 'N/A'}`;
          
          return {
            type: 'transportation',
            title,
            details: transport.details || '',
            time: formatTime(transport.start_time),
            location,
            cost: transport.cost ? `${transport.currency} ${transport.cost}` : ''
          };
        });
        
        // Get activities for this day
        const activityTimelineItems = (day.activities || []).map(activity => {
          return {
            type: 'activity',
            title: activity.title || 'Activity',
            details: activity.description || '',
            time: formatTime(activity.start_time),
            location: '',
            cost: activity.cost && activity.currency ? `${activity.currency} ${activity.cost}` : ''
          };
        });
        
        // Combine all timeline items and sort by time
        const allTimelineItems = [
          ...hotelTimelineItems,
          ...transportationTimelineItems,
          ...activityTimelineItems
        ].sort((a, b) => {
          if (a.time === 'All-day' && b.time !== 'All-day') return -1;
          if (a.time !== 'All-day' && b.time === 'All-day') return 1;
          if (a.time === 'All-day' && b.time === 'All-day') return 0;
          return a.time.localeCompare(b.time);
        });
        
        return {
          ...day,
          timelineItems: allTimelineItems
        };
      }) || [];
      
      // Create HTML content for the PDF
      const dateRange = tripData.start_date && tripData.end_date
        ? `${formatShortDate(tripData.start_date)} - ${formatShortDate(tripData.end_date)}`
        : '';
      
      const heroStyles = `
        width: 100%;
        height: 200px;
        background-color: #f8f7f4; /* bg-sand-50 */
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 20px;
        position: relative;
        margin-bottom: 24px;
        border-radius: 8px;
        overflow: hidden;
      `;
      
      const heroImageStyles = tripData.cover_image_url && showImages
        ? `
          background-image: url('${tripData.cover_image_url}');
          background-size: cover;
          background-position: center;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        `
        : '';
      
      const heroTextWrapperStyles = `
        position: relative;
        z-index: 1;
        color: ${tripData.cover_image_url && showImages ? 'white' : '#37352f'};
        text-shadow: ${tripData.cover_image_url && showImages ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'};
        background-color: ${tripData.cover_image_url && showImages ? 'rgba(0,0,0,0.2)' : 'transparent'};
        display: inline-block;
        padding: ${tripData.cover_image_url && showImages ? '8px 16px' : '0'};
        border-radius: ${tripData.cover_image_url && showImages ? '4px' : '0'};
      `;
      
      const timelineContainerStyles = `
        display: flex;
        flex-direction: column;
        gap: 40px;
      `;
      
      const dayHeaderStyles = `
        margin-bottom: 16px;
        font-size: 24px;
        font-weight: 600;
        color: #37352f; /* text-foreground */
      `;
      
      const dayContentStyles = `
        display: flex;
        position: relative;
      `;
      
      const timelineRailStyles = `
        width: 25%;
        position: relative;
        padding-right: 16px;
      `;
      
      const timelineRailLineStyles = `
        position: absolute;
        top: 0;
        bottom: 0;
        right: 24px;
        width: 2px;
        background-color: #e7e5e0; /* bg-sand-200 */
      `;
      
      const timeStampStyles = `
        font-size: 12px;
        color: #706f6c; /* text-muted */
        font-weight: 500;
        text-align: right;
        padding-right: 32px;
        margin-top: 16px;
        position: relative;
      `;
      
      const timeStampDotStyles = `
        position: absolute;
        top: 5px;
        right: 20px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #d7d2cc; /* bg-sand-300 */
      `;
      
      const timelineContentStyles = `
        width: 75%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      `;
      
      const timelineCardStyles = `
        background-color: #f8f7f4; /* bg-sand-50 */
        border: 1px solid #e7e5e0; /* border-sand-100 */
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* shadow-sm */
        break-inside: avoid;
      `;
      
      const cardTitleStyles = `
        font-size: 16px;
        font-weight: 600;
        color: #37352f; /* text-foreground */
        margin-bottom: 8px;
      `;
      
      const cardDetailsStyles = `
        font-size: 14px;
        color: #37352f; /* text-foreground */
        margin-bottom: 8px;
      `;
      
      const cardMetaStyles = `
        font-size: 12px;
        color: #706f6c; /* text-muted */
        font-style: italic;
      `;
      
      const footerStyles = `
        position: running(footer);
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        margin-top: 16px;
        font-size: 10px;
        color: #706f6c; /* text-muted */
        border-top: 1px solid #e7e5e0; /* border-sand-100 */
      `;
      
      const pageStyles = `
        @page {
          margin: 1cm;
          @bottom-center {
            content: element(footer);
          }
        }
        body {
          font-family: Helvetica, Arial, sans-serif;
          color: #37352f; /* text-foreground */
          line-height: 1.6;
          margin: 0;
          padding: 0;
        }
        .banner {
          display: ${showImages ? 'block' : 'none'};
        }
        .thumbnail {
          display: ${showImages ? 'block' : 'none'};
        }
      `;
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tripData.destination || 'Trip'} Itinerary</title>
          <style>
            ${pageStyles}
          </style>
        </head>
        <body>
          <div class="footer" style="${footerStyles}">
            <div>Trip · ${dateRange}</div>
            <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>
          
          <div class="hero banner" style="${heroStyles}">
            <div class="hero-image" style="${heroImageStyles}"></div>
            <div class="hero-text" style="${heroTextWrapperStyles}">
              <h1 style="margin: 0; font-size: 32px;">${tripData.destination || 'Trip'} Itinerary</h1>
              <p style="margin: 4px 0 0; font-size: 16px;">${dateRange}</p>
            </div>
          </div>
          
          <div class="timeline-container" style="${timelineContainerStyles}">
      `;
      
      // Add each day to the HTML content
      processedDays.forEach(day => {
        const dayDate = day.date ? formatDate(day.date) : 'Day';
        const dayTitle = day.title ? `${day.title} - ${dayDate}` : dayDate;
        
        htmlContent += `
          <div class="day-section">
            <div class="day-header" style="${dayHeaderStyles}">${dayTitle}</div>
            <div class="day-content" style="${dayContentStyles}">
              <div class="timeline-rail" style="${timelineRailStyles}">
                <div class="timeline-rail-line" style="${timelineRailLineStyles}"></div>
        `;
        
        // Add time stamps in the left rail
        day.timelineItems.forEach(item => {
          htmlContent += `
            <div class="time-stamp" style="${timeStampStyles}">
              ${item.time}
              <div class="time-stamp-dot" style="${timeStampDotStyles}"></div>
            </div>
          `;
        });
        
        htmlContent += `
              </div>
              <div class="timeline-content" style="${timelineContentStyles}">
        `;
        
        // Add timeline cards in the right content area
        day.timelineItems.forEach(item => {
          const iconLabel = item.type === 'accommodation' 
            ? '🏨' 
            : item.type === 'transportation' 
              ? '✈️' 
              : '🗓️';
              
          htmlContent += `
            <div class="timeline-card" style="${timelineCardStyles}">
              <div class="card-title" style="${cardTitleStyles}">${iconLabel} ${item.title}</div>
              ${item.details ? `<div class="card-details" style="${cardDetailsStyles}">${item.details}</div>` : ''}
              <div class="card-meta" style="${cardMetaStyles}">
                ${item.location ? `<div>${item.location}</div>` : ''}
                ${item.cost ? `<div>Cost: ${item.cost}</div>` : ''}
              </div>
            </div>
          `;
        });
        
        if (day.timelineItems.length === 0) {
          htmlContent += `
            <div class="timeline-card" style="${timelineCardStyles}">
              <div class="card-title" style="${cardTitleStyles}">No activities scheduled</div>
            </div>
          `;
        }
        
        htmlContent += `
              </div>
            </div>
          </div>
        `;
      });
      
      htmlContent += `
          </div>
        </body>
        </html>
      `;
      
      // Create a blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open the HTML in a new window for printing
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        toast.error('Please allow pop-ups to export PDF');
        return;
      }
      
      printWindow.onload = function() {
        // Wait a bit for styles to load then print
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 1000);
      };
      
      toast.success(`${showImages ? 'Visual' : 'Plain'} itinerary exported successfully`);
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
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
        <DropdownMenuItem onClick={() => createTimelinePdf(true)}>
          Export Visual PDF (with images)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => createTimelinePdf(false)}>
          Export Plain PDF (no images)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportPdfButton;