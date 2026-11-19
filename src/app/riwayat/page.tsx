'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { AttendanceRecord } from '@/types/attendance';
import { formatTimeID, formatDateID } from '@/lib/utils';
import { Calendar, MapPin, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function RiwayatPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function loadAttendances() {
      if (!user) return;
      setIsLoading(true);
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .order('check_in_time', { ascending: false });

      if (!error && data) {
        setAttendances(data);
      }
      setIsLoading(false);
    }

    loadAttendances();
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={user} />

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Yayasan Guang Ji Indonesia
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Riwayat Kehadiran</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Catatan absensi {user.full_name}</p>
          </div>
          <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Bulan Ini</span>
          </div>
        </div>

        {/* List Riwayat Kartu */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-xs">Memuat riwayat absensi...</span>
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-amber-500/15 dark:border-amber-500/10 text-center">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada riwayat absensi</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Catatan kehadiran Anda akan otomatis muncul di sini setelah melakukan absensi masuk.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendances.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-500/15 dark:border-amber-500/10 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                        {formatDateID(item.check_in_time)}
                      </h4>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                        Hadir
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Foto Selfie yang bisa diklik */}
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(item.check_in_photo_url)}
                    className="relative group rounded-lg overflow-hidden border border-amber-500/30 dark:border-amber-500/20 w-12 h-14 shrink-0 cursor-pointer"
                    title="Lihat Foto Bukti"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.check_in_photo_url}
                      alt="Foto Absen"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent flex items-end p-0.5">
                      <span className="text-[8px] text-white bg-black/60 px-1 rounded">Foto</span>
                    </div>
                  </button>
                </div>

                {/* Detail Waktu & Jarak */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="p-2 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mb-0.5 font-medium">
                      Jam Masuk
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatTimeID(item.check_in_time)} WIB
                    </span>
                  </div>
                  <div className="p-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 rounded-xl">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block mb-0.5 font-medium">
                      Jam Pulang
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.check_out_time ? `${formatTimeID(item.check_out_time)} WIB` : 'Belum Pulang'}
                    </span>
                  </div>
                </div>

                {/* Metadata GPS */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Jarak saat absen:</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {Math.round(item.check_in_distance_meters)}m
                    </strong>
                  </div>
                  {item.notes && (
                    <span className="truncate max-w-[140px] text-[10px] text-slate-400 italic">
                      &quot;{item.notes}&quot;
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Zoom Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-sm w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Foto Absensi Lengkap"
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4 bg-slate-900 text-white text-xs">
              <p className="font-semibold text-amber-400">Bukti Foto Absensi Lapangan • Yayasan Guang Ji</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Foto terverifikasi dengan koordinat GPS dan cap waktu satelit.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole={user.role} />
    </div>
  );
}
