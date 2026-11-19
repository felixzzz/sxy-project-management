'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { DynamicSiteMap } from '@/components/map/DynamicSiteMap';
import { DEFAULT_SITE } from '@/lib/mock-data';
import { ProjectSite } from '@/types/attendance';
import { ArrowLeft, Save, CheckCircle2, Sliders, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function AdminSiteSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [site, setSite] = useState<ProjectSite>(DEFAULT_SITE);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function loadSite() {
      const supabase = createClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('project_sites')
        .select('*')
        .eq('id', DEFAULT_SITE.id)
        .maybeSingle();

      if (data) {
        setSite(data as ProjectSite);
      }
    }

    loadSite();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('project_sites').upsert({
          id: site.id,
          name: site.name,
          address: site.address,
          latitude: site.latitude,
          longitude: site.longitude,
          radius_meters: site.radius_meters,
          is_active: true,
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Save site error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={user} />

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Konfigurasi Lokasi Proyek & Geofence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengaturan titik GPS dan radius toleransi absensi staff
            </p>
          </div>
        </div>

        {/* Notifikasi Simpan Sukses */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Konfigurasi lokasi Sekolah Guang Ming Pusat berhasil diperbarui.</span>
          </div>
        )}

        {/* Form Pengaturan */}
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Proyek / Site
            </label>
            <input
              type="text"
              value={site.name}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap
            </label>
            <input
              type="text"
              value={site.address || ''}
              onChange={(e) => setSite({ ...site, address: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Koordinat Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude Proyek
              </label>
              <input
                type="number"
                step="0.0000001"
                value={site.latitude}
                onChange={(e) => setSite({ ...site, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude Proyek
              </label>
              <input
                type="number"
                step="0.0000001"
                value={site.longitude}
                onChange={(e) => setSite({ ...site, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Slider Radius Geofence */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Radius Toleransi Absensi</span>
              </label>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {site.radius_meters} Meter
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={site.radius_meters}
              onChange={(e) => setSite({ ...site, radius_meters: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Ketat (20m)</span>
              <span>Rekomendasi (100m)</span>
              <span>Luas (500m)</span>
            </div>
          </div>

          {/* Pratinjau Peta Interaktif */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Pratinjau Radius di Peta (Live Preview)
            </span>
            <DynamicSiteMap
              siteLat={site.latitude}
              siteLng={site.longitude}
              siteName={site.name}
              radiusMeters={site.radius_meters}
              userLat={null}
              userLng={null}
              isWithinRadius={true}
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Menyimpan ke Database...' : 'Simpan Perubahan Koordinat & Radius'}</span>
            </button>
          </div>
        </form>
      </main>

      <BottomNav userRole={user.role} />
    </div>
  );
}
