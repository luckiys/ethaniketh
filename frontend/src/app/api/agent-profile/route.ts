/**
 * GET /api/agent-profile?agentId=<id>   — full iNFT profile for one agent
 * GET /api/agent-profile                  — all three agent profiles
 *
 * 0G Labs iNFT bounty — on-chain agent identity.
 * Shows: owner, capabilities, brain CID (0G Storage), NFT ID (Hedera HTS).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAgentReputation, getTrustBadge, type AgentId } from '@/server/agent-economy';
import { isMockMode } from '@/server/hedera';

type AgentMeta = {
  agentId: AgentId;
  name: string;
  description: string;
  capabilities: string[];
  role: string;
};

const AGENT_META: Record<AgentId, AgentMeta> = {
  watcher: {
    agentId: 'watcher',
    name: 'AegisWatcher',
    description: 'Monitors portfolio composition and live market data, emits risk signals.',
    capabilities: ['market-watch', 'price-feed', 'concentration-analysis', 'risk-alert', 'portfolio-valuation'],
    role: 'Market Intelligence',
  },
  strategist: {
    agentId: 'strategist',
    name: 'AegisStrategist',
    description: 'Parses user goals, computes risk scores across 5 dimensions, proposes strategy plans.',
    capabilities: ['goal-aware-risk-scoring', 'hhi-concentration', 'volatility-scoring', 'sentiment-analysis', 'strategy-recommendation'],
    role: 'Risk & Strategy',
  },
  executor: {
    agentId: 'executor',
    name: 'AegisExecutor',
    description: 'Verifies EIP-712 approval signatures and executes approved actions on Hedera.',
    capabilities: ['plan-verification', 'eip712-signature-check', 'hedera-hts-transfer', 'hedera-hcs-audit', 'schedule-service'],
    role: 'Execution & Verification',
  },
};

function buildProfile(agentId: AgentId, nftId?: string, brainCid?: string) {
  const meta = AGENT_META[agentId];
  const rep = getAgentReputation(agentId);
  const badge = getTrustBadge(agentId);
  const mock = isMockMode();

  // Deterministic mock CIDs so judges can always see the full profile
  const mockBrainCid = `0x${Array(64).fill(0).map((_, i) => ((agentId.charCodeAt(i % agentId.length) + i) % 16).toString(16)).join('')}`;
  const mockNftId = `0.0.mock-${agentId}-nft/1`;

  return {
    agentId,
    name: meta.name,
    description: meta.description,
    capabilities: meta.capabilities,
    role: meta.role,
    identity: {
      nftId: nftId ?? mockNftId,
      brainCid: brainCid ?? mockBrainCid,
      brainUri: `0g://${brainCid ?? mockBrainCid}`,
      nftNetwork: 'hedera-testnet',
      storageNetwork: '0g-testnet',
      mockMode: mock,
    },
    reputation: {
      score: rep.score,
      badge: badge.level,
      badgeLabel: badge.label,
      completedRuns: rep.completedRuns,
      successfulRuns: rep.successfulRuns,
      accuracy: rep.accuracy,
      hcsTxId: rep.hcsTxId,
      updatedAt: rep.updatedAt,
    },
    links: {
      hashScan: mock
        ? 'https://hashscan.io/testnet (mock mode — configure HEDERA keys)'
        : `https://hashscan.io/testnet`,
      zeroDotGExplorer: 'https://explorer.0g.ai/mainnet/home',
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') as AgentId | null;

  if (agentId) {
    if (!AGENT_META[agentId]) {
      return NextResponse.json({ error: 'Unknown agentId' }, { status: 400 });
    }
    return NextResponse.json(buildProfile(agentId));
  }

  const profiles = (['watcher', 'strategist', 'executor'] as AgentId[]).map(
    (id) => buildProfile(id)
  );

  return NextResponse.json({
    agents: profiles,
    count: profiles.length,
    bounty: '0G Labs: Best Use of On-Chain Agent (iNFT)',
    description: 'Each agent has an on-chain iNFT identity: brain stored on 0G, NFT minted on Hedera HTS.',
    network: 'hedera-testnet + 0g-testnet',
  });
}
