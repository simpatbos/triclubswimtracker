'use strict';
'use client';

import React from 'react';
import Image from 'next/image';
import { RefreshCw, LogOut, Sparkles, UserCheck } from 'lucide-react';
import { Athlete } from '@/types';

interface HeaderProps {
  athlete: Athlete | null;
  stravaConfigured: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onLogout: () => void;
  onOpenConnectModal: () => void;
  onQuickDemoLogin: () => void;
}

export function Header({
  athlete,
  stravaConfigured,
  isSyncing,
  onSync,
  onLogout,
  onOpenConnectModal,
  onQuickDemoLogin,
}: HeaderProps) {
  return (
    <header className="border-b border-neutral-800 bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 flex-shrink-0 bg-neutral-900 rounded-xl p-1 border border-neutral-800 shadow-inner flex items-center justify-center overflow-hidden">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg sm:text-xl">
                  PURDUE <span className="text-[#cfb991]">TRIATHLON</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#cfb991]/15 text-[#cfb991] border border-[#cfb991]/30">
                  Swim Tracker
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Official Club Swim Leaderboard & Yards Tracker
              </p>
            </div>
          </div>

          {/* User / Connect Actions */}
          <div className="flex items-center gap-2.5">
            {athlete ? (
              <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-3 py-1.5 shadow-sm">
                {/* Athlete Avatar */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-[#cfb991]/40 flex-shrink-0">
                  {athlete.profile_url ? (
                    <Image
                      src={athlete.profile_url}
                      alt={`${athlete.firstname} ${athlete.lastname}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#cfb991]">
                      {athlete.firstname[0]}
                    </div>
                  )}
                </div>

                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-200">
                      {athlete.firstname} {athlete.lastname}
                    </span>
                    {athlete.is_demo && (
                      <span className="text-[9px] uppercase tracking-wide bg-neutral-800 text-neutral-400 px-1 rounded">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 block font-mono">
                    {athlete.last_synced_at
                      ? `Synced ${new Date(athlete.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not synced yet'}
                  </span>
                </div>

                {/* Sync Button */}
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  title="Sync Swims from Strava"
                  className="p-1.5 text-neutral-400 hover:text-[#cfb991] hover:bg-neutral-800/80 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#cfb991]' : ''}`} />
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Disconnect athlete"
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Connect with Strava Button */}
                <button
                  onClick={onOpenConnectModal}
                  className="group relative flex items-center gap-2 bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg shadow-[#fc5200]/20 transition-all duration-150 cursor-pointer"
                >
                  {/* Strava "S" geometric style icon */}
                  <svg
                    className="w-4 h-4 fill-white"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Strava logo"
                  >
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                  </svg>
                  <span>Connect with Strava</span>
                </button>

                {/* Quick Demo Swimmer button */}
                <button
                  onClick={onQuickDemoLogin}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-neutral-300 hover:text-white border border-neutral-800 text-xs px-3 py-2 rounded-xl transition-all"
                  title="Log in as demo athlete to test"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#cfb991]" />
                  <span>Demo Swimmer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
