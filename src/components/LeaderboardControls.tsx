'use strict';
'use client';

import React from 'react';
import { Waves, Flame, Search, Calendar, SlidersHorizontal } from 'lucide-react';
import { MetricOption, TimeframeOption } from '@/types';

interface LeaderboardControlsProps {
  currentMetric: MetricOption;
  currentTimeframe: TimeframeOption;
  searchQuery: string;
  includeDemo: boolean;
  onMetricChange: (metric: MetricOption) => void;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  onSearchChange: (query: string) => void;
  onToggleDemo: () => void;
}

export function LeaderboardControls({
  currentMetric,
  currentTimeframe,
  searchQuery,
  includeDemo,
  onMetricChange,
  onTimeframeChange,
  onSearchChange,
  onToggleDemo,
}: LeaderboardControlsProps) {
  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Metric Selector: Yards/week vs Swims/week */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#cfb991]" />
            Rank By:
          </span>
          <div className="inline-flex p-1 bg-black/60 rounded-xl border border-neutral-800">
            <button
              onClick={() => onMetricChange('yards')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentMetric === 'yards'
                  ? 'bg-[#cfb991] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Yards / Week</span>
            </button>
            <button
              onClick={() => onMetricChange('swims')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentMetric === 'swims'
                  ? 'bg-[#cfb991] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Swims / Week</span>
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#cfb991]" />
            Period:
          </span>
          <div className="inline-flex p-1 bg-black/60 rounded-xl border border-neutral-800 overflow-x-auto">
            <button
              onClick={() => onTimeframeChange('this_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentTimeframe === 'this_week'
                  ? 'bg-neutral-800 text-white border border-[#cfb991]/30 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => onTimeframeChange('since_last_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentTimeframe === 'since_last_week'
                  ? 'bg-neutral-800 text-white border border-[#cfb991]/30 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Combined total since last week (2 weeks)"
            >
              Since Last Week
            </button>
            <button
              onClick={() => onTimeframeChange('last_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentTimeframe === 'last_week'
                  ? 'bg-neutral-800 text-white border border-[#cfb991]/30 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => onTimeframeChange('all_time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentTimeframe === 'all_time'
                  ? 'bg-neutral-800 text-white border border-[#cfb991]/30 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Search & Demo Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search swimmer..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-black/50 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#cfb991]/60 transition-colors"
            />
          </div>

          <button
            onClick={onToggleDemo}
            title={includeDemo ? 'Hide sample team data' : 'Show sample team data'}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
              includeDemo
                ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                : 'bg-black text-neutral-400 border-neutral-800'
            }`}
          >
            {includeDemo ? 'Team Data: ON' : 'Team Data: OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
