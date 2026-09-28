import { NextRequest, NextResponse } from 'next/server';
import { syncSingleActivity } from '@/lib/strava';
import { deleteSwim } from '@/lib/db';

/**
 * Strava Webhook Verification (Handshake)
 * Strava makes a GET request when setting up the webhook subscription.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.STRAVA_VERIFY_TOKEN || 'PURDUE_TRI_SWIM';

  if (mode === 'subscribe' && token === verifyToken) {
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Strava Event Notification
 * Strava makes a POST request whenever an athlete uploads, updates, or deletes an activity.
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Check if event is an activity creation or update
    if (event.object_type === 'activity' && (event.aspect_type === 'create' || event.aspect_type === 'update')) {
      const athleteId = event.owner_id;
      const activityId = event.object_id;

      // Sync activity in background
      syncSingleActivity(athleteId, activityId).catch(err => {
        console.error(`Webhook sync failed for activity ${activityId}:`, err);
      });
    } else if (event.object_type === 'activity' && event.aspect_type === 'delete') {
      const activityId = event.object_id;
      await deleteSwim(activityId);
    }

    // Strava requires a 200 response within 2 seconds
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 400 });
  }
}
