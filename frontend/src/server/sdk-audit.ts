/**
 * AegisOS SDK Audit Module — Hedera "No Solidity Allowed" bounty
 *
 * Pure Hedera SDK implementation (zero Solidity / zero EVM):
 *   1. HCS receipts — every strategy approval/rejection is committed to a
 *      Hedera Consensus Service topic as a verifiable, immutable receipt.
 *   2. HTS loyalty points — users who complete successful runs receive
 *      AegisPoints (Hedera Token Service fungible token).
 *
 * Uses TWO native Hedera capabilities: HCS + HTS.
 * No smart contracts. No EVM. Only @hashgraph/sdk.
 *
 * Runs in full mock mode (no credentials needed) so the demo works
 * without a Hedera testnet account.
 */

const OPERATOR_ID  = process.env.HEDERA_OPERATOR_ID  || '';
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || '';
const MOCK_MODE    = !OPERATOR_ID || !OPERATOR_KEY;

// Persisted between calls inside this module process
let receiptTopicId: string | null = process.env.HEDERA_RECEIPT_TOPIC_ID || null;
let loyaltyTokenId: string | null = process.env.HEDERA_LOYALTY_TOKEN_ID || null;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SdkReceipt {
  receiptId: string;
  type: 'APPROVAL' | 'REJECTION' | 'EXECUTION';
  sessionId: string;
  planId: string;
  signerAddress?: string;
  timestamp: string;
  hcsTxId: string;       // HCS transaction ID (for HashScan)
  topicId: string;       // HCS topic ID
  hashScanUrl: string;   // direct HashScan link
}

export interface LoyaltyAward {
  recipient: string;     // Hedera account ID (0.0.xxxxx)
  points: number;        // AegisPoints awarded
  reason: string;
  tokenId: string;       // HTS token ID
  htsTxId: string;       // HTS transaction ID (for HashScan)
  hashScanUrl: string;
}

export interface SdkAuditResult {
  receipt: SdkReceipt;
  loyalty?: LoyaltyAward;
  mockMode: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadKey() {
  const { PrivateKey } = await import('@hashgraph/sdk');
  const raw = OPERATOR_KEY.replace(/^0x/, '');
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return PrivateKey.fromStringECDSA(raw);
  return PrivateKey.fromString(OPERATOR_KEY);
}

async function getClient() {
  const { Client, AccountId } = await import('@hashgraph/sdk');
  const key = await loadKey();
  return Client.forTestnet().setOperator(AccountId.fromString(OPERATOR_ID), key);
}

function hashScanTx(txId: string): string {
  if (txId.startsWith('mock')) return `https://hashscan.io/testnet/transaction/demo`;
  const encoded = txId.replace(/@/, '-').replace(/\./, '-');
  return `https://hashscan.io/testnet/transaction/${encoded}`;
}

// ─── HCS receipt topic ────────────────────────────────────────────────────────

async function getOrCreateReceiptTopic(): Promise<string> {
  if (receiptTopicId) return receiptTopicId;
  if (MOCK_MODE) {
    receiptTopicId = '0.0.mock-receipt-topic';
    return receiptTopicId;
  }

  try {
    const { TopicCreateTransaction, AccountId } = await import('@hashgraph/sdk');
    const client = await getClient();

    const tx = await new TopicCreateTransaction()
      .setTopicMemo('AegisOS SDK-only audit receipts')
      .execute(client);
    const receipt = await tx.getReceipt(client);
    receiptTopicId = receipt.topicId?.toString() ?? '0.0.0';
    return receiptTopicId;
  } catch {
    receiptTopicId = '0.0.mock-receipt-topic';
    return receiptTopicId;
  }
}

async function submitHcsMessage(message: string): Promise<string> {
  if (MOCK_MODE) {
    return `mock-hcs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  try {
    const { TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
    const client = await getClient();
    const topicId = await getOrCreateReceiptTopic();
    const msg = message.length > 1024 ? message.slice(0, 1020) + '...' : message;

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(msg)
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return tx.transactionId?.toString() ?? `hcs-${Date.now()}`;
  } catch (e) {
    console.error('[sdk-audit] HCS submit failed:', e);
    return `mock-hcs-${Date.now()}`;
  }
}

// ─── HTS loyalty token ────────────────────────────────────────────────────────

async function getOrCreateLoyaltyToken(): Promise<string> {
  if (loyaltyTokenId) return loyaltyTokenId;
  if (MOCK_MODE) {
    loyaltyTokenId = '0.0.mock-aegispoints';
    return loyaltyTokenId;
  }

  try {
    const { TokenCreateTransaction, TokenType, TokenSupplyType, AccountId } = await import('@hashgraph/sdk');
    const client = await getClient();
    const key = await loadKey();

    const tx = await new TokenCreateTransaction()
      .setTokenName('AegisPoints')
      .setTokenSymbol('AEGP')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(1_000_000)
      .setTreasuryAccountId(AccountId.fromString(OPERATOR_ID))
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(10_000_000)
      .setAdminKey(key)
      .setSupplyKey(key)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    loyaltyTokenId = receipt.tokenId?.toString() ?? '0.0.0';
    return loyaltyTokenId;
  } catch (e) {
    console.error('[sdk-audit] HTS token create failed:', e);
    loyaltyTokenId = '0.0.mock-aegispoints';
    return loyaltyTokenId;
  }
}

async function transferLoyaltyPoints(recipientId: string, points: number): Promise<string> {
  if (MOCK_MODE || !recipientId || recipientId === '0.0.0') {
    return `mock-hts-loyalty-${Date.now()}`;
  }

  try {
    const { TransferTransaction, AccountId, TokenId } = await import('@hashgraph/sdk');
    const client = await getClient();
    const tokenId = await getOrCreateLoyaltyToken();

    const tx = await new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(OPERATOR_ID), -points)
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(recipientId), points)
      .execute(client);

    await tx.getReceipt(client);
    return tx.transactionId?.toString() ?? `hts-${Date.now()}`;
  } catch (e) {
    console.error('[sdk-audit] HTS transfer failed:', e);
    return `mock-hts-loyalty-${Date.now()}`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a verifiable receipt on HCS for a strategy decision.
 * Optionally awards HTS loyalty points to the approving user.
 *
 * This is the core "No Solidity" demonstration:
 *   - HCS: immutable, ordered, timestamped receipt (native consensus)
 *   - HTS: fungible token transfer (native tokenisation)
 *   - No EVM, no Solidity, no contracts
 */
export async function createSdkReceipt(params: {
  type: 'APPROVAL' | 'REJECTION' | 'EXECUTION';
  sessionId: string;
  planId: string;
  signerAddress?: string;
  hederaRecipientId?: string;  // Hedera account to receive loyalty points (0.0.xxxxx)
  loyaltyPoints?: number;
}): Promise<SdkAuditResult> {
  const receiptId = `${params.sessionId}-${params.type}-${Date.now()}`;
  const timestamp = new Date().toISOString();

  // 1. Publish HCS receipt — native Hedera Consensus Service
  const receiptMessage = JSON.stringify({
    schema: 'aegisos-sdk-receipt-v1',
    receiptId,
    type: params.type,
    sessionId: params.sessionId,
    planId: params.planId,
    signerAddress: params.signerAddress ?? 'anonymous',
    timestamp,
    network: 'hedera-testnet',
  });

  const hcsTxId = await submitHcsMessage(receiptMessage);
  const topicId = await getOrCreateReceiptTopic();

  const receipt: SdkReceipt = {
    receiptId,
    type: params.type,
    sessionId: params.sessionId,
    planId: params.planId,
    signerAddress: params.signerAddress,
    timestamp,
    hcsTxId,
    topicId,
    hashScanUrl: hashScanTx(hcsTxId),
  };

  let loyalty: LoyaltyAward | undefined;

  // 2. Award HTS loyalty points on successful execution — native Hedera Token Service
  if (params.type === 'EXECUTION' && params.loyaltyPoints && params.loyaltyPoints > 0) {
    const points = params.loyaltyPoints;
    const recipientId = params.hederaRecipientId ?? OPERATOR_ID;
    const tokenId = await getOrCreateLoyaltyToken();
    const htsTxId = await transferLoyaltyPoints(recipientId, points);

    loyalty = {
      recipient: recipientId,
      points,
      reason: `Completed AegisOS run: session ${params.sessionId}`,
      tokenId,
      htsTxId,
      hashScanUrl: hashScanTx(htsTxId),
    };
  }

  return { receipt, loyalty, mockMode: MOCK_MODE };
}

/**
 * Returns the current loyalty token info (for display in UI).
 */
export async function getLoyaltyTokenInfo(): Promise<{
  tokenId: string;
  name: string;
  symbol: string;
  network: string;
  mockMode: boolean;
}> {
  const tokenId = await getOrCreateLoyaltyToken();
  return {
    tokenId,
    name: 'AegisPoints',
    symbol: 'AEGP',
    network: 'hedera-testnet',
    mockMode: MOCK_MODE,
  };
}

/**
 * Returns the receipt topic info (for HashScan replay).
 */
export async function getReceiptTopicInfo(): Promise<{
  topicId: string;
  hashScanUrl: string;
  mockMode: boolean;
}> {
  const topicId = await getOrCreateReceiptTopic();
  return {
    topicId,
    hashScanUrl: `https://hashscan.io/testnet/topic/${topicId}`,
    mockMode: MOCK_MODE,
  };
}
