import { NextResponse } from 'next/server';

const FREECRYPTO_API_KEY = process.env.FREECRYPTO_API_KEY || 'o0b5nopkw468adq2ro5y';
const FREECRYPTO_BASE = 'https://api.freecryptoapi.com/v1';

export async function GET() {
  try {
    const res = await fetch(
      `${FREECRYPTO_BASE}/getData?symbol=ETH&apikey=${FREECRYPTO_API_KEY}`,
      { headers: { Authorization: `Bearer ${FREECRYPTO_API_KEY}` } }
    );
    if (!res.ok) throw new Error(`FreeCryptoAPI error: ${res.status}`);
    const data = await res.json();
    const price = data?.price ?? 0;
    return NextResponse.json({ ethUsd: price });
  } catch {
    return NextResponse.json({ ethUsd: 0 });
  }
}
