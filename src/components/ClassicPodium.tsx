'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LeaderboardEntry, MetricOption } from '@/types';

interface ClassicPodiumProps {
  entries: LeaderboardEntry[];
  currentMetric: MetricOption;
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicPodium({
  entries,
  currentMetric,
  onSelectAthlete,
}: ClassicPodiumProps) {
  if (entries.length < 3) return null;

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <div className="w-full max-w-3xl mx-auto pt-6 pb-2 px-2">
      {/* 3-Tier Athletic Podium Container */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {/* --- 2ND PLACE (SILVER - LEFT) --- */}
        <div
          onClick={() => onSelectAthlete(second.athlete.id)}
          className="flex flex-col items-center group cursor-pointer"
        >
          {/* Athlete Avatar & Info */}
          <div className="flex flex-col items-center mb-2.5 transition-transform duration-200 group-hover:-translate-y-1">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-300 shadow-sm mb-2">
              {second.athlete.profile_url ? (
                <Image
                  src={second.athlete.profile_url}
                  alt={`${second.athlete.firstname} ${second.athlete.lastname}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 text-lg">
                  {second.athlete.firstname[0]}
                </div>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-neutral-900 text-center leading-tight">
              {second.athlete.firstname} {second.athlete.lastname}
            </div>

            {/* Score */}
            <div className="mt-1 text-center">
              <span className="font-extrabold text-base sm:text-xl font-mono text-neutral-900">
                {currentMetric === 'swims'
                  ? `${second.currentPeriod.swims} swims`
                  : `${second.currentPeriod.yards.toLocaleString()} yds`}
              </span>
              <div className="text-[11px] text-neutral-500 font-mono">
                {currentMetric === 'swims'
                  ? `${second.currentPeriod.yards.toLocaleString()} yds`
                  : `${second.currentPeriod.swims} swims`}
              </div>
            </div>

            {/* Trend vs last week */}
            <div className="mt-1 flex items-center gap-0.5 text-[10px] font-mono font-medium text-neutral-500">
              {currentMetric === 'swims' ? (
                second.delta.swims > 0 ? (
                  <span className="text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-3 h-3 inline" />+{second.delta.swims}
                  </span>
                ) : second.delta.swims < 0 ? (
                  <span className="text-rose-700 flex items-center">
                    <ArrowDownRight className="w-3 h-3 inline" />{second.delta.swims}
                  </span>
                ) : (
                  <span>= last week</span>
                )
              ) : second.delta.yards > 0 ? (
                <span className="text-emerald-700 flex items-center">
                  <ArrowUpRight className="w-3 h-3 inline" />+{second.delta.yards.toLocaleString()}
                </span>
              ) : second.delta.yards < 0 ? (
                <span className="text-rose-700 flex items-center">
                  <ArrowDownRight className="w-3 h-3 inline" />{second.delta.yards.toLocaleString()}
                </span>
              ) : (
                <span>= last week</span>
              )}
            </div>
          </div>

          {/* Podium Step Block #2 */}
          <div className="w-full h-32 sm:h-40 bg-neutral-100 border-2 border-neutral-300 rounded-t-xl flex flex-col items-center justify-between p-3 shadow-inner relative group-hover:bg-neutral-200/70 transition-colors">
            <span className="text-2xl sm:text-3xl font-black font-serif text-neutral-400">
              2
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">
              Silver
            </span>
          </div>
        </div>

        {/* --- 1ST PLACE (GOLD - CENTER - TALLEST WITH PURDUE LOGO) --- */}
        <div
          onClick={() => onSelectAthlete(first.athlete.id)}
          className="flex flex-col items-center group cursor-pointer z-10"
        >
          {/* Athlete Avatar & Info */}
          <div className="flex flex-col items-center mb-2.5 transition-transform duration-200 group-hover:-translate-y-1">
            {/* Gold Crown / Laurel Tag */}
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9d8353] bg-[#cfb991]/25 border border-[#cfb991] px-2.5 py-0.5 rounded-full mb-1">
              Leader
            </div>

            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-100 border-3 border-[#cfb991] shadow-md mb-2">
              {first.athlete.profile_url ? (
                <Image
                  src={first.athlete.profile_url}
                  alt={`${first.athlete.firstname} ${first.athlete.lastname}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-neutral-800 text-xl">
                  {first.athlete.firstname[0]}
                </div>
              )}
            </div>
            <div className="text-sm sm:text-base font-extrabold text-neutral-900 text-center leading-tight">
              {first.athlete.firstname} {first.athlete.lastname}
            </div>

            {/* Score */}
            <div className="mt-1 text-center">
              <span className="font-black text-lg sm:text-2xl font-mono text-neutral-900">
                {currentMetric === 'swims'
                  ? `${first.currentPeriod.swims} swims`
                  : `${first.currentPeriod.yards.toLocaleString()} yds`}
              </span>
              <div className="text-xs text-neutral-600 font-mono font-medium">
                {currentMetric === 'swims'
                  ? `${first.currentPeriod.yards.toLocaleString()} yds`
                  : `${first.currentPeriod.swims} swims`}
              </div>
            </div>

            {/* Trend vs last week */}
            <div className="mt-1 flex items-center gap-0.5 text-[10px] font-mono font-bold text-neutral-600">
              {currentMetric === 'swims' ? (
                first.delta.swims > 0 ? (
                  <span className="text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-3 h-3 inline" />+{first.delta.swims} vs last wk
                  </span>
                ) : first.delta.swims < 0 ? (
                  <span className="text-rose-700 flex items-center">
                    <ArrowDownRight className="w-3 h-3 inline" />{first.delta.swims} vs last wk
                  </span>
                ) : (
                  <span>= last week</span>
                )
              ) : first.delta.yards > 0 ? (
                <span className="text-emerald-700 flex items-center">
                  <ArrowUpRight className="w-3 h-3 inline" />+{first.delta.yards.toLocaleString()} yds
                </span>
              ) : first.delta.yards < 0 ? (
                <span className="text-rose-700 flex items-center">
                  <ArrowDownRight className="w-3 h-3 inline" />{first.delta.yards.toLocaleString()} yds
                </span>
              ) : (
                <span>= last week</span>
              )}
            </div>
          </div>

          {/* Podium Step Block #1 (With Purdue Triathlon Club Logo) */}
          <div className="w-full h-44 sm:h-56 bg-neutral-950 border-2 border-neutral-900 rounded-t-xl flex flex-col items-center justify-between p-3 sm:p-4 text-white shadow-lg relative group-hover:bg-neutral-900 transition-colors">
            <span className="text-3xl sm:text-4xl font-black font-serif text-[#cfb991]">
              1
            </span>

            {/* Purdue Triathlon Club Logo proudly on the podium */}
            <div className="my-auto flex flex-col items-center text-center">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 p-1 border border-[#cfb991]/40 flex items-center justify-center">
                <Image
                  src="/purdue_tri_logo.png"
                  alt="Purdue Triathlon Club"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase font-extrabold text-[#cfb991] mt-1.5">
                Purdue Tri Club
              </span>
            </div>

            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#cfb991]">
              Champion
            </span>
          </div>
        </div>

        {/* --- 3RD PLACE (BRONZE - RIGHT) --- */}
        <div
          onClick={() => onSelectAthlete(third.athlete.id)}
          className="flex flex-col items-center group cursor-pointer"
        >
          {/* Athlete Avatar & Info */}
          <div className="flex flex-col items-center mb-2.5 transition-transform duration-200 group-hover:-translate-y-1">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-100 border-2 border-amber-300 shadow-sm mb-2">
              {third.athlete.profile_url ? (
                <Image
                  src={third.athlete.profile_url}
                  alt={`${third.athlete.firstname} ${third.athlete.lastname}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 text-lg">
                  {third.athlete.firstname[0]}
                </div>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-neutral-900 text-center leading-tight">
              {third.athlete.firstname} {third.athlete.lastname}
            </div>

            {/* Score */}
            <div className="mt-1 text-center">
              <span className="font-extrabold text-base sm:text-xl font-mono text-neutral-900">
                {currentMetric === 'swims'
                  ? `${third.currentPeriod.swims} swims`
                  : `${third.currentPeriod.yards.toLocaleString()} yds`}
              </span>
              <div className="text-[11px] text-neutral-500 font-mono">
                {currentMetric === 'swims'
                  ? `${third.currentPeriod.yards.toLocaleString()} yds`
                  : `${third.currentPeriod.swims} swims`}
              </div>
            </div>

            {/* Trend vs last week */}
            <div className="mt-1 flex items-center gap-0.5 text-[10px] font-mono font-medium text-neutral-500">
              {currentMetric === 'swims' ? (
                third.delta.swims > 0 ? (
                  <span className="text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-3 h-3 inline" />+{third.delta.swims}
                  </span>
                ) : third.delta.swims < 0 ? (
                  <span className="text-rose-700 flex items-center">
                    <ArrowDownRight className="w-3 h-3 inline" />{third.delta.swims}
                  </span>
                ) : (
                  <span>= last week</span>
                )
              ) : third.delta.yards > 0 ? (
                <span className="text-emerald-700 flex items-center">
                  <ArrowUpRight className="w-3 h-3 inline" />+{third.delta.yards.toLocaleString()}
                </span>
              ) : third.delta.yards < 0 ? (
                <span className="text-rose-700 flex items-center">
                  <ArrowDownRight className="w-3 h-3 inline" />{third.delta.yards.toLocaleString()}
                </span>
              ) : (
                <span>= last week</span>
              )}
            </div>
          </div>

          {/* Podium Step Block #3 */}
          <div className="w-full h-24 sm:h-32 bg-neutral-100 border-2 border-neutral-300 rounded-t-xl flex flex-col items-center justify-between p-3 shadow-inner relative group-hover:bg-neutral-200/70 transition-colors">
            <span className="text-2xl sm:text-3xl font-black font-serif text-neutral-400">
              3
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">
              Bronze
            </span>
          </div>
        </div>
      </div>

      {/* Podium Base Line */}
      <div className="w-full h-2 bg-neutral-900 rounded-full" />
    </div>
  );
}
