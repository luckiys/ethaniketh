# Bounty: Kite AI — Agent-Native Payments & Identity (x402)

**Sponsor:** Kite AI
**Prize:** $10,000 (1st: $5,000 · 2nd: $3,000 · 3rd: $2,000)
**Bounty slug:** `kite-ai-x402`

## What We Built

Mudra agents are **autonomous economic actors** — they earn work, pay for compute, and build on-chain reputation. Using the **x402 payment protocol** on Kite AI Testnet, each agent pays for every service it uses from its own wallet.

### x402 Protocol Flow

```
Mudra agent needs market data
        ↓
POST /api/kite-pay { service: "market-data", step: "request" }
        ↓
402 Payment Required ← server returns payment details (price, recipient, nonce)
        ↓
Agent calls payForService() → native token transfer on Kite AI (chainId: 2368)
        ↓
Transaction confirmed on-chain → proof returned
        ↓
Service data delivered to agent
```

### Agent Services + Prices

| Service | Price | What Agent Pays For |
|---------|-------|---------------------|
| `market-data` | 0.001000 KITE | CoinGecko BTC/ETH/SOL prices |
| `sentiment-data` | 0.000500 KITE | Fear & Greed index |
| `ai-reasoning` | 0.005000 KITE | Gemini LLM call for risk narrative |
| `risk-analysis` | 0.002000 KITE | Strategist agent full risk run |
| `watcher-signal` | 0.001500 KITE | Watcher market regime signal |

### Agent Identity

Every Mudra agent has a **Kite AI wallet address** derived from its private key. In mock mode a deterministic address is used. The agent's identity is:
- **Address**: Kite AI testnet EOA (`0xAeg1sOS...`)
- **Balance**: Checked live from Kite AI RPC at `https://rpc-testnet.gokite.ai/`
- **Ledger**: In-memory log of all payments with tx hashes + explorer links

## How to Run

```bash
# Works fully in mock mode — no credentials needed
cd frontend && npm install && npm run dev

# For live Kite AI payments: fund agent wallet
# 1. Get testnet KITE from https://faucet.gokite.ai
# 2. Set private key
echo "KITE_AGENT_PRIVATE_KEY=0x..." >> .env.local
```

## Demo Flow

```bash
# 1. Check agent identity + balance
curl http://localhost:3000/api/kite-agent
# Returns: agent address, KITE balance, payment ledger, service prices

# 2. x402 flow — step 1: get payment request (returns 402)
curl -X POST http://localhost:3000/api/kite-pay \
  -H "Content-Type: application/json" \
  -d '{"service": "market-data", "step": "request"}'
# Returns: 402 Payment Required + paymentRequest object

# 3. x402 flow — step 2: pay and receive service data
curl -X POST http://localhost:3000/api/kite-pay \
  -H "Content-Type: application/json" \
  -d '{"service": "market-data", "step": "pay"}'
# Returns: payment proof (txHash + explorerUrl) + market data

# 4. Pay for AI reasoning
curl -X POST http://localhost:3000/api/kite-pay \
  -H "Content-Type: application/json" \
  -d '{"service": "ai-reasoning", "step": "pay"}'
# Returns: Gemini reasoning + 0.005 KITE payment proof

# 5. View full ledger
curl http://localhost:3000/api/kite-pay
# Returns: total spent, all transactions, per-service prices
```

## Files

| File | Description |
|------|-------------|
| `frontend/src/server/kite-payment.ts` | Core x402 module: wallet, payment flow, ledger |
| `frontend/src/app/api/kite-agent/route.ts` | Agent identity + balance API |
| `frontend/src/app/api/kite-pay/route.ts` | x402 payment flow API (request → pay → verify) |

## Implementation Highlights

```typescript
// x402: Agent pays for compute, receives service data
const proof = await payForService('ai-reasoning', RECIPIENT);
// → { txHash: "0x...", from: "0xAgent...", value: "5000000000000000", explorerUrl: "https://testnet.kitescan.ai/tx/..." }

// On-chain verification
const { valid } = await verifyPayment(proof.txHash, RECIPIENT, SERVICE_PRICES['ai-reasoning']);
// → { valid: true }

// Agent wallet balance
const balance = await getAgentBalance();
// → { kite: "0.010", wei: "10000000000000000", mockMode: false }
```

## Network Details

| Property | Value |
|----------|-------|
| Chain ID | 2368 |
| RPC | https://rpc-testnet.gokite.ai/ |
| Explorer | https://testnet.kitescan.ai |
| Faucet | https://faucet.gokite.ai |
| Token | KITE (native) |

## Cost

**Zero** — Kite AI Testnet is free. Get tokens at https://faucet.gokite.ai
No mainnet funds required.
