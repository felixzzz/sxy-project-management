'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setErrorMessage('Koneksi Supabase belum dikonfigurasi di file environment.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      await refreshProfile();

      const isOwner = email.toLowerCase() === 'felix@salim.bz';

      // Cek role dan status keaktifan pengguna
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false && !isOwner) {
        await supabase.auth.signOut();
        setErrorMessage('Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi koordinator proyek.');
        setIsLoading(false);
        return;
      }

      if (isOwner || profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message === 'Invalid login credentials'
            ? 'Email atau kata sandi tidak cocok. Harap periksa kembali atau hubungi Admin.'
            : err.message
          : 'Terjadi kegagalan masuk';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-8">
      <div className="max-w-sm w-full mx-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-13 h-13 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-950/40 p-3">
            <HardHat className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            SXY Absensi Lapangan
          </h1>
          <p className="text-xs text-slate-400">
            Proyek Sekolah Guang Ming Pusat
          </p>
        </div>

        {/* Card Form Login */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Masuk Akun</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan kredensial akun staff atau admin Anda
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                  placeholder="nama@guangming.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 active:scale-[0.98] transition-transform disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info: Akun dibuat oleh admin */}
        <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-center space-y-1">
          <p className="text-[11px] font-medium text-slate-400">
            🔒 Pendaftaran Akun Dibatasi
          </p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Akun staff dan mandor hanya dapat didaftarkan langsung oleh Admin Proyek. Hubungi Admin jika Anda belum memiliki akses.
          </p>
        </div>
      </div>
    </div>
  );
}
