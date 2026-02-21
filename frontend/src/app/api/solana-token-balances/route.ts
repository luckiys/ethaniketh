import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

export const dynamic = 'force-dynamic';

const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
const LAMPORTS_PER_SOL = 1e9;

// Minimal map of common Solana token mints to symbols (extend as needed)
const MINT_TO_SYMBOL: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'SOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
};

async function getMintToSymbolMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch('https://token.jup.ag/strict', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return MINT_TO_SYMBOL;
    const list = (await res.json()) as Array<{ address: string; symbol?: string }>;
    const map = { ...MINT_TO_SYMBOL };
    for (const t of list) {
      if (t.symbol) map[t.address] = t.symbol;
    }
    return map;
  } catch {
    return MINT_TO_SYMBOL;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pubkey = searchParams.get('pubkey');
  if (!pubkey || pubkey.length < 32) {
    return NextResponse.json({ tokens: [] });
  }

  try {
    const conn = new Connection(SOLANA_DEVNET_RPC);
    const accounts = await conn.getParsedTokenAccountsByOwner(new PublicKey(pubkey), {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const mintToSymbol = await getMintToSymbolMap();
    const tokens: { symbol: string; amount: number }[] = [];

    for (const { account } of accounts.value) {
      const parsed = account.data?.parsed?.info;
      if (!parsed) continue;
      const amount = parsed.tokenAmount?.uiAmount ?? 0;
      if (amount <= 0) continue;
      const mint = parsed.mint as string;
      const symbol = mintToSymbol[mint] ?? (mint.slice(0, 8) + '…');
      tokens.push({ symbol, amount });
    }

    // Aggregate by symbol
    const bySymbol = new Map<string, number>();
    for (const t of tokens) {
      bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + t.amount);
    }

    const result = Array.from(bySymbol.entries()).map(([symbol, amount]) => ({ symbol, amount }));
    return NextResponse.json({ tokens: result });
  } catch {
    return NextResponse.json({ tokens: [] });
  }
}
