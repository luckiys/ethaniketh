import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRED_API_KEY = process.env.FRED_API_KEY || '';

// FRED series IDs
const FRED_SERIES: Record<string, string> = {
  FED_FUNDS: 'FEDFUNDS',
  DXY: 'DTWEXBGS',      // Trade-weighted USD
  VIX: 'VIXCLS',        // VIX
  SP500: 'SP500',       // S&P 500
  TREASURY_10Y: 'DGS10',
};

export interface MacroData {
  fedFundsRate?: number;
  dxy?: number;
  vix?: number;
  sp500?: number;
  treasury10y?: number;
  regime: 'risk-on' | 'risk-off' | 'neutral';
}

async function fetchFredSeries(seriesId: string): Promise<number | null> {
  if (!FRED_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { observations?: Array<{ value?: string }> };
    const val = data.observations?.[0]?.value;
    return val ? parseFloat(val) : null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse<MacroData>> {
  const result: MacroData = {
    regime: 'neutral',
  };

  if (!FRED_API_KEY) {
    return NextResponse.json(result);
  }

  const [fedFunds, vix, sp500] = await Promise.all([
    fetchFredSeries(FRED_SERIES.FED_FUNDS),
    fetchFredSeries(FRED_SERIES.VIX),
    fetchFredSeries(FRED_SERIES.SP500),
  ]);

  if (fedFunds != null) result.fedFundsRate = fedFunds;
  if (vix != null) result.vix = vix;
  if (sp500 != null) result.sp500 = sp500;

  if (vix != null) {
    if (vix > 25) result.regime = 'risk-off';
    else if (vix < 15) result.regime = 'risk-on';
  }

  return NextResponse.json(result);
}
