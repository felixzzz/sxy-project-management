'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, Lock, Mail, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'staff' | 'mandor' | 'admin'>('staff');
  const [jobPosition, setJobPosition] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setErrorMessage('Koneksi Supabase belum dikonfigurasi di file environment.');
      setIsLoading(false);
      return;
    }

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        await refreshProfile();

        // Cek role user untuk pengalihan halaman
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        // Mode Registrasi Akun Baru
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              job_position: jobPosition || (role === 'admin' ? 'Project Director' : 'Staff Proyek'),
            },
          },
        });

        if (error) throw error;

        // Buat atau perbarui entri profil di public.profiles
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role,
            job_position: jobPosition || (role === 'admin' ? 'Project Director' : 'Staff Proyek'),
            is_active: true,
          });
        }

        setSuccessMessage('Pendaftaran berhasil! Silakan masuk dengan akun Anda.');
        setTab('login');
        setPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan autentikasi';
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

        {/* Tab Switch: Masuk vs Daftar */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Card Form */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Nama sesuai KTP/Proyek"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Peran Akses
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="staff">Staff Proyek</option>
                      <option value="mandor">Mandor</option>
                      <option value="admin">Admin Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Jabatan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: QC / Mandor"
                      value={jobPosition}
                      onChange={(e) => setJobPosition(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="email@guangming.sch.id"
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
                  placeholder="Minimal 6 karakter"
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
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Setiap staff & admin wajib terdaftar dan login sebelum melakukan absensi.
        </p>
      </div>
    </div>
  );
}
