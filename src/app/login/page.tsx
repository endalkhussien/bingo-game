'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { ipc } from '@/presentation/lib/ipc';
import { getPostLoginPath, getShopAdminEntryPath, ROLE_OPERATOR } from '@/shared/roles';
import { TextInput } from '@/presentation/components/shared/text-input';
import { TextArea } from '@/presentation/components/shared/text-area';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await login(username, password, rememberMe);
    if (result.success && result.user) {
      if (result.user.role === ROLE_OPERATOR) {
        try {
          const status = await ipc<{
            active: boolean;
            activated?: boolean;
            needsActivation?: boolean;
            needsTopup?: boolean;
          }>('license:status');
          window.location.assign(getShopAdminEntryPath(status ?? { active: false }));
        } catch {
          window.location.assign(getShopAdminEntryPath({ active: false, needsActivation: true }));
        }
        return;
      } else {
        router.push(getPostLoginPath(result.user.role));
      }
    } else if (result.success) {
      router.push('/login');
    } else {
      setError(result.error ?? 'Login failed');
    }
    setLoading(false);
  };

  const handleActivate = async () => {
    if (!setupCode.trim()) {
      setError('Paste the TAS- setup code from your admin');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await ipc<{ success: boolean; data?: { username: string; message: string }; error?: string }>(
      'agents:activate-setup',
      setupCode.trim(),
    );
    setLoading(false);
    if (result.success && result.data) {
      setSuccess(result.data.message);
      setUsername(result.data.username);
      setMode('login');
      setSetupCode('');
    } else {
      setError(result.error ?? 'Activation failed');
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#1a1410]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/40 via-[#1a1410] to-[#1a1410]" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-violet-700/20 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        <div className="flex flex-1 flex-col justify-between px-8 py-10 lg:px-14 lg:py-12">
          <div>
            <div className="mb-8">
              <AppLogo size={140} className="rounded-2xl shadow-xl ring-2 ring-amber-400/40" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white lg:text-5xl">{APP_NAME}</h1>
            <p className="mt-3 text-lg text-slate-300">{APP_TAGLINE}</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              <strong className="text-white">Vendor</strong> → TAK activation key for shop ·
              <strong className="text-white"> Shop admin</strong> → TAS + TBG for agents ·
              <strong className="text-white"> Agent</strong> → Activate PC once
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/40">
            <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-amber-800 shadow' : 'text-gray-600'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode('activate'); setError(''); setSuccess(''); }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'activate' ? 'bg-white text-amber-800 shadow' : 'text-gray-600'}`}
              >
                Activate PC
              </button>
            </div>

            {mode === 'activate' ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900">Agent hall PC — first time?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Shop admin creates your account and sends a <strong>TAS-…</strong> code. Paste it here once.
                </p>
                <TextArea
                  value={setupCode}
                  onChange={(e) => { setSetupCode(e.target.value); setError(''); }}
                  placeholder="Paste TAS- setup code from admin"
                  rows={4}
                  className="mt-4 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={loading}
                  className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Activating…' : 'Activate this PC'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
                  <p className="text-sm text-gray-500">Vendor · Shop admin · or Agent username</p>
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <strong>Shop admin first time?</strong> Login as <strong>admin</strong> → you will see a big screen to paste the activation key from your vendor.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
                  <TextInput
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="rounded-xl border-gray-200 bg-gray-50 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                  <TextInput
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl border-gray-200 bg-gray-50 px-4 py-3"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded" />
                  Remember me
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Open Dashboard'}
                </button>
              </form>
            )}

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
