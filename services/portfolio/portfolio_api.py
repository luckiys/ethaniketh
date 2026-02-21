"""
Portfolio Optimization API — PyPortfolioOpt for AegisOS.
Input: holdings + prices + risk preferences.
Output: target weights and suggested actions.
Run: uvicorn portfolio_api:app --host 0.0.0.0 --port 5002
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier
from pypfopt import risk_models, expected_returns

app = FastAPI(title="AegisOS Portfolio Optimization")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])


class OptimizeRequest(BaseModel):
    holdings: list[dict]  # [{symbol, amount, valueUsd}]
    risk_tolerance: float = 0.5  # 0=conservative, 1=aggressive
    horizon_days: int = 90


class OptimizeResponse(BaseModel):
    target_weights: dict[str, float]
    suggested_action: str  # REBALANCE, HOLD, REDUCE_RISK, INCREASE_EXPOSURE
    drift_pct: float  # How far current allocation is from optimal
    sharpe_estimate: float


async def fetch_returns(symbols: list[str], days: int = 90) -> pd.DataFrame:
    """Fetch historical returns from Binance."""
    closes = {}
    for sym in symbols:
        pair = f"{sym}USDT" if sym != "USDT" else "BTCUSDT"
        if sym == "USDT":
            pair = "BTCUSDT"
        try:
            url = f"https://api.binance.com/api/v3/klines?symbol={pair}&interval=1d&limit={days}"
            async with httpx.AsyncClient() as client:
                r = await client.get(url)
                r.raise_for_status()
                klines = r.json()
            prices = [float(k[4]) for k in klines]
            if len(prices) < 10:
                continue
            ret = np.diff(np.log(prices))
            closes[sym] = ret
        except Exception:
            continue

    if not closes:
        raise ValueError("No price data")
    min_len = min(len(v) for v in closes.values())
    df = pd.DataFrame({k: v[-min_len:] for k, v in closes.items()})
    return df


@app.post("/optimize", response_model=OptimizeResponse)
async def optimize_portfolio(req: OptimizeRequest):
    symbols = [h["symbol"] for h in req.holdings if h.get("valueUsd", 0) > 0]
    if len(symbols) < 2:
        return OptimizeResponse(
            target_weights={s: 1.0 for s in symbols} if symbols else {},
            suggested_action="HOLD",
            drift_pct=0,
            sharpe_estimate=0,
        )

    try:
        returns_df = await fetch_returns(symbols, req.horizon_days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mu = expected_returns.mean_historical_return(returns_df)
    S = risk_models.sample_cov(returns_df)

    ef = EfficientFrontier(mu, S)
    if req.risk_tolerance < 0.3:
        ef.efficient_risk(target_volatility=0.15)
    elif req.risk_tolerance > 0.7:
        ef.max_sharpe()
    else:
        ef.efficient_return(target_return=mu.mean() * (1 + req.risk_tolerance * 0.5))

    weights = ef.clean_weights()
    target_weights = {k: round(v, 4) for k, v in weights.items() if v > 0.001}

    total_value = sum(h.get("valueUsd", 0) for h in req.holdings)
    current_weights = {}
    if total_value > 0:
        for h in req.holdings:
            s = h.get("symbol")
            v = h.get("valueUsd", 0)
            if s and v > 0:
                current_weights[s] = v / total_value

    drift = 0.0
    for sym, tw in target_weights.items():
        cw = current_weights.get(sym, 0)
        drift += abs(tw - cw)
    drift_pct = drift * 100

    if drift_pct > 15:
        action = "REBALANCE"
    elif req.risk_tolerance < 0.3 and drift_pct > 5:
        action = "REBALANCE"
    else:
        action = "HOLD"

    try:
        ef_opt = EfficientFrontier(mu, S)
        ef_opt.max_sharpe()
        sharpe = ef_opt.portfolio_performance()[2]
    except Exception:
        sharpe = 0.0

    return OptimizeResponse(
        target_weights=target_weights,
        suggested_action=action,
        drift_pct=round(drift_pct, 2),
        sharpe_estimate=round(float(sharpe), 4),
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
