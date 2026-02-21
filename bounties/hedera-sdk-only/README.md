# Bounty: Hedera "No Solidity Allowed" — SDK Only

**Sponsor:** Hedera
**Prize:** $5,000 (3 winners: $2,500 + $1,500 + $1,000)
**Bounty slug:** `hedera-sdk-only`

## What We Built

A **pure Hedera SDK audit system** — zero Solidity, zero EVM — using two native Hedera capabilities:

| Capability | Usage | Why |
|-----------|-------|-----|
| **HCS (Hedera Consensus Service)** | Immutable strategy receipts | Ordered, timestamped, verifiable commitment of every decision |
| **HTS (Hedera Token Service)** | AegisPoints loyalty token | Fungible token issued to users who complete successful runs |

This is not a "hello world". It's a coherent end-to-end user journey:
1. User enters portfolio + goal
2. AI agents analyze and propose strategy
3. User approves (or rejects) via EIP-712 signature
4. **SDK module**: HCS receipt committed + AegisPoints issued (no contracts)
5. User sees HashScan links for both transactions

### Security Model

- **Key handling**: Operator key never leaves the server; only used for HCS/HTS operations
- **Permissions**: Operator key controls HCS topic + HTS token treasury
- **Least privilege**: SDK module has read/write to one HCS topic and one HTS token only
- **User custody**: Users hold their own wallet keys; AegisPoints go to their Hedera account

## How to Run

```bash
# Works in full mock mode (no credentials needed)
cd frontend && npm install && npm run dev

# For live HCS + HTS: get free account at https://portal.hedera.com
echo "HEDERA_OPERATOR_ID=0.0.xxxxx" >> .env.local
echo "HEDERA_OPERATOR_KEY=302e020100300506..." >> .env.local
```

## Demo Flow

### Check module info
```bash
curl http://localhost:3000/api/sdk-receipt
# Returns:
# {
#   "bounty": "Hedera: No Solidity Allowed",
#   "nativeCaps": ["HCS (Hedera Consensus Service)", "HTS (Hedera Token Service)"],
#   "loyaltyToken": { "tokenId": "0.0.xxxxx", "name": "AegisPoints", "symbol": "AEGP" },
#   "receiptTopic": { "topicId": "0.0.xxxxx", "hashScanUrl": "https://hashscan.io/..." }
# }
```

### Create an approval receipt
```bash
curl -X POST http://localhost:3000/api/sdk-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "APPROVAL",
    "sessionId": "sess-abc123",
    "planId": "plan-xyz789",
    "signerAddress": "0xabcd..."
  }'
# Response:
# {
#   "receipt": {
#     "receiptId": "sess-abc123-APPROVAL-...",
#     "type": "APPROVAL",
#     "hcsTxId": "0.0.xxx@...",
#     "topicId": "0.0.xxx",
#     "hashScanUrl": "https://hashscan.io/testnet/transaction/..."
#   },
#   "mockMode": false  (if credentials configured)
# }
```

### Create execution receipt + award loyalty points
```bash
curl -X POST http://localhost:3000/api/sdk-receipt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EXECUTION",
    "sessionId": "sess-abc123",
    "planId": "plan-xyz789",
    "hederaRecipientId": "0.0.67890",
    "loyaltyPoints": 100
  }'
# Response:
# {
#   "receipt": { "hcsTxId": "...", "hashScanUrl": "https://hashscan.io/..." },
#   "loyalty": {
#     "recipient": "0.0.67890",
#     "points": 100,
#     "tokenId": "0.0.xxxxx",
#     "htsTxId": "0.0.xxx@...",
#     "hashScanUrl": "https://hashscan.io/testnet/transaction/..."
#   }
# }
```

## Files

| File | Description |
|------|-------------|
| `frontend/src/server/sdk-audit.ts` | Core SDK-only module (HCS + HTS, no Solidity) |
| `frontend/src/app/api/sdk-receipt/route.ts` | SDK receipt API |

## Implementation Highlights

```typescript
// Pure Hedera SDK — no contracts, no EVM
import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { TokenCreateTransaction, TokenType, TransferTransaction } from '@hashgraph/sdk';

// 1. HCS: Create receipt topic (once)
const topicTx = await new TopicCreateTransaction()
  .setTopicMemo('AegisOS SDK-only audit receipts')
  .execute(client);

// 2. HCS: Commit receipt message
const msgTx = await new TopicMessageSubmitTransaction()
  .setTopicId(topicId)
  .setMessage(JSON.stringify(receipt))
  .execute(client);

// 3. HTS: Create loyalty token (once)
const tokenTx = await new TokenCreateTransaction()
  .setTokenName('AegisPoints')
  .setTokenSymbol('AEGP')
  .setTokenType(TokenType.FungibleCommon)
  .execute(client);

// 4. HTS: Transfer loyalty points
const transferTx = await new TransferTransaction()
  .addTokenTransfer(tokenId, treasury, -points)
  .addTokenTransfer(tokenId, recipient, points)
  .execute(client);
```

## Verification

All transactions verifiable on HashScan:
- HCS receipts: `https://hashscan.io/testnet/topic/<topicId>`
- HTS transfers: `https://hashscan.io/testnet/transaction/<txId>`
- AegisPoints token: `https://hashscan.io/testnet/token/<tokenId>`

## Cost

**Zero** — Hedera Testnet is free. Get account at https://portal.hedera.com
No mainnet funds required.
