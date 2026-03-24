import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'AutoCut Pro — AI Video Editing',
    template: '%s | AutoCut Pro',
  },
  description:
    'Edit videos automatically with AI. Remove pauses, silences, and dead air in minutes.',
  keywords: ['video editing', 'AI', 'auto cut', 'silence removal', 'video tool'],
  openGraph: {
    title: 'AutoCut Pro — AI Video Editing',
    description:
      'Edit videos automatically with AI. Remove pauses, silences, and dead air in minutes.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
