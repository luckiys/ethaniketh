/**
 * GET  /api/og-explorer           — SDK health + storage registry
 * GET  /api/og-explorer?cid=0x... — lookup single CID
 * POST /api/og-explorer           — batch upload + verify
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkSdkHealth,
  storeAndRegister,
  lookupCid,
  verifyCid,
  batchUpload,
  listRegistry,
} from '@/server/og-tooling';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get('cid');

  if (cid) {
    const entry = lookupCid(cid);
    if (!entry) {
      return NextResponse.json({ error: 'CID not found in registry' }, { status: 404 });
    }
    return NextResponse.json({ bounty: '0G Developer Tooling', entry });
  }

  const [health, registry] = await Promise.all([checkSdkHealth(), Promise.resolve(listRegistry())]);

  return NextResponse.json({
    bounty: '0G Developer Tooling: Storage Explorer + SDK Debugger',
    sdkHealth: health,
    registry,
    tools: {
      'GET /api/og-explorer?cid=0x...': 'Lookup CID metadata',
      'POST /api/og-explorer { action: "store", label, content }': 'Store + register content',
      'POST /api/og-explorer { action: "verify", cid, content }': 'Verify CID integrity',
      'POST /api/og-explorer { action: "batch", items: [{label, content}] }': 'Batch upload',
    },
  });
}

export async function POST(req: NextRequest) {
  let body: {
    action?: string;
    label?: string;
    content?: unknown;
    cid?: string;
    items?: Array<{ label: string; content: unknown }>;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;

  if (action === 'store') {
    if (!body.label || body.content === undefined) {
      return NextResponse.json({ error: 'label and content required' }, { status: 400 });
    }
    const entry = await storeAndRegister(body.label, body.content);
    return NextResponse.json({ bounty: '0G Developer Tooling', action: 'stored', entry });
  }

  if (action === 'verify') {
    if (!body.cid || body.content === undefined) {
      return NextResponse.json({ error: 'cid and content required' }, { status: 400 });
    }
    const result = verifyCid(body.cid, body.content);
    return NextResponse.json({ bounty: '0G Developer Tooling', action: 'verified', ...result });
  }

  if (action === 'batch') {
    if (!body.items?.length) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const result = await batchUpload(body.items);
    return NextResponse.json({ bounty: '0G Developer Tooling', action: 'batch_upload', ...result });
  }

  return NextResponse.json({ error: 'action must be: store | verify | batch' }, { status: 400 });
}
