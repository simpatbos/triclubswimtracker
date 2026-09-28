import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById } from '@/lib/db';
import { syncAthleteSwims } from '@/lib/strava';

export async function POST(request: NextRequest) {
  const athleteIdCookie = request.cookies.get('athlete_id');
  const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

  if (!athleteId || isNaN(athleteId)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const athlete = getAthleteById(athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  try {
    const result = await syncAthleteSwims(athlete.id, 60);
    return NextResponse.json({
      success: true,
      athleteId: athlete.id,
      ...result,
      syncedAt: Date.now(),
    });
  } catch (err: unknown) {
    console.error('Sync error:', err);
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
