import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById } from '@/lib/db';
import { isStravaConfigured } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const athleteIdCookie = request.cookies.get('athlete_id');
  const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

  let athlete = null;
  if (athleteId && !isNaN(athleteId)) {
    const raw = getAthleteById(athleteId);
    if (raw) {
      athlete = {
        id: raw.id,
        firstname: raw.firstname,
        lastname: raw.lastname,
        username: raw.username,
        profile_url: raw.profile_url,
        is_demo: raw.is_demo,
        last_synced_at: raw.last_synced_at,
      };
    }
  }

  return NextResponse.json({
    athlete,
    stravaConfigured: isStravaConfigured(),
  });
}
