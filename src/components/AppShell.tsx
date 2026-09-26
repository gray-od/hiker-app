import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';
import SWRegister from '@/components/SWRegister';
import OfflineBanner from '@/components/OfflineBanner';
import { syncPendingMutations } from '@/lib/supabase/service';
import { prewarmRoutes } from '@/lib/prewarmRoutes';

const ChatWidget = dynamic(() => import('@/components/ChatWidget'), {
  ssr: false,
  loading: () => null,
});

const PUBLIC_ROUTES = ['/login', '/privacy', '/forgot-password'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Queue entries belong to a signed-in user, so there is nothing to replay on public routes.
    if (isPublic) return;

    // Never replay while the device is offline: without connectivity every queued
    // request can only fail, and a failed entry stays queued for the next reconnect.
    const syncIfOnline = () => {
      if (navigator.onLine) syncPendingMutations();
    };
    syncIfOnline();
    window.addEventListener('online', syncIfOnline);
    return () => window.removeEventListener('online', syncIfOnline);
  }, [isPublic]);

  // Keyed on `isPublic`: signing in navigates client-side, so the shell survives
  // the switch from a public route to a private one and the cold-load effect above
  // never sees it. Only private pages are warmed — public ones carry no session data.
  useEffect(() => {
    if (!isPublic) prewarmRoutes();
  }, [isPublic]);

  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pt-14 md:pt-0 pb-16 md:pb-0 md:pl-64 min-h-screen print:!pt-0 print:!pb-0 print:!pl-0">
        {children}
      </main>
      <ChatWidget />
      <SWRegister />
      <OfflineBanner />
    </>
  );
}
