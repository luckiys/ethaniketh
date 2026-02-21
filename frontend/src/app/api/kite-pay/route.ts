/**
 * POST /api/kite-pay
 * Full x402 payment flow:
 *   1. Receive service request
 *   2. Return 402 Payment Required with payment details
 *   3. Client submits payment proof
 *   4. Server verifies on-chain (or mock)
 *   5. Service resource delivered
 *
 * GET /api/kite-pay
 * Returns x402 payment ledger + per-service cost breakdown.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildPaymentRequest,
  payForService,
  verifyPayment,
  getPaymentHistory,
  getTotalSpent,
  formatKite,
  getAgentAddress,
  SERVICE_PRICES,
  type AgentService,
  type X402PaymentProof,
} from '@/server/kite-payment';

export const runtime = 'nodejs';

// ─── Mock service payloads ────────────────────────────────────────────────────

function getMockServicePayload(service: AgentService) {
  switch (service) {
    case 'market-data':
      return {
        btc: { usd: 64200, change24h: -1.2 },
        eth: { usd: 3480, change24h: 0.8 },
        sol: { usd: 152, change24h: 2.1 },
        fetchedAt: new Date().toISOString(),
      };
    case 'sentiment-data':
      return {
        value: 62,
        classification: 'Greed',
        previousValue: 58,
        previousClassification: 'Greed',
        fetchedAt: new Date().toISOString(),
      };
    case 'ai-reasoning':
      return {
        model: 'gemini-2.0-flash',
        tokens: 847,
        reasoning: 'Portfolio shows moderate concentration risk. ETH dominance at 60% exceeds recommended 45% cap for balanced profile. Recommend gradual rebalancing toward BTC.',
        generatedAt: new Date().toISOString(),
      };
    case 'risk-analysis':
      return {
        riskScore: 68,
        breakdown: {
          concentration: 72,
          volatility: 65,
          correlation: 58,
          liquidity: 80,
          sentiment: 62,
        },
        recommendation: 'REDUCE_ETH',
        analyzedAt: new Date().toISOString(),
      };
    case 'watcher-signal':
      return {
        regime: 'NEUTRAL',
        confidence: 0.71,
        alerts: ['ETH RSI approaching overbought (72)', 'BTC dominance rising'],
        signal: 'HOLD',
        watchedAt: new Date().toISOString(),
      };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    service?: string;
    step?: 'request' | 'pay' | 'verify';
    paymentProof?: X402PaymentProof;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { service, step = 'pay', paymentProof } = body;

  const validServices: AgentService[] = [
    'market-data', 'sentiment-data', 'ai-reasoning', 'risk-analysis', 'watcher-signal',
  ];

  if (!service || !validServices.includes(service as AgentService)) {
    return NextResponse.json(
      {
        error: `service must be one of: ${validServices.join(', ')}`,
        availableServices: validServices,
        servicePrices: Object.fromEntries(
          Object.entries(SERVICE_PRICES).map(([k, v]) => [k, formatKite(v)])
        ),
      },
      { status: 400 }
    );
  }

  const svc = service as AgentService;

  // ── Step 1: Build 402 payment request (no payment yet) ──────────────────────
  if (step === 'request') {
    const agentAddress = await getAgentAddress();
    const paymentReq = buildPaymentRequest(svc, agentAddress);
    return NextResponse.json(
      {
        protocol: 'x402',
        status: 'payment_required',
        message: `This service requires payment of ${formatKite(SERVICE_PRICES[svc])} on Kite AI Testnet (chainId: 2368)`,
        paymentRequest: paymentReq,
        instructions: {
          step1: 'Submit this paymentRequest to your Kite AI wallet',
          step2: 'POST to /api/kite-pay with { service, step: "pay" }',
          step3: 'Receive service data with payment proof',
        },
      },
      { status: 402 }
    );
  }

  // ── Step 2: Agent pays → service delivered ───────────────────────────────────
  if (step === 'pay') {
    const agentAddress = await getAgentAddress();
    const proof = await payForService(svc, agentAddress);
    const payload = getMockServicePayload(svc);

    return NextResponse.json({
      protocol: 'x402',
      status: 'payment_accepted',
      service: svc,
      pricePaid: formatKite(SERVICE_PRICES[svc]),
      payment: proof,
      data: payload,
      message: `Service delivered after on-chain payment verification`,
    });
  }

  // ── Step 3: Verify an existing payment proof ─────────────────────────────────
  if (step === 'verify') {
    if (!paymentProof) {
      return NextResponse.json({ error: 'paymentProof required for verify step' }, { status: 400 });
    }

    const result = await verifyPayment(
      paymentProof.txHash,
      paymentProof.to,
      SERVICE_PRICES[svc]
    );

    return NextResponse.json({
      protocol: 'x402',
      verification: result,
      txHash: paymentProof.txHash,
      explorerUrl: paymentProof.explorerUrl,
    });
  }

  return NextResponse.json({ error: 'step must be: request | pay | verify' }, { status: 400 });
}

export async function GET() {
  const history = getPaymentHistory();
  const totalSpent = getTotalSpent();

  return NextResponse.json({
    protocol: 'x402',
    description: 'x402 payment ledger for AegisOS agents on Kite AI Testnet',
    totalSpentKite: totalSpent.kite,
    totalSpentWei: totalSpent.wei,
    transactionCount: history.length,
    servicePrices: Object.fromEntries(
      Object.entries(SERVICE_PRICES).map(([k, v]) => [k, formatKite(v)])
    ),
    recentPayments: history.slice(0, 10),
    endpoints: {
      'POST /api/kite-pay { service, step: "request" }': '→ 402 Payment Required',
      'POST /api/kite-pay { service, step: "pay" }': '→ Pay + receive service data',
      'POST /api/kite-pay { service, step: "verify", paymentProof }': '→ Verify on-chain',
      'GET /api/kite-agent': '→ Agent wallet identity + balance',
    },
  });
}
