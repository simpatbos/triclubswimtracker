import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCode, syncAthleteSwims } from '@/lib/strava';
import { upsertAthlete } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = request.nextUrl.origin;

  if (error || !code) {
    const errorMsg = error || 'Authorization was cancelled or failed';
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    const tokenData = await exchangeStravaCode(code);
    const { athlete, access_token, refresh_token, expires_at } = tokenData;

    upsertAthlete({
      id: athlete.id,
      firstname: athlete.firstname || 'Purdue',
      lastname: athlete.lastname || 'Swimmer',
      username: athlete.username || null,
      profile_url: athlete.profile || athlete.profile_medium || null,
      access_token,
      refresh_token,
      token_expires_at: expires_at,
      is_demo: false,
    });

    // Run initial swim sync in the background or await
    try {
      await syncAthleteSwims(athlete.id, 60);
    } catch (syncErr) {
      console.warn('Initial sync warning:', syncErr);
    }

    const response = NextResponse.redirect(`${origin}/?auth_success=1&athlete_id=${athlete.id}`);

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
    console.error('Strava callback error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown OAuth error';
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
  }
}
