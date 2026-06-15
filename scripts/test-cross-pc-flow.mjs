/**
 * Cross-PC flow test — agent setup (TAS) + recharge (TBG) without Electron/SQLite.
 * Usage: npm run test:cross-pc
 */
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadTsModule(relativePath) {
  return import(path.join(root, relativePath));
}

function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`  ✓ ${name}`);
}

const { generateAgentSetupCode, parseAgentSetupCode } = await loadTsModule('src/shared/voucher/agent-setup-code.ts');
const { generateOfflineVoucher, verifyOfflineVoucher } = await loadTsModule('src/shared/voucher/offline-voucher.ts');
const { DEFAULT_OPERATOR_ORG_KEY } = await loadTsModule('src/shared/voucher/default-org-key.ts');
const { normalizeUsername, isValidAgentUsername } = await loadTsModule('src/shared/auth/normalize-username.ts');

console.log('\nCross-PC flow test\n');

const setup = generateAgentSetupCode({
  username: 'Hall1',
  password: 'secret99',
  fullName: 'Hall Agent One',
  adminCommissionRate: 15,
  orgKey: DEFAULT_OPERATOR_ORG_KEY,
});
assert('TAS code generated', setup.code.startsWith('TAS-'));
assert('Username normalized in TAS', setup.username === 'hall1');

const parsed = parseAgentSetupCode(setup.code);
assert('TAS code parses', parsed.valid && parsed.payload?.username === 'hall1');
assert('TAS embeds org key', parsed.payload?.orgKey === DEFAULT_OPERATOR_ORG_KEY);

assert('normalizeUsername', normalizeUsername('  Abebe ') === 'abebe');
assert('isValidAgentUsername', isValidAgentUsername('abebe_1'));

const tbg = generateOfflineVoucher(500, DEFAULT_OPERATOR_ORG_KEY, { forUsername: 'hall1' });
assert('TBG code generated', tbg.code.startsWith('TBG-500-'));

const verify = verifyOfflineVoucher(tbg.code, DEFAULT_OPERATOR_ORG_KEY, 'hall1');
assert('TBG verifies with matching org key + username', verify.valid && verify.payload?.amount === 500);

const wrongKey = verifyOfflineVoucher(tbg.code, 'wrong-key-that-is-long-enough-for-check-32', 'hall1');
assert('TBG rejects wrong org key', !wrongKey.valid);

const wrongUser = verifyOfflineVoucher(tbg.code, DEFAULT_OPERATOR_ORG_KEY, 'other');
assert('TBG rejects wrong username', !wrongUser.valid);

const legacyKey = 'a'.repeat(64);
const isLegacy = /^[a-f0-9]{64}$/.test(legacyKey) && legacyKey !== DEFAULT_OPERATOR_ORG_KEY;
assert('Legacy random org key pattern detected', isLegacy);

console.log('\nALL CROSS-PC CHECKS PASSED\n');
