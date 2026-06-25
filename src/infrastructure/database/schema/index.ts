import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id),
  phone: text('phone'),
  commissionRate: real('commission_rate').notNull().default(10),
  /** Admin/platform share taken from the agent's commission earnings (%) */
  adminCommissionRate: real('admin_commission_rate').notNull().default(20),
  walletBalance: real('wallet_balance').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const walletTransactions = sqliteTable('wallet_transactions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  amount: real('amount').notNull(),
  transactionType: text('transaction_type').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  description: text('description').notNull(),
  balanceAfter: real('balance_after').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [index('idx_wallet_agent').on(t.agentId, t.createdAt)]);

export const rechargeVouchers = sqliteTable('recharge_vouchers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  amount: real('amount').notNull(),
  isUsed: integer('is_used', { mode: 'boolean' }).notNull().default(false),
  usedByAgentId: text('used_by_agent_id').references(() => agents.id),
  usedAt: integer('used_at'),
  createdAt: integer('created_at').notNull(),
});

/** Tracks offline signed codes redeemed on this PC (prevents reuse) */
export const usedOfflineVouchers = sqliteTable('used_offline_vouchers', {
  id: text('id').primaryKey(),
  nonce: text('nonce').notNull().unique(),
  codeHash: text('code_hash').notNull().unique(),
  amount: real('amount').notNull(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  redeemedAt: integer('redeemed_at').notNull(),
});

/** Admin ledger of codes issued (admin PC only) */
export const issuedOfflineVouchers = sqliteTable('issued_offline_vouchers', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  codeHash: text('code_hash').notNull().unique(),
  amount: real('amount').notNull(),
  forUsername: text('for_username').notNull(),
  nonce: text('nonce').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  status: text('status').notNull().default('ISSUED'),
  issuedBy: text('issued_by').notNull().references(() => users.id),
  issuedAt: integer('issued_at').notNull(),
  redeemedAt: integer('redeemed_at'),
});

export const bingoCards = sqliteTable('bingo_cards', {
  id: text('id').primaryKey(),
  cardNumber: text('card_number').notNull(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  cardData: text('card_data').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [index('idx_cards_agent').on(t.agentId)]);

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  gameCode: text('game_code').notNull().unique(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  gameName: text('game_name').notNull(),
  betAmount: real('bet_amount').notNull(),
  winningPattern: text('winning_pattern').notNull(),
  jackpotMaximumCalls: integer('jackpot_maximum_calls').default(45),
  drawSpeedMs: integer('draw_speed_ms').notNull().default(4000),
  voiceType: text('voice_type').notNull().default('AMHARIC_MALE'),
  language: text('language').notNull().default('am'),
  numberRangeMax: integer('number_range_max').notNull().default(75),
  maxPlayers: integer('max_players').notNull().default(150),
  commissionRate: real('commission_rate').notNull().default(10),
  commissionReserved: real('commission_reserved').notNull().default(0),
  status: text('status').notNull().default('DRAFT'),
  selectedNumbers: text('selected_numbers'),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [index('idx_games_agent').on(t.agentId, t.status)]);

export const gameCards = sqliteTable('game_cards', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  cardId: text('card_id').notNull().references(() => bingoCards.id),
  playerName: text('player_name'),
  status: text('status').notNull().default('ACTIVE'),
  joinedAt: integer('joined_at').notNull(),
});

/** GameCalledNumbers — every ball called during a game session (no duplicates per game) */
export const drawnNumbers = sqliteTable('drawn_numbers', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  number: integer('number').notNull(),
  drawOrder: integer('draw_order').notNull(),
  drawnAt: integer('drawn_at').notNull(),
}, (t) => [
  index('idx_drawn_game').on(t.gameId, t.number),
  index('idx_called_game_order').on(t.gameId, t.drawOrder),
]);

export const winners = sqliteTable('winners', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  cardId: text('card_id').notNull().references(() => bingoCards.id),
  winningPattern: text('winning_pattern').notNull(),
  prizeAmount: real('prize_amount').notNull(),
  wonAt: integer('won_at').notNull(),
  winningCallNumber: integer('winning_call_number'),
  calledCountAtWin: integer('called_count_at_win'),
  verifiedAt: integer('verified_at'),
  verificationResult: text('verification_result'),
  tieGroupId: text('tie_group_id'),
});

export const gameRevenue = sqliteTable('game_revenue', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().unique().references(() => games.id),
  totalPlayers: integer('total_players').notNull(),
  totalBets: real('total_bets').notNull(),
  totalPayouts: real('total_payouts').notNull(),
  platformRevenue: real('platform_revenue').notNull(),
  agentRevenue: real('agent_revenue').notNull(),
  commissionRevenue: real('commission_revenue').notNull(),
  calculatedAt: integer('calculated_at').notNull(),
});

export const rechargeRequests = sqliteTable('recharge_requests', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  referenceNumber: text('reference_number'),
  status: text('status').notNull().default('PENDING'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  requestedAt: integer('requested_at').notNull(),
  reviewedAt: integer('reviewed_at'),
});

export const pricingPlans = sqliteTable('pricing_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  planType: text('plan_type').notNull(),
  price: real('price').notNull(),
  cardLimit: integer('card_limit'),
  duration: text('duration'),
  durationDays: integer('duration_days'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isPromotional: integer('is_promotional', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: integer('created_at').notNull(),
});

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Shop admin prepaid balance — funded by vendor TVP codes */
export const operatorWalletTransactions = sqliteTable('operator_wallet_transactions', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  transactionType: text('transaction_type').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  description: text('description').notNull(),
  balanceAfter: real('balance_after').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [index('idx_operator_wallet_tx').on(t.createdAt)]);

/** Vendor PC ledger of TVP codes issued to shops */
export const issuedVendorTopups = sqliteTable('issued_vendor_topups', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  codeHash: text('code_hash').notNull().unique(),
  amount: real('amount').notNull(),
  shopName: text('shop_name').notNull(),
  nonce: text('nonce').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  status: text('status').notNull().default('ISSUED'),
  issuedBy: text('issued_by').notNull().references(() => users.id),
  issuedAt: integer('issued_at').notNull(),
  redeemedAt: integer('redeemed_at'),
});

/** Shop admin PC — redeemed vendor TVP codes (one-time) */
export const usedVendorTopups = sqliteTable('used_vendor_topups', {
  id: text('id').primaryKey(),
  codeHash: text('code_hash').notNull().unique(),
  nonce: text('nonce').notNull().unique(),
  amount: real('amount').notNull(),
  shopName: text('shop_name').notNull(),
  redeemedAt: integer('redeemed_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type BingoCard = typeof bingoCards.$inferSelect;
export type Game = typeof games.$inferSelect;
