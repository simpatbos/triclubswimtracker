'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Waves, Flame } from 'lucide-react';
import { LeaderboardEntry, MetricOption } from '@/types';

interface ClassicLeaderboardListProps {
  entries: LeaderboardEntry[];
  currentMetric: MetricOption;
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicLeaderboardList({
  entries,
  currentMetric,
  onSelectAthlete,
}: ClassicLeaderboardListProps) {
  // Only display entries 4 and onwards in this list
  const listEntries = entries.slice(3);

  if (listEntries.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-16 px-2">
      <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-900 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
          Swimmer
        </span>
        <div className="flex items-center gap-6 text-right">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            {currentMetric === 'swims' ? 'Swims / Wk' : 'Yards / Wk'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 hidden sm:inline">
            {currentMetric === 'swims' ? 'Yards' : 'Swims'}
          </span>
        </div>
      </div>

      <div className="divide-y divide-neutral-200">
        {listEntries.map(entry => (
          <div
            key={entry.athlete.id}
            onClick={() => onSelectAthlete(entry.athlete.id)}
            className="flex items-center justify-between py-3.5 px-3 -mx-3 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 cursor-pointer transition-colors group"
          >
            {/* Left: Rank & Swimmer */}
            <div className="flex items-center gap-3.5">
              <span className="font-mono font-bold text-neutral-400 text-sm w-6 text-center">
                #{entry.rank}
              </span>

              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-300 flex-shrink-0">
                {entry.athlete.profile_url ? (
                  <Image
                    src={entry.athlete.profile_url}
                    alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-neutral-700 text-xs">
                    {entry.athlete.firstname[0]}
                  </div>
                )}
              </div>

              <div>
                <div className="font-bold text-sm text-neutral-900 group-hover:text-black transition-colors">
                  {entry.athlete.firstname} {entry.athlete.lastname}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  @{entry.athlete.username || 'purduetri'}
                </div>
              </div>
            </div>

            {/* Right: Scores & Trend */}
            <div className="flex items-center gap-4 sm:gap-6 text-right">
              {/* Primary Score */}
              <div>
                <div className="font-mono font-black text-base sm:text-lg text-neutral-900">
                  {currentMetric === 'swims'
                    ? `${entry.currentPeriod.swims} swims`
                    : `${entry.currentPeriod.yards.toLocaleString()} yds`}
                </div>

                {/* Trend vs last week */}
                <div className="text-[10px] font-mono font-medium flex items-center justify-end gap-0.5">
                  {currentMetric === 'swims' ? (
                    entry.delta.swims > 0 ? (
                      <span className="text-emerald-700 flex items-center">
                        <ArrowUpRight className="w-3 h-3" />+{entry.delta.swims}
                      </span>
                    ) : entry.delta.swims < 0 ? (
                      <span className="text-rose-700 flex items-center">
                        <ArrowDownRight className="w-3 h-3" />{entry.delta.swims}
                      </span>
                    ) : (
                      <span className="text-neutral-400">=</span>
                    )
                  ) : entry.delta.yards > 0 ? (
                    <span className="text-emerald-700 flex items-center">
                      <ArrowUpRight className="w-3 h-3" />+{entry.delta.yards.toLocaleString()}
                    </span>
                  ) : entry.delta.yards < 0 ? (
                    <span className="text-rose-700 flex items-center">
                      <ArrowDownRight className="w-3 h-3" />{entry.delta.yards.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-neutral-400">=</span>
                  )}
                </div>
              </div>

              {/* Secondary Metric */}
              <div className="w-20 font-mono text-xs text-neutral-500 hidden sm:block">
                {currentMetric === 'swims'
                  ? `${entry.currentPeriod.yards.toLocaleString()} yds`
                  : `${entry.currentPeriod.swims} swims`}
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
