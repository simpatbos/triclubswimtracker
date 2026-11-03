import { NextRequest, NextResponse } from 'next/server';
import { getAthleteById } from '@/lib/db';
import {
  syncAthleteSwims,
  syncAllAthletes,
  pruneStaleAthletes,
  StravaDeauthorizedError,
} from '@/lib/strava';

export const dynamic = 'force-dynamic';

let lastPruneAt = 0;

export async function POST(request: NextRequest) {
  try {
    let force = false;
    let syncAll = false;
    try {
      const body = await request.json().catch(() => null);
      if (body?.force) force = true;
      if (body?.syncAll) syncAll = true;
    } catch {
      // ignore json parse error
    }

    // Periodically prune stale or deauthorized athletes (at most once per hour unless forced)
    const now = Date.now();
    let prunedIds: number[] = [];
    if (force || now - lastPruneAt > 60 * 60 * 1000) {
      lastPruneAt = now;
      const pruneRes = await pruneStaleAthletes().catch(err => {
        console.warn('Stale athlete prune warning:', err);
        return { checkedCount: 0, deauthorizedIds: [] };
      });
      prunedIds = pruneRes.deauthorizedIds;
    }

    // Admin/maintenance bulk reconciliation only when explicitly requested
    if (syncAll) {
      const result = await syncAllAthletes(14, force);
      return NextResponse.json({
        success: true,
        syncedAt: Date.now(),
        ...result,
      });
    }

    // Standard user-initiated refresh: ONLY sync the currently authenticated athlete
    const athleteIdCookie = request.cookies.get('athlete_id');
    const athleteId = athleteIdCookie ? parseInt(athleteIdCookie.value, 10) : null;

    if (!athleteId || isNaN(athleteId)) {
      return NextResponse.json({
        success: true,
        syncedAt: Date.now(),
        deauthorizedIds: prunedIds,
        message: 'Activity updates are delivered automatically via Strava Webhooks.',
      });
    }

    const athlete = await getAthleteById(athleteId);
    if (!athlete || athlete.is_manual) {
      return NextResponse.json({
        success: true,
        syncedAt: Date.now(),
        deauthorizedIds: prunedIds,
      });
    }

    // Enforce a 2-minute per-athlete cooldown on manual refresh unless force=true
    if (!force && athlete.last_synced_at && now - athlete.last_synced_at < 2 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        syncedAt: athlete.last_synced_at,
        cached: true,
        message: 'Swims are already up to date.',
      });
    }

    try {
      const syncRes = await syncAthleteSwims(athlete.id, 14);
      return NextResponse.json({
        success: true,
        syncedAt: Date.now(),
        ...syncRes,
        deauthorizedIds: prunedIds,
      });
    } catch (err) {
      if (err instanceof StravaDeauthorizedError) {
        const res = NextResponse.json(
          {
            error: 'Your Strava authorization is no longer active. Please reconnect Strava.',
            deauthorized: true,
          },
          { status: 401 }
        );
        res.cookies.delete('athlete_id');
        return res;
      }
      throw err;
    }
  } catch (err: unknown) {
    console.error('Database sync error:', err);
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
