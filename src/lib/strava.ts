import { Athlete, StravaTokenResponse } from '../types/index';
import {
  getAthleteById,
  getAllAthletes,
  updateAthleteLastSynced,
  upsertAthlete,
  upsertSwim,
  reconcileAthleteSwims,
  getAppSetting,
  setAppSetting,
  combineActivityNames,
  consolidateSwimsInDb,
  purgePreChallengeSwims,
  deleteAthlete,
  clearAthleteTokens,
  deleteSwim,
  getSwimById,
  getAthleteSwimSummary,
} from './db';
import { metersToYards, parseChallengeStartDate } from './date-utils';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const DEFAULT_PRODUCTION_CALLBACK_URL = 'https://swim.simpatbos.com/api/webhooks/strava';

// Stale thresholds to keep connected athlete count low and compliant with Strava capacity policies
const STALE_ZERO_SWIMS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days with 0 swims
const STALE_INACTIVE_SWIM_MS = 45 * 24 * 60 * 60 * 1000; // 45 days since last swim

export class StravaDeauthorizedError extends Error {
  athleteId: number;
  constructor(athleteId: number, message = 'Athlete token is deauthorized or invalid') {
    super(message);
    this.name = 'StravaDeauthorizedError';
    this.athleteId = athleteId;
  }
}

export function getStravaCredentials(): { clientId: string | null; clientSecret: string | null } {
  const clientId = process.env.STRAVA_CLIENT_ID || getAppSetting('strava_client_id');
  const clientSecret = process.env.STRAVA_CLIENT_SECRET || getAppSetting('strava_client_secret');
  return {
    clientId: clientId && clientId !== 'YOUR_STRAVA_CLIENT_ID' ? clientId : null,
    clientSecret: clientSecret && clientSecret !== 'YOUR_STRAVA_CLIENT_SECRET' ? clientSecret : null,
  };
}

export function isStravaConfigured(): boolean {
  const { clientId, clientSecret } = getStravaCredentials();
  return Boolean(clientId && clientSecret);
}

export function getStravaAuthUrl(redirectUri: string, state = 'swimtracker'): string {
  const { clientId } = getStravaCredentials();
  const params = new URLSearchParams({
    client_id: clientId || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'auto',
    scope: 'read,profile:read_all,activity:read_all',
    state,
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getStravaCredentials();

  if (!clientId || !clientSecret) {
    throw new Error('Strava Client ID or Secret is not configured.');
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to exchange Strava code: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as StravaTokenResponse;
  return data;
}

/**
 * Handles an athlete who has deauthorized the application on Strava or whose
 * OAuth token has become permanently invalid/revoked.
 * Per Strava API Policy, removes the athlete and all associated Strava activity data.
 */
export async function handleAthleteDeauthorization(athleteId: number): Promise<void> {
  console.info(`Deauthorizing and removing athlete ${athleteId} due to revoked/invalid Strava authorization.`);
  await deleteAthlete(athleteId);
}

/**
 * Refreshes an athlete's access token if needed.
 * If Strava responds with 400 or 401 (e.g. invalid_grant / revoked refresh token),
 * automatically cleans up and removes the deauthorized athlete so we never poll dead tokens.
 */
export async function getValidAccessToken(athlete: Athlete, forceRefresh = false): Promise<string> {
  if (!athlete.access_token && !athlete.refresh_token) {
    await handleAthleteDeauthorization(athlete.id);
    throw new StravaDeauthorizedError(athlete.id, 'No access or refresh token available for athlete');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsRefresh =
    forceRefresh ||
    !athlete.access_token ||
    !athlete.token_expires_at ||
    athlete.token_expires_at - nowSeconds < 300;

  if (needsRefresh) {
    if (!athlete.refresh_token) {
      await handleAthleteDeauthorization(athlete.id);
      throw new StravaDeauthorizedError(athlete.id, 'Cannot refresh token: missing refresh token');
    }

    const { clientId, clientSecret } = getStravaCredentials();

    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: athlete.refresh_token,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 400 || response.status === 401) {
        await handleAthleteDeauthorization(athlete.id);
        throw new StravaDeauthorizedError(
          athlete.id,
          `Strava token revoked or invalid (${response.status}): athlete removed.`
        );
      }
      throw new Error(`Token refresh failed (${response.status}): ${errText || response.statusText}`);
    }

    const refreshData = await response.json();
    await upsertAthlete({
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      username: athlete.username,
      profile_url: athlete.profile_url,
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      token_expires_at: refreshData.expires_at,
    });

    return refreshData.access_token;
  }

  return athlete.access_token!;
}

/**
 * Authenticated fetch wrapper for Strava API v3 endpoints.
 * Automatically retries once with a forced token refresh on 401, and if still unauthorized,
 * removes the deauthorized athlete from the database.
 */
async function stravaApiFetch(athlete: Athlete, url: string): Promise<Response> {
  let token = await getValidAccessToken(athlete, false);
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Access token may have been revoked or expired early; force a refresh once
    token = await getValidAccessToken(athlete, true);
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await handleAthleteDeauthorization(athlete.id);
      throw new StravaDeauthorizedError(athlete.id, 'Strava API returned 401 after token refresh');
    }
  }

  return response;
}

interface StravaRawActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  start_date: string; // ISO UTC
  start_date_local: string;
  average_speed: number;
}

export async function syncAthleteSwims(
  athleteId: number,
  lookbackDays?: number,
  windowBoundsSec?: { afterSec: number; beforeSec?: number }
): Promise<{ syncedCount: number; swimCount: number }> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete || athlete.is_manual) {
    throw new Error(`Strava athlete ${athleteId} not found`);
  }

  const challengeStart = parseChallengeStartDate();
  const challengeStartTimestamp = Math.floor(challengeStart.getTime() / 1000);
  const challengeStartMs = challengeStart.getTime();

  const afterTimestamp = windowBoundsSec
    ? Math.max(challengeStartTimestamp, windowBoundsSec.afterSec)
    : lookbackDays !== undefined
    ? Math.max(
        challengeStartTimestamp,
        Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000)
      )
    : challengeStartTimestamp;

  const beforeParam = windowBoundsSec?.beforeSec ? `&before=${windowBoundsSec.beforeSec}` : '';

  const allActivities: StravaRawActivity[] = [];
  let page = 1;

  while (true) {
    const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}${beforeParam}&page=${page}&per_page=100`;
    const response = await stravaApiFetch(athlete, url);

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.errors?.[0]?.code === 'Inactive') {
          detail =
            'Your Strava Developer Application is marked "Inactive" on strava.com/settings/api. Strava requires the application owner account to have an active Strava subscription/developer verification.';
        } else if (parsed.message) {
          detail = `${parsed.message} (${JSON.stringify(parsed.errors || [])})`;
        }
      } catch {
        // fallback to raw text
      }
      throw new Error(`Strava API (${response.status}): ${detail}`);
    }

    const activities = (await response.json()) as StravaRawActivity[];
    allActivities.push(...activities);

    if (activities.length < 100 || page >= 5) {
      break;
    }
    page++;
  }

  // Filter only swim activities strictly on or after the challenge kickoff date
  const rawSwims = allActivities.filter(
    a =>
      (a.type === 'Swim' || a.sport_type === 'Swim') &&
      new Date(a.start_date).getTime() >= challengeStartMs
  );

  // Group activities from 1 day into 1 consolidated activity
  const dayGroups = new Map<string, StravaRawActivity[]>();
  for (const act of rawSwims) {
    const dateStr = act.start_date_local || act.start_date;
    const dateKey = dateStr.slice(0, 10);
    if (!dayGroups.has(dateKey)) {
      dayGroups.set(dateKey, []);
    }
    dayGroups.get(dateKey)!.push(act);
  }

  interface ConsolidatedSwim {
    id: number;
    athlete_id: number;
    name: string;
    distance_meters: number;
    distance_yards: number;
    moving_time: number;
    elapsed_time: number;
    start_date: string;
    start_date_local: string;
    start_timestamp: number;
    average_speed: number;
  }

  const consolidatedSwims: ConsolidatedSwim[] = [];

  for (const dayActs of dayGroups.values()) {
    dayActs.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const earliest = dayActs[0];
    const totalMeters = dayActs.reduce((sum, a) => sum + (Number(a.distance) || 0), 0);
    const totalMovingTime = dayActs.reduce((sum, a) => sum + (Number(a.moving_time) || 0), 0);
    const totalElapsedTime = dayActs.reduce(
      (sum, a) => sum + (Number(a.elapsed_time) || Number(a.moving_time) || 0),
      0
    );
    const yards = metersToYards(totalMeters);
    const avgSpeed = totalMovingTime > 0 ? totalMeters / totalMovingTime : 0;
    const name = combineActivityNames(dayActs.map(a => a.name));

    consolidatedSwims.push({
      id: earliest.id,
      athlete_id: athleteId,
      name: name || 'Purdue Tri Swim Workout',
      distance_meters: totalMeters,
      distance_yards: yards,
      moving_time: totalMovingTime,
      elapsed_time: totalElapsedTime,
      start_date: earliest.start_date,
      start_date_local: earliest.start_date_local,
      start_timestamp: new Date(earliest.start_date).getTime(),
      average_speed: avgSpeed,
    });
  }

  // Only reconcile the time window we actually fetched
  const reconcileStartMs = afterTimestamp * 1000;
  if (!windowBoundsSec?.beforeSec) {
    const consolidatedIds = consolidatedSwims.map(s => s.id);
    await reconcileAthleteSwims(athleteId, reconcileStartMs, consolidatedIds);
  }

  let syncedCount = 0;
  for (const swim of consolidatedSwims) {
    await upsertSwim(swim);
    syncedCount++;
  }

  await consolidateSwimsInDb(athleteId);
  await updateAthleteLastSynced(athleteId);

  return {
    syncedCount,
    swimCount: consolidatedSwims.length,
  };
}

/**
 * Webhook-driven single activity sync (`GET /api/v3/activities/{id}`).
 * Instead of polling `/athlete/activities`, fetches the specific activity notified by Strava's webhook.
 */
export async function syncSingleActivity(
  athleteId: number,
  activityId: number,
  aspectType: 'create' | 'update' = 'create'
): Promise<boolean> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete || athlete.is_manual || !athlete.access_token) return false;

  try {
    const url = `${STRAVA_API_BASE}/activities/${activityId}`;
    const response = await stravaApiFetch(athlete, url);

    if (response.status === 404) {
      // Activity was removed or hidden
      await deleteSwim(activityId);
      return true;
    }

    if (!response.ok) {
      console.error(`Failed to fetch single activity ${activityId}: HTTP ${response.status}`);
      return false;
    }

    const activity = (await response.json()) as StravaRawActivity;
    const isSwim = activity.type === 'Swim' || activity.sport_type === 'Swim';
    const challengeStartMs = parseChallengeStartDate().getTime();
    const startTimestamp = new Date(activity.start_date).getTime();

    if (!isSwim || startTimestamp < challengeStartMs) {
      // If an existing swim was edited to a non-swim sport type, remove it from swims table
      if (aspectType === 'update') {
        const existing = await getSwimById(activityId);
        if (existing) {
          await deleteSwim(activityId);
        }
      }
      await updateAthleteLastSynced(athleteId);
      return true;
    }

    const totalMeters = Number(activity.distance) || 0;
    const movingTime = Number(activity.moving_time) || 0;
    const elapsedTime = Number(activity.elapsed_time) || movingTime;
    const yards = metersToYards(totalMeters);
    const avgSpeed = movingTime > 0 ? totalMeters / movingTime : 0;

    // If this is an update to a secondary swim that was previously consolidated into another swim on the same day,
    // re-sync just that single 24h calendar day window so the consolidated total stays exact.
    if (aspectType === 'update') {
      const existingById = await getSwimById(activityId);
      if (!existingById) {
        const dayStartSec = Math.floor(startTimestamp / 1000) - 43200;
        const dayEndSec = Math.floor(startTimestamp / 1000) + 43200;
        await syncAthleteSwims(athleteId, undefined, { afterSec: dayStartSec, beforeSec: dayEndSec });
        return true;
      }
    }

    await upsertSwim({
      id: activity.id,
      athlete_id: athleteId,
      name: (activity.name || '').trim() || 'Purdue Tri Swim Workout',
      distance_meters: totalMeters,
      distance_yards: yards,
      moving_time: movingTime,
      elapsed_time: elapsedTime,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local || activity.start_date,
      start_timestamp: startTimestamp,
      average_speed: avgSpeed,
    });

    // Consolidate if the athlete logged multiple swims on the same calendar day
    await consolidateSwimsInDb(athleteId);
    await updateAthleteLastSynced(athleteId);
    return true;
  } catch (err) {
    if (err instanceof StravaDeauthorizedError) {
      return false;
    }
    console.error(`Failed to sync activity ${activityId} via webhook:`, err);
    return false;
  }
}

/**
 * Sends a deauthorize request to Strava for the given access token.
 */
export async function deauthorizeStrava(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(STRAVA_DEAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: accessToken,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to deauthorize Strava token:', err);
    return false;
  }
}

/**
 * Properly refreshes an athlete's token (if expired) BEFORE calling Strava's
 * `/oauth/deauthorize` endpoint so Strava decrements the app's connected athlete count,
 * then deletes the athlete and their swims from the database.
 */
export async function revokeAndDeleteAthlete(athleteId: number): Promise<void> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete) return;

  if (!athlete.is_manual && (athlete.access_token || athlete.refresh_token)) {
    let tokenToRevoke = athlete.access_token || '';
    try {
      tokenToRevoke = await getValidAccessToken(athlete);
    } catch {
      // If refresh failed with 400/401, athlete is already deauthorized on Strava
    }

    if (tokenToRevoke) {
      await deauthorizeStrava(tokenToRevoke);
    }
  }

  await deleteAthlete(athleteId);
}

/**
 * Proactively manages stale, inactive, and deauthorized athletes to keep the connected
 * Strava athlete count low and ensure no dead tokens remain in the database.
 *
 * - Athletes with missing/broken refresh tokens or `in_club === 0` are deauthorized and cleaned up.
 * - Athletes who connected > 30 days ago and have 0 swims are deauthorized on Strava and removed.
 * - Athletes whose most recent swim was > 45 days ago are deauthorized on Strava and have their tokens cleared.
 * - Athletes whose tokens fail a refresh check (400/401) are automatically removed.
 */
export async function pruneStaleAthletes(): Promise<{
  checkedCount: number;
  deauthorizedIds: number[];
}> {
  const athletes = await getAllAthletes();
  const stravaAthletes = athletes.filter(
    a => !a.is_manual && Boolean(a.access_token || a.refresh_token)
  );

  const now = Date.now();
  const deauthorizedIds: number[] = [];

  for (const athlete of stravaAthletes) {
    try {
      // 1. Missing refresh token or explicitly marked not in club
      if (!athlete.refresh_token || athlete.in_club === 0) {
        if (athlete.access_token) {
          await deauthorizeStrava(athlete.access_token);
        }
        await deleteAthlete(athlete.id);
        deauthorizedIds.push(athlete.id);
        continue;
      }

      // 2. Check activity staleness
      const { swimCount, lastSwimTimestamp } = await getAthleteSwimSummary(athlete.id);
      const accountAgeMs = now - (athlete.created_at || now);

      const isZeroSwimsStale = swimCount === 0 && accountAgeMs > STALE_ZERO_SWIMS_MS;
      const isInactiveSwimmerStale =
        swimCount > 0 &&
        lastSwimTimestamp !== null &&
        accountAgeMs > STALE_INACTIVE_SWIM_MS &&
        now - lastSwimTimestamp > STALE_INACTIVE_SWIM_MS;

      if (isZeroSwimsStale) {
        await revokeAndDeleteAthlete(athlete.id);
        deauthorizedIds.push(athlete.id);
        continue;
      }

      if (isInactiveSwimmerStale) {
        try {
          const validToken = await getValidAccessToken(athlete);
          await deauthorizeStrava(validToken);
        } catch {
          // ignore if already revoked
        }
        await clearAthleteTokens(athlete.id);
        deauthorizedIds.push(athlete.id);
        continue;
      }

      // 3. Verify token validity if currently expired so revoked tokens are immediately purged
      const nowSec = Math.floor(now / 1000);
      if (!athlete.token_expires_at || athlete.token_expires_at <= nowSec) {
        await getValidAccessToken(athlete);
      }
    } catch (err) {
      if (err instanceof StravaDeauthorizedError) {
        deauthorizedIds.push(athlete.id);
      } else {
        console.warn(`Stale check warning for athlete ${athlete.id}:`, err);
      }
    }
  }

  return {
    checkedCount: stravaAthletes.length,
    deauthorizedIds,
  };
}

export interface SyncError {
  athleteId?: number;
  error: string;
}

export interface SyncAllResult {
  totalAthletes: number;
  successCount: number;
  deauthorizedIds?: number[];
  errors: SyncError[];
}

let inFlightSyncAll: Promise<SyncAllResult> | null = null;
let lastSyncAllCompletedAt = 0;

/**
 * Admin / maintenance reconciliation only.
 * Normal activity updates are delivered in real time via Strava webhooks (`/api/webhooks/strava`).
 */
export async function syncAllAthletes(
  lookbackDays = 14,
  force = false
): Promise<SyncAllResult> {
  if (inFlightSyncAll) {
    return inFlightSyncAll;
  }

  const now = Date.now();
  // Minimum 15-minute cooldown for bulk syncs unless forced
  if (!force && now - lastSyncAllCompletedAt < 15 * 60 * 1000) {
    return { totalAthletes: 0, successCount: 0, errors: [] };
  }

  if (!isStravaConfigured()) {
    await purgePreChallengeSwims();
    await consolidateSwimsInDb();
    return { totalAthletes: 0, successCount: 0, errors: [{ error: 'Strava not configured' }] };
  }

  inFlightSyncAll = (async () => {
    try {
      await purgePreChallengeSwims();

      // First prune any stale or deauthorized athletes so we never poll dead/inactive tokens
      const { deauthorizedIds } = await pruneStaleAthletes();

      const athletes = await getAllAthletes();
      const stravaAthletes = athletes.filter(a => Boolean(a.access_token) && !a.is_manual);
      if (stravaAthletes.length === 0) {
        await consolidateSwimsInDb();
        return { totalAthletes: athletes.length, successCount: 0, deauthorizedIds, errors: [] };
      }

      const results = await Promise.allSettled(
        stravaAthletes.map(a => syncAthleteSwims(a.id, lookbackDays))
      );

      let successCount = 0;
      const errors: SyncError[] = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          successCount++;
        } else {
          const errMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          console.warn(`Sync failed for athlete ${stravaAthletes[idx].id}:`, errMsg);
          errors.push({ athleteId: stravaAthletes[idx].id, error: errMsg });
        }
      });

      await consolidateSwimsInDb();

      lastSyncAllCompletedAt = Date.now();
      return { totalAthletes: athletes.length, successCount, deauthorizedIds, errors };
    } finally {
      inFlightSyncAll = null;
    }
  })();

  return inFlightSyncAll;
}

export interface StravaWebhookSubscription {
  id: number;
  application_id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lists active Strava webhook push subscriptions for this application.
 */
export async function getWebhookSubscriptions(): Promise<StravaWebhookSubscription[]> {
  const { clientId, clientSecret } = getStravaCredentials();
  if (!clientId || !clientSecret) return [];

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`${STRAVA_API_BASE}/push_subscriptions?${params.toString()}`);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch webhook subscriptions (${response.status}): ${errText}`);
  }

  return (await response.json()) as StravaWebhookSubscription[];
}

/**
 * Ensures that an active Strava webhook subscription is registered for receiving
 * real-time activity & athlete deauthorization events.
 */
export async function ensureWebhookSubscription(
  callbackUrl = process.env.STRAVA_WEBHOOK_CALLBACK_URL || DEFAULT_PRODUCTION_CALLBACK_URL
): Promise<{ subscribed: boolean; subscriptionId?: number; callbackUrl?: string; error?: string }> {
  try {
    const { clientId, clientSecret } = getStravaCredentials();
    if (!clientId || !clientSecret) {
      return { subscribed: false, error: 'Strava credentials not configured' };
    }

    const existing = await getWebhookSubscriptions();
    if (existing.length > 0) {
      const sub = existing[0];
      await setAppSetting('strava_webhook_subscription_id', String(sub.id));
      return {
        subscribed: true,
        subscriptionId: sub.id,
        callbackUrl: sub.callback_url,
      };
    }

    // Do not attempt to register localhost URLs with Strava's public webhook servers
    if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
      callbackUrl = DEFAULT_PRODUCTION_CALLBACK_URL;
    }

    const verifyToken = process.env.STRAVA_VERIFY_TOKEN || 'PURDUE_TRI_SWIM';
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    });

    const createRes = await fetch(`${STRAVA_API_BASE}/push_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return {
        subscribed: false,
        error: `Failed to create webhook subscription (${createRes.status}): ${errText}`,
      };
    }

    const created = (await createRes.json()) as { id: number };
    await setAppSetting('strava_webhook_subscription_id', String(created.id));

    return {
      subscribed: true,
      subscriptionId: created.id,
      callbackUrl,
    };
  } catch (err) {
    return {
      subscribed: false,
      error: err instanceof Error ? err.message : 'Unknown webhook registration error',
    };
  }
}
