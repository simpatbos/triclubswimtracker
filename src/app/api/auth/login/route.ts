import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl, isStravaConfigured } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isStravaConfigured()) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(
        'Strava App credentials missing. Please set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to enable live Strava OAuth.'
      )}`
    );
  }

  const redirectUri = `${origin}/api/auth/callback`;
  const stravaUrl = getStravaAuthUrl(redirectUri);
  return NextResponse.redirect(stravaUrl);
}
