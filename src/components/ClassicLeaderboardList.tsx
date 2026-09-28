'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types';
import { formatSwimsPerWeek } from '@/lib/date-utils';

interface ClassicLeaderboardListProps {
  entries: LeaderboardEntry[];
  currentAthleteId?: number | null;
  isChallengeView?: boolean;
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicLeaderboardList({
  entries,
  currentAthleteId,
  isChallengeView = false,
  onSelectAthlete,
}: ClassicLeaderboardListProps) {
  // Only display entries 4 and onwards
  const listEntries = entries.slice(3);

  if (listEntries.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto mt-6 mb-12">
      <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
        {listEntries.map(entry => {
          const isCurrentUser = Boolean(
            currentAthleteId && entry.athlete.id === currentAthleteId
          );

          return (
            <div
              key={entry.athlete.id}
              onClick={() => onSelectAthlete(entry.athlete.id)}
              className={`flex items-center justify-between py-2.5 px-2.5 cursor-pointer transition-colors ${
                isCurrentUser
                  ? 'bg-amber-50/80 border-l-4 border-l-[#cfb991] pl-3'
                  : 'hover:bg-neutral-50 active:bg-neutral-100'
              }`}
            >
              {/* Rank, PFP, and Name + Stats to the right of PFP */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank */}
                <span
                  className={`font-bold text-xs w-5 text-center flex-shrink-0 font-mono ${
                    isCurrentUser ? 'text-neutral-900' : 'text-neutral-400'
                  }`}
                >
                  #{entry.rank}
                </span>

                {/* PFP */}
                <div
                  className={`relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 border flex-shrink-0 ${
                    isCurrentUser
                      ? 'border-[#cfb991] ring-1 ring-[#cfb991]'
                      : 'border-neutral-300'
                  }`}
                >
                  {entry.athlete.profile_url ? (
                    <Image
                      src={entry.athlete.profile_url}
                      alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-700">
                      {entry.athlete.firstname[0]}
                    </div>
                  )}
                </div>

                {/* Name and Stats to the right of PFP */}
                <div className="min-w-0 text-left">
                  <div className="font-bold text-sm text-neutral-900 leading-snug truncate flex items-center gap-1.5">
                    <span>
                      {entry.athlete.firstname} {entry.athlete.lastname}
                    </span>
                    {isCurrentUser && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#cfb991] text-neutral-900 rounded font-mono leading-none">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-600 leading-snug">
                    <span className="font-bold text-neutral-900">
                      {isChallengeView
                        ? `${formatSwimsPerWeek(entry.currentPeriod.swimsPerWeek ?? entry.currentPeriod.swims)} swims/wk`
                        : `${entry.currentPeriod.swims} swim${entry.currentPeriod.swims === 1 ? '' : 's'}`}
                    </span>
                    {!isChallengeView && (
                      <span
                        className={`ml-1 font-medium ${
                          entry.delta.swims > 0
                            ? 'text-emerald-700'
                            : entry.delta.swims < 0
                            ? 'text-rose-700'
                            : 'text-neutral-500'
                        }`}
                      >
                        ({entry.delta.swims > 0 ? `+${entry.delta.swims}` : entry.delta.swims < 0 ? entry.delta.swims : '±0'})
                      </span>
                    )}
                    <span className="mx-1.5 text-neutral-300">•</span>
                    <span>
                      {isChallengeView
                        ? `${(entry.currentPeriod.yardsPerWeek ?? entry.currentPeriod.yards).toLocaleString()} yds/wk`
                        : `${entry.currentPeriod.yards.toLocaleString()} yds`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtle view indicator */}
              <span className="text-[11px] text-neutral-400 font-medium ml-2 flex-shrink-0">
                View &rsaquo;
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
