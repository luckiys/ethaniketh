/**
 * POST /api/sdk-receipt — create HCS receipt + award HTS loyalty points
 * GET  /api/sdk-receipt — get receipt topic info + loyalty token info
 *
 * Hedera "No Solidity Allowed" bounty.
 * Pure @hashgraph/sdk — zero Solidity, zero EVM.
 * Uses TWO native Hedera capabilities: HCS + HTS.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createSdkReceipt,
  getLoyaltyTokenInfo,
  getReceiptTopicInfo,
} from '@/server/sdk-audit';

export async function GET() {
  const [tokenInfo, topicInfo] = await Promise.all([
    getLoyaltyTokenInfo(),
    getReceiptTopicInfo(),
  ]);

  return NextResponse.json({
    bounty: 'Hedera: No Solidity Allowed',
    description: 'Pure Hedera SDK audit system — HCS receipts + HTS loyalty points. Zero Solidity.',
    nativeCaps: ['HCS (Hedera Consensus Service)', 'HTS (Hedera Token Service)'],
    loyaltyToken: tokenInfo,
    receiptTopic: topicInfo,
    mockMode: tokenInfo.mockMode,
    network: 'hedera-testnet',
    hashScanBase: 'https://hashscan.io/testnet',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'APPROVAL',
      sessionId,
      planId,
      signerAddress,
      hederaRecipientId,
      loyaltyPoints = 100,
    } = body;

    if (!sessionId || !planId) {
      return NextResponse.json({ error: 'sessionId and planId required' }, { status: 400 });
    }

    if (!['APPROVAL', 'REJECTION', 'EXECUTION'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be APPROVAL, REJECTION, or EXECUTION' },
        { status: 400 }
      );
    }

    const result = await createSdkReceipt({
      type,
      sessionId,
      planId,
      signerAddress,
      hederaRecipientId,
      loyaltyPoints: type === 'EXECUTION' ? loyaltyPoints : 0,
    });

    return NextResponse.json({
      ...result,
      bounty: 'Hedera: No Solidity Allowed',
      description: 'HCS receipt created + HTS loyalty points awarded via pure Hedera SDK (no contracts)',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
