'use client';

import { useState } from 'react';
import { KeyRound, Phone, LogIn, CheckCircle2 } from 'lucide-react';
import { invokeIpc } from '@/presentation/lib/ipc';
import { SHOP_ADMIN_HOME, TOL_JUST_ACTIVATED_KEY } from '@/shared/admin-routes';
import { normalizeAdminActivationCodeInput } from '@/shared/voucher/admin-activation-code';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { APP_NAME } from '@/shared/brand';

const STEPS = [
  {
    num: '1',
    icon: LogIn,
    title: 'Login as Admin',
    titleAm: 'እንደ አድሚን ግባ',
    text: 'Sign in with your shop admin username and password (change password after first login)',
    textAm: 'በሱቅ አድሚን የተጠቃሚ ስም እና የይለፍ ቃልዎን በመጀመሪያ መግቢያ ይቀይሩ',
  },
  {
    num: '2',
    icon: Phone,
    title: 'Get key from Vendor',
    titleAm: 'ከሻጭ ቁልፍ ያግኙ',
    text: 'Call or message your vendor. They will send you a long code starting with TAK-',
    textAm: 'ሻጩን ይደውሉ። TAK- የሚبدأ የረጅም ኮድ ይላክልዎታል።',
  },
  {
    num: '3',
    icon: KeyRound,
    title: 'Paste key & press ACTIVATE',
    titleAm: 'ኮዱን ይለጥፉ እና አግብር ይጫኑ',
    text: 'Copy the whole code. Paste below. Press the big amber button.',
    textAm: 'ሙሉውን ኮድ ቅዳ → ከታች ይለጥፉ → ቀለም ቁልፍ ይጫኑ።',
  },
];

export default function AdminLicensePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const normalized = normalizeAdminActivationCodeInput(code);
      if (!normalized) {
        setError('Please paste the activation key from your vendor.');
        return;
      }

      const r = await invokeIpc<{
        success: boolean;
        error?: string;
        data?: { message?: string; walletBalance?: number; amount?: number };
      }>('license:activate', normalized);

      if (r?.success) {
        sessionStorage.setItem(TOL_JUST_ACTIVATED_KEY, '1');
        const balance = r.data?.walletBalance ?? r.data?.amount;
        setSuccess(
          balance != null
            ? `Success! Balance: ${balance.toFixed(0)} ETB`
            : 'Success! Your shop admin is now active.',
        );
        window.dispatchEvent(new CustomEvent('waliya:balance-updated', { detail: balance ?? 0 }));
        window.setTimeout(() => {
          window.location.assign(SHOP_ADMIN_HOME);
        }, 1500);
      } else {
        setError(r?.error ?? 'Invalid key. Ask vendor for a new one.');
      }
    } catch {
      setError('Could not activate. Try again or contact your vendor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <AppLogo size={140} className="mx-auto rounded-2xl shadow-xl ring-2 ring-amber-400/40" />
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{APP_NAME}</h1>
        <p className="mt-2 text-xl font-bold text-amber-400">Shop Admin — Enter Activation Key</p>
        <p className="mt-1 text-lg text-amber-100/60">የሱቅ አድሚን — የማግበር ቁልፍ ያስገቡ</p>
      </div>

      <div className="mb-8 space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="flex gap-4 rounded-2xl border-2 border-amber-900/40 bg-[#2a1f18]/80 p-5 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xl font-black text-white">
                {step.num}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-amber-400" />
                  <p className="text-lg font-bold text-white">{step.title}</p>
                </div>
                <p className="text-base font-semibold text-amber-100/80">{step.titleAm}</p>
                <p className="mt-1 text-sm text-amber-100/60">{step.text}</p>
                <p className="mt-0.5 text-sm text-amber-100/50">{step.textAm}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleActivate} className="rounded-2xl border-2 border-amber-600/50 bg-[#2a1f18]/90 p-6 shadow-lg">
        <label className="block text-center text-xl font-bold text-white">
          Paste activation key here
        </label>
        <p className="text-center text-base text-amber-100/60">የማግበር ቁልፍ እዚህ ይለጥፉ</p>

        <textarea
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); setSuccess(''); }}
          rows={5}
          className="mt-4 w-full rounded-xl border-2 border-amber-800/50 bg-[#1a1410] px-4 py-4 text-base font-mono leading-relaxed text-white placeholder:text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          placeholder="TAK-xxxxxxxx..."
          autoFocus
        />

        {error && (
          <p className="mt-4 rounded-lg bg-red-900/40 px-4 py-3 text-center text-base font-semibold text-red-200">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-900/40 px-4 py-3 text-center text-base font-semibold text-amber-100">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="mt-6 w-full rounded-2xl bg-amber-600 py-5 text-2xl font-black uppercase tracking-wide text-white shadow-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : 'ACTIVATE'}
        </button>
        <p className="mt-2 text-center text-sm text-amber-100/50">ቀለም ቁልፍ — Activate</p>
      </form>

      <p className="mt-8 text-center text-sm text-amber-100/50">
        No key? Contact your vendor. Do not use the <strong className="text-amber-200">vendor</strong> login — use <strong className="text-amber-200">admin</strong>.
      </p>
    </div>
  );
}
