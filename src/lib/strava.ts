import { Athlete, StravaTokenResponse } from '../types/index';
import {
  getAthleteById,
  getAllAthletes,
  updateAthleteLastSynced,
  upsertAthlete,
  upsertSwim,
  reconcileAthleteSwims,
  getAppSetting,
  combineActivityNames,
  consolidateSwimsInDb,
  purgePreChallengeSwims,
} from './db';
import { metersToYards, parseChallengeStartDate } from './date-utils';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

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

export async function getValidAccessToken(athlete: Athlete): Promise<string> {
  if (!athlete.access_token) {
    throw new Error('No access token available for athlete');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  // If token expires in less than 5 minutes, refresh it
  if (athlete.token_expires_at && athlete.token_expires_at - nowSeconds < 300) {
    if (!athlete.refresh_token) {
      throw new Error('Cannot refresh token: missing refresh token');
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

  return athlete.access_token;
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
  lookbackDays?: number
): Promise<{ syncedCount: number; swimCount: number }> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete) {
    throw new Error(`Athlete ${athleteId} not found`);
  }

  const token = await getValidAccessToken(athlete);

  // Strictly only fetch swims on or after the challenge start date
  const challengeStart = parseChallengeStartDate();
  const challengeStartTimestamp = Math.floor(challengeStart.getTime() / 1000);
  const challengeStartMs = challengeStart.getTime();

  const afterTimestamp =
    lookbackDays !== undefined
      ? Math.max(
          challengeStartTimestamp,
          Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000)
        )
      : challengeStartTimestamp;

  const allActivities: StravaRawActivity[] = [];
  let page = 1;

  while (true) {
    const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}&page=${page}&per_page=100`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.errors?.[0]?.code === 'Inactive') {
          detail = 'Your Strava Developer Application is marked "Inactive" on strava.com/settings/api. Strava requires the application owner account to have an active Strava subscription/developer verification.';
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

  // Reconcile: delete any swims previously saved for this athlete within the challenge window
  // that were deleted, modified away, or consolidated into another record
  const consolidatedIds = consolidatedSwims.map(s => s.id);
  await reconcileAthleteSwims(athleteId, challengeStartMs, consolidatedIds);

  let syncedCount = 0;
  for (const swim of consolidatedSwims) {
    await upsertSwim(swim);
    syncedCount++;
  }

  await updateAthleteLastSynced(athleteId);

  return {
    syncedCount,
    swimCount: consolidatedSwims.length,
  };
}

export interface SyncError {
  athleteId?: number;
  error: string;
}

export interface SyncAllResult {
  totalAthletes: number;
  successCount: number;
  errors: SyncError[];
}

let inFlightSyncAll: Promise<SyncAllResult> | null = null;
let lastSyncAllCompletedAt = 0;

export async function syncAllAthletes(
  lookbackDays?: number,
  force = false
): Promise<SyncAllResult> {
  if (inFlightSyncAll) {
    return inFlightSyncAll;
  }

  const now = Date.now();
  if (!force && now - lastSyncAllCompletedAt < 5000) {
    return { totalAthletes: 0, successCount: 0, errors: [] };
  }

  if (!isStravaConfigured()) {
    await purgePreChallengeSwims();
    await consolidateSwimsInDb();
    return { totalAthletes: 0, successCount: 0, errors: [{ error: 'Strava not configured' }] };
  }

  inFlightSyncAll = (async () => {
    try {
      // Purge any swims logged before challenge kickoff
      await purgePreChallengeSwims();

      const athletes = await getAllAthletes();
      const stravaAthletes = athletes.filter(a => Boolean(a.access_token) && !a.is_manual);
      if (stravaAthletes.length === 0) {
        await consolidateSwimsInDb();
        return { totalAthletes: athletes.length, successCount: 0, errors: [] };
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

      // Guarantee any older swims in DB are also consolidated
      await consolidateSwimsInDb();

      lastSyncAllCompletedAt = Date.now();
      return { totalAthletes: athletes.length, successCount, errors };
    } finally {
      inFlightSyncAll = null;
    }
  })();

  return inFlightSyncAll;
}

/**
 * Sync a single activity (e.g. triggered by a Strava Webhook event when an athlete uploads a swim)
 */
export async function syncSingleActivity(
  athleteId: number,
  activityId: number
): Promise<boolean> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete) return false;

  try {
    // Sync recent swims for this athlete to properly consolidate all activities for that day
    await syncAthleteSwims(athleteId, 14);
    return true;
  } catch (err) {
    console.error(`Failed to sync activity ${activityId} via syncAthleteSwims:`, err);
    return false;
  }
}

export async function deauthorizeStrava(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.strava.com/oauth/deauthorize', {
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



