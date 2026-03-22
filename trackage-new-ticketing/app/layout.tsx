/* app/layout.tsx */
import './globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-serif',
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const SITE_URL = 'https://tickets.trackagescheme.com';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Trackage Scheme — Buy Tickets for Music Events in Malta",
    template: "%s — Trackage Scheme Tickets",
  },
  description:
    "Buy tickets for Malta's best underground and alternative music events — concerts, festivals, album launches, electronic parties and more. Malta's only ticketing platform 100% dedicated to music.",
  keywords: [
    'Malta events',
    'Malta concerts',
    'buy tickets Malta',
    'music events Malta',
    'Malta festivals',
    'alternative music Malta',
    'Malta gigs',
    'electronic music Malta',
    'live music Malta',
    'Trackage Scheme',
    'Malta ticketing',
    'Gozo events',
  ],
  authors: [{ name: 'Trackage Scheme' }],
  creator: 'Trackage Scheme',
  openGraph: {
    type: 'website',
    locale: 'en_MT',
    url: SITE_URL,
    siteName: 'Trackage Scheme Tickets',
    title: "Trackage Scheme — Buy Tickets for Music Events in Malta",
    description:
      "Malta's only ticketing platform 100% dedicated to music. Concerts, festivals, album launches, and more.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "Trackage Scheme — Music Event Tickets in Malta",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Trackage Scheme — Buy Tickets for Music Events in Malta",
    description:
      "Malta's only ticketing platform 100% dedicated to music. Concerts, festivals, album launches, and more.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: '1Dig-KTSYe-CFIGDo9Ktf-5B1tNQbxCZsfU8gGfwJgY',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Trackage Scheme',
  url: 'https://tickets.trackagescheme.com',
  logo: 'https://tickets.trackagescheme.com/logo.png',
  description:
    "Malta's only online ticketing platform 100% dedicated to music. Buy tickets for concerts, festivals, album launches, and more.",
  areaServed: { '@type': 'Country', name: 'Malta' },
  sameAs: [],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`}>
      <head>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="d641050e-dd62-411e-b26a-681f0073051a"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-350GG9Q62F"
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-350GG9Q62F');`}
        </Script>
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
