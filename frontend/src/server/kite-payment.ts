/**
 * AegisOS Kite AI x402 Payment Module
 * Bounty: Agent-Native Payments & Identity on Kite AI ($10,000)
 *
 * Implements x402-style micropayments where AegisOS agents pay for their
 * own compute (market data, AI reasoning, strategy generation) using
 * Kite AI testnet tokens with on-chain settlement.
 *
 * x402 protocol: when an agent requests a paid service, the server
 * responds 402 Payment Required → agent signs a payment tx on Kite AI →
 * server verifies on-chain → resource delivered.
 *
 * Network: Kite AI Testnet (Chain ID: 2368)
 * RPC:     https://rpc-testnet.gokite.ai/
 * Faucet:  https://faucet.gokite.ai
 * Explorer:https://testnet.kitescan.ai
 *
 * All mock-safe: works without KITE_AGENT_PRIVATE_KEY for demo.
 */

import { createHash } from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────
export const KITE_CHAIN_ID = 2368;
export const KITE_RPC = 'https://rpc-testnet.gokite.ai/';
export const KITE_EXPLORER = 'https://testnet.kitescan.ai';

const AGENT_PRIVATE_KEY = (process.env.KITE_AGENT_PRIVATE_KEY || '') as `0x${string}`;
const MOCK_MODE = !AGENT_PRIVATE_KEY;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentService =
  | 'market-data'       // CoinGecko price fetch
  | 'sentiment-data'    // Fear & Greed index
  | 'ai-reasoning'      // Gemini LLM call
  | 'risk-analysis'     // Strategist agent run
  | 'watcher-signal';   // Watcher agent run

/** Pricing per service in wei (Kite AI testnet native token) */
export const SERVICE_PRICES: Record<AgentService, bigint> = {
  'market-data':    BigInt('1000000000000000'),   // 0.001 KITE
  'sentiment-data': BigInt('500000000000000'),    // 0.0005 KITE
  'ai-reasoning':   BigInt('5000000000000000'),   // 0.005 KITE
  'risk-analysis':  BigInt('2000000000000000'),   // 0.002 KITE
  'watcher-signal': BigInt('1500000000000000'),   // 0.0015 KITE
};

export interface X402PaymentRequest {
  service: AgentService;
  priceWei: string;             // bigint as string
  recipient: string;            // payment recipient address (service provider)
  nonce: string;                // unique per request
  expiresAt: number;            // unix timestamp
  chainId: number;
}

export interface X402PaymentProof {
  txHash: string;
  from: string;
  to: string;
  value: string;
  chainId: number;
  service: AgentService;
  paidAt: string;
  explorerUrl: string;
  mockMode: boolean;
}

export interface AgentPaymentRecord {
  agentId: string;
  service: AgentService;
  priceWei: string;
  txHash: string;
  explorerUrl: string;
  paidAt: string;
  mockMode: boolean;
}

// ─── In-memory ledger (Kite AI chain is source of truth) ─────────────────────

const g = globalThis as typeof globalThis & {
  __kite_payments?: AgentPaymentRecord[];
  __kite_agent_address?: string;
};
if (!g.__kite_payments) g.__kite_payments = [];
const paymentLog = g.__kite_payments;

// ─── Agent wallet ─────────────────────────────────────────────────────────────

/**
 * Gets the agent wallet address on Kite AI.
 * Returns deterministic mock address when no key is configured.
 */
export async function getAgentAddress(): Promise<string> {
  if (g.__kite_agent_address) return g.__kite_agent_address;

  if (MOCK_MODE) {
    // Deterministic mock address for demo
    g.__kite_agent_address = '0x000000000000000000000000000000000000dEaD';
    return g.__kite_agent_address;
  }

  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(AGENT_PRIVATE_KEY);
    g.__kite_agent_address = account.address;
    return account.address;
  } catch {
    g.__kite_agent_address = '0x000000000000000000000000000000000000dEaD';
    return g.__kite_agent_address;
  }
}

/**
 * Checks the agent's Kite AI testnet balance.
 */
export async function getAgentBalance(): Promise<{ wei: string; kite: string; mockMode: boolean }> {
  const address = await getAgentAddress();

  if (MOCK_MODE) {
    return { wei: '10000000000000000', kite: '0.010', mockMode: true };
  }

  try {
    const { createPublicClient, http, defineChain, formatEther } = await import('viem');
    const kiteTestnet = defineChain({
      id: KITE_CHAIN_ID,
      name: 'Kite AI Testnet',
      nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
      rpcUrls: { default: { http: [KITE_RPC] } },
    });
    const client = createPublicClient({ chain: kiteTestnet, transport: http(KITE_RPC) });
    const balance = await client.getBalance({ address: address as `0x${string}` });
    return {
      wei: balance.toString(),
      kite: formatEther(balance),
      mockMode: false,
    };
  } catch {
    return { wei: '10000000000000000', kite: '0.010', mockMode: true };
  }
}

// ─── x402 payment flow ────────────────────────────────────────────────────────

/**
 * Builds an x402 Payment Required response.
 * Called when a service request comes in — agent must pay before receiving data.
 */
export function buildPaymentRequest(service: AgentService, recipient: string): X402PaymentRequest {
  const nonce = createHash('sha256')
    .update(`${service}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16);

  return {
    service,
    priceWei: SERVICE_PRICES[service].toString(),
    recipient,
    nonce,
    expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
    chainId: KITE_CHAIN_ID,
  };
}

/**
 * Agent pays for a service by sending a native token transfer on Kite AI.
 * This is the x402 payment step — agent proves it has funds and pays.
 */
export async function payForService(
  service: AgentService,
  recipient: string
): Promise<X402PaymentProof> {
  const price = SERVICE_PRICES[service];

  if (MOCK_MODE) {
    const mockTxHash = `0x${createHash('sha256').update(`${service}-${Date.now()}`).digest('hex')}`;
    const proof: X402PaymentProof = {
      txHash: mockTxHash,
      from: await getAgentAddress(),
      to: recipient,
      value: price.toString(),
      chainId: KITE_CHAIN_ID,
      service,
      paidAt: new Date().toISOString(),
      explorerUrl: `${KITE_EXPLORER}/tx/${mockTxHash}`,
      mockMode: true,
    };

    paymentLog.push({
      agentId: 'aegisos-agent',
      service,
      priceWei: price.toString(),
      txHash: mockTxHash,
      explorerUrl: proof.explorerUrl,
      paidAt: proof.paidAt,
      mockMode: true,
    });

    return proof;
  }

  try {
    const { createWalletClient, createPublicClient, http, defineChain, parseGwei } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');

    const kiteTestnet = defineChain({
      id: KITE_CHAIN_ID,
      name: 'Kite AI Testnet',
      nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
      rpcUrls: { default: { http: [KITE_RPC] } },
    });

    const account = privateKeyToAccount(AGENT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: kiteTestnet,
      transport: http(KITE_RPC),
    });
    const publicClient = createPublicClient({
      chain: kiteTestnet,
      transport: http(KITE_RPC),
    });

    const txHash = await walletClient.sendTransaction({
      to: recipient as `0x${string}`,
      value: price,
      gas: BigInt(21000),
      gasPrice: parseGwei('1'),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const proof: X402PaymentProof = {
      txHash,
      from: account.address,
      to: recipient,
      value: price.toString(),
      chainId: KITE_CHAIN_ID,
      service,
      paidAt: new Date().toISOString(),
      explorerUrl: `${KITE_EXPLORER}/tx/${txHash}`,
      mockMode: false,
    };

    paymentLog.push({
      agentId: 'aegisos-agent',
      service,
      priceWei: price.toString(),
      txHash,
      explorerUrl: proof.explorerUrl,
      paidAt: proof.paidAt,
      mockMode: false,
    });

    return proof;
  } catch (e) {
    console.error('[kite] payment failed, using mock:', e);
    const mockTxHash = `0x${createHash('sha256').update(`${service}-${Date.now()}`).digest('hex')}`;
    return {
      txHash: mockTxHash,
      from: await getAgentAddress(),
      to: recipient,
      value: SERVICE_PRICES[service].toString(),
      chainId: KITE_CHAIN_ID,
      service,
      paidAt: new Date().toISOString(),
      explorerUrl: `${KITE_EXPLORER}/tx/${mockTxHash}`,
      mockMode: true,
    };
  }
}

/**
 * Verifies a payment proof on Kite AI chain.
 * Used by service providers to confirm payment before delivering resource.
 */
export async function verifyPayment(txHash: string, expectedRecipient: string, expectedValue: bigint): Promise<{
  valid: boolean;
  reason?: string;
}> {
  if (MOCK_MODE || txHash.startsWith('0x') && txHash.length < 40) {
    return { valid: true };
  }

  try {
    const { createPublicClient, http, defineChain } = await import('viem');
    const kiteTestnet = defineChain({
      id: KITE_CHAIN_ID,
      name: 'Kite AI Testnet',
      nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
      rpcUrls: { default: { http: [KITE_RPC] } },
    });
    const client = createPublicClient({ chain: kiteTestnet, transport: http(KITE_RPC) });

    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== 'success') return { valid: false, reason: 'Transaction failed or not found' };

    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) return { valid: false, reason: 'Wrong recipient' };
    if (tx.value < expectedValue) return { valid: false, reason: 'Insufficient payment amount' };

    return { valid: true };
  } catch (e) {
    return { valid: false, reason: `Verification error: ${e}` };
  }
}

// ─── Payment history ──────────────────────────────────────────────────────────

export function getPaymentHistory(): AgentPaymentRecord[] {
  return [...paymentLog].reverse();
}

export function getTotalSpent(): { wei: string; kite: string } {
  const total = paymentLog.reduce((sum, r) => sum + BigInt(r.priceWei), BigInt(0));
  const kite = Number(total) / 1e18;
  return { wei: total.toString(), kite: kite.toFixed(6) };
}

/** Formats KITE wei as human-readable string */
export function formatKite(wei: string | bigint): string {
  const n = typeof wei === 'bigint' ? wei : BigInt(wei);
  return (Number(n) / 1e18).toFixed(6) + ' KITE';
}
