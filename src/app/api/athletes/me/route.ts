import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAthleteById, deleteAthlete } from '@/lib/db';
import { deauthorizeStrava } from '@/lib/strava';

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
      if (athlete.access_token) {
        // Attempt to deauthorize token on Strava
        await deauthorizeStrava(athlete.access_token);
      }
      // Delete from database (athlete record and all their swims)
      await deleteAthlete(athleteId);
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
