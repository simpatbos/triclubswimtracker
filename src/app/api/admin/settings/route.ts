import { NextRequest, NextResponse } from 'next/server';
import { getStravaCredentials } from '@/lib/strava';
import { setAppSetting } from '@/lib/db';

export async function GET() {
  const { clientId, clientSecret } = getStravaCredentials();
  return NextResponse.json({
    configured: Boolean(clientId && clientSecret),
    clientId: clientId || '',
    hasSecret: Boolean(clientSecret),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Both Client ID and Client Secret are required.' },
        { status: 400 }
      );
    }

    setAppSetting('strava_client_id', clientId.trim());
    setAppSetting('strava_client_secret', clientSecret.trim());

    return NextResponse.json({
      success: true,
      message: 'Strava credentials saved successfully! You are ready to connect.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
