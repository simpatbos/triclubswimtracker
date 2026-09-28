'use strict';
'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Key, CheckCircle2 } from 'lucide-react';

interface StravaConnectModalProps {
  isOpen: boolean;
  stravaConfigured: boolean;
  onClose: () => void;
  onSelectDemoAthlete: (athleteId: number) => void;
  onConfigSaved: () => void;
}

export function StravaConnectModal({
  isOpen,
  stravaConfigured,
  onClose,
  onSelectDemoAthlete,
  onConfigSaved,
}: StravaConnectModalProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!isOpen) return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setSaveError('Please enter both Client ID and Client Secret.');
      return;
    }
    setIsSaving(true);
    setSaveError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onConfigSaved();
      } else {
        setSaveError(data.error || 'Failed to save credentials.');
      }
    } catch {
      setSaveError('Network error while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLiveConnect = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fc5200] flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Strava Setup
              </h3>
              <p className="text-xs text-neutral-500 font-mono">Purdue Triathlon Club</p>
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
        <div className="p-6 space-y-4">
          {stravaConfigured ? (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">App is Connected to Strava API</h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">
                  Click below to authorize and link your Strava athlete profile to the club leaderboard.
                </p>
              </div>
              <button
                onClick={handleLiveConnect}
                className="w-full flex items-center justify-center gap-2 bg-[#fc5200] hover:bg-[#e04900] text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
                </svg>
                <span>Authorize on Strava</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-neutral-600 leading-relaxed">
                Enter your club&apos;s Strava API App credentials below. You only do this <strong>once in the browser</strong>—no editing any files needed!
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-3">
                {saveError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                    {saveError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Strava Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Strava Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 9a8b7c6d5e4f3a2b1..."
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="text-[11px] text-neutral-500">
                  Get yours free at{' '}
                  <a
                    href="https://www.strava.com/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9d8353] hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    strava.com/settings/api <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  (Set callback domain to <code className="bg-neutral-100 px-1 rounded">localhost:3000</code>).
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save & Enable Strava Connect'}
                </button>
              </form>

              <div className="pt-3 border-t border-neutral-200">
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Or test right now with 1-click:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectDemoAthlete(9001);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold py-2 px-3 rounded-lg border border-neutral-300 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#9d8353]" />
                    <span>Sarah Jenkins</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectDemoAthlete(9002);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold py-2 px-3 rounded-lg border border-neutral-300 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Pete Boilermaker</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
