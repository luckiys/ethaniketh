/**
 * Blockade Labs — Agent Skybox Home
 * ETHDenver Bounty: "Solving the Homeless Agent Problem" ($2,000)
 *
 * Every Mudra agent deserves a home. Skybox AI generates a 360° immersive
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

// Poll Blockade Labs for a completed skybox (generation is async, takes 10-30s)
async function pollSkyboxResult(jobId: string, maxWaitMs = 45000): Promise<{
  id: string; title: string; thumb_url: string; file_url: string; status: string;
}> {
  const start = Date.now();
  const interval = 3000; // poll every 3 seconds

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await fetch(`${BLOCKADE_API_URL}/imagine/requests/${jobId}`, {
      headers: { 'x-api-key': BLOCKADE_API_KEY },
    });

    if (!res.ok) throw new Error(`Poll error: ${res.status}`);

    const data = await res.json() as {
      request: { id: string; title: string; thumb_url: string; file_url: string; status: string };
    };

    const req = data.request;
    if (req.status === 'complete' && req.file_url) {
      return { id: String(req.id), title: req.title, thumb_url: req.thumb_url, file_url: req.file_url, status: req.status };
    }
    if (req.status === 'error' || req.status === 'failed') {
      throw new Error(`Skybox generation failed: ${req.status}`);
    }

    console.log(`[blockade] skybox ${jobId} status: ${req.status} — waiting...`);
  }

  throw new Error('Skybox generation timed out after 45s');
}

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
    // Step 1: Submit the skybox generation job
    const submitRes = await fetch(`${BLOCKADE_API_URL}/skybox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BLOCKADE_API_KEY,
      },
      body: JSON.stringify({
        skybox_style_id: 2, // Realistic style
        prompt,
        title: `Mudra ${agentId} Home — ${riskLevel}`,
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      throw new Error(`Blockade submit error: ${submitRes.status} — ${errText}`);
    }

    const job = await submitRes.json() as {
      id: string | number;
      status: string;
      title?: string;
      thumb_url?: string;
      file_url?: string;
    };

    const jobId = String(job.id);

    // Step 2: If already complete (rare but possible), return immediately
    if (job.status === 'complete' && job.file_url) {
      return {
        agentId,
        skyboxId: jobId,
        title: job.title ?? `Mudra ${agentId} Home`,
        prompt,
        thumbUrl: job.thumb_url ?? '',
        exportUrl: job.file_url,
        generatedAt: new Date().toISOString(),
        riskLevel,
        mockMode: false,
      };
    }

    // Step 3: Poll until complete (Blockade Labs is async — takes 10-30s)
    console.log(`[blockade] skybox job ${jobId} submitted, polling for completion...`);
    const result = await pollSkyboxResult(jobId);

    return {
      agentId,
      skyboxId: result.id,
      title: result.title ?? `Mudra ${agentId} Home`,
      prompt,
      thumbUrl: result.thumb_url ?? '',
      exportUrl: result.file_url,
      generatedAt: new Date().toISOString(),
      riskLevel,
      mockMode: false,
    };
  } catch (e) {
    console.error('[blockade] API call failed, falling back to mock:', e);
    return { ...MOCK_HOMES[agentId], riskLevel };
  }
}

// In-memory cache for live-generated homes (so GET /api/agent-home shows live data)
const liveHomesCache = new Map<AgentPersonality, AgentHome>();

export function cacheLiveHome(home: AgentHome): void {
  liveHomesCache.set(home.agentId, home);
}

export function getAllAgentHomes(): AgentHome[] {
  // Merge: live cache overrides mock defaults
  const agents: AgentPersonality[] = ['watcher', 'strategist', 'executor'];
  return agents.map((a) => liveHomesCache.get(a) ?? MOCK_HOMES[a]);
}

export function getRiskLevelFromScore(riskScore: number): RiskLevel {
  if (riskScore < 35) return 'conservative';
  if (riskScore < 65) return 'moderate';
  return 'aggressive';
}
