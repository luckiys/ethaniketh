import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Blockscout API base URLs (no API key required)
const BLOCKSCOUT_BY_CHAIN: Record<number, string> = {
  1: 'https://eth.blockscout.com/api/v2',
  11155111: 'https://eth-sepolia.blockscout.com/api/v2',
  8453: 'https://base.blockscout.com/api/v2',
  84532: 'https://base-sepolia.blockscout.com/api/v2',
  137: 'https://polygon.blockscout.com/api/v2',
  42161: 'https://arbitrum.blockscout.com/api/v2',
  421614: 'https://arbitrum-sepolia.blockscout.com/api/v2',
  10: 'https://optimism.blockscout.com/api/v2',
  11155420: 'https://optimism-sepolia.blockscout.com/api/v2',
};

export interface TokenBalanceItem {
  symbol: string;
  amount: number;
  decimals: number;
  chainId: number;
}

async function fetchChainTokenBalances(
  baseUrl: string,
  address: string,
  chainId: number
): Promise<TokenBalanceItem[]> {
  const results: TokenBalanceItem[] = [];
  let nextPage: Record<string, string> | null = {};

  do {
    const params = new URLSearchParams(nextPage as Record<string, string>);
    const url = `${baseUrl}/addresses/${address}/token-balances?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) break;

    type TokenBalanceEntry = { value: string; token?: { symbol?: string; decimals?: string; type?: string } };
    const data = (await res.json()) as TokenBalanceEntry[] | { items?: TokenBalanceEntry[]; next_page_params?: Record<string, string> };

    const items = Array.isArray(data) ? data : (data as { items?: TokenBalanceEntry[] })?.items ?? [];
    for (const item of items) {
      const token = item.token;
      const symbol = token?.symbol?.trim()?.toUpperCase();
      const tokenType = token?.type ?? '';
      if (!symbol || tokenType === 'ERC-721' || tokenType === 'ERC-1155') continue;
      const decimals = parseInt(String(token?.decimals ?? 18), 10) || 18;
      const rawValue = BigInt(item.value ?? '0');
      if (rawValue <= BigInt(0)) continue;
      const amount = Number(rawValue) / Math.pow(10, decimals);
      if (amount <= 0) continue;
      results.push({ symbol, amount, decimals, chainId });
    }
    nextPage = (data as { next_page_params?: Record<string, string> })?.next_page_params ?? null;
  } while (nextPage && Object.keys(nextPage).length > 0);

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ tokens: [] });
  }

  const chainIdsParam = searchParams.get('chainIds');
  const chainIds = chainIdsParam
    ? chainIdsParam.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !isNaN(c) && BLOCKSCOUT_BY_CHAIN[c])
    : Object.keys(BLOCKSCOUT_BY_CHAIN).map(Number);

  const allTokens: TokenBalanceItem[] = [];
  await Promise.all(
    chainIds.map(async (chainId) => {
      const baseUrl = BLOCKSCOUT_BY_CHAIN[chainId];
      if (!baseUrl) return;
      try {
        const items = await fetchChainTokenBalances(baseUrl, address, chainId);
        allTokens.push(...items);
      } catch {
        // skip chain on error
      }
    })
  );

  // Aggregate by symbol (same token on multiple chains)
  const bySymbol = new Map<string, { amount: number; decimals: number }>();
  for (const t of allTokens) {
    const existing = bySymbol.get(t.symbol);
    if (existing) {
      existing.amount += t.amount;
    } else {
      bySymbol.set(t.symbol, { amount: t.amount, decimals: t.decimals });
    }
  }

  const tokens = Array.from(bySymbol.entries()).map(([symbol, { amount, decimals }]) => ({
    symbol,
    amount,
    decimals,
  }));

  return NextResponse.json({ tokens });
}
