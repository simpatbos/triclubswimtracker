import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById, getAllAthletes } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let athleteId = Number(body.athlete_id);

    if (!athleteId || isNaN(athleteId)) {
      // Default to the top demo athlete (Sarah Jenkins or first athlete)
      const all = getAllAthletes(true);
      const demoAthlete = all.find(a => a.is_demo) || all[0];
      athleteId = demoAthlete ? demoAthlete.id : 9001;
    }

    const athlete = getAthleteById(athleteId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        username: athlete.username,
        profile_url: athlete.profile_url,
        is_demo: athlete.is_demo,
      },
    });

    response.cookies.set('athlete_id', athlete.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
