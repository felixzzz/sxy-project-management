'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { UserProfile } from '@/types/attendance';
import {
  ArrowLeft,
  UserPlus,
  Shield,
  User,
  HardHat,
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<'staff' | 'mandor' | 'admin'>('staff');
  const [newJob, setNewJob] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isAuthLoading, router]);

  const loadStaff = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setStaffList(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStaff();
    }
  }, [user]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          jobPosition: newJob,
          phoneNumber: newPhone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mendaftarkan staff');
      }

      await loadStaff();
      setShowAddModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewJob('');
      setNewPhone('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
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
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Data Staff & Mandor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total: {staffList.length} akun terdaftar di proyek
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
        </div>

        {/* List Staf */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Memuat daftar staf...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Belum ada staff terdaftar
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Gunakan tombol &quot;Tambah Staff&quot; di atas untuk mendaftarkan akun pekerja proyek.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {staffList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      item.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : item.role === 'mandor'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {item.role === 'admin' && <Shield className="w-5 h-5" />}
                    {item.role === 'mandor' && <HardHat className="w-5 h-5" />}
                    {item.role === 'staff' && <User className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {item.full_name}
                      </h4>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                          item.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                            : item.role === 'mandor'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.job_position}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {item.email}
                      </span>
                      {item.phone_number && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" /> {item.phone_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Aktif
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Tambah Staff */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Daftarkan Akun Staff / Mandor
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Akun akan langsung aktif dan dapat digunakan untuk login.
              </p>

              {modalError && (
                <div className="mb-3 p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleAddStaff} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Joko Widodo"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Login
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@guangming.sch.id"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Sementara
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Peran / Hak Akses
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="staff">Staff Proyek</option>
                      <option value="mandor">Mandor</option>
                      <option value="admin">Admin Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan Kerja
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: QC / Mandor Besi"
                    value={newJob}
                    onChange={(e) => setNewJob(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <span>Simpan Akun</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <BottomNav userRole={user.role} />
    </div>
  );
}
