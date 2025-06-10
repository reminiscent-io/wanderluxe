import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { useReservations } from '@/hooks/use-reservations';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/services/analyticsService';
import {
  format as fnsFormat,
  format as formatDateHelper,
  parseISO,
} from 'date-fns';
import PdfExportDialog, { PdfExportOptions } from './PdfExportDialog';

interface ExportPdfButtonProps {
  tripId: string;
  className?: string;
}

/* ---------- helpers ---------- */

const formatTime = (timeString?: string | null): string => {
  if (!timeString) return 'All-day';

  try {
    if (timeString.includes('T')) {
      return fnsFormat(parseISO(timeString), 'h:mm a');
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes);
    return fnsFormat(d, 'h:mm a');
  } catch {
    return timeString ?? 'All-day';
  }
};

const minutesFromTime = (t: string): number => {
  if (t === 'All-day') return -1;
  const match = t.match(/(\d+):(\d+)\s*([ap])m/i);
  if (!match) return 9999;
  const [, hh, mm, mer] = match;
  let mins = (parseInt(hh, 10) % 12) * 60 + parseInt(mm, 10);
  if (mer.toLowerCase() === 'p') mins += 12 * 60;
  return mins;
};

const formatDate = (dateString: string, pattern = 'EEEE, MMMM d, yyyy') =>
  fnsFormat(parseISO(dateString), pattern);

/* ---------- component ---------- */

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  tripId,
  className,
}) => {
  const { days } = useTripDays(tripId);
  const { events: hotelStays } = useTimelineEvents(tripId);
  const { transportationData: transportations } = useTransportationEvents(tripId);

  /* ---------- helper functions for PDF generation ---------- */
  const buildHotelTimelineItems = (day: any, options: PdfExportOptions) => {
    if (!options.sections.accommodation) return [];

    return hotelStays
      ?.filter(stay => {
        if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
        const d = parseISO(day.date);
        return (
          d >= parseISO(stay.hotel_checkin_date) &&
          d <= parseISO(stay.hotel_checkout_date)
        );
      })
      .map(stay => {
        const d = parseISO(day.date);
        const checkIn = parseISO(stay.hotel_checkin_date);
        const checkOut = parseISO(stay.hotel_checkout_date);

        const isCheckIn = fnsFormat(d, 'yyyy-MM-dd') === fnsFormat(checkIn, 'yyyy-MM-dd');
        const isCheckOut = fnsFormat(d, 'yyyy-MM-dd') === fnsFormat(checkOut, 'yyyy-MM-dd');

        const rawTime = isCheckIn
          ? stay.checkin_time
          : isCheckOut
          ? stay.checkout_time
          : null;

        return {
          type: 'accommodation',
          title: isCheckIn
            ? `Check-in: ${stay.hotel}`
            : isCheckOut
            ? `Check-out: ${stay.hotel}`
            : `Stay at ${stay.hotel}`,
          details: stay.hotel_details ?? '',
          location: stay.hotel_address ?? '',
          cost: stay.cost ? `${stay.currency} ${stay.cost}` : '',
          time: formatTime(rawTime),
          sortKey: minutesFromTime(formatTime(rawTime)),
          image_url: (stay as any).image_url ?? null,
        };
      }) ?? [];
  };

  const buildTransportationTimelineItems = (day: any, options: PdfExportOptions) => {
    if (!options.sections.transportation) return [];

    return transportations
      ?.filter(t => t.start_date === day.date || t.start_date === day.date.split('T')[0])
      .map(t => ({
        type: 'transportation',
        title: t.type === 'flight'
          ? `Flight${t.provider ? ': ' + t.provider : ''}`
          : t.type.charAt(0).toUpperCase() + t.type.slice(1),
        details: t.details ?? '',
        location: `From: ${t.departure_location ?? 'N/A'} → ${t.arrival_location ?? 'N/A'}`,
        cost: t.cost ? `${t.currency} ${t.cost}` : '',
        time: formatTime(t.start_time),
        sortKey: minutesFromTime(formatTime(t.start_time)),
      })) ?? [];
  };

  const buildActivityTimelineItems = (day: any, options: PdfExportOptions) => {
    if (!options.sections.activities) return [];

    return day.activities?.map((a: any) => ({
      type: 'activity',
      title: a.title ?? 'Activity',
      details: a.description ?? '',
      location: '',
      cost: a.cost && a.currency ? `${a.currency} ${a.cost}` : '',
      time: formatTime(a.start_time),
      sortKey: minutesFromTime(formatTime(a.start_time)),
    })) ?? [];
  };

  const getItemIcon = (type: string) => {
    return type === 'accommodation' ? '🏨' : type === 'transportation' ? '✈️' : '🗓️';
  };

  const shouldShowItemDetails = (item: any, options: PdfExportOptions) => {
    return {
      showDetails: options.detailLevel === 'full' || (options.detailLevel === 'summary' && item.details),
      showLocation: options.detailLevel !== 'minimal' && item.location,
      showCost: options.showCosts && item.cost,
    };
  };

  const generateItemThumbnail = (item: any, options: PdfExportOptions) => {
    return item.type === 'accommodation' && item.image_url && options.showImages
      ? `<div class="thumbnail" style="width:96px;height:96px;overflow:hidden;border-radius:8px;margin-left:auto;">
           <img src="${item.image_url}" style="width:100%;height:100%;object-fit:cover;">
         </div>`
      : '';
  };

  /** Build and print PDF with customization options ---------------------- */
  const createCustomPdf = async (options: PdfExportOptions) => {
    if (!tripId) {
      toast.error('Trip ID is required to export PDF');
      return;
    }
    try {
      /* 1 ▸ Trip meta ----------------------------------------------------- */
      const { data: tripData, error } = await supabase
        .from('trips')
        .select('destination, arrival_date, departure_date, cover_image_url')
        .eq('trip_id', tripId)
        .single();

      if (error) throw error;

      const dateRange =
        tripData.arrival_date && tripData.departure_date
          ? `${formatDate(tripData.arrival_date, 'MMM d')} – ${formatDate(
              tripData.departure_date,
              'MMM d',
            )}`
          : '';

      /* 2 ▸ Build timeline per-day --------------------------------------- */
      const processedDays =
        days?.map(day => {
          const hotelTimelineItems = buildHotelTimelineItems(day, options);
          const transportationTimelineItems = buildTransportationTimelineItems(day, options);
          const activityTimelineItems = buildActivityTimelineItems(day, options);

          const allTimelineItems = [
            ...hotelTimelineItems,
            ...transportationTimelineItems,
            ...activityTimelineItems,
          ].sort((a, b) => a.sortKey - b.sortKey);

          return { ...day, timelineItems: allTimelineItems };
        }) ?? [];

      /* 3 ▸ Styles (condensed) ------------------------------------------- */
      const getStyles = () => {
        const layoutClass = options.layout === 'timeline' ? 'timeline' : 
                           options.layout === 'daily' ? 'daily' : 'list';

        return {
          hero: `
            width:100%;height:200px;background:#f8f7f4;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;position:relative;margin-bottom:24px;border-radius:8px;overflow:hidden;
          `,
          heroImg: tripData.cover_image_url && options.showImages
            ? `background:url('${tripData.cover_image_url}') center/cover;position:absolute;inset:0;z-index:0;`
            : '',
          heroText: `
            position:relative;z-index:1;color:${tripData.cover_image_url && options.showImages ? '#fff' : '#37352f'};text-shadow:${tripData.cover_image_url && options.showImages ? '0 1px 3px rgba(0,0,0,.3)' : 'none'};
          `,
          timelineWrap: options.layout === 'list' 
            ? `display:flex;flex-direction:column;gap:12px;`
            : `display:flex;flex-direction:column;gap:24px;`,
          dayContent: options.layout === 'daily'
            ? `display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;position:relative;`
            : `display:flex;flex-direction:column;gap:8px;position:relative;`,
          dayRow: options.layout === 'timeline'
            ? `display:grid;grid-template-columns:25% 1fr;gap:12px;position:relative;break-inside:avoid-page;`
            : `display:flex;flex-direction:column;gap:8px;break-inside:avoid-page;`,
          timeLabel: options.layout === 'timeline'
            ? `font-size:12px;color:#706f6c;font-weight:500;text-align:right;padding-top:8px;padding-right:24px;position:relative;`
            : `font-size:12px;color:#706f6c;font-weight:500;margin-bottom:4px;`,
          dot: options.layout === 'timeline'
            ? `position:absolute;top:16px;right:11px;width:6px;height:6px;border-radius:50%;background:#d7d2cc;`
            : `display:none;`,
          card: `background:#f8f7f4;border:1px solid #e7e5e0;border-radius:8px;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,.05);break-inside:avoid;`,
          page: `
            @page{margin:1cm;@bottom-center{content:element(footer);}}
            body{font-family:Helvetica,Arial,sans-serif;color:#37352f;line-height:1.6;margin:0;}
            .banner{display:${options.showImages ? 'block' : 'none'};}
            .thumbnail{display:${options.showImages ? 'block' : 'none'};}
            .day-row::before{content:'';position:absolute;left:12%;top:0;bottom:0;border-left:2px solid #e7e5e0;}
            .${layoutClass} .day-row::before{display:${options.layout === 'timeline' ? 'block' : 'none'};}
          `,
          footer: `
            position:running(footer);display:flex;justify-content:space-between;padding:8px 0;margin-top:16px;font-size:10px;color:#706f6c;border-top:1px solid #e7e5e0;
          `,
        };
      };

      const styles = getStyles();

      /* 4 ▸ HTML ---------------------------------------------------------- */
      let html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>
        ${tripData.destination ?? 'Trip'} Itinerary</title>
        <style>${styles.page}</style></head><body>

        <div class="footer" style="${styles.footer}">
          <div>${tripData.destination ?? 'Trip'} · ${dateRange}</div>
          <div>Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
        </div>

        <div class="hero banner" style="${styles.hero}">
          <div style="${styles.heroImg}"></div>
          <div style="${styles.heroText}">
            <h1 style="margin:0;font-size:32px;">${tripData.destination ?? 'Trip'} Itinerary</h1>
            <p style="margin:4px 0 0;font-size:16px;">${dateRange}</p>
          </div>
        </div>

        <div style="${styles.timelineWrap}">
      `;

      processedDays.forEach(day => {
        const header = day.title?.trim()
          ? `${day.title} – ${formatDate(day.date)}`
          : formatDate(day.date);

        html += `
          <section style="position:relative;break-inside:avoid-page;">
            <h2 style="margin-bottom:16px;font-size:24px;font-weight:600;">${header}</h2>
            <div style="${styles.dayContent}">
        `;

        if (day.timelineItems.length === 0) {
          html += `
            <div style="${styles.dayRow}">
              <div style="${styles.timeLabel}">
                All-day<div style="${styles.dot}"></div>
              </div>
              <article style="${styles.card}">
                <h3 style="margin:0 0 4px;font-size:16px;font-weight:600;">No activities scheduled</h3>
              </article>
            </div>`;
        }

        day.timelineItems.forEach((item: any) => {
          const icon = getItemIcon(item.type);
          const { showDetails, showLocation, showCost } = shouldShowItemDetails(item, options);
          const thumbnail = generateItemThumbnail(item, options);

          html += `
            <div class="day-row" style="${styles.dayRow}">
              <div style="${styles.timeLabel}">
                ${item.time}<div style="${styles.dot}"></div>
              </div>
              <article style="${styles.card}">
                <div style="display:flex;gap:16px;">
                  <div style="flex:1;">
                    <h3 style="margin:0 0 4px;font-size:16px;font-weight:600;">
                      ${icon} ${item.title}
                    </h3>
                    ${showDetails && item.details ? `<div style="margin-bottom:4px;font-size:14px;">${item.details}</div>` : ''}
                    <div style="font-size:12px;color:#706f6c;font-style:italic;">
                      ${showLocation ? `<div>${item.location}</div>` : ''}
                      ${showCost ? `<div>Cost: ${item.cost}</div>` : ''}
                    </div>
                  </div>
                  ${thumbnail}
                </div>
              </article>
            </div>
          `;
        });

        html += `</div></section>`;
      });

      html += `</div></body></html>`;

      /* 5 ▸ Print --------------------------------------------------------- */
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        toast.error('Please allow pop-ups to export PDF');
        return;
      }
      win.onload = () => {
        setTimeout(() => {
          win!.print();
          URL.revokeObjectURL(url);
        }, 500);
      };

      const exportType = options.showImages ? 'Visual' : 'Plain';
      const layoutType = options.layout.charAt(0).toUpperCase() + options.layout.slice(1);
      toast.success(`${exportType} ${layoutType} itinerary exported`);
    } catch (e) {
      console.error(e);
      throw e; // Re-throw for the dialog to handle
    }
  };

  /* ---------- render ---------- */
  return (
    <PdfExportDialog
      tripId={tripId}
      className={className}
      onExport={createCustomPdf}
    />
  );
};

export default ExportPdfButton;