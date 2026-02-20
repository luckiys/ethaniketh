import { NextResponse } from 'next/server';

export const revalidate = 30; // cache 30 s so rapid typing doesn't hammer the API

// Same map as the watcher so symbol resolution is consistent
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  BNB: 'binancecoin',
  ARB: 'arbitrum',
  OP: 'optimism',
  CRV: 'curve-dao-token',
  MKR: 'maker',
  SNX: 'synthetix-network-token',
  COMP: 'compound-governance-token',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? 'ETH';
  const symbols = [...new Set(symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];

  const ids = symbols.map((s) => COINGECKO_IDS[s]).filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      {}
    );
    const data = (await res.json()) as Record<string, { usd?: number }>;

    const prices: Record<string, number> = {};
    for (const symbol of symbols) {
      const id = COINGECKO_IDS[symbol];
      if (id && data[id]?.usd != null) {
        prices[symbol] = data[id].usd!;
      }
    }

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: {} });
  }
}
