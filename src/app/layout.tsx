import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import AppShell from '@/components/AppShell';
import { Providers } from '@/components/Providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hiker-app-six.vercel.app'),
  title: 'ProHikes — Планування походів',
  description:
    'Застосунок для планування туристичного спорядження та розкладок харчування',
  openGraph: {
    title: 'ProHikes — Планування походів',
    description: 'Застосунок для планування туристичного спорядження та розкладок харчування',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'ProHikes',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProHikes — Планування походів',
    description: 'Застосунок для планування туристичного спорядження та розкладок харчування',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ProHikes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        {process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 antialiased font-sans">
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <AppShell>{children}</AppShell>
          </NextIntlClientProvider>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
