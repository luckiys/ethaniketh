import { uploadToZeroG } from './zerog';
import { mintHederaNft } from './hedera-nft';

export type AgentNftIds = {
  watcher: string;
  strategist: string;
  executor: string;
};

type AgentId = 'watcher' | 'strategist' | 'executor';

// Declared capabilities stored in the iNFT brain so anyone
// who reads the 0g content can see what the agent does.
const AGENT_CAPABILITIES: Record<AgentId, string[]> = {
  watcher: [
    'market-watch',
    'price-feed',
    'concentration-analysis',
    'risk-alert',
    'portfolio-valuation',
  ],
  strategist: [
    'goal-aware-risk-scoring',
    'hhi-concentration',
    'volatility-scoring',
    'sentiment-analysis',
    'strategy-recommendation',
  ],
  executor: [
    'plan-verification',
    'eip712-signature-check',
    'hedera-hts-transfer',
    'hedera-hcs-audit',
  ],
};

const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  watcher:
    'Monitors portfolio composition and live market data, emits risk signals.',
  strategist:
    'Parses the user goal, computes goal-aware risk scores, and proposes a strategy plan.',
  executor:
    'Verifies the EIP-712 approval signature and executes approved actions on Hedera.',
};

/**
 * Mints a single AegisOS agent iNFT:
 *   1. Serialises agent brain (identity + capabilities + extra context) as JSON
 *   2. Uploads to 0g decentralised storage → Merkle root hash (CID)
 *   3. Mints a Hedera HTS Non-Fungible Token with metadata = `0g://<CID>`
 *
 * Returns the NFT identifier: `<tokenId>/<serialNumber>`
 * (deterministic mock when credentials are absent).
 */
export async function mintAgentNft(
  agentId: AgentId,
  sessionId: string,
  extraBrainData: object = {}
): Promise<string> {
  const brainPayload = {
    schema: 'aegisos-inft-v1',
    agentId,
    description: AGENT_DESCRIPTIONS[agentId],
    capabilities: AGENT_CAPABILITIES[agentId],
    sessionId,
    network: 'hedera-testnet',
    storageNetwork: '0g-testnet',
    createdAt: new Date().toISOString(),
    ...extraBrainData,
  };

  // 1. Store brain on 0g — returns Merkle root hash
  const zgCid = await uploadToZeroG(brainPayload);

  // 2. Mint Hedera NFT whose metadata IS the 0g content URI
  const nftSerial = await mintHederaNft(`0g://${zgCid}`);

  return nftSerial;
}

/**
 * Mints all three agent iNFTs in parallel at session start.
 */
export async function mintAgentNfts(sessionId: string): Promise<AgentNftIds> {
  const [watcher, strategist, executor] = await Promise.all([
    mintAgentNft('watcher', sessionId),
    mintAgentNft('strategist', sessionId),
    mintAgentNft('executor', sessionId),
  ]);

  return { watcher, strategist, executor };
}

/**
 * Archives the full strategist brain to 0g after strategy generation.
 * Demonstrates that the iNFT intelligence is updated each run — not
 * just at identity creation.
 *
 * Returns the 0g CID so it can be included in the PROPOSE event payload
 * and verified on the 0g explorer.
 */
export async function archiveStrategyBrain(
  sessionId: string,
  strategyPayload: {
    planId: string;
    riskScore: number;
    recommendation: string;
    reasoning: string;
    goalProfile: string;
    actions: unknown[];
  }
): Promise<string> {
  const brainSnapshot = {
    schema: 'aegisos-strategy-brain-v1',
    agentId: 'strategist',
    sessionId,
    network: 'hedera-testnet',
    storageNetwork: '0g-testnet',
    generatedAt: new Date().toISOString(),
    intelligence: strategyPayload,
  };

  return uploadToZeroG(brainSnapshot);
}
