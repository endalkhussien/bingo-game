/**
 * Cross-PC flow test — agent setup (TAS) + recharge (TBG).
 * Uses compiled dist-electron JS (no tsx) so it runs reliably on Windows.
 * Usage: npm run test:cross-pc
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function distModule(...parts) {
  const file = path.join(root, 'dist-electron', ...parts);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file} — run: npm run build:electron`);
  }
  return require(file);
}

function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log(`  ✓ ${name}`);
}

const { generateAgentSetupCode, parseAgentSetupCode } = distModule('src/shared/voucher/agent-setup-code.js');
const { generateOfflineVoucher, verifyOfflineVoucher } = distModule('src/shared/voucher/offline-voucher.js');
const { DEFAULT_OPERATOR_ORG_KEY } = distModule('src/shared/voucher/default-org-key.js');
const { normalizeUsername, isValidAgentUsername } = distModule('src/shared/auth/normalize-username.js');

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

const { generateOperatorLicenseCode, parseOperatorLicenseCode } = distModule('src/shared/voucher/operator-license-code.js');
const tol = generateOperatorLicenseCode('Bole Hall', 7, 20);
assert('TOL code generated', tol.code.startsWith('TOL-'));
const tolParsed = parseOperatorLicenseCode(tol.code);
assert('TOL code parses', tolParsed.valid && tolParsed.payload?.shopName === 'Bole Hall');
const wrappedTol = tol.code.match(/.{1,40}/g).join('\n');
const wrappedParsed = parseOperatorLicenseCode(wrappedTol);
assert('TOL code parses when pasted with line breaks', wrappedParsed.valid);

console.log('\nALL CROSS-PC CHECKS PASSED\n');
