/**
 * GET /api/kite-agent
 * Returns agent identity + Kite AI wallet balance.
 *
 * POST /api/kite-agent
 * Pays for a named service on Kite AI (x402 flow).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAgentAddress,
  getAgentBalance,
  getPaymentHistory,
  getTotalSpent,
  formatKite,
  KITE_CHAIN_ID,
  KITE_RPC,
  KITE_EXPLORER,
  SERVICE_PRICES,
} from '@/server/kite-payment';

export const runtime = 'nodejs';

export async function GET() {
  const [address, balance] = await Promise.all([getAgentAddress(), getAgentBalance()]);
  const history = getPaymentHistory();
  const totalSpent = getTotalSpent();

  return NextResponse.json({
    bounty: 'Kite AI: Agent-Native Payments & Identity (x402)',
    protocol: 'x402',
    network: {
      chainId: KITE_CHAIN_ID,
      rpc: KITE_RPC,
      explorer: KITE_EXPLORER,
      faucet: 'https://faucet.gokite.ai',
    },
    agent: {
      address,
      balance: {
        wei: balance.wei,
        kite: balance.kite,
        mockMode: balance.mockMode,
      },
    },
    servicePrices: Object.fromEntries(
      Object.entries(SERVICE_PRICES).map(([k, v]) => [k, formatKite(v)])
    ),
    ledger: {
      totalSpentKite: totalSpent.kite,
      totalSpentWei: totalSpent.wei,
      transactionCount: history.length,
      recentPayments: history.slice(0, 5),
    },
    mockMode: balance.mockMode,
  });
}

export async function POST(req: NextRequest) {
  let body: { service?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { service } = body;

  const validServices = ['market-data', 'sentiment-data', 'ai-reasoning', 'risk-analysis', 'watcher-signal'];
  if (!service || !validServices.includes(service)) {
    return NextResponse.json(
      { error: `service must be one of: ${validServices.join(', ')}` },
      { status: 400 }
    );
  }

  const { payForService, buildPaymentRequest } = await import('@/server/kite-payment');

  // 1. Build the 402 payment request
  const agentAddress = await getAgentAddress();
  const paymentReq = buildPaymentRequest(service as Parameters<typeof payForService>[0], agentAddress);

  // 2. Agent pays
  const proof = await payForService(service as Parameters<typeof payForService>[0], agentAddress);

  return NextResponse.json({
    protocol: 'x402',
    paymentRequest: paymentReq,
    paymentProof: proof,
    message: `Agent paid for ${service} on Kite AI testnet`,
    explorerUrl: proof.explorerUrl,
  });
}
