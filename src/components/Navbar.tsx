'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Compass,
  Backpack,
  ClipboardList,
  UtensilsCrossed,
  Settings,
  LogOut,
  Globe,
  Heart,
  Apple,
} from 'lucide-react';
import { useState, useCallback } from 'react';

const locales = [
  { code: 'uk', label: 'UA' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
] as const;

const sidebarItems = [
  { href: '/', icon: Compass, labelKey: 'dashboard' as const },
  { href: '/gear', icon: Backpack, labelKey: 'gear' as const },
  { href: '/lists', icon: ClipboardList, labelKey: 'lists' as const },
  { href: '/meals', icon: UtensilsCrossed, labelKey: 'meals' as const },
  { href: '/food', icon: Apple, labelKey: 'food' as const },
  { href: '/settings', icon: Settings, labelKey: 'settings' as const },
];

const bottomNavItems = [
  { href: '/', icon: Compass, labelKey: 'dashboard' as const },
  { href: '/gear', icon: Backpack, labelKey: 'gear' as const },
  { href: '/lists', icon: ClipboardList, labelKey: 'lists' as const },
  { href: '/meals', icon: UtensilsCrossed, labelKey: 'meals' as const },
  { href: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export default function Navbar() {
  const pathname = usePathname();
  const tnav = useTranslations('nav');
  const tcommon = useTranslations('common');
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname.startsWith(href);
    },
    [pathname],
  );

  const switchLocale = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop side nav ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-screen md:fixed md:left-0 md:top-0 md:bg-white md:dark:bg-zinc-900 md:border-r md:border-zinc-200 md:dark:border-zinc-800 md:z-40 print:!hidden">
        {/* App name */}
        <div className="px-6 py-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-3 text-xl font-bold text-[#75a93a] tracking-tight">
            <img src="/logo-circle.png" alt="" className="w-8 h-8 rounded-full" />
            ProHikes
            <span className="text-[10px] font-medium bg-[#75a93a]/15 text-[#75a93a] px-1.5 py-0.5 rounded-md">beta</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#75a93a]/10 text-[#75a93a] dark:bg-[#75a93a]/20'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{tnav(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language + logout */}
        <div className="px-3 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Globe className="w-5 h-5 shrink-0" />
              <span>Language</span>
            </button>
            {langOpen && (
              <>
                {/* backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangOpen(false)}
                  aria-hidden
                />
                <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden z-20">
                  {locales.map((loc) => (
                    <button
                      key={loc.code}
                      onClick={() => {
                        switchLocale(loc.code);
                        setLangOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            <span>{tcommon('logout')}</span>
          </button>
          {process.env.NEXT_PUBLIC_DONATE_URL && (
            <a
              href={process.env.NEXT_PUBLIC_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
            >
              <Heart className="w-5 h-5 shrink-0" />
              <span>{tcommon('donate')}</span>
            </a>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-40 safe-area-bottom print:!hidden">
        <div className="flex items-center justify-around py-1.5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-0 ${
                  active ? 'text-[#75a93a]' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-medium leading-tight truncate max-w-[56px]">
                  {tnav(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile top header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-40 safe-area-top print:!hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#75a93a] tracking-tight">
            <img src="/logo-circle.png" alt="" className="w-7 h-7 rounded-full" />
            ProHikes
            <span className="text-[9px] font-medium bg-[#75a93a]/15 text-[#75a93a] px-1.5 py-0.5 rounded-md">beta</span>
          </Link>
          <div className="flex items-center">
            {process.env.NEXT_PUBLIC_DONATE_URL && (
              <a
                href={process.env.NEXT_PUBLIC_DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 p-2.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
              >
                <Heart className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={handleLogout}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-2.5 -mr-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={tcommon('logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
