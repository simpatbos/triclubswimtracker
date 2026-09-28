import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Athlete, Swim, LeaderboardEntry, TimeframeOption, MetricOption } from '../types';
import { getDateRangeForOption, metersToYards } from './date-utils';

// Ensure data folder exists
const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'swimtracker.db');

// Global singleton to persist across hot-reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__db) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    global.__db = db;
  }
  return global.__db;
}

function initTables(db: Database.Database) {
  db.exec(`
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
      created_at INTEGER NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0
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
      average_speed REAL NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_swims_athlete_time ON swims(athlete_id, start_timestamp);
    CREATE INDEX IF NOT EXISTS idx_swims_time ON swims(start_timestamp);
  `);

  // If table is empty, auto-seed with Purdue Tri Club demo members
  const count = db.prepare('SELECT COUNT(*) as c FROM athletes').get() as { c: number };
  if (count.c === 0) {
    seedDemoAthletesAndSwims(db);
  }
}

// Demo data generator with realistic Purdue Tri swimmers
export function seedDemoAthletesAndSwims(db = getDb()) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const demoAthletes = [
    {
      id: 9001,
      firstname: 'Sarah',
      lastname: 'Jenkins',
      username: 'sjenkins_tri',
      profile_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
    {
      id: 9002,
      firstname: 'Pete',
      lastname: 'Boilermaker',
      username: 'pete_boilerhammer',
      profile_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
    {
      id: 9003,
      firstname: 'Maya',
      lastname: 'Patel',
      username: 'mayaswims',
      profile_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
    {
      id: 9004,
      firstname: 'Tyler',
      lastname: 'Vance',
      username: 'tvance_purdue',
      profile_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
    {
      id: 9005,
      firstname: 'Jordan',
      lastname: 'Lee',
      username: 'jordan_tri_lee',
      profile_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
    {
      id: 9006,
      firstname: 'Chris',
      lastname: 'Walker',
      username: 'cwalker_boiler',
      profile_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      is_demo: 1,
    },
  ];

  const insertAthlete = db.prepare(`
    INSERT OR REPLACE INTO athletes (id, firstname, lastname, username, profile_url, created_at, is_demo, last_synced_at)
    VALUES (@id, @firstname, @lastname, @username, @profile_url, @created_at, @is_demo, @last_synced_at)
  `);

  const insertSwim = db.prepare(`
    INSERT OR REPLACE INTO swims (
      id, athlete_id, name, distance_meters, distance_yards,
      moving_time, elapsed_time, start_date, start_date_local,
      start_timestamp, average_speed, is_demo
    ) VALUES (
      @id, @athlete_id, @name, @distance_meters, @distance_yards,
      @moving_time, @elapsed_time, @start_date, @start_date_local,
      @start_timestamp, @average_speed, @is_demo
    )
  `);

  const tx = db.transaction(() => {
    // Insert athletes
    for (const a of demoAthletes) {
      insertAthlete.run({
        ...a,
        created_at: now - 30 * DAY,
        last_synced_at: now - 3600000,
      });
    }

    // Workouts templates for realistic swim distances (SCY yards)
    // 1 yard = 0.9144 meters
    const yardsToMeters = (yds: number) => yds * 0.9144;

    const demoSwimConfigs = [
      // Sarah Jenkins (Leader: 5 swims this week ~18,200 yds, 4 swims last week ~14,000 yds)
      { athlete_id: 9001, daysAgo: 0.5, name: 'Morning Purdue Co-Rec Threshold Set', yards: 4200, paceSec: 72 },
      { athlete_id: 9001, daysAgo: 2, name: 'Tri Club Tuesday Aerobic Ladder', yards: 3800, paceSec: 74 },
      { athlete_id: 9001, daysAgo: 3.5, name: 'Sprint 100s & IM Drills', yards: 3200, paceSec: 71 },
      { athlete_id: 9001, daysAgo: 5, name: 'Friday Endurance Boilermaker Block', yards: 4500, paceSec: 75 },
      { athlete_id: 9001, daysAgo: 6, name: 'Recovery Warmdown & Scull', yards: 2500, paceSec: 80 },
      // Last week for Sarah
      { athlete_id: 9001, daysAgo: 8, name: 'Purdue Tri Club Mid-week Distance', yards: 4000, paceSec: 74 },
      { athlete_id: 9001, daysAgo: 10, name: 'Fast 50s + Technique Focus', yards: 3000, paceSec: 71 },
      { athlete_id: 9001, daysAgo: 12, name: 'Sunday Long Aerobic Swim', yards: 4500, paceSec: 76 },
      { athlete_id: 9001, daysAgo: 13.5, name: 'Pre-meet Taper Workout', yards: 2500, paceSec: 73 },

      // Pete Boilermaker (4 swims this week ~14,500 yds, 4 last week ~13,000 yds)
      { athlete_id: 9002, daysAgo: 1, name: 'Hammer Time: 10x400 SCY Descending', yards: 4000, paceSec: 77 },
      { athlete_id: 9002, daysAgo: 3, name: 'Wednesday Night Pool Session', yards: 3500, paceSec: 79 },
      { athlete_id: 9002, daysAgo: 4.5, name: 'Sprint Tri Prep - Drafting Drills', yards: 3000, paceSec: 76 },
      { athlete_id: 9002, daysAgo: 6, name: 'Saturday Boilerman Course Prep', yards: 4000, paceSec: 78 },
      // Last week Pete
      { athlete_id: 9002, daysAgo: 8.5, name: 'Boiler Aquatic Center Interval Grind', yards: 3500, paceSec: 78 },
      { athlete_id: 9002, daysAgo: 10, name: 'Aerobic Base Building', yards: 3500, paceSec: 80 },
      { athlete_id: 9002, daysAgo: 12, name: '500s on the 7:00 pace', yards: 3000, paceSec: 79 },
      { athlete_id: 9002, daysAgo: 13, name: 'Club Shakeout Swim', yards: 3000, paceSec: 82 },

      // Maya Patel (4 swims this week ~13,200 yds, 3 last week ~9,500 yds)
      { athlete_id: 9003, daysAgo: 1, name: 'Morning Masters SCY Set', yards: 3400, paceSec: 75 },
      { athlete_id: 9003, daysAgo: 2.5, name: 'Stroke & Tempo Work', yards: 3200, paceSec: 76 },
      { athlete_id: 9003, daysAgo: 4, name: 'Threshold 200s with Tri Club', yards: 3600, paceSec: 74 },
      { athlete_id: 9003, daysAgo: 5.5, name: 'Endurance Swim 3000', yards: 3000, paceSec: 77 },
      // Last week Maya
      { athlete_id: 9003, daysAgo: 9, name: 'Technique & Pull buoy Set', yards: 3000, paceSec: 76 },
      { athlete_id: 9003, daysAgo: 11, name: 'Aerobic Pyramid 100-200-300-400', yards: 3500, paceSec: 76 },
      { athlete_id: 9003, daysAgo: 13, name: 'Easy Recovery Swim', yards: 3000, paceSec: 80 },

      // Chris Walker (3 swims this week ~10,800 yds, 4 last week ~13,500 yds)
      { athlete_id: 9006, daysAgo: 1.5, name: 'Long Open-Water Simulation', yards: 4000, paceSec: 81 },
      { athlete_id: 9006, daysAgo: 3.5, name: 'Triathlon Pace Work 10x200', yards: 3800, paceSec: 79 },
      { athlete_id: 9006, daysAgo: 5, name: 'Power Sprints with Fins', yards: 3000, paceSec: 76 },
      // Last week Chris
      { athlete_id: 9006, daysAgo: 8, name: 'Purdue Co-Rec Early Bird', yards: 3500, paceSec: 81 },
      { athlete_id: 9006, daysAgo: 10, name: 'Threshold Pyramids', yards: 3500, paceSec: 80 },
      { athlete_id: 9006, daysAgo: 11.5, name: 'Long Course Simulation', yards: 3500, paceSec: 82 },
      { athlete_id: 9006, daysAgo: 13, name: 'Club Social Swim', yards: 3000, paceSec: 83 },

      // Tyler Vance (3 swims this week ~9,000 yds, 3 last week ~8,500 yds)
      { athlete_id: 9004, daysAgo: 1.2, name: 'Speed Work: 16x50 fast', yards: 2800, paceSec: 70 },
      { athlete_id: 9004, daysAgo: 3, name: 'Tri Club Evening Practice', yards: 3200, paceSec: 73 },
      { athlete_id: 9004, daysAgo: 5.5, name: 'Saturday SCY Challenge', yards: 3000, paceSec: 72 },
      // Last week Tyler
      { athlete_id: 9004, daysAgo: 8.5, name: 'Sprint Sets & Starts', yards: 2500, paceSec: 69 },
      { athlete_id: 9004, daysAgo: 10.5, name: 'Aerobic Mid-distance', yards: 3000, paceSec: 72 },
      { athlete_id: 9004, daysAgo: 12.5, name: 'Long Recovery Laps', yards: 3000, paceSec: 75 },

      // Jordan Lee (2 swims this week ~6,000 yds, 2 last week ~5,500 yds)
      { athlete_id: 9005, daysAgo: 2, name: 'Technique Drills & Catch-up', yards: 3000, paceSec: 86 },
      { athlete_id: 9005, daysAgo: 4, name: 'Boilermaker Pool Laps', yards: 3000, paceSec: 85 },
      // Last week Jordan
      { athlete_id: 9005, daysAgo: 9, name: 'Catch & Pull Focus', yards: 2500, paceSec: 88 },
      { athlete_id: 9005, daysAgo: 12, name: 'Sunday Easy Swim', yards: 3000, paceSec: 87 },
    ];

    let swimId = 10001;
    for (const item of demoSwimConfigs) {
      const swimTimestamp = now - Math.round(item.daysAgo * DAY);
      const meters = yardsToMeters(item.yards);
      // paceSec is seconds per 100 yards
      // moving_time = (yards / 100) * paceSec
      const movingTime = Math.round((item.yards / 100) * item.paceSec);
      const avgSpeed = meters / movingTime; // m/s
      const isoDate = new Date(swimTimestamp).toISOString();

      insertSwim.run({
        id: swimId++,
        athlete_id: item.athlete_id,
        name: item.name,
        distance_meters: meters,
        distance_yards: item.yards,
        moving_time: movingTime,
        elapsed_time: movingTime + 180, // slight rest
        start_date: isoDate,
        start_date_local: isoDate,
        start_timestamp: swimTimestamp,
        average_speed: avgSpeed,
        is_demo: 1,
      });
    }
  });

  tx();
}

// Data access queries
export function getAllAthletes(includeDemo = true): Athlete[] {
  const db = getDb();
  const query = includeDemo
    ? 'SELECT * FROM athletes ORDER BY firstname ASC'
    : 'SELECT * FROM athletes WHERE is_demo = 0 ORDER BY firstname ASC';
  return (db.prepare(query).all() as Athlete[]).map(a => ({
    ...a,
    is_demo: Boolean(a.is_demo),
  }));
}

export function getAthleteById(id: number): Athlete | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id) as Athlete | undefined;
  if (!row) return null;
  return {
    ...row,
    is_demo: Boolean(row.is_demo),
  };
}

export function upsertAthlete(athlete: {
  id: number;
  firstname: string;
  lastname: string;
  username: string | null;
  profile_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  is_demo?: boolean;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO athletes (
      id, firstname, lastname, username, profile_url,
      access_token, refresh_token, token_expires_at,
      created_at, is_demo
    ) VALUES (
      @id, @firstname, @lastname, @username, @profile_url,
      @access_token, @refresh_token, @token_expires_at,
      @created_at, @is_demo
    )
    ON CONFLICT(id) DO UPDATE SET
      firstname = excluded.firstname,
      lastname = excluded.lastname,
      username = excluded.username,
      profile_url = excluded.profile_url,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      is_demo = excluded.is_demo
  `).run({
    ...athlete,
    created_at: Date.now(),
    is_demo: athlete.is_demo ? 1 : 0,
  });
}

export function updateAthleteLastSynced(id: number): void {
  const db = getDb();
  db.prepare('UPDATE athletes SET last_synced_at = ? WHERE id = ?').run(Date.now(), id);
}

export function upsertSwim(swim: {
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
  is_demo?: boolean;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO swims (
      id, athlete_id, name, distance_meters, distance_yards,
      moving_time, elapsed_time, start_date, start_date_local,
      start_timestamp, average_speed, is_demo
    ) VALUES (
      @id, @athlete_id, @name, @distance_meters, @distance_yards,
      @moving_time, @elapsed_time, @start_date, @start_date_local,
      @start_timestamp, @average_speed, @is_demo
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      distance_meters = excluded.distance_meters,
      distance_yards = excluded.distance_yards,
      moving_time = excluded.moving_time,
      elapsed_time = excluded.elapsed_time,
      average_speed = excluded.average_speed
  `).run({
    ...swim,
    is_demo: swim.is_demo ? 1 : 0,
  });
}

export function getAthleteSwims(athleteId: number, limit = 20): Swim[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM swims
    WHERE athlete_id = ?
    ORDER BY start_timestamp DESC
    LIMIT ?
  `).all(athleteId, limit) as Swim[];

  return rows.map(r => ({
    ...r,
    is_demo: Boolean(r.is_demo),
  }));
}

/**
 * Computes Leaderboard aggregation for a given timeframe and metric
 */
export function getLeaderboard(
  timeframe: TimeframeOption = 'this_week',
  sortBy: MetricOption = 'yards',
  includeDemo = true
): {
  leaderboard: LeaderboardEntry[];
  summary: {
    totalYards: number;
    totalSwims: number;
    totalDurationSeconds: number;
    activeAthletes: number;
    periodLabel: string;
    sublabel: string;
  };
} {
  const db = getDb();
  const dateRanges = getDateRangeForOption(timeframe);
  const { current, comparison } = dateRanges;

  const athletes = getAllAthletes(includeDemo);

  const entries: LeaderboardEntry[] = [];
  let clubTotalYards = 0;
  let clubTotalSwims = 0;
  let clubTotalTime = 0;
  let activeAthletesCount = 0;

  for (const athlete of athletes) {
    // Current period stats
    const currentStats = db.prepare(`
      SELECT
        COUNT(*) as swims,
        COALESCE(SUM(distance_yards), 0) as yards,
        COALESCE(SUM(moving_time), 0) as movingTimeSeconds,
        COALESCE(MAX(distance_yards), 0) as longestSwimYards
      FROM swims
      WHERE athlete_id = ?
        AND start_timestamp >= ?
        AND start_timestamp <= ?
    `).get(athlete.id, current.startMs, current.endMs) as {
      swims: number;
      yards: number;
      movingTimeSeconds: number;
      longestSwimYards: number;
    };

    // Previous period stats (for delta / "since last week")
    const prevStats = db.prepare(`
      SELECT
        COUNT(*) as swims,
        COALESCE(SUM(distance_yards), 0) as yards,
        COALESCE(SUM(moving_time), 0) as movingTimeSeconds
      FROM swims
      WHERE athlete_id = ?
        AND start_timestamp >= ?
        AND start_timestamp <= ?
    `).get(athlete.id, comparison.startMs, comparison.endMs) as {
      swims: number;
      yards: number;
      movingTimeSeconds: number;
    };

    // Recent swims for this athlete in current period
    const recentSwims = db.prepare(`
      SELECT * FROM swims
      WHERE athlete_id = ?
        AND start_timestamp >= ?
        AND start_timestamp <= ?
      ORDER BY start_timestamp DESC
      LIMIT 5
    `).all(athlete.id, current.startMs, current.endMs) as Swim[];

    // Calculate pace in seconds per 100 yards
    const avgPace =
      currentStats.yards > 0
        ? Math.round((currentStats.movingTimeSeconds / currentStats.yards) * 100)
        : 0;

    const swimsDelta = currentStats.swims - prevStats.swims;
    const yardsDelta = currentStats.yards - prevStats.yards;
    const yardsPercentChange =
      prevStats.yards > 0
        ? Math.round(((currentStats.yards - prevStats.yards) / prevStats.yards) * 100)
        : null;

    if (currentStats.swims > 0) {
      activeAthletesCount++;
    }

    clubTotalYards += currentStats.yards;
    clubTotalSwims += currentStats.swims;
    clubTotalTime += currentStats.movingTimeSeconds;

    entries.push({
      rank: 0, // Assigned after sorting
      athlete: {
        id: athlete.id,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        username: athlete.username,
        profile_url: athlete.profile_url,
        is_demo: Boolean(athlete.is_demo),
        last_synced_at: athlete.last_synced_at,
      },
      currentPeriod: {
        swims: currentStats.swims,
        yards: Math.round(currentStats.yards),
        movingTimeSeconds: currentStats.movingTimeSeconds,
        avgPacePer100YdSeconds: avgPace,
        longestSwimYards: Math.round(currentStats.longestSwimYards),
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
      recentSwims: recentSwims.map(s => ({ ...s, is_demo: Boolean(s.is_demo) })),
    });
  }

  // Sort entries based on metric option
  entries.sort((a, b) => {
    if (sortBy === 'swims') {
      if (b.currentPeriod.swims !== a.currentPeriod.swims) {
        return b.currentPeriod.swims - a.currentPeriod.swims;
      }
      return b.currentPeriod.yards - a.currentPeriod.yards;
    }
    if (sortBy === 'time') {
      return b.currentPeriod.movingTimeSeconds - a.currentPeriod.movingTimeSeconds;
    }
    // Default: yards
    if (b.currentPeriod.yards !== a.currentPeriod.yards) {
      return b.currentPeriod.yards - a.currentPeriod.yards;
    }
    return b.currentPeriod.swims - a.currentPeriod.swims;
  });

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return {
    leaderboard: entries,
    summary: {
      totalYards: Math.round(clubTotalYards),
      totalSwims: clubTotalSwims,
      totalDurationSeconds: clubTotalTime,
      activeAthletes: activeAthletesCount,
      periodLabel: current.label,
      sublabel: current.sublabel,
    },
  };
}

export function resetToDemoData() {
  const db = getDb();
  db.exec(`
    DELETE FROM swims WHERE is_demo = 1;
    DELETE FROM athletes WHERE is_demo = 1;
  `);
  seedDemoAthletesAndSwims(db);
}
