import type { WatchSignal, StrategyPlan } from '@aegisos/shared';
import { StrategyPlanSchema } from '@aegisos/shared';
import { randomUUID } from 'crypto';

export async function runStrategist(signal: WatchSignal, goal: string): Promise<StrategyPlan> {
  const planId = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { portfolioValue, marketRegime, topPositions, alerts } = signal;

  let riskScore = 20;
  riskScore += alerts.length * 12;
  const maxWeight = topPositions[0]?.weight ?? 0;
  if (maxWeight > 60) riskScore += 20;
  else if (maxWeight > 40) riskScore += 10;
  if (marketRegime === 'volatile' || marketRegime === 'bear') riskScore += 15;
  riskScore = Math.min(riskScore, 95);

  let recommendation: StrategyPlan['recommendation'] = 'HOLD';
  let worstCaseAnalysis = 'Portfolio within normal parameters.';
  let reasoning = '';

  if (alerts.length > 2 || riskScore > 70) {
    recommendation = 'REDUCE_RISK';
    worstCaseAnalysis = 'Multiple risk indicators. Consider reducing exposure to volatile assets.';
    reasoning = `Risk score ${riskScore}. ${alerts.length} alerts. Market regime: ${marketRegime}.`;
  } else if (alerts.length > 0 && portfolioValue > 0) {
    recommendation = 'REBALANCE';
    worstCaseAnalysis = 'Concentration or allocation drift detected. Rebalancing may improve risk profile.';
    reasoning = `Alerts: ${alerts.join('; ')}. Top position: ${topPositions[0]?.symbol ?? 'N/A'} at ${maxWeight.toFixed(1)}%.`;
  } else if (marketRegime === 'bull' && portfolioValue > 0 && riskScore < 50) {
    recommendation = 'INCREASE_EXPOSURE';
    worstCaseAnalysis = 'Bull market with room for growth. Consider incremental exposure increase.';
    reasoning = `Market regime: ${marketRegime}. Risk score ${riskScore}.`;
  } else if (portfolioValue === 0) {
    reasoning = 'Portfolio empty. Add holdings to get recommendations.';
  } else {
    reasoning = `Market: ${marketRegime}. Risk: ${riskScore}. No action needed.`;
  }

  const actions: StrategyPlan['actions'] = [];
  if ((recommendation === 'REBALANCE' || recommendation === 'REDUCE_RISK') && topPositions.length > 0 && maxWeight > 40) {
    const top = topPositions[0];
    if (top) {
      // Calculate tokens to move to bring the top position down to target weight
      const targetWeight = recommendation === 'REDUCE_RISK' ? 35 : 40;
      const excessUsd = Math.max(0, ((maxWeight - targetWeight) / 100) * portfolioValue);
      const pricePerToken = top.amount && top.amount > 0 ? top.valueUsd / top.amount : 0;
      let reduceAmount: string;
      if (pricePerToken > 0) {
        reduceAmount = (excessUsd / pricePerToken).toFixed(4);
      } else if (top.amount && top.amount > 0) {
        reduceAmount = (top.amount * 0.2).toFixed(4);
      } else {
        reduceAmount = '10';
      }
      actions.push({
        type: 'TRANSFER',
        from: 'portfolio',
        to: 'stable',
        amount: reduceAmount,
        token: top.symbol,
      });
    }
  }

  return StrategyPlanSchema.parse({
    planId,
    recommendation,
    riskScore,
    worstCaseAnalysis,
    actions,
    reasoning,
    expiresAt,
  });
}
