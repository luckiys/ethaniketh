# AegisOS — ETHDenver 2026 Bounty Map

> **Single narrative:** AegisOS is an AI-native DeFi risk operating system where autonomous agents
> monitor portfolios, propose rebalancing strategies, and execute approved plans — with every decision
> verified on Hedera, every agent identity secured as an iNFT on 0G, and every action scheduled
> through Hedera's native infrastructure. All services are free to run (testnet + faucets).

---

## Architecture Overview

```
User Portfolio + Goal
        ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      AegisOS Agent Pipeline                          │
│                                                                      │
│  [Watcher Agent]──→[Strategist Agent]──→[Executor Agent]            │
│   iNFT#1 (0G)        iNFT#2 (0G)         iNFT#3 (0G)              │
│   reputation⭐        brain on 0G         schedules on-chain         │
└──────────────────────────────────────────────────────────────────────┘
         ↓                   ↓                    ↓
  HCS Attestations    0G DeFAI Storage    Schedule Service
  (audit trail)       (risk reports)      (on-chain exec)
         ↓                                        ↓
  SDK Audit Module                      AegisScheduler.sol
  HCS receipts +                        (contract-driven)
  HTS loyalty pts
  (no Solidity)
         ↓
   HashScan Links
```

---

## Bounty 1 — Hedera: Killer App for the Agentic Society ($10,000)

| Item | Value |
|------|-------|
| **Prize** | $10,000 (1 winner) |
| **Sponsor** | Hedera / OpenClaw |
| **Status** | ✅ Implemented |
| **Free?** | Yes — Hedera Testnet (portal.hedera.com, no credit card) |

### What we built
- 3-agent autonomous pipeline (Watcher → Strategist → Executor) with iNFT identities
- Agents earn reputation scores via HCS attestations (on-chain audit)
- Agent prediction market: watcher predicts strategy outcome, scored post-execution
- HTS micro-payments between agents for inter-agent service exchange
- Human-in-the-loop approval via EIP-712 signature — agents cannot act autonomously
- Agent reputation visible in dashboard with trust indicators

### Files changed / added
| File | Purpose |
|------|---------|
| `frontend/src/server/agent-economy.ts` | Agent reputation scoring + prediction market |
| `frontend/src/app/api/agent-reputation/route.ts` | API: agent reputation state |
| `frontend/src/app/api/agent-market/route.ts` | API: prediction market outcomes |
| `frontend/src/components/AgentReputation.tsx` | UI: agent reputation badges |
| `frontend/src/server/hedera.ts` | HCS/HTS (existing, enhanced) |
| `frontend/src/server/og-inft.ts` | iNFT minting (existing, enhanced) |
| `frontend/src/server/orchestrator.ts` | Session orchestration (existing) |

### Demo steps
1. `cd frontend && npm run dev`
2. Open http://localhost:3000
3. Connect wallet or click "Demo Mode"
4. Click "Start Run" → enter goal + holdings → see 3 agents activate with iNFT IDs
5. Navigate to http://localhost:3000/app → see agent reputation badges
6. GET `/api/agent-reputation` → see on-chain reputation scores
7. After a run completes → GET `/api/agent-market` → see prediction outcome logged to HCS

### Judge checklist
- [ ] Agents have on-chain iNFT identities (0G + Hedera HTS NFT)
- [ ] Agent flow visible in UI (IDLE → WATCHING → PROPOSED → AWAITING_APPROVAL → EXECUTED)
- [ ] Reputation/trust indicators in dashboard
- [ ] HCS attestations for every agent action
- [ ] HTS tokens used for agent identity + optional micro-payments

---

## Bounty 2 — Hedera: On-Chain Automation with Schedule Service ($5,000)

| Item | Value |
|------|-------|
| **Prize** | $5,000 (2 winners: $3k + $2k) |
| **Sponsor** | Hedera |
| **Status** | ✅ Implemented |
| **Free?** | Yes — Hedera Testnet |

### What we built
- `AegisScheduler.sol` creates scheduled token transfers via Hedera Schedule Service precompile
- Schedule lifecycle tracking: CREATED → PENDING → EXECUTED / FAILED
- Edge case handling: insufficient balance, expired schedules, already-scheduled detection
- Schedule status API with HashScan explorer links
- UI component showing schedule lifecycle with transaction links

### Files changed / added
| File | Purpose |
|------|---------|
| `contracts/contracts/AegisScheduler.sol` | Smart contract with Schedule Service precompile |
| `frontend/src/server/schedule-tracker.ts` | Schedule lifecycle tracking |
| `frontend/src/app/api/schedule-status/route.ts` | API: schedule lifecycle state |
| `frontend/src/components/ScheduleLifecycle.tsx` | UI: lifecycle visualization |
| `frontend/src/server/agents/executor.ts` | Calls scheduler (existing, enhanced) |

### Demo steps
1. `cd contracts && npx hardhat run scripts/deploy.ts --network hederaTestnet`
2. Set `AEGIS_SCHEDULER_ADDRESS` in `frontend/.env.local`
3. Run a session → approve plan → see schedule created in executor
4. GET `/api/schedule-status?planHash=<hash>` → see lifecycle state
5. See HashScan link: `https://hashscan.io/testnet/transaction/<txId>`

### Judge checklist
- [ ] Scheduling initiated from smart contract (`AegisScheduler.sol`)
- [ ] Schedule lifecycle visible: CREATED → PENDING → EXECUTED
- [ ] Edge cases handled: expired schedule, already-scheduled detection
- [ ] HashScan links in UI for all scheduled transactions
- [ ] No off-chain cron jobs — 100% contract-driven

---

## Bounty 3 — 0G Labs: Best DeFAI Application ($7,000)

| Item | Value |
|------|-------|
| **Prize** | $7,000 (2 winners: $5k + $2k) |
| **Sponsor** | 0G Labs |
| **Status** | ✅ Implemented |
| **Free?** | Yes — 0G faucet at https://faucet.0g.ai |

### What we built
- AI-driven DeFi risk analysis pipeline (3 agents)
- Pre-execution simulation: portfolio before/after comparison
- AI reasoning: "why" behind every recommendation (Gemini free tier)
- Risk scoring across 5 dimensions with visual breakdown
- Clear user confirmation before any transaction (human-in-the-loop)
- 0G Storage for decentralized audit trail of every strategy and execution record
- DeFAI simulation API for preview without execution

### Files changed / added
| File | Purpose |
|------|---------|
| `frontend/src/server/zerog.ts` | 0G Storage uploads (existing) |
| `frontend/src/server/defi-sim.ts` | Portfolio simulation pre-execution |
| `frontend/src/app/api/defi-sim/route.ts` | API: simulation preview |
| `frontend/src/server/agents/strategist.ts` | AI risk scoring (existing) |
| `frontend/src/app/api/explain-strategy/route.ts` | AI explanation endpoint |

### Demo steps
1. `cd frontend && npm run dev`
2. Enter portfolio: ETH 60%, BTC 30%, SOL 10%, goal "Balanced"
3. POST `/api/defi-sim` → see before/after simulation with risk impact
4. AI generates risk reasoning → visible in approval modal
5. Approve plan → execution record stored to 0G Storage
6. 0G CID visible in event log → verifiable at https://explorer.0g.ai

### Judge checklist
- [ ] DeFi workflow with AI-driven planning (not just chat)
- [ ] Pre-execution simulation with risk preview
- [ ] "Why" explanation for every recommendation
- [ ] User confirmation required before any transaction
- [ ] 0G Storage used for audit trail (verifiable CID in UI)

---

## Bounty 4 — 0G Labs: Best Use of On-Chain Agent (iNFT) ($7,000)

| Item | Value |
|------|-------|
| **Prize** | $7,000 (2 winners: $5k + $2k) |
| **Sponsor** | 0G Labs |
| **Status** | ✅ Implemented |
| **Free?** | Yes — 0G faucet + Hedera testnet |

### What we built
- Each AegisOS agent (Watcher, Strategist, Executor) has an on-chain iNFT identity
- Brain JSON uploaded to 0G Storage → Merkle root CID becomes NFT metadata URI
- Hedera HTS NFT minted with metadata = `0g://<CID>` (verifiable provenance)
- Agent profile page showing: owner, capabilities, brain CID, last action
- Agent action demo: strategist agent triggers strategy via NFT ownership check
- iNFT brain updated each run (new 0G upload per session)

### Files changed / added
| File | Purpose |
|------|---------|
| `frontend/src/server/og-inft.ts` | iNFT brain upload + NFT minting (existing) |
| `frontend/src/server/zerog.ts` | 0G Storage SDK (existing) |
| `frontend/src/server/hedera-nft.ts` | Hedera HTS NFT minting (existing) |
| `frontend/src/app/api/agent-profile/route.ts` | API: agent iNFT profile |
| `frontend/src/components/AgentProfileCard.tsx` | UI: agent identity card |

### Demo steps
1. `cd frontend && npm run dev`
2. Start a session → 3 iNFTs minted (visible in event log)
3. GET `/api/agent-profile?agentId=strategist` → see agent profile with 0G CID
4. See `0g://<hash>` metadata URI in response
5. Optional: verify CID on 0G explorer (https://explorer.0g.ai)

### Judge checklist
- [ ] iNFT minted on-chain with 0G brain URI
- [ ] Agent profile shows: capabilities, brain CID, NFT ID
- [ ] Agent action triggers workflow (strategy execution)
- [ ] Access controls: user must approve before agent acts
- [ ] Open-source, documented

---

## Bounty 5 — Hedera: "No Solidity Allowed" — SDK Only ($5,000)

| Item | Value |
|------|-------|
| **Prize** | $5,000 (3 winners: $2.5k + $1.5k + $1k) |
| **Sponsor** | Hedera |
| **Status** | ✅ Implemented |
| **Free?** | Yes — Hedera Testnet |

### What we built
- Pure Hedera SDK module (zero Solidity/EVM): `sdk-audit.ts`
- **HCS receipts**: every strategy approval/rejection is committed to HCS as a verifiable receipt
- **HTS loyalty points**: users who complete successful runs receive AegisPoints (HTS fungible token)
- Multi-user audit trail: any observer can replay the HCS topic to verify all decisions
- SDK-only API: `/api/sdk-receipt` — creates HCS receipt + issues HTS loyalty points
- Clear security model: operator key handles HTS; user key only needed for approvals

### Files changed / added
| File | Purpose |
|------|---------|
| `frontend/src/server/sdk-audit.ts` | Pure Hedera SDK: HCS receipts + HTS loyalty |
| `frontend/src/app/api/sdk-receipt/route.ts` | API: create SDK-only receipt + loyalty |
| `frontend/src/components/SdkAuditLog.tsx` | UI: SDK audit trail viewer |

### Demo steps
1. `cd frontend && npm run dev`
2. Complete a session (approve plan)
3. POST `/api/sdk-receipt` → HCS receipt committed, HTS loyalty points issued
4. Response includes HashScan links for both transactions
5. GET `/api/sdk-receipt?topicId=<id>` → replay HCS audit trail

### Judge checklist
- [ ] Zero Solidity/EVM — pure @hashgraph/sdk only
- [ ] Two Hedera native capabilities: HCS + HTS
- [ ] Coherent user journey (not a hello world)
- [ ] Audit trail verifiable via HashScan
- [ ] Security model documented (key handling, permissions)

---

## Shared Modules

| Module | Used by Bounties |
|--------|-----------------|
| `frontend/src/server/hedera.ts` | 1, 2, 5 (HCS + HTS operations) |
| `frontend/src/server/zerog.ts` | 3, 4 (0G Storage uploads) |
| `frontend/src/server/og-inft.ts` | 1, 4 (iNFT brain + minting) |
| `frontend/src/server/orchestrator.ts` | All (session state machine) |
| `frontend/src/server/events.ts` | All (event stream) |
| `shared/src/types.ts` | All (TypeScript types) |

## Running the Full Demo

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Copy env template (works in mock mode — no keys needed for demo)
cp .env.local.example .env.local

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3000

# 5. Run full demo script
cd .. && bash scripts/demo.sh
```

## Faucets & Free Resources

| Service | URL | Cost |
|---------|-----|------|
| Hedera Testnet | https://portal.hedera.com | Free |
| 0G Storage Testnet | https://faucet.0g.ai | Free |
| Gemini AI | https://aistudio.google.com | Free tier |
| WalletConnect | https://cloud.walletconnect.com | Free |
| Alchemy RPC | https://alchemy.com | Free 300M CU/mo |
