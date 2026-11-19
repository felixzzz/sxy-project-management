'use client';

import React, { useState } from 'react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MOCK_USERS, MOCK_ATTENDANCES } from '@/lib/mock-data';
import { AttendanceRecord, UserProfile } from '@/types/attendance';
import { formatDateTimeID, formatTimeID, formatDateID } from '@/lib/utils';
import { Calendar, MapPin, CheckCircle2, ChevronRight, X, Clock } from 'lucide-react';

export default function RiwayatPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]);
  const [attendances] = useState<AttendanceRecord[]>(MOCK_ATTENDANCES);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={currentUser} onSwitchRole={(r) => setCurrentUser(MOCK_USERS.find(u => u.role === r) || MOCK_USERS[0])} />

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Riwayat Kehadiran</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Catatan absensi staff proyek</p>
          </div>
          <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Bulan Ini</span>
          </div>
        </div>

        {/* List Riwayat Kartu */}
        <div className="space-y-3">
          {attendances.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
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
                      Hadir Tepat Waktu
                    </span>
                  </div>
                </div>

                {/* Thumbnail Foto Selfie yang bisa diklik */}
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(item.check_in_photo_url)}
                  className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-12 h-14 shrink-0"
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
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                    Jam Masuk
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatTimeID(item.check_in_time)} WIB
                  </span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                    Jam Pulang
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.check_out_time ? `${formatTimeID(item.check_out_time)} WIB` : 'Belum Pulang'}
                  </span>
                </div>
              </div>

              {/* Metadata GPS */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
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
      </main>

      {/* Modal Pratinjau Foto Selfie Full Size */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-sm w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Foto Absensi Lengkap"
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4 bg-slate-900 text-white text-xs">
              <p className="font-semibold text-emerald-400">Bukti Foto Absensi Asli Lapangan</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Foto diambil langsung dari kamera ponsel dengan koordinat GPS dan cap waktu.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole={currentUser.role} />
    </div>
  );
}
