'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Trophy,
  Flame,
  Waves,
  Clock,
  Timer,
} from 'lucide-react';
import { LeaderboardEntry, MetricOption, Athlete } from '@/types';
import { formatDuration, calculatePacePer100Yd } from '@/lib/date-utils';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentMetric: MetricOption;
  currentAthlete: Athlete | null;
  onSelectAthlete: (athleteId: number) => void;
}

export function LeaderboardTable({
  entries,
  currentMetric,
  currentAthlete,
  onSelectAthlete,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-12 text-center">
        <Waves className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-300">No swimmers found</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          No swim workouts recorded for this timeframe. Connect your Strava account or toggle team sample data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl overflow-hidden shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-black/40 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" className="py-4 pl-6 pr-3 w-16 text-center">
                Rank
              </th>
              <th scope="col" className="py-4 px-4 min-w-[200px]">
                Athlete
              </th>
              <th
                scope="col"
                className={`py-4 px-4 text-right ${
                  currentMetric === 'yards' ? 'text-[#cfb991]' : ''
                }`}
              >
                <div className="flex items-center justify-end gap-1">
                  <Waves className="w-3.5 h-3.5" />
                  <span>Yards</span>
                </div>
              </th>
              <th
                scope="col"
                className={`py-4 px-4 text-right ${
                  currentMetric === 'swims' ? 'text-[#cfb991]' : ''
                }`}
              >
                <div className="flex items-center justify-end gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Swims</span>
                </div>
              </th>
              <th scope="col" className="py-4 px-4 text-right hidden sm:table-cell">
                <div className="flex items-center justify-end gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Avg Pace</span>
                </div>
              </th>
              <th scope="col" className="py-4 px-4 text-right hidden md:table-cell">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time</span>
                </div>
              </th>
              <th scope="col" className="py-4 px-4 text-right hidden lg:table-cell">
                <span>Longest Swim</span>
              </th>
              <th scope="col" className="py-4 pr-6 pl-3 text-right">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {entries.map(entry => {
              const isCurrentUser = currentAthlete?.id === entry.athlete.id;
              const paceStr = calculatePacePer100Yd(
                entry.currentPeriod.movingTimeSeconds,
                entry.currentPeriod.yards
              );

              return (
                <tr
                  key={entry.athlete.id}
                  onClick={() => onSelectAthlete(entry.athlete.id)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isCurrentUser
                      ? 'bg-[#cfb991]/10 hover:bg-[#cfb991]/15'
                      : 'hover:bg-neutral-800/40'
                  }`}
                >
                  {/* Rank */}
                  <td className="py-4 pl-6 pr-3 text-center">
                    {entry.rank === 1 ? (
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#cfb991]/20 text-[#cfb991] border border-[#cfb991] font-bold text-xs">
                        1
                      </div>
                    ) : entry.rank === 2 ? (
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400 font-bold text-xs">
                        2
                      </div>
                    ) : entry.rank === 3 ? (
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-600 font-bold text-xs">
                        3
                      </div>
                    ) : (
                      <span className="font-mono text-neutral-400 font-semibold">
                        #{entry.rank}
                      </span>
                    )}
                  </td>

                  {/* Swimmer Info */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex-shrink-0">
                        {entry.athlete.profile_url ? (
                          <Image
                            src={entry.athlete.profile_url}
                            alt={`${entry.athlete.firstname} ${entry.athlete.lastname}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-[#cfb991]">
                            {entry.athlete.firstname[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white group-hover:text-[#cfb991] transition-colors">
                            {entry.athlete.firstname} {entry.athlete.lastname}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#cfb991] text-black">
                              YOU
                            </span>
                          )}
                          {entry.athlete.is_demo && (
                            <span className="text-[9px] uppercase px-1 rounded bg-neutral-800 text-neutral-400">
                              Demo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400 block font-mono">
                          @{entry.athlete.username || 'purduetri'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Yards + Week-over-Week delta */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-mono font-bold text-sm sm:text-base text-white">
                      {entry.currentPeriod.yards.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-neutral-400">yds</span>
                    </div>
                    {/* Delta since last week */}
                    <div className="font-mono text-[10px] flex items-center justify-end gap-1 mt-0.5">
                      {entry.delta.yards > 0 ? (
                        <span className="text-emerald-400 flex items-center">
                          <ArrowUpRight className="w-3 h-3" />+{entry.delta.yards.toLocaleString()}
                          {entry.delta.yardsPercentChange !== null && (
                            <span className="ml-0.5">({entry.delta.yardsPercentChange}%)</span>
                          )}
                        </span>
                      ) : entry.delta.yards < 0 ? (
                        <span className="text-rose-400 flex items-center">
                          <ArrowDownRight className="w-3 h-3" />
                          {entry.delta.yards.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-500 flex items-center">
                          <Minus className="w-3 h-3" /> 0
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Swims + Week-over-Week delta */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-mono font-bold text-sm sm:text-base text-white">
                      {entry.currentPeriod.swims}{' '}
                      <span className="text-[11px] font-normal text-neutral-400">swims</span>
                    </div>
                    {/* Delta swims */}
                    <div className="font-mono text-[10px] flex items-center justify-end gap-1 mt-0.5">
                      {entry.delta.swims > 0 ? (
                        <span className="text-emerald-400 flex items-center">
                          <ArrowUpRight className="w-3 h-3" />+{entry.delta.swims}
                        </span>
                      ) : entry.delta.swims < 0 ? (
                        <span className="text-rose-400 flex items-center">
                          <ArrowDownRight className="w-3 h-3" />{entry.delta.swims}
                        </span>
                      ) : (
                        <span className="text-neutral-500 flex items-center">
                          <Minus className="w-3 h-3" /> 0
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Avg Pace */}
                  <td className="py-4 px-4 text-right font-mono text-neutral-300 hidden sm:table-cell">
                    {paceStr}
                  </td>

                  {/* Total Moving Time */}
                  <td className="py-4 px-4 text-right font-mono text-neutral-300 hidden md:table-cell">
                    {formatDuration(entry.currentPeriod.movingTimeSeconds)}
                  </td>

                  {/* Longest Swim */}
                  <td className="py-4 px-4 text-right font-mono text-neutral-300 hidden lg:table-cell">
                    {entry.currentPeriod.longestSwimYards > 0
                      ? `${entry.currentPeriod.longestSwimYards.toLocaleString()} yds`
                      : '--'}
                  </td>

                  {/* Action / View */}
                  <td className="py-4 pr-6 pl-3 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectAthlete(entry.athlete.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors text-xs font-medium"
                    >
                      <span>Logs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
