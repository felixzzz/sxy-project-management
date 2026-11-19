'use client';

import React, { useMemo } from 'react';
import { Clock, Sparkles } from 'lucide-react';

export interface TimeDropdown15Props {
  label: string;
  value: string; // "HH:mm" e.g. "08:00"
  onChange: (val: string) => void;
  referenceStartTime?: string; // For End Time: enables duration badges
  isEndTime?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  quickPresets?: string[];
  className?: string;
}

// Strictly bounded project working hours: 08:00 (Jam 8) s/d 22:00 (Pukul 22)
export const MIN_SITE_MINUTES = 8 * 60;   // 480 (08:00)
export const MAX_SITE_MINUTES = 22 * 60;  // 1320 (22:00)
export const MIN_SITE_TIME = '08:00';
export const MAX_SITE_TIME = '22:00';

// Convert "HH:mm" to minutes from midnight
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return MIN_SITE_MINUTES;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Convert minutes to "HH:mm" clamped within 08:00 - 22:00
export const minutesToTime = (totalMinutes: number): string => {
  const clamped = Math.max(MIN_SITE_MINUTES, Math.min(MAX_SITE_MINUTES, totalMinutes));
  const h = Math.floor(clamped / 60).toString().padStart(2, '0');
  const m = (clamped % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Calculate duration string (e.g. "7 jam 30 mnt")
export const formatDurationShort = (startTime: string, endTime: string): string => {
  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);
  if (endM <= startM) return '';
  const diff = endM - startM;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
  if (hours > 0) return `${hours} jam`;
  return `${mins} mnt`;
};

// Construction milestones labels (without "BBS", within 08:00 - 22:00)
const TIME_LABELS: Record<string, string> = {
  '08:00': 'Mulai Kerja',
  '10:00': 'Break Pagi',
  '12:00': 'Istirahat Siang',
  '13:00': 'Masuk Kerja Siang',
  '15:00': 'Break Sore',
  '15:30': 'Pergantian Cuaca Sore',
  '17:00': 'Selesai Kerja',
  '18:00': 'Mulai Lembur',
  '20:00': 'Break Lembur',
  '21:00': 'Selesai Lembur',
  '22:00': 'Batas Maksimal Lembur (22:00)',
};

// Generate time options strictly from 08:00 up to 22:00 in 30-minute increments
export const SITE_30MIN_TIMES: string[] = [];
for (let h = 8; h <= 21; h++) {
  const hh = h.toString().padStart(2, '0');
  SITE_30MIN_TIMES.push(`${hh}:00`);
  SITE_30MIN_TIMES.push(`${hh}:30`);
}
SITE_30MIN_TIMES.push('22:00');

// Keep alias for backwards compatibility
export const SITE_15MIN_TIMES = SITE_30MIN_TIMES;

export const TimeDropdown15: React.FC<TimeDropdown15Props> = ({
  label,
  value,
  onChange,
  referenceStartTime,
  isEndTime = false,
  hasError = false,
  errorMessage,
  quickPresets,
  className = '',
}) => {
  // Ensure valid "HH:mm" within 08:00 - 22:00 and 30-min alignment
  const rawMinutes = timeToMinutes(value || (isEndTime ? '17:00' : '08:00'));
  const safeMinutes = Math.max(MIN_SITE_MINUTES, Math.min(MAX_SITE_MINUTES, rawMinutes));
  const safeValue = minutesToTime(safeMinutes);
  const [hourStr, minuteStr] = safeValue.split(':');

  // Stepper functions (-30m / +30m) restricted to [08:00, 22:00]
  const handleStep = (deltaM: number) => {
    const nextM = Math.max(MIN_SITE_MINUTES, Math.min(MAX_SITE_MINUTES, safeMinutes + deltaM));
    onChange(minutesToTime(nextM));
  };

  // Quick minute select (:00, :30)
  const handleSelectMinute = (m: string) => {
    if (hourStr === '22') {
      onChange('22:00');
      return;
    }
    const targetTime = `${hourStr}:${m}`;
    const targetM = timeToMinutes(targetTime);
    if (targetM >= MIN_SITE_MINUTES && targetM <= MAX_SITE_MINUTES) {
      onChange(targetTime);
    }
  };

  // Grouped options strictly for 08:00 - 22:00 (30-Minute Steps)
  const groupedOptions = useMemo(() => {
    // 1. Jam Kerja Normal (08:00 - 17:00)
    const normalWorkHours = SITE_30MIN_TIMES.filter((t) => {
      const m = timeToMinutes(t);
      return m >= 8 * 60 && m <= 17 * 60;
    });

    // 2. Jam Lembur (17:30 - 22:00)
    const overtimeHours = SITE_30MIN_TIMES.filter((t) => {
      const m = timeToMinutes(t);
      return m > 17 * 60 && m <= 22 * 60;
    });

    return {
      normalWorkHours,
      overtimeHours,
    };
  }, []);

  // Format label for dropdown option
  const formatOptionLabel = (t: string) => {
    const milestone = TIME_LABELS[t];
    let extra = '';

    if (isEndTime && referenceStartTime) {
      const dur = formatDurationShort(referenceStartTime, t);
      if (dur) {
        extra = ` (+${dur})`;
      }
    }

    if (milestone) {
      return `${t} WIB${extra} • ${milestone}`;
    }
    return `${t} WIB${extra}`;
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header: Label + Stepper (-30m / +30m) bounded to [08:00, 22:00] */}
      <div className="flex items-center justify-between gap-1">
        <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>{label}</span>
          <span className="text-[9px] font-normal text-slate-400">(08:00 - 22:00 • 30 mnt)</span>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStep(-30)}
            disabled={safeMinutes <= MIN_SITE_MINUTES}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Mundurkan 30 menit (Minimal 08:00)"
          >
            -30m
          </button>
          <button
            type="button"
            onClick={() => handleStep(30)}
            disabled={safeMinutes >= MAX_SITE_MINUTES}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Majukan 30 menit (Maksimal 22:00)"
          >
            +30m
          </button>
        </div>
      </div>

      {/* Main Select Dropdown strictly 08:00 - 22:00 (30-Minute Steps) */}
      <div className="relative">
        <select
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs ${
            hasError
              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 border'
              : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-amber-500/50'
          }`}
        >
          <optgroup label="☀️ Jam Kerja Normal (08:00 - 17:00)">
            {groupedOptions.normalWorkHours.map((t) => (
              <option key={t} value={t}>
                {formatOptionLabel(t)}
              </option>
            ))}
          </optgroup>

          <optgroup label="🌙 Jam Lembur (17:30 - 22:00)">
            {groupedOptions.overtimeHours.map((t) => (
              <option key={t} value={t}>
                {formatOptionLabel(t)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Minute Segmented Quick Pills: [:00] [:30] (30-Minute Increments) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold">Pilih Menit (Kelipatan 30 Menit):</span>
          {isEndTime && referenceStartTime && (
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
              {formatDurationShort(referenceStartTime, safeValue)
                ? `Durasi: ${formatDurationShort(referenceStartTime, safeValue)}`
                : ''}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {['00', '30'].map((m) => {
            const isSelected = minuteStr === m;
            const isDisabled = hourStr === '22' && m !== '00';
            return (
              <button
                key={m}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectMinute(m)}
                className={`py-1.5 text-center font-mono text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black ring-1 ring-amber-400'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
                } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={isDisabled ? 'Pukul 22 hanya sampai 22:00' : `Ubah ke menit :${m}`}
              >
                :{m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Preset Chips (within 08:00 - 22:00, 30-Minute Steps) */}
      {quickPresets && quickPresets.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            Preset:
          </span>
          {quickPresets
            .filter((p) => {
              const m = timeToMinutes(p);
              return m >= MIN_SITE_MINUTES && m <= MAX_SITE_MINUTES;
            })
            .map((preset) => {
              const isMatch = safeValue === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    isMatch
                      ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400 font-black'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
        </div>
      )}

      {/* Error Message per field */}
      {errorMessage && (
        <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default TimeDropdown15;
