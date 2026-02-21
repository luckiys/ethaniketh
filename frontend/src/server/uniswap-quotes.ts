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

const UNISWAP_API_URL = 'https://trade-api.gateway.uniswap.org/v1';
const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY ?? '';

// Well-known token addresses (Base Sepolia + mainnet for quotes)
export const TOKENS = {
  ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, symbol: 'ETH' },
  USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  symbol: 'USDC' }, // Base
  WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  symbol: 'WBTC' }, // mainnet
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
        intent: 'quote',
      }),
    });

    if (!res.ok) throw new Error(`Uniswap API error: ${res.status}`);

    const data = await res.json() as {
      quote: { amount: string };
      priceImpact: string;
      routeString: string;
      gasUseEstimateUSD: string;
    };

    const outDecimals = tokenOutData.decimals;
    const outAmount = (Number(data.quote.amount) / 10 ** outDecimals).toFixed(6);
    const outMin = (parseFloat(outAmount) * 0.995).toFixed(6);

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: outAmount,
      amountOutMin: outMin,
      priceImpact: data.priceImpact,
      route: data.routeString?.split(' > ') ?? [tokenIn, tokenOut],
      gasEstimate: `$${parseFloat(data.gasUseEstimateUSD).toFixed(2)}`,
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
