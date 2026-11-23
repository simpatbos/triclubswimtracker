import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.TURSO_DATABASE_URL) {
  console.error('Refusing to run dev seed while TURSO_DATABASE_URL is set.');
  process.exit(1);
}

const isClearOnly = process.argv.includes('--clear');

const CLUB_TIMEZONE = 'America/Indiana/Indianapolis';
const CHALLENGE_START_DATE_STR = '2026-10-12';
const DUMMY_ID_MIN = 900000000;
const DUMMY_ID_MAX = 901000000;

function getTimezoneOffsetMs(utcMs, timeZone = CLUB_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(new Date(utcMs));
  const y = Number(parts.find(p => p.type === 'year').value);
  const m = Number(parts.find(p => p.type === 'month').value);
  const d = Number(parts.find(p => p.type === 'day').value);
  const h = Number(parts.find(p => p.type === 'hour').value);
  const min = Number(parts.find(p => p.type === 'minute').value);
  const s = Number(parts.find(p => p.type === 'second').value);
  const ms = ((utcMs % 1000) + 1000) % 1000;
  const wallAsUtc = Date.UTC(y, m - 1, d, h, min, s, ms);
  return wallAsUtc - utcMs;
}

function getClubZonedDate(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  const targetWallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = getTimezoneOffsetMs(targetWallAsUtc);
  const guess1 = targetWallAsUtc - offset1;
  const offset2 = getTimezoneOffsetMs(guess1);
  return new Date(targetWallAsUtc - offset2);
}

function getClubDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);
  const day = Number(parts.find(p => p.type === 'day').value);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, dayOfWeek };
}

function addCalendarDays(year, month, day, deltaDays) {
  const d = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function getThisWeekMondayCal(now = new Date()) {
  const { year, month, day, dayOfWeek } = getClubDateParts(now);
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addCalendarDays(year, month, day, daysToMonday);
}

function getPastChallengeWeeks(now = new Date()) {
  const [ky, km, kd] = CHALLENGE_START_DATE_STR.split('-').map(Number);
  const challengeStart = getClubZonedDate(ky, km, kd, 0, 0, 0, 0);
  const thisMon = getThisWeekMondayCal(now);
  const lastSun = addCalendarDays(thisMon.year, thisMon.month, thisMon.day, -1);
  const lastWeekEnd = getClubZonedDate(lastSun.year, lastSun.month, lastSun.day, 23, 59, 59, 999);

  if (lastWeekEnd.getTime() < challengeStart.getTime()) return [];

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const count = Math.max(1, Math.round((lastWeekEnd.getTime() - challengeStart.getTime()) / msPerWeek));
  const weeks = [];
  for (let w = 1; w <= count; w++) {
    weeks.push({
      weekNumber: w,
      mondayCal: addCalendarDays(ky, km, kd, (w - 1) * 7),
    });
  }
  return weeks;
}

const WORKOUT_NAMES = [
  'Morning Co-Rec Threshold Set',
  'Club Practice - 10x200 Free',
  'Lunch Pull & Paddles',
  'Aerobic Cruise & Turns',
  'VO2 Max 100s on 1:25',
  'IM & Kick Conditioning',
  'Technique & Easy Distance',
  'Pyramid Set (100-500-100)',
  'Open Water Sighting Drills',
  'Evening Negative Split 3000',
];

const DAY_PATTERNS = {
  1: [2],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

async function main() {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'swimtracker.db');
  const client = createClient({ url: `file:${dbPath}` });

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
      is_manual INTEGER DEFAULT 0,
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
  `);

  // Always clear previously seeded dummy data first for idempotency
  const delSwims = await client.execute({
    sql: 'DELETE FROM swims WHERE id >= ? AND id < ?',
    args: [DUMMY_ID_MIN, DUMMY_ID_MAX],
  });
  const delAthletes = await client.execute({
    sql: 'DELETE FROM athletes WHERE id >= ? AND id < ?',
    args: [DUMMY_ID_MIN, DUMMY_ID_MAX],
  });

  if (isClearOnly) {
    console.log(
      `Cleared dev seed data (${delAthletes.rowsAffected} dummy athletes, ${delSwims.rowsAffected} dummy swims).`
    );
    return;
  }

  // Check if there is an existing real Strava athlete (so logged-in dev user sees themselves!)
  const existingRes = await client.execute(
    'SELECT id, firstname, lastname FROM athletes WHERE is_manual = 0 AND id < 900000000 ORDER BY created_at ASC LIMIT 1'
  );
  const existingUser = existingRes.rows[0]
    ? {
        id: Number(existingRes.rows[0].id),
        firstname: String(existingRes.rows[0].firstname),
        lastname: String(existingRes.rows[0].lastname),
      }
    : null;

  // Define roster with curated weekly + past-week profiles so every scoring edge case is visible
  const dummyRoster = [
    {
      id: 900000001,
      firstname: 'Maya',
      lastname: 'Chen',
      username: 'mayachen',
      paceSecPer100: 76, // 1:16/100yd
      // This week: 4 swims, 11,400 yds -> #1 (beats 5 swims on yards!)
      thisWeek: [3000, 2800, 3100, 2500],
      // Past weeks (cycles if >5): completes EVERY week!
      pastWeeks: [
        [2800, 2600, 3000, 2500],          // W1: 4 swims, 10,900
        [2700, 2900, 2500, 2600, 1800],    // W2: 5 swims, 12,500
        [2600, 2800, 2700, 2400],          // W3: 4 swims, 10,500
        [3000, 2800, 2900, 2700],          // W4: 4 swims, 11,400
        [2500, 2700, 2600, 2400],          // W5: 4 swims, 10,200
      ],
    },
    {
      id: existingUser ? existingUser.id : 900000002,
      existing: Boolean(existingUser),
      firstname: existingUser ? existingUser.firstname : 'Jordan',
      lastname: existingUser ? existingUser.lastname : 'Miller',
      username: 'jmiller',
      paceSecPer100: 81, // 1:21/100yd
      // This week: 5 swims, 9,800 yds -> #2 (proves 5 swims < 4 swims w/ higher yds, preserves "5 swims" + check!)
      thisWeek: [2200, 1900, 2100, 1800, 1800],
      // Past weeks: 4 of 5 completed (misses W3 with 3 swims)
      pastWeeks: [
        [2500, 2400, 2600, 2500],          // W1: 4 swims, 10,000
        [2200, 2300, 2100, 2000, 1900],    // W2: 5 swims, 10,500
        [2400, 2500, 2300],                // W3: 3 swims, 7,200 (incomplete)
        [2600, 2400, 2500, 2600],          // W4: 4 swims, 10,100
        [2800, 2600, 2700, 2500],          // W5: 4 swims, 10,600 (wins W5 gold!)
      ],
    },
    {
      id: 900000003,
      firstname: 'Liam',
      lastname: "O'Connor",
      username: 'liamoconnor',
      paceSecPer100: 83,
      // This week: 4 swims, 8,900 yds -> #3 (Bronze podium + checkmark)
      thisWeek: [2300, 2100, 2400, 2100],
      // Past weeks: 4 of 5 completed (loses 4-week tiebreaker to #2 on yds/wk)
      pastWeeks: [
        [2100, 2200, 2000, 2100],          // W1: 4 swims, 8,400
        [2000, 2100, 2200, 2000],          // W2: 4 swims, 8,300
        [2300, 2400, 2200, 2100],          // W3: 4 swims, 9,000
        [2200, 2300],                      // W4: 2 swims, 4,500 (incomplete)
        [2100, 2200, 2100, 2000],          // W5: 4 swims, 8,400
      ],
    },
    {
      id: 900000004,
      firstname: 'Sofia',
      lastname: 'Martinez',
      username: 'sofiamartinez',
      paceSecPer100: 86,
      // This week: 6 swims, 7,600 yds -> #4 (6 swims + checkmark, ranked below 4 swims w/ more yds!)
      thisWeek: [1300, 1200, 1400, 1200, 1300, 1200],
      // Past weeks: 3 of 5 completed
      pastWeeks: [
        [2200, 2400, 2300, 2200, 2100],    // W1: 5 swims, 11,200 (wins W1 gold!)
        [2000, 2100, 1900],                // W2: 3 swims, 6,000
        [2300, 2200, 2400, 2300],          // W3: 4 swims, 9,200
        [1800, 1900, 1700, 1800, 1600],    // W4: 5 swims, 8,800
        [2000, 2100],                      // W5: 2 swims, 4,100
      ],
    },
    {
      id: 900000005,
      firstname: 'Noah',
      lastname: 'Patel',
      username: 'noahpatel',
      paceSecPer100: 74, // fast distance swimmer!
      // This week: 3 swims, 12,200 yds -> #5 (huge yards, but <4 swims so no checkmark & below 4-swim swimmers!)
      thisWeek: [4200, 3900, 4100],
      // Past weeks: 2 of 5 completed (huge yds/wk, only 2 weeks completed)
      pastWeeks: [
        [4000, 3800, 4100],                // W1: 3 swims, 11,900
        [3500, 3400, 3600, 3500],          // W2: 4 swims, 14,000 (wins W2 gold!)
        [4100, 4000, 3900],                // W3: 3 swims, 12,000
        [3600, 3500, 3400, 3700],          // W4: 4 swims, 14,200 (wins W4 gold!)
        [3800, 3700, 3900],                // W5: 3 swims, 11,400
      ],
    },
    {
      id: 900000006,
      firstname: 'Chloe',
      lastname: 'Brooks',
      username: 'chloebrooks',
      paceSecPer100: 91,
      // This week: 3 swims, 6,400 yds -> #6
      thisWeek: [2100, 2200, 2100],
      // Past weeks: 2 of 5 completed
      pastWeeks: [
        [1800, 1900, 1700, 1800],          // W1: 4 swims, 7,200
        [2000, 1900],                      // W2: 2 swims, 3,900
        [1900, 1800, 2000, 1800],          // W3: 4 swims, 7,500
        [1900, 2000, 1800],                // W4: 3 swims, 5,700
        [2000, 1900],                      // W5: 2 swims, 3,900
      ],
    },
    {
      id: 900000007,
      firstname: 'Ethan',
      lastname: 'Kim',
      username: 'ethankim',
      paceSecPer100: 94,
      // This week: 2 swims, 5,800 yds -> #7
      thisWeek: [3000, 2800],
      // Past weeks: 1 of 5 completed (tests singular "1 week completed")
      pastWeeks: [
        [2200, 2100],                      // W1: 2 swims
        [1800, 1900, 2000, 1800],          // W2: 4 swims (completed)
        [2100, 2200],                      // W3: 2 swims
        [2000, 1900, 2100],                // W4: 3 swims
        [2400],                            // W5: 1 swim
      ],
    },
    {
      id: 900000008,
      firstname: 'Ava',
      lastname: 'Reynolds',
      username: 'avareynolds',
      paceSecPer100: 98,
      // This week: 2 swims, 4,100 yds -> #8
      thisWeek: [2100, 2000],
      // Past weeks: 1 of 5 completed
      pastWeeks: [
        [1600],                            // W1: 1 swim
        [1800, 1700],                      // W2: 2 swims
        [1600, 1700, 1500, 1600],          // W3: 4 swims (completed)
        [1800, 1700],                      // W4: 2 swims
        [1700, 1800],                      // W5: 2 swims
      ],
    },
    {
      id: 900000009,
      firstname: 'Lucas',
      lastname: 'Wright',
      username: 'lucaswright',
      paceSecPer100: 102,
      // This week: 1 swim, 2,500 yds -> #9
      thisWeek: [2500],
      // Past weeks: 0 completed
      pastWeeks: [
        [1800, 1700],                      // W1: 2 swims
        [2000],                            // W2: 1 swim
        [1700, 1800],                      // W3: 2 swims
        [1900],                            // W4: 1 swim
        [1800, 1700],                      // W5: 2 swims
      ],
    },
    {
      id: 900000010,
      firstname: 'Hannah',
      lastname: 'Davis',
      username: 'hannahdavis',
      paceSecPer100: 106,
      // This week: 0 swims -> #10
      thisWeek: [],
      // Past weeks: 0 completed
      pastWeeks: [
        [1500],                            // W1: 1 swim
        [],                                // W2: 0 swims
        [1600],                            // W3: 1 swim
        [1500, 1400],                      // W4: 2 swims
        [],                                // W5: 0 swims
      ],
    },
  ];

  const now = new Date();
  const thisWeekMon = getThisWeekMondayCal(now);
  const pastWeeks = getPastChallengeWeeks(now);

  let nextSwimId = 900100001;
  let insertedAthletes = 0;
  let insertedSwims = 0;

  async function insertWeekSwims(athleteId, mondayCal, yardsList, paceSecPer100, seedOffset) {
    if (!yardsList || yardsList.length === 0) return;
    const offsets = DAY_PATTERNS[Math.min(yardsList.length, 7)] || [0, 1, 2, 3, 4, 5, 6];

    for (let i = 0; i < yardsList.length; i++) {
      const yards = yardsList[i];
      const dayCal = addCalendarDays(mondayCal.year, mondayCal.month, mondayCal.day, offsets[i]);
      const hour = 6 + ((seedOffset + i * 3) % 12); // 6am - 5pm
      const minute = ((seedOffset + i) * 15) % 60;
      const startDateObj = getClubZonedDate(dayCal.year, dayCal.month, dayCal.day, hour, minute, 0, 0);

      const meters = Math.round(yards / 1.0936133);
      const paceVariation = ((seedOffset + i) % 5) - 2; // -2s to +2s per 100yd
      const movingTime = Math.max(300, Math.round((yards / 100) * (paceSecPer100 + paceVariation)));
      const elapsedTime = Math.round(movingTime * 1.12);
      const avgSpeed = meters / movingTime;
      const name = WORKOUT_NAMES[(seedOffset + i) % WORKOUT_NAMES.length];

      const startDateIso = startDateObj.toISOString();
      const startDateLocal = `${dayCal.year}-${pad2(dayCal.month)}-${pad2(dayCal.day)}T${pad2(hour)}:${pad2(minute)}:00Z`;

      await client.execute({
        sql: `
          INSERT INTO swims (
            id, athlete_id, name, distance_meters, distance_yards,
            moving_time, elapsed_time, start_date, start_date_local,
            start_timestamp, average_speed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          nextSwimId++,
          athleteId,
          name,
          meters,
          yards,
          movingTime,
          elapsedTime,
          startDateIso,
          startDateLocal,
          startDateObj.getTime(),
          avgSpeed,
        ],
      });
      insertedSwims++;
    }
  }

  for (let idx = 0; idx < dummyRoster.length; idx++) {
    const member = dummyRoster[idx];
    if (!member.existing) {
      await client.execute({
        sql: `
          INSERT INTO athletes (
            id, firstname, lastname, username, profile_url,
            access_token, refresh_token, token_expires_at, in_club, is_manual, created_at
          ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0, 1, 1, ?)
        `,
        args: [member.id, member.firstname, member.lastname, member.username, Date.now() - idx * 1000],
      });
      insertedAthletes++;
    }

    // Current week swims
    await insertWeekSwims(member.id, thisWeekMon, member.thisWeek, member.paceSecPer100, idx * 7);

    // Past challenge weeks swims
    for (let wIdx = 0; wIdx < pastWeeks.length; wIdx++) {
      const weekConfig = pastWeeks[wIdx];
      const pattern = member.pastWeeks[wIdx % member.pastWeeks.length];
      await insertWeekSwims(
        member.id,
        weekConfig.mondayCal,
        pattern,
        member.paceSecPer100,
        idx * 13 + wIdx * 5
      );
    }
  }

  console.log(
    `Seeded local dev DB (${dbPath}): ${insertedAthletes} dummy athletes, ${insertedSwims} dummy swims across ${pastWeeks.length} past weeks + this week.`
  );
  if (existingUser) {
    console.log(
      `Also seeded demo swims for your existing local athlete: ${existingUser.firstname} ${existingUser.lastname} (id ${existingUser.id}).`
    );
  }
  console.log('Run "npm run seed:clear" anytime to remove all dummy data.');
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
