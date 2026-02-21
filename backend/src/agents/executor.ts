import type { StrategyPlan } from '@mudra/shared';
import { executeHtsTransfer } from '../hedera.js';

const HTS_TOKEN_ID = process.env.HEDERA_HTS_TOKEN_ID || '0.0.0';
const DEMO_FROM_ACCOUNT = process.env.HEDERA_OPERATOR_ID || '0.0.0';
const DEMO_TO_ACCOUNT = process.env.HEDERA_DEMO_TO_ACCOUNT || '0.0.0';

export async function runExecutor(
  plan: StrategyPlan,
  approvedPlanHash: string,
  _signature: string
): Promise<{ htsTxId: string; steps: string[] }> {
  const steps: string[] = [];

  for (const action of plan.actions) {
    if (action.type === 'TRANSFER' && HTS_TOKEN_ID !== '0.0.0') {
      const amount = Math.floor(parseFloat(String(action.amount)) * 100) || 1;
      const txId = await executeHtsTransfer(
        HTS_TOKEN_ID,
        DEMO_FROM_ACCOUNT,
        DEMO_TO_ACCOUNT,
        amount
      );
      steps.push(`TRANSFER ${action.token}: ${txId}`);
    } else {
      steps.push(`SIMULATED ${action.type} ${action.token} ${action.amount}`);
    }
  }

  if (plan.actions.length === 0) {
    steps.push('No actions to execute (HOLD recommendation)');
  }

  const htsTxId = steps.find((s) => s.startsWith('TRANSFER'))
    ? steps[0].split(': ')[1] ?? ''
    : steps[0] ?? '';

  return { htsTxId, steps };
}
