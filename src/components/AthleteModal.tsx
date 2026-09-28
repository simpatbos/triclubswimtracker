'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Waves,
  Timer,
  ExternalLink,
  Flame,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Swim, Athlete } from '@/types';
import { formatDuration, formatSwimPace, calculatePacePer100Yd } from '@/lib/date-utils';

interface AthleteModalProps {
  athleteId: number | null;
  onClose: () => void;
}

export function AthleteModal({ athleteId, onClose }: AthleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [swims, setSwims] = useState<Swim[]>([]);

  useEffect(() => {
    if (!athleteId) {
      setAthlete(null);
      setSwims([]);
      return;
    }

    setLoading(true);
    fetch(`/api/athletes/${athleteId}/swims`)
      .then(res => res.json())
      .then(data => {
        if (data.athlete) setAthlete(data.athlete);
        if (data.swims) setSwims(data.swims);
      })
      .catch(err => console.error('Failed to load athlete swims', err))
      .finally(() => setLoading(false));
  }, [athleteId]);

  if (!athleteId) return null;

  const totalYards = swims.reduce((acc, s) => acc + s.distance_yards, 0);
  const totalSeconds = swims.reduce((acc, s) => acc + s.moving_time, 0);
  const overallPace = calculatePacePer100Yd(totalSeconds, totalYards);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-[#cfb991] shadow-xs">
              {athlete?.profile_url ? (
                <Image
                  src={athlete.profile_url}
                  alt={`${athlete.firstname} ${athlete.lastname}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-neutral-800">
                  {athlete?.firstname?.[0] || 'P'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">
                  {athlete ? `${athlete.firstname} ${athlete.lastname}` : 'Loading...'}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 font-mono">
                @{athlete?.username || 'purduetriclub'} • Purdue Triathlon Club
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center text-neutral-400">
              <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-[#9d8353]" />
              <p className="text-xs font-mono">Loading swimmer statistics...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Waves className="w-3.5 h-3.5 text-[#9d8353]" />
                    <span>Total Yards</span>
                  </div>
                  <div className="text-lg font-black text-neutral-900 font-mono">
                    {Math.round(totalYards).toLocaleString()}{' '}
                    <span className="text-[10px] text-neutral-500">yds</span>
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-600" />
                    <span>Swims Logged</span>
                  </div>
                  <div className="text-lg font-black text-neutral-900 font-mono">
                    {swims.length}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Avg Pace</span>
                  </div>
                  <div className="text-lg font-black text-neutral-900 font-mono">
                    {overallPace}
                  </div>
                </div>
              </div>

              {/* Individual Workouts */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Swim Log ({swims.length} workouts)</span>
                </h4>

                {swims.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">
                    No swim sessions recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {swims.map(swim => {
                      const pace = formatSwimPace(swim.average_speed);
                      const swimDate = new Date(swim.start_date_local || swim.start_date);

                      return (
                        <div
                          key={swim.id}
                          className="bg-white border border-neutral-200 rounded-xl p-3.5 flex items-center justify-between hover:border-neutral-400 transition-colors shadow-2xs"
                        >
                          <div>
                            <div className="font-bold text-neutral-900 text-xs sm:text-sm">
                              {swim.name}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                              <span>
                                {swimDate.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span>•</span>
                              <span>
                                {swimDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-neutral-900 text-xs sm:text-sm">
                              {Math.round(swim.distance_yards).toLocaleString()}{' '}
                              <span className="text-[10px] text-neutral-500">yds</span>
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono flex items-center justify-end gap-2 mt-0.5">
                              <span>{formatDuration(swim.moving_time)}</span>
                              <span>•</span>
                              <span>{pace}</span>
                              {!swim.is_demo && (
                                <a
                                  href={`https://www.strava.com/activities/${swim.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:text-orange-700 ml-1"
                                  title="View on Strava"
                                >
                                  <ExternalLink className="w-3 h-3 inline" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
