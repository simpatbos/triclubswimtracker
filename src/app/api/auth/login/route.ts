import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl, isStravaConfigured } from '@/lib/strava';

export async function GET(request: NextRequest) {
  if (!isStravaConfigured()) {
    return NextResponse.json(
      {
        error: 'STRAVA_NOT_CONFIGURED',
        message: 'Strava API credentials are not set in environment variables.',
        instructions:
          'Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local to enable live Strava OAuth.',
      },
      { status: 400 }
    );
  }

  // Derive redirect URI dynamically from request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;
  const stravaUrl = getStravaAuthUrl(redirectUri);

  return NextResponse.redirect(stravaUrl);
}
