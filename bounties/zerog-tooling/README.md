# Bounty: 0G Developer Tooling

**Sponsor:** 0G Labs
**Prize:** $4,000

## What We Built

An open-source 0G Storage Explorer and SDK Debugger embedded directly in AegisOS — making 0G storage accessible to developers building AI applications.

### Tools

| Tool | Endpoint | Description |
|------|----------|-------------|
| SDK Health Checker | GET /api/og-explorer | Verifies 0G SDK config, key setup, network |
| Storage Explorer | GET /api/og-explorer?cid= | Inspect any CID metadata |
| Content Verifier | POST /api/og-explorer { action: "verify" } | SHA-256 integrity proof |
| Batch Uploader | POST /api/og-explorer { action: "batch" } | Upload multiple items at once |
| Storage Registry | GET /api/og-explorer | All uploaded CIDs with metadata |

## Demo

```bash
cd frontend && npm run dev

# SDK health check
curl http://localhost:3000/api/og-explorer

# Store content on 0G
curl -X POST http://localhost:3000/api/og-explorer \
  -H "Content-Type: application/json" \
  -d '{"action": "store", "label": "strategy-snapshot", "content": {"riskScore": 72, "recommendation": "REDUCE_ETH"}}'

# Verify CID integrity
curl -X POST http://localhost:3000/api/og-explorer \
  -H "Content-Type: application/json" \
  -d '{"action": "verify", "cid": "0xabc...", "content": {"riskScore": 72}}'

# Batch upload
curl -X POST http://localhost:3000/api/og-explorer \
  -H "Content-Type: application/json" \
  -d '{"action": "batch", "items": [{"label": "item1", "content": {}}, {"label": "item2", "content": {}}]}'
```

## Network
- **RPC**: https://evmrpc-testnet.0g.ai
- **Storage**: https://indexer-storage-testnet-turbo.0g.ai
- **Explorer**: https://storagescan-newton.0g.ai
- **Faucet**: https://faucet.0g.ai
