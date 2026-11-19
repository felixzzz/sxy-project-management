'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { GeofenceStatusCard } from '@/components/attendance/GeofenceStatusCard';
import { AttendanceActionCard } from '@/components/attendance/AttendanceActionCard';
import { DynamicSiteMap } from '@/components/map/DynamicSiteMap';
import { DEFAULT_SITE, MOCK_USERS } from '@/lib/mock-data';
import { GeolocationState, ProjectSite, UserProfile, AttendanceRecord } from '@/types/attendance';
import { isWithinGeofence, isGpsAccuracyAcceptable } from '@/lib/geo/haversine';
import { AlertCircle, Info, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]); // Default Staff Budi
  const [site, setSite] = useState<ProjectSite>(DEFAULT_SITE);

  // Status GPS Pengguna
  const [geoState, setGeoState] = useState<GeolocationState>({
    status: 'requesting',
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceToSite: null,
    isWithinRadius: false,
  });

  // State Simulasi (untuk mempermudah testing di laptop/development sebelum turun ke site fisik)
  const [isDemoSimulated, setIsDemoSimulated] = useState<boolean>(false);

  // Status Absensi Hari Ini
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

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

  // Start HTML5 Geolocation Watcher
  const initGeolocation = useCallback(() => {
    if (isDemoSimulated) return; // Jika mode simulasi aktif, jangan timpa dengan GPS asli laptop

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
          message = 'Izin lokasi ditolak di browser HP Anda.';
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
  }, [isDemoSimulated, updateGeoPosition]);

  useEffect(() => {
    const cleanup = initGeolocation();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initGeolocation]);

  // Handler toggle simulasi (Dalam Site vs Luar Site) untuk kemudahan pengujian
  const handleToggleDemoSimulation = () => {
    if (!isDemoSimulated || !geoState.isWithinRadius) {
      // Set simulasi DALAM AREA (18 meter dari titik tengah site)
      setIsDemoSimulated(true);
      const simulatedLat = site.latitude + 0.0001;
      const simulatedLng = site.longitude + 0.0001;
      updateGeoPosition(simulatedLat, simulatedLng, 5.0);
    } else {
      // Set simulasi DI LUAR AREA (450 meter dari titik site)
      setIsDemoSimulated(true);
      const simulatedLat = site.latitude + 0.004;
      const simulatedLng = site.longitude + 0.004;
      updateGeoPosition(simulatedLat, simulatedLng, 12.0);
    }
  };

  const handleRoleSwitch = (newRole: 'staff' | 'admin') => {
    const targetUser = MOCK_USERS.find((u) => u.role === newRole) || MOCK_USERS[0];
    setCurrentUser(targetUser);
  };

  const handleAttendanceSuccess = (newRecord: AttendanceRecord) => {
    setTodayRecord(newRecord);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* Top Header */}
      <AppHeader user={currentUser} onSwitchRole={handleRoleSwitch} />

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Banner Info Simulasi / Demo */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Mode Uji Coba Lapangan Aktif</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Gunakan tombol simulasi di bawah untuk menguji verifikasi geofencing (Dalam vs Luar Site).
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleDemoSimulation}
            className="shrink-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium active:scale-95 transition-transform"
          >
            {geoState.isWithinRadius ? 'Simulasi: Ke Luar' : 'Simulasi: Ke Dalam'}
          </button>
        </div>

        {/* 1. Radar & Status Geofencing */}
        <GeofenceStatusCard
          geoState={geoState}
          siteName={site.name}
          allowedRadius={site.radius_meters}
          onRefreshGPS={initGeolocation}
          isDemoMode={isDemoSimulated}
          onToggleDemoRange={handleToggleDemoSimulation}
        />

        {/* 2. Mini Map Visualizer (Leaflet + OpenStreetMap) */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Peta Lokasi & Radius Izin Absen
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
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

        {/* 3. Action Card: Jam Digital, Kamera Selfie Realtime, & Tombol Absen */}
        <AttendanceActionCard
          user={currentUser}
          site={site}
          geoState={geoState}
          hasCheckedInToday={Boolean(todayRecord?.check_in_time)}
          hasCheckedOutToday={Boolean(todayRecord?.check_out_time)}
          checkInTimeToday={todayRecord?.check_in_time}
          checkOutTimeToday={todayRecord?.check_out_time}
          onAttendanceSuccess={handleAttendanceSuccess}
        />

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
      <BottomNav userRole={currentUser.role} />
    </div>
  );
}
