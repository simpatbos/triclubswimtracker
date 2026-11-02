/**
 * Date and time range utilities for Swim Tracker
 * Standard swim training week runs Monday 00:00 to Sunday 23:59:59 Eastern Time
 */

export const CLUB_TIMEZONE = 'America/Indiana/Indianapolis';

export interface DateRange {
  startMs: number;
  endMs: number;
  label: string;
  sublabel: string;
}

function getTimezoneOffsetMs(utcMs: number, timeZone = CLUB_TIMEZONE): number {
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
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);
  const h = Number(parts.find(p => p.type === 'hour')!.value);
  const min = Number(parts.find(p => p.type === 'minute')!.value);
  const s = Number(parts.find(p => p.type === 'second')!.value);
  const ms = ((utcMs % 1000) + 1000) % 1000;
  const wallAsUtc = Date.UTC(y, m - 1, d, h, min, s, ms);
  return wallAsUtc - utcMs;
}

export function getClubZonedDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  const targetWallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = getTimezoneOffsetMs(targetWallAsUtc, CLUB_TIMEZONE);
  const guess1 = targetWallAsUtc - offset1;
  const offset2 = getTimezoneOffsetMs(guess1, CLUB_TIMEZONE);
  return new Date(targetWallAsUtc - offset2);
}

export function getClubDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const day = Number(parts.find(p => p.type === 'day')!.value);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, dayOfWeek };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  deltaDays: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

export function formatClubDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: CLUB_TIMEZONE,
  });
}

export function getWeekBounds(referenceDate = new Date()): {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
} {
  const now = new Date(referenceDate);
  const { year, month, day, dayOfWeek } = getClubDateParts(now);

  // Calculate distance back to current week's Monday in Eastern Time
  // Sun=0 -> diff = -6; Mon=1 -> diff = 0; Tue=2 -> diff = -1 ...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisMon = addCalendarDays(year, month, day, daysToMonday);
  const thisSun = addCalendarDays(thisMon.year, thisMon.month, thisMon.day, 6);
  const lastMon = addCalendarDays(thisMon.year, thisMon.month, thisMon.day, -7);
  const lastSun = addCalendarDays(thisMon.year, thisMon.month, thisMon.day, -1);

  const thisWeekStart = getClubZonedDate(thisMon.year, thisMon.month, thisMon.day, 0, 0, 0, 0);
  const thisWeekEnd = getClubZonedDate(thisSun.year, thisSun.month, thisSun.day, 23, 59, 59, 999);
  const lastWeekStart = getClubZonedDate(lastMon.year, lastMon.month, lastMon.day, 0, 0, 0, 0);
  const lastWeekEnd = getClubZonedDate(lastSun.year, lastSun.month, lastSun.day, 23, 59, 59, 999);

  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
  };
}

/**
 * Challenge kickoff Monday: September 14, 2026 (00:00:00 Eastern time)
 * Week 1: Sep 14 - Sep 20
 * Week 2: Sep 21 - Sep 27
 */
export const CHALLENGE_START_DATE_STR = '2026-10-12';

export function parseChallengeStartDate(dateStr = CHALLENGE_START_DATE_STR): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return getClubZonedDate(year, month, day, 0, 0, 0, 0);
}

export function getChallengeBounds(referenceDate = new Date()): {
  challengeStart: Date;
  challengeEnd: Date;
  challengeWeeksCount: number;
} {
  const challengeStart = parseChallengeStartDate();
  const { lastWeekEnd } = getWeekBounds(referenceDate);

  // Requirement: Only completed weeks are included in challenge stats (exclude current week)
  if (lastWeekEnd.getTime() < challengeStart.getTime()) {
    return {
      challengeStart,
      challengeEnd: new Date(challengeStart.getTime() - 1),
      challengeWeeksCount: 0,
    };
  }

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffMs = lastWeekEnd.getTime() - challengeStart.getTime();
  const challengeWeeksCount = Math.max(1, Math.round(diffMs / msPerWeek));

  const challengeEnd = new Date(lastWeekEnd);

  return {
    challengeStart,
    challengeEnd,
    challengeWeeksCount,
  };
}

export interface WeeklyComparisonWindow {
  currentDayIndex: number; // 1 = Mon ... 7 = Sun
  thisWeekStartMs: number;
  thisWeekNowMs: number;
  lastWeekStartMs: number;
  lastWeekCompletedDaysEndMs: number;
  lastWeekThroughTodayEndMs: number;
}

/**
 * Calculates day-of-week comparison windows for Weekly Leaderboard (+-) pacing badge.
 * - Compares swims completed so far this week against equivalent elapsed days last week.
 * - On Monday before swimming, if matched completed days: 0 (±0).
 * - After Monday, if you haven't swam when you did last week: -1.
 */
export function getWeeklyComparisonWindow(referenceDate = new Date()): WeeklyComparisonWindow {
  const { thisWeekStart, lastWeekStart } = getWeekBounds(referenceDate);
  const now = new Date(referenceDate);

  const { year, month, day, dayOfWeek } = getClubDateParts(now);
  // Sun=0 -> 7, Mon=1 -> 1, ..., Sat=6 -> 6
  const currentDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const lastMon = addCalendarDays(year, month, day, daysToMonday - 7);

  const completedDaysCount = currentDayIndex - 1;

  const thisWeekStartMs = thisWeekStart.getTime();
  const thisWeekNowMs = now.getTime();

  const lastWeekStartMs = lastWeekStart.getTime();
  let lastWeekCompletedDaysEndMs = lastWeekStartMs - 1;
  if (completedDaysCount > 0) {
    const completedEndDay = addCalendarDays(
      lastMon.year,
      lastMon.month,
      lastMon.day,
      completedDaysCount - 1
    );
    lastWeekCompletedDaysEndMs = getClubZonedDate(
      completedEndDay.year,
      completedEndDay.month,
      completedEndDay.day,
      23,
      59,
      59,
      999
    ).getTime();
  }

  const throughTodayDay = addCalendarDays(
    lastMon.year,
    lastMon.month,
    lastMon.day,
    currentDayIndex - 1
  );
  const lastWeekThroughTodayEndMs = getClubZonedDate(
    throughTodayDay.year,
    throughTodayDay.month,
    throughTodayDay.day,
    23,
    59,
    59,
    999
  ).getTime();

  return {
    currentDayIndex,
    thisWeekStartMs,
    thisWeekNowMs,
    lastWeekStartMs,
    lastWeekCompletedDaysEndMs,
    lastWeekThroughTodayEndMs,
  };
}

export interface CompletedWeekConfig {
  weekNumber: number;
  label: string;
  dateRange: string;
  startMs: number;
  endMs: number;
}

/**
 * Returns list of completed challenge weeks (for Previous Weeks modal archive)
 */
export function getCompletedChallengeWeeks(referenceDate = new Date()): CompletedWeekConfig[] {
  const { challengeWeeksCount } = getChallengeBounds(referenceDate);

  if (challengeWeeksCount === 0) return [];

  const [kickoffYear, kickoffMonth, kickoffDay] = CHALLENGE_START_DATE_STR.split('-').map(Number);

  const weeks: CompletedWeekConfig[] = [];
  for (let w = challengeWeeksCount; w >= 1; w--) {
    const startCal = addCalendarDays(kickoffYear, kickoffMonth, kickoffDay, (w - 1) * 7);
    const endCal = addCalendarDays(kickoffYear, kickoffMonth, kickoffDay, w * 7 - 1);

    const start = getClubZonedDate(startCal.year, startCal.month, startCal.day, 0, 0, 0, 0);
    const end = getClubZonedDate(endCal.year, endCal.month, endCal.day, 23, 59, 59, 999);

    const label = `Week ${w}`;

    weeks.push({
      weekNumber: w,
      label,
      dateRange: `${formatClubDateShort(start)} - ${formatClubDateShort(end)}`,
      startMs: start.getTime(),
      endMs: end.getTime(),
    });
  }

  return weeks;
}

export function getDateRangeForOption(
  option: 'this_week' | 'challenge' | 'since_last_week' | 'last_week' | 'all_time',
  referenceDate = new Date()
): {
  current: DateRange;
  comparison: DateRange;
} {
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekBounds(referenceDate);
  const { challengeStart, challengeEnd, challengeWeeksCount } = getChallengeBounds(referenceDate);

  const formatDate = formatClubDateShort;

  switch (option) {
    case 'this_week':
      return {
        current: {
          startMs: thisWeekStart.getTime(),
          endMs: thisWeekEnd.getTime(),
          label: 'This Week',
          sublabel: `${formatDate(thisWeekStart)} - ${formatDate(thisWeekEnd)}`,
        },
        comparison: {
          startMs: lastWeekStart.getTime(),
          endMs: lastWeekEnd.getTime(),
          label: 'Last Week',
          sublabel: `${formatDate(lastWeekStart)} - ${formatDate(lastWeekEnd)}`,
        },
      };

    case 'challenge':
    case 'all_time':
    default:
      return {
        current: {
          startMs: challengeStart.getTime(),
          endMs: challengeEnd.getTime(),
          label: 'Swim Challenge',
          sublabel: challengeWeeksCount > 0
            ? `${formatDate(challengeStart)} - ${formatDate(challengeEnd)} (${challengeWeeksCount} Completed ${challengeWeeksCount === 1 ? 'Wk' : 'Wks'})`
            : `${formatDate(challengeStart)} - Kickoff Week (Awaiting 1st Completed Wk)`,
        },
        comparison: {
          startMs: challengeStart.getTime() - Math.max(1, challengeWeeksCount) * 7 * 24 * 60 * 60 * 1000,
          endMs: challengeStart.getTime() - 1,
          label: 'Prior Period',
          sublabel: '',
        },
      };

    case 'since_last_week':
      // From start of last week through current moment
      return {
        current: {
          startMs: lastWeekStart.getTime(),
          endMs: thisWeekEnd.getTime(),
          label: 'Since Last Week (2-Week Total)',
          sublabel: `${formatDate(lastWeekStart)} - Present`,
        },
        comparison: {
          startMs: lastWeekStart.getTime() - 14 * 24 * 60 * 60 * 1000,
          endMs: lastWeekStart.getTime() - 1,
          label: 'Prior 2 Weeks',
          sublabel: 'Comparison period',
        },
      };

    case 'last_week':
      return {
        current: {
          startMs: lastWeekStart.getTime(),
          endMs: lastWeekEnd.getTime(),
          label: 'Last Week',
          sublabel: `${formatDate(lastWeekStart)} - ${formatDate(lastWeekEnd)}`,
        },
        comparison: {
          startMs: lastWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
          endMs: lastWeekStart.getTime() - 1,
          label: '2 Weeks Ago',
          sublabel: 'Prior week',
        },
      };
  }
}

/**
 * Convert meters to short-course yards (SCY)
 * 1 meter = 1.0936133 yards
 */
export function metersToYards(meters: number): number {
  return Math.round(meters * 1.0936133);
}

/**
 * Format duration in seconds to "1h 14m" or "42m 10s"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}

/**
 * Format swim pace: seconds per 100 yards into "1:18/100yd"
 */
export function formatSwimPace(avgSpeedMetersPerSec: number): string {
  if (!avgSpeedMetersPerSec || avgSpeedMetersPerSec <= 0) return '--/100yd';
  
  // 100 yards = 91.44 meters
  const secondsPer100Yd = 91.44 / avgSpeedMetersPerSec;
  const mins = Math.floor(secondsPer100Yd / 60);
  const secs = Math.floor(secondsPer100Yd % 60);

  return `${mins}:${secs.toString().padStart(2, '0')}/100yd`;
}

/**
 * Format pace given total seconds and total yards
 */
export function calculatePacePer100Yd(seconds: number, yards: number): string {
  if (!yards || !seconds || yards <= 0 || seconds <= 0) return '--/100yd';
  const secPer100 = (seconds / yards) * 100;
  const mins = Math.floor(secPer100 / 60);
  const secs = Math.floor(secPer100 % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/100yd`;
}

export interface WeekSummary {
  weekNumber: number;
  label: string;
  dateRange: string;
  startMs: number;
  endMs: number;
  totalYards: number;
  totalSwims: number;
  totalSeconds: number;
  avgPace: string;
}

export function getChallengeWeeklyBreakdown(
  swims: { distance_yards: number; moving_time: number; start_timestamp: number }[],
  referenceDate = new Date()
): WeekSummary[] {
  const weeksConfig = getCompletedChallengeWeeks(referenceDate);
  if (weeksConfig.length === 0) {
    return [];
  }

  return weeksConfig.map(wc => {
    const weekSwims = swims.filter(
      s => s.start_timestamp >= wc.startMs && s.start_timestamp <= wc.endMs
    );
    const totalYards = weekSwims.reduce((acc, s) => acc + s.distance_yards, 0);
    const totalSeconds = weekSwims.reduce((acc, s) => acc + s.moving_time, 0);
    const totalSwims = weekSwims.length;
    const avgPace = calculatePacePer100Yd(totalSeconds, totalYards);

    return {
      ...wc,
      totalYards: Math.round(totalYards),
      totalSwims,
      totalSeconds,
      avgPace,
    };
  });
}

/**
 * Format swims per week rounded to tenths (1 decimal place)
 */
export function formatSwimsPerWeek(swims: number): string {
  if (swims === null || swims === undefined || isNaN(swims)) return '0';
  const rounded = Math.round(swims * 10) / 10;
  return rounded.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  });
}


