'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/client';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState<boolean | null>(isPublic(pathname) ? true : null);

  useEffect(() => {
    if (isPublic(pathname)) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) router.replace('/login');
      else if (pathname === '/login') router.replace('/');
      else setReady(true);
    })();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (ready === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-hidden="true" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
