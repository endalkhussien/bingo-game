'use client';

import { useState } from 'react';
import { RefreshCw, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ModeBadge } from '@/presentation/components/shared/mode-badge';

export function AgentHeader() {
  const { user, agent, refreshBalance } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState('English');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <ModeBadge />
      <button onClick={handleRefresh} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100" title="Refresh">
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
      <div className="flex items-center gap-2 rounded-full bg-sidebar px-4 py-1.5 text-sm text-white">
        <span>Balance:</span>
        <span className="font-semibold">
          {showBalance ? `${agent?.walletBalance?.toFixed(0) ?? 0} ETB` : '••••'}
        </span>
        <button onClick={() => setShowBalance(!showBalance)} className="ml-1 text-blue-300 hover:text-white">
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
        <option>English</option>
        <option>አማርኛ</option>
      </select>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
          <User className="h-4 w-4 text-gray-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">{user?.fullName ?? 'Agent'}</span>
      </div>
    </header>
  );
}
