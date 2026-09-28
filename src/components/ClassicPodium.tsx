'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types';
import { formatSwimsPerWeek } from '@/lib/date-utils';

interface ClassicPodiumProps {
  entries: LeaderboardEntry[];
  currentAthleteId?: number | null;
  isChallengeView?: boolean;
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicPodium({
  entries,
  currentAthleteId,
  isChallengeView = false,
  onSelectAthlete,
}: ClassicPodiumProps) {
  if (entries.length === 0) return null;

  const first = entries[0] || null;
  const second = entries.length > 1 ? entries[1] : null;
  const third = entries.length > 2 ? entries[2] : null;

  const renderAthleteCard = (entry: LeaderboardEntry | null, placeholderPlace: number) => {
    if (!entry) {
      return (
        <div className="flex items-center gap-2 p-1.5 opacity-40 w-full">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-dashed border-neutral-400 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
            #{placeholderPlace}
          </div>
          <div className="text-left text-xs text-neutral-400 italic">
            Awaiting member
          </div>
        </div>
      );
    }

    const isCurrentUser = Boolean(currentAthleteId && entry.athlete.id === currentAthleteId);

    return (
      <div
        onClick={() => onSelectAthlete(entry.athlete.id)}
        className={`flex items-center gap-2 p-1.5 cursor-pointer rounded-lg transition-all w-full ${
          isCurrentUser
            ? 'bg-amber-50/80 border-2 border-[#cfb991] shadow-xs'
            : 'hover:bg-neutral-100'
        }`}
      >
        {/* PFP on left */}
        <div
          className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-neutral-200 border flex-shrink-0 ${
            isCurrentUser ? 'border-[#cfb991] ring-1 ring-[#cfb991]' : 'border-neutral-300'
          }`}
        >
          {entry.athlete.profile_url ? (
            <Image
              src={entry.athlete.profile_url}
              alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-600">
              {entry.athlete.firstname[0]}
            </div>
          )}
        </div>

        {/* Name and stats to right of PFP */}
        <div className="min-w-0 text-left">
          <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate leading-tight flex items-center gap-1">
            <span>
              {entry.athlete.firstname} {entry.athlete.lastname}
            </span>
            {isCurrentUser && (
              <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-bold bg-[#cfb991] text-neutral-900 rounded font-mono leading-none">
                YOU
              </span>
            )}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-neutral-900 leading-tight mt-0.5">
            {isChallengeView ? (
              <span>{formatSwimsPerWeek(entry.currentPeriod.swimsPerWeek ?? entry.currentPeriod.swims)} swims/wk</span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span>{entry.currentPeriod.swims} swim{entry.currentPeriod.swims === 1 ? '' : 's'}</span>
                <span
                  className={`text-[10px] font-bold ${
                    entry.delta.swims > 0
                      ? 'text-emerald-700'
                      : entry.delta.swims < 0
                      ? 'text-rose-700'
                      : 'text-neutral-500'
                  }`}
                >
                  ({entry.delta.swims > 0 ? `+${entry.delta.swims}` : entry.delta.swims < 0 ? entry.delta.swims : '±0'})
                </span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-neutral-500 leading-tight">
            {isChallengeView ? (
              <span>{(entry.currentPeriod.yardsPerWeek ?? entry.currentPeriod.yards).toLocaleString()} yds/wk</span>
            ) : (
              <span>{entry.currentPeriod.yards.toLocaleString()} yds</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto my-6 px-2">
      {/* 3-Step Podium Grid */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {/* 2nd Place: Silver (Left) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center">
            {renderAthleteCard(second, 2)}
          </div>
          {/* Silver Step */}
          <div className="w-full h-16 sm:h-20 bg-gradient-to-b from-slate-200 to-slate-300 border border-slate-400 rounded-t-lg flex flex-col items-center justify-center shadow-xs">
            <span className="text-xl sm:text-2xl font-black text-slate-700">2</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Silver
            </span>
          </div>
        </div>

        {/* 1st Place: Gold (Center - Taller with Purdue Tri Club Logo) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center">
            {renderAthleteCard(first, 1)}
          </div>
          {/* Gold Step with Tri Club Logo */}
          <div className="w-full h-24 sm:h-28 bg-gradient-to-b from-[#dfcaa2] to-[#cfb991] border-2 border-[#b89f70] rounded-t-lg flex flex-col items-center justify-between p-2 shadow-xs">
            <span className="text-2xl sm:text-3xl font-black text-[#5c4923]">1</span>

            {/* Purdue Triathlon Club Logo */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 my-auto rounded-full bg-white/40 p-0.5 shadow-2xs flex items-center justify-center">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c4923]">
              Gold
            </span>
          </div>
        </div>

        {/* 3rd Place: Bronze (Right) - Black part color */}
        <div className="flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center">
            {renderAthleteCard(third, 3)}
          </div>
          {/* Bronze Step styled in Black */}
          <div className="w-full h-12 sm:h-14 bg-gradient-to-b from-neutral-800 to-neutral-950 border border-neutral-700 rounded-t-lg flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg sm:text-xl font-black text-white">3</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-300">
              Bronze
            </span>
          </div>
        </div>
      </div>

      {/* Podium baseline */}
      <div className="w-full h-1.5 bg-neutral-900 rounded-full" />
    </div>
  );
}
