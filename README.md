# AegisOS — AI automation OS for DeFi safety + yield

**AI advises, humans decide, blockchain verifies.**

A 3-agent operating system that runs continuously like an "autopilot," but never takes action without a signed human approval. Every recommendation and execution step is verifiable on Hedera.

## Quick Start

```bash
# Install and build
cd shared && npm install && npm run build && cd ..
cd frontend && npm install && cd ..

# Start (single platform - frontend + API)
cd frontend && npm run dev
```

Or from root:
```bash
npm run dev
```

- **App**: http://localhost:3000 (UI + API combined)

**For approvals**: Connect a wallet (MetaMask, etc.) and switch to **Base** network. Sign the EIP-712 message when the approval modal appears.

## Environment

Copy `.env.example` to `.env` in the backend folder and configure:

- No paid APIs — Strategist is fully deterministic (rule-based), no OpenAI/GPT
- `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_KEY` — For real HCS + HTS (optional; mock mode if missing)
- `HEDERA_HTS_TOKEN_ID` — Token ID for HTS transfer demo
- All config in `frontend/.env.local` (Hedera, etc.)

## Architecture

| Agent | Role | Type |
|-------|------|------|
| **Watcher** | Monitors portfolio + market (CoinGecko) | Deterministic |
| **Strategist** | Risk assessment + recommendation | Deterministic (rule-based) |
| **Executor** | Executes approved plan, logs to HCS | Deterministic |

**Flow**: IDLE → WATCHING → PROPOSED → AWAITING_APPROVAL → APPROVED → EXECUTING → EXECUTED

- Human approval = EIP-712 signed message (Base/Ethereum)
- All events logged to Hedera HCS
- HTS transfer on execute (when configured)
- 0g iNFT identities for agents (mock or real)

## Vercel Deployment

1. Import the repo and create a project.
2. Set **Root Directory** to `frontend` (Project Settings → General).
3. Install and build commands are in `frontend/vercel.json`.

## Tech Stack

- **Frontend**: Next.js 14, wagmi, viem, Tailwind
- **Backend**: Fastify, Zod, @hashgraph/sdk
- **Chains**: Base (approvals), Hedera (HCS + HTS), 0g (iNFT)
