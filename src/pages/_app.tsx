import { useEffect, useState } from "react";
import "@/styles/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { AppProps } from "next/app";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";
import { SerwistProvider } from "@serwist/next/react";
import { Providers } from "@/components/Providers";
import AppShell from "@/components/AppShell";
import Toaster from "@/components/Toaster";
import uk from "@/i18n/messages/uk.json";
import ru from "@/i18n/messages/ru.json";
import en from "@/i18n/messages/en.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const allMessages: Record<string, Record<string, unknown>> = {
  uk: uk as Record<string, unknown>,
  ru: ru as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const SUPPORTED_LOCALES = ["uk", "ru", "en"];

function getPathLocale(asPath: string): string {
  const pathParts = asPath.split("/").filter(Boolean);
  if (pathParts.length > 0 && SUPPORTED_LOCALES.includes(pathParts[0])) {
    return pathParts[0];
  }
  return "uk";
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [locale, setLocale] = useState(() => getPathLocale(router.asPath));
  const messages = allMessages[locale];

  useEffect(() => {
    // Path prefix always wins; cookie lookup only when no prefix
    if (getPathLocale(router.asPath) !== "uk") return;
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match && SUPPORTED_LOCALES.includes(match[1]) && match[1] !== "uk") {
      setLocale(match[1]);
    }
  }, [router.asPath]);

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 antialiased font-sans`}
      suppressHydrationWarning
    >
      <Providers>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SerwistProvider swUrl="/sw.js">
            <Toaster />
            <AppShell>
              <Component {...pageProps} />
            </AppShell>
            <Analytics />
          </SerwistProvider>
        </NextIntlClientProvider>
      </Providers>
    </div>
  );
}
