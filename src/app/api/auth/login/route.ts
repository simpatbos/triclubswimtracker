import { NextRequest, NextResponse } from 'next/server';
import { getStravaAuthUrl, isStravaConfigured } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  // If live credentials are provided in env or settings, redirect to Strava OAuth
  if (isStravaConfigured()) {
    const redirectUri = `${origin}/api/auth/callback`;
    const stravaUrl = getStravaAuthUrl(redirectUri);
    return NextResponse.redirect(stravaUrl);
  }

  // Otherwise, take user directly to the built-in Strava authorization consent screen
  return NextResponse.redirect(`${origin}/auth/strava`);
}
