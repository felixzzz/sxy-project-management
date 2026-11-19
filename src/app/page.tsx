'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { GeofenceStatusCard } from '@/components/attendance/GeofenceStatusCard';
import { AttendanceActionCard } from '@/components/attendance/AttendanceActionCard';
import { DynamicSiteMap } from '@/components/map/DynamicSiteMap';
import { DEFAULT_SITE } from '@/lib/mock-data';
import { GeolocationState, ProjectSite, AttendanceRecord } from '@/types/attendance';
import { isWithinGeofence, isGpsAccuracyAcceptable } from '@/lib/geo/haversine';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Info, Loader2, AlertCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [site, setSite] = useState<ProjectSite>(DEFAULT_SITE);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  // Ambil site aktif terkini dari Supabase jika ada
  useEffect(() => {
    async function loadSite() {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('project_sites')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSite(data);
      }
    }
    loadSite();
  }, []);

  // Status GPS Pengguna
  const [geoState, setGeoState] = useState<GeolocationState>({
    status: 'requesting',
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceToSite: null,
    isWithinRadius: false,
  });

  // Wajib Login: Redirect ke /login jika belum login
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Ambil data absensi user hari ini dari Supabase
  useEffect(() => {
    async function fetchTodayAttendance() {
      if (!user) return;
      const supabase = createClient();
      if (!supabase) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_time', todayStart.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setTodayRecord(data);
      }
    }

    fetchTodayAttendance();
  }, [user]);

  // Fungsi mengkalkulasi status geofence
  const updateGeoPosition = useCallback(
    (lat: number, lng: number, acc: number) => {
      const { isWithin, distanceMeters } = isWithinGeofence(
        lat,
        lng,
        site.latitude,
        site.longitude,
        site.radius_meters
      );

      const isAccOk = isGpsAccuracyAcceptable(acc);

      setGeoState({
        status: !isAccOk ? 'low_accuracy' : isWithin ? 'in_range' : 'out_of_range',
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        distanceToSite: distanceMeters,
        isWithinRadius: isWithin,
      });
    },
    [site.latitude, site.longitude, site.radius_meters]
  );

  // Start HTML5 Geolocation Watcher Asli dari HP/Perangkat
  const initGeolocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState((prev) => ({
        ...prev,
        status: 'unavailable',
        errorMessage: 'GPS tidak didukung oleh browser ini.',
      }));
      return;
    }

    setGeoState((prev) => ({ ...prev, status: 'requesting' }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        updateGeoPosition(latitude, longitude, accuracy);
      },
      (error) => {
        console.warn('Geolocation Error:', error);
        let statusText: GeolocationState['status'] = 'unavailable';
        let message = 'Gagal membaca koordinat GPS.';

        if (error.code === error.PERMISSION_DENIED) {
          statusText = 'permission_denied';
          message = 'Izin lokasi ditolak di browser HP Anda. Harap aktifkan izin lokasi.';
        } else if (error.code === error.TIMEOUT) {
          statusText = 'timeout';
          message = 'Waktu pencarian satelit GPS habis.';
        }

        setGeoState((prev) => ({
          ...prev,
          status: statusText,
          errorMessage: message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateGeoPosition]);

  useEffect(() => {
    const cleanup = initGeolocation();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initGeolocation]);

  const handleAttendanceSuccess = (newRecord: AttendanceRecord) => {
    setTodayRecord(newRecord);
  };

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
      {/* Top Header */}
      <AppHeader user={user} />

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-3.5 space-y-4">
        {/* Banner Identitas & Pengumuman Yayasan Guang Ji */}
        <div className="px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/25 dark:border-amber-500/20 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-700 dark:text-amber-400">
              Yayasan Guang Ji Indonesia
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {site.work_start_time || '08:00'} - {site.work_end_time || '17:00'} WIB
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistem Aktif" />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Presensi Proyek Sekolah Guang Ming Pusat
          </p>
          {site.announcement && (
            <div className="pt-1 border-t border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-start gap-1.5 leading-relaxed">
              <span className="shrink-0 mt-0.5">📢</span>
              <span>{site.announcement}</span>
            </div>
          )}
        </div>

        {/* 1. Radar & Status Geofencing Asli */}
        <GeofenceStatusCard
          geoState={geoState}
          siteName={site.name}
          allowedRadius={site.radius_meters}
          onRefreshGPS={initGeolocation}
        />

        {/* 2. Mini Map Visualizer (Leaflet + OpenStreetMap) */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-amber-500/15 dark:border-amber-500/10 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Peta Lokasi & Radius Izin Absen
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-medium">
              Radius: {site.radius_meters}m
            </span>
          </div>
          <DynamicSiteMap
            siteLat={site.latitude}
            siteLng={site.longitude}
            siteName={site.name}
            radiusMeters={site.radius_meters}
            userLat={geoState.latitude}
            userLng={geoState.longitude}
            userAccuracy={geoState.accuracy}
            isWithinRadius={geoState.isWithinRadius}
          />
        </div>

        {/* Banner Akun Nonaktif */}
        {user.is_active === false && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-rose-900 dark:text-rose-100">Status Akun: Nonaktif</p>
              <p>
                Akun Anda telah dinonaktifkan oleh Administrator. Anda tidak dapat melakukan absensi.
                Silakan hubungi koordinator proyek untuk informasi lebih lanjut.
              </p>
            </div>
          </div>
        )}

        {/* 3. Action Card: Jam Digital, Kamera Selfie Realtime, & Tombol Absen */}
        {user.is_active !== false ? (
          <AttendanceActionCard
            user={user}
            site={site}
            geoState={geoState}
            hasCheckedInToday={Boolean(todayRecord?.check_in_time)}
            hasCheckedOutToday={Boolean(todayRecord?.check_out_time)}
            checkInTimeToday={todayRecord?.check_in_time}
            checkOutTimeToday={todayRecord?.check_out_time}
            onAttendanceSuccess={handleAttendanceSuccess}
          />
        ) : (
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-500">Akses Absensi Dibatasi</p>
            <p className="text-[11px] text-slate-400">
              Tombol absensi dikunci karena status keanggotaan Anda nonaktif.
            </p>
          </div>
        )}

        {/* Petunjuk Penggunaan Lapangan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" /> Ketentuan Absensi Proyek:
          </div>
          <p>• Absensi wajib dilakukan di dalam radius proyek Sekolah Guang Ming Pusat.</p>
          <p>• Foto selfie wajib diambil langsung melalui kamera (bukan upload foto galeri).</p>
          <p>• Pastikan GPS HP dalam mode *Akurasi Tinggi* (High Accuracy).</p>
        </div>
      </main>

      {/* Bottom Safe Navigation */}
      <BottomNav userRole={user.role} />
    </div>
  );
}
