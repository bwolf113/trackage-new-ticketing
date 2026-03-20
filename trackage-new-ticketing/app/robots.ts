import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/organiser/', '/api/', '/scan/'],
      },
    ],
    sitemap: 'https://tickets.trackagescheme.com/sitemap.xml',
  };
}
