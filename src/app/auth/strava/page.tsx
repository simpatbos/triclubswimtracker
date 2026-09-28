'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';

export default function StravaAuthorizationPage() {
  const router = useRouter();
  const [athleteName, setAthleteName] = useState('Sarah Jenkins');
  const [authorizing, setAuthorizing] = useState(false);

  const handleAuthorize = async () => {
    setAuthorizing(true);
    try {
      // Log in as selected athlete or create athlete session
      const athleteId = athleteName === 'Pete Boilermaker' ? 9002 : 9001;
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId }),
      });

      if (res.ok) {
        window.location.href = '/?auth_success=1';
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-neutral-900 flex flex-col justify-between antialiased">
      {/* Strava Official Header */}
      <header className="bg-white border-b border-neutral-200 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Strava Brand Logo */}
          <div className="flex items-center gap-1.5">
            <svg className="w-6 h-6 fill-[#fc5200]" viewBox="0 0 24 24">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
            </svg>
            <span className="font-black tracking-tighter text-[#fc5200] text-xl">
              STRAVA
            </span>
          </div>
        </div>
        <span className="text-xs text-neutral-500 font-mono">OAuth 2.0 Authorization</span>
      </header>

      {/* Main Authorization Card */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Apps connection banner */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 p-1 flex items-center justify-center shadow-xs">
              <Image
                src="/purdue_tri_logo.png"
                alt="Purdue Triathlon Club"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>

            <div className="flex items-center text-neutral-400">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#fc5200] flex items-center justify-center shadow-xs">
              <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center text-neutral-900 tracking-tight">
            Authorize Purdue Triathlon Club to connect to Strava
          </h2>
          <p className="text-xs text-center text-neutral-500 mt-1.5">
            Purdue Triathlon Club will receive permission to read your swim activities for the club leaderboard.
          </p>

          {/* Account switcher if testing different athletes */}
          <div className="mt-5 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
              Connecting Athlete:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAthleteName('Sarah Jenkins')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                  athleteName === 'Sarah Jenkins'
                    ? 'bg-white border-neutral-900 text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
              >
                Sarah Jenkins
              </button>
              <button
                type="button"
                onClick={() => setAthleteName('Pete Boilermaker')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                  athleteName === 'Pete Boilermaker'
                    ? 'bg-white border-neutral-900 text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
              >
                Pete Boilermaker
              </button>
            </div>
          </div>

          {/* Permissions requested */}
          <div className="mt-5 space-y-2.5">
            <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              This will allow Purdue Triathlon Club to:
            </div>
            <div className="flex items-start gap-2.5 text-xs text-neutral-600">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <span>View data about your swim workouts and activities</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-neutral-600">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <span>View your athlete profile on the Purdue Tri Club leaderboard</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-2.5">
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="w-full flex items-center justify-center gap-2 bg-[#fc5200] hover:bg-[#e04900] active:scale-[0.99] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{authorizing ? 'Connecting...' : 'Authorize'}</span>
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-white hover:bg-neutral-100 text-neutral-700 font-semibold text-xs py-2.5 px-4 rounded-xl border border-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Strava OAuth 2.0 Connection</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400">
        Strava, Inc. • Purdue Triathlon Club
      </footer>
    </div>
  );
}
