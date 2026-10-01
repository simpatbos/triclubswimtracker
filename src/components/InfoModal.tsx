'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { X, Trophy, Zap } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white border-2 border-[#cfb991] shadow-xs flex items-center justify-center flex-shrink-0">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club"
                width={30}
                height={30}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight truncate">
                About the Swim Tracker
              </h3>
              <p className="text-xs text-[#9d8353] font-bold uppercase tracking-wider mt-0.5">
                2026 / 2027 Season
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-neutral-700 leading-relaxed overflow-y-auto flex-1">
          {/* Mission Callout */}
          <div className="bg-amber-50/70 border border-[#cfb991] rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm mb-1.5">
              <Trophy className="w-4 h-4 text-[#9d8353]" />
              <span>Road to Nationals</span>
            </div>
            <p className="text-neutral-800 leading-normal">
              This swim tracker is built for the <strong>Purdue Triathlon Club 2026/27 year</strong> to motivate members to get in the water consistently, log quality yardage, and build peak race fitness as we prepare for <strong>Collegiate Club Nationals</strong>.
            </p>
          </div>

          {/* How It Works Points */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-800 flex-shrink-0 mt-0.5 font-bold font-mono text-[11px]">
                1
              </div>
              <div>
                <span className="font-bold text-neutral-900 block">Connect Strava or Log Manually</span>
                <span>Authenticate your Strava profile or log in manually without Strava to record workout yardage directly to the club leaderboard.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-800 flex-shrink-0 mt-0.5 font-bold font-mono text-[11px]">
                2
              </div>
              <div>
                <span className="font-bold text-neutral-900 block">Weekly Podiums</span>
                <span>The leaderboard ranks members by <strong>swims / week</strong> and yardage. The top 3 claim the gold, silver, and black steps.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-800 flex-shrink-0 mt-0.5 font-bold font-mono text-[11px]">
                3
              </div>
              <div>
                <span className="font-bold text-neutral-900 block">Track Challenge Progress</span>
                <span>Click any swimmer to inspect their specific workouts, pace per 100yd, and week-by-week challenge progression.</span>
              </div>
            </div>
          </div>

          {/* Boiler Up Footer */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-neutral-500 font-medium">
            <span className="flex items-center gap-1.5 text-[#9d8353] font-bold">
              <Zap className="w-3.5 h-3.5 fill-[#cfb991] text-[#9d8353]" />
              Boiler Up & Hammer Down!
            </span>
            <span className="text-[11px] font-mono">Prompt engineered by Simon ;)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
