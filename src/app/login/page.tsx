'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HardHat, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
        }
      }

      // Berhasil masuk
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: 'staff' | 'admin') => {
    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-12">
      <div className="max-w-sm w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-950/40">
            <HardHat className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            SXY Absensi Lapangan
          </h1>
          <p className="text-xs text-slate-400">
            Proyek Sekolah Guang Ming Pusat
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="staff@guangming.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-lg">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <span>{isLoading ? 'Memeriksa...' : 'Masuk Aplikasi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="pt-3 border-t border-slate-700/80 space-y-2">
            <span className="text-[11px] text-slate-400 block text-center font-medium">
              Akses Cepat (Tanpa Password):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('staff')}
                className="py-2 px-2.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Masuk Staff</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="py-2 px-2.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Masuk Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Sistem Absensi Lapangan Berbasis Geofence & Kamera Asli
        </p>
      </div>
    </div>
  );
}
