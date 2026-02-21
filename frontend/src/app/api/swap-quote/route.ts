/**
 * GET  /api/swap-quote?tokenIn=ETH&tokenOut=USDC&amount=1.0
 * POST /api/swap-quote { tokenIn, tokenOut, amount }
 * POST /api/swap-quote { recommendation, riskScore }  → strategy-aware quotes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSwapQuote,
  getStrategyQuotes,
  TOKENS,
  type TokenSymbol,
} from '@/server/uniswap-quotes';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const tokenIn = req.nextUrl.searchParams.get('tokenIn') as TokenSymbol;
  const tokenOut = req.nextUrl.searchParams.get('tokenOut') as TokenSymbol;
  const amount = req.nextUrl.searchParams.get('amount') ?? '1.0';

  const validTokens = Object.keys(TOKENS) as TokenSymbol[];
  if (!tokenIn || !validTokens.includes(tokenIn)) {
    return NextResponse.json({ error: `tokenIn must be one of: ${validTokens.join(', ')}` }, { status: 400 });
  }
  if (!tokenOut || !validTokens.includes(tokenOut)) {
    return NextResponse.json({ error: `tokenOut must be one of: ${validTokens.join(', ')}` }, { status: 400 });
  }

  const quote = await getSwapQuote(tokenIn, tokenOut, amount);
  return NextResponse.json({ bounty: 'Uniswap Foundation: Developer Platform API', quote });
}

export async function POST(req: NextRequest) {
  let body: {
    tokenIn?: string; tokenOut?: string; amount?: string;
    recommendation?: string; riskScore?: number;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const validTokens = Object.keys(TOKENS) as TokenSymbol[];

  // Strategy-aware mode
  if (body.recommendation !== undefined || body.riskScore !== undefined) {
    const quotes = await getStrategyQuotes(
      body.recommendation ?? 'HOLD',
      body.riskScore ?? 50
    );
    return NextResponse.json({
      bounty: 'Uniswap Foundation: Developer Platform API',
      mode: 'strategy-aware',
      quotes,
    });
  }

  // Direct quote mode
  const { tokenIn, tokenOut, amount = '1.0' } = body;
  if (!tokenIn || !validTokens.includes(tokenIn as TokenSymbol)) {
    return NextResponse.json({ error: `tokenIn must be one of: ${validTokens.join(', ')}` }, { status: 400 });
  }
  if (!tokenOut || !validTokens.includes(tokenOut as TokenSymbol)) {
    return NextResponse.json({ error: `tokenOut must be one of: ${validTokens.join(', ')}` }, { status: 400 });
  }

  const quote = await getSwapQuote(tokenIn as TokenSymbol, tokenOut as TokenSymbol, amount);
  return NextResponse.json({ bounty: 'Uniswap Foundation: Developer Platform API', quote });
}
