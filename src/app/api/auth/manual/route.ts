import { NextRequest, NextResponse } from 'next/server';
import { createManualAthlete, getManualAthletes, getAthleteById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const manualAthletes = await getManualAthletes();
    return NextResponse.json({
      manualAthletes,
    });
  } catch (err: unknown) {
    console.error('Failed to fetch manual athletes:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch manual athletes';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { athleteId, firstname, lastname, username } = body;

    let athlete;

    if (athleteId) {
      // Existing manual athlete login
      const existing = await getAthleteById(Number(athleteId));
      if (!existing) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
      }
      athlete = existing;
    } else {
      // Create new manual athlete
      if (!firstname || !firstname.trim() || !lastname || !lastname.trim()) {
        return NextResponse.json(
          { error: 'First name and last name are required.' },
          { status: 400 }
        );
      }

      athlete = await createManualAthlete({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username && username.trim() ? username.trim() : null,
      });
    }

    const response = NextResponse.json({
      success: true,
      athlete: {
        id: athlete.id,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        username: athlete.username,
        profile_url: athlete.profile_url,
        in_club: 1,
        is_manual: 1,
        created_at: athlete.created_at,
      },
    });

    // Set HTTP-only cookie for session
    response.cookies.set('athlete_id', athlete.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    console.error('Manual login error:', err);
    const msg = err instanceof Error ? err.message : 'Manual login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
