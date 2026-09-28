'use strict';
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Trophy, History, Calendar, ChevronDown, RefreshCw, Users } from 'lucide-react';
import { LeaderboardEntry } from '@/types';
import { CompletedWeekConfig, formatDuration, calculatePacePer100Yd } from '@/lib/date-utils';
import { ClassicPodium } from './ClassicPodium';
import { ClassicLeaderboardList } from './ClassicLeaderboardList';

interface PreviousWeeksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAthleteId?: number | null;
  onSelectAthlete: (athleteId: number) => void;
}

interface ArchiveWeekData {
  entries: LeaderboardEntry[];
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
  } | null;
}

export function PreviousWeeksModal({
  isOpen,
  onClose,
  currentAthleteId,
  onSelectAthlete,
}: PreviousWeeksModalProps) {
  const [weeks, setWeeks] = useState<CompletedWeekConfig[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<CompletedWeekConfig | null>(null);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [summary, setSummary] = useState<ArchiveWeekData['summary']>(null);

  // In-memory cache to prevent flashing on week switch
  const cacheRef = useRef<Map<number, ArchiveWeekData>>(new Map());

  const fetchWeekData = useCallback(async (week: CompletedWeekConfig): Promise<ArchiveWeekData | null> => {
    if (cacheRef.current.has(week.weekNumber)) {
      return cacheRef.current.get(week.weekNumber)!;
    }

    try {
      const params = new URLSearchParams({
        timeframe: 'this_week',
        sortBy: 'swims',
        startMs: week.startMs.toString(),
        endMs: week.endMs.toString(),
        label: week.label,
        sublabel: week.dateRange,
      });

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const payload: ArchiveWeekData = {
          entries: data.leaderboard || [],
          summary: data.summary || null,
        };
        cacheRef.current.set(week.weekNumber, payload);
        return payload;
      }
    } catch (err) {
      console.error(`Failed to load archive for ${week.label}:`, err);
    }
    return null;
  }, []);

  // Load archives list when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function initArchives() {
      try {
        setLoadingWeeks(true);
        setIsInitialLoading(true);
        const res = await fetch('/api/leaderboard/archives');
        const json = await res.json();

        if (active && json.success && json.weeks && json.weeks.length > 0) {
          setWeeks(json.weeks);
          const firstWeek = json.weeks[0];
          setSelectedWeek(firstWeek);

          // Fetch the first week immediately
          const initialData = await fetchWeekData(firstWeek);
          if (active && initialData) {
            setEntries(initialData.entries);
            setSummary(initialData.summary);
          }

          // Background prefetch remaining weeks so dropdown switching is 100% instant
          json.weeks.slice(1).forEach((w: CompletedWeekConfig) => {
            fetchWeekData(w);
          });
        }
      } catch (err) {
        console.error('Failed to load completed weeks archive:', err);
      } finally {
        if (active) {
          setLoadingWeeks(false);
          setIsInitialLoading(false);
        }
      }
    }

    initArchives();
    return () => {
      active = false;
    };
  }, [isOpen, fetchWeekData]);

  // Handle switching week from dropdown without flashing
  const handleWeekSelect = async (weekNumber: number) => {
    const targetWeek = weeks.find(w => w.weekNumber === weekNumber);
    if (!targetWeek || targetWeek.weekNumber === selectedWeek?.weekNumber) return;

    setSelectedWeek(targetWeek);

    // If cached, apply instantly without any layout change or flash
    if (cacheRef.current.has(weekNumber)) {
      const cached = cacheRef.current.get(weekNumber)!;
      setEntries(cached.entries);
      setSummary(cached.summary);
      return;
    }

    // If not cached, keep existing content visible and softly indicate fetching
    setIsSwitching(true);
    const newData = await fetchWeekData(targetWeek);
    if (newData) {
      setEntries(newData.entries);
      setSummary(newData.summary);
    }
    setIsSwitching(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5 text-neutral-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
                  Previous Weeks
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#cfb991] text-neutral-900 font-mono">
                  Archive
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Official weekly final standings for the 2026/27 challenge
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Week Selector Dropdown Row */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-3">
          <label
            htmlFor="archive-week-select"
            className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#9d8353]" />
            <span>Select Week</span>
          </label>

          <div className="flex items-center gap-2">
            {isSwitching && (
              <RefreshCw className="w-3.5 h-3.5 text-[#9d8353] animate-spin" />
            )}

            {loadingWeeks ? (
              <span className="text-xs text-neutral-400 font-mono">Loading weeks...</span>
            ) : weeks.length === 0 ? (
              <span className="text-xs text-neutral-500 italic">No completed weeks yet</span>
            ) : (
              <div className="relative">
                <select
                  id="archive-week-select"
                  value={selectedWeek?.weekNumber ?? ''}
                  onChange={e => handleWeekSelect(parseInt(e.target.value, 10))}
                  className="appearance-none bg-white border border-neutral-300 rounded-xl pl-3.5 pr-8 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#cfb991] cursor-pointer"
                >
                  {weeks.map(week => (
                    <option key={week.weekNumber} value={week.weekNumber}>
                      {week.label} ({week.dateRange})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {isInitialLoading ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-neutral-300 border-t-neutral-900 mb-2" />
              <div>Loading archived standings...</div>
            </div>
          ) : !selectedWeek ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No completed weeks available.
            </div>
          ) : (
            <div className={`space-y-6 transition-opacity duration-150 ${isSwitching ? 'opacity-70' : 'opacity-100'}`}>
              {/* If current user logged in and has an entry for this week, make their stats obvious */}
              {(() => {
                const currentUserEntry = currentAthleteId
                  ? entries.find(e => e.athlete.id === currentAthleteId)
                  : null;
                if (!currentUserEntry) return null;

                return (
                  <div className="bg-amber-50/70 border border-[#cfb991] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-[#cfb991] text-neutral-900 rounded font-mono uppercase tracking-wider">
                        Your Stats
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        Rank #{currentUserEntry.rank} of {entries.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-mono">
                      <span className="font-bold text-neutral-900">
                        {currentUserEntry.currentPeriod.swims} swim{currentUserEntry.currentPeriod.swims === 1 ? '' : 's'}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="font-bold text-neutral-900">
                        {currentUserEntry.currentPeriod.yards.toLocaleString()} yds
                      </span>
                      <span className="text-neutral-300 hidden sm:inline">•</span>
                      <span className="text-neutral-600 hidden sm:inline">
                        {calculatePacePer100Yd(
                          currentUserEntry.currentPeriod.movingTimeSeconds,
                          currentUserEntry.currentPeriod.yards
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Club Totals Strip (Compact Low-Profile) */}
              {summary && (
                <div className="bg-neutral-50/80 border border-neutral-200 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-[#9d8353]" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-800">
                        Club Totals
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#cfb991]/30 text-neutral-900 border border-[#cfb991] font-mono leading-none">
                        Community
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {selectedWeek.label} ({summary.sublabel})
                    </span>
                  </div>

                  <div className="grid grid-cols-4 divide-x divide-neutral-200 text-center pt-1.5 border-t border-neutral-200/60">
                    <div className="px-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">
                        Swims
                      </span>
                      <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono leading-tight inline-flex items-center justify-center gap-0.5 sm:gap-1">
                        <span>{summary.totalSwims}</span>
                        {summary.delta !== undefined && (
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold ${
                              summary.delta.swims > 0
                                ? 'text-emerald-700'
                                : summary.delta.swims < 0
                                ? 'text-rose-700'
                                : 'text-neutral-500'
                            }`}
                          >
                            ({summary.delta.swims > 0 ? `+${summary.delta.swims}` : summary.delta.swims < 0 ? summary.delta.swims : '±0'})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">
                        Yards
                      </span>
                      <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono leading-tight">
                        {summary.totalYards.toLocaleString()}
                      </div>
                    </div>

                    <div className="px-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">
                        Swimmers
                      </span>
                      <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono leading-tight">
                        {summary.activeAthletes}
                      </div>
                    </div>

                    <div className="px-1">
                      <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">
                        Time
                      </span>
                      <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono leading-tight">
                        {formatDuration(summary.totalDurationSeconds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Podium & List */}
              {entries.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-[#9d8353]" />
                      Final Podium & Standings
                    </span>
                  </div>

                  <ClassicPodium
                    entries={entries}
                    currentAthleteId={currentAthleteId}
                    isChallengeView={false}
                    onSelectAthlete={onSelectAthlete}
                  />

                  <ClassicLeaderboardList
                    entries={entries}
                    currentAthleteId={currentAthleteId}
                    isChallengeView={false}
                    onSelectAthlete={onSelectAthlete}
                  />
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-500">
                  No swim records found for {selectedWeek.label}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
