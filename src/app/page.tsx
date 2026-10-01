'use strict';
'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Settings as SettingsIcon, Info, CheckCircle2, AlertCircle, History, Plus, User } from 'lucide-react';
import { ClassicPodium } from '@/components/ClassicPodium';
import { ClassicLeaderboardList } from '@/components/ClassicLeaderboardList';
import { AthleteModal, clearAthleteModalCache } from '@/components/AthleteModal';
import { SettingsModal } from '@/components/SettingsModal';
import { InfoModal } from '@/components/InfoModal';
import { PreviousWeeksModal } from '@/components/PreviousWeeksModal';
import { ManualLoginModal } from '@/components/ManualLoginModal';
import { LogSwimModal } from '@/components/LogSwimModal';
import { Athlete, LeaderboardEntry } from '@/types';

function ClubLoadingScreen() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center p-6 antialiased">
      <div className="flex flex-col items-center text-center max-w-sm animate-in fade-in duration-200">
        {/* Big Purdue Triathlon Club Logo */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-6">
          <Image
            src="/purdue_tri_logo.png"
            alt="Purdue Triathlon Club"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-contain"
            priority
          />
        </div>

        {/* Title & Collegiate Badge */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Purdue Triathlon Club
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#9d8353] font-bold mt-1.5 mb-6">
          Swim Leaderboard
        </p>

        {/* Minimal classic loading bar */}
        <div className="w-28 h-1 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
          <div className="h-full bg-neutral-900 rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function SwimTracker() {
  const searchParams = useSearchParams();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isPreviousWeeksOpen, setIsPreviousWeeksOpen] = useState<boolean>(false);
  const [isManualLoginOpen, setIsManualLoginOpen] = useState<boolean>(false);
  const [isLogSwimOpen, setIsLogSwimOpen] = useState<boolean>(false);

  // Main view switcher: 'this_week' (Weekly Leaderboard) vs 'challenge' (Swim Challenge Leaderboard)
  const [leaderboardView, setLeaderboardView] = useState<'this_week' | 'challenge'>('this_week');

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Client-side cache to enable instant tab switches without refetching
  const leaderboardCacheRef = useRef<Record<string, LeaderboardEntry[]>>({});

  // Read URL query feedback on load
  const authSuccess = searchParams.get('auth_success');
  const authError = searchParams.get('auth_error');

  const fetchLeaderboard = useCallback(async (view: 'this_week' | 'challenge', force = false) => {
    if (!force && leaderboardCacheRef.current[view]) {
      setLeaderboardData(leaderboardCacheRef.current[view]);
      return;
    }
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${view}&sortBy=swims`);
      const data = await res.json();
      if (data.leaderboard) {
        leaderboardCacheRef.current[view] = data.leaderboard;
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  const handleViewChange = async (newView: 'this_week' | 'challenge') => {
    if (newView === leaderboardView) return;
    setLeaderboardView(newView);
    if (leaderboardCacheRef.current[newView]) {
      setLeaderboardData(leaderboardCacheRef.current[newView]);
    } else {
      await fetchLeaderboard(newView);
    }
  };

  // Initial mount load: fetches auth session and initial leaderboard view ONCE
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        // 1. Update the database every time someone loads the page
        await fetch('/api/sync', { method: 'POST' }).catch(err => {
          console.warn('Page load database sync notice:', err);
        });

        // 2. Fetch current athlete session and fresh leaderboard
        await Promise.all([
          fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
              if (active) setAthlete(data.athlete || null);
            })
            .catch(err => console.error('Session check error', err)),

          fetch(`/api/leaderboard?timeframe=${leaderboardView}&sortBy=swims`)
            .then(res => res.json())
            .then(data => {
              if (active && data.leaderboard) {
                leaderboardCacheRef.current[leaderboardView] = data.leaderboard;
                setLeaderboardData(data.leaderboard);
              }
            })
            .catch(err => console.error('Leaderboard loading error', err)),
        ]);
      } catch (err) {
        console.error('Initial data load error', err);
      } finally {
        if (active) {
          setIsInitialLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAthlete(null);
      leaderboardCacheRef.current = {};
      clearAthleteModalCache();
      // Keep leaderboard visible!
      await fetchLeaderboard(leaderboardView, true);
      setToast({ type: 'success', message: 'Logged out. Server will continue tracking your swims.' });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAccountDeleted = async () => {
    setAthlete(null);
    leaderboardCacheRef.current = {};
    clearAthleteModalCache();
    await fetchLeaderboard(leaderboardView, true);
    setToast({ type: 'success', message: 'Account deleted and tracking stopped.' });
  };

  const handleRefreshData = async () => {
    leaderboardCacheRef.current = {};
    clearAthleteModalCache();
    await fetchLeaderboard(leaderboardView, true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.athlete) {
        setAthlete(data.athlete);
      }
    } catch (err) {
      console.error('Failed to reload athlete session after sync:', err);
    }
  };

  const handleManualLoginSuccess = async (newAthlete: Athlete) => {
    setAthlete(newAthlete);
    leaderboardCacheRef.current = {};
    clearAthleteModalCache();
    await fetchLeaderboard(leaderboardView, true);
    setToast({ type: 'success', message: `Welcome, ${newAthlete.firstname}!` });
  };

  const handleSwimSaved = async () => {
    leaderboardCacheRef.current = {};
    clearAthleteModalCache();
    await fetchLeaderboard(leaderboardView, true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.athlete) {
        setAthlete(data.athlete);
      }
    } catch (err) {
      console.error('Failed to reload athlete session after swim log:', err);
    }
    setToast({ type: 'success', message: 'Swim workout logged successfully!' });
  };

  const currentAthleteRank = athlete
    ? leaderboardData.find(e => e.athlete.id === athlete.id)?.rank
    : null;

  // Determine active notification (from toast or url param)
  const activeMessage =
    toast ||
    (authSuccess
      ? { type: 'success' as const, message: 'Strava connected! Swims are synced.' }
      : authError
      ? { type: 'error' as const, message: `Strava error: ${authError}` }
      : null);

  // Full-screen clean branded loading screen
  if (isInitialLoading) {
    return <ClubLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col antialiased">
      {/* Toast Notification */}
      {activeMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in duration-150">
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-md ${
              activeMessage.type === 'success'
                ? 'bg-neutral-900 text-white border-neutral-800'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {activeMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#cfb991]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{activeMessage.message}</span>
            <button
              onClick={() => {
                setToast(null);
                window.history.replaceState({}, '', '/');
              }}
              className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-200 py-2.5 sm:py-3 px-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <Image
              src="/purdue_tri_logo.png"
              alt="Purdue Triathlon Club"
              width={28}
              height={28}
              className="object-contain sm:w-[30px] sm:h-[30px]"
              priority
            />
            <span className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight whitespace-nowrap">
              Purdue Tri<span className="hidden sm:inline">athlon Club</span>
            </span>
          </div>

          <div className="min-w-0">
            {athlete ? (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
                {/* PFP next to # and Name */}
                <div
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
                  title="View your stats"
                >
                  <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 flex-shrink-0 group-hover:border-[#cfb991] transition-colors">
                    {athlete.profile_url ? (
                      <Image
                        src={athlete.profile_url}
                        alt={`${athlete.firstname} ${athlete.lastname}`}
                        fill
                        sizes="28px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-700">
                        {athlete.firstname?.[0] || 'P'}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-neutral-900 group-hover:underline flex items-center gap-1 truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none text-xs">
                    <span className="text-neutral-500 font-mono font-semibold text-[11px] sm:text-xs flex-shrink-0">
                      #{currentAthleteRank ?? '—'}
                    </span>
                    <span className="truncate">
                      {athlete.firstname} <span className="hidden sm:inline">{athlete.lastname}</span>
                    </span>
                  </span>
                </div>

                {athlete.is_manual ? (
                  <button
                    onClick={() => setIsLogSwimOpen(true)}
                    className="bg-[#cfb991] hover:bg-[#bfa77b] active:scale-[0.98] text-neutral-900 text-xs font-bold px-2 sm:px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-2xs flex-shrink-0"
                    title="Log a swim workout"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Log Swim</span>
                  </button>
                ) : null}

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Settings & Account"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer flex-shrink-0"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsInfoOpen(true)}
                  title="About Swim Tracker"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <a
                  href="/api/auth/login"
                  className="bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5 fill-white flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                  </svg>
                  <span className="sm:hidden">Strava</span>
                  <span className="hidden sm:inline">Connect Strava</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsManualLoginOpen(true)}
                  className="bg-neutral-100 hover:bg-neutral-200 active:scale-[0.99] text-neutral-800 border border-neutral-300 text-xs font-bold px-2 sm:px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
                  title="Log in manually without Strava"
                >
                  <User className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                  <span className="sm:hidden">Manual</span>
                  <span className="hidden sm:inline">Log In Manually</span>
                </button>
                <button
                  onClick={() => setIsInfoOpen(true)}
                  title="About Swim Tracker"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area: Public Classic Leaderboard */}
      <main className="flex-1 max-w-xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8 flex flex-col justify-start">
        <div className="text-center mb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {leaderboardView === 'this_week' ? 'Weekly Leaderboard' : 'Swim Challenge Leaderboard'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {leaderboardView === 'this_week'
              ? 'Ranked by swims this week (tiebreaker: yards)'
              : 'Ranked by swims / week since challenge start (tiebreaker: yds / week)'}
          </p>
        </div>

        {/* View Switcher: Weekly Leaderboard vs Challenge Leaderboard */}
        <div className="flex justify-center mb-5 sm:mb-6">
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-300 max-w-full">
            <button
              type="button"
              onClick={() => handleViewChange('this_week')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                leaderboardView === 'this_week'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="sm:hidden">Weekly</span>
              <span className="hidden sm:inline">Weekly Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('challenge')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                leaderboardView === 'challenge'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="sm:hidden">Challenge</span>
              <span className="hidden sm:inline">Challenge Leaderboard</span>
            </button>
          </div>
        </div>

        {leaderboardData.length > 0 ? (
          <>
            {/* Top 3 on Podium with Purdue Tri Club Logo */}
            <ClassicPodium
              entries={leaderboardData}
              currentAthleteId={athlete?.id}
              isChallengeView={leaderboardView === 'challenge'}
              onSelectAthlete={setSelectedAthleteId}
            />

            {/* Ranks 4+ in Minimal List */}
            <ClassicLeaderboardList
              entries={leaderboardData}
              currentAthleteId={athlete?.id}
              isChallengeView={leaderboardView === 'challenge'}
              onSelectAthlete={setSelectedAthleteId}
            />
          </>
        ) : (
          <div className="my-auto py-12 text-center max-w-sm mx-auto">
            <div className="relative w-20 h-20 mx-auto mb-4 opacity-80">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club"
                fill
                sizes="80px"
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-sm font-bold text-neutral-900 mb-1">
              {leaderboardView === 'this_week'
                ? 'No swims logged yet this week'
                : 'No swims logged yet in the challenge'}
            </h2>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Log a swim workout on Strava to take the top step on the podium.
            </p>
            {!athlete && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href="/api/auth/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                  </svg>
                  <span>Connect Strava</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsManualLoginOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.99] text-neutral-800 border border-neutral-300 text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Log In Manually</span>
                </button>
              </div>
            )}
          </div>
        )}
        {/* Previous Weeks Archive Trigger */}
        <div className="mt-8 mb-6 flex justify-center">
          <button
            type="button"
            onClick={() => setIsPreviousWeeksOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-300 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <History className="w-4 h-4 text-neutral-600" />
            <span>View Previous Weeks</span>
          </button>
        </div>
      </main>

      {/* Swimmer Stats Modal */}
      <AthleteModal
        athleteId={selectedAthleteId}
        onClose={() => setSelectedAthleteId(null)}
        viewMode={leaderboardView}
        onViewModeChange={handleViewChange}
      />

      {/* Athlete Settings Modal */}
      <SettingsModal
        athlete={athlete}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={handleLogout}
        onAccountDeleted={handleAccountDeleted}
        onRefresh={handleRefreshData}
        onOpenLogSwim={() => setIsLogSwimOpen(true)}
      />

      {/* Manual Swimmer Login Modal */}
      <ManualLoginModal
        isOpen={isManualLoginOpen}
        onClose={() => setIsManualLoginOpen(false)}
        onLoginSuccess={handleManualLoginSuccess}
      />

      {/* Manual Log Swim Workout Modal */}
      <LogSwimModal
        isOpen={isLogSwimOpen}
        onClose={() => setIsLogSwimOpen(false)}
        onSwimSaved={handleSwimSaved}
      />

      {/* Info / About Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      {/* Previous Weeks Archive Modal */}
      <PreviousWeeksModal
        isOpen={isPreviousWeeksOpen}
        onClose={() => setIsPreviousWeeksOpen(false)}
        currentAthleteId={athlete?.id}
        onSelectAthlete={setSelectedAthleteId}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<ClubLoadingScreen />}>
      <SwimTracker />
    </Suspense>
  );
}
