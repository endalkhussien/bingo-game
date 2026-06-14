import { ipcMain } from 'electron';
import * as auth from '../services/auth-service';
import * as cards from '../services/card-service';
import * as games from '../services/game-service';
import * as wallet from '../services/wallet-service';
import * as agentAdmin from '../services/agent-admin-service';
import * as recharge from '../services/recharge-service';
import * as pricing from '../services/pricing-service';
import * as dashboard from '../services/dashboard-service';
import * as reports from '../services/reports-service';
import * as settings from '../services/settings-service';
import { getOrganizationKeyForDisplay, setOrganizationVoucherSecret } from '../services/voucher-secret-service';
import * as backup from '../services/backup-service';
import * as notifications from '../services/notification-service';
import * as audit from '../services/audit-service';
import { speakNumber, speakBallCall, listInstalledVoices } from '../tts/tts-engine';

const sessions = new Map<number, string>();

function getToken(event: Electron.IpcMainInvokeEvent) {
  return sessions.get(event.sender.id) ?? null;
}

async function requireAuth(event: Electron.IpcMainInvokeEvent) {
  const token = getToken(event);
  if (!token) throw new Error('Not authenticated');
  const session = await auth.validateSession(token);
  if (!session) throw new Error('Session expired');
  return session;
}

async function requireAdmin(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (session.user.role !== 'SUPER_ADMIN') throw new Error('Admin access required');
  return session;
}

async function requireAgent(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (!session.agent) throw new Error('Agent access required');
  return session;
}

export function registerIpcHandlers() {
  // ── Auth ──
  ipcMain.handle('auth:login', async (event, username: string, password: string, rememberMe?: boolean) => {
    const result = await auth.login(username, password, rememberMe);
    if (result.success && result.data) sessions.set(event.sender.id, result.data.token);
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
  ipcMain.handle('auth:change-password', async (event, oldPw: string, newPw: string) => {
    const session = await requireAuth(event);
    return auth.changePassword(session.user.id, oldPw, newPw);
  });

  // ── Dashboard ──
  ipcMain.handle('dashboard:admin', async (event) => requireAdmin(event).then(() => dashboard.getAdminDashboard()));
  ipcMain.handle('dashboard:agent', async (event) => requireAgent(event).then((s) => dashboard.getAgentDashboard(s.agent!.id)));

  // ── Agents (admin) ──
  ipcMain.handle('agents:list', async (event) => { await requireAdmin(event); return agentAdmin.listAgents(); });
  ipcMain.handle('agents:create', async (event, data) => {
    const s = await requireAdmin(event);
    return agentAdmin.createAgent(s.user.id, data);
  });
  ipcMain.handle('agents:update', async (event, id: string, data) => {
    const s = await requireAdmin(event);
    return agentAdmin.updateAgent(s.user.id, id, data);
  });
  ipcMain.handle('agents:suspend', async (event, id: string) => {
    const s = await requireAdmin(event);
    return agentAdmin.setAgentStatus(s.user.id, id, 'SUSPENDED');
  });
  ipcMain.handle('agents:activate', async (event, id: string) => {
    const s = await requireAdmin(event);
    return agentAdmin.setAgentStatus(s.user.id, id, 'ACTIVE');
  });
  ipcMain.handle('agents:reset-password', async (event, id: string, pw: string) => {
    const s = await requireAdmin(event);
    return agentAdmin.resetAgentPassword(s.user.id, id, pw);
  });
  ipcMain.handle('agents:detail', async (event, id: string) => {
    await requireAdmin(event);
    return agentAdmin.getAgentDetail(id);
  });

  // ── Wallet ──
  ipcMain.handle('wallet:balance', async (event) => requireAgent(event).then((s) => wallet.getBalance(s.agent!.id)));
  ipcMain.handle('wallet:transactions', async (event) => requireAgent(event).then((s) => wallet.getTransactions(s.agent!.id)));
  ipcMain.handle('wallet:redeem', async (event, code: string) => requireAgent(event).then((s) => wallet.redeemVoucher(s.agent!.id, code)));
  ipcMain.handle('vouchers:generate', async (event, amount: number, forUsername: string) =>
    requireAdmin(event).then((s) => wallet.createOfflineRechargeCode(s.user.id, amount, forUsername)));
  ipcMain.handle('vouchers:list-issued', async (event) => {
    await requireAdmin(event);
    return wallet.listIssuedOfflineCodes();
  });
  ipcMain.handle('vouchers:revoke', async (event, id: string) => {
    await requireAdmin(event);
    return wallet.revokeOfflineCode(id);
  });
  ipcMain.handle('vouchers:org-key', async (event) => {
    await requireAdmin(event);
    return getOrganizationKeyForDisplay();
  });
  ipcMain.handle('settings:set-org-recharge-key', async (event, key: string) => {
    await requireAuth(event);
    return setOrganizationVoucherSecret(key);
  });
  ipcMain.handle('wallet:deposit', async (event, agentId: string, amount: number, desc: string) => {
    await requireAdmin(event);
    return wallet.adminDeposit(agentId, amount, desc);
  });
  ipcMain.handle('wallet:withdraw', async (event, agentId: string, amount: number, desc: string) => {
    await requireAdmin(event);
    return wallet.adminWithdraw(agentId, amount, desc);
  });

  // ── Recharge ──
  ipcMain.handle('recharge:submit', async (event, data) => requireAgent(event).then((s) => recharge.submitRechargeRequest(s.agent!.id, data)));
  ipcMain.handle('recharge:list', async (event, filters) => {
    const s = await requireAuth(event);
    if (s.user.role === 'AGENT') return recharge.listRechargeRequests({ ...filters, agentId: s.agent!.id });
    await requireAdmin(event);
    return recharge.listRechargeRequests(filters);
  });
  ipcMain.handle('recharge:approve', async (event, id: string) => requireAdmin(event).then((s) => recharge.approveRecharge(s.user.id, id)));
  ipcMain.handle('recharge:reject', async (event, id: string, reason?: string) => requireAdmin(event).then((s) => recharge.rejectRecharge(s.user.id, id, reason)));
  ipcMain.handle('recharge:pending-count', async (event) => { await requireAdmin(event); return recharge.countPendingRecharges(); });

  // ── Pricing ──
  ipcMain.handle('pricing:list', async (event) => { await requireAuth(event); return pricing.listPricingPlans(); });
  ipcMain.handle('pricing:create', async (event, data) => { await requireAdmin(event); return pricing.createPricingPlan(data); });
  ipcMain.handle('pricing:update', async (event, id: string, data) => { await requireAdmin(event); return pricing.updatePricingPlan(id, data); });
  ipcMain.handle('pricing:disable', async (event, id: string) => { await requireAdmin(event); return pricing.disablePricingPlan(id); });

  // ── Cards ──
  ipcMain.handle('cards:list', async (event) => requireAgent(event).then((s) => cards.listCards(s.agent!.id)));
  ipcMain.handle('cards:create', async (event, grid?: number[][]) => requireAgent(event).then((s) => cards.createCard(s.agent!.id, grid)));
  ipcMain.handle('cards:update', async (event, id: string, grid: number[][]) => requireAgent(event).then((s) => cards.updateCard(id, s.agent!.id, grid)));
  ipcMain.handle('cards:regenerate', async (event, id: string) => requireAgent(event).then((s) => cards.regenerateCardGrid(id, s.agent!.id)));
  ipcMain.handle('cards:rebuild-deck', async (event, regenerateAll?: boolean) =>
    requireAgent(event).then((s) => cards.rebuildDeck(s.agent!.id, regenerateAll ?? false)));
  ipcMain.handle('cards:delete', async (event, id: string) => requireAgent(event).then((s) => cards.deleteCard(id, s.agent!.id)));
  ipcMain.handle('cards:generate', async (event, count: number) => requireAgent(event).then((s) => cards.generateBulkCards(s.agent!.id, count)));

  // ── Games ──
  ipcMain.handle('games:create', async (event, config) => requireAgent(event).then((s) => games.createGame(s.agent!.id, config)));
  ipcMain.handle('games:active', async (event) => requireAgent(event).then((s) => games.getActiveGame(s.agent!.id)));
  ipcMain.handle('games:draw', async (event, gameId: string) => requireAgent(event).then((s) => games.drawNumber(gameId, s.agent!.id)));
  ipcMain.handle('games:pause', async (event, gameId: string) => requireAgent(event).then((s) => games.pauseGame(gameId, s.agent!.id)));
  ipcMain.handle('games:resume', async (event, gameId: string) => requireAgent(event).then((s) => games.resumeGame(gameId, s.agent!.id)));
  ipcMain.handle('games:validate-winner', async (event, gameId: string, cardNumber: string) =>
    requireAgent(event).then((s) => games.validateWinner(gameId, s.agent!.id, cardNumber)));
  ipcMain.handle('games:end', async (event, gameId: string) => requireAgent(event).then((s) => games.endGame(gameId, s.agent!.id)));
  ipcMain.handle('games:list', async (event, filters) => {
    const s = await requireAuth(event);
    if (s.user.role === 'AGENT') return games.listGames(s.agent!.id, filters);
    return reports.getGameHistoryReport(filters);
  });

  // ── Reports ──
  ipcMain.handle('reports:revenue', async (event, filters) => { await requireAdmin(event); return reports.getRevenueReport(filters); });
  ipcMain.handle('reports:profit', async (event, filters) => { await requireAdmin(event); return reports.getProfitReport(filters); });
  ipcMain.handle('reports:agents', async (event) => { await requireAdmin(event); return reports.getAgentPerformanceReport(); });
  ipcMain.handle('reports:recharge', async (event) => { await requireAdmin(event); return reports.getRechargeReport(); });
  ipcMain.handle('reports:games', async (event, filters) => { await requireAdmin(event); return reports.getGameHistoryReport(filters); });
  ipcMain.handle('reports:wallet', async (event) => requireAgent(event).then((s) => reports.getAgentWalletHistory(s.agent!.id)));

  // ── Settings ──
  ipcMain.handle('settings:get', async (event) => { await requireAuth(event); return settings.getSettings(); });
  ipcMain.handle('settings:update', async (event, data) => { await requireAdmin(event); return settings.updateSettings(data); });

  // ── Backup ──
  ipcMain.handle('backup:create', async (event) => { await requireAdmin(event); return backup.createBackup(); });
  ipcMain.handle('backup:list', async (event) => { await requireAdmin(event); return backup.listBackups(); });
  ipcMain.handle('backup:restore', async (event, filename: string) => { await requireAdmin(event); return backup.restoreBackup(filename); });

  // ── Notifications ──
  ipcMain.handle('notifications:list', async (event) => requireAuth(event).then((s) => notifications.listNotifications(s.user.id)));
  ipcMain.handle('notifications:unread-count', async (event) => requireAuth(event).then((s) => notifications.countUnread(s.user.id)));
  ipcMain.handle('notifications:mark-read', async (event, id: string) => requireAuth(event).then((s) => notifications.markRead(id, s.user.id)));
  ipcMain.handle('notifications:mark-all-read', async (event) => requireAuth(event).then((s) => notifications.markAllRead(s.user.id)));

  // ── TTS (Amharic + English) ──
  ipcMain.handle('tts:speak', async (event, number: number, voiceType: string, language: string, mode?: 'ball' | 'cartella') => {
    await requireAuth(event);
    return speakNumber(number, voiceType, language, mode ?? 'cartella');
  });
  ipcMain.handle('tts:speak-ball-call', async (event, number: number, language: string, voiceType: string) => {
    await requireAuth(event);
    return speakBallCall(number, language, voiceType);
  });
  ipcMain.handle('tts:test', async (event, voiceType: string, language: string, sample?: number) => {
    await requireAuth(event);
    const n = sample ?? 42;
    const result = await speakBallCall(n, language, voiceType);
    const { letter, numberText } = (await import('../../src/shared/tts/ball-call')).getBallCallSpeechParts(n, language);
    return { ...result, text: `${letter} ${numberText}` };
  });
  ipcMain.handle('tts:list-voices', async (event) => {
    await requireAuth(event);
    return listInstalledVoices();
  });

  // ── Audit ──
  ipcMain.handle('audit:list', async (event, filters) => { await requireAdmin(event); return audit.listAuditLogs(filters); });
}
