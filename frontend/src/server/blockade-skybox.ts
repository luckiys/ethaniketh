/**
 * Blockade Labs — Agent Skybox Home
 * ETHDenver Bounty: "Solving the Homeless Agent Problem" ($2,000)
 *
 * Every AegisOS agent deserves a home. Skybox AI generates a 360° immersive
 * environment that reflects the agent's trading personality and risk profile.
 *
 * Free access: promo code ETHDEN26 at blockadelabs.com
 * API docs: https://api.blockadelabs.com/api/v1
 */

const BLOCKADE_API_URL = 'https://backend.blockadelabs.com/api/v1';
const BLOCKADE_API_KEY = process.env.BLOCKADE_API_KEY ?? '';

export type AgentPersonality = 'watcher' | 'strategist' | 'executor';
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export interface AgentHome {
  agentId: AgentPersonality;
  skyboxId: string;
  title: string;
  prompt: string;
  thumbUrl: string;
  exportUrl: string;
  generatedAt: string;
  riskLevel: RiskLevel;
  mockMode: boolean;
}

// Personality-driven skybox prompts — each agent's home reflects their soul
const AGENT_PROMPTS: Record<AgentPersonality, string> = {
  watcher:
    'A vast cosmic observatory floating in deep space, holographic market charts ' +
    'streaming across nebula clouds, thousands of data points orbiting like stars, ' +
    'calm and infinite, a surveillance tower of the universe, cinematic, 8k',
  strategist:
    'A crystalline war room suspended above a futuristic city at golden hour, ' +
    'glowing strategy maps, probability trees made of light, confident and precise, ' +
    'high-tech brutalism meets organic geometry, photorealistic, dramatic lighting',
  executor:
    'A hyperkinetic trading floor merging with a quantum computer core, ' +
    'lightning fast transactions visualized as electric arcs, pure execution energy, ' +
    'neon blues and whites, motion blur, relentless forward momentum, cinematic 8k',
};

const RISK_STYLES: Record<RiskLevel, string> = {
  conservative: 'muted colors, serene, stable horizon, minimal chaos',
  moderate: 'balanced palette, dynamic but controlled, measured energy',
  aggressive: 'high contrast, electric, chaotic beauty, maximum energy',
};

// Deterministic mock homes — realistic structure, no API call
const MOCK_HOMES: Record<AgentPersonality, AgentHome> = {
  watcher: {
    agentId: 'watcher',
    skyboxId: 'mock-watcher-obs-7a2f',
    title: 'Cosmic Observatory — Watcher Home',
    prompt: AGENT_PROMPTS.watcher,
    thumbUrl: 'https://blockadelabs.com/thumb/mock-watcher-obs-7a2f.jpg',
    exportUrl: 'https://blockadelabs.com/export/mock-watcher-obs-7a2f.jpg',
    generatedAt: new Date().toISOString(),
    riskLevel: 'conservative',
    mockMode: true,
  },
  strategist: {
    agentId: 'strategist',
    skyboxId: 'mock-strat-warroom-3c8d',
    title: 'Crystalline War Room — Strategist Home',
    prompt: AGENT_PROMPTS.strategist,
    thumbUrl: 'https://blockadelabs.com/thumb/mock-strat-warroom-3c8d.jpg',
    exportUrl: 'https://blockadelabs.com/export/mock-strat-warroom-3c8d.jpg',
    generatedAt: new Date().toISOString(),
    riskLevel: 'moderate',
    mockMode: true,
  },
  executor: {
    agentId: 'executor',
    skyboxId: 'mock-exec-tradingfloor-9e1b',
    title: 'Quantum Trading Floor — Executor Home',
    prompt: AGENT_PROMPTS.executor,
    thumbUrl: 'https://blockadelabs.com/thumb/mock-exec-tradingfloor-9e1b.jpg',
    exportUrl: 'https://blockadelabs.com/export/mock-exec-tradingfloor-9e1b.jpg',
    generatedAt: new Date().toISOString(),
    riskLevel: 'aggressive',
    mockMode: true,
  },
};

export async function generateAgentHome(
  agentId: AgentPersonality,
  riskLevel: RiskLevel = 'moderate'
): Promise<AgentHome> {
  if (!BLOCKADE_API_KEY) {
    console.log(`[blockade] mock mode — no BLOCKADE_API_KEY (get promo code ETHDEN26 at blockadelabs.com)`);
    return { ...MOCK_HOMES[agentId], riskLevel };
  }

  const prompt = `${AGENT_PROMPTS[agentId]}, ${RISK_STYLES[riskLevel]}`;

  try {
    const res = await fetch(`${BLOCKADE_API_URL}/skybox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BLOCKADE_API_KEY,
      },
      body: JSON.stringify({
        skybox_style_id: 2, // Realistic style
        prompt,
        title: `AegisOS ${agentId} Home — ${riskLevel}`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Blockade API error: ${res.status}`);
    }

    const data = await res.json() as {
      id: string;
      title: string;
      thumb_url: string;
      file_url: string;
    };

    return {
      agentId,
      skyboxId: String(data.id),
      title: data.title,
      prompt,
      thumbUrl: data.thumb_url,
      exportUrl: data.file_url,
      generatedAt: new Date().toISOString(),
      riskLevel,
      mockMode: false,
    };
  } catch (e) {
    console.error('[blockade] API call failed, falling back to mock:', e);
    return { ...MOCK_HOMES[agentId], riskLevel };
  }
}

export function getAllAgentHomes(): AgentHome[] {
  return Object.values(MOCK_HOMES);
}

export function getRiskLevelFromScore(riskScore: number): RiskLevel {
  if (riskScore < 35) return 'conservative';
  if (riskScore < 65) return 'moderate';
  return 'aggressive';
}
