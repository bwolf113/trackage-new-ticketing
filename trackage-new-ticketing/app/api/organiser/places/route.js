/* app/api/organiser/places/route.js
   Google Places (New) proxy — keeps the API key server-side.
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

    // ── Place details (New API) ──
    if (placeId) {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
        {
          headers: {
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'displayName,googleMapsUri',
          },
        }
      );
      const data = await res.json();
      if (data.error) return Response.json({ error: 'Place not found' }, { status: 404 });
      return Response.json({
        name: data.displayName?.text || '',
        maps_url: data.googleMapsUri || '',
      });
    }

    // ── Autocomplete (New API) ──
    if (q) {
      const res = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
          },
          body: JSON.stringify({
            input: q,
            languageCode: 'en',
          }),
        }
      );
      const data = await res.json();
      console.log('[places autocomplete]', res.status, JSON.stringify(data).slice(0, 500));
      const suggestions = data.suggestions || [];
      return Response.json({
        predictions: suggestions.slice(0, 5).map(s => ({
          description: s.placePrediction?.text?.text || s.placePrediction?.structuredFormat?.mainText?.text || '',
          place_id: s.placePrediction?.placeId || '',
        })),
      });
    }

    return Response.json({ error: 'Missing q or place_id' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
