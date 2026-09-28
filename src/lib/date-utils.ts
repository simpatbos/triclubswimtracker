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

export function getDateRangeForOption(
  option: 'this_week' | 'since_last_week' | 'last_week' | 'all_time',
  referenceDate = new Date()
): {
  current: DateRange;
  comparison: DateRange;
} {
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekBounds(referenceDate);

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

    case 'all_time':
    default:
      return {
        current: {
          startMs: 0,
          endMs: Date.now() + 86400000,
          label: 'All Time',
          sublabel: 'Entire season history',
        },
        comparison: {
          startMs: 0,
          endMs: 0,
          label: 'N/A',
          sublabel: '',
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
