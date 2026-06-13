import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: { default: 'پنل مدیریت CMS', template: '%s | CMS Platform' },
  description: 'پنل مدیریت محتوای CMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
