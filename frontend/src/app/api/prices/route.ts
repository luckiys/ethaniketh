import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// CoinGecko IDs for the simple price API (free, no key required)
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOGE: 'dogecoin',
  TON: 'toncoin', SHIB: 'shiba-inu', DOT: 'polkadot', MATIC: 'matic-network',
  LINK: 'chainlink', UNI: 'uniswap', NEAR: 'near', ATOM: 'cosmos', LTC: 'litecoin',
  ARB: 'arbitrum', OP: 'optimism', HBAR: 'hedera-hashgraph', SUI: 'sui', APT: 'aptos',
  TRX: 'tron', FIL: 'filecoin', ICP: 'internet-computer', AAVE: 'aave', BCH: 'bitcoin-cash',
  PEPE: 'pepe', DAI: 'dai',
};

// CoinPaprika ticker IDs (fallback when CoinGecko is rate-limited)
const COINPAPRIKA_IDS: Record<string, string> = {
  BTC: 'btc-bitcoin', ETH: 'eth-ethereum', SOL: 'sol-solana', USDT: 'usdt-tether', USDC: 'usdc-usd-coin',
  BNB: 'bnb-binance-coin', XRP: 'xrp-xrp', ADA: 'ada-cardano', AVAX: 'avax-avalanche', DOGE: 'doge-dogecoin',
  TON: 'ton-toncoin', SHIB: 'shib-shiba-inu', DOT: 'dot-polkadot', MATIC: 'matic-polygon',
  LINK: 'link-chainlink', UNI: 'uni-uniswap', NEAR: 'near-near-protocol', ATOM: 'atom-cosmos', LTC: 'ltc-litecoin',
  ARB: 'arb-arbitrum', OP: 'op-optimism', HBAR: 'hbar-hedera-hashgraph', SUI: 'sui-sui', APT: 'apt-aptos',
  TRX: 'trx-tron', FIL: 'fil-filecoin', ICP: 'icp-internet-computer', AAVE: 'aave-aave', BCH: 'bch-bitcoin-cash',
  PEPE: 'pepe-pepe', DAI: 'dai-dai',
};

async function fetchFromCoinGecko(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return {};

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
    { cache: 'no-store' }
  );
  const data = (await res.json()) as Record<string, { usd?: number }> & { status?: { error_code?: number } };
  if (!res.ok || data.status?.error_code === 429) return {};

  const prices: Record<string, number> = {};
  for (const symbol of symbols) {
    const id = COINGECKO_IDS[symbol];
    if (id && typeof data[id]?.usd === 'number') {
      prices[symbol] = data[id].usd!;
    }
  }
  return prices;
}

async function fetchFromCoinPaprika(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  for (const symbol of symbols) {
    const id = COINPAPRIKA_IDS[symbol];
    if (!id) continue;
    try {
      const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${id}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as { quotes?: { USD?: { price?: number } } };
      const price = data?.quotes?.USD?.price;
      if (typeof price === 'number') prices[symbol] = price;
    } catch {
      // skip
    }
  }
  return prices;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? 'ETH';
  const symbols = [...new Set(symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    let prices = await fetchFromCoinGecko(symbols);
    if (Object.keys(prices).length === 0) {
      prices = await fetchFromCoinPaprika(symbols);
    }
    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: {} });
  }
}
