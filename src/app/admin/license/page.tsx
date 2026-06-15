'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isVendorRole } from '@/shared/roles';
import { TextArea } from '@/presentation/components/shared/text-area';
import { formatDate } from '@/presentation/lib/utils';

interface LicenseStatus {
  active: boolean;
  validUntil: number;
  shopName: string;
  period: string;
  daysRemaining: number;
  vendorCommissionRate: number;
}

interface CommissionReport {
  periodDays: number;
  gameCount: number;
  totalBets: number;
  vendorCommissionDue: number;
  vendorCommissionRate: number;
}

export default function OperatorLicensePage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && isVendorRole(user.role)) router.replace('/admin/vendor');
  }, [user, router]);

  const load = () => {
    ipc<LicenseStatus>('license:status').then(setStatus).catch(() => {});
    ipc<CommissionReport>('license:commission-report', 7).then(setReport).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async () => {
    if (!code.trim()) {
      setError('Paste your TOL license code from the vendor');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await ipc<{ success: boolean; data?: { message: string }; error?: string }>(
      'license:activate',
      code.trim(),
    );
    setLoading(false);
    if (result.success) {
      setSuccess(result.data?.message ?? 'License activated');
      setCode('');
      load();
      setTimeout(() => router.replace('/admin/dashboard'), 1500);
    } else {
      setError(result.error ?? 'Activation failed');
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Activate Shop Admin (TOL)" />
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">Step 1 for shop admin — paste TOL from vendor</p>
        <p className="mt-1">
          Logged in as shop admin <strong>{user?.username}</strong>. Your vendor sends a <strong>TOL-</strong> code
          (weekly or monthly). After activation you can create agents and issue <strong>TAS</strong> codes to them.
        </p>
      </div>

      {status && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${status.active ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          <p className="font-semibold">{status.active ? 'License active' : 'License expired or not activated'}</p>
          {status.shopName && <p className="mt-1">Shop: {status.shopName}</p>}
          {status.active && (
            <p className="mt-1">Valid until {formatDate(status.validUntil)} ({status.daysRemaining} days left)</p>
          )}
        </div>
      )}

      {report && report.gameCount > 0 && (
        <div className="mb-6 rounded-xl border bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-gray-800">This week — commission due to vendor</p>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-xs text-gray-500">
            {report.gameCount} games · {report.totalBets.toFixed(0)} ETB total bets · vendor share {report.vendorCommissionRate}%
          </p>
          <p className="mt-2 text-xs text-gray-600">Pay your vendor, then paste the new TOL code below.</p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <TextArea
          label="TOL code from vendor"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="Paste TOL- code from vendor"
          rows={4}
          className="font-mono text-xs"
        />
        <button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Activating…' : 'Activate shop admin license'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
      </div>
    </div>
  );
}
