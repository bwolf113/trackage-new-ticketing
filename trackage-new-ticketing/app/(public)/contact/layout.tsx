import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Trackage Scheme. Questions about events, ticketing, or selling tickets in Malta — we\'re here to help.',
  alternates: { canonical: 'https://tickets.trackagescheme.com/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
