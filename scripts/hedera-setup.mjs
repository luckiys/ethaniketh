/**
 * AegisOS Hedera Testnet Setup
 * Creates: HCS audit topic + HTS fungible token
 * Run: node scripts/hedera-setup.mjs
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} from '@hashgraph/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', 'frontend', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const OPERATOR_ID  = env.HEDERA_OPERATOR_ID;
const OPERATOR_KEY = env.HEDERA_OPERATOR_KEY;

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in frontend/.env.local');
  process.exit(1);
}

// Parse ECDSA key (raw hex or DER)
function parseKey(keyStr) {
  const raw = keyStr.replace(/^0x/, '');
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return PrivateKey.fromStringECDSA(raw);
  }
  return PrivateKey.fromString(keyStr);
}

const operatorKey = parseKey(OPERATOR_KEY);
const client = Client.forTestnet().setOperator(
  AccountId.fromString(OPERATOR_ID),
  operatorKey
);

console.log('──────────────────────────────────────────────');
console.log('AegisOS Hedera Testnet Setup');
console.log('Operator:', OPERATOR_ID);
console.log('──────────────────────────────────────────────\n');

// ── 1. Create HCS topic ───────────────────────────────────────────────────────
console.log('Creating HCS audit topic...');
const topicTx = new TopicCreateTransaction()
  .setTopicMemo('AegisOS — AI DeFi risk OS audit trail')
  .freezeWith(client);

const signedTopicTx = await topicTx.sign(operatorKey);
const topicResponse = await signedTopicTx.execute(client);
const topicReceipt = await topicResponse.getReceipt(client);
const topicId = topicReceipt.topicId.toString();

console.log('  HCS Topic created:', topicId);
console.log('  HashScan: https://hashscan.io/testnet/topic/' + topicId);

// ── 2. Create HTS fungible token ──────────────────────────────────────────────
console.log('\nCreating HTS fungible token (AGS)...');
const tokenTx = new TokenCreateTransaction()
  .setTokenName('AegisOS Demo Token')
  .setTokenSymbol('AGS')
  .setTokenType(TokenType.FungibleCommon)
  .setDecimals(2)
  .setInitialSupply(1_000_000)   // 10,000.00 AGS
  .setSupplyType(TokenSupplyType.Infinite)
  .setTreasuryAccountId(AccountId.fromString(OPERATOR_ID))
  .setAdminKey(operatorKey)
  .setSupplyKey(operatorKey)
  .freezeWith(client);

const signedTokenTx = await tokenTx.sign(operatorKey);
const tokenResponse = await signedTokenTx.execute(client);
const tokenReceipt = await tokenResponse.getReceipt(client);
const tokenId = tokenReceipt.tokenId.toString();

console.log('  HTS Token created:', tokenId);
console.log('  HashScan: https://hashscan.io/testnet/token/' + tokenId);

// ── 3. Update .env.local ──────────────────────────────────────────────────────
console.log('\nUpdating frontend/.env.local...');

let envContent = readFileSync(envPath, 'utf8');
envContent = envContent
  .replace(/^HEDERA_TOPIC_ID=.*$/m, `HEDERA_TOPIC_ID=${topicId}`)
  .replace(/^HEDERA_HTS_TOKEN_ID=.*$/m, `HEDERA_HTS_TOKEN_ID=${tokenId}`);

writeFileSync(envPath, envContent);
console.log('  HEDERA_TOPIC_ID=' + topicId);
console.log('  HEDERA_HTS_TOKEN_ID=' + tokenId);

// ── 4. Summary ────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────────');
console.log('Done! Add these to frontend/.env.local if not auto-updated:');
console.log(`  HEDERA_TOPIC_ID=${topicId}`);
console.log(`  HEDERA_HTS_TOKEN_ID=${tokenId}`);
console.log('──────────────────────────────────────────────');

client.close();
