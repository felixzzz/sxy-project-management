'use client';

import React from 'react';
import { MapPin, Navigation, AlertCircle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GeolocationState } from '@/types/attendance';
import { formatDistance } from '@/lib/geo/haversine';

interface GeofenceStatusCardProps {
  geoState: GeolocationState;
  siteName: string;
  allowedRadius: number;
  onRefreshGPS: () => void;
}

export function GeofenceStatusCard({
  geoState,
  siteName,
  allowedRadius,
  onRefreshGPS,
}: GeofenceStatusCardProps) {
  const { status, distanceToSite, accuracy, isWithinRadius, errorMessage } = geoState;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-slate-900 dark:text-white leading-tight">
              {siteName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Radius Izin: {allowedRadius} meter
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshGPS}
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Perbarui Sinyal GPS"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'requesting' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Status Banner */}
      <div
        className={`rounded-xl p-3.5 flex items-start gap-3 border transition-colors ${
          status === 'in_range'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
            : status === 'out_of_range'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
            : status === 'permission_denied'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {status === 'in_range' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          {status === 'out_of_range' && <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          {status === 'permission_denied' && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          {['requesting', 'idle', 'low_accuracy', 'unavailable', 'timeout'].includes(status) && (
            <Navigation className="w-5 h-5 text-slate-500 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-xs uppercase tracking-wide">
              {status === 'in_range' && 'Dalam Area Proyek'}
              {status === 'out_of_range' && 'Di Luar Area Proyek'}
              {status === 'permission_denied' && 'Izin Lokasi Ditolak'}
              {status === 'requesting' && 'Mengunci Lokasi GPS...'}
              {status === 'low_accuracy' && 'Sinyal GPS Kurang Akurat'}
              {status === 'unavailable' && 'GPS Tidak Aktif'}
              {status === 'timeout' && 'Waktu GPS Habis'}
            </span>
            {distanceToSite !== null && (
              <span className="font-mono font-bold text-xs tabular-nums">
                {formatDistance(distanceToSite)}
              </span>
            )}
          </div>

          <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-300 leading-normal">
            {status === 'in_range' && (
              <span>Posisi Anda valid untuk melakukan absensi kehadiran.</span>
            )}
            {status === 'out_of_range' && distanceToSite !== null && (
              <span>
                Jarak Anda <strong>{formatDistance(distanceToSite)}</strong> dari batas site. Silakan mendekat ke area proyek (maksimal {allowedRadius}m).
              </span>
            )}
            {status === 'permission_denied' && (
              <span>Harap izinkan akses lokasi (GPS) pada pengaturan browser HP Anda.</span>
            )}
            {status === 'requesting' && (
              <span>Menunggu konfirmasi sinyal satelit GPS ponsel...</span>
            )}
            {errorMessage && status !== 'in_range' && status !== 'out_of_range' && (
              <span className="block text-red-500 font-mono mt-0.5">{errorMessage}</span>
            )}
          </p>
        </div>
      </div>

      {/* GPS Technical Metadata (Akurasi & Deviasi) */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              accuracy && accuracy <= 20
                ? 'bg-emerald-500'
                : accuracy && accuracy <= 60
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <span>
            Akurasi GPS:{' '}
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {accuracy !== null ? `±${Math.round(accuracy)}m` : 'Mendeteksi...'}
            </strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">GPS Satelit Aktif</span>
      </div>
    </div>
  );
}
