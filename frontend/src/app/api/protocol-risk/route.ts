import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface ProtocolRiskData {
  tvlChange24h: number;   // % change in total DeFi TVL
  tvlChange7d: number;
  riskScore: number;      // 0-100, higher = riskier
  alerts: string[];
}

export async function GET(): Promise<NextResponse<ProtocolRiskData>> {
  const alerts: string[] = [];
  let tvlChange24h = 0;
  let tvlChange7d = 0;

  try {
    const res = await fetch('https://api.llama.fi/protocols', { cache: 'no-store' });
    if (!res.ok) throw new Error('DeFiLlama unavailable');

    const protocols = (await res.json()) as Array<{
      tvl?: number;
      change_1d?: number;
      change_7d?: number;
      name?: string;
    }>;

    const withTvl = protocols.filter((p) => p.tvl != null && p.tvl > 0);
    const totalTvl = withTvl.reduce((s, p) => s + (p.tvl ?? 0), 0);

    if (totalTvl > 0) {
      tvlChange24h =
        withTvl.reduce((s, p) => s + ((p.change_1d ?? 0) * (p.tvl ?? 0)), 0) / totalTvl;
      tvlChange7d =
        withTvl.reduce((s, p) => s + ((p.change_7d ?? 0) * (p.tvl ?? 0)), 0) / totalTvl;
    }

    if (tvlChange24h < -5) alerts.push(`DeFi TVL down ${tvlChange24h.toFixed(1)}% in 24h — sector stress`);
    if (tvlChange7d < -10) alerts.push(`DeFi TVL down ${tvlChange7d.toFixed(1)}% in 7d — elevated protocol risk`);

    const riskScore = Math.min(
      100,
      Math.round(
        50 +
          (tvlChange24h < 0 ? Math.abs(tvlChange24h) * 2 : 0) +
          (tvlChange7d < 0 ? Math.abs(tvlChange7d) : 0)
      )
    );

    return NextResponse.json({
      tvlChange24h,
      tvlChange7d,
      riskScore,
      alerts,
    });
  } catch {
    return NextResponse.json({
      tvlChange24h: 0,
      tvlChange7d: 0,
      riskScore: 50,
      alerts: ['Protocol risk data unavailable'],
    });
  }
}
