import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById } from '@/lib/db';
import { syncAthleteSwims, syncAllAthletes } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let force = false;
    try {
      const body = await request.json().catch(() => null);
      if (body?.force) force = true;
    } catch {
      // ignore json parse error
    }

    const athleteIdCookie = request.cookies.get('athlete_id');
    const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

    // If an authenticated athlete requested a sync, ensure their profile is refreshed
    if (athleteId && !isNaN(athleteId)) {
      const athlete = await getAthleteById(athleteId);
      if (athlete) {
        try {
          await syncAthleteSwims(athlete.id);
        } catch (err) {
          console.warn(`Authenticated athlete ${athlete.id} sync warning:`, err);
        }
      }
    }

    // Sync all athletes in the club and consolidate activities per day since challenge start
    const result = await syncAllAthletes(undefined, force);

    return NextResponse.json({
      success: true,
      syncedAt: Date.now(),
      ...result,
    });
  } catch (err: unknown) {
    console.error('Database sync error:', err);
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
