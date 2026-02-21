# Bounty: 0G AI Inference via 0G Compute

**Sponsor:** 0G Labs
**Prize:** $7,000

## What We Built

Mudra agent reasoning runs on **0G's decentralized AI inference network** instead of centralized APIs. Every Watcher analysis, Strategist recommendation, and Executor plan can be routed through 0G Compute nodes — censorship-resistant, verifiable, decentralized AI.

### Agent Inference Roles

| Agent | Model | Prompt Type | Output |
|-------|-------|-------------|--------|
| Watcher | llama-3.1-8b | Market regime analysis | Risk signals + alerts |
| Strategist | llama-3.1-70b | Portfolio optimization | Allocation targets + rationale |
| Executor | llama-3.1-8b | Execution planning | Trade sizing + timing |

### Verification
Every inference result includes a **verification hash** — a SHA-256 of the request ID, response, and compute node ID. This can be stored on 0G Storage for an immutable AI audit trail.

## Demo

```bash
cd frontend && npm run dev

# Run Watcher inference on 0G Compute
curl -X POST http://localhost:3000/api/og-inference \
  -H "Content-Type: application/json" \
  -d '{"agentId": "watcher", "sessionId": "demo-123", "context": {"btcPrice": 64200, "ethPrice": 3480}}'

# Run Strategist inference
curl -X POST http://localhost:3000/api/og-inference \
  -H "Content-Type: application/json" \
  -d '{"agentId": "strategist", "sessionId": "demo-123", "context": {"holdings": [{"token": "ETH", "pct": 62}], "riskScore": 71}}'

# View inference log + stats
curl http://localhost:3000/api/og-inference
```

## Free Compute
1. Get testnet tokens from 0G Discord (#faucet)
2. Register at [dashboard.0g.ai/compute](https://dashboard.0g.ai/compute)
3. Add to `.env.local`:
   ```
   OG_COMPUTE_URL=https://inference-api.0g.ai
   OG_COMPUTE_KEY=your-key
   ```

Mock mode: realistic agent responses, no key needed.
