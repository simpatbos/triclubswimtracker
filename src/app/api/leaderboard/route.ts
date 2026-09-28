import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';
import { TimeframeOption, MetricOption } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') || 'this_week') as TimeframeOption;
    const sortBy = (searchParams.get('sortBy') || 'yards') as MetricOption;
    const includeDemo = searchParams.get('includeDemo') !== 'false';

    const validTimeframes: TimeframeOption[] = [
      'this_week',
      'since_last_week',
      'last_week',
      'all_time',
    ];
    const validSort: MetricOption[] = ['yards', 'swims', 'time'];

    const safeTimeframe = validTimeframes.includes(timeframe) ? timeframe : 'this_week';
    const safeSort = validSort.includes(sortBy) ? sortBy : 'yards';

    const data = getLeaderboard(safeTimeframe, safeSort, includeDemo);

    return NextResponse.json({
      success: true,
      timeframe: safeTimeframe,
      sortBy: safeSort,
      ...data,
    });
  } catch (err: unknown) {
    console.error('Leaderboard error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
