import { NextResponse } from 'next/server';
import '@/server/events';
import { getEventQueue } from '@/server/events';

export async function GET() {
  return NextResponse.json(getEventQueue());
}
