/* app/api/organiser/places/route.js
   Google Places proxy — keeps the API key server-side.
   GET ?q=query      → autocomplete predictions
   GET ?place_id=ID  → place name + Google Maps URL
*/
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

export async function GET(req) {
  try {
    const { errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return Response.json({ error: 'Maps not configured' }, { status: 503 });

    const { searchParams } = new URL(req.url);
    const q       = searchParams.get('q');
    const placeId = searchParams.get('place_id');

    if (placeId) {
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,url&key=${key}`
      );
      const data = await res.json();
      if (data.status !== 'OK') return Response.json({ error: 'Place not found' }, { status: 404 });
      return Response.json({ name: data.result.name, maps_url: data.result.url });
    }

    if (q) {
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${key}`
      );
      const data = await res.json();
      return Response.json({
        predictions: (data.predictions || []).slice(0, 5).map(p => ({
          description: p.description,
          place_id:    p.place_id,
        })),
      });
    }

    return Response.json({ error: 'Missing q or place_id' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
