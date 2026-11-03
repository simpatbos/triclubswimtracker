import { NextRequest, NextResponse } from 'next/server';
import {
  getStravaCredentials,
  ensureWebhookSubscription,
  getWebhookSubscriptions,
  pruneStaleAthletes,
} from '@/lib/strava';
import { setAppSetting } from '@/lib/db';

export async function GET() {
  const { clientId, clientSecret } = getStravaCredentials();
  let webhookSubscriptions: unknown[] = [];
  if (clientId && clientSecret) {
    try {
      webhookSubscriptions = await getWebhookSubscriptions();
    } catch {
      // ignore if unreachable
    }
  }
  return NextResponse.json({
    configured: Boolean(clientId && clientSecret),
    clientId: clientId || '',
    hasSecret: Boolean(clientSecret),
    webhookActive: webhookSubscriptions.length > 0,
    webhookSubscriptions,
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

    await setAppSetting('strava_client_id', clientId.trim());
    await setAppSetting('strava_client_secret', clientSecret.trim());

    const webhookResult = await ensureWebhookSubscription(`${request.nextUrl.origin}/api/webhooks/strava`);
    const pruneResult = await pruneStaleAthletes().catch(() => ({
      checkedCount: 0,
      deauthorizedIds: [],
    }));

    return NextResponse.json({
      success: true,
      webhook: webhookResult,
      pruned: pruneResult,
      message: 'Strava credentials saved and webhook subscription verified!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
