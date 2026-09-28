import { NextResponse } from 'next/server';
import { getCompletedChallengeWeeks } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const weeks = getCompletedChallengeWeeks();
    return NextResponse.json({
      success: true,
      weeks,
    });
  } catch (err: unknown) {
    console.error('Archives error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch archives';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
