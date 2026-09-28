'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types';

interface ClassicLeaderboardListProps {
  entries: LeaderboardEntry[];
  onSelectAthlete: (athleteId: number) => void;
}

export function ClassicLeaderboardList({
  entries,
  onSelectAthlete,
}: ClassicLeaderboardListProps) {
  // Only display entries 4 and onwards
  const listEntries = entries.slice(3);

  if (listEntries.length === 0) return null;

  return (
    <div className="w-full max-w-xl mx-auto mt-6 mb-12">
      <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
        {listEntries.map(entry => (
          <div
            key={entry.athlete.id}
            onClick={() => onSelectAthlete(entry.athlete.id)}
            className="flex items-center justify-between py-2.5 px-2 hover:bg-neutral-50 active:bg-neutral-100 cursor-pointer transition-colors"
          >
            {/* Rank, PFP, and Name + Stats to the right of PFP */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Rank */}
              <span className="font-bold text-neutral-400 text-xs w-5 text-center flex-shrink-0">
                #{entry.rank}
              </span>

              {/* PFP */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 flex-shrink-0">
                {entry.athlete.profile_url ? (
                  <Image
                    src={entry.athlete.profile_url}
                    alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
                    fill
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
                <div className="font-bold text-sm text-neutral-900 leading-snug truncate">
                  {entry.athlete.firstname} {entry.athlete.lastname}
                </div>
                <div className="text-xs text-neutral-600 leading-snug">
                  <span className="font-bold text-neutral-900">
                    {entry.currentPeriod.swims} swims/wk
                  </span>
                  <span className="mx-1.5 text-neutral-300">•</span>
                  <span>{entry.currentPeriod.yards.toLocaleString()} yds</span>
                  {entry.delta.swims !== 0 && (
                    <span
                      className={`ml-1.5 font-medium ${
                        entry.delta.swims > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ({entry.delta.swims > 0 ? `+${entry.delta.swims}` : entry.delta.swims} since last wk)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Subtle view indicator */}
            <span className="text-[11px] text-neutral-400 font-medium ml-2 flex-shrink-0">
              View &rsaquo;
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
