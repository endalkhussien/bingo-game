'use client';

import { User } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ModeBadge } from '@/presentation/components/shared/mode-badge';

export function AdminHeader() {
  const { user } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Bingo Management Platform</span>
        <ModeBadge />
      </div>
      <div className="flex items-center gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          <option>English</option>
          <option>አማርኛ</option>
        </select>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium">{user?.fullName ?? 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
