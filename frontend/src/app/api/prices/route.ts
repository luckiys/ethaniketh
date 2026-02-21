import { NextResponse } from 'next/server';
import { get, set } from '../../../server/cache';

export const dynamic = 'force-dynamic';

// Binance symbol -> USDT pair (primary, no key, no rate limit)
const BINANCE_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', BNB: 'BNBUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT',
  USDT: 'USDTUSDT', USDC: 'USDCUSDT', ADA: 'ADAUSDT', AVAX: 'AVAXUSDT', DOGE: 'DOGEUSDT',
  TON: 'TONUSDT', SHIB: 'SHIBUSDT', DOT: 'DOTUSDT', MATIC: 'MATICUSDT', POL: 'POLUSDT',
  LINK: 'LINKUSDT', UNI: 'UNIUSDT', NEAR: 'NEARUSDT', ATOM: 'ATOMUSDT', LTC: 'LTCUSDT',
  ARB: 'ARBUSDT', OP: 'OPUSDT', HBAR: 'HBARUSDT', SUI: 'SUIUSDT', APT: 'APTUSDT',
  TRX: 'TRXUSDT', FIL: 'FILUSDT', ICP: 'ICPUSDT', AAVE: 'AAVEUSDT', BCH: 'BCHUSDT',
  PEPE: 'PEPEUSDT', DAI: 'DAIUSDT', WETH: 'ETHUSDT', WBTC: 'BTCUSDT', STETH: 'ETHUSDT',
  CRV: 'CRVUSDT', MKR: 'MKRUSDT', SNX: 'SNXUSDT', COMP: 'COMPUSDT', LDO: 'LDOUSDT',
  RPL: 'RPLUSDT', FRAX: 'FRAXUSDT', GHO: 'GHOUSDT', WSTETH: 'ETHUSDT',
};

// CoinGecko IDs (fallback)
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOGE: 'dogecoin',
  TON: 'toncoin', SHIB: 'shiba-inu', DOT: 'polkadot', MATIC: 'matic-network', POL: 'matic-network',
  LINK: 'chainlink', UNI: 'uniswap', NEAR: 'near', ATOM: 'cosmos', LTC: 'litecoin',
  ARB: 'arbitrum', OP: 'optimism', HBAR: 'hedera-hashgraph', SUI: 'sui', APT: 'aptos',
  TRX: 'tron', FIL: 'filecoin', ICP: 'internet-computer', AAVE: 'aave', BCH: 'bitcoin-cash',
  PEPE: 'pepe', DAI: 'dai', WETH: 'ethereum', WBTC: 'wrapped-bitcoin', WSTETH: 'wrapped-steth',
  STETH: 'staked-ether', CRV: 'curve-dao-token', MKR: 'maker', SNX: 'havven', COMP: 'compound-governance-token',
  LDO: 'lido-dao', RPL: 'rocket-pool', FRAX: 'frax', GHO: 'gho',
};

// CoinPaprika ticker IDs (fallback)
const COINPAPRIKA_IDS: Record<string, string> = {
  BTC: 'btc-bitcoin', ETH: 'eth-ethereum', SOL: 'sol-solana', USDT: 'usdt-tether', USDC: 'usdc-usd-coin',
  BNB: 'bnb-binance-coin', XRP: 'xrp-xrp', ADA: 'ada-cardano', AVAX: 'avax-avalanche', DOGE: 'doge-dogecoin',
  TON: 'ton-toncoin', SHIB: 'shib-shiba-inu', DOT: 'dot-polkadot', MATIC: 'matic-polygon', POL: 'matic-polygon',
  LINK: 'link-chainlink', UNI: 'uni-uniswap', NEAR: 'near-near-protocol', ATOM: 'atom-cosmos', LTC: 'ltc-litecoin',
  ARB: 'arb-arbitrum', OP: 'op-optimism', HBAR: 'hbar-hedera-hashgraph', SUI: 'sui-sui', APT: 'apt-aptos',
  TRX: 'trx-tron', FIL: 'fil-filecoin', ICP: 'icp-internet-computer', AAVE: 'aave-aave', BCH: 'bch-bitcoin-cash',
  PEPE: 'pepe-pepe', DAI: 'dai-dai', WETH: 'eth-ethereum', WBTC: 'wbtc-wrapped-bitcoin',
};

// DeFiLlama chain:address (fallback for DeFi tokens, no key)
const DEFILLAMA_COINS: Record<string, string> = {
  ETH: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  BTC: 'ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
  USDC: 'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: 'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: 'ethereum:0x6B175474E89094C44Da98b954Eedeac495271d0F',
  WETH: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  WBTC: 'ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  LINK: 'ethereum:0x514910771AF9Ca656af840dff83E8264EcF986CA',
  UNI: 'ethereum:0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  AAVE: 'ethereum:0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  CRV: 'ethereum:0xD533a949740bb3306d119CC777fa900bA034cd52',
  MKR: 'ethereum:0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  SNX: 'ethereum:0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  COMP: 'ethereum:0xc00e94Cb662C3520282E6f5717214004A7f26888',
  LDO: 'ethereum:0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  STETH: 'ethereum:0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  FRAX: 'ethereum:0x853d955aCEf822Db058eb8505911ED77F175b99e',
  MATIC: 'ethereum:0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
  POL: 'ethereum:0x455e53CBB86018Ac2B8090Fd305f2e2e843cC43b', // Polygon POL on Ethereum
  ARB: 'ethereum:0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
  OP: 'ethereum:0x4200000000000000000000000000000000000042',
  AVAX: 'avalanche:0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  SOL: 'solana:So11111111111111111111111111111111111111112',
};

async function fetchFromBinance(symbols: string[]): Promise<Record<string, number>> {
  const pairs = symbols.map((s) => BINANCE_PAIRS[s]).filter(Boolean);
  if (pairs.length === 0) return {};
  const pairSet = new Set(pairs);
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price', { cache: 'no-store' });
    if (!res.ok) return {};
    const data = (await res.json()) as Array<{ symbol: string; price: string }> | { code?: number; msg?: string };
    if (!Array.isArray(data)) return {}; // Binance geo-block returns {code, msg}
    const prices: Record<string, number> = {};
    const pairToSymbol = Object.fromEntries(
      Object.entries(BINANCE_PAIRS).map(([sym, pair]) => [pair, sym])
    );
    for (const item of data) {
      if (!pairSet.has(item.symbol)) continue;
      const sym = pairToSymbol[item.symbol];
      if (sym && item.price) {
        const p = parseFloat(item.price);
        if (!Number.isNaN(p)) prices[sym] = p;
      }
    }
    return prices;
  } catch {
    return {};
  }
}

async function fetchFromCoinGecko(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols.map((s) => COINGECKO_IDS[s]).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      { cache: 'no-store' }
    );
    const data = (await res.json()) as Record<string, { usd?: number }> & { status?: { error_code?: number } };
    if (!res.ok || data.status?.error_code === 429) return {};
    const prices: Record<string, number> = {};
    for (const symbol of symbols) {
      const id = COINGECKO_IDS[symbol];
      if (id && typeof data[id]?.usd === 'number') prices[symbol] = data[id].usd!;
    }
    return prices;
  } catch {
    return {};
  }
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

async function fetchFromDefiLlama(symbols: string[]): Promise<Record<string, number>> {
  const coins = symbols.map((s) => DEFILLAMA_COINS[s]).filter(Boolean);
  if (coins.length === 0) return {};
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${coins.join(',')}`, {
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { coins?: Record<string, { price?: number; symbol?: string }> };
    const prices: Record<string, number> = {};
    const coinToSymbol = Object.fromEntries(
      Object.entries(DEFILLAMA_COINS).map(([sym, coin]) => [coin, sym])
    );
    for (const [coin, info] of Object.entries(data.coins ?? {})) {
      const sym = coinToSymbol[coin];
      if (sym && typeof info?.price === 'number') prices[sym] = info.price;
    }
    return prices;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? 'ETH';
  const symbols = [...new Set(symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const cacheKey = symbols.sort().join(',');
    let cached = get<Record<string, number>>('prices', cacheKey);
    if (cached != null && Object.keys(cached).length > 0) {
      return NextResponse.json({ prices: cached });
    }

    // DeFiLlama first (reliable, no geo-block, no API key)
    let prices = await fetchFromDefiLlama(symbols);

    // 2. CoinGecko for missing (Binance geo-blocked in many regions)
    const missing = symbols.filter((s) => !(s in prices));
    if (missing.length > 0) {
      const cg = await fetchFromCoinGecko(missing);
      for (const [s, p] of Object.entries(cg)) prices[s] = p;
    }

    // 3. Binance for still missing
    const stillMissing = symbols.filter((s) => !(s in prices));
    if (stillMissing.length > 0) {
      const bn = await fetchFromBinance(stillMissing);
      for (const [s, p] of Object.entries(bn)) prices[s] = p;
    }

    // 4. CoinPaprika for final fallback
    const finalMissing = symbols.filter((s) => !(s in prices));
    if (finalMissing.length > 0) {
      const cp = await fetchFromCoinPaprika(finalMissing);
      for (const [s, p] of Object.entries(cp)) prices[s] = p;
    }

    // Only cache successful results so we retry on next request if all sources fail
    if (Object.keys(prices).length > 0) {
      set('prices', cacheKey, prices);
    }

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: {} });
  }
}
