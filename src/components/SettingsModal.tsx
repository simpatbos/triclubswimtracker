'use strict';
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, LogOut, Trash2, AlertTriangle, ShieldCheck, RefreshCw, Check, Plus, User } from 'lucide-react';
import { Athlete } from '@/types';

interface SettingsModalProps {
  athlete: Athlete | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onAccountDeleted: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  onOpenLogSwim?: () => void;
}

export function SettingsModal({
  athlete,
  isOpen,
  onClose,
  onLogout,
  onAccountDeleted,
  onRefresh,
  onOpenLogSwim,
}: SettingsModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !athlete) return null;

  const handleRefreshClick = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      setRefreshSuccess(false);

      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to refresh data from Strava');
      }

      if (onRefresh) {
        await onRefresh();
      }

      setRefreshSuccess(true);
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while refreshing your data';
      setErrorMessage(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
      onClose();
    } catch {
      setErrorMessage('Failed to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      const res = await fetch('/api/athletes/me', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }
      await onAccountDeleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while deleting your account';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-white border-2 border-[#cfb991] shadow-xs flex-shrink-0">
              {athlete.profile_url ? (
                <Image
                  src={athlete.profile_url}
                  alt={`${athlete.firstname} ${athlete.lastname}`}
                  fill
                  sizes="44px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-800">
                  {athlete.firstname?.[0] || 'P'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight truncate">
                {athlete.firstname} {athlete.lastname}
              </h3>
              <p className="text-xs text-neutral-500 font-mono mt-0.5 truncate">
                @{athlete.username || `athlete_${athlete.id}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Tracking Status */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 ring-4 ring-emerald-100" />
            <div className="text-xs text-neutral-600 leading-relaxed">
              <span className="font-bold text-neutral-900 block mb-0.5 flex items-center gap-1.5">
                {athlete.is_manual ? (
                  <>
                    <User className="w-3.5 h-3.5 text-[#9d8353]" /> Manual Tracking Active
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Strava Sync Active
                  </>
                )}
              </span>
              {athlete.is_manual
                ? 'You manually input your swim yardage and workouts. Your stats and standings remain active on the leaderboard.'
                : 'The server continuously tracks your swim uploads and keeps your standing on the leaderboard, even when you are logged out.'}
            </div>
          </div>

          {/* Action Section: Log Swim for Manual or Refresh for Strava */}
          {athlete.is_manual ? (
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/40">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#9d8353]" />
                  Log Swim Workout
                </h4>
              </div>
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                Add a new swim workout or update your daily yardage. Activities logged on the same calendar day are consolidated into 1 activity.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLogSwim) onOpenLogSwim();
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 active:scale-[0.99] transition-all cursor-pointer shadow-2xs text-center"
              >
                <Plus className="w-3.5 h-3.5 text-[#cfb991]" />
                <span>+ Log New Swim</span>
              </button>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/40">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#9d8353]" />
                  Sync & Refresh Swims
                </h4>
              </div>
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                If you modified, renamed, or deleted an activity on Strava, refresh your account to update your swims and leaderboard standing immediately.
              </p>
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 shadow-2xs text-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#9d8353] flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing
                    ? 'Refreshing your data...'
                    : 'Refresh'}
                </span>
              </button>
              {refreshSuccess && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-2.5 text-center flex items-center justify-center gap-1 animate-in fade-in duration-150">
                  <Check className="w-3.5 h-3.5" />
                  <span>Data refreshed successfully! Leaderboard updated.</span>
                </p>
              )}
            </div>
          )}

          {/* Session Section */}
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Browser Session
              </h4>
            </div>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              Log out of this browser. Your profile and swims remain on the leaderboard and the server will continue tracking.
            </p>
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out (Keep Tracking)'}</span>
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="border border-rose-200 bg-rose-50/30 rounded-xl p-4">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Stop Tracking & Delete Data
            </h4>
            <p className="text-xs text-rose-700/80 mb-3 leading-relaxed">
              Permanently delete your account from this tracker, remove all stored swims, revoke Strava access, and remove you from the leaderboard.
            </p>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 hover:border-rose-400 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account & Stop Tracking</span>
              </button>
            ) : (
              <div className="space-y-2 pt-1 border-t border-rose-200/80">
                <p className="text-xs font-semibold text-rose-800">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
