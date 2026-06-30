import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import uk from './messages/uk.json';
import ru from './messages/ru.json';
import en from './messages/en.json';

const allMessages: Record<string, Record<string, unknown>> = {
  uk: uk as Record<string, unknown>,
  ru: ru as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    if (cookieLocale && routing.locales.includes(cookieLocale as (typeof routing.locales)[number])) {
      locale = cookieLocale;
    } else {
      locale = routing.defaultLocale;
    }
  }

  return {
    locale,
    messages: allMessages[locale],
  };
});
