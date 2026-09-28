'use strict';
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClassicPodium } from '@/components/ClassicPodium';
import { ClassicLeaderboardList } from '@/components/ClassicLeaderboardList';
import { AthleteModal } from '@/components/AthleteModal';
import { Athlete, LeaderboardEntry } from '@/types';

function SwimTracker() {
  const searchParams = useSearchParams();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle URL feedback from Strava OAuth redirect
  useEffect(() => {
    if (searchParams.get('auth_success')) {
      setToast({
        type: 'success',
        message: 'Strava connected! Swims synced.',
      });
      window.history.replaceState({}, '', '/');
    } else if (searchParams.get('auth_error')) {
      setToast({
        type: 'error',
        message: `Strava error: ${searchParams.get('auth_error')}`,
      });
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const fetchAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setAthlete(data.athlete);
      return data.athlete;
    } catch (err) {
      console.error('Session error', err);
      return null;
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard?timeframe=this_week&sortBy=swims&includeDemo=true');
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      console.error('Leaderboard error', err);
    }
  };

  useEffect(() => {
    fetchAuth().then(user => {
      if (user) {
        fetchLeaderboard();
      }
    });

    // Auto-update every 30 seconds when an athlete uploads a swim
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!athlete) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Swims updated from Strava!' });
        await fetchAuth();
        await fetchLeaderboard();
      } else {
        setToast({ type: 'error', message: data.error || 'Sync failed' });
      }
    } catch {
      setToast({ type: 'error', message: 'Sync error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAthlete(null);
    setToast({ type: 'success', message: 'Disconnected' });
  };

  // Direct navigation to authorization page with 0 manual input
  const handleConnectClick = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in duration-150">
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-md ${
              toast.type === 'success'
                ? 'bg-neutral-900 text-white border-neutral-800'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#cfb991]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-neutral-400 hover:text-white">
              ×
            </button>
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
                <span
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className="font-bold text-neutral-900 cursor-pointer hover:underline"
                >
                  {athlete.firstname} {athlete.lastname}
                </span>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Sync Swims"
                  className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-neutral-800' : ''}`} />
                </button>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1 text-neutral-400 hover:text-rose-600"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectClick}
                className="bg-[#fc5200] hover:bg-[#e04900] text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                </svg>
                <span>Connect Strava</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {!athlete ? (
          /* GATED STATE: Unconnected members cannot view leaderboard */
          <div className="my-auto py-12 text-center max-w-sm mx-auto">
            {/* Purdue Tri Logo */}
            <div className="relative w-24 h-24 mx-auto mb-5">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Purdue Triathlon Club
            </h1>
            <p className="text-xs uppercase tracking-widest text-[#9d8353] font-bold mt-1 mb-4">
              Swim Leaderboard
            </p>

            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Connect your Strava account to view the Purdue Triathlon swim leaderboard and track weekly mileage.
            </p>

            {/* Direct Connect Strava Button - Takes user straight to authorization page */}
            <button
              onClick={handleConnectClick}
              className="w-full flex items-center justify-center gap-2.5 bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
              </svg>
              <span>Connect with Strava</span>
            </button>
          </div>
        ) : (
          /* CONNECTED STATE: Full Leaderboard Unlocked */
          <>
            <div className="text-center mb-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                Swim Leaderboard
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ranked by swims / week
              </p>
            </div>

            {/* 1. Smaller Gold / Silver / Bronze Podium with Purdue Tri Club Logo */}
            {leaderboardData.length >= 3 && (
              <ClassicPodium
                entries={leaderboardData}
                onSelectAthlete={setSelectedAthleteId}
              />
            )}

            {/* 2. The Rest in a List */}
            <ClassicLeaderboardList
              entries={leaderboardData}
              onSelectAthlete={setSelectedAthleteId}
            />
          </>
        )}
      </main>

      {/* Swimmer Stats Modal */}
      <AthleteModal
        athleteId={selectedAthleteId}
        onClose={() => setSelectedAthleteId(null)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-neutral-900">
          <RefreshCw className="w-5 h-5 animate-spin text-neutral-500" />
        </div>
      }
    >
      <SwimTracker />
    </Suspense>
  );
}
