# Bounty: 0G Labs — Best Use of On-Chain Agent (iNFT)

**Sponsor:** 0G Labs
**Prize:** $7,000 (2 winners: $5,000 + $2,000)
**Bounty slug:** `zerog-inft`

## What We Built

Each AegisOS agent has an **on-chain iNFT identity** that combines:
- **0G Storage**: Agent brain (capabilities, reasoning, intelligence) stored on 0G decentralized storage
- **Hedera HTS NFT**: Non-fungible token with metadata URI `0g://<CID>` pointing to the brain
- **On-chain ownership**: NFT ownership proves agent identity and authorization

### iNFT Structure

```json
{
  "schema": "aegisos-inft-v1",
  "agentId": "strategist",
  "description": "Parses user goals, computes risk scores, proposes strategy plans.",
  "capabilities": [
    "goal-aware-risk-scoring",
    "hhi-concentration",
    "volatility-scoring",
    "sentiment-analysis",
    "strategy-recommendation"
  ],
  "sessionId": "sess-abc123",
  "network": "hedera-testnet",
  "storageNetwork": "0g-testnet",
  "createdAt": "2026-02-21T..."
}
```

Brain JSON → 0G Storage → Merkle root hash `0x<CID>`
→ Hedera HTS NFT with metadata `0g://0x<CID>`

### Agent Actions

The agent's iNFT ownership enables:
1. **Strategy Authorization**: Only the agent with the correct NFT can propose strategies
2. **Reputation Attestation**: NFT links to on-chain reputation (HCS attestations)
3. **Brain Updates**: Each session uploads a new brain snapshot (intelligence evolves)

### Composability

Other contracts/agents can:
- Read agent capabilities from `0g://<CID>` brain
- Verify agent identity via NFT ownership
- Subscribe to agent outputs via HCS topic

## How to Run

```bash
# Works in mock mode (no credentials needed for demo)
cd frontend && npm install && npm run dev

# For live 0G uploads: fund a wallet at https://faucet.0g.ai
echo "ZEROG_PRIVATE_KEY=0x..." >> .env.local

# For live Hedera NFTs: create account at https://portal.hedera.com
echo "HEDERA_OPERATOR_ID=0.0.xxxxx" >> .env.local
echo "HEDERA_OPERATOR_KEY=302e..." >> .env.local
```

## Demo Flow

```bash
# 1. View all agent iNFT profiles
curl http://localhost:3000/api/agent-profile
# Returns: 3 agents with iNFT IDs, brain CIDs, capabilities, reputation

# 2. View specific agent
curl "http://localhost:3000/api/agent-profile?agentId=strategist"
# Returns:
# {
#   "agentId": "strategist",
#   "name": "AegisStrategist",
#   "identity": {
#     "nftId": "0.0.12345/1",
#     "brainCid": "0x...",
#     "brainUri": "0g://0x...",
#     "nftNetwork": "hedera-testnet",
#     "storageNetwork": "0g-testnet"
#   },
#   "reputation": { "score": 85, "badge": "GOLD" }
# }

# 3. Start a session to mint new iNFTs
curl -X POST http://localhost:3000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"goal":"Balanced","holdings":[{"token":"ETH","weight":0.6,"value":6000}]}'
# Event log shows: "Minted watcher iNFT: 0.0.xxx/1"
# Event log shows: "Brain uploaded to 0G: 0x<merkleRoot>"
```

## Files

| File | Description |
|------|-------------|
| `frontend/src/server/og-inft.ts` | iNFT brain upload + Hedera NFT minting |
| `frontend/src/server/zerog.ts` | 0G Storage SDK |
| `frontend/src/server/hedera-nft.ts` | Hedera HTS NFT minting |
| `frontend/src/app/api/agent-profile/route.ts` | iNFT profile API |
| `frontend/src/server/orchestrator.ts` | Calls mintAgentNfts() at session start |

## iNFT Minting Flow

```typescript
// 1. Serialize agent brain as JSON
const brain = { schema: 'aegisos-inft-v1', agentId, capabilities, sessionId };

// 2. Upload to 0G decentralized storage
const zgCid = await uploadToZeroG(brain);          // returns 0x<merkleRoot>

// 3. Mint Hedera HTS NFT with brain URI as metadata
const nftSerial = await mintHederaNft(`0g://${zgCid}`); // returns "0.0.xxxxx/1"

// Brain is verifiable on 0G Explorer
// NFT is verifiable on HashScan
```

## Cost

**Zero** — 0G faucet at https://faucet.0g.ai (free testnet tokens)
Hedera testnet at https://portal.hedera.com (free account)
