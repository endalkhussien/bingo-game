'use client';

import { useState } from 'react';
import { RefreshCw, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useUiLanguage } from '@/presentation/providers/ui-language-provider';

export function AgentHeader() {
  const { user, agent, refreshBalance } = useAuth();
  const { language, setLanguage, t } = useUiLanguage();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-2 rounded-full bg-sidebar px-4 py-1.5 text-sm text-white">
        <span>{t('balance')}:</span>
        <span className="font-semibold">
          {showBalance ? `${agent?.walletBalance?.toFixed(0) ?? 0} ETB` : '••••'}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          className="ml-1 rounded-full p-0.5 text-blue-300 hover:bg-white/10 hover:text-white"
          title="Refresh balance"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          className="text-blue-300 hover:text-white"
        >
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      <select
        value={language === 'am' ? 'am' : 'en'}
        onChange={(e) => setLanguage(e.target.value === 'am' ? 'am' : 'en')}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
      >
        <option value="en">English</option>
        <option value="am">አማርኛ</option>
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
