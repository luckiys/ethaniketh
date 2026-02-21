import type { WalletClient } from 'viem';

const EIP712_DOMAIN = {
  name: 'AegisOS',
  version: '1',
  chainId: 8453, // Base
} as const;

const EIP712_TYPES = {
  Approval: [
    { name: 'planId', type: 'string' },
    { name: 'planHash', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;

export async function signApproval(
  walletClient: WalletClient,
  address: `0x${string}`,
  planId: string,
  planHash: string
): Promise<{ signature: string; address: string; signatureTimestamp: string }> {
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const signature = await walletClient.signTypedData({
    account: address,
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: 'Approval',
    message: { planId, planHash, timestamp },
  });
  return { signature, address, signatureTimestamp: timestamp.toString() };
}
