'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME } from '@/shared/brand';
import { isVendorRole } from '@/shared/roles';
import { SHOP_ADMIN_HOME } from '@/shared/admin-routes';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && !isVendorRole(user.role)) {
      router.replace(user.role === 'OPERATOR' ? SHOP_ADMIN_HOME : '/agent/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !isVendorRole(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-violet-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-violet-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-lg font-bold">{APP_NAME}</p>
            <p className="text-xs text-violet-300">Vendor — generate TOL for shop admin only</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-violet-200">{user.fullName}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm hover:bg-violet-900"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
