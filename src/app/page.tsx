'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClassicPodium } from '@/components/ClassicPodium';
import { ClassicLeaderboardList } from '@/components/ClassicLeaderboardList';
import { AthleteModal } from '@/components/AthleteModal';
import { StravaConnectModal } from '@/components/StravaConnectModal';
import { Athlete, LeaderboardEntry } from '@/types';

function SwimTracker() {
  const searchParams = useSearchParams();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [stravaConfigured, setStravaConfigured] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [connectModalOpen, setConnectModalOpen] = useState<boolean>(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle URL feedback from OAuth redirect
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
      setStravaConfigured(Boolean(data.stravaConfigured));
    } catch (err) {
      console.error('Session error', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      // Entire page sorted by swims/week by default
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
    fetchAuth();
    fetchLeaderboard();
  }, []);

  const handleSync = async () => {
    if (!athlete) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Swims synced from Strava!' });
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
    await fetchLeaderboard();
  };

  const handleDemoLogin = async (id: number = 9001) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setAthlete(data.athlete);
        setToast({
          type: 'success',
          message: `Connected as ${data.athlete.firstname} ${data.athlete.lastname}`,
        });
        await fetchLeaderboard();
      }
    } catch (err) {
      console.error('Demo login error', err);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col antialiased">
      {/* Toast */}
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

      {/* Minimal Header */}
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
                onClick={() => setConnectModalOpen(true)}
                className="bg-[#fc5200] hover:bg-[#e04900] text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Connect Strava
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6">
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Swim Leaderboard
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Ranked by swims / week
          </p>
        </div>

        {/* 1. Smaller Gold / Silver / Bronze Podium */}
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
      </main>

      {/* Swimmer Stats Modal */}
      <AthleteModal
        athleteId={selectedAthleteId}
        onClose={() => setSelectedAthleteId(null)}
      />

      {/* Strava Connect Modal */}
      <StravaConnectModal
        isOpen={connectModalOpen}
        stravaConfigured={stravaConfigured}
        onClose={() => setConnectModalOpen(false)}
        onSelectDemoAthlete={handleDemoLogin}
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
