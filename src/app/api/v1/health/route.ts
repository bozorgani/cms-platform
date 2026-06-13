import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';

export async function GET() {
  try {
    const start = Date.now();
    await connectToDatabase();
    return NextResponse.json({
      status: 'ok',
      uptime: process.uptime,
      dbResponseTime: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: (error as Error).message }, { status: 503 });
  }
}
