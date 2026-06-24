'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { cn } from '@/presentation/lib/utils';

interface UserMenuDropdownProps {
  label?: string;
  logoutLabel?: string;
  showName?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export function UserMenuDropdown({
  label,
  logoutLabel = 'Logout',
  showName = true,
  variant = 'light',
  className,
}: UserMenuDropdownProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = label ?? user?.fullName ?? 'User';
  const isDark = variant === 'dark';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${displayName} menu`}
        className={cn(
          'flex items-center gap-2 rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-2',
          isDark
            ? 'text-amber-100 hover:bg-amber-900/30 focus-visible:ring-amber-500/60'
            : 'text-gray-700 hover:bg-gray-100 focus-visible:ring-amber-500',
        )}
      >
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isDark ? 'bg-amber-900/40' : 'bg-gray-200',
          )}
        >
          <User className={cn('h-4 w-4', isDark ? 'text-amber-100' : 'text-gray-600')} />
        </div>
        {showName && (
          <span className={cn('text-sm font-medium', isDark ? 'text-amber-50' : 'text-gray-700')}>
            {displayName}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-lg border py-1 shadow-lg',
            isDark
              ? 'border-amber-900/50 bg-[#1a1410] shadow-black/40'
              : 'border-gray-200 bg-white',
          )}
        >
          <div
            className={cn(
              'border-b px-3 py-2 text-xs',
              isDark ? 'border-amber-900/40 text-amber-200/70' : 'border-gray-100 text-gray-500',
            )}
          >
            {displayName}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-sm',
              isDark
                ? 'text-amber-100 hover:bg-amber-900/40'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <LogOut className="h-4 w-4" />
            {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
