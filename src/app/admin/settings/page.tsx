'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: '/admin/settings/general', label: 'General Settings', desc: 'Currency, timezone, bet limits' },
          { href: '/admin/settings/voice', label: 'Voice Settings', desc: 'Default voice and language' },
          { href: '/admin/settings/backup', label: 'Backup & Restore', desc: 'Database backup management' },
        ].map((s) => (
          <Link key={s.href} href={s.href} className="rounded-xl bg-white p-5 shadow-sm border hover:border-blue-300">
            <h3 className="font-semibold">{s.label}</h3>
            <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
