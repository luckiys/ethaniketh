import type { StrategyPlan } from '@aegisos/shared';
import { executeHtsTransfer } from '../hedera';

// ─── Config ─────────────────────────────────────────────────────────────────

const HTS_TOKEN_ID   = process.env.HEDERA_HTS_TOKEN_ID   || '0.0.0';
const DEMO_FROM      = process.env.HEDERA_OPERATOR_ID     || '0.0.0';
const DEMO_TO        = process.env.HEDERA_DEMO_TO_ACCOUNT || '0.0.0';

// AegisScheduler.sol deployed on Hedera EVM testnet
// Set AEGIS_SCHEDULER_ADDRESS after running: cd contracts && npx hardhat run scripts/deploy.ts --network hederaTestnet
const SCHEDULER_ADDRESS = (process.env.AEGIS_SCHEDULER_ADDRESS || '') as `0x${string}`;

// ECDSA private key for signing EVM transactions (NOT the ED25519 Hedera key)
const EVM_PRIVATE_KEY = (process.env.HEDERA_EVM_DEPLOYER_KEY || '') as `0x${string}`;

// Hedera Testnet JSON-RPC relay
const HEDERA_RPC = 'https://testnet.hashio.io/api';

// AegisScheduler ABI (only the functions we call)
const SCHEDULER_ABI = [
  {
    name: 'approvePlan',
    type: 'function',
    inputs: [{ name: 'planHash', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'scheduleRebalance',
    type: 'function',
    inputs: [
      { name: 'planHash', type: 'bytes32' },
      { name: 'token',    type: 'address' },
      { name: 'sender',  type: 'address' },
      { name: 'receiver',type: 'address' },
      { name: 'amount',  type: 'int64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'isScheduled',
    type: 'function',
    inputs: [{ name: 'planHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts a hex plan hash string from the orchestrator (16-char slice of sha256)
 * to a bytes32 value for the contract. Left-pads with zeros.
 */
function toPlanHashBytes32(planHash: string): `0x${string}` {
  const hex = planHash.replace(/^0x/, '').padEnd(64, '0');
  return `0x${hex}` as `0x${string}`;
}

/**
 * Calls approvePlan + scheduleRebalance on the AegisScheduler contract via
 * the Hedera JSON-RPC relay. Returns the schedule EVM address.
 *
 * Falls back gracefully if:
 *   - AEGIS_SCHEDULER_ADDRESS is not set (contract not deployed yet)
 *   - HEDERA_EVM_DEPLOYER_KEY is not set
 *   - The RPC call fails for any reason
 */
async function callSchedulerContract(
  planHash: string,
  tokenAddress: string,
  senderAddress: string,
  receiverAddress: string,
  amount: bigint
): Promise<string | null> {
  if (!SCHEDULER_ADDRESS || !EVM_PRIVATE_KEY) return null;

  try {
    const { createWalletClient, createPublicClient, http } = await import('viem');
    const { privateKeyToAccount } = await import('viem/accounts');
    const { defineChain } = await import('viem');

    const hederaTestnet = defineChain({
      id: 296,
      name: 'Hedera Testnet',
      nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 8 },
      rpcUrls: { default: { http: [HEDERA_RPC] } },
    });

    const account = privateKeyToAccount(EVM_PRIVATE_KEY);

    const walletClient = createWalletClient({
      account,
      chain: hederaTestnet,
      transport: http(HEDERA_RPC),
    });

    const publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http(HEDERA_RPC),
    });

    const hashBytes32 = toPlanHashBytes32(planHash);

    // 1. Record the approval on-chain
    const approveTx = await walletClient.writeContract({
      address: SCHEDULER_ADDRESS,
      abi: SCHEDULER_ABI,
      functionName: 'approvePlan',
      args: [hashBytes32],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // 2. Create the scheduled token transfer via Hedera Schedule Service precompile
    //    Token + account addresses must be Hedera EVM aliases (0x...)
    const scheduleTx = await walletClient.writeContract({
      address: SCHEDULER_ADDRESS,
      abi: SCHEDULER_ABI,
      functionName: 'scheduleRebalance',
      args: [
        hashBytes32,
        tokenAddress as `0x${string}`,
        senderAddress as `0x${string}`,
        receiverAddress as `0x${string}`,
        amount,
      ],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: scheduleTx });

    return receipt.transactionHash;
  } catch (e) {
    console.error('[executor] scheduler contract call failed:', e);
    return null;
  }
}

// ─── Main executor ───────────────────────────────────────────────────────────

export async function runExecutor(
  plan: StrategyPlan,
  approvedPlanHash: string,
  _signature: string
): Promise<{ htsTxId: string; steps: string[] }> {
  const steps: string[] = [];

  for (const action of plan.actions) {
    if (action.type === 'TRANSFER') {
      const amount = Math.floor(parseFloat(String(action.amount)) * 100) || 1;

      // Path A: real HTS transfer (when HTS token is configured)
      if (HTS_TOKEN_ID !== '0.0.0') {
        const txId = await executeHtsTransfer(HTS_TOKEN_ID, DEMO_FROM, DEMO_TO, amount);
        steps.push(`TRANSFER ${action.token}: ${txId}`);
      } else {
        steps.push(`SIMULATED TRANSFER ${action.token} ${action.amount}`);
      }

      // Path B (runs in parallel, independent): schedule the transfer on-chain
      // via AegisScheduler.sol → Hedera Schedule Service precompile.
      // This creates a future-executing on-chain schedule, demonstrating
      // contract-driven automation for the Hedera Schedule Service bounty.
      if (SCHEDULER_ADDRESS && EVM_PRIVATE_KEY) {
        // In production these would be real Hedera EVM alias addresses.
        // For demo we use zero-padded placeholders.
        const tokenEvm  = '0x0000000000000000000000000000000000000001';
        const senderEvm = '0x0000000000000000000000000000000000000002';
        const recvEvm   = '0x0000000000000000000000000000000000000003';

        const scheduleTxHash = await callSchedulerContract(
          approvedPlanHash,
          tokenEvm,
          senderEvm,
          recvEvm,
          BigInt(amount)
        );
        if (scheduleTxHash) {
          steps.push(`SCHEDULED via AegisScheduler: ${scheduleTxHash}`);
        }
      }
    } else {
      steps.push(`SIMULATED ${action.type} ${action.token} ${action.amount}`);
    }
  }

  if (plan.actions.length === 0) {
    steps.push('No actions to execute (HOLD recommendation)');
  }

  const transferStep = steps.find((s) => s.startsWith('TRANSFER'));
  const scheduleStep = steps.find((s) => s.startsWith('SCHEDULED'));
  const htsTxId =
    transferStep  ? (transferStep.split(': ')[1] ?? `mock-hts-${Date.now()}`) :
    scheduleStep  ? (scheduleStep.split(': ')[1] ?? `mock-scheduled-${Date.now()}`) :
    `mock-hts-simulated-${Date.now()}`;

  return { htsTxId, steps };
}
