import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById, updateAthleteClubStatus } from '@/lib/db';
import { getValidAccessToken, checkAthleteInPurdueClub, syncAthleteSwims, PURDUE_STRAVA_CLUB_ID } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const athleteIdCookie = request.cookies.get('athlete_id');
    const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

    if (!athleteId || isNaN(athleteId)) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const athlete = await getAthleteById(athleteId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    const accessToken = await getValidAccessToken(athlete);
    const inClub = await checkAthleteInPurdueClub(accessToken);

    await updateAthleteClubStatus(athleteId, inClub ? 1 : 0);

    if (inClub) {
      try {
        await syncAthleteSwims(athleteId, 60);
      } catch (syncErr) {
        console.warn('Sync swims after club verification warning:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      inClub,
      clubId: PURDUE_STRAVA_CLUB_ID,
    });
  } catch (err: unknown) {
    console.error('Error verifying club membership:', err);
    const msg = err instanceof Error ? err.message : 'Failed to verify club membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
