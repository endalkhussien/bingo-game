// In-memory mock store for browser development without Electron
type Session = { user: { id: string; fullName: string; username: string; role: string }; agent: { id: string; walletBalance: number; commissionRate: number } | null };

const SESSION_KEY = 'bingo_mock_session';

function saveSession(session: Session | null) {
  if (typeof localStorage === 'undefined') return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function loadSession(): Session | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch { return null; }
}

let currentSession: Session | null = loadSession();
let mockBalance = 500;
let cardCounter = 0;
const mockCards: Array<{ id: string; cardNumber: string; grid: number[][]; cardData: string; agentId: string; createdAt: number; updatedAt: number }> = [];
const mockGames: Array<Record<string, unknown>> = [];
const mockAgents = [
  { id: 'agent-1', userId: 'u1', fullName: 'Demo Agent', username: 'agent', phone: '+251900000000', commissionRate: 20, walletBalance: 500, status: 'ACTIVE', userStatus: 'ACTIVE', totalGames: 0, totalProfit: 0, createdAt: Date.now() / 1000 },
];
const mockRechargeRequests: Array<Record<string, unknown>> = [];
const mockNotifications: Array<Record<string, unknown>> = [];
const mockAuditLogs: Array<Record<string, unknown>> = [];
const mockPricingPlans = [
  { id: 'p1', name: '1 Card', planType: 'CARD_PACK', price: 5, cardLimit: 1, duration: null, isActive: true },
  { id: 'p2', name: '10 Cards', planType: 'CARD_PACK', price: 40, cardLimit: 10, duration: null, isActive: true },
  { id: 'p3', name: '50 Cards', planType: 'CARD_PACK', price: 180, cardLimit: 50, duration: null, isActive: true },
  { id: 'p4', name: 'Daily', planType: 'MEMBERSHIP', price: 100, cardLimit: null, duration: 'DAILY', isActive: true },
  { id: 'p5', name: 'Weekly', planType: 'MEMBERSHIP', price: 500, cardLimit: null, duration: 'WEEKLY', isActive: true },
  { id: 'p6', name: 'Monthly', planType: 'MEMBERSHIP', price: 1500, cardLimit: null, duration: 'MONTHLY', isActive: true },
];
const mockSettings: Record<string, string> = {
  default_commission: '20', platform_fee: '0', minimum_bet: '10', maximum_bet: '1000',
  currency: 'ETB', timezone: 'Africa/Addis_Ababa', default_voice: 'AMHARIC_MALE', default_language: 'en', number_range_max: '150',
};
const mockTxs: Array<Record<string, unknown>> = [];

function generateCard(): number[][] {
  const cols = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]] as const;
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  cols.forEach(([min, max], ci) => {
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i).sort(() => Math.random() - 0.5).slice(0, ci === 2 ? 4 : 5).sort((a, b) => a - b);
    let ni = 0;
    for (let r = 0; r < 5; r++) { if (ci === 2 && r === 2) grid[r][ci] = -1; else grid[r][ci] = nums[ni++]; }
  });
  return grid;
}

function requireSession() {
  if (!currentSession) throw new Error('Not authenticated');
  return currentSession;
}

export const mockHandlers: Record<string, (...args: unknown[]) => unknown> = {
  'auth:login': async (username: unknown, password: unknown) => {
    if (username === 'agent' && password === 'agent123') {
      currentSession = { user: { id: 'u1', fullName: 'Demo Agent', username: 'agent', role: 'AGENT' }, agent: { id: 'agent-1', walletBalance: mockBalance, commissionRate: 20 } };
      saveSession(currentSession);
      return { success: true, data: { token: 'mock', user: currentSession.user, agent: currentSession.agent } };
    }
    if (username === 'admin' && password === 'admin123') {
      currentSession = { user: { id: 'admin1', fullName: 'System Administrator', username: 'admin', role: 'SUPER_ADMIN' }, agent: null };
      saveSession(currentSession);
      return { success: true, data: { token: 'mock', user: currentSession.user, agent: null } };
    }
    return { success: false, error: 'Invalid credentials' };
  },
  'auth:session': async () => { currentSession = loadSession(); return currentSession; },
  'auth:logout': async () => { currentSession = null; saveSession(null); return { success: true }; },
  'auth:change-password': async () => ({ success: true }),

  'dashboard:admin': async () => ({
    totalAgents: mockAgents.length, activeAgents: mockAgents.filter(a => a.status === 'ACTIVE').length,
    totalWalletBalance: mockBalance, totalRevenue: 5000, totalProfit: 1000,
    runningGames: mockGames.filter(g => g.status === 'RUNNING').length,
    pendingRecharges: mockRechargeRequests.filter(r => r.status === 'PENDING').length,
    revenueTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ date: d, revenue: Math.random() * 1000 })),
  }),
  'dashboard:agent': async () => {
    requireSession();
    return { walletBalance: mockBalance, activeGames: mockGames.filter(g => g.status === 'RUNNING').length, totalGames: mockGames.length, totalRevenue: 2000, totalProfit: 800, commissionRate: 20 };
  },

  'agents:list': async () => mockAgents.map(a => ({ ...a, walletBalance: mockBalance })),
  'agents:create': async (data: unknown) => {
    const d = data as Record<string, string>;
    mockAgents.push({ id: `agent-${mockAgents.length + 1}`, userId: `u${mockAgents.length + 1}`, fullName: d.fullName, username: d.username, phone: d.phone, commissionRate: parseFloat(String(d.commissionRate)), walletBalance: parseFloat(String(d.initialBalance ?? 0)), status: 'ACTIVE', userStatus: 'ACTIVE', totalGames: 0, totalProfit: 0, createdAt: Date.now() / 1000 });
    return { success: true };
  },
  'agents:update': async () => ({ success: true }),
  'agents:suspend': async (id: unknown) => { const a = mockAgents.find(x => x.id === id); if (a) a.status = 'SUSPENDED'; return { success: true }; },
  'agents:activate': async (id: unknown) => { const a = mockAgents.find(x => x.id === id); if (a) a.status = 'ACTIVE'; return { success: true }; },
  'agents:reset-password': async () => ({ success: true }),
  'agents:detail': async (id: unknown) => mockAgents.find(a => a.id === id) ?? null,

  'wallet:balance': async () => { requireSession(); return mockBalance; },
  'wallet:transactions': async () => mockTxs,
  'wallet:redeem': async (code: unknown) => {
    const amounts: Record<string, number> = { VOUCHER100: 100, VOUCHER500: 500, VOUCHER1000: 1000, DEMO2024: 250 };
    const c = String(code).toUpperCase();
    if (amounts[c]) { mockBalance += amounts[c]; if (currentSession?.agent) currentSession.agent.walletBalance = mockBalance; return { success: true, data: { amount: amounts[c], newBalance: mockBalance } }; }
    return { success: false, error: 'Invalid voucher' };
  },
  'wallet:deposit': async (_id: unknown, amount: unknown) => { mockBalance += Number(amount); return { success: true, data: { newBalance: mockBalance } }; },
  'wallet:withdraw': async () => ({ success: true }),

  'recharge:submit': async (data: unknown) => {
    const d = data as Record<string, unknown>;
    mockRechargeRequests.push({ id: `rr-${mockRechargeRequests.length}`, agentId: 'agent-1', amount: d.amount, paymentMethod: d.paymentMethod, status: 'PENDING', requestedAt: Date.now() / 1000, agentName: 'Demo Agent' });
    return { success: true };
  },
  'recharge:list': async (filters: unknown) => {
    const f = filters as Record<string, string> | undefined;
    let rows = [...mockRechargeRequests];
    if (f?.status) rows = rows.filter(r => r.status === f.status);
    return rows;
  },
  'recharge:approve': async (id: unknown) => { const r = mockRechargeRequests.find(x => x.id === id); if (r) { r.status = 'APPROVED'; mockBalance += Number(r.amount); } return { success: true }; },
  'recharge:reject': async (id: unknown) => { const r = mockRechargeRequests.find(x => x.id === id); if (r) r.status = 'REJECTED'; return { success: true }; },
  'recharge:pending-count': async () => mockRechargeRequests.filter(r => r.status === 'PENDING').length,

  'pricing:list': async () => mockPricingPlans,
  'pricing:create': async (data: unknown) => { mockPricingPlans.push({ id: `p${mockPricingPlans.length}`, ...(data as object), isActive: true } as typeof mockPricingPlans[0]); return { success: true }; },
  'pricing:update': async () => ({ success: true }),
  'pricing:disable': async () => ({ success: true }),

  'cards:list': async () => mockCards,
  'cards:create': async () => { cardCounter++; const grid = generateCard(); const card = { id: `card-${cardCounter}`, cardNumber: String(cardCounter), grid, cardData: JSON.stringify({ grid }), agentId: 'agent-1', createdAt: Date.now() / 1000, updatedAt: Date.now() / 1000 }; mockCards.push(card); return card; },
  'cards:delete': async (id: unknown) => { const i = mockCards.findIndex(c => c.id === id); if (i >= 0) mockCards.splice(i, 1); return { success: true }; },
  'cards:update': async () => ({ success: true }),
  'cards:generate': async (count: unknown) => { const r = []; for (let i = 0; i < Number(count); i++) r.push(await mockHandlers['cards:create']()); return r; },

  'games:create': async (config: unknown) => {
    const c = config as { betAmount: number; selectedNumbers: number[] };
    const game = { id: `game-${mockGames.length + 1}`, gameCode: `BNG-${1000 + mockGames.length}`, status: 'RUNNING', betAmount: c.betAmount, playerCount: c.selectedNumbers?.length ?? 0, selectedNumbers: c.selectedNumbers, drawnNumbers: [] };
    mockGames.push(game);
    return { success: true, data: game };
  },
  'games:active': async () => mockGames.find(g => g.status === 'RUNNING') ?? null,
  'games:draw': async () => ({ success: true, data: { number: Math.floor(Math.random() * 150) + 1, drawOrder: 1, winners: [] } }),
  'games:end': async () => ({ success: true, data: { totalBets: 100, agentRevenue: 80, totalPayouts: 0 } }),
  'games:list': async () => mockGames.map((g, i) => ({ id: g.id, gameCode: g.gameCode, date: Date.now() / 1000 - i * 86400, betAmount: g.betAmount || 10, playersNumber: (g as { playerCount?: number }).playerCount || 0, commissionPercent: 20, profit: 80, status: g.status || 'COMPLETED', agentName: 'Demo Agent' })),

  'reports:revenue': async () => mockGames.map(g => ({ gameCode: g.gameCode, agentName: 'Demo Agent', date: Date.now() / 1000, totalBets: 100, platformRevenue: 20, agentRevenue: 80 })),
  'reports:profit': async () => mockGames.map(g => ({ gameCode: g.gameCode, agentName: 'Demo Agent', profit: 20 })),
  'reports:agents': async () => mockAgents.map(a => ({ agentName: a.fullName, username: a.username, totalGames: a.totalGames, totalRevenue: 1000, totalProfit: 200, walletBalance: mockBalance, status: a.status })),
  'reports:recharge': async () => mockRechargeRequests,
  'reports:games': async () => mockGames.map(g => ({ gameCode: g.gameCode, agentName: 'Demo Agent', betAmount: g.betAmount, status: g.status, date: Date.now() / 1000, profit: 80 })),
  'reports:wallet': async () => mockTxs,

  'settings:get': async () => mockSettings,
  'settings:update': async (data: unknown) => { Object.assign(mockSettings, data); return mockSettings; },

  'backup:create': async () => ({ success: true, data: { filename: `backup-${Date.now()}.db` } }),
  'backup:list': async () => [{ filename: 'bingo-backup-demo.db', size: 102400, createdAt: new Date().toISOString() }],
  'backup:restore': async () => ({ success: true, message: 'Backup restored' }),

  'notifications:list': async () => mockNotifications,
  'notifications:unread-count': async () => mockNotifications.filter(n => !n.isRead).length,
  'notifications:mark-read': async () => ({}),
  'notifications:mark-all-read': async () => { mockNotifications.forEach(n => { n.isRead = true; }); },

  'audit:list': async () => mockAuditLogs,
};
