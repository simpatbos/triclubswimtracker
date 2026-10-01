'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Waves,
  Timer,
  ExternalLink,
  Flame,
  Calendar,
  Activity,
} from 'lucide-react';
import { Swim, Athlete } from '@/types';
import {
  formatDuration,
  formatSwimPace,
  calculatePacePer100Yd,
  getWeekBounds,
  getChallengeWeeklyBreakdown,
  formatSwimsPerWeek,
} from '@/lib/date-utils';

interface AthleteModalProps {
  athleteId: number | null;
  onClose: () => void;
  viewMode?: 'this_week' | 'challenge';
  onViewModeChange?: (view: 'this_week' | 'challenge') => void;
}

interface CachedAthletePayload {
  athlete: Athlete;
  swims: Swim[];
  medals: {
    gold: number;
    silver: number;
    bronze: number;
    total: number;
    weeklyMedals: Record<number, 'gold' | 'silver' | 'bronze'>;
  } | null;
}

const athleteCache = new Map<number, CachedAthletePayload>();

export function clearAthleteModalCache(): void {
  athleteCache.clear();
}

export function AthleteModal({
  athleteId,
  onClose,
  viewMode: controlledViewMode,
  onViewModeChange,
}: AthleteModalProps) {
  const initialCached = athleteId ? athleteCache.get(athleteId) : null;
  const [prevId, setPrevId] = useState(athleteId);
  const [loading, setLoading] = useState(!initialCached);
  const [athlete, setAthlete] = useState<Athlete | null>(initialCached?.athlete ?? null);
  const [swims, setSwims] = useState<Swim[]>(initialCached?.swims ?? []);
  const [medals, setMedals] = useState<CachedAthletePayload['medals']>(initialCached?.medals ?? null);

  // Sync state if athleteId prop changes while modal is mounted
  if (athleteId !== prevId) {
    setPrevId(athleteId);
    const cached = athleteId ? athleteCache.get(athleteId) : null;
    setAthlete(cached?.athlete ?? null);
    setSwims(cached?.swims ?? []);
    setMedals(cached?.medals ?? null);
    setLoading(!cached);
  }

  // Fallback picker state if not controlled externally
  const [internalViewMode, setInternalViewMode] = useState<'this_week' | 'challenge'>('this_week');

  const viewMode = controlledViewMode ?? internalViewMode;

  const handleSelectViewMode = (newMode: 'this_week' | 'challenge') => {
    if (onViewModeChange) {
      onViewModeChange(newMode);
    } else {
      setInternalViewMode(newMode);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!athleteId) return;
    const currentId = athleteId;

    if (athleteCache.has(currentId)) {
      return;
    }

    async function loadAthleteSwims() {
      try {
        setLoading(true);
        const res = await fetch(`/api/athletes/${currentId}/swims`);
        const data = await res.json();
        if (isMounted) {
          if (data.athlete) setAthlete(data.athlete);
          if (data.swims) setSwims(data.swims);
          if (data.medals) setMedals(data.medals);

          if (data.athlete && data.swims) {
            athleteCache.set(currentId, {
              athlete: data.athlete,
              swims: data.swims,
              medals: data.medals || null,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load athlete swims', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAthleteSwims();

    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  if (!athleteId) return null;

  // Filter swims for "This Week"
  const { thisWeekStart, thisWeekEnd, lastWeekEnd } = getWeekBounds();
  const thisWeekSwims = swims.filter(
    s => s.start_timestamp >= thisWeekStart.getTime() && s.start_timestamp <= thisWeekEnd.getTime()
  );

  // Weekly breakdown items for "Swim Challenge" (completed weeks only)
  const weeklyBreakdown = getChallengeWeeklyBreakdown(swims);
  const challengeWeeksCount = Math.max(weeklyBreakdown.length, 1);
  const challengeStartMs = weeklyBreakdown[weeklyBreakdown.length - 1]?.startMs ?? 0;
  const challengeEndMs = weeklyBreakdown[0]?.endMs ?? lastWeekEnd.getTime();

  // Filter swims for "Swim Challenge" (only completed challenge weeks, strictly excluding current week)
  const challengeSwims = swims.filter(
    s => s.start_timestamp >= challengeStartMs && s.start_timestamp <= challengeEndMs
  );

  // Compute stats based on active view
  const currentSwims = viewMode === 'this_week' ? thisWeekSwims : challengeSwims;
  const totalYards = currentSwims.reduce((acc, s) => acc + s.distance_yards, 0);
  const totalSeconds = currentSwims.reduce((acc, s) => acc + s.moving_time, 0);
  const overallPace = calculatePacePer100Yd(totalSeconds, totalYards);

  const avgYardsPerWeek = Math.round(totalYards / challengeWeeksCount);
  const avgSwimsPerWeek = currentSwims.length / challengeWeeksCount;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-xl w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white border-2 border-[#cfb991] shadow-xs flex-shrink-0">
              {athlete?.profile_url ? (
                <Image
                  src={athlete.profile_url}
                  alt={`${athlete.firstname} ${athlete.lastname}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base sm:text-lg font-bold text-neutral-800">
                  {athlete?.firstname?.[0] || 'P'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight leading-tight truncate">
                {athlete ? `${athlete.firstname} ${athlete.lastname}` : 'Loading...'}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-0.5 truncate">
                @{athlete?.username || 'purduetri'}
              </p>

              {/* Medal Count Badges: Only show if athlete has a medal(s) */}
              {medals && medals.total > 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                  {medals.gold > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/90 border border-amber-300 text-amber-950 text-[10px] font-black font-mono shadow-2xs"
                      title="Gold Medals (1st Place Finishes)"
                    >
                      <span>🥇</span>
                      <span>{medals.gold}</span>
                    </span>
                  )}

                  {medals.silver > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black font-mono shadow-2xs"
                      title="Silver Medals (2nd Place Finishes)"
                    >
                      <span>🥈</span>
                      <span>{medals.silver}</span>
                    </span>
                  )}

                  {medals.bronze > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-950 text-[#cfb991] text-[10px] font-black font-mono shadow-2xs"
                      title="Bronze Medals (3rd Place Finishes)"
                    >
                      <span>🥉</span>
                      <span>{medals.bronze}</span>
                    </span>
                  )}

                  <span className="text-[10px] font-bold text-neutral-500 font-mono ml-0.5">
                    {medals.total} {medals.total === 1 ? 'Medal' : 'Medals'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-neutral-400">
              <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-[#9d8353]" />
              <p className="text-xs font-mono">Loading stats...</p>
            </div>
          ) : (
            <>
              {/* Stats View Picker */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-300 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSelectViewMode('this_week')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      viewMode === 'this_week'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectViewMode('challenge')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      viewMode === 'challenge'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Swim Challenge
                  </button>
                </div>
              </div>

              {/* Summary Stats Strip */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Waves className="w-3 h-3 text-[#9d8353] flex-shrink-0" />
                    <span className="truncate">{viewMode === 'challenge' ? 'Yds / Week' : 'Total Yards'}</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-neutral-900 font-mono truncate">
                    {viewMode === 'challenge' ? (
                      <>
                        {avgYardsPerWeek.toLocaleString()}{' '}
                        <span className="text-[9px] sm:text-[10px] text-neutral-500 font-normal">yds/wk</span>
                      </>
                    ) : (
                      <>
                        {totalYards.toLocaleString()}{' '}
                        <span className="text-[9px] sm:text-[10px] text-neutral-500 font-normal">yds</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    <span className="truncate">{viewMode === 'challenge' ? 'Swims / Week' : 'Total Swims'}</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-neutral-900 font-mono truncate">
                    {viewMode === 'challenge' ? (
                      <>
                        {formatSwimsPerWeek(avgSwimsPerWeek)}{' '}
                        <span className="text-[9px] sm:text-[10px] text-neutral-500 font-normal">swims/wk</span>
                      </>
                    ) : (
                      currentSwims.length
                    )}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 sm:p-3 text-center">
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5 flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                    <span>Avg Pace</span>
                  </div>
                  <div className="text-sm sm:text-lg font-black text-neutral-900 font-mono truncate">
                    {overallPace}
                  </div>
                </div>
              </div>

              {/* View Mode 1: THIS WEEK -> Specific Swims as Items */}
              {viewMode === 'this_week' && (
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                      <span>This Week&apos;s Swims ({thisWeekSwims.length})</span>
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-neutral-500 font-mono">
                      {thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                      {thisWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {thisWeekSwims.length === 0 ? (
                    <div className="py-8 text-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl">
                      <p className="text-xs text-neutral-500 italic">
                        No swims recorded yet this week.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {thisWeekSwims.map(swim => {
                        const pace = formatSwimPace(swim.average_speed);
                        const swimDate = new Date(swim.start_date_local || swim.start_date);

                        return (
                          <div
                            key={swim.id}
                            className="bg-white border border-neutral-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 hover:border-neutral-400 transition-colors shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                                {swim.name}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-neutral-500 flex items-center gap-1.5 sm:gap-2 mt-0.5 font-mono">
                                <span>
                                  {swimDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span>•</span>
                                <span>
                                  {swimDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-black text-neutral-900 text-xs sm:text-sm">
                                {Math.round(swim.distance_yards).toLocaleString()}{' '}
                                <span className="text-[10px] text-neutral-500 font-normal">yds</span>
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-neutral-500 font-mono flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5">
                                <span>{formatDuration(swim.moving_time)}</span>
                                <span>•</span>
                                <span>{pace}</span>
                                {athlete?.is_manual ? (
                                  <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] ml-0.5 sm:ml-1 px-1.5 py-0.2 sm:py-0.5 rounded bg-neutral-100 border border-neutral-200">
                                    Manual
                                  </span>
                                ) : (
                                  <a
                                    href={`https://www.strava.com/activities/${swim.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#fc5200] hover:underline ml-0.5 sm:ml-1 inline-flex items-center gap-0.5"
                                    title="View on Strava"
                                  >
                                    <span>Strava</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* View Mode 2: SWIM CHALLENGE -> Completed challenge weeks */}
              {viewMode === 'challenge' && (
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                      <span>Completed Challenge Weeks</span>
                    </h4>
                  </div>

                  <div className="space-y-2 sm:space-y-2.5">
                    {weeklyBreakdown.map(wb => (
                      <div
                        key={wb.weekNumber}
                        className="bg-white border border-neutral-200 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2.5 hover:border-neutral-400 transition-colors shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900">
                              Week {wb.weekNumber}
                            </span>
                            {medals?.weeklyMedals?.[wb.weekNumber] === 'gold' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100/90 border border-amber-300 text-amber-950 text-[9px] font-black font-mono">
                                <span>🥇</span>
                                <span>1st</span>
                              </span>
                            )}
                            {medals?.weeklyMedals?.[wb.weekNumber] === 'silver' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-700 text-[9px] font-black font-mono">
                                <span>🥈</span>
                                <span>2nd</span>
                              </span>
                            )}
                            {medals?.weeklyMedals?.[wb.weekNumber] === 'bronze' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-950 text-[#cfb991] text-[9px] font-black font-mono">
                                <span>🥉</span>
                                <span>3rd</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] sm:text-xs text-neutral-500 font-mono mt-0.5 truncate">
                            {wb.dateRange}
                          </div>
                        </div>

                        {/* Yds / Week & Swims / Week for this week */}
                        <div className="text-right flex items-center gap-2.5 sm:gap-6 flex-shrink-0">
                          <div>
                            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                              Yards
                            </div>
                            <div className="font-mono font-black text-xs sm:text-base text-neutral-900">
                              {wb.totalYards.toLocaleString()}{' '}
                              <span className="text-[10px] text-neutral-500 font-normal">yds</span>
                            </div>
                          </div>

                          <div className="border-l border-neutral-200 pl-2.5 sm:pl-6 text-right">
                            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                              Swims
                            </div>
                            <div className="font-mono font-black text-xs sm:text-base text-neutral-900">
                              {wb.totalSwims}{' '}
                              <span className="text-[10px] text-neutral-500 font-normal">
                                swim{wb.totalSwims === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
