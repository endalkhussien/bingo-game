'use client';

import { useAuth } from '@/presentation/providers/auth-provider';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>
      <p className="text-gray-600">Welcome, {user?.fullName}. Admin panel coming soon.</p>
      <div className="mt-8 grid grid-cols-3 gap-4">
        {['Total Agents', 'Pending Recharges', 'Running Games'].map((label) => (
          <div key={label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
