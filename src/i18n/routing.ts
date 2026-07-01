import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uk', 'ru', 'en'],
  defaultLocale: 'uk',
  localePrefix: 'never',
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 31536000 },
});
