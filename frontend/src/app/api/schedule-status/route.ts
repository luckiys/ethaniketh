/**
 * GET  /api/schedule-status?planHash=<hash>  — get lifecycle for one schedule
 * GET  /api/schedule-status                  — list all tracked schedules
 *
 * Hedera Schedule Service bounty — schedule lifecycle tracking.
 * Shows CREATED → PENDING → EXECUTED | FAILED | EXPIRED.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getScheduleStatus,
  getAllSchedules,
  isScheduleExpired,
} from '@/server/schedule-tracker';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const planHash = searchParams.get('planHash');

  if (planHash) {
    const record = await getScheduleStatus(planHash);
    const expired = isScheduleExpired(record);

    // Promote to EXPIRED if it timed out
    const status = expired && record.status !== 'EXECUTED' ? 'EXPIRED' : record.status;

    return NextResponse.json({
      ...record,
      status,
      expired,
      schedulerContract: process.env.AEGIS_SCHEDULER_ADDRESS || '(not deployed)',
      network: 'hedera-testnet',
      precompileAddress: '0x000000000000000000000000000000000000022b',
    });
  }

  const all = getAllSchedules().map((r) => ({
    ...r,
    status: isScheduleExpired(r) && r.status !== 'EXECUTED' ? 'EXPIRED' : r.status,
  }));

  return NextResponse.json({
    schedules: all,
    count: all.length,
    schedulerContract: process.env.AEGIS_SCHEDULER_ADDRESS || '(not deployed)',
    network: 'hedera-testnet',
    precompileAddress: '0x000000000000000000000000000000000000022b',
    description: 'Contract-driven schedule lifecycle — no off-chain cron',
  });
}
