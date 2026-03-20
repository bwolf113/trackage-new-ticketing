import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://tickets.trackagescheme.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-MT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Malta',
  });
}

async function getEvent(slug: string) {
  const supabase = getSupabase();
  // Try slug first, fall back to id
  let { data } = await supabase
    .from('events')
    .select('id, slug, name, description, venue_name, start_time, thumbnail_url, poster_url')
    .eq('slug', slug)
    .single();
  if (!data) {
    ({ data } = await supabase
      .from('events')
      .select('id, slug, name, description, venue_name, start_time, thumbnail_url, poster_url')
      .eq('id', slug)
      .single());
  }
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getEvent(slug);
    if (!event) return { title: 'Event Not Found' };

    const eventPath = event.slug || event.id;
    const dateStr = event.start_time ? fmtDate(event.start_time) : '';
    const venue = event.venue_name || 'Malta';
    const title = `${event.name} — ${dateStr}`;
    const description = event.description
      ? `${event.description.slice(0, 150).trim()}…`
      : `Buy tickets for ${event.name} at ${venue}. ${dateStr}.`;
    const image = event.poster_url || event.thumbnail_url || '/og-image.png';

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        url: `${SITE_URL}/events/${eventPath}`,
        title: `${event.name} — Tickets`,
        description,
        images: [{ url: image, width: 1200, height: 630, alt: event.name }],
        siteName: 'Trackage Scheme Tickets',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${event.name} — Tickets`,
        description,
        images: [image],
      },
      alternates: { canonical: `${SITE_URL}/events/${eventPath}` },
    };
  } catch {
    return { title: 'Event' };
  }
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let jsonLd = null;
  try {
    const event = await getEvent(slug);
    if (event) {
      const eventPath = event.slug || event.id;
      const image = event.poster_url || event.thumbnail_url || '/og-image.png';
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: event.name,
        startDate: event.start_time,
        location: {
          '@type': 'Place',
          name: event.venue_name || 'Malta',
          address: { '@type': 'PostalAddress', addressCountry: 'MT' },
        },
        image,
        description: event.description || '',
        organizer: { '@type': 'Organization', name: 'Trackage Scheme', url: SITE_URL },
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/events/${eventPath}`,
          availability: 'https://schema.org/InStock',
          priceCurrency: 'EUR',
        },
      };
    }
  } catch {
    // Skip JSON-LD if fetch fails
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
