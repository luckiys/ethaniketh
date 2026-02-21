import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = (await res.json()) as { ethereum?: { usd?: number } };
    const price = data?.ethereum?.usd ?? 0;
    return NextResponse.json({ ethUsd: price });
  } catch {
    return NextResponse.json({ ethUsd: 0 });
  }
}
