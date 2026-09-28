export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  username: string | null;
  profile_url: string | null;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
  last_synced_at?: number | null;
  in_club?: number;
  created_at: number;
}

export interface Swim {
  id: number;
  athlete_id: number;
  name: string;
  distance_meters: number;
  distance_yards: number;
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  start_date: string; // ISO 8601 UTC
  start_date_local: string;
  start_timestamp: number; // epoch ms
  average_speed: number; // m/s
}

export interface LeaderboardPeriodStats {
  swims: number;
  yards: number;
  movingTimeSeconds: number;
  avgPacePer100YdSeconds: number;
  longestSwimYards: number;
  swimsPerWeek?: number;
  yardsPerWeek?: number;
}

export interface LeaderboardEntry {
  rank: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    username: string | null;
    profile_url: string | null;
    last_synced_at?: number | null;
  };
  currentPeriod: LeaderboardPeriodStats;
  previousPeriod: {
    swims: number;
    yards: number;
    movingTimeSeconds: number;
  };
  delta: {
    swims: number;
    yards: number;
    yardsPercentChange: number | null;
  };
  recentSwims?: Swim[];
}

export type TimeframeOption = 'this_week' | 'challenge' | 'since_last_week' | 'last_week' | 'all_time';
export type MetricOption = 'yards' | 'swims' | 'time';

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
    profile_medium: string;
    profile: string;
  };
}
