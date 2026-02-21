/**
 * Uniswap Developer Platform — Swap Quote Integration
 * ETHDenver Bounty: Uniswap Foundation API ($5,000)
 *
 * AegisOS strategy recommendations now include real Uniswap swap quotes.
 * When the Strategist recommends "reduce ETH exposure", the system fetches
 * live routing data for ETH→USDC swap, giving the user exact amounts,
 * price impact, and best route before signing any approval.
 *
 * Free API key: https://developers.uniswap.org/dashboard
 */

// Correct URL per official docs: https://api-docs.uniswap.org
const UNISWAP_API_URL = 'https://trade-api.uniswap.org/v1';
const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY ?? '';

// Placeholder swapper for server-side quote requests (no execution)
const QUOTE_SWAPPER = '0x0000000000000000000000000000000000000001';

// All mainnet addresses — quotes use chainId 1
export const TOKENS = {
  ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, symbol: 'ETH' },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  symbol: 'USDC' }, // Ethereum mainnet
  WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  symbol: 'WBTC' },
  DAI:  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI' },
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

export interface SwapQuote {
  tokenIn: TokenSymbol;
  tokenOut: TokenSymbol;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  priceImpact: string;
  route: string[];
  gasEstimate: string;
  executionPrice: string;
  mockMode: boolean;
  fetchedAt: string;
}

export interface StrategyQuote {
  action: string;
  quote: SwapQuote;
  recommendation: string;
}

function mockQuote(tokenIn: TokenSymbol, tokenOut: TokenSymbol, amountIn: string): SwapQuote {
  const rates: Record<string, number> = {
    'ETH-USDC': 3480, 'ETH-DAI': 3475, 'WBTC-USDC': 64200,
    'USDC-ETH': 1 / 3480, 'DAI-ETH': 1 / 3475,
  };
  const key = `${tokenIn}-${tokenOut}`;
  const rate = rates[key] ?? 1;
  const inAmount = parseFloat(amountIn);
  const outAmount = (inAmount * rate * 0.997).toFixed(6); // 0.3% fee
  const outMin = (parseFloat(outAmount) * 0.995).toFixed(6); // 0.5% slippage

  return {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut: outAmount,
    amountOutMin: outMin,
    priceImpact: (Math.random() * 0.3 + 0.05).toFixed(3) + '%',
    route: [tokenIn, tokenOut],
    gasEstimate: '0.002 ETH',
    executionPrice: `1 ${tokenIn} = ${rate.toFixed(2)} ${tokenOut}`,
    mockMode: true,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSwapQuote(
  tokenIn: TokenSymbol,
  tokenOut: TokenSymbol,
  amountIn: string
): Promise<SwapQuote> {
  if (!UNISWAP_API_KEY) {
    console.log('[uniswap] mock mode — get free key at developers.uniswap.org/dashboard');
    return mockQuote(tokenIn, tokenOut, amountIn);
  }

  try {
    const tokenInData = TOKENS[tokenIn];
    const tokenOutData = TOKENS[tokenOut];
    const amountInWei = BigInt(
      Math.floor(parseFloat(amountIn) * 10 ** tokenInData.decimals)
    ).toString();

    const res = await fetch(`${UNISWAP_API_URL}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': UNISWAP_API_KEY,
      },
      body: JSON.stringify({
        tokenInChainId: 1,
        tokenOutChainId: 1,
        tokenIn: tokenInData.address,
        tokenOut: tokenOutData.address,
        amount: amountInWei,
        type: 'EXACT_INPUT',
        swapper: QUOTE_SWAPPER,       // required per API docs
        slippageTolerance: 0.5,       // 0.5% — required (or autoSlippage)
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Uniswap API error: ${res.status} — ${errText}`);
    }

    // Per official docs: QuoteResponse { routing, classicQuote?: ClassicQuote, ... }
    // ClassicQuote has: outputAmount (wei string), priceImpact, routeString, gasUseEstimateUSD
    const data = await res.json() as {
      routing: number;  // 0=CLASSIC, 1=DUTCH_LIMIT, 2=DUTCH_V2, etc.
      classicQuote?: {
        outputAmount: string;
        inputAmount?: string;
        priceImpact?: number | string;
        routeString?: string;
        gasUseEstimateUSD?: string;
        blockNumber?: string;
      };
      // Fallback: some response shapes vary
      quote?: {
        outputAmount?: string;
        output?: { amount: string };
        amount?: string;
        priceImpact?: string | number;
        routeString?: string;
        gasUseEstimateUSD?: string;
      };
    };

    // Extract output amount — prefer classicQuote, fall back to legacy quote shapes
    const classicQ = data.classicQuote;
    const legacyQ  = data.quote;

    const rawOutWei =
      classicQ?.outputAmount ??
      legacyQ?.outputAmount ??
      legacyQ?.output?.amount ??
      legacyQ?.amount ??
      '0';

    const outDecimals = tokenOutData.decimals;
    const outAmount = (Number(rawOutWei) / 10 ** outDecimals).toFixed(6);
    const outMin = (parseFloat(outAmount) * 0.995).toFixed(6);

    const priceImpact = classicQ?.priceImpact ?? legacyQ?.priceImpact ?? '0.1';
    const routeString = classicQ?.routeString ?? legacyQ?.routeString ?? `${tokenIn} → ${tokenOut}`;
    const gasUSD = classicQ?.gasUseEstimateUSD ?? legacyQ?.gasUseEstimateUSD ?? '0';

    if (!rawOutWei || rawOutWei === '0' || isNaN(parseFloat(outAmount))) {
      throw new Error(`Uniswap returned invalid output (routing=${data.routing}) — falling back to mock`);
    }

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: outAmount,
      amountOutMin: outMin,
      priceImpact: String(priceImpact),
      route: routeString.split(/\s*(?:->|→|>|\|)\s*/).filter(Boolean),
      gasEstimate: gasUSD !== '0' ? `$${parseFloat(gasUSD).toFixed(2)}` : 'included',
      executionPrice: `1 ${tokenIn} = ${(parseFloat(outAmount) / parseFloat(amountIn)).toFixed(2)} ${tokenOut}`,
      mockMode: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[uniswap] quote failed, using mock:', e);
    return mockQuote(tokenIn, tokenOut, amountIn);
  }
}

// Map strategy recommendations to swap quotes
export async function getStrategyQuotes(
  recommendation: string,
  riskScore: number
): Promise<StrategyQuote[]> {
  const quotes: StrategyQuote[] = [];

  if (recommendation.includes('REDUCE') || riskScore > 65) {
    // Reduce ETH exposure → sell ETH for USDC
    const q = await getSwapQuote('ETH', 'USDC', '0.5');
    quotes.push({
      action: 'Reduce ETH exposure',
      quote: q,
      recommendation: `Swap 0.5 ETH → ${q.amountOut} USDC to reduce concentration risk`,
    });
  }

  if (recommendation.includes('INCREASE') || riskScore < 35) {
    // Increase exposure → buy ETH with USDC
    const q = await getSwapQuote('USDC', 'ETH', '1000');
    quotes.push({
      action: 'Increase ETH exposure',
      quote: q,
      recommendation: `Swap 1000 USDC → ${q.amountOut} ETH to increase exposure`,
    });
  }

  if (recommendation.includes('REBALANCE') || (riskScore >= 35 && riskScore <= 65)) {
    const q = await getSwapQuote('ETH', 'USDC', '0.25');
    quotes.push({
      action: 'Rebalance portfolio',
      quote: q,
      recommendation: `Swap 0.25 ETH → ${q.amountOut} USDC to rebalance`,
    });
  }

  // Always show at least one quote
  if (quotes.length === 0) {
    const q = await getSwapQuote('ETH', 'USDC', '0.1');
    quotes.push({ action: 'Monitor position', quote: q, recommendation: 'Hold — market conditions stable' });
  }

  return quotes;
}
