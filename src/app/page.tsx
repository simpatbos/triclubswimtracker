'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  RefreshCw,
  LogOut,
  Flame,
  Waves,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ClassicPodium } from '@/components/ClassicPodium';
import { ClassicLeaderboardList } from '@/components/ClassicLeaderboardList';
import { AthleteModal } from '@/components/AthleteModal';
import { StravaConnectModal } from '@/components/StravaConnectModal';
import { Athlete, LeaderboardEntry, MetricOption, TimeframeOption } from '@/types';

function SwimTracker() {
  const searchParams = useSearchParams();

  // Authentication & session state
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [stravaConfigured, setStravaConfigured] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [connectModalOpen, setConnectModalOpen] = useState<boolean>(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);

  // Leaderboard options: Default metric is 'swims' as requested!
  const [metric, setMetric] = useState<MetricOption>('swims');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('this_week');

  // Data state
  const [loading, setLoading] = useState<boolean>(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle URL query feedback from OAuth redirect
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

  // Load session
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

  // Load leaderboard
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const url = `/api/leaderboard?timeframe=${timeframe}&sortBy=${metric}&includeDemo=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      console.error('Leaderboard error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, metric]);

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
      setToast({ type: 'error', message: 'Sync connection error' });
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
        <div className="fixed top-5 right-5 z-50 animate-in fade-in duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg ${
              toast.type === 'success'
                ? 'bg-neutral-900 text-white border-neutral-800'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#cfb991]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-neutral-400 hover:text-white">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Classic Minimalist Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-serif font-black tracking-tight text-neutral-900 text-base sm:text-lg uppercase">
                Purdue Triathlon Club
              </span>
              <span className="text-[10px] tracking-widest uppercase font-mono text-neutral-500 block -mt-0.5">
                Swim Tracker
              </span>
            </div>
          </div>

          {/* Connect / User Action */}
          <div className="flex items-center gap-2">
            {athlete ? (
              <div className="flex items-center gap-2.5 pl-2 py-1 bg-neutral-50 border border-neutral-200 rounded-full">
                <div
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className="flex items-center gap-2 cursor-pointer pr-1"
                >
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-neutral-200">
                    {athlete.profile_url ? (
                      <Image
                        src={athlete.profile_url}
                        alt={athlete.firstname}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                        {athlete.firstname[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-900">
                    {athlete.firstname}
                  </span>
                </div>

                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Sync swims"
                  className="p-1 rounded-full text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#9d8353]' : ''}`} />
                </button>

                <button
                  onClick={handleLogout}
                  title="Disconnect"
                  className="p-1 pr-2 rounded-full text-neutral-400 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#fc5200] hover:bg-[#e04900] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer"
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

      {/* Main Leaderboard Page */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Title & Minimalist Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-neutral-900 uppercase">
              Swim Leaderboard
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Click any swimmer to view workout stats
            </p>
          </div>

          {/* Classic Minimalist Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Metric Switcher: Swims/Week (Default) or Yards/Week */}
            <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg border border-neutral-300">
              <button
                onClick={() => setMetric('swims')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  metric === 'swims'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Flame className="w-3 h-3 text-[#cfb991]" />
                <span>Swims / Wk</span>
              </button>
              <button
                onClick={() => setMetric('yards')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  metric === 'yards'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Waves className="w-3 h-3 text-[#cfb991]" />
                <span>Yards / Wk</span>
              </button>
            </div>

            {/* Timeframe Switcher: This Week vs Since Last Week */}
            <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg border border-neutral-300">
              <button
                onClick={() => setTimeframe('this_week')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeframe === 'this_week'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                This Wk
              </button>
              <button
                onClick={() => setTimeframe('since_last_week')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeframe === 'since_last_week'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Since Last Wk
              </button>
            </div>
          </div>
        </div>

        {/* 1. The Top 3 Podium (With Purdue Tri Club Logo on Center Podium Block) */}
        {leaderboardData.length >= 3 && (
          <ClassicPodium
            entries={leaderboardData}
            currentMetric={metric}
            onSelectAthlete={setSelectedAthleteId}
          />
        )}

        {/* 2. The Rest in a List */}
        <ClassicLeaderboardList
          entries={leaderboardData}
          currentMetric={metric}
          onSelectAthlete={setSelectedAthleteId}
        />
      </main>

      {/* Minimal Classic Footer */}
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 font-mono">
        <p>Purdue Triathlon Club • Swim Tracker</p>
      </footer>

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
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <SwimTracker />
    </Suspense>
  );
}
