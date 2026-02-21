# Bounty: 0G Labs — Best DeFAI Application

**Sponsor:** 0G Labs
**Prize:** $7,000 (2 winners: $5,000 + $2,000)
**Bounty slug:** `zerog-defai`

## What We Built

Mudra is a **DeFAI (Decentralized Finance + AI)** operating system where:

1. **AI does more than chat** — it produces structured decisions with risk scores, action plans, and constraint checks
2. **Users stay in control** — no transaction without explicit EIP-712 approval
3. **0G Storage** holds the decentralized audit trail — every strategy, brain snapshot, and execution record is stored on 0G

### AI Components

| Component | What AI Does | Output Format |
|-----------|-------------|---------------|
| Watcher Agent | Classifies market regime (bull/bear/volatile), detects alerts | Structured `WatchSignal` JSON |
| Strategist Agent | Scores risk across 5 dimensions, generates ranked plans | Structured `StrategyPlan` JSON |
| Goal Parser | Parses natural language goal → risk profile | Enum: conservative/balanced/aggressive/yield |
| DeFAI Simulator | Pre-execution simulation with before/after projections | `SimulationResult` with confidence score |

### 0G Storage Usage

| Data | 0G Content | CID Format |
|------|-----------|------------|
| Agent brain snapshots | JSON identity + capabilities | `0g://0x<merkleRoot>` |
| Strategy brains | Risk scores + reasoning | `0g://0x<merkleRoot>` |
| Execution records | Plan + actions + tx IDs | `0g://0x<merkleRoot>` |
| Simulation results | Before/after portfolio state | `0g://0x<merkleRoot>` |

### User Safety Features (Required by Bounty)

- ✅ **Confirmations**: EIP-712 wallet signature required before any action
- ✅ **Limits**: Risk score threshold, position size limits, expiry on plans
- ✅ **Explainability**: LLM generates human-readable "why" for every recommendation
- ✅ **Simulation**: DeFAI sim API shows projected outcome before execution
- ✅ **User override**: User can reject any plan; agents cannot act autonomously

## How to Run

```bash
# 1. Start frontend (works without credentials)
cd frontend && npm install && npm run dev

# 2. Optional: configure 0G for real uploads
# Get private key funded at https://faucet.0g.ai
echo "ZEROG_PRIVATE_KEY=0x..." >> .env.local

# 3. Optional: Gemini AI for real LLM reasoning
echo "GEMINI_API_KEY=..." >> .env.local
# Free key at https://aistudio.google.com
```

## Demo Flow

```bash
# 1. Run DeFAI simulation (no execution, safe preview)
curl -X POST http://localhost:3000/api/defi-sim \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session",
    "planId": "demo-plan",
    "holdings": [
      {"token": "ETH", "weight": 0.60, "value": 6000},
      {"token": "BTC", "weight": 0.30, "value": 3000},
      {"token": "SOL", "weight": 0.10, "value": 1000}
    ],
    "actions": [
      {"type": "REDUCE", "token": "SOL", "amount": 0.05},
      {"type": "INCREASE", "token": "BTC", "amount": 0.05}
    ]
  }'

# Response shows:
# - before: { riskScore: 72, diversification: 0.58 }
# - after: { riskScore: 68, diversification: 0.62 }
# - netRiskChange: -4
# - storageId: "0x<0G CID>"
# - aiReasoning: "Simulation projects risk to decrease by 4 points..."
```

### Full UI Demo

1. Open http://localhost:3000
2. Click "Launch Mudra"
3. Connect wallet (or demo mode)
4. Enter portfolio: ETH 60%, BTC 30%, SOL 10%
5. Goal: "Balanced portfolio, reduce single-asset exposure"
6. Click "Start Analysis"
7. See Watcher report → AI risk analysis → Strategy proposal
8. See DeFAI simulation in approval modal (before/after)
9. Approve or reject — no transaction without your signature

## Files

| File | Description |
|------|-------------|
| `frontend/src/server/zerog.ts` | 0G Storage SDK uploads |
| `frontend/src/server/defi-sim.ts` | Pre-execution simulation engine |
| `frontend/src/app/api/defi-sim/route.ts` | Simulation API |
| `frontend/src/server/agents/watcher.ts` | Market analysis agent |
| `frontend/src/server/agents/strategist.ts` | AI risk scoring + planning |
| `frontend/src/app/api/explain-strategy/route.ts` | AI explanation endpoint |
| `frontend/src/server/og-inft.ts` | 0G brain archival |
| `frontend/src/server/orchestrator.ts` | Stores execution records to 0G |

## 0G Integration Depth

```
Session start  → mintAgentNfts() → uploadToZeroG(brainPayload) × 3
Strategy gen   → archiveStrategyBrain() → uploadToZeroG(strategyPayload)
DeFAI sim      → simulateStrategy() → uploadToZeroG(simulationResult)
Execution      → storeExecutedPlanToZeroG() → uploadToZeroG(executionRecord)
```

Every 0G CID is displayed in the event log and verifiable at:
https://explorer.0g.ai/mainnet/home

## Cost

**Zero** — 0G testnet is free. Get tokens at https://faucet.0g.ai
Gemini AI is free (https://aistudio.google.com) — no credit card.
