import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VAR_SERVICE_URL = process.env.VAR_SERVICE_URL || 'http://localhost:5001';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbols = (body.symbols as string[]) || ['BTCUSDT', 'ETHUSDT'];
    const confidence = typeof body.confidence === 'number' ? body.confidence : 0.95;

    const res = await fetch(`${VAR_SERVICE_URL}/var`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, confidence }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'VaR service unavailable' }, { status: 503 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'VaR service unavailable' }, { status: 503 });
  }
}
