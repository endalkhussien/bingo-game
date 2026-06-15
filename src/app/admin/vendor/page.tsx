'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isVendorRole } from '@/shared/roles';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { formatDate } from '@/presentation/lib/utils';

export default function VendorPortalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [commissionRate, setCommissionRate] = useState('20');
  const [generated, setGenerated] = useState<{
    code: string;
    validUntil: number;
    period: string;
    validDays: number;
  } | null>(null);
  const [report, setReport] = useState<{
    gameCount: number;
    totalBets: number;
    vendorCommissionDue: number;
    shopName: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !isVendorRole(user.role)) router.replace('/admin/dashboard');
  }, [user, router]);

  useEffect(() => {
    ipc('license:commission-report', 7).then(setReport).catch(() => {});
  }, []);

  const generate = async (days: 7 | 30) => {
    setError('');
    setGenerated(null);
    const result = await ipc<{
      success: boolean;
      data?: { code: string; validUntil: number; period: string; validDays: number };
      error?: string;
    }>('license:generate', shopName, days, parseFloat(commissionRate) || 20);
    if (result.success && result.data) {
      setGenerated(result.data);
    } else {
      setError(result.error ?? 'Failed to generate license');
    }
  };

  if (!user || !isVendorRole(user.role)) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Vendor Super Admin" />
      <div className="mb-6 rounded-xl border border-violet-300 bg-violet-50 p-4 text-sm text-violet-900">
        <p className="font-semibold">You are the vendor (super admin)</p>
        <p className="mt-1">Generate weekly (7 day) or monthly (30 day) <strong>TOL-</strong> license codes for shop operators.
          Commission due is calculated from games played on their PC.</p>
      </div>

      {report && (
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <p className="font-semibold">Shop commission this week (on this PC)</p>
          <p className="mt-2 text-3xl font-bold text-violet-700">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-gray-600">
            {report.gameCount} games · {report.totalBets.toFixed(0)} ETB bets
            {report.shopName ? ` · ${report.shopName}` : ''}
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Shop name</label>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Bole Hall"
            className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Your commission % (from agent earnings)</label>
          <input type="number" min={0} max={100} step={1} value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => generate(7)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
            Generate weekly TOL (7 days)
          </button>
          <button type="button" onClick={() => generate(30)}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
            Generate monthly TOL (30 days)
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Send to shop operator ({generated.validDays}-day {generated.period} license)
            </p>
            <p className="mt-1 text-xs text-emerald-800">Expires {formatDate(generated.validUntil)}</p>
            <p className="mt-3 break-all font-mono text-xs">{generated.code}</p>
            <CopyButton text={generated.code} label="Copy TOL code" variant="primary" className="mt-3" />
          </div>
        )}
      </div>
    </div>
  );
}
