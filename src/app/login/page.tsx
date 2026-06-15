'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';

const BINGO_LETTERS = [
  { letter: 'B', color: 'bg-red-500' },
  { letter: 'I', color: 'bg-blue-500' },
  { letter: 'N', color: 'bg-green-500' },
  { letter: 'G', color: 'bg-yellow-500' },
  { letter: 'O', color: 'bg-purple-500' },
];

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

  const fillDemo = (role: 'agent' | 'admin') => {
    setUsername(role);
    setPassword(role === 'admin' ? 'admin123' : 'agent123');
    setError('');
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Brand panel */}
        <div className="flex flex-1 flex-col justify-between px-8 py-10 lg:px-14 lg:py-12">
          <div>
            <div className="mb-8 flex gap-2">
              {BINGO_LETTERS.map(({ letter, color }) => (
                <div
                  key={letter}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-xl font-black text-white shadow-lg`}
                >
                  {letter}
                </div>
              ))}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white lg:text-5xl">{APP_NAME}</h1>
            <p className="mt-3 text-lg text-slate-300">{APP_TAGLINE}</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Offline bingo for hall agents — Amharic voice, cartella verification, commission tracking.
            </p>
          </div>

          <div className="mt-10 hidden max-w-lg grid-cols-1 gap-4 sm:grid-cols-3 lg:grid">
            {[
              { title: 'Agents', desc: 'Run games & earn commission' },
              { title: 'Admins', desc: 'Manage agents & vouchers' },
              { title: 'Offline', desc: 'No internet during play' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/40">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">Sign in</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="mt-1 text-sm text-gray-500">Enter your account to open the dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Remember me on this PC
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Open Dashboard'}
              </button>
            </form>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo('agent')}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Agent demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Admin demo
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              agent / agent123 · admin / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
