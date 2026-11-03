import { NextRequest, NextResponse, after } from 'next/server';
import {
  syncSingleActivity,
  handleAthleteDeauthorization,
  ensureWebhookSubscription,
  getWebhookSubscriptions,
} from '@/lib/strava';
import { deleteSwim } from '@/lib/db';

/**
 * Strava Webhook Verification (Handshake) & Subscription Status
 * - When Strava sends `hub.mode=subscribe`, verifies `hub.verify_token` and echoes `hub.challenge`.
 * - When called with `?setup=1` or `?status=1`, checks/ensures the Strava push subscription is active.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.STRAVA_VERIFY_TOKEN || 'PURDUE_TRI_SWIM';

  if (mode === 'subscribe') {
    if (token === verifyToken && challenge) {
      return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
    }
    return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
  }

  // Optional status or setup check
  if (searchParams.get('setup') === '1') {
    const callbackUrl = `${request.nextUrl.origin}/api/webhooks/strava`;
    const result = await ensureWebhookSubscription(callbackUrl);
    return NextResponse.json(result, { status: result.subscribed ? 200 : 400 });
  }

  if (searchParams.get('status') === '1') {
    try {
      const subscriptions = await getWebhookSubscriptions();
      return NextResponse.json({
        active: subscriptions.length > 0,
        subscriptions,
      });
    } catch (err) {
      return NextResponse.json(
        { active: false, error: err instanceof Error ? err.message : 'Status check failed' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Strava Webhook Event Notification
 * Handles:
 * 1. Activity events (`object_type === 'activity'`):
 *    - `create` / `update`: fetches the single activity via `GET /api/v3/activities/{id}` and updates DB.
 *    - `delete`: removes the activity from the database.
 * 2. Athlete deauthorization events (`object_type === 'athlete'`):
 *    - When `updates.authorized === 'false'` (or `aspect_type === 'delete'`), immediately removes
 *      the athlete's tokens and Strava data from the database to comply with Strava API Policy
 *      and maintain an accurate connected athlete count.
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    const objectType = event.object_type;
    const aspectType = event.aspect_type;
    const objectId = Number(event.object_id);
    const ownerId = Number(event.owner_id || event.object_id);
    const updates = event.updates || {};

    // 1. Handle Athlete Deauthorization Event
    if (
      objectType === 'athlete' &&
      (updates.authorized === 'false' ||
        updates.authorized === false ||
        aspectType === 'delete' ||
        aspectType === 'deauthorize')
    ) {
      if (ownerId && !isNaN(ownerId)) {
        after(async () => {
          try {
            await handleAthleteDeauthorization(ownerId);
          } catch (err) {
            console.error(`Webhook athlete deauthorization failed for ${ownerId}:`, err);
          }
        });
      }
      return NextResponse.json({ status: 'ATHLETE_DEAUTHORIZED' }, { status: 200 });
    }

    // 2. Handle Activity Create / Update Event
    if (
      objectType === 'activity' &&
      (aspectType === 'create' || aspectType === 'update') &&
      ownerId &&
      objectId
    ) {
      after(async () => {
        try {
          await syncSingleActivity(ownerId, objectId, aspectType);
        } catch (err) {
          console.error(`Webhook sync failed for activity ${objectId}:`, err);
        }
      });
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    // 3. Handle Activity Delete Event
    if (objectType === 'activity' && aspectType === 'delete' && objectId) {
      after(async () => {
        try {
          await deleteSwim(objectId);
        } catch (err) {
          console.error(`Webhook delete failed for activity ${objectId}:`, err);
        }
      });
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    // Strava requires a 200 response within 2 seconds for all webhook events
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 400 });
  }
}
