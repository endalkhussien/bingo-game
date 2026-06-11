'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/presentation/components/shared/page-header';

const reports = [
  { href: '/admin/reports/revenue', label: 'Revenue Report', desc: 'Total bets and platform revenue' },
  { href: '/admin/reports/profit', label: 'Profit Report', desc: 'Platform profit breakdown' },
  { href: '/admin/reports/agents', label: 'Agent Performance', desc: 'Per-agent stats and comparison' },
  { href: '/admin/reports/recharge', label: 'Recharge Report', desc: 'All recharge request history' },
  { href: '/admin/reports/games', label: 'Game History', desc: 'Complete game log' },
];

export default function ReportsHubPage() {
  return (
    <div>
      <PageHeader title="Reports" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.href} href={r.href} className="rounded-xl bg-white p-5 shadow-sm border hover:border-blue-300 transition-colors">
            <h3 className="font-semibold text-gray-900">{r.label}</h3>
            <p className="mt-1 text-sm text-gray-500">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
