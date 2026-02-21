"""
VaR & Volatility API — GARCH-based risk metrics for AegisOS.
Uses Binance OHLCV + arch library. Run: uvicorn var_api:app --host 0.0.0.0 --port 5001
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import numpy as np
import pandas as pd
from arch import arch_model

app = FastAPI(title="AegisOS VaR Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])


class VaRRequest(BaseModel):
    symbols: list[str] = ["BTCUSDT", "ETHUSDT"]
    confidence: float = 0.95
    horizon_days: int = 1


class VaRResponse(BaseModel):
    var_portfolio_pct: float  # Portfolio VaR as % (e.g. 2.5 = 2.5% max loss)
    volatility_annualized: float  # Annualized volatility %
    per_asset: dict[str, dict]  # symbol -> {var_pct, volatility}


async def fetch_binance_klines(symbol: str, limit: int = 100) -> list[list]:
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1d&limit={limit}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


def compute_var(returns: np.ndarray, confidence: float) -> float:
    """Parametric VaR from returns. Returns positive % (max loss at confidence level)."""
    ret_pct = returns * 100
    hist_var = float(np.percentile(ret_pct, (1 - confidence) * 100))
    if len(returns) < 30:
        return abs(hist_var)
    try:
        am = arch_model(ret_pct, vol="GARCH", p=1, q=1, rescale=False)
        res = am.fit(disp="off")
        forecast = res.forecast(horizon=1)
        var_vol = np.sqrt(forecast.variance.values[-1, 0])
        from scipy import stats
        z = stats.norm.ppf(1 - confidence)
        return float(abs(z * var_vol))
    except Exception:
        return abs(hist_var)


def compute_volatility(returns: np.ndarray) -> float:
    """Annualized volatility (365 days for crypto)."""
    if len(returns) < 2:
        return 0.0
    return float(np.std(returns) * np.sqrt(365) * 100)


@app.post("/var", response_model=VaRResponse)
async def compute_var_endpoint(req: VaRRequest):
    per_asset = {}
    returns_list = []

    for symbol in req.symbols:
        try:
            klines = await fetch_binance_klines(symbol)
            if len(klines) < 30:
                continue
            closes = np.array([float(k[4]) for k in klines])
            returns = np.diff(np.log(closes))
            returns_list.append(returns)

            var_pct = compute_var(returns, req.confidence)
            vol = compute_volatility(returns)
            per_asset[symbol] = {"var_pct": round(var_pct, 4), "volatility": round(vol, 2)}
        except Exception as e:
            per_asset[symbol] = {"var_pct": 0, "volatility": 0, "error": str(e)}

    if not returns_list:
        raise HTTPException(status_code=400, detail="No data for symbols")

    # Simple portfolio: equal weight
    min_len = min(len(r) for r in returns_list)
    portfolio_returns = np.mean([r[-min_len:] for r in returns_list], axis=0)
    var_portfolio = compute_var(portfolio_returns, req.confidence)
    vol_portfolio = compute_volatility(portfolio_returns)

    return VaRResponse(
        var_portfolio_pct=round(var_portfolio, 4),
        volatility_annualized=round(vol_portfolio, 2),
        per_asset=per_asset,
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
