# Mudra — AI-native DeFi risk OS

**AI advises. Humans decide. Blockchain verifies.**

> **Live demo:** [Add your Vercel URL here]  
> **Demo video:** [Add link to 2–3 min walkthrough]

A 3-agent operating system that monitors your DeFi portfolio in real time,
proposes risk-adjusted strategies, and executes only after a signed human
approval. Every recommendation and execution step is logged immutably to
Hedera Consensus Service and optionally executed via Hedera Token Service
and the Hedera Schedule Service smart contract.

---

## Quick start

```bash
# 1. Install + build shared types
cd shared && npm install && npm run build && cd ..

# 2. Install frontend (includes server-side agents)
cd frontend && npm install

# 3. Configure environment (all fields optional — blank = demo/mock mode)
cp frontend/.env.local.example frontend/.env.local
# edit frontend/.env.local with your keys

# 4. Start dev server
npm run dev   # from repo root
# or
cd frontend && npm run dev
```

**App:** http://localhost:3000

---

## Environment variables

All config lives in `frontend/.env.local`.
Copy `frontend/.env.local.example` and fill in as needed.
**All fields are optional** — leaving them blank enables fully-mocked demo mode with no real API keys required.

### Hedera

| Variable | Description |
|---|---|
| `HEDERA_OPERATOR_ID` | Account ID (e.g. `0.0.12345`). Create free at [portal.hedera.com](https://portal.hedera.com) |
| `HEDERA_OPERATOR_KEY` | ED25519 private key (`302e...`) from the same portal account |
| `HEDERA_TOPIC_ID` | HCS topic ID — auto-created on first run if blank |
| `HEDERA_HTS_TOKEN_ID` | Fungible token for rebalance transfers (`0.0.0` = simulated) |
| `HEDERA_DEMO_TO_ACCOUNT` | Destination account for demo HTS transfers |
| `HEDERA_NFT_TOKEN_ID` | iNFT collection token ID — auto-created on first run if blank |
| `HEDERA_EVM_DEPLOYER_KEY` | **ECDSA** hex private key for EVM contract calls + Hardhat deploy |
| `AEGIS_SCHEDULER_ADDRESS` | `AegisScheduler.sol` address after deploy (see Contract section) |

### 0g Labs (DeFAI bounty)

| Variable | Description |
|---|---|
| `ZEROG_PRIVATE_KEY` | EVM private key for 0g testnet wallet. Fund at [faucet.0g.ai](https://faucet.0g.ai) |

Without this key, agent brain uploads use a deterministic SHA-256 mock CID. With it, strategy brains and executed plans are stored on 0G Storage for a decentralized audit trail.

### WalletConnect

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Free project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com). The built-in demo ID works on localhost. |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Free key at [alchemy.com](https://alchemy.com) — 300M CU/month, more reliable RPC. |
| `VAR_SERVICE_URL` | Python GARCH/VaR service (optional). Default: `http://localhost:5001` |
| `PORTFOLIO_SERVICE_URL` | Python PyPortfolioOpt service (optional). Default: `http://localhost:5002` |
| `FRED_API_KEY` | Free key at [fred.stlouisfed.org](https://fred.stlouisfed.org) — VIX, macro regime. |

---

## Architecture

```
User goal + holdings
       │
       ▼
 ┌─────────────────┐   CoinGecko prices    ┌──────────────────────┐
 │   Watcher       │──────────────────────▶│  0g Storage          │
 │  (risk signals) │   Fear & Greed index  │  (agent brain JSON)  │
 └────────┬────────┘                       └──────────────────────┘
          │ WatchSignal                            ▲
          ▼                                        │ uploadToZeroG()
 ┌─────────────────┐  goal-aware risk score        │
 │   Strategist    │───────────────────────────────┘
 │  (risk model)   │
 └────────┬────────┘
          │ StrategyPlan + EIP-712 approval
          ▼
 ┌─────────────────┐
 │    Human        │  signs in wallet (MetaMask / Phantom / WalletConnect)
 └────────┬────────┘
          │ SignedApproval
          ▼
 ┌─────────────────┐   HTS transfer     ┌──────────────────────┐
 │   Executor      │──────────────────▶ │  Hedera Token Service│
 │  (execution)    │                    └──────────────────────┘
 └────────┬────────┘
          │ scheduleRebalance()
          ▼
 ┌──────────────────────────────────────────────────────────┐
 │  AegisScheduler.sol  (Hedera EVM Testnet)                │
 │  Calls Hedera Schedule Service precompile (0x...022b)    │
 │  Creates on-chain scheduled token transfer — no cron job │
 └──────────────────────────────────────────────────────────┘
          │ all events
          ▼
 ┌──────────────────────────────────────────────────────────┐
 │  Hedera Consensus Service (HCS)  — immutable audit trail │
 └──────────────────────────────────────────────────────────┘
```

### Agent iNFT flow (0g Labs + Hedera HTS)

```
Session start
  └─ mintAgentNft() × 3  (watcher, strategist, executor)
       ├─ Build brain JSON (identity + capabilities + session)
       ├─ uploadToZeroG() → Merkle root hash (CID)
       └─ mintHederaNft(0g://<CID>) → Hedera HTS serial

Strategy generated
  └─ archiveStrategyBrain()
       ├─ Full plan + reasoning uploaded to 0g
       └─ stratBrainCid emitted in PROPOSE event + shown in UI
```

---

## Smart contract — AegisScheduler.sol

Located in `contracts/`.

### Why a contract?

The Hedera Schedule Service bounty requires scheduling to be **initiated from a smart contract**, not only from a backend script. `AegisScheduler.sol` calls the Hedera Schedule Service system contract precompile (`0x000000000000000000000000000000000000022b`) to create on-chain scheduled token transfers. No backend cron job required after the transaction is submitted.

### Optional Python services (Tier 2/3)

For GARCH VaR and portfolio optimization:

```bash
# Install deps (use pip3 if pip not found)
cd services/var && pip3 install -r requirements.txt
cd services/portfolio && pip3 install -r requirements.txt

# Start both services (from repo root)
npm run dev:services
```

Or run individually:
```bash
cd services/var && uvicorn var_api:app --host 0.0.0.0 --port 5001
cd services/portfolio && uvicorn portfolio_api:app --host 0.0.0.0 --port 5002
```

Set `VAR_SERVICE_URL` and `PORTFOLIO_SERVICE_URL` in `.env.local` if running on different hosts.

---

### Deploy to Hedera Testnet

```bash
cd contracts
npm install

# Set HEDERA_EVM_DEPLOYER_KEY in frontend/.env.local
# Must be an ECDSA key (not the ED25519 key from portal.hedera.com)
# Fund the EVM address with HBAR at https://faucet.hedera.com

npx hardhat run scripts/deploy.ts --network hederaTestnet
```

The script prints the contract address — copy it to `AEGIS_SCHEDULER_ADDRESS` in `frontend/.env.local`.

### Run tests (local Hardhat network, no credentials needed)

```bash
cd contracts && npx hardhat test
# 9 passing
```

### Verify on HashScan

```bash
cd contracts
npx hardhat verify --network hederaTestnet <AEGIS_SCHEDULER_ADDRESS>
```

---

## ETHDenver 2026 Bounty targets (5 bounties, all free)

| # | Bounty | Prize | Key files | Free? |
|---|--------|-------|-----------|-------|
| 1 | **Hedera Killer App (OpenClaw)** | $10k | `agent-economy.ts`, `agent-reputation/`, `agent-market/` | ✅ Hedera Testnet |
| 2 | **Hedera Schedule Service** | $5k | `AegisScheduler.sol`, `schedule-tracker.ts`, `schedule-status/` | ✅ Hedera Testnet |
| 3 | **0G Labs: DeFAI Application** | $7k | `defi-sim.ts`, `defi-sim/`, `zerog.ts`, `strategist.ts` | ✅ 0G faucet |
| 4 | **0G Labs: On-Chain Agent (iNFT)** | $7k | `og-inft.ts`, `zerog.ts`, `hedera-nft.ts`, `agent-profile/` | ✅ 0G faucet |
| 5 | **Hedera: No Solidity Allowed** | $5k | `sdk-audit.ts`, `sdk-receipt/` (zero Solidity) | ✅ Hedera Testnet |

**Total potential prize: $36,000 · All free to run · See `/bounties/BOUNTY_MAP.md` for full details**

### Run the bounty demo
```bash
# Start server
cd frontend && npm run dev

# Run full demo against local server
bash scripts/demo.sh
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend + server-side agents | Next.js 14, TypeScript, Tailwind CSS |
| Wallet + signing | wagmi v2, viem, EIP-712 |
| Market data | CoinGecko (free tier), Alternative.me Fear & Greed |
| Agent identity | 0g decentralised storage (`@0glabs/0g-ts-sdk`), Hedera HTS NFT |
| On-chain audit | Hedera Consensus Service (HCS) |
| On-chain execution | Hedera Token Service (HTS) |
| On-chain automation | `AegisScheduler.sol` → Hedera Schedule Service precompile (`0x...022b`) |
| Contract tooling | Hardhat v2, solc 0.8.20, 9 unit tests |
| Supported wallets | MetaMask, Phantom, WalletConnect, Coinbase Wallet |

---

## Vercel deployment

1. Import repo → set **Root Directory** to `frontend`
2. Add all `frontend/.env.local` variables in the Vercel project settings
3. Deploy — build and start commands are in `frontend/vercel.json`
