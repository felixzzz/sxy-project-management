'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Camera, CheckCircle2, Clock, LogIn, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { LiveCameraCapture } from './LiveCameraCapture';
import { UserProfile, ProjectSite, GeolocationState } from '@/types/attendance';
import { formatTimeID, formatDateID } from '@/lib/utils';

interface AttendanceActionCardProps {
  user: UserProfile;
  site: ProjectSite;
  geoState: GeolocationState;
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
  checkInTimeToday?: string;
  checkOutTimeToday?: string;
  onAttendanceSuccess: (record: any) => void;
}

export function AttendanceActionCard({
  user,
  site,
  geoState,
  hasCheckedInToday,
  hasCheckedOutToday,
  checkInTimeToday,
  checkOutTimeToday,
  onAttendanceSuccess,
}: AttendanceActionCardProps) {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'check_in' | 'check_out'>('check_in');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update jam digital secara realtime setiap 1 detik
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { isWithinRadius, distanceToSite, latitude, longitude, accuracy } = geoState;

  // Cek apakah tombol absensi diizinkan aktif
  const isActionDisabled =
    !isWithinRadius ||
    latitude === null ||
    longitude === null ||
    isSubmitting ||
    (hasCheckedInToday && hasCheckedOutToday);

  const handleStartAttendance = (type: 'check_in' | 'check_out') => {
    setActionType(type);
    setErrorMessage(null);
    setShowCamera(true);
  };

  const handlePhotoCaptured = (photoBase64: string) => {
    setCapturedPhoto(photoBase64);
    setShowCamera(false);
  };

  const handleSubmitAttendance = async () => {
    if (!capturedPhoto || latitude === null || longitude === null) {
      setErrorMessage('Harap ambil foto selfie terlebih dahulu dan pastikan GPS terkunci.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const isUUID = (str?: string) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const cleanSiteId = isUUID(site?.id) ? site.id : '11111111-1111-1111-1111-111111111111';
    const cleanUserId = isUUID(user?.id) ? user.id : '00000000-0000-0000-0000-000000000001';

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType,
          userId: cleanUserId,
          siteId: cleanSiteId,
          latitude,
          longitude,
          accuracy,
          distanceMeters: distanceToSite,
          photoBase64: capturedPhoto,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan absensi');
      }

      // Animasi perayaan sukses
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      setCapturedPhoto(null);
      setNotes('');
      onAttendanceSuccess(result.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Modal Kamera Fullscreen jika dibuka */}
      {showCamera && (
        <LiveCameraCapture
          staffName={user.full_name}
          siteName={site.name}
          latitude={latitude}
          longitude={longitude}
          distanceMeters={distanceToSite}
          isWithinRadius={isWithinRadius}
          onPhotoCaptured={handlePhotoCaptured}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* Header Jam Kerja */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-600 dark:text-slate-300 mb-2 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Waktu Indonesia Barat (WIB)</span>
        </div>
        <div className="font-mono text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight tabular-nums">
          {currentTime ? formatTimeID(currentTime.toISOString()) : '--:--'}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {currentTime ? formatDateID(currentTime.toISOString()) : 'Memuat Tanggal...'}
        </div>
      </div>

      {/* Status Absen Hari Ini */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <LogIn className="w-3 h-3 text-emerald-600" /> Masuk
          </div>
          <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
            {checkInTimeToday ? formatTimeID(checkInTimeToday) : '--:--'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <LogOut className="w-3 h-3 text-blue-600" /> Pulang
          </div>
          <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
            {checkOutTimeToday ? formatTimeID(checkOutTimeToday) : '--:--'}
          </div>
        </div>
      </div>

      {/* Bagian Pratinjau Foto Selfie Jika Sudah Dijepret */}
      {capturedPhoto && (
        <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPhoto}
              alt="Foto Absen"
              className="w-16 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-600 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Foto Siap Dikirim
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Watermark koordinat otomatis tertempel.
              </p>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Ganti Foto
              </button>
            </div>
          </div>

          <div className="mt-3">
            <input
              type="text"
              placeholder="Catatan kegiatan hari ini (opsional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tombol Utama Absensi */}
      {capturedPhoto ? (
        <button
          type="button"
          onClick={handleSubmitAttendance}
          disabled={isSubmitting}
          className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses Absensi...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Kirim Absensi {actionType === 'check_in' ? 'Masuk' : 'Pulang'}</span>
            </>
          )}
        </button>
      ) : !hasCheckedInToday ? (
        <button
          type="button"
          onClick={() => handleStartAttendance('check_in')}
          disabled={isActionDisabled}
          className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isActionDisabled
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 active:scale-[0.98]'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Foto Selfie & Absen Masuk</span>
        </button>
      ) : !hasCheckedOutToday ? (
        <button
          type="button"
          onClick={() => handleStartAttendance('check_out')}
          disabled={isActionDisabled}
          className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isActionDisabled
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/20 active:scale-[0.98]'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Foto Selfie & Absen Pulang</span>
        </button>
      ) : (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>Absensi hari ini sudah lengkap (Masuk & Pulang)</span>
        </div>
      )}

      {/* Petunjuk Geofencing jika tombol nonaktif */}
      {isActionDisabled && !hasCheckedInToday && (
        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">
          Tombol akan aktif otomatis saat GPS berada dalam radius lokasi proyek.
        </p>
      )}
    </div>
  );
}
