'use strict';
'use client';

import React from 'react';
import { X, ExternalLink, Sparkles, Key, CheckCircle2 } from 'lucide-react';

interface StravaConnectModalProps {
  isOpen: boolean;
  stravaConfigured: boolean;
  onClose: () => void;
  onSelectDemoAthlete: (athleteId: number) => void;
}

export function StravaConnectModal({
  isOpen,
  stravaConfigured,
  onClose,
  onSelectDemoAthlete,
}: StravaConnectModalProps) {
  if (!isOpen) return null;

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
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fc5200] flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.925 15.65h4.172" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                Connect Strava
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
                <h4 className="font-bold text-neutral-900 text-sm">Strava API Ready</h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">
                  Click below to authorize Purdue Tri Club Swim Tracker with your Strava account.
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
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-700">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-neutral-900">
                  <Key className="w-4 h-4 text-[#9d8353]" />
                  <span>Strava API Credentials</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Add <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono text-[11px]">STRAVA_CLIENT_ID</code> and <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono text-[11px]">STRAVA_CLIENT_SECRET</code> to <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code>.
                </p>
                <div className="mt-2">
                  <a
                    href="https://www.strava.com/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9d8353] hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    Open Strava API Settings <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Quick Demo Swimmer:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectDemoAthlete(9001);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#cfb991]" />
                    <span>Sarah Jenkins</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectDemoAthlete(9002);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold py-2 px-3 rounded-xl border border-neutral-300 transition-colors"
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
