/*  src/services/pdfmake-export.ts
    Clean, icon-enhanced itinerary PDF export (start–end time for transport)
    ---------------------------------------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

import { supabase } from '@/integrations/supabase/client';
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

/* ---------- constants -------------------------------------------------- */

const TABLES = {
  trip:       'trips',
  days:       'trip_days',
  stays:      'accommodations',
  transport:  'transportation',
  activities: 'day_activities',
  dining:     'reservations',
} as const;

const PAGE_MARGINS: [number, number, number, number] = [30, 30, 30, 30];

const ICON: Record<string, string> = {
  transportation: '✈️',
  flight:         '✈️',
  accommodation:  '🏨',
  hotel:          '🏨',
  dining:         '🍽️',
  restaurant:     '🍽️',
  activity:       '🎯',
  activities:     '🎯',
};

/* ---------- helpers ---------------------------------------------------- */

const fmtDate  = (d: string, pat = 'EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), pat);
const fmtShort = (d: string) => fnsFormat(parseISO(d), 'MMM d');

function fmtTime(t?: string | null) {
  if (!t) return '';
  try {
    if (t.includes('T')) return fnsFormat(parseISO(t), 'h:mm a');
    const [h, m] = t.split(':').map(Number);
    const d = new Date(); d.setHours(h, m);
    return fnsFormat(d, 'h:mm a');
  } catch { return ''; }
}

function minsFromTime(t: string) {
  const match = t.match(/(\d+):(\d+)\s*([ap])m/i);
  if (!match) return 9999;
  const [, hh, mm, mer] = match;
  let mins = (parseInt(hh, 10) % 12) * 60 + parseInt(mm, 10);
  if (mer.toLowerCase() === 'p') mins += 12 * 60;
  return mins;
}

/* cached cover → dataURI ------------------------------------------------- */
const imgCache = new Map<string, Promise<string>>();
async function toDataURI(url: string) {
  if (!url) return '';
  if (!imgCache.has(url)) {
    imgCache.set(url, fetch(url).then(r => r.blob()).then(b => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(b);
    })));
  }
  return imgCache.get(url)!;
}

/* ---------- types ------------------------------------------------------ */

type Item = {
  type: 'accommodation'|'transportation'|'activity'|'dining';
  title: string;
  time: string;       // now can be "08:00 AM – 11:45 AM"
  details?:  string;
  location?: string;
  cost?:     string;
  thumb?:    string;
  sortKey:   number;  // minutes from midnight for start time (sorting)
};
type Day = { date:string; title?:string; items:Item[] };

/* ---------- buildDays -------------------------------------------------- */

async function buildDays(tripId:string,o:PdfExportOptions):Promise<Day[]>{
  const [
    {data:days,error:daysErr},
    {data:stays},
    {data:trans},
    {data:acts},
    {data:dine},
  ] = await Promise.all([
    supabase.from(TABLES.days)      .select('day_id,date,title').eq('trip_id',tripId).order('date'),
    supabase.from(TABLES.stays)     .select('*').eq('trip_id',tripId),
    supabase.from(TABLES.transport) .select('*').eq('trip_id',tripId),
    supabase.from(TABLES.activities).select('*').eq('trip_id',tripId),
    supabase.from(TABLES.dining)    .select('*').eq('trip_id',tripId),
  ]);
  if (daysErr) throw daysErr;

  return (days??[]).map(day=>{
    const items:Item[]=[];

    /* accommodation ----------------------------------------------------- */
    if (o.sections.accommodation) {
      (stays??[]).forEach(s=>{
        if(!s.hotel_checkin_date||!s.hotel_checkout_date) return;
        const inRange =
          isSameDay(day.date,s.hotel_checkin_date)||isSameDay(day.date,s.hotel_checkout_date)||
          (parseISO(day.date)>=parseISO(s.hotel_checkin_date)&&parseISO(day.date)<=parseISO(s.hotel_checkout_date));
        if(!inRange) return;

        const isIn = isSameDay(day.date,s.hotel_checkin_date);
        const isOut= isSameDay(day.date,s.hotel_checkout_date);
        const when = isIn?s.checkin_time:isOut?s.checkout_time:null;

        items.push({
          type:'accommodation',
          title:`${isIn?'Check-in':isOut?'Check-out':'Stay'}: ${s.hotel}`,
          time:fmtTime(when)||'All-day',
          details:s.hotel_details||undefined,
          location:s.hotel_address||undefined,
          cost:s.cost!=null?`${s.currency} ${s.cost}`:undefined,
          thumb:o.showImages&&s.image_url?s.image_url:undefined,
          sortKey:minsFromTime(fmtTime(when)||'0:00 am'),
        });
      });
    }

    /* transportation ---------------------------------------------------- */
    if (o.sections.transportation) {
      (trans??[]).forEach(t=>{
        if(!isSameDay(t.start_date,day.date)) return;

        const title = t.type==='flight'
          ?`Flight${t.provider?`: ${t.provider}`:''}`
          :t.type.charAt(0).toUpperCase()+t.type.slice(1);

        // Build start–end time string
        const startStr = fmtTime(t.start_time);
        const endStr   = fmtTime(t.end_time);
        const timeStr  = startStr && endStr ? `${startStr} – ${endStr}` : startStr || endStr || 'All-day';

        items.push({
          type:'transportation',
          title,
          time:timeStr,
          details:t.details||undefined,
          location:t.departure_location&&t.arrival_location
            ?`From: ${t.departure_location} → ${t.arrival_location}`
            :t.departure_location||undefined,
          cost:t.cost!=null?`${t.currency} ${t.cost}`:undefined,
          sortKey:minsFromTime(startStr||'0:00 am'),
        });
      });
    }

    /* activities -------------------------------------------------------- */
    if(o.sections.activities){
      (acts??[]).filter(a=>a.day_id===day.day_id).forEach(a=>{
        items.push({
          type:'activity',
          title:a.title||'Activity',
          time:fmtTime(a.start_time)||'All-day',
          details:a.description||undefined,
          cost:a.cost!=null?`${a.currency} ${a.cost}`:undefined,
          sortKey:minsFromTime(fmtTime(a.start_time)||'0:00 am'),
        });
      });
    }

    /* dining ------------------------------------------------------------ */
    if(o.sections.dining){
      (dine??[]).forEach(r=>{
        const match=(r.day_id&&r.day_id===day.day_id)||(r.reservation_time&&isSameDay(r.reservation_time,day.date));
        if(!match) return;
        const meta=[];
        if(r.number_of_people) meta.push(`${r.number_of_people} ${r.number_of_people===1?'person':'people'}`);
        if(r.address) meta.push(r.address);

        items.push({
          type:'dining',
          title:`Dining: ${r.restaurant_name}`,
          time:fmtTime(r.reservation_time)||'All-day',
          details:r.notes||undefined,
          location:meta.join(' · ')||undefined,
          cost:r.cost!=null?`${r.currency} ${r.cost}`:undefined,
          sortKey:minsFromTime(fmtTime(r.reservation_time)||'0:00 am'),
        });
      });
    }

    return {...day,items:items.sort((a,b)=>a.sortKey-b.sortKey)};
  });
}

/* ---------- table render --------------------------------------------- */

function renderTable(items:Item[],o:PdfExportOptions){
  if(!items.length) return {text:'No activities scheduled',style:'itemMeta',margin:[0,0,0,6]};

  const body = items.map(it=>{
    const icon = ICON[it.type]||'';
    const stack:any[]=[{text:`${icon} ${it.title}`,style:'itemTitle'}];

    if(o.detailLevel!=='minimal'&&it.details) stack.push({text:it.details,style:'itemDetail'});

    if((o.detailLevel!=='minimal'&&it.location)||(o.showCosts&&it.cost)){
      const meta=[];
      if(o.detailLevel!=='minimal'&&it.location) meta.push(it.location);
      if(o.showCosts&&it.cost) meta.push(`Cost: ${it.cost}`);
      stack.push({text:meta.join('   •   '),style:'itemMeta'});
    }

    if(it.thumb&&o.showImages) stack.push({image:it.thumb,width:64,margin:[0,4,0,0]});

    return [
      {text:it.time,style:'timeCell',alignment:'right'},
      {stack},
    ];
  });

  return {table:{widths:[60,'*'],body},layout:'noBorders' as const};
}

/* ---------- export ---------------------------------------------------- */

export async function exportItineraryPdf(tripId:string,o:PdfExportOptions){
  const {data:trip,error}=await supabase.from(TABLES.trip)
    .select('destination,arrival_date,departure_date,cover_image_url')
    .eq('trip_id',tripId).single();
  if(error||!trip) throw error??new Error('Trip not found');

  const dateRange=trip.arrival_date&&trip.departure_date
    ?`${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`:'';

  const days=await buildDays(tripId,o);

  const doc:pdfMake.TDocumentDefinitions={
    pageSize:'LETTER',
    pageMargins:PAGE_MARGINS,
    defaultStyle:{fontSize:10,lineHeight:1.25},
    header:()=>({text:`${trip.destination} • ${dateRange}`,alignment:'center',fontSize:9,margin:[0,10,0,0],color:'#666'}),
    footer:(p,c)=>({text:`Page ${p} of ${c} • exported ${fnsFormat(new Date(),'PP p')}`,alignment:'center',fontSize:8,margin:[0,0,0,10],color:'#999'}),
    content:[
      ...(o.showImages&&trip.cover_image_url?[{image:await toDataURI(trip.cover_image_url),width:540,margin:[0,0,0,12]}]:[]),
      {text:`${trip.destination} Itinerary`,style:'heroTitle'},
      {text:dateRange,style:'heroSub',margin:[0,0,0,16]},
      ...days.flatMap(d=>[
        {text:d.title?.trim()?`${d.title} – ${fmtDate(d.date)}`:fmtDate(d.date),style:'dayHeader',margin:[0,8,0,6]},
        renderTable(d.items,o)
      ]),
    ],
    styles:{
      heroTitle:{fontSize:18,bold:true},
      heroSub:{fontSize:12,color:'#6b6b6b'},
      dayHeader:{fontSize:14,bold:true,color:'#333'},
      timeCell:{fontSize:9,color:'#6b6b6b'},
      itemTitle:{bold:true},
      itemDetail:{fontSize:10},
      itemMeta:{italics:true,color:'#6b6b6b'},
    },
  };

  const safe=trip.destination.replace(/[^a-z0-9]/gi,'_').toLowerCase();
  pdfMake.createPdf(doc).download(`${safe}-itinerary.pdf`);
}
