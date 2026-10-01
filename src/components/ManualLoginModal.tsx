'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { X, User, PlusCircle, ArrowRight, Activity } from 'lucide-react';
import { Athlete } from '@/types';

interface ManualLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (athlete: Athlete) => void;
}

export function ManualLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: ManualLoginModalProps) {
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [manualAthletes, setManualAthletes] = useState<Athlete[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // New athlete form
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');

  // Existing athlete selection
  const [selectedId, setSelectedId] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of existing manual athletes when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    fetch('/api/auth/manual')
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data.manualAthletes && data.manualAthletes.length > 0) {
          setManualAthletes(data.manualAthletes);
          setSelectedId(data.manualAthletes[0].id);
          // If existing swimmers are available, default to existing tab
          setTab('existing');
        } else {
          setTab('new');
        }
      })
      .catch(err => console.error('Failed to load manual athletes:', err))
      .finally(() => {
        if (active) setLoadingList(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let body: Record<string, unknown> = {};

      if (tab === 'new') {
        if (!firstname.trim() || !lastname.trim()) {
          throw new Error('Please enter both your first and last name.');
        }
        body = {
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          username: username.trim() || null,
        };
      } else {
        if (!selectedId) {
          throw new Error('Please select an athlete profile to log in.');
        }
        body = {
          athleteId: selectedId,
        };
      }

      const res = await fetch('/api/auth/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to log in.');
      }

      onLoginSuccess(data.athlete);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-[#cfb991] flex items-center justify-center font-bold flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
                Log In Manually
              </h3>
              <p className="text-xs text-neutral-500">
                Track swim stats without connecting Strava
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {manualAthletes.length > 0 && (
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 flex-shrink-0">
            <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setTab('existing');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tab === 'existing'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Existing Swimmer
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('new');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tab === 'new'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                New Swimmer
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {tab === 'existing' ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Select Your Profile
              </label>
              {loadingList ? (
                <div className="py-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4 animate-spin text-[#9d8353]" />
                  <span>Loading profiles...</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {manualAthletes.map(ath => (
                    <div
                      key={ath.id}
                      onClick={() => setSelectedId(ath.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedId === ath.id
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            selectedId === ath.id
                              ? 'bg-neutral-800 text-[#cfb991]'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {ath.firstname[0]}
                        </div>
                        <div>
                          <div className="font-bold text-xs">
                            {ath.firstname} {ath.lastname}
                          </div>
                          {ath.username && (
                            <div
                              className={`text-[10px] font-mono ${
                                selectedId === ath.id ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              @{ath.username}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedId === ath.id && (
                        <span className="text-[10px] text-[#cfb991] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={e => setFirstname(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3.5 py-2 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastname}
                  onChange={e => setLastname(e.target.value)}
                  placeholder="e.g. Miller"
                  className="w-full px-3.5 py-2 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Username / Display Handle{' '}
                  <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 text-sm font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="purdueswim26"
                    className="w-full pl-8 pr-3.5 py-2 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#cfb991]" />
                  <span>Logging in...</span>
                </>
              ) : tab === 'new' ? (
                <>
                  <PlusCircle className="w-3.5 h-3.5 text-[#cfb991]" />
                  <span>Create & Log In</span>
                </>
              ) : (
                <>
                  <span>Select Profile</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#cfb991]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
