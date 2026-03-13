/* app/layout.jsx */
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "Trackage Scheme - Malta's only online ticketing platform 100% dedicated to music",
  description: "Buy tickets for Malta's best underground and alternative music events — concerts, festivals, album launches, electronic parties and more.",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<Analytics /></body>
    </html>
  );
}
