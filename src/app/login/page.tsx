'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';

export default function LoginPage() {
  const [username, setUsername] = useState('agent');
  const [password, setPassword] = useState('agent123');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(username, password, rememberMe);
    setLoading(false);
    if (result.success) {
      router.push(username === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
    } else {
      setError(result.error ?? 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl font-black text-white backdrop-blur">T</div>
          <h1 className="text-5xl font-black tracking-tight text-white">{APP_NAME}</h1>
          <p className="mt-2 text-xl text-blue-200">{APP_TAGLINE}</p>
        </div>
        <div className="relative z-10 space-y-6 text-blue-100">
          <div className="rounded-xl bg-white/10 p-5 backdrop-blur">
            <p className="text-lg font-semibold text-white">For Agents</p>
            <p className="mt-1 text-sm">Run live games, manage cards, earn commission on every round.</p>
          </div>
          <div className="rounded-xl bg-white/10 p-5 backdrop-blur">
            <p className="text-lg font-semibold text-white">For Admins</p>
            <p className="mt-1 text-sm">Create agents, approve recharges, track revenue across the platform.</p>
          </div>
          <div className="rounded-xl bg-white/10 p-5 backdrop-blur">
            <p className="text-lg font-semibold text-white">Offline & Secure</p>
            <p className="mt-1 text-sm">All data stays on your computer. No internet required.</p>
          </div>
        </div>
        <p className="relative z-10 text-sm text-blue-300">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>

      {/* Right — login form */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">T</div>
            <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
            <p className="text-sm text-gray-500">{APP_TAGLINE}</p>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mb-8 text-sm text-gray-500">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded" />
              Remember me
            </label>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-gray-400">
            Demo — Agent: <code>agent</code> / <code>agent123</code> · Admin: <code>admin</code> / <code>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
