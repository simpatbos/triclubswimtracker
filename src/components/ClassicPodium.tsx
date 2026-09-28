'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types';

interface ClassicPodiumProps {
  entries: LeaderboardEntry[];
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicPodium({
  entries,
  onSelectAthlete,
}: ClassicPodiumProps) {
  if (entries.length < 3) return null;

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const renderAthleteCard = (entry: LeaderboardEntry) => (
    <div
      onClick={() => onSelectAthlete(entry.athlete.id)}
      className="flex items-center gap-2 p-1.5 cursor-pointer rounded-lg hover:bg-neutral-100 transition-colors w-full"
    >
      {/* PFP on left */}
      <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 flex-shrink-0">
        {entry.athlete.profile_url ? (
          <Image
            src={entry.athlete.profile_url}
            alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
            fill
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
        <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate leading-tight">
          {entry.athlete.firstname} {entry.athlete.lastname}
        </div>
        <div className="text-[11px] sm:text-xs font-semibold text-neutral-900 leading-tight mt-0.5">
          {entry.currentPeriod.swims} swims/wk
        </div>
        <div className="text-[10px] text-neutral-500 leading-tight">
          {entry.currentPeriod.yards.toLocaleString()} yds
          {entry.delta.swims !== 0 && (
            <span
              className={`ml-1 font-medium ${
                entry.delta.swims > 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ({entry.delta.swims > 0 ? `+${entry.delta.swims}` : entry.delta.swims})
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto my-6 px-2">
      {/* 3-Step Podium Grid */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {/* 2nd Place: Silver (Left) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center">
            {renderAthleteCard(second)}
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
            {renderAthleteCard(first)}
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

        {/* 3rd Place: Bronze (Right) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center">
            {renderAthleteCard(third)}
          </div>
          {/* Bronze Step */}
          <div className="w-full h-12 sm:h-14 bg-gradient-to-b from-amber-200 to-amber-300 border border-amber-500 rounded-t-lg flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg sm:text-xl font-black text-amber-900">3</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
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
