/**
 * 0g iNFT agent identity integration.
 * Mints agent identities on 0g chain. In demo/mock mode, returns deterministic IDs.
 * Replace with real 0g SDK when available.
 */

export type AgentNftIds = {
  watcher: string;
  strategist: string;
  executor: string;
};

const MOCK_PREFIX = '0g-mock-';

export async function mintAgentNfts(sessionId: string): Promise<AgentNftIds> {
  if (!process.env.ZEROG_API_KEY || process.env.ZEROG_API_KEY === '') {
    return {
      watcher: `${MOCK_PREFIX}watcher-${sessionId.slice(0, 8)}`,
      strategist: `${MOCK_PREFIX}strategist-${sessionId.slice(0, 8)}`,
      executor: `${MOCK_PREFIX}executor-${sessionId.slice(0, 8)}`,
    };
  }

  // TODO: Integrate real 0g iNFT mint API when SDK is available
  // For now, use deterministic IDs that include session for traceability
  return {
    watcher: `${MOCK_PREFIX}watcher-${sessionId.slice(0, 8)}`,
    strategist: `${MOCK_PREFIX}strategist-${sessionId.slice(0, 8)}`,
    executor: `${MOCK_PREFIX}executor-${sessionId.slice(0, 8)}`,
  };
}
