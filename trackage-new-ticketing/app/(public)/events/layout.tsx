import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upcoming Music Events in Malta',
  description:
    'Browse and buy tickets for upcoming concerts, festivals, album launches, and electronic parties across Malta and Gozo.',
  alternates: { canonical: 'https://tickets.trackagescheme.com/events' },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
