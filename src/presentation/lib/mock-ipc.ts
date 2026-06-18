// In-memory mock store for browser development without Electron

import { CARTELLA_MAX, DEFAULT_CALL_COOLDOWN_MS } from '@/shared/constants';
import { generateOperatorLicenseCode } from '@/shared/voucher/operator-license-code';
import { generateVendorTopupCode, parseVendorTopupCode, hashVendorTopupCode } from '@/shared/voucher/vendor-topup-code';

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
let mockBalance = 0;
const mockCards: Array<{ id: string; cardNumber: string; grid: number[][]; cardData: string; agentId: string; createdAt: number; updatedAt: number }> = [];
const mockGames: Array<Record<string, unknown>> = [];
const mockAgents = [
  { id: 'agent-1', userId: 'u1', fullName: 'Demo Agent', username: 'agent', phone: '+251900000000', commissionRate: 20, adminCommissionRate: 20, walletBalance: 0, status: 'ACTIVE', userStatus: 'ACTIVE', totalGames: 0, totalProfit: 0, createdAt: Date.now() / 1000 },
];
type Session = { user: { id: string; fullName: string; username: string; role: string }; agent: { id: string; walletBalance: number; commissionRate: number; adminCommissionRate: number } | null };

const mockRechargeRequests: Array<Record<string, unknown>> = [];
const mockIssuedCodes: Array<{ id: string; code: string; amount: number; forUsername: string; expiresAt: number; issuedAt: number; status: string }> = [];
const mockUsedOfflineCodes = new Set<string>();
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
  currency: 'ETB', timezone: 'Africa/Addis_Ababa', default_voice: 'AMHARIC_MALE', default_language: 'en', number_range_max: '75',
};
const mockTxs: Array<Record<string, unknown>> = [];
let mockLicenseUntil = 0;
let mockOperatorWalletBalance = 0;
const mockUsedTopupHashes = new Set<string>();
const mockVendorTopups: Array<{ id: string; code: string; amount: number; shopName: string; expiresAt: number; status: string; issuedAt: number }> = [];
const mockOperatorWalletTxs: Array<{ id: string; amount: number; transactionType: string; description: string; balanceAfter: number; createdAt: number }> = [];

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

function ensureMockCardsForNumbers(numbers: number[]) {
  for (const n of numbers) {
    if (n < 1 || n > CARTELLA_MAX) continue;
    if (!mockCards.some((c) => c.cardNumber === String(n))) {
      const grid = generateCard();
      mockCards.push({
        id: `card-${n}`,
        cardNumber: String(n),
        grid,
        cardData: JSON.stringify({ grid }),
        agentId: 'agent-1',
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
      });
    }
  }
  mockCards.sort((a, b) => Number(a.cardNumber) - Number(b.cardNumber));
}

function ensureMockDeck() {
  ensureMockCardsForNumbers(Array.from({ length: Math.min(20, CARTELLA_MAX) }, (_, i) => i + 1));
}

function requireShopAdminRoleOnly() {
  const session = requireSession();
  if (session.user.role === 'SUPER_ADMIN') {
    throw new Error('Shop admin only. Vendor uses /vendor.');
  }
  if (session.user.role !== 'OPERATOR') throw new Error('Shop admin access required');
  return session;
}

function requireShopAdminSession() {
  const session = requireShopAdminRoleOnly();
  const now = Math.floor(Date.now() / 1000);
  if (mockLicenseUntil <= now) throw new Error('OPERATOR_LICENSE_EXPIRED');
  return session;
}

function requireSession() {
  if (!currentSession) throw new Error('Not authenticated');
  return currentSession;
}

function requireVendorSession() {
  const session = requireSession();
  if (session.user.role !== 'SUPER_ADMIN') throw new Error('Vendor access required');
  return session;
}

export const mockHandlers: Record<string, (...args: unknown[]) => unknown> = {
  'auth:login': async (username: unknown, password: unknown) => {
    if (username === 'agent' && password === 'agent123') {
      currentSession = { user: { id: 'u1', fullName: 'Demo Agent', username: 'agent', role: 'AGENT' }, agent: { id: 'agent-1', walletBalance: mockBalance, commissionRate: 20, adminCommissionRate: 20 } };
      saveSession(currentSession);
      return { success: true, data: { token: 'mock', user: currentSession.user, agent: currentSession.agent } };
    }
    if (username === 'vendor' && password === 'vendor2024') {
      currentSession = { user: { id: 'v1', fullName: 'TEBIB Vendor', username: 'vendor', role: 'SUPER_ADMIN' }, agent: null };
      saveSession(currentSession);
      return { success: true, data: { token: 'mock', user: currentSession.user, agent: null } };
    }
    if (username === 'admin' && password === 'admin123') {
      currentSession = { user: { id: 'op1', fullName: 'Shop Admin', username: 'admin', role: 'OPERATOR' }, agent: null };
      saveSession(currentSession);
      return { success: true, data: { token: 'mock', user: currentSession.user, agent: null } };
    }
    return { success: false, error: 'Invalid credentials' };
  },
  'auth:session': async () => { currentSession = loadSession(); return currentSession; },
  'auth:logout': async () => { currentSession = null; saveSession(null); return { success: true }; },
  'auth:change-password': async () => ({ success: true }),

  'dashboard:admin': async () => {
    requireShopAdminSession();
    return {
    totalAgents: mockAgents.length, activeAgents: mockAgents.filter(a => a.status === 'ACTIVE').length,
    totalWalletBalance: mockBalance, totalRevenue: 5000, totalProfit: 1000,
    runningGames: mockGames.filter(g => g.status === 'RUNNING').length,
    pendingRecharges: mockRechargeRequests.filter(r => r.status === 'PENDING').length,
    revenueTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ date: d, revenue: Math.random() * 1000 })),
    };
  },
  'dashboard:agent': async () => {
    requireSession();
    return { walletBalance: mockBalance, activeGames: mockGames.filter(g => g.status === 'RUNNING').length, totalGames: mockGames.length, totalRevenue: 2000, totalProfit: 800, commissionRate: 20, adminCommissionRate: 20 };
  },

  'agents:profile': async () => {
    const a = mockAgents.find((x) => x.id === currentSession?.agent?.id);
    return a ? { commissionRate: a.commissionRate, adminCommissionRate: a.adminCommissionRate, walletBalance: mockBalance } : null;
  },
  'agents:update-own-commission': async (rate: unknown) => {
    const r = Number(rate);
    if (r < 0 || r > 100) return { success: false, error: 'Invalid rate' };
    const a = mockAgents.find((x) => x.id === currentSession?.agent?.id);
    if (a) a.commissionRate = r;
    if (currentSession?.agent) currentSession.agent.commissionRate = r;
    return { success: true, data: { commissionRate: r } };
  },

  'agents:list': async () => { requireShopAdminSession(); return mockAgents.map(a => ({ ...a, walletBalance: mockBalance })); },
  'agents:create': async (data: unknown) => {
    requireShopAdminSession();
    const d = data as { fullName: string; username: string; password: string; phone?: string; adminCommissionRate?: number };
    const username = d.username.trim().toLowerCase();
    const id = `agent-${mockAgents.length + 1}`;
    mockAgents.push({
      id, userId: `u${mockAgents.length + 1}`,
      fullName: d.fullName, username, phone: d.phone ?? '',
      commissionRate: 20, adminCommissionRate: d.adminCommissionRate ?? 20,
      walletBalance: 0,
      status: 'ACTIVE', userStatus: 'ACTIVE', totalGames: 0, totalProfit: 0, createdAt: Math.floor(Date.now() / 1000),
    });
    const payload = btoa(JSON.stringify({ u: username, p: d.password, n: d.fullName, c: d.adminCommissionRate ?? 20 }));
    const body = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const setupCode = `TAS-${body}-mockmockmockmockmockmockmockmock`;
    return { success: true, data: { id, username, setupCode } };
  },
  'agents:regenerate-setup': async (agentId: unknown, password: unknown) => {
    requireShopAdminSession();
    const a = mockAgents.find((x) => x.id === agentId);
    if (!a) return { success: false, error: 'Agent not found' };
    const pw = String(password ?? '').trim() || `bingo${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = btoa(JSON.stringify({ u: a.username, p: pw, n: a.fullName, c: a.adminCommissionRate }));
    const body = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return {
      success: true,
      data: {
        username: a.username,
        password: pw,
        setupCode: `TAS-${body}-mockmockmockmockmockmockmockmock`,
        message: 'Send this TAS code to the hall PC.',
      },
    };
  },
  'agents:activate-setup': async (setupCode: unknown) => {
    const code = String(setupCode ?? '').trim();
    if (!code.startsWith('TAS-')) return { success: false, error: 'Invalid setup code' };
    return { success: true, data: { username: 'agent', message: 'Mock activation OK (browser dev only)' } };
  },
  'agents:update': async (id: unknown, data: unknown) => {
    const a = mockAgents.find((x) => x.id === id);
    const patch = data as { adminCommissionRate?: number };
    if (a && patch.adminCommissionRate != null) a.adminCommissionRate = patch.adminCommissionRate;
    return { success: true };
  },
  'agents:suspend': async (id: unknown) => { requireShopAdminSession(); const a = mockAgents.find(x => x.id === id); if (a) a.status = 'SUSPENDED'; return { success: true }; },
  'agents:activate': async (id: unknown) => { requireShopAdminSession(); const a = mockAgents.find(x => x.id === id); if (a) a.status = 'ACTIVE'; return { success: true }; },
  'agents:delete': async (id: unknown) => {
    requireShopAdminSession();
    const idx = mockAgents.findIndex((x) => x.id === id);
    if (idx < 0) return { success: false, error: 'Agent not found' };
    mockAgents.splice(idx, 1);
    return { success: true, data: { username: '' } };
  },
  'agents:reset-password': async () => ({ success: true }),
  'agents:detail': async (id: unknown) => mockAgents.find(a => a.id === id) ?? null,

  'wallet:balance': async () => { requireSession(); return mockBalance; },
  'wallet:transactions': async () => mockTxs,
  'wallet:redeem': async (code: unknown) => {
    requireSession();
    const amounts: Record<string, number> = { VOUCHER100: 100, VOUCHER500: 500, VOUCHER1000: 1000, DEMO2024: 250 };
    const c = String(code).trim();
    const upper = c.toUpperCase();
    if (amounts[upper]) {
      mockBalance += amounts[upper];
      if (currentSession?.agent) currentSession.agent.walletBalance = mockBalance;
      return { success: true, data: { amount: amounts[upper], newBalance: mockBalance } };
    }
    if (upper.startsWith('TBG-')) {
      const issued = mockIssuedCodes.find((x) => x.code.toUpperCase() === upper);
      if (!issued) return { success: false, error: 'Unknown offline code (generate from admin in this session)' };
      if (mockUsedOfflineCodes.has(upper)) return { success: false, error: 'Code already used' };
      if (issued.forUsername !== 'any agent' && issued.forUsername !== currentSession?.user.username) {
        return { success: false, error: 'Code is for a different agent' };
      }
      mockUsedOfflineCodes.add(upper);
      mockBalance += issued.amount;
      if (currentSession?.agent) currentSession.agent.walletBalance = mockBalance;
      return { success: true, data: { amount: issued.amount, newBalance: mockBalance } };
    }
    return { success: false, error: 'Invalid voucher' };
  },
  'vouchers:generate': async (amount: unknown, forUsername: unknown) => {
    requireShopAdminSession();
    if (!forUsername) return { success: false, error: 'Select an agent' };
    const amt = Math.round(Number(amount));
    if (amt <= 0) return { success: false, error: 'Invalid amount' };
    if (mockOperatorWalletBalance < amt) {
      return { success: false, error: `Insufficient shop admin balance (${mockOperatorWalletBalance} ETB). Redeem a TVP code from vendor first.` };
    }
    const user = String(forUsername);
    mockOperatorWalletBalance -= amt;
    mockOperatorWalletTxs.unshift({
      id: `optx-${mockOperatorWalletTxs.length}`,
      amount: -amt,
      transactionType: 'ISSUE_TBG',
      description: `TBG code for ${user}`,
      balanceAfter: mockOperatorWalletBalance,
      createdAt: Math.floor(Date.now() / 1000),
    });
    const nonce = Math.random().toString(36).slice(2, 18).toUpperCase().padEnd(16, '0');
    const code = `TBG-${amt}-${nonce}-${(Math.floor(Date.now()/1000)+1209600).toString(36).toUpperCase()}-${user}-MOCKSIGNATUREMOCKSIGNATUREMOCKSIG`;
    const row = {
      id: `v-${mockIssuedCodes.length}`,
      code,
      amount: amt,
      forUsername: user,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 14,
      issuedAt: Math.floor(Date.now() / 1000),
      status: 'ISSUED',
    };
    mockIssuedCodes.unshift(row);
    return { success: true, data: { code, amount: amt, expiresAt: row.expiresAt, forUsername: user } };
  },
  'vouchers:list-issued': async () => { requireShopAdminSession(); return mockIssuedCodes; },
  'vouchers:org-key': async () => 'mock-org-key-for-browser-preview-only-32chars',
  'vouchers:revoke': async (id: unknown) => {
    const r = mockIssuedCodes.find((x) => x.id === id);
    if (r) r.status = 'REVOKED';
    return { success: true };
  },
  'vouchers:delete': async (id: unknown) => {
    const i = mockIssuedCodes.findIndex((x) => x.id === id);
    if (i < 0) return { success: false, error: 'Code not found' };
    if (mockIssuedCodes[i].status === 'REDEEMED') return { success: false, error: 'Cannot delete redeemed code' };
    mockIssuedCodes.splice(i, 1);
    return { success: true };
  },
  'clipboard:write': async () => ({ success: true }),
  'settings:set-org-recharge-key': async (key: unknown) => {
    requireSession();
    if (String(key).length < 32) return { success: false, error: 'Key too short' };
    return { success: true };
  },
  'wallet:deposit': async () => ({
    success: false,
    error: 'Direct deposits are disabled. Generate a TBG recharge code for this agent.',
  }),
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
  'recharge:pending-count': async () => { requireShopAdminSession(); return mockRechargeRequests.filter(r => r.status === 'PENDING').length; },

  'pricing:list': async () => mockPricingPlans,
  'pricing:create': async (data: unknown) => { mockPricingPlans.push({ id: `p${mockPricingPlans.length}`, ...(data as object), isActive: true } as typeof mockPricingPlans[0]); return { success: true }; },
  'pricing:update': async () => ({ success: true }),
  'pricing:disable': async () => ({ success: true }),

  'cards:list': async () => mockCards.sort((a, b) => Number(a.cardNumber) - Number(b.cardNumber)),
  'cards:create': async () => {
    if (mockCards.length >= CARTELLA_MAX) return { error: `All ${CARTELLA_MAX} cartella cards exist` };
    const used = new Set(mockCards.map((c) => c.cardNumber));
    let n = 1;
    while (used.has(String(n)) && n <= CARTELLA_MAX) n++;
    const grid = generateCard();
    const card = { id: `card-${n}`, cardNumber: String(n), grid, cardData: JSON.stringify({ grid }), agentId: 'agent-1', createdAt: Date.now() / 1000, updatedAt: Date.now() / 1000 };
    mockCards.push(card);
    return card;
  },
  'cards:create-by-number': async (cardNumber: unknown) => {
    const num = Number(cardNumber);
    if (!Number.isFinite(num) || num < 1 || num > CARTELLA_MAX) throw new Error(`Cartella number must be 1–${CARTELLA_MAX}`);
    if (mockCards.some((c) => c.cardNumber === String(num))) throw new Error(`Cartella #${num} already exists.`);
    const grid = generateCard();
    const card = { id: `card-${num}`, cardNumber: String(num), grid, cardData: JSON.stringify({ grid }), agentId: 'agent-1', createdAt: Date.now() / 1000, updatedAt: Date.now() / 1000 };
    mockCards.push(card);
    return card;
  },
  'cards:get-by-number': async (cardNumber: unknown) => {
    const card = mockCards.find((c) => c.cardNumber === String(cardNumber));
    return card ? { id: card.id, cardNumber: card.cardNumber, grid: card.grid } : null;
  },
  'cards:rebuild-deck': async (regenerateAll: unknown) => {
    ensureMockDeck();
    if (regenerateAll) {
      for (const card of mockCards) {
        card.grid = generateCard();
        card.cardData = JSON.stringify({ grid: card.grid });
      }
    }
    return { success: true, updated: mockCards.length };
  },
  'cards:regenerate': async (id: unknown) => {
    const card = mockCards.find((c) => c.id === id);
    if (!card) return { success: false };
    card.grid = generateCard();
    card.cardData = JSON.stringify({ grid: card.grid });
    return { success: true, grid: card.grid };
  },
  'cards:delete': async (id: unknown) => { const i = mockCards.findIndex(c => c.id === id); if (i >= 0) mockCards.splice(i, 1); return { success: true }; },
  'cards:update': async () => ({ success: true }),
  'cards:generate': async (count: unknown) => { const r = []; for (let i = 0; i < Number(count); i++) { const c = await mockHandlers['cards:create'](); if (c && !('error' in (c as object))) r.push(c); else break; } return r; },

  'window:open-caller-display': async () => {
    if (typeof window !== 'undefined') window.open('/agent/caller-display/', '_blank');
    return true;
  },
  'window:close-caller-display': async () => true,

  'games:create': async (config: unknown) => {
    requireSession();
    const c = config as { betAmount: number; selectedNumbers: number[]; voiceType?: string; language?: string; drawSpeedMs?: number; commissionRate?: number };
    const playerCount = c.selectedNumbers?.length ?? 0;
    if (playerCount === 0) return { success: false, error: 'Select at least one cartella.' };
    const pot = c.betAmount * playerCount;
    const rate = c.commissionRate ?? currentSession?.agent?.commissionRate ?? 20;
    const commission = pot * (rate / 100);
    const prize = pot - commission;
    if (mockBalance + pot < prize) {
      return { success: false, error: `Insufficient balance to cover winner prize (${prize.toFixed(0)} ETB).` };
    }
    ensureMockCardsForNumbers(c.selectedNumbers ?? []);
    const game = {
      id: `game-${mockGames.length + 1}`, gameCode: `TBG-${1000 + mockGames.length}`, status: 'RUNNING',
      betAmount: c.betAmount, playerCount,
      selectedNumbers: c.selectedNumbers, drawnNumbers: [], callHistory: [], voiceType: c.voiceType ?? 'AMHARIC_MALE',
      language: c.language ?? 'am', totalPot: pot, prize, maxBalls: 75, drawSpeedMs: c.drawSpeedMs ?? DEFAULT_CALL_COOLDOWN_MS, commissionRate: rate,
      startedAt: Math.floor(Date.now() / 1000),
    };
    mockGames.push(game);
    mockBalance += pot;
    if (currentSession?.agent) currentSession.agent.walletBalance = mockBalance;
    return { success: true, data: game };
  },
  'games:active': async () => {
    const g = mockGames.find(x => x.status === 'RUNNING' || x.status === 'PAUSED') as {
      drawnNumbers?: number[];
      betAmount: number;
      playerCount: number;
      commissionRate?: number;
      totalPot?: number;
      prize?: number;
      callHistory?: { number: number; drawOrder: number; drawnAt: number }[];
    } | undefined;
    if (!g) return null;
    const drawn = g.drawnNumbers ?? [];
    const rate = g.commissionRate ?? 20;
    const pot = g.totalPot ?? g.betAmount * g.playerCount;
    const prize = g.prize ?? pot - pot * (rate / 100);
    return {
      ...g,
      drawnNumbers: drawn,
      callHistory: g.callHistory ?? drawn.map((n, i) => ({ number: n, drawOrder: i + 1, drawnAt: Math.floor(Date.now() / 1000) })),
      totalPot: pot,
      prize,
      commissionRate: rate,
    };
  },
  'games:draw': async (_id: unknown) => {
    const g = mockGames.find(x => x.status === 'RUNNING');
    const drawn = g ? ((g as { drawnNumbers?: number[] }).drawnNumbers ?? []) : [];
    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !drawn.includes(n));
    if (available.length === 0) return { success: false, error: 'All numbers drawn' };
    const n = available[Math.floor(Math.random() * available.length)];
    if (g) {
      drawn.push(n);
      (g as { drawnNumbers: number[] }).drawnNumbers = drawn;
      const hist = (g as { callHistory?: { number: number; drawOrder: number; drawnAt: number }[] }).callHistory ?? [];
      hist.push({ number: n, drawOrder: drawn.length, drawnAt: Math.floor(Date.now() / 1000) });
      (g as { callHistory: typeof hist }).callHistory = hist;
      return { success: true, data: { number: n, drawOrder: drawn.length, drawCount: drawn.length, drawnAt: Math.floor(Date.now() / 1000), maxBalls: 75, voiceType: (g as { voiceType?: string }).voiceType ?? 'AMHARIC_MALE', language: (g as { language?: string }).language ?? 'am', winners: [] } };
    }
    return { success: true, data: { number: n, drawOrder: 1, drawCount: 1, drawnAt: Math.floor(Date.now() / 1000), maxBalls: 75, voiceType: 'AMHARIC_MALE', language: 'am', winners: [] } };
  },
  'games:pause': async (id: unknown) => { const g = mockGames.find(x => x.id === id); if (g) g.status = 'PAUSED'; return { success: true }; },
  'games:resume': async (id: unknown) => { const g = mockGames.find(x => x.id === id); if (g) g.status = 'RUNNING'; return { success: true }; },
  'games:validate-winner': async (_id: unknown, cardNumber: unknown) => {
    const num = String(cardNumber);
    const card = mockCards.find(c => c.cardNumber === num);
    const g = mockGames.find(x => x.status === 'RUNNING' || x.status === 'PAUSED') as {
      selectedNumbers?: number[];
      drawnNumbers?: number[];
      betAmount?: number;
      winningPattern?: string;
    } | undefined;
    if (!card) {
      return { success: true, valid: false, message: `Cartella #${num}: This cartella does not exist.`, cardNumber: num };
    }
    if (!g?.selectedNumbers?.includes(Number(num))) {
      return { success: true, valid: false, message: `Cartella #${num}: This cartella is not in the current game.`, cardNumber: num };
    }
    const { checkWinningPattern } = await import('@/domain/services/winner-verification');
    const { calculateWinnerPrize } = await import('@/shared/prize');
    const drawn = g.drawnNumbers ?? [];
    const valid = checkWinningPattern(card.grid, drawn, g.winningPattern ?? 'FIRST_LINE');
    if (!valid) {
      return { success: true, valid: false, message: `Cartella #${num}: Not a winner yet.`, cardNumber: num, calledNumbers: drawn, grid: card.grid };
    }
    const rate = currentSession?.agent?.commissionRate ?? 20;
    const adminRate = currentSession?.agent?.adminCommissionRate ?? 20;
    const playerCount = g.selectedNumbers?.length ?? 1;
    const betAmount = g.betAmount ?? 10;
    const { totalPot, prize } = calculateWinnerPrize(betAmount, playerCount, rate);
    mockBalance -= prize;
    if (currentSession?.agent) currentSession.agent.walletBalance = mockBalance;
    return {
      success: true, valid: true,
      message: `Cartella #${num} wins ${prize.toFixed(0)} ETB!`,
      cardNumber: num, prizeAmount: prize, playerCount, betAmount, totalPot,
      calledNumbers: drawn, grid: card.grid,
      calledCountAtWin: drawn.length, winningPattern: g.winningPattern,
    };
  },
  'games:end': async () => ({ success: true, data: { totalBets: 100, agentRevenue: 80, totalPayouts: 0, commissionRevenue: 20, commissionRate: 20 } }),
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

  'license:status': async () => {
    const now = Math.floor(Date.now() / 1000);
    return {
      active: mockLicenseUntil > now,
      validUntil: mockLicenseUntil,
      shopName: 'Demo Shop',
      period: 'WEEKLY',
      vendorCommissionRate: 20,
      daysRemaining: mockLicenseUntil > now ? Math.ceil((mockLicenseUntil - now) / 86400) : 0,
    };
  },
  'license:activate': async (code: unknown) => {
    requireShopAdminRoleOnly();
    const c = String(code ?? '').trim();
    const { parseOperatorLicenseCode } = await import('@/shared/voucher/operator-license-code');
    const parsed = parseOperatorLicenseCode(c);
    if (!parsed.valid || !parsed.payload) {
      return { success: false, error: parsed.error ?? 'Invalid TOL code' };
    }
    mockLicenseUntil = parsed.payload.validUntil;
    return {
      success: true,
      data: {
        validUntil: mockLicenseUntil,
        message: `License active until ${new Date(mockLicenseUntil * 1000).toLocaleDateString()}`,
      },
    };
  },
  'license:commission-report': async () => ({
    periodDays: 7,
    gameCount: mockGames.length,
    totalBets: mockGames.length * 100,
    vendorCommissionDue: mockGames.length * 20,
    shopName: 'Demo Shop',
    vendorCommissionRate: 20,
    licenseActive: mockLicenseUntil > Math.floor(Date.now() / 1000),
  }),
  'license:generate': async (shopName: unknown, validDays: unknown, rate: unknown) => {
    requireVendorSession();
    const days = Number(validDays) === 30 ? 30 : 7;
    const generated = generateOperatorLicenseCode(String(shopName || 'Shop'), days, Number(rate) || 20);
    return {
      success: true,
      data: {
        code: generated.code,
        validUntil: generated.validUntil,
        shopName: generated.shopName,
        period: generated.period,
        validDays: days,
        vendorCommissionRate: Number(rate) || 20,
      },
    };
  },

  'operator-wallet:balance': async () => {
    requireShopAdminSession();
    return mockOperatorWalletBalance;
  },
  'operator-wallet:transactions': async () => {
    requireShopAdminSession();
    return mockOperatorWalletTxs;
  },
  'operator-wallet:redeem': async (code: unknown) => {
    requireShopAdminSession();
    const parsed = parseVendorTopupCode(String(code ?? ''));
    if (!parsed.valid || !parsed.payload) {
      return { success: false, error: parsed.error ?? 'Invalid TVP code' };
    }
    const hash = hashVendorTopupCode(String(code));
    if (mockUsedTopupHashes.has(hash)) {
      return { success: false, error: 'This top-up code was already used' };
    }
    mockUsedTopupHashes.add(hash);
    mockOperatorWalletBalance += parsed.payload.amount;
    mockOperatorWalletTxs.unshift({
      id: `optx-${mockOperatorWalletTxs.length}`,
      amount: parsed.payload.amount,
      transactionType: 'TOPUP',
      description: `Vendor top-up for ${parsed.payload.shopName}`,
      balanceAfter: mockOperatorWalletBalance,
      createdAt: Math.floor(Date.now() / 1000),
    });
    const topup = mockVendorTopups.find((t) => t.code === String(code).trim());
    if (topup) topup.status = 'REDEEMED';
    return {
      success: true,
      data: {
        amount: parsed.payload.amount,
        newBalance: mockOperatorWalletBalance,
        shopName: parsed.payload.shopName,
        message: `${parsed.payload.amount} ETB added to shop admin balance`,
      },
    };
  },

  'vendor-topup:generate': async (shopName: unknown, amount: unknown) => {
    requireVendorSession();
    const generated = generateVendorTopupCode(String(shopName || 'Shop'), Number(amount) || 0);
    const row = {
      id: `tvp-${mockVendorTopups.length}`,
      code: generated.code,
      amount: generated.amount,
      shopName: generated.shopName,
      expiresAt: generated.validUntil,
      status: 'ISSUED',
      issuedAt: Math.floor(Date.now() / 1000),
    };
    mockVendorTopups.unshift(row);
    return { success: true, data: { code: generated.code, amount: generated.amount, validUntil: generated.validUntil, shopName: generated.shopName } };
  },
  'vendor-topup:list': async () => {
    requireVendorSession();
    return mockVendorTopups;
  },
  'vendor-topup:summary': async () => {
    requireVendorSession();
    const now = Math.floor(Date.now() / 1000);
    let totalIssued = 0;
    let pendingCount = 0;
    let redeemedCount = 0;
    for (const row of mockVendorTopups) {
      totalIssued += row.amount;
      if (row.status === 'REDEEMED') redeemedCount += 1;
      else if (row.expiresAt >= now) pendingCount += 1;
    }
    return { totalIssued, codeCount: mockVendorTopups.length, pendingCount, redeemedCount, recent: mockVendorTopups.slice(0, 10) };
  },

  'database:factory-reset': async () => {
    requireShopAdminRoleOnly();
    mockAgents.length = 0;
    mockGames.length = 0;
    mockIssuedCodes.length = 0;
    mockRechargeRequests.length = 0;
    mockAuditLogs.length = 0;
    mockOperatorWalletBalance = 0;
    mockOperatorWalletTxs.length = 0;
    mockUsedTopupHashes.clear();
    mockVendorTopups.length = 0;
    mockLicenseUntil = 0;
    mockBalance = 0;
    return {
      success: true,
      message: 'All data cleared. Paste TOL and TVP from vendor to start fresh.',
    };
  },

  'tts:speak': async (_n: unknown, _v: unknown, _l: unknown, _m: unknown) => ({ success: true, engine: 'browser-mock' }),
  'tts:speak-ball-call': async (number: unknown, language: unknown, voiceType: unknown) => {
    const { speakBallCall } = await import('@/presentation/lib/tts');
    await speakBallCall(Number(number), String(voiceType ?? 'AMHARIC_MALE'), String(language ?? 'am'));
    return { success: true, engine: 'browser-tts' };
  },
  'tts:test': async (_v: unknown, _l: unknown, _s: unknown) => ({ success: true, engine: 'browser-mock', text: 'N ሰላሳ አራት' }),
  'tts:list-voices': async () => ['Microsoft Amharic [am-ET] (mock)'],
};
