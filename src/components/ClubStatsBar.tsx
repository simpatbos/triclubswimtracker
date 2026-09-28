'use strict';
'use client';

import React from 'react';
import { Waves, Flame, Users, Activity, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/date-utils';

interface ClubStatsBarProps {
  summary: {
    totalYards: number;
    totalSwims: number;
    totalDurationSeconds: number;
    activeAthletes: number;
    periodLabel: string;
    sublabel: string;
  };
}

export function ClubStatsBar({ summary }: ClubStatsBarProps) {
  const avgYardsPerSwim =
    summary.totalSwims > 0 ? Math.round(summary.totalYards / summary.totalSwims) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {/* Total Yards */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm group hover:border-[#cfb991]/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Total Yards
          </span>
          <div className="p-2 rounded-lg bg-[#cfb991]/10 text-[#cfb991]">
            <Waves className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {summary.totalYards.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-[#cfb991]">yds</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 truncate">
          {summary.periodLabel} • {summary.sublabel}
        </div>
      </div>

      {/* Total Swims */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm group hover:border-[#cfb991]/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Swims Logged
          </span>
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {summary.totalSwims}
          </span>
          <span className="text-xs font-semibold text-neutral-400">workouts</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 truncate">
          Across all Purdue triathletes
        </div>
      </div>

      {/* Active Swimmers */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm group hover:border-[#cfb991]/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Active Swimmers
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {summary.activeAthletes}
          </span>
          <span className="text-xs font-semibold text-neutral-400">athletes in pool</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 truncate">
          Logged workouts this period
        </div>
      </div>

      {/* Average Distance per Workout */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm group hover:border-[#cfb991]/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Avg / Workout
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {avgYardsPerSwim.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-neutral-400">yds</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1 truncate">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>{formatDuration(summary.totalDurationSeconds)} total pool time</span>
        </div>
      </div>
    </div>
  );
}
