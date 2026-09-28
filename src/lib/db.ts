import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Athlete, Swim, LeaderboardEntry, TimeframeOption, MetricOption } from '../types';
import { getDateRangeForOption, getChallengeBounds, getWeeklyComparisonWindow, getCompletedChallengeWeeks } from './date-utils';

declare global {
  var __libsql_client: Client | undefined;
  var __db_initialized: boolean | undefined;
}

const appSettingsCache: Record<string, string> = {};
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!global.__libsql_client) {
    const isTurso = Boolean(process.env.TURSO_DATABASE_URL);
    let url = process.env.TURSO_DATABASE_URL;

    if (!isTurso) {
      const dbDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) {
        try {
          fs.mkdirSync(dbDir, { recursive: true });
        } catch {
          // ignore if read-only
        }
      }
      url = `file:${path.join(dbDir, 'swimtracker.db')}`;
    }

    global.__libsql_client = createClient({
      url: url!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return global.__libsql_client;
}

export async function ensureDbInitialized(): Promise<void> {
  if (global.__db_initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const client = getDb();
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS athletes (
          id INTEGER PRIMARY KEY,
          firstname TEXT NOT NULL,
          lastname TEXT NOT NULL,
          username TEXT,
          profile_url TEXT,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at INTEGER,
          last_synced_at INTEGER,
          in_club INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS swims (
          id INTEGER PRIMARY KEY,
          athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          distance_meters REAL NOT NULL,
          distance_yards REAL NOT NULL,
          moving_time INTEGER NOT NULL,
          elapsed_time INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          start_date_local TEXT NOT NULL,
          start_timestamp INTEGER NOT NULL,
          average_speed REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_swims_athlete_time ON swims(athlete_id, start_timestamp);
        CREATE INDEX IF NOT EXISTS idx_swims_time ON swims(start_timestamp);
      `);

      try {
        await client.execute(`ALTER TABLE athletes ADD COLUMN in_club INTEGER DEFAULT 1;`);
      } catch {
        // column already exists
      }

      try {
        const settingsRes = await client.execute('SELECT key, value FROM app_settings');
        for (const row of settingsRes.rows) {
          if (row.key && row.value) {
            appSettingsCache[String(row.key)] = String(row.value);
          }
        }
      } catch {
        // ignore
      }

      global.__db_initialized = true;
    })();
  }
  return initPromise;
}

export async function getAllAthletes(onlyClubMembers = true): Promise<Athlete[]> {
  await ensureDbInitialized();
  const client = getDb();
  const sql = onlyClubMembers
    ? 'SELECT * FROM athletes WHERE in_club = 1 OR in_club IS NULL ORDER BY firstname ASC'
    : 'SELECT * FROM athletes ORDER BY firstname ASC';
  const res = await client.execute(sql);
  return res.rows.map(row => ({
    id: Number(row.id),
    firstname: String(row.firstname || ''),
    lastname: String(row.lastname || ''),
    username: row.username ? String(row.username) : null,
    profile_url: row.profile_url ? String(row.profile_url) : null,
    access_token: String(row.access_token || ''),
    refresh_token: String(row.refresh_token || ''),
    token_expires_at: Number(row.token_expires_at || 0),
    last_synced_at: row.last_synced_at ? Number(row.last_synced_at) : null,
    in_club: row.in_club !== undefined && row.in_club !== null ? Number(row.in_club) : 1,
    created_at: Number(row.created_at || Date.now()),
  }));
}

export async function getAthleteById(id: number): Promise<Athlete | null> {
  await ensureDbInitialized();
  const client = getDb();
  const res = await client.execute({
    sql: 'SELECT * FROM athletes WHERE id = ?',
    args: [id],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: Number(row.id),
    firstname: String(row.firstname || ''),
    lastname: String(row.lastname || ''),
    username: row.username ? String(row.username) : null,
    profile_url: row.profile_url ? String(row.profile_url) : null,
    access_token: String(row.access_token || ''),
    refresh_token: String(row.refresh_token || ''),
    token_expires_at: Number(row.token_expires_at || 0),
    last_synced_at: row.last_synced_at ? Number(row.last_synced_at) : null,
    in_club: row.in_club !== undefined && row.in_club !== null ? Number(row.in_club) : 1,
    created_at: Number(row.created_at || Date.now()),
  };
}

export async function updateAthleteClubStatus(id: number, inClub: number): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: 'UPDATE athletes SET in_club = ? WHERE id = ?',
    args: [inClub, id],
  });
}

export async function upsertAthlete(athlete: {
  id: number;
  firstname: string;
  lastname: string;
  username: string | null;
  profile_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  in_club?: number;
}): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: `
      INSERT INTO athletes (
        id, firstname, lastname, username, profile_url,
        access_token, refresh_token, token_expires_at, in_club, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        firstname = excluded.firstname,
        lastname = excluded.lastname,
        username = excluded.username,
        profile_url = excluded.profile_url,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        in_club = COALESCE(excluded.in_club, athletes.in_club, 1)
    `,
    args: [
      athlete.id,
      athlete.firstname,
      athlete.lastname,
      athlete.username,
      athlete.profile_url,
      athlete.access_token,
      athlete.refresh_token,
      athlete.token_expires_at,
      athlete.in_club !== undefined ? athlete.in_club : 1,
      Date.now(),
    ],
  });
}

export async function updateAthleteLastSynced(id: number): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: 'UPDATE athletes SET last_synced_at = ? WHERE id = ?',
    args: [Date.now(), id],
  });
}

export async function deleteAthlete(id: number): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.batch([
    { sql: 'DELETE FROM swims WHERE athlete_id = ?', args: [id] },
    { sql: 'DELETE FROM athletes WHERE id = ?', args: [id] },
  ]);
}

export async function upsertSwim(swim: {
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
}): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: `
      INSERT INTO swims (
        id, athlete_id, name, distance_meters, distance_yards,
        moving_time, elapsed_time, start_date, start_date_local,
        start_timestamp, average_speed
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        distance_meters = excluded.distance_meters,
        distance_yards = excluded.distance_yards,
        moving_time = excluded.moving_time,
        elapsed_time = excluded.elapsed_time,
        average_speed = excluded.average_speed
    `,
    args: [
      swim.id,
      swim.athlete_id,
      swim.name,
      swim.distance_meters,
      swim.distance_yards,
      swim.moving_time,
      swim.elapsed_time,
      swim.start_date,
      swim.start_date_local,
      swim.start_timestamp,
      swim.average_speed,
    ],
  });
}

export async function deleteSwim(swimId: number): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: 'DELETE FROM swims WHERE id = ?',
    args: [swimId],
  });
}

export async function reconcileAthleteSwims(
  athleteId: number,
  afterTimestampMs: number,
  currentSwimIds: number[]
): Promise<void> {
  await ensureDbInitialized();
  const client = getDb();
  if (currentSwimIds.length === 0) {
    await client.execute({
      sql: 'DELETE FROM swims WHERE athlete_id = ? AND start_timestamp >= ?',
      args: [athleteId, afterTimestampMs],
    });
  } else {
    const placeholders = currentSwimIds.map(() => '?').join(',');
    await client.execute({
      sql: `DELETE FROM swims WHERE athlete_id = ? AND start_timestamp >= ? AND id NOT IN (${placeholders})`,
      args: [athleteId, afterTimestampMs, ...currentSwimIds],
    });
  }
}

export async function getAthleteSwims(athleteId: number, limit = 30): Promise<Swim[]> {
  await ensureDbInitialized();
  const client = getDb();
  const res = await client.execute({
    sql: `
      SELECT * FROM swims
      WHERE athlete_id = ?
      ORDER BY start_timestamp DESC
      LIMIT ?
    `,
    args: [athleteId, limit],
  });
  return res.rows.map(row => ({
    id: Number(row.id),
    athlete_id: Number(row.athlete_id),
    name: String(row.name || ''),
    distance_meters: Number(row.distance_meters || 0),
    distance_yards: Number(row.distance_yards || 0),
    moving_time: Number(row.moving_time || 0),
    elapsed_time: Number(row.elapsed_time || 0),
    start_date: String(row.start_date || ''),
    start_date_local: String(row.start_date_local || ''),
    start_timestamp: Number(row.start_timestamp || 0),
    average_speed: Number(row.average_speed || 0),
  }));
}

export async function getLeaderboard(
  timeframe: TimeframeOption = 'this_week',
  sortBy: MetricOption = 'swims',
  customRange?: {
    startMs: number;
    endMs: number;
    label: string;
    sublabel: string;
  }
): Promise<{
  leaderboard: LeaderboardEntry[];
  summary: {
    totalYards: number;
    totalSwims: number;
    totalDurationSeconds: number;
    activeAthletes: number;
    periodLabel: string;
    sublabel: string;
    delta?: {
      swims: number;
      yards: number;
    };
  };
}> {
  await ensureDbInitialized();
  const client = getDb();
  const dateRanges = getDateRangeForOption(timeframe);
  const current = customRange ?? dateRanges.current;
  const comparison = customRange
    ? {
        startMs: customRange.startMs - (customRange.endMs - customRange.startMs + 1),
        endMs: customRange.startMs - 1,
        label: 'Prior Period',
        sublabel: '',
      }
    : dateRanges.comparison;

  const { challengeWeeksCount } = getChallengeBounds();
  const comparisonWindow = getWeeklyComparisonWindow();

  const athletes = await getAllAthletes();

  let clubTotalYards = 0;
  let clubTotalSwims = 0;
  let clubTotalTime = 0;
  let activeAthletesCount = 0;

  const entries: LeaderboardEntry[] = await Promise.all(
    athletes.map(async athlete => {
      const [currentStatsRes, prevStatsRes] = await Promise.all([
        client.execute({
          sql: `
            SELECT
              COUNT(*) as swims,
              COALESCE(SUM(distance_yards), 0) as yards,
              COALESCE(SUM(moving_time), 0) as movingTimeSeconds,
              COALESCE(MAX(distance_yards), 0) as longestSwimYards
            FROM swims
            WHERE athlete_id = ?
              AND start_timestamp >= ?
              AND start_timestamp <= ?
          `,
          args: [athlete.id, current.startMs, current.endMs],
        }),
        client.execute({
          sql: `
            SELECT
              COUNT(*) as swims,
              COALESCE(SUM(distance_yards), 0) as yards,
              COALESCE(SUM(moving_time), 0) as movingTimeSeconds
            FROM swims
            WHERE athlete_id = ?
              AND start_timestamp >= ?
              AND start_timestamp <= ?
          `,
          args: [athlete.id, comparison.startMs, comparison.endMs],
        }),
      ]);

      const cRow = currentStatsRes.rows[0];
      const pRow = prevStatsRes.rows[0];

      const currentStats = {
        swims: Number(cRow?.swims || 0),
        yards: Number(cRow?.yards || 0),
        movingTimeSeconds: Number(cRow?.movingTimeSeconds || 0),
        longestSwimYards: Number(cRow?.longestSwimYards || 0),
      };

      const prevStats = {
        swims: Number(pRow?.swims || 0),
        yards: Number(pRow?.yards || 0),
        movingTimeSeconds: Number(pRow?.movingTimeSeconds || 0),
      };

      const avgPace =
        currentStats.yards > 0
          ? Math.round((currentStats.movingTimeSeconds / currentStats.yards) * 100)
          : 0;

      let swimsDelta = currentStats.swims - prevStats.swims;

      if (!customRange && timeframe === 'this_week') {
        const [lastWeekCompletedRes, lastWeekThroughTodayRes] = await Promise.all([
          comparisonWindow.lastWeekCompletedDaysEndMs >= comparisonWindow.lastWeekStartMs
            ? client.execute({
                sql: `
                  SELECT COUNT(*) as count
                  FROM swims
                  WHERE athlete_id = ?
                    AND start_timestamp >= ?
                    AND start_timestamp <= ?
                `,
                args: [
                  athlete.id,
                  comparisonWindow.lastWeekStartMs,
                  comparisonWindow.lastWeekCompletedDaysEndMs,
                ],
              })
            : Promise.resolve({ rows: [{ count: 0 }] }),
          client.execute({
            sql: `
              SELECT COUNT(*) as count
              FROM swims
              WHERE athlete_id = ?
                AND start_timestamp >= ?
                AND start_timestamp <= ?
            `,
            args: [
              athlete.id,
              comparisonWindow.lastWeekStartMs,
              comparisonWindow.lastWeekThroughTodayEndMs,
            ],
          }),
        ]);

        const lastWeekCompletedSwims = Number(lastWeekCompletedRes.rows[0]?.count || 0);
        const lastWeekThroughTodaySwims = Number(lastWeekThroughTodayRes.rows[0]?.count || 0);

        if (currentStats.swims > lastWeekThroughTodaySwims) {
          swimsDelta = currentStats.swims - lastWeekThroughTodaySwims;
        } else if (currentStats.swims < lastWeekCompletedSwims) {
          swimsDelta = currentStats.swims - lastWeekCompletedSwims;
        } else {
          swimsDelta = 0;
        }
      }

      const yardsDelta = currentStats.yards - prevStats.yards;
      const yardsPercentChange =
        prevStats.yards > 0
          ? Math.round(((currentStats.yards - prevStats.yards) / prevStats.yards) * 100)
          : null;

      const challengeWeeks =
        (timeframe === 'challenge' || timeframe === 'all_time') && !customRange
          ? Math.max(1, challengeWeeksCount)
          : 1;
      const swimsPerWeek = currentStats.swims / challengeWeeks;
      const yardsPerWeek = Math.round(currentStats.yards / challengeWeeks);

      return {
        rank: 0,
        athlete: {
          id: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          username: athlete.username,
          profile_url: athlete.profile_url,
          last_synced_at: athlete.last_synced_at,
        },
        currentPeriod: {
          swims: currentStats.swims,
          yards: Math.round(currentStats.yards),
          movingTimeSeconds: currentStats.movingTimeSeconds,
          avgPacePer100YdSeconds: avgPace,
          longestSwimYards: Math.round(currentStats.longestSwimYards),
          swimsPerWeek: Math.round(swimsPerWeek * 10) / 10,
          yardsPerWeek,
        },
        previousPeriod: {
          swims: prevStats.swims,
          yards: Math.round(prevStats.yards),
          movingTimeSeconds: prevStats.movingTimeSeconds,
        },
        delta: {
          swims: swimsDelta,
          yards: Math.round(yardsDelta),
          yardsPercentChange,
        },
      };
    })
  );

  for (const entry of entries) {
    if (entry.currentPeriod.swims > 0) {
      activeAthletesCount++;
    }
    clubTotalYards += entry.currentPeriod.yards;
    clubTotalSwims += entry.currentPeriod.swims;
    clubTotalTime += entry.currentPeriod.movingTimeSeconds;
  }

  // Sort by swims (default) or yards
  entries.sort((a, b) => {
    if (sortBy === 'yards') {
      if (b.currentPeriod.yards !== a.currentPeriod.yards) {
        return b.currentPeriod.yards - a.currentPeriod.yards;
      }
      return b.currentPeriod.swims - a.currentPeriod.swims;
    }
    // Default: swims
    if (b.currentPeriod.swims !== a.currentPeriod.swims) {
      return b.currentPeriod.swims - a.currentPeriod.swims;
    }
    return b.currentPeriod.yards - a.currentPeriod.yards;
  });

  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // Calculate community club totals delta
  const prevClubStatsRes = await client.execute({
    sql: `
      SELECT
        COUNT(*) as swims,
        COALESCE(SUM(distance_yards), 0) as yards
      FROM swims
      WHERE start_timestamp >= ? AND start_timestamp <= ?
    `,
    args: [comparison.startMs, comparison.endMs],
  });

  const prevClubRow = prevClubStatsRes.rows[0];
  const prevClubSwims = Number(prevClubRow?.swims || 0);
  const prevClubYards = Number(prevClubRow?.yards || 0);

  let clubSwimsDelta = clubTotalSwims - prevClubSwims;
  const clubYardsDelta = clubTotalYards - prevClubYards;

  if (!customRange && timeframe === 'this_week') {
    const [clubLastWeekCompletedRes, clubLastWeekThroughTodayRes] = await Promise.all([
      comparisonWindow.lastWeekCompletedDaysEndMs >= comparisonWindow.lastWeekStartMs
        ? client.execute({
            sql: `
              SELECT COUNT(*) as count
              FROM swims
              WHERE start_timestamp >= ? AND start_timestamp <= ?
            `,
            args: [
              comparisonWindow.lastWeekStartMs,
              comparisonWindow.lastWeekCompletedDaysEndMs,
            ],
          })
        : Promise.resolve({ rows: [{ count: 0 }] }),
      client.execute({
        sql: `
          SELECT COUNT(*) as count
          FROM swims
          WHERE start_timestamp >= ? AND start_timestamp <= ?
        `,
        args: [
          comparisonWindow.lastWeekStartMs,
          comparisonWindow.lastWeekThroughTodayEndMs,
        ],
      }),
    ]);

    const clubLastWeekCompletedSwims = Number(clubLastWeekCompletedRes.rows[0]?.count || 0);
    const clubLastWeekThroughTodaySwims = Number(clubLastWeekThroughTodayRes.rows[0]?.count || 0);

    if (clubTotalSwims > clubLastWeekThroughTodaySwims) {
      clubSwimsDelta = clubTotalSwims - clubLastWeekThroughTodaySwims;
    } else if (clubTotalSwims < clubLastWeekCompletedSwims) {
      clubSwimsDelta = clubTotalSwims - clubLastWeekCompletedSwims;
    } else {
      clubSwimsDelta = 0;
    }
  }

  return {
    leaderboard: entries,
    summary: {
      totalYards: Math.round(clubTotalYards),
      totalSwims: clubTotalSwims,
      totalDurationSeconds: clubTotalTime,
      activeAthletes: activeAthletesCount,
      periodLabel: current.label,
      sublabel: current.sublabel,
      delta: {
        swims: clubSwimsDelta,
        yards: Math.round(clubYardsDelta),
      },
    },
  };
}

export function getAppSetting(key: string): string | null {
  return appSettingsCache[key] ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  appSettingsCache[key] = value;
  await ensureDbInitialized();
  const client = getDb();
  await client.execute({
    sql: `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    args: [key, value],
  });
}

export async function getAthleteMedalCount(athleteId: number): Promise<{
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  weeklyMedals: Record<number, 'gold' | 'silver' | 'bronze'>;
}> {
  const completedWeeks = getCompletedChallengeWeeks();
  let gold = 0;
  let silver = 0;
  let bronze = 0;
  const weeklyMedals: Record<number, 'gold' | 'silver' | 'bronze'> = {};

  const weekResults = await Promise.all(
    completedWeeks.map(async week => {
      const { leaderboard } = await getLeaderboard('this_week', 'swims', {
        startMs: week.startMs,
        endMs: week.endMs,
        label: week.label,
        sublabel: week.dateRange,
      });

      let medal: 'gold' | 'silver' | 'bronze' | null = null;
      if (leaderboard[0]?.athlete.id === athleteId && leaderboard[0].currentPeriod.swims > 0) {
        medal = 'gold';
      } else if (leaderboard[1]?.athlete.id === athleteId && leaderboard[1].currentPeriod.swims > 0) {
        medal = 'silver';
      } else if (leaderboard[2]?.athlete.id === athleteId && leaderboard[2].currentPeriod.swims > 0) {
        medal = 'bronze';
      }

      return { weekNumber: week.weekNumber, medal };
    })
  );

  for (const r of weekResults) {
    if (r.medal === 'gold') {
      gold++;
      weeklyMedals[r.weekNumber] = 'gold';
    } else if (r.medal === 'silver') {
      silver++;
      weeklyMedals[r.weekNumber] = 'silver';
    } else if (r.medal === 'bronze') {
      bronze++;
      weeklyMedals[r.weekNumber] = 'bronze';
    }
  }

  return {
    gold,
    silver,
    bronze,
    total: gold + silver + bronze,
    weeklyMedals,
  };
}
