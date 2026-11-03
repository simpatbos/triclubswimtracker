import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAthleteById } from '@/lib/db';
import { revokeAndDeleteAthlete } from '@/lib/strava';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const athleteIdStr = cookieStore.get('athlete_id')?.value;

    if (!athleteIdStr) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const athleteId = parseInt(athleteIdStr, 10);
    const athlete = await getAthleteById(athleteId);

    if (athlete) {
      // Refreshes token if needed, revokes access on Strava via /oauth/deauthorize
      // (decrementing connected athlete count), and deletes athlete + swims from DB
      await revokeAndDeleteAthlete(athleteId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Account deleted and Strava tracking stopped',
    });
    response.cookies.delete('athlete_id');
    return response;
  } catch (err: unknown) {
    console.error('Delete account error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
