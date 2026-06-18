import { ipcMain, clipboard, BrowserWindow } from 'electron';
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
import * as agentSelf from '../services/agent-self-service';
import * as operatorLicense from '../services/operator-license-service';
import * as operatorWallet from '../services/operator-wallet-service';
import * as vendorTopup from '../services/vendor-topup-service';
import * as factoryReset from '../services/factory-reset-service';
import { isAdminRole, isVendorRole } from '../../src/shared/roles';
import { speakNumber, speakBallCall, speakPlainText, listInstalledVoices } from '../tts/tts-engine';
import { closeCallerDisplayWindow, openCallerDisplayWindow } from '../utils/caller-display-window';

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

async function requireShopAdmin(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (isVendorRole(session.user.role)) {
    throw new Error('Shop admin only. Vendor accounts use the Vendor Board.');
  }
  if (session.user.role !== 'OPERATOR') {
    throw new Error('Shop admin access required');
  }
  const licensed = await operatorLicense.isOperatorLicensed();
  if (!licensed) {
    const err = new Error('OPERATOR_LICENSE_EXPIRED') as Error & { code?: string };
    err.code = 'OPERATOR_LICENSE_EXPIRED';
    throw err;
  }
  return session;
}

async function requireVendorOrShopAdmin(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (isVendorRole(session.user.role)) return session;
  return requireShopAdmin(event);
}

async function requireAdmin(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (isVendorRole(session.user.role)) return session;
  if (session.user.role === 'OPERATOR') {
    const licensed = await operatorLicense.isOperatorLicensed();
    if (!licensed) {
      const err = new Error('OPERATOR_LICENSE_EXPIRED') as Error & { code?: string };
      err.code = 'OPERATOR_LICENSE_EXPIRED';
      throw err;
    }
    return session;
  }
  if (isAdminRole(session.user.role)) return session;
  throw new Error('Admin access required');
}

async function requireVendor(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (!isVendorRole(session.user.role)) throw new Error('Vendor super-admin access required');
  return session;
}

async function requireAgent(event: Electron.IpcMainInvokeEvent) {
  const session = await requireAuth(event);
  if (!session.agent) throw new Error('Agent access required');
  return session;
}

export function registerIpcHandlers() {
  // ── Clipboard (Electron — reliable copy on Windows) ──
  ipcMain.handle('clipboard:write', async (_event, text: string) => {
    try {
      clipboard.writeText(String(text ?? ''));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Copy failed' };
    }
  });

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

  // ── Operator license (TOL weekly/monthly) ──
  ipcMain.handle('license:status', async () => operatorLicense.getOperatorLicenseStatus());
  ipcMain.handle('license:activate', async (event, code: string) => {
    try {
      const session = await requireAuth(event);
      if (session.user.role !== 'OPERATOR') {
        return {
          success: false,
          error: session.user.role === 'SUPER_ADMIN'
            ? 'You are logged in as vendor. Log out and login as shop admin (admin) to paste TOL.'
            : 'Only shop admin can activate TOL. Login as admin.',
        };
      }
      return await operatorLicense.activateOperatorLicense(
        String(code ?? '').replace(/\s+/g, ''),
      );
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Activation failed' };
    }
  });
  ipcMain.handle('license:commission-report', async (event, periodDays?: number) => {
    try {
      await requireVendorOrShopAdmin(event);
      return await operatorLicense.getVendorCommissionReport(periodDays ?? 7);
    } catch (err) {
      const licenseErr = err as Error & { code?: string };
      if (err instanceof Error && (err.message === 'OPERATOR_LICENSE_EXPIRED' || licenseErr.code === 'OPERATOR_LICENSE_EXPIRED')) {
        return {
          periodDays: periodDays ?? 7,
          gameCount: 0,
          totalBets: 0,
          vendorCommissionDue: 0,
          shopName: '',
          vendorCommissionRate: 20,
          licenseActive: false,
        };
      }
      throw err;
    }
  });
  ipcMain.handle('license:generate', async (event, shopName: string, validDays: number, commissionRate: number) => {
    await requireVendor(event);
    const days = validDays === 30 ? 30 : 7;
    return operatorLicense.generateVendorLicenseCode(shopName, days as 7 | 30, commissionRate);
  });

  // ── Shop admin wallet (TVP from vendor) ──
  ipcMain.handle('operator-wallet:balance', async (event) => {
    await requireShopAdmin(event);
    return operatorWallet.getOperatorWalletBalance();
  });
  ipcMain.handle('operator-wallet:transactions', async (event) => {
    await requireShopAdmin(event);
    return operatorWallet.getOperatorWalletTransactions();
  });
  ipcMain.handle('operator-wallet:redeem', async (event, code: string) => {
    await requireShopAdmin(event);
    return operatorWallet.redeemVendorTopupCode(code.trim());
  });

  // ── Vendor top-up codes (TVP) for shop admin balance ──
  ipcMain.handle('vendor-topup:generate', async (event, shopName: string, amount: number) => {
    const s = await requireVendor(event);
    return vendorTopup.generateVendorTopup(s.user.id, shopName, amount);
  });
  ipcMain.handle('vendor-topup:list', async (event) => {
    await requireVendor(event);
    return vendorTopup.listVendorTopups();
  });
  ipcMain.handle('vendor-topup:summary', async (event) => {
    await requireVendor(event);
    return vendorTopup.getVendorTopupSummary();
  });

  // ── Dashboard ──
  ipcMain.handle('dashboard:admin', async (event) => requireShopAdmin(event).then(() => dashboard.getAdminDashboard()));
  ipcMain.handle('dashboard:agent', async (event) => requireAgent(event).then((s) => dashboard.getAgentDashboard(s.agent!.id)));

  // ── Agents (admin) ──
  ipcMain.handle('agents:list', async (event) => { await requireShopAdmin(event); return agentAdmin.listAgents(); });
  ipcMain.handle('agents:create', async (event, data) => {
    try {
      const s = await requireShopAdmin(event);
      return await agentAdmin.createAgent(s.user.id, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent';
      return { success: false, error: message };
    }
  });
  ipcMain.handle('agents:activate-setup', async (_event, setupCode: string) => {
    return agentAdmin.activateAgentFromSetup(setupCode);
  });
  ipcMain.handle('agents:regenerate-setup', async (event, agentId: string, password: string) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.regenerateAgentSetupCode(s.user.id, agentId, password);
  });
  ipcMain.handle('agents:update', async (event, id: string, data) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.updateAgent(s.user.id, id, data);
  });
  ipcMain.handle('agents:suspend', async (event, id: string) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.setAgentStatus(s.user.id, id, 'SUSPENDED');
  });
  ipcMain.handle('agents:activate', async (event, id: string) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.setAgentStatus(s.user.id, id, 'ACTIVE');
  });
  ipcMain.handle('agents:delete', async (event, id: string) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.deleteAgent(s.user.id, id);
  });
  ipcMain.handle('agents:reset-password', async (event, id: string, pw: string) => {
    const s = await requireShopAdmin(event);
    return agentAdmin.resetAgentPassword(s.user.id, id, pw);
  });
  ipcMain.handle('agents:detail', async (event, id: string) => {
    await requireShopAdmin(event);
    return agentAdmin.getAgentDetail(id);
  });
  ipcMain.handle('agents:update-own-commission', async (event, commissionRate: number) => {
    const s = await requireAgent(event);
    return agentSelf.updateOwnCommission(s.agent!.id, commissionRate);
  });
  ipcMain.handle('agents:profile', async (event) => {
    const s = await requireAgent(event);
    return agentSelf.getAgentProfile(s.agent!.id);
  });

  // ── Wallet ──
  ipcMain.handle('wallet:balance', async (event) => requireAgent(event).then((s) => wallet.getBalance(s.agent!.id)));
  ipcMain.handle('wallet:transactions', async (event) => requireAgent(event).then((s) => wallet.getTransactions(s.agent!.id)));
  ipcMain.handle('wallet:redeem', async (event, code: string) => requireAgent(event).then((s) => wallet.redeemVoucher(s.agent!.id, code)));
  ipcMain.handle('vouchers:generate', async (event, amount: number, forUsername: string) =>
    requireShopAdmin(event).then((s) => wallet.createOfflineRechargeCode(s.user.id, amount, forUsername)));
  ipcMain.handle('vouchers:list-issued', async (event) => {
    await requireShopAdmin(event);
    return wallet.listIssuedOfflineCodes();
  });
  ipcMain.handle('vouchers:revoke', async (event, id: string) => {
    await requireShopAdmin(event);
    return wallet.revokeOfflineCode(id);
  });
  ipcMain.handle('vouchers:delete', async (event, id: string) => {
    await requireShopAdmin(event);
    return wallet.deleteIssuedOfflineCode(id);
  });
  ipcMain.handle('vouchers:org-key', async (event) => {
    await requireShopAdmin(event);
    return getOrganizationKeyForDisplay();
  });
  ipcMain.handle('settings:set-org-recharge-key', async (event, key: string) => {
    await requireAuth(event);
    return setOrganizationVoucherSecret(key);
  });
  ipcMain.handle('wallet:deposit', async (event, agentId: string, amount: number, desc: string) => {
    await requireShopAdmin(event);
    return wallet.adminDeposit(agentId, amount, desc);
  });
  ipcMain.handle('wallet:withdraw', async (event, agentId: string, amount: number, desc: string) => {
    await requireShopAdmin(event);
    return wallet.adminWithdraw(agentId, amount, desc);
  });

  // ── Recharge ──
  ipcMain.handle('recharge:submit', async (event, data) => requireAgent(event).then((s) => recharge.submitRechargeRequest(s.agent!.id, data)));
  ipcMain.handle('recharge:list', async (event, filters) => {
    const s = await requireAuth(event);
    if (s.user.role === 'AGENT') return recharge.listRechargeRequests({ ...filters, agentId: s.agent!.id });
    await requireShopAdmin(event);
    return recharge.listRechargeRequests(filters);
  });
  ipcMain.handle('recharge:approve', async (event, id: string) => requireShopAdmin(event).then((s) => recharge.approveRecharge(s.user.id, id)));
  ipcMain.handle('recharge:reject', async (event, id: string, reason?: string) => requireShopAdmin(event).then((s) => recharge.rejectRecharge(s.user.id, id, reason)));
  ipcMain.handle('recharge:pending-count', async (event) => { await requireShopAdmin(event); return recharge.countPendingRecharges(); });

  // ── Pricing ──
  ipcMain.handle('pricing:list', async (event) => { await requireAuth(event); return pricing.listPricingPlans(); });
  ipcMain.handle('pricing:create', async (event, data) => { await requireShopAdmin(event); return pricing.createPricingPlan(data); });
  ipcMain.handle('pricing:update', async (event, id: string, data) => { await requireShopAdmin(event); return pricing.updatePricingPlan(id, data); });
  ipcMain.handle('pricing:disable', async (event, id: string) => { await requireShopAdmin(event); return pricing.disablePricingPlan(id); });

  // ── Cards ──
  ipcMain.handle('cards:list', async (event) => requireAgent(event).then((s) => cards.listCards(s.agent!.id)));
  ipcMain.handle('cards:create', async (event, grid?: number[][]) => requireAgent(event).then((s) => cards.createCard(s.agent!.id, grid)));
  ipcMain.handle('cards:update', async (event, id: string, grid: number[][]) => requireAgent(event).then((s) => cards.updateCard(id, s.agent!.id, grid)));
  ipcMain.handle('cards:regenerate', async (event, id: string) => requireAgent(event).then((s) => cards.regenerateCardGrid(id, s.agent!.id)));
  ipcMain.handle('cards:rebuild-deck', async (event, regenerateAll?: boolean) =>
    requireAgent(event).then((s) => cards.rebuildDeck(s.agent!.id, regenerateAll ?? false)));
  ipcMain.handle('cards:delete', async (event, id: string) => requireAgent(event).then((s) => cards.deleteCard(id, s.agent!.id)));
  ipcMain.handle('cards:generate', async (event, count: number) => requireAgent(event).then((s) => cards.generateBulkCards(s.agent!.id, count)));
  ipcMain.handle('cards:create-by-number', async (event, cardNumber: number, grid?: number[][]) =>
    requireAgent(event).then((s) => cards.createCardByNumber(s.agent!.id, cardNumber, grid)));
  ipcMain.handle('cards:get-by-number', async (event, cardNumber: number) =>
    requireAgent(event).then((s) => cards.getCardByNumber(s.agent!.id, cardNumber)));

  // ── Caller display window ──
  ipcMain.handle('window:open-caller-display', async (event) => {
    await requireAgent(event);
    const parent = BrowserWindow.fromWebContents(event.sender);
    return openCallerDisplayWindow(parent);
  });
  ipcMain.handle('window:close-caller-display', async () => {
    closeCallerDisplayWindow();
    return true;
  });

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
  ipcMain.handle('reports:revenue', async (event, filters) => { await requireShopAdmin(event); return reports.getRevenueReport(filters); });
  ipcMain.handle('reports:profit', async (event, filters) => { await requireShopAdmin(event); return reports.getProfitReport(filters); });
  ipcMain.handle('reports:agents', async (event) => { await requireShopAdmin(event); return reports.getAgentPerformanceReport(); });
  ipcMain.handle('reports:recharge', async (event) => { await requireShopAdmin(event); return reports.getRechargeReport(); });
  ipcMain.handle('reports:games', async (event, filters) => { await requireShopAdmin(event); return reports.getGameHistoryReport(filters); });
  ipcMain.handle('reports:wallet', async (event) => requireAgent(event).then((s) => reports.getAgentWalletHistory(s.agent!.id)));

  // ── Settings ──
  ipcMain.handle('settings:get', async (event) => { await requireAuth(event); return settings.getSettings(); });
  ipcMain.handle('settings:has-org-key', async (event) => {
    await requireAuth(event);
    const { hasOrganizationKey } = await import('../services/voucher-secret-service');
    return hasOrganizationKey();
  });
  ipcMain.handle('settings:update', async (event, data) => { await requireShopAdmin(event); return settings.updateSettings(data); });

  // ── Backup ──
  ipcMain.handle('backup:create', async (event) => { await requireShopAdmin(event); return backup.createBackup(); });
  ipcMain.handle('backup:list', async (event) => { await requireShopAdmin(event); return backup.listBackups(); });
  ipcMain.handle('backup:restore', async (event, filename: string) => { await requireShopAdmin(event); return backup.restoreBackup(filename); });
  ipcMain.handle('database:factory-reset', async (event) => {
    const session = await requireAuth(event);
    if (session.user.role !== 'OPERATOR') {
      return { success: false, error: 'Shop admin only' };
    }
    return factoryReset.factoryReset(session.user.id);
  });

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
  ipcMain.handle('tts:speak-text', async (event, text: string, lang: string, voiceType: string) => {
    await requireAuth(event);
    return speakPlainText(text, lang, voiceType);
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
  ipcMain.handle('audit:list', async (event, filters) => { await requireShopAdmin(event); return audit.listAuditLogs(filters); });
}
