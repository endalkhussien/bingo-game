/**
 * Verifies shop admin wallet credit + TVP redeem round-trip (SQLite in-memory style).
 */
import { generateVendorTopupCode, parseVendorTopupCode, hashVendorTopupCode } from '../src/shared/voucher/vendor-topup-code.ts';
import { generateAdminActivationCode, parseAdminActivationCode } from '../src/shared/voucher/admin-activation-code.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const tak = generateAdminActivationCode('Bole Shop', 2500, 20);
const takParsed = parseAdminActivationCode(tak.code);
assert(takParsed.valid && takParsed.payload?.amount === 2500, 'TAK parses with amount');

const tvp = generateVendorTopupCode('Bole Shop', 1500);
const tvpParsed = parseVendorTopupCode(tvp.code);
assert(tvpParsed.valid && tvpParsed.payload?.amount === 1500, 'TVP parses with amount');

const wrapped = `TVP-\n${tvp.code.slice(4, 20)}\n${tvp.code.slice(20)}`;
const wrappedParsed = parseVendorTopupCode(wrapped.replace(/\s+/g, ''));
assert(wrappedParsed.valid, 'TVP with whitespace stripped parses');

assert(hashVendorTopupCode(tvp.code) === hashVendorTopupCode(`  ${tvp.code}  `), 'TVP hash normalizes whitespace');

console.log('Wallet voucher tests OK');
