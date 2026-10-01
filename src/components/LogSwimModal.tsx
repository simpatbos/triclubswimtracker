'use strict';
'use client';

import React, { useState, useMemo } from 'react';
import { X, Waves, Timer, Calendar, Activity, Check } from 'lucide-react';
import { calculatePacePer100Yd, metersToYards, CHALLENGE_START_DATE_STR } from '@/lib/date-utils';

interface LogSwimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwimSaved: () => void;
}

export function LogSwimModal({ isOpen, onClose, onSwimSaved }: LogSwimModalProps) {
  // Format today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [date, setDate] = useState(todayStr);
  const [name, setName] = useState('Purdue Tri Swim Workout');
  const [distance, setDistance] = useState<string>('2000');
  const [unit, setUnit] = useState<'yards' | 'meters'>('yards');
  const [minutes, setMinutes] = useState<string>('35');
  const [seconds, setSeconds] = useState<string>('0');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Pace Calculation
  const calculatedPace = useMemo(() => {
    const rawDist = parseFloat(distance);
    if (!rawDist || isNaN(rawDist) || rawDist <= 0) return '--/100yd';

    const distYards = unit === 'meters' ? metersToYards(rawDist) : Math.round(rawDist);
    const totalSecs = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);

    if (totalSecs <= 0 || distYards <= 0) return '--/100yd';
    return calculatePacePer100Yd(totalSecs, distYards);
  }, [distance, unit, minutes, seconds]);

  if (!isOpen) return null;

  const quickDistances = [
    { label: '500 yd', val: '500', u: 'yards' as const },
    { label: '1,000 yd', val: '1000', u: 'yards' as const },
    { label: '1,500 yd', val: '1500', u: 'yards' as const },
    { label: '2,000 yd', val: '2000', u: 'yards' as const },
    { label: '2,500 yd', val: '2500', u: 'yards' as const },
    { label: '3,000 yd', val: '3000', u: 'yards' as const },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const rawDist = parseFloat(distance);
      if (!rawDist || isNaN(rawDist) || rawDist <= 0) {
        throw new Error('Please enter a valid distance.');
      }

      const totalSecs = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
      if (totalSecs <= 0) {
        throw new Error('Please enter a duration greater than 0.');
      }

      if (!date || date < CHALLENGE_START_DATE_STR) {
        throw new Error(`Workout date must be on or after the challenge kickoff (${CHALLENGE_START_DATE_STR}).`);
      }

      const res = await fetch('/api/swims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          name: name.trim() || 'Purdue Tri Swim Workout',
          distance: rawDist,
          unit,
          durationMinutes: parseInt(minutes, 10) || 0,
          durationSeconds: parseInt(seconds, 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save swim.');
      }

      onSwimSaved();
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
        className="bg-white border border-neutral-300 rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-[#cfb991] flex items-center justify-center font-bold flex-shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
                Log Swim Workout
              </h3>
              <p className="text-xs text-neutral-500">
                Record your yardage for the club leaderboard
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {/* Date & Workout Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                min={CHALLENGE_START_DATE_STR}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Workout Title
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning Swim"
                className="w-full px-3 py-2 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Distance & Unit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-neutral-500" />
                <span>Distance</span>
              </label>
              {/* Unit Toggle */}
              <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg border border-neutral-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setUnit('yards')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    unit === 'yards'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Yards (SCY)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('meters')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    unit === 'meters'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Meters (SCM)
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                required
                min="25"
                step="25"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                placeholder="2000"
                className="w-full px-3.5 py-2 text-lg font-mono font-bold border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-400 uppercase">
                {unit}
              </span>
            </div>

            {/* Quick Distance Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickDistances.map(qd => (
                <button
                  key={qd.val}
                  type="button"
                  onClick={() => {
                    setDistance(qd.val);
                    setUnit(qd.u);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
                    distance === qd.val && unit === qd.u
                      ? 'bg-neutral-900 text-[#cfb991] border-neutral-900 shadow-2xs'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400 active:bg-neutral-200'
                  }`}
                >
                  {qd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Live Calculated Pace */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-neutral-500" />
                <span>Moving Time</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={minutes}
                    onChange={e => setMinutes(e.target.value)}
                    placeholder="35"
                    className="w-full px-3 py-2 text-base sm:text-sm font-mono font-bold border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 pr-9"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 font-bold uppercase pointer-events-none">
                    min
                  </span>
                </div>
                <span className="text-neutral-400 font-bold">:</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={e => setSeconds(e.target.value)}
                    placeholder="00"
                    className="w-full px-3 py-2 text-base sm:text-sm font-mono font-bold border border-neutral-300 rounded-xl focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 pr-9"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 font-bold uppercase pointer-events-none">
                    sec
                  </span>
                </div>
              </div>
            </div>

            {/* Pace calculation preview card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                  Calculated Pace
                </div>
                <div className="text-sm font-black font-mono text-neutral-900 mt-0.5">
                  {calculatedPace}
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-400 text-right">
                {unit === 'meters' && (
                  <div>≈ {metersToYards(parseFloat(distance) || 0).toLocaleString()} yds</div>
                )}
                <div>1 day = 1 swim</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-neutral-200">
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
              className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#cfb991]" />
                  <span>Saving swim...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#cfb991]" />
                  <span>Save Swim Workout</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
