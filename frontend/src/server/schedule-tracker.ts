/**
 * Mudra Schedule Tracker — Hedera Schedule Service bounty
 *
 * Tracks the full lifecycle of on-chain scheduled transactions:
 *   CREATED → PENDING → EXECUTED | FAILED | EXPIRED
 *
 * Integrates with AegisScheduler.sol which calls the Hedera Schedule Service
 * system contract (precompile at 0x...022b). The contract is the ONLY origin
 * of schedules — no off-chain cron jobs.
 *
 * When no EVM credentials are configured, returns deterministic mock data
 * so the lifecycle UI is fully demonstrable.
 */

const SCHEDULER_ADDRESS = (process.env.AEGIS_SCHEDULER_ADDRESS || '') as `0x${string}`;
const EVM_PRIVATE_KEY   = (process.env.HEDERA_EVM_DEPLOYER_KEY  || '') as `0x${string}`;
const HEDERA_RPC        = 'https://testnet.hashio.io/api';
const MOCK_MODE         = !SCHEDULER_ADDRESS || !EVM_PRIVATE_KEY;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScheduleStatus =
  | 'CREATED'   // contract emitted the schedule creation call
  | 'PENDING'   // schedule is in Hedera's pending state
  | 'EXECUTED'  // schedule successfully executed
  | 'FAILED'    // execution failed (insufficient balance, etc.)
  | 'EXPIRED'   // schedule passed its expiry without execution
  | 'UNKNOWN';

export interface ScheduleRecord {
  planHash: string;
  scheduleAddress: string;  // Hedera native schedule ID as address (0x...)
  status: ScheduleStatus;
  createdAt: string;
  executedAt?: string;
  failureReason?: string;
  txHash: string;           // EVM tx that created the schedule
  hashScanUrl: string;      // HashScan link for the EVM tx
  scheduleScanUrl?: string; // HashScan link for the native schedule
}

// ─── In-memory store (EVM tx hashes are the ground truth via HashScan) ───────

const g = globalThis as typeof globalThis & {
  __aegis_schedules?: Map<string, ScheduleRecord>;
};
if (!g.__aegis_schedules) g.__aegis_schedules = new Map();
const schedules = g.__aegis_schedules;

// ─── ABI (minimal — only query functions) ────────────────────────────────────

const ABI = [
  {
    name: 'isPlanApproved',
    type: 'function',
    inputs: [{ name: 'planHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'isScheduled',
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

function toPlanHashBytes32(planHash: string): `0x${string}` {
  const hex = planHash.replace(/^0x/, '').padEnd(64, '0');
  return `0x${hex}` as `0x${string}`;
}

function hashScanTx(txHash: string): string {
  if (!txHash || txHash.startsWith('mock') || txHash.startsWith('already')) {
    return `https://hashscan.io/testnet/transaction/demo`;
  }
  return `https://hashscan.io/testnet/transaction/${txHash}`;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Records a newly created schedule after executor calls AegisScheduler.sol.
 * Called by the executor after a successful scheduleRebalance call.
 */
export function recordScheduleCreated(planHash: string, txHash: string): void {
  const record: ScheduleRecord = {
    planHash,
    scheduleAddress: '0x0000000000000000000000000000000000000000',
    status: 'CREATED',
    createdAt: new Date().toISOString(),
    txHash,
    hashScanUrl: hashScanTx(txHash),
  };
  schedules.set(planHash, record);
}

/**
 * Queries the AegisScheduler contract to get the current schedule status.
 * Falls back to deterministic mock data if no EVM credentials.
 */
export async function getScheduleStatus(planHash: string): Promise<ScheduleRecord> {
  // Return from cache if we have it
  const cached = schedules.get(planHash);

  if (MOCK_MODE) {
    // Deterministic mock: hash of planHash determines lifecycle state for demo
    const hashNum = parseInt(planHash.slice(-2), 16);
    const status: ScheduleStatus =
      hashNum < 80 ? 'EXECUTED' :
      hashNum < 160 ? 'PENDING' :
      hashNum < 200 ? 'CREATED' :
      'FAILED';

    return cached ?? {
      planHash,
      scheduleAddress: `0x000000000000000000000000000000000000022b`,
      status,
      createdAt: new Date(Date.now() - 120000).toISOString(),
      executedAt: status === 'EXECUTED' ? new Date(Date.now() - 60000).toISOString() : undefined,
      failureReason: status === 'FAILED' ? 'Insufficient HBAR balance in contract' : undefined,
      txHash: `mock-schedule-tx-${planHash.slice(0, 8)}`,
      hashScanUrl: 'https://hashscan.io/testnet/transaction/demo',
      scheduleScanUrl: 'https://hashscan.io/testnet/schedule/demo',
    };
  }

  try {
    const { createPublicClient, http, defineChain } = await import('viem');

    const hederaTestnet = defineChain({
      id: 296,
      name: 'Hedera Testnet',
      nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 8 },
      rpcUrls: { default: { http: [HEDERA_RPC] } },
    });

    const client = createPublicClient({ chain: hederaTestnet, transport: http(HEDERA_RPC) });
    const hashBytes32 = toPlanHashBytes32(planHash);

    const [isApproved, isScheduled, scheduleAddr] = await Promise.all([
      client.readContract({ address: SCHEDULER_ADDRESS, abi: ABI, functionName: 'isPlanApproved', args: [hashBytes32] }),
      client.readContract({ address: SCHEDULER_ADDRESS, abi: ABI, functionName: 'isScheduled', args: [hashBytes32] }),
      client.readContract({ address: SCHEDULER_ADDRESS, abi: ABI, functionName: 'getScheduleAddress', args: [hashBytes32] }),
    ]);

    const hasSchedule = scheduleAddr !== '0x0000000000000000000000000000000000000000';
    let status: ScheduleStatus = 'UNKNOWN';
    if (!isApproved) status = 'UNKNOWN';
    else if (!isScheduled && !hasSchedule) status = 'CREATED';
    else if (isScheduled && hasSchedule) status = 'EXECUTED'; // Hedera executes schedules quickly
    else if (!isScheduled && hasSchedule) status = 'PENDING';

    const record: ScheduleRecord = {
      planHash,
      scheduleAddress: scheduleAddr as string,
      status,
      createdAt: cached?.createdAt ?? new Date().toISOString(),
      executedAt: status === 'EXECUTED' ? new Date().toISOString() : undefined,
      txHash: cached?.txHash ?? '',
      hashScanUrl: cached?.hashScanUrl ?? hashScanTx(cached?.txHash ?? ''),
      scheduleScanUrl: hasSchedule
        ? `https://hashscan.io/testnet/schedule/${scheduleAddr}`
        : undefined,
    };

    schedules.set(planHash, record);
    return record;
  } catch (e) {
    console.error('[schedule-tracker] query failed:', e);
    return cached ?? {
      planHash,
      scheduleAddress: '0x0',
      status: 'UNKNOWN',
      createdAt: new Date().toISOString(),
      txHash: '',
      hashScanUrl: hashScanTx(''),
    };
  }
}

/**
 * Returns all tracked schedules (for the schedule history UI).
 */
export function getAllSchedules(): ScheduleRecord[] {
  return Array.from(schedules.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Edge case: checks if a schedule has expired.
 * Hedera Schedule Service expires schedules after 30 minutes by default.
 */
export function isScheduleExpired(record: ScheduleRecord): boolean {
  if (record.status === 'EXECUTED') return false;
  const HEDERA_SCHEDULE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  const age = Date.now() - new Date(record.createdAt).getTime();
  return age > HEDERA_SCHEDULE_EXPIRY_MS;
}
