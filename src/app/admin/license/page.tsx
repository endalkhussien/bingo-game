'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isShopAdminRole, isVendorRole } from '@/shared/roles';
import { VENDOR_HOME } from '@/shared/admin-routes';
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
    if (user && isVendorRole(user.role)) router.replace(VENDOR_HOME);
  }, [user, router]);

  const load = () => {
    ipc<LicenseStatus>('license:status').then(setStatus).catch(() => {});
    ipc<CommissionReport>('license:commission-report', 7).then(setReport).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Paste the TOL code from your vendor');
      return;
    }
    if (!isShopAdminRole(user?.role ?? '')) {
      setError('Login as shop admin (username: admin) to activate TOL. Vendor cannot paste TOL here.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await ipc<{ success: boolean; data?: { message: string }; error?: string }>(
        'license:activate',
        trimmed,
      );
      if (result?.success) {
        setSuccess(result.data?.message ?? 'Shop admin license activated!');
        setCode('');
        load();
        setTimeout(() => router.replace('/admin/dashboard'), 1200);
      } else {
        setError(result?.error ?? 'Activation failed — check the TOL code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  if (user && isVendorRole(user.role)) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Activate Shop Admin (TOL)" />
      <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Shop admin must paste TOL here before anything else works</p>
        <p className="mt-2">
          Logged in as <strong>{user?.username ?? '…'}</strong>.
          Your vendor sends a <strong>TOL-</strong> code (weekly or monthly).
          After this works you can create agents and send them <strong>TAS</strong> codes.
        </p>
        {user && !isShopAdminRole(user.role) && (
          <p className="mt-2 font-semibold text-red-700">
            Wrong account — use shop admin login <strong>admin</strong>, not vendor.
          </p>
        )}
      </div>

      {status && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${status.active ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          <p className="font-semibold">{status.active ? 'TOL license active' : 'TOL not activated yet'}</p>
          {status.shopName && <p className="mt-1">Shop: {status.shopName}</p>}
          {status.active && (
            <p className="mt-1">Valid until {formatDate(status.validUntil)} ({status.daysRemaining} days left)</p>
          )}
        </div>
      )}

      {report && report.gameCount > 0 && (
        <div className="mb-6 rounded-xl border bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-gray-800">Commission due to vendor this week</p>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-xs text-gray-500">
            {report.gameCount} games · {report.totalBets.toFixed(0)} ETB bets
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <TextArea
          label="Paste TOL code from vendor"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="TOL-xxxxxxxx…"
          rows={5}
          className="font-mono text-xs"
        />
        <button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Activating…' : 'Activate TOL — unlock shop admin'}
        </button>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
      </div>
    </div>
  );
}
