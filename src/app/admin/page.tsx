'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MOCK_ATTENDANCES, MOCK_USERS, DEFAULT_SITE } from '@/lib/mock-data';
import { AttendanceRecord, UserProfile } from '@/types/attendance';
import { formatTimeID, formatDateID } from '@/lib/utils';
import {
  Users,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Filter,
  Eye,
  Settings,
  MapPin,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[1]); // Admin Hendra
  const [attendances] = useState<AttendanceRecord[]>(MOCK_ATTENDANCES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filter daftar hadir berdasarkan pencarian nama staf
  const filteredRecords = attendances.filter((item) => {
    const name = item.user?.full_name?.toLowerCase() || '';
    const pos = item.user?.job_position?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || pos.includes(q);
  });

  // Ekspor Rekap ke format CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'ID Absen',
      'Nama Staff',
      'Jabatan',
      'Tanggal',
      'Jam Masuk (WIB)',
      'Jarak Masuk (meter)',
      'Jam Pulang (WIB)',
      'Status',
      'Catatan',
    ];

    const rows = attendances.map((item) => [
      item.id,
      item.user?.full_name || '-',
      item.user?.job_position || '-',
      formatDateID(item.check_in_time),
      formatTimeID(item.check_in_time),
      Math.round(item.check_in_distance_meters),
      item.check_out_time ? formatTimeID(item.check_out_time) : '-',
      item.status,
      item.notes || '-',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Absensi_GuangMing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={currentUser} onSwitchRole={(r) => setCurrentUser(MOCK_USERS.find(u => u.role === r) || MOCK_USERS[1])} />

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Top Header Admin */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Admin Portal Absensi Proyek
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring Kehadiran & Geofence Site Sekolah Guang Ming Pusat
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/site"
              className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Setting Site & Radius</span>
            </Link>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" /> Total Staff
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {MOCK_USERS.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Terdaftar di proyek</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Hadir Hari Ini
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {attendances.length}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">100% dalam geofence</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Rata-rata Masuk
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              07:45
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">WIB (Tepat Waktu)</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Batas Radius
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {DEFAULT_SITE.radius_meters}m
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Toleransi GPS site</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama staff atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            title="Filter Tanggal"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Tabel Rekap Absensi Realtime */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Log Kehadiran Hari Ini ({filteredRecords.length})
            </h3>
            <span className="text-xs text-slate-400">Update otomatis</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Foto Bukti</th>
                  <th className="py-3 px-4">Nama Staff</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jarak dari Site</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setSelectedPhoto(item.check_in_photo_url)}
                        className="w-10 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative group shrink-0"
                        title="Klik untuk zoom foto bukti"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.check_in_photo_url}
                          alt={item.user?.full_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.user?.full_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                      {item.user?.job_position}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatTimeID(item.check_in_time)} WIB
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        <MapPin className="w-3 h-3" />
                        <span>{Math.round(item.check_in_distance_meters)}m</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Hadir
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-[180px] truncate">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Zoom Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-md w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Foto Bukti Selfie"
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="p-4 bg-slate-900 text-white text-xs">
              <p className="font-semibold text-emerald-400">Foto Asli Realtime dari Kamera Ponsel</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Watermark membuktikan waktu, staf, dan koordinat satelit GPS valid saat absensi.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole={currentUser.role} />
    </div>
  );
}
