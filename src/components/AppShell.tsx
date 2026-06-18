'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

const PUBLIC_ROUTES = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pt-12 md:pt-0 pb-16 md:pb-0 md:pl-64 min-h-screen">
        {children}
      </main>
    </>
  );
}
