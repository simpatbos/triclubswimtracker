import { Athlete, StravaTokenResponse } from '../types';
import {
  getAthleteById,
  updateAthleteLastSynced,
  upsertAthlete,
  upsertSwim,
  reconcileAthleteSwims,
  getAppSetting,
} from './db';
import { metersToYards } from './date-utils';

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
    scope: 'read,activity:read_all',
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
      throw new Error(`Token refresh failed: ${response.statusText}`);
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
  lookbackDays = 60
): Promise<{ syncedCount: number; swimCount: number }> {
  const athlete = await getAthleteById(athleteId);
  if (!athlete) {
    throw new Error(`Athlete ${athleteId} not found`);
  }

  const token = await getValidAccessToken(athlete);
  const afterTimestamp = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);

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

  // Filter only swim activities
  const swims = allActivities.filter(
    a => a.type === 'Swim' || a.sport_type === 'Swim'
  );

  // Reconcile: delete any swims previously saved for this athlete within the lookback window
  // that were deleted or modified away on Strava
  const swimIds = swims.map(s => s.id);
  await reconcileAthleteSwims(athleteId, afterTimestamp * 1000, swimIds);

  let syncedCount = 0;
  for (const act of swims) {
    const startTimestamp = new Date(act.start_date).getTime();
    const yards = metersToYards(act.distance);

    await upsertSwim({
      id: act.id,
      athlete_id: athleteId,
      name: act.name || 'Purdue Tri Swim Workout',
      distance_meters: act.distance,
      distance_yards: yards,
      moving_time: act.moving_time,
      elapsed_time: act.elapsed_time || act.moving_time,
      start_date: act.start_date,
      start_date_local: act.start_date_local,
      start_timestamp: startTimestamp,
      average_speed: act.average_speed || 0,
    });
    syncedCount++;
  }

  await updateAthleteLastSynced(athleteId);

  return {
    syncedCount,
    swimCount: swims.length,
  };
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

  const token = await getValidAccessToken(athlete);
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch single activity ${activityId}: ${response.statusText}`);
    return false;
  }

  const act = (await response.json()) as StravaRawActivity;

  // Only record if it's a swim
  if (act.type === 'Swim' || act.sport_type === 'Swim') {
    const startTimestamp = new Date(act.start_date).getTime();
    const yards = metersToYards(act.distance);

    await upsertSwim({
      id: act.id,
      athlete_id: athleteId,
      name: act.name || 'Purdue Tri Swim Workout',
      distance_meters: act.distance,
      distance_yards: yards,
      moving_time: act.moving_time,
      elapsed_time: act.elapsed_time || act.moving_time,
      start_date: act.start_date,
      start_date_local: act.start_date_local,
      start_timestamp: startTimestamp,
      average_speed: act.average_speed || 0,
    });

    await updateAthleteLastSynced(athleteId);
    return true;
  }

  return false;
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

export const PURDUE_STRAVA_CLUB_ID = 8497;
export const PURDUE_STRAVA_CLUB_URL = 'https://www.strava.com/clubs/8497';

export interface StravaClubInfo {
  id: number;
  name: string;
  url?: string;
}

/**
 * Check if the athlete is a member of Purdue Triathlon Club on Strava (Club #8497)
 */
export async function checkAthleteInPurdueClub(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${STRAVA_API_BASE}/athlete/clubs`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch athlete clubs: ${response.status} ${response.statusText}`);
      return false;
    }

    const clubs = (await response.json()) as StravaClubInfo[];
    if (!Array.isArray(clubs)) {
      return false;
    }

    return clubs.some(club => club.id === PURDUE_STRAVA_CLUB_ID);
  } catch (err) {
    console.error('Error verifying Purdue Strava club membership:', err);
    return false;
  }
}

