import { ipcMain } from 'electron';
import * as auth from '../services/auth-service';
import * as cards from '../services/card-service';
import * as games from '../services/game-service';
import * as wallet from '../services/wallet-service';

const sessions = new Map<number, string>();

function getToken(event: Electron.IpcMainInvokeEvent): string | null {
  return sessions.get(event.sender.id) ?? null;
}

async function requireAuth(event: Electron.IpcMainInvokeEvent) {
  const token = getToken(event);
  if (!token) throw new Error('Not authenticated');
  const session = await auth.validateSession(token);
  if (!session) throw new Error('Session expired');
  return session;
}

export function registerIpcHandlers() {
  // Auth
  ipcMain.handle('auth:login', async (event, username: string, password: string, rememberMe?: boolean) => {
    const result = await auth.login(username, password, rememberMe);
    if (result.success && result.data) {
      sessions.set(event.sender.id, result.data.token);
    }
    return result;
  });

  ipcMain.handle('auth:logout', async (event) => {
    const token = getToken(event);
    if (token) await auth.logout(token);
    sessions.delete(event.sender.id);
    return { success: true };
  });

  ipcMain.handle('auth:session', async (event, token?: string) => {
    const t = token ?? getToken(event);
    if (!t) return null;
    const session = await auth.validateSession(t);
    if (session) sessions.set(event.sender.id, t);
    return session;
  });

  // Wallet
  ipcMain.handle('wallet:balance', async (event) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return wallet.getBalance(session.agent.id);
  });

  ipcMain.handle('wallet:transactions', async (event) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return wallet.getTransactions(session.agent.id);
  });

  ipcMain.handle('wallet:redeem', async (event, code: string) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return wallet.redeemVoucher(session.agent.id, code);
  });

  // Cards
  ipcMain.handle('cards:list', async (event) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return cards.listCards(session.agent.id);
  });

  ipcMain.handle('cards:create', async (event, grid?: number[][]) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return cards.createCard(session.agent.id, grid);
  });

  ipcMain.handle('cards:update', async (event, cardId: string, grid: number[][]) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return cards.updateCard(cardId, session.agent.id, grid);
  });

  ipcMain.handle('cards:delete', async (event, cardId: string) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return cards.deleteCard(cardId, session.agent.id);
  });

  ipcMain.handle('cards:generate', async (event, count: number) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return cards.generateBulkCards(session.agent.id, count);
  });

  // Games
  ipcMain.handle('games:create', async (event, config) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return games.createGame(session.agent.id, config);
  });

  ipcMain.handle('games:active', async (event) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return games.getActiveGame(session.agent.id);
  });

  ipcMain.handle('games:draw', async (event, gameId: string) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return games.drawNumber(gameId, session.agent.id);
  });

  ipcMain.handle('games:end', async (event, gameId: string) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return games.endGame(gameId, session.agent.id);
  });

  ipcMain.handle('games:list', async (event, filters) => {
    const session = await requireAuth(event);
    if (!session.agent) throw new Error('Not an agent');
    return games.listGames(session.agent.id, filters);
  });
}
