import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Trackage Scheme — Malta\'s Music Platform',
  description:
    'Empowering Malta\'s alternative music scene since 2016. Learn about Trackage Scheme — from grassroots gigs to sold-out nights.',
  alternates: { canonical: 'https://tickets.trackagescheme.com/about' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
