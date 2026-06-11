// Fallback for running Next.js in browser without Electron
const mockSession = {
  user: { id: '1', fullName: 'Demo Agent', username: 'agent', role: 'AGENT' },
  agent: { id: 'agent-1', walletBalance: 500, commissionRate: 20 },
};

const mockCards: Array<{ id: string; cardNumber: string; grid: number[][]; cardData: string; agentId: string; createdAt: number; updatedAt: number }> = [];
const mockGames: Array<Record<string, unknown>> = [];
let mockBalance = 500;
let cardCounter = 0;

function generateCard(): number[][] {
  const cols = [[1,15],[16,30],[31,45],[46,60],[61,75]] as const;
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  cols.forEach(([min, max], ci) => {
    const nums = Array.from({length: max-min+1}, (_,i)=>min+i).sort(()=>Math.random()-0.5).slice(0, ci===2?4:5).sort((a,b)=>a-b);
    let ni = 0;
    for (let r=0;r<5;r++) {
      if (ci===2 && r===2) grid[r][ci]=-1;
      else grid[r][ci]=nums[ni++];
    }
  });
  return grid;
}

export const mockHandlers: Record<string, (...args: unknown[]) => unknown> = {
  'auth:login': async (username: unknown, password: unknown) => {
    if (username === 'agent' && password === 'agent123') {
      return { success: true, data: { token: 'mock-token', user: mockSession.user, agent: mockSession.agent } };
    }
    if (username === 'admin' && password === 'admin123') {
      return { success: true, data: { token: 'mock-token', user: { ...mockSession.user, username: 'admin', role: 'SUPER_ADMIN', fullName: 'Admin' }, agent: null } };
    }
    return { success: false, error: 'Invalid credentials' };
  },
  'auth:session': async () => mockSession,
  'auth:logout': async () => ({ success: true }),
  'wallet:balance': async () => mockBalance,
  'wallet:transactions': async () => [],
  'wallet:redeem': async (code: unknown) => {
    const amounts: Record<string, number> = { VOUCHER100: 100, VOUCHER500: 500, VOUCHER1000: 1000, DEMO2024: 250 };
    const c = String(code).toUpperCase();
    if (amounts[c]) { mockBalance += amounts[c]; return { success: true, data: { amount: amounts[c], newBalance: mockBalance } }; }
    return { success: false, error: 'Invalid voucher' };
  },
  'cards:list': async () => mockCards,
  'cards:create': async () => {
    cardCounter++;
    const grid = generateCard();
    const card = { id: `card-${cardCounter}`, cardNumber: String(cardCounter), grid, cardData: JSON.stringify({grid}), agentId: 'agent-1', createdAt: Date.now()/1000, updatedAt: Date.now()/1000 };
    mockCards.push(card);
    return card;
  },
  'cards:delete': async (id: unknown) => { const i = mockCards.findIndex(c=>c.id===id); if(i>=0) mockCards.splice(i,1); return {success:true}; },
  'cards:update': async () => ({ success: true }),
  'cards:generate': async (count: unknown) => { const r=[]; for(let i=0;i<Number(count);i++) r.push(await mockHandlers['cards:create']()); return r; },
  'games:create': async (config: unknown) => {
    const c = config as { betAmount: number; selectedNumbers: number[] };
    const game = { id: `game-${mockGames.length+1}`, gameCode: `BNG-${1000+mockGames.length}`, status: 'RUNNING', betAmount: c.betAmount, playerCount: c.selectedNumbers.length, selectedNumbers: c.selectedNumbers, drawnNumbers: [] };
    mockGames.push(game);
    return { success: true, data: game };
  },
  'games:active': async () => mockGames.find(g=>g.status==='RUNNING') ?? null,
  'games:draw': async () => ({ success: true, data: { number: Math.floor(Math.random()*150)+1, drawOrder: 1, winners: [] } }),
  'games:end': async () => ({ success: true, data: { totalBets: 100, agentRevenue: 80, totalPayouts: 0 } }),
  'games:list': async () => mockGames.map((g,i)=>({ id:g.id, gameCode:g.gameCode, date:Date.now()/1000-i*86400, betAmount:g.betAmount||10, playersNumber:(g as {playerCount?:number}).playerCount||0, commissionPercent:20, profit:80, status:g.status||'COMPLETED' })),
};
