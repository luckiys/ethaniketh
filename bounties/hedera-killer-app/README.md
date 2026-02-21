# Bounty: Hedera Killer App for the Agentic Society

**Sponsor:** Hedera / OpenClaw
**Prize:** $10,000 (1 winner)
**Bounty slug:** `hedera-killer-app`

## What We Built

AegisOS demonstrates an **agentic society** where autonomous AI agents:

1. **Discover each other** via on-chain iNFT identities (0G Storage + Hedera HTS)
2. **Coordinate** using a 3-step pipeline: Watcher → Strategist → Executor
3. **Transact** using Hedera HTS tokens for agent identity and loyalty rewards
4. **Attest** every action on Hedera Consensus Service (immutable audit trail)
5. **Earn reputation** based on prediction accuracy (prediction market, settled on HCS)
6. **Humans stay in control** — no autonomous transactions without EIP-712 approval

### Agent Economy Features

- **Agent Reputation System**: Each agent earns a trust score (0-100) attested on HCS
  - Watcher: prediction accuracy for market conditions
  - Strategist: risk recommendation accuracy
  - Executor: execution success rate
- **Prediction Market**: Watcher agent "bets" on strategy outcome; settled on-chain via HCS
- **Trust Badges**: Bronze / Silver / Gold / Platinum levels (ERC-8004 style)
- **HTS Micro-payments**: Simulated agent-to-agent value exchange for service fees

## How to Run

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Configure (all optional — runs in mock mode)
cp .env.local.example .env.local
# Fill in HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY for live mode
# Get free testnet account: https://portal.hedera.com

# 3. Start server
npm run dev

# 4. Open dashboard
open http://localhost:3000/app
```

## Demo Flow

1. Open http://localhost:3000 — see landing page
2. Click "Launch AegisOS" → http://localhost:3000/app
3. See 3 agent cards with reputation badges (Bronze/Silver/Gold/Platinum)
4. Click "Start Run" → enter portfolio + goal
5. Watch agent pipeline: WATCH → PROPOSE → AWAITING_APPROVAL
6. See iNFT IDs in event log (minted at session start)
7. See agent reputation scores update after run

### API Endpoints (for judges)

```bash
# All agent reputation scores
curl http://localhost:3000/api/agent-reputation

# Single agent reputation
curl http://localhost:3000/api/agent-reputation?agentId=strategist

# Agent prediction market
curl -X POST http://localhost:3000/api/agent-market \
  -H "Content-Type: application/json" \
  -d '{"action":"record","sessionId":"test-123","agentId":"watcher","prediction":"reduce risk","stakeAmount":10}'

# Settle prediction
curl -X POST http://localhost:3000/api/agent-market \
  -H "Content-Type: application/json" \
  -d '{"action":"settle","sessionId":"test-123","actualOutcome":"risk reduced by 12 points"}'

# View all agent iNFT profiles
curl http://localhost:3000/api/agent-profile
```

## What Judges Will See

- Dashboard with 3 agent cards, each showing:
  - Agent name + role
  - Trust badge (Bronze/Silver/Gold/Platinum)
  - Reputation score + accuracy %
  - iNFT ID linking to Hedera HTS NFT
  - HCS topic link for attestations
- Real-time event log showing WATCH → PROPOSE → APPROVE → EXECUTE
- HashScan links for HCS attestations

## Files

| File | Description |
|------|-------------|
| `frontend/src/server/agent-economy.ts` | Reputation scoring + prediction market |
| `frontend/src/app/api/agent-reputation/route.ts` | Reputation API |
| `frontend/src/app/api/agent-market/route.ts` | Prediction market API |
| `frontend/src/app/api/agent-profile/route.ts` | iNFT profile API |
| `frontend/src/server/og-inft.ts` | iNFT brain upload + minting |
| `frontend/src/server/hedera.ts` | HCS + HTS SDK operations |

## Cost

**Zero** — Hedera Testnet is free. Get account at https://portal.hedera.com
