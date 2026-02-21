import type { StrategyPlan } from '@mudra/shared';
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
      { name: 'token', type: 'address' },
      { name: 'sender', type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'int64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'scheduleHbarRebalance',
    type: 'function',
    inputs: [
      { name: 'planHash', type: 'bytes32' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint64' },
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
  {
    name: 'isPlanApproved',
    type: 'function',
    inputs: [{ name: 'planHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'getScheduleAddress',
    type: 'function',
    inputs: [{ name: 'planHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
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
 * Calls approvePlan + scheduleHbarRebalance (or scheduleRebalance if HTS token) on the
 * AegisScheduler contract via Hedera JSON-RPC. Returns the tx hash.
 *
 * Uses scheduleHbarRebalance when no HTS token — no token creation needed.
 * Contract must be funded with 0.01 HBAR (done by deploy script).
 */
async function callSchedulerContract(
  planHash: string,
  receiverEvmAddress: `0x${string}`,
  useHbar: boolean,
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

    // 1. Record the approval on-chain (skip if already approved, e.g. retry)
    const alreadyApproved = await publicClient.readContract({
      address: SCHEDULER_ADDRESS,
      abi: SCHEDULER_ABI,
      functionName: 'isPlanApproved',
      args: [hashBytes32],
    });
    if (!alreadyApproved) {
      const approveTx = await walletClient.writeContract({
        address: SCHEDULER_ADDRESS,
        abi: SCHEDULER_ABI,
        functionName: 'approvePlan',
        args: [hashBytes32],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    // 2. Create the scheduled transfer via Hedera Schedule Service
    const scheduleAddr = await publicClient.readContract({
      address: SCHEDULER_ADDRESS,
      abi: SCHEDULER_ABI,
      functionName: 'getScheduleAddress',
      args: [hashBytes32],
    });
    if (scheduleAddr !== '0x0000000000000000000000000000000000000000') {
      return `already-scheduled:${scheduleAddr}`;
    }

    if (useHbar) {
      // scheduleHbarRebalance: 0.01 HBAR = 1e6 tinybars (contract must be funded)
      const hbarAmount = BigInt(1e6); // 0.01 HBAR
      const scheduleTx = await walletClient.writeContract({
        address: SCHEDULER_ADDRESS,
        abi: SCHEDULER_ABI,
        functionName: 'scheduleHbarRebalance',
        args: [hashBytes32, receiverEvmAddress, hbarAmount],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: scheduleTx });
      return receipt.transactionHash;
    }

    // scheduleRebalance (HTS token) — when HEDERA_HTS_TOKEN_EVM is set
    const tokenEvm = process.env.HEDERA_HTS_TOKEN_EVM as `0x${string}` | undefined;
    const senderEvm = receiverEvmAddress; // treasury = deployer
    if (tokenEvm) {
      const scheduleTx = await walletClient.writeContract({
        address: SCHEDULER_ADDRESS,
        abi: SCHEDULER_ABI,
        functionName: 'scheduleRebalance',
        args: [hashBytes32, tokenEvm, senderEvm, receiverEvmAddress, amount],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: scheduleTx });
      return receipt.transactionHash;
    }

    return null;
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
  let scheduleTxHash: string | null = null;

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

      // Path B: schedule once per plan via AegisScheduler (contract holds 0.01 HBAR)
      if (!scheduleTxHash && SCHEDULER_ADDRESS && EVM_PRIVATE_KEY) {
        const { privateKeyToAccount } = await import('viem/accounts');
        const deployerEvm = privateKeyToAccount(EVM_PRIVATE_KEY).address as `0x${string}`;
        const useHbar = !process.env.HEDERA_HTS_TOKEN_EVM;
        scheduleTxHash = await callSchedulerContract(
          approvedPlanHash,
          deployerEvm,
          useHbar,
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
    // Still demonstrate Schedule Service: schedule 0.01 HBAR transfer
    if (SCHEDULER_ADDRESS && EVM_PRIVATE_KEY) {
      const { privateKeyToAccount } = await import('viem/accounts');
      const deployerEvm = privateKeyToAccount(EVM_PRIVATE_KEY).address as `0x${string}`;
      const useHbar = !process.env.HEDERA_HTS_TOKEN_EVM;
      scheduleTxHash = await callSchedulerContract(
        approvedPlanHash,
        deployerEvm,
        useHbar,
        BigInt(1)
      );
      if (scheduleTxHash) {
        steps.push(`SCHEDULED via AegisScheduler: ${scheduleTxHash}`);
      }
    }
  }

  const transferStep = steps.find((s) => s.startsWith('TRANSFER'));
  const scheduleStep = steps.find((s) => s.startsWith('SCHEDULED'));
  const htsTxId =
    transferStep ? (transferStep.split(': ')[1] ?? `mock-hts-${Date.now()}`) :
    scheduleStep ? (scheduleStep.split(': ')[1] ?? `mock-scheduled-${Date.now()}`) :
    `mock-hts-simulated-${Date.now()}`;

  return { htsTxId, steps };
}
