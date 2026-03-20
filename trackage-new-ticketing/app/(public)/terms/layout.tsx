import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for using the Trackage Scheme ticketing platform.',
  alternates: { canonical: 'https://tickets.trackagescheme.com/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
