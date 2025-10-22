import { generateItineraryPDF, getPDFFilename } from '@/services/html-pdf-export';
import { supabase } from '@/integrations/supabase/serverClient'; // ensure server client

async function readJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  const body = await readJson(req);
  if (!body?.tripId) {
    return new Response(JSON.stringify({ error: 'Missing tripId' }), { status: 400 });
  }

  const { tripId, options } = body;

  try {
    // Fetch the complete trip (adjust fields for your schema)
    const { data, error } = await supabase
      .from('trips')
      .select(`
        destination, arrival_date, departure_date, cover_image_url,
        trip_days (*, day_activities (*), accommodations (*), transportation (*), reservations (*))
      `)
      .eq('trip_id', tripId)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), { status: 404 });
    }

    const pdf = await generateItineraryPDF(data as any, options);
    const filename = getPDFFilename(data.destination || 'itinerary', { simple: options?.detailLevel !== 'full' });

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('Export itinerary PDF failed:', e?.message, e?.stack);
    return new Response(JSON.stringify({
      error: 'PDF generation failed',
      detail: e?.message || 'unknown error',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
