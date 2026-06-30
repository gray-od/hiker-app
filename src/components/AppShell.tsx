import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('@/components/ChatWidget'), {
  ssr: false,
  loading: () => null,
});
import SWRegister from '@/components/SWRegister';
import OfflineBanner from '@/components/OfflineBanner';

const PUBLIC_ROUTES = ['/login', '/privacy'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

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
