# Bounty: Uniswap Foundation — Developer Platform API

**Sponsor:** Uniswap Foundation
**Prize:** $5,000

## What We Built

AegisOS strategy recommendations now include **live Uniswap swap quotes**. When the Strategist agent recommends "reduce ETH exposure", the system fetches the exact swap route, price impact, and minimum output amount from Uniswap's routing API — giving users real data before signing any approval.

### Integration Points
- Strategy plans include swap quotes for every recommended action
- Risk score drives quote selection: high risk → ETH→USDC quote; low risk → USDC→ETH quote
- Price impact shown so users can make informed decisions

## Demo

```bash
cd frontend && npm run dev

# Direct swap quote
curl "http://localhost:3000/api/swap-quote?tokenIn=ETH&tokenOut=USDC&amount=1.0"

# Strategy-aware quotes (maps recommendation to swap actions)
curl -X POST http://localhost:3000/api/swap-quote \
  -H "Content-Type: application/json" \
  -d '{"recommendation": "REDUCE_ETH", "riskScore": 75}'

# Custom pair
curl -X POST http://localhost:3000/api/swap-quote \
  -H "Content-Type: application/json" \
  -d '{"tokenIn": "WBTC", "tokenOut": "USDC", "amount": "0.1"}'
```

## Free Setup
1. Go to [developers.uniswap.org/dashboard](https://developers.uniswap.org/dashboard)
2. Create free account → Get API key
3. Add to `.env.local`: `UNISWAP_API_KEY=your-key`
4. Restart — live Uniswap V3/V4 routing quotes enabled

Mock mode: realistic prices, no API key needed.
