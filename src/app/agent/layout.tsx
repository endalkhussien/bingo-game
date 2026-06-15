'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isAdminRole } from '@/shared/roles';
import { getPostLoginPath } from '@/shared/roles';
import { AgentSidebar } from '@/presentation/components/layout/agent-sidebar';
import { AgentHeader } from '@/presentation/components/layout/agent-header';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && isAdminRole(user.role)) router.replace(getPostLoginPath(user.role));
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AgentSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AgentHeader />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
