import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Purdue Triathlon Club | Swim Leaderboard',
  description: 'Swim leaderboard for the Purdue Triathlon Club.',
  icons: {
    icon: '/purdue_tri_logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
