'use strict';
'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Settings as SettingsIcon, Info, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink, RefreshCw, History } from 'lucide-react';
import { ClassicPodium } from '@/components/ClassicPodium';
import { ClassicLeaderboardList } from '@/components/ClassicLeaderboardList';
import { AthleteModal } from '@/components/AthleteModal';
import { SettingsModal } from '@/components/SettingsModal';
import { InfoModal } from '@/components/InfoModal';
import { PreviousWeeksModal } from '@/components/PreviousWeeksModal';
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

  // Main view switcher: 'this_week' (Weekly Leaderboard) vs 'challenge' (Swim Challenge Leaderboard)
  const [leaderboardView, setLeaderboardView] = useState<'this_week' | 'challenge'>('this_week');

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isCheckingClub, setIsCheckingClub] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Read URL query feedback on load
  const authSuccess = searchParams.get('auth_success');
  const authError = searchParams.get('auth_error');
  const notInClubParam = searchParams.get('not_in_club');

  const fetchLeaderboard = useCallback(async (view: 'this_week' | 'challenge') => {
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${view}&sortBy=swims`);
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  const handleViewChange = async (newView: 'this_week' | 'challenge') => {
    if (newView === leaderboardView) return;
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${newView}&sortBy=swims`);
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboardData(data.leaderboard);
      }
      setLeaderboardView(newView);
    } catch (err) {
      console.error('Error switching leaderboard view', err);
      setLeaderboardView(newView);
    }
  };

  const handleVerifyClubMembership = async () => {
    setIsCheckingClub(true);
    try {
      const res = await fetch('/api/athletes/me/check-club', { method: 'POST' });
      const data = await res.json();
      if (data.inClub) {
        if (athlete) {
          setAthlete({ ...athlete, in_club: 1 });
        }
        await fetchLeaderboard(leaderboardView);
        setToast({
          type: 'success',
          message: 'Membership verified! You are now visible on the leaderboard.',
        });
      } else {
        setToast({
          type: 'error',
          message: "Strava says you haven't joined Purdue Triathlon Club (Club #8497) yet. Please click 'Join Club' on Strava.",
        });
      }
    } catch (err) {
      console.error('Club verification error:', err);
      setToast({
        type: 'error',
        message: 'Could not verify club membership right now. Please try again.',
      });
    } finally {
      setIsCheckingClub(false);
    }
  };

  // Initial mount load: fetches auth session and initial leaderboard view ONCE
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await Promise.all([
          // 1. Fetch current athlete session
          fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
              if (active) setAthlete(data.athlete || null);
            })
            .catch(err => console.error('Session check error', err)),

          // 2. Fetch public leaderboard (matches initial leaderboardView state)
          fetch(`/api/leaderboard?timeframe=${leaderboardView}&sortBy=swims`)
            .then(res => res.json())
            .then(data => {
              if (active && data.leaderboard) setLeaderboardData(data.leaderboard);
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

  // Background polling: refreshes active view every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard(leaderboardView);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard, leaderboardView]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAthlete(null);
      // Keep leaderboard visible!
      await fetchLeaderboard(leaderboardView);
      setToast({ type: 'success', message: 'Logged out. Server will continue tracking your swims.' });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAccountDeleted = async () => {
    setAthlete(null);
    await fetchLeaderboard(leaderboardView);
    setToast({ type: 'success', message: 'Account deleted and tracking stopped.' });
  };

  const handleRefreshData = async () => {
    await fetchLeaderboard(leaderboardView);
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

  const currentAthleteRank = athlete
    ? leaderboardData.find(e => e.athlete.id === athlete.id)?.rank
    : null;

  // Determine active notification (from toast or url param)
  const activeMessage =
    toast ||
    (notInClubParam
      ? { type: 'error' as const, message: 'You must join the Purdue Triathlon Club on Strava (Club #8497) to appear on the leaderboard.' }
      : authSuccess
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

      {/* Strava Club #8497 Membership Required Banner */}
      {athlete && athlete.in_club === 0 && (
        <div className="bg-rose-900 text-white py-3 px-4 border-b border-rose-950 animate-in fade-in duration-200">
          <div className="max-w-xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs tracking-tight text-white">
                  Action Required: Join Strava Club #8497
                </p>
                <p className="text-[11px] text-rose-100 mt-0.5 leading-snug">
                  You are not in the <strong>Purdue Triathlon Club on Strava (Club #8497)</strong>. You must join the Strava club to show on the leaderboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
              <a
                href="https://www.strava.com/clubs/8497"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#fc5200] hover:bg-[#e04900] active:scale-95 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs"
              >
                <span>Join Club</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={handleVerifyClubMembership}
                disabled={isCheckingClub}
                className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-white/25"
              >
                {isCheckingClub ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-200 py-3 px-4 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/purdue_tri_logo.png"
              alt="Purdue Triathlon Club"
              width={30}
              height={30}
              className="object-contain"
              priority
            />
            <span className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight">
              Purdue Triathlon Club
            </span>
          </div>

          <div>
            {athlete ? (
              <div className="flex items-center gap-2 text-xs">
                {/* PFP next to # and Name */}
                <div
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-opacity"
                  title="View your stats"
                >
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 flex-shrink-0 group-hover:border-[#cfb991] transition-colors">
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
                  <span className="font-bold text-neutral-900 group-hover:underline flex items-center gap-1">
                    <span className="text-neutral-500 font-mono font-semibold">
                      #{currentAthleteRank ?? '—'}
                    </span>
                    <span>
                      {athlete.firstname} {athlete.lastname}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Settings & Account"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer ml-1"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsInfoOpen(true)}
                  title="About Swim Tracker"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/auth/login"
                  className="bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                  </svg>
                  <span>Connect Strava</span>
                </a>
                <button
                  onClick={() => setIsInfoOpen(true)}
                  title="About Swim Tracker"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area: Public Classic Leaderboard */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 flex flex-col justify-start">
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
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-300">
            <button
              type="button"
              onClick={() => handleViewChange('this_week')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                leaderboardView === 'this_week'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Weekly Leaderboard
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('challenge')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                leaderboardView === 'challenge'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Challenge Leaderboard
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
              <a
                href="/api/auth/login"
                className="inline-flex items-center gap-2 bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                </svg>
                <span>Connect Strava to Join Leaderboard</span>
              </a>
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
