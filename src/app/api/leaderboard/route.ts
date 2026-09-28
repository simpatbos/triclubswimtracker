import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';
import { TimeframeOption, MetricOption } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') || 'this_week') as TimeframeOption;
    const sortBy = (searchParams.get('sortBy') || 'swims') as MetricOption;
    const startMsParam = searchParams.get('startMs');
    const endMsParam = searchParams.get('endMs');
    const labelParam = searchParams.get('label');
    const sublabelParam = searchParams.get('sublabel');

    const validTimeframes: TimeframeOption[] = [
      'this_week',
      'challenge',
      'since_last_week',
      'last_week',
      'all_time',
    ];
    const validSort: MetricOption[] = ['yards', 'swims', 'time'];

    const safeTimeframe = validTimeframes.includes(timeframe) ? timeframe : 'this_week';
    const safeSort = validSort.includes(sortBy) ? sortBy : 'swims';

    let customRange;
    if (startMsParam && endMsParam) {
      const startMs = parseInt(startMsParam, 10);
      const endMs = parseInt(endMsParam, 10);
      if (!isNaN(startMs) && !isNaN(endMs)) {
        customRange = {
          startMs,
          endMs,
          label: labelParam || 'Custom Week',
          sublabel: sublabelParam || '',
        };
      }
    }

    const data = await getLeaderboard(safeTimeframe, safeSort, customRange);

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
