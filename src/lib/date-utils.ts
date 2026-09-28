/**
 * Date and time range utilities for Swim Tracker
 * Standard swim training week runs Monday 00:00 to Sunday 23:59:59
 */

export interface DateRange {
  startMs: number;
  endMs: number;
  label: string;
  sublabel: string;
}

export function getWeekBounds(referenceDate = new Date()): {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
} {
  const now = new Date(referenceDate);
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
  
  // Calculate distance back to current week's Monday
  // In JS: Sun=0 -> diff = -6; Mon=1 -> diff = 0; Tue=2 -> diff = -1 ...
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() + daysToMonday);
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1); // End of previous week's Sunday 23:59:59.999

  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
  };
}

/**
 * Challenge kickoff Monday: September 14, 2026 (00:00:00 local time)
 * Week 1: Sep 14 - Sep 20
 * Week 2 (Current week): Sep 21 - Sep 27
 */
export const CHALLENGE_START_DATE_STR = '2026-09-14';

export function parseChallengeStartDate(dateStr = CHALLENGE_START_DATE_STR): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
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

  const currentDay = now.getDay();
  // In JS: Sun=0 -> 7, Mon=1 -> 1, ..., Sat=6 -> 6
  const currentDayIndex = currentDay === 0 ? 7 : currentDay;

  const msPerDay = 24 * 60 * 60 * 1000;
  const completedDaysCount = currentDayIndex - 1;

  const thisWeekStartMs = thisWeekStart.getTime();
  const thisWeekNowMs = now.getTime();

  const lastWeekStartMs = lastWeekStart.getTime();
  const lastWeekCompletedDaysEndMs =
    completedDaysCount > 0
      ? lastWeekStartMs + completedDaysCount * msPerDay - 1
      : lastWeekStartMs - 1;

  const lastWeekThroughTodayEndMs =
    lastWeekStartMs + currentDayIndex * msPerDay - 1;

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
  const { challengeEnd, challengeWeeksCount } = getChallengeBounds(referenceDate);
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (challengeWeeksCount === 0) return [];

  const weeks: CompletedWeekConfig[] = [];
  for (let w = challengeWeeksCount; w >= 1; w--) {
    const weeksAgo = challengeWeeksCount - w;
    const end = new Date(challengeEnd.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
    start.setHours(0, 0, 0, 0);

    const label = `Week ${w}`;

    weeks.push({
      weekNumber: w,
      label,
      dateRange: `${formatDate(start)} - ${formatDate(end)}`,
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

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
  const { challengeStart, challengeEnd, challengeWeeksCount } = getChallengeBounds(referenceDate);
  const { lastWeekEnd } = getWeekBounds(referenceDate);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (challengeWeeksCount === 0 || lastWeekEnd.getTime() < challengeStart.getTime()) {
    return [];
  }

  const weeksConfig: {
    weekNumber: number;
    label: string;
    dateRange: string;
    startMs: number;
    endMs: number;
  }[] = [];

  for (let w = challengeWeeksCount; w >= 1; w--) {
    const weeksAgo = challengeWeeksCount - w;
    const weekEnd = new Date(challengeEnd.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
    weekStart.setHours(0, 0, 0, 0);

    const label = `Week ${w}`;

    weeksConfig.push({
      weekNumber: w,
      label,
      dateRange: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      startMs: weekStart.getTime(),
      endMs: weekEnd.getTime(),
    });
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


