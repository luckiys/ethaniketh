/**
 * Hedera Mirror Node API — free, no key, 100 RPS.
 * Use for Hedera balances, token transfers, schedule status.
 * Testnet: https://testnet.mirrornode.hedera.com
 * Mainnet: https://mainnet.mirrornode.hedera.com
 */
const MIRROR_TESTNET = 'https://testnet.mirrornode.hedera.com';
const MIRROR_MAINNET = 'https://mainnet.mirrornode.hedera.com';

const MIRROR_BASE = process.env.HEDERA_NETWORK === 'mainnet' ? MIRROR_MAINNET : MIRROR_TESTNET;

export interface MirrorAccountBalance {
  balance: number;  // HBAR in tinybars, convert with / 1e8
  accountId: string;
}

export interface MirrorTokenBalance {
  tokenId: string;
  balance: number;
  decimals: number;
}

/**
 * Get account balance from Mirror Node.
 * accountId: Hedera format "0.0.12345" or EVM 0x alias.
 */
export async function getAccountBalance(accountIdOrEvm: string): Promise<MirrorAccountBalance | null> {
  try {
    const id = accountIdOrEvm.startsWith('0x') ? accountIdOrEvm : accountIdOrEvm;
    const res = await fetch(`${MIRROR_BASE}/api/v1/accounts/${id}/balance`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { balance?: number; account?: string };
    return {
      balance: data.balance ?? 0,
      accountId: data.account ?? accountIdOrEvm,
    };
  } catch {
    return null;
  }
}

/**
 * Get token balances for an account.
 */
export async function getTokenBalances(accountId: string): Promise<MirrorTokenBalance[]> {
  try {
    const res = await fetch(`${MIRROR_BASE}/api/v1/accounts/${accountId}/tokens`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { tokens?: Array<{ token_id?: string; balance?: number }> };
    const tokens: MirrorTokenBalance[] = [];
    for (const t of data.tokens ?? []) {
      if (t.token_id && t.balance != null) {
        tokens.push({
          tokenId: t.token_id,
          balance: t.balance,
          decimals: 8,
        });
      }
    }
    return tokens;
  } catch {
    return [];
  }
}

/**
 * Get schedule status by schedule ID.
 */
export async function getScheduleStatus(scheduleId: string): Promise<'PENDING' | 'EXECUTED' | 'EXPIRED' | null> {
  try {
    const res = await fetch(`${MIRROR_BASE}/api/v1/schedules/${scheduleId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { executed_timestamp?: string | null; deleted?: boolean };
    if (data.deleted) return 'EXPIRED';
    if (data.executed_timestamp) return 'EXECUTED';
    return 'PENDING';
  } catch {
    return null;
  }
}
