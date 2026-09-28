'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { Trophy, Medal, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LeaderboardEntry, MetricOption } from '@/types';

interface PodiumCardsProps {
  entries: LeaderboardEntry[];
  currentMetric: MetricOption;
  onSelectAthlete: (athleteId: number) => void;
}

export function PodiumCards({
  entries,
  currentMetric,
  onSelectAthlete,
}: PodiumCardsProps) {
  if (entries.length === 0) return null;

  const first = entries[0];
  const second = entries.length > 1 ? entries[1] : null;
  const third = entries.length > 2 ? entries[2] : null;

  const renderCard = (
    entry: LeaderboardEntry | null,
    place: 1 | 2 | 3,
    isCenter: boolean = false
  ) => {
    if (!entry) return <div className="hidden sm:block flex-1" />;

    const colors = {
      1: {
        badgeBg: 'bg-[#cfb991]/20',
        badgeBorder: 'border-[#cfb991]',
        badgeText: 'text-[#cfb991]',
        cardBorder: 'border-[#cfb991]/60 shadow-[#cfb991]/5 shadow-xl',
        ring: 'ring-2 ring-[#cfb991]',
        icon: <Trophy className="w-4 h-4 text-[#cfb991]" />,
        title: '1st Place',
      },
      2: {
        badgeBg: 'bg-slate-300/15',
        badgeBorder: 'border-slate-400',
        badgeText: 'text-slate-300',
        cardBorder: 'border-neutral-700/80',
        ring: 'ring-2 ring-slate-400/60',
        icon: <Medal className="w-4 h-4 text-slate-300" />,
        title: '2nd Place',
      },
      3: {
        badgeBg: 'bg-amber-700/20',
        badgeBorder: 'border-amber-600',
        badgeText: 'text-amber-500',
        cardBorder: 'border-neutral-800',
        ring: 'ring-2 ring-amber-600/50',
        icon: <Medal className="w-4 h-4 text-amber-500" />,
        title: '3rd Place',
      },
    }[place];

    const deltaYards = entry.delta.yards;
    const deltaSwims = entry.delta.swims;

    return (
      <div
        onClick={() => onSelectAthlete(entry.athlete.id)}
        className={`flex-1 bg-neutral-900/70 border ${colors.cardBorder} rounded-3xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:bg-neutral-900 ${
          isCenter ? 'order-1 sm:order-2 sm:-mt-3 z-10' : place === 2 ? 'order-2 sm:order-1' : 'order-3'
        }`}
      >
        {/* Place Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${colors.badgeBg} ${colors.badgeBorder} ${colors.badgeText} mb-3`}
        >
          {colors.icon}
          <span>{colors.title}</span>
        </div>

        {/* Avatar */}
        <div className="relative mb-3">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-800 ${colors.ring} relative`}
          >
            {entry.athlete.profile_url ? (
              <Image
                src={entry.athlete.profile_url}
                alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#cfb991]">
                {entry.athlete.firstname[0]}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-black text-[11px] font-mono font-bold text-white px-1.5 py-0.5 rounded-md border border-neutral-700">
            #{place}
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1">
          {entry.athlete.firstname} {entry.athlete.lastname}
        </h3>
        <p className="text-[11px] text-neutral-400 mb-3">
          @{entry.athlete.username || 'purduetri'}
        </p>

        {/* Primary Metric */}
        <div className="w-full bg-black/60 rounded-2xl py-3 px-4 border border-neutral-800/80 mb-3">
          <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-0.5">
            {currentMetric === 'yards' ? 'Total Yards' : 'Total Swims'}
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-white">
            {currentMetric === 'yards' ? (
              <>
                {entry.currentPeriod.yards.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#cfb991]">yds</span>
              </>
            ) : (
              <>
                {entry.currentPeriod.swims}{' '}
                <span className="text-xs font-normal text-neutral-400">swims</span>
              </>
            )}
          </div>
        </div>

        {/* Secondary stats & delta */}
        <div className="flex items-center justify-between w-full text-xs px-2 text-neutral-400">
          <div>
            {currentMetric === 'yards' ? (
              <span>{entry.currentPeriod.swims} swims</span>
            ) : (
              <span>{entry.currentPeriod.yards.toLocaleString()} yds</span>
            )}
          </div>

          {/* Delta vs last week */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {currentMetric === 'yards' ? (
              deltaYards > 0 ? (
                <span className="text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" />+{deltaYards.toLocaleString()}
                </span>
              ) : deltaYards < 0 ? (
                <span className="text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" />{deltaYards.toLocaleString()}
                </span>
              ) : (
                <span className="text-neutral-400 flex items-center">
                  <Minus className="w-3 h-3" /> 0
                </span>
              )
            ) : deltaSwims > 0 ? (
              <span className="text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3 h-3" />+{deltaSwims}
              </span>
            ) : deltaSwims < 0 ? (
              <span className="text-rose-400 flex items-center">
                <ArrowDownRight className="w-3 h-3" />{deltaSwims}
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center">
                <Minus className="w-3 h-3" /> 0
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#cfb991]" />
          Club Podium
        </h2>
        <span className="text-xs text-neutral-400">Click any swimmer to view workouts</span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
        {renderCard(second, 2)}
        {renderCard(first, 1, true)}
        {renderCard(third, 3)}
      </div>
    </div>
  );
}
