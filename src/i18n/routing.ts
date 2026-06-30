import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['uk', 'ru', 'en'],
  defaultLocale: 'uk',
  localePrefix: 'never',
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 31536000 },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
