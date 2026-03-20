import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://tickets.trackagescheme.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/events`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamically add published event pages
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: events } = await supabase
      .from('events')
      .select('id, slug, updated_at, start_time')
      .eq('status', 'published')
      .order('start_time', { ascending: false });

    if (events) {
      for (const event of events) {
        staticPages.push({
          url: `${SITE_URL}/events/${event.slug || event.id}`,
          lastModified: new Date(event.updated_at || event.start_time),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // If DB fetch fails, return static pages only
  }

  return staticPages;
}
