import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FREECRYPTO_API_KEY = process.env.FREECRYPTO_API_KEY || 'o0b5nopkw468adq2ro5y';
const FREECRYPTO_BASE = 'https://api.freecryptoapi.com/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') ?? 'ETH';
  const symbols = [...new Set(symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const symbolStr = symbols.join(',');
    const res = await fetch(
      `${FREECRYPTO_BASE}/getData?symbol=${symbolStr}&apikey=${FREECRYPTO_API_KEY}`,
      { headers: { Authorization: `Bearer ${FREECRYPTO_API_KEY}` }, cache: 'no-store' }
    );

    if (!res.ok) throw new Error(`FreeCryptoAPI error: ${res.status}`);

    const data = await res.json();

    // API returns a single object for one symbol, array for multiple
    const items: Array<{ symbol?: string; price?: number }> = Array.isArray(data) ? data : [data];

    const prices: Record<string, number> = {};
    for (const item of items) {
      if (item?.symbol && item?.price != null) {
        prices[item.symbol.toUpperCase()] = item.price;
      }
    }

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: {} });
  }
}
