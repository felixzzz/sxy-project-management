'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  XCircle,
  Loader2,
  Lock,
  AlertCircle,
  Pencil,
  Power,
  Trash2,
  Search,
  KeyRound,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Tambah
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<'staff' | 'mandor' | 'admin'>('staff');
  const [newJob, setNewJob] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');

  // Modal Edit
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editRole, setEditRole] = useState<'staff' | 'mandor' | 'admin'>('staff');
  const [editJob, setEditJob] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>('');

  // Modal Hapus
  const [deletingStaff, setDeletingStaff] = useState<UserProfile | null>(null);

  // Status aksi
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Tambah Staff
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
      showToast(`Akun ${newFullName} berhasil didaftarkan!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Edit
  const openEditModal = (staff: UserProfile) => {
    setModalError(null);
    setEditingStaff(staff);
    setEditFullName(staff.full_name);
    setEditRole(staff.role);
    setEditJob(staff.job_position || '');
    setEditPhone(staff.phone_number || '');
    setEditIsActive(staff.is_active !== false);
    setEditPassword('');
  };

  // Simpan Edit Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStaff.id,
          fullName: editFullName,
          role: editRole,
          jobPosition: editJob,
          phoneNumber: editPhone,
          isActive: editIsActive,
          password: editPassword.trim() ? editPassword.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui data staff');
      }

      await loadStaff();
      setEditingStaff(null);
      showToast(`Data staff ${editFullName} berhasil diperbarui.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Cepat Status Aktif / Nonaktif
  const handleToggleStatus = async (staff: UserProfile) => {
    if (staff.email?.toLowerCase() === 'felix@salim.bz') {
      showToast('Akun Super Admin utama tidak dapat dinonaktifkan.');
      return;
    }

    const newStatus = !(staff.is_active !== false);
    setActionLoadingId(staff.id);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staff.id,
          isActive: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengubah status staff');
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, is_active: newStatus } : s))
      );

      showToast(
        `Staff ${staff.full_name} berhasil ${newStatus ? 'diaktifkan kembali' : 'dinonaktifkan'}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Hapus Staff
  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users?id=${deletingStaff.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus staff');
      }

      await loadStaff();
      setDeletingStaff(null);
      showToast(`Staff ${deletingStaff.full_name} berhasil dihapus.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus staff';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((item) => {
      const matchesSearch =
        item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.job_position &&
          item.job_position.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.phone_number && item.phone_number.includes(searchQuery));

      const isActive = item.is_active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [staffList, searchQuery, statusFilter]);

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
        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Data Staff & Mandor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {staffList.filter((s) => s.is_active !== false).length} aktif dari{' '}
                {staffList.length} total akun
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
        </div>

        {/* Pencarian & Filter Status */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, jabatan, atau WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Tab Filter */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Semua ({staffList.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Aktif ({staffList.filter((s) => s.is_active !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Nonaktif ({staffList.filter((s) => s.is_active === false).length})
            </button>
          </div>
        </div>

        {/* List Staf */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Memuat daftar staf...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada data staff yang cocok
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba kata kunci lain.`
                : 'Belum ada akun pekerja proyek yang terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStaff.map((item) => {
              const isActive = item.is_active !== false;
              const isSuperAdmin = item.email?.toLowerCase() === 'felix@salim.bz';

              return (
                <div
                  key={item.id}
                  className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-sm ${
                    isActive
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-rose-200/70 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Profil info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                          !isActive
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            : item.role === 'admin'
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {item.full_name}
                          </h4>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                              item.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                                : item.role === 'mandor'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {item.role}
                          </span>

                          {/* Status Badge */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3 h-3" />
                              Nonaktif
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          {item.job_position || 'Staff Proyek'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <a
                            href={`mailto:${item.email}`}
                            className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            <Mail className="w-3 h-3" /> {item.email}
                          </a>
                          {item.phone_number ? (
                            <a
                              href={`tel:${item.phone_number}`}
                              className="flex items-center gap-1 font-mono hover:text-emerald-600 dark:hover:text-emerald-400"
                            >
                              <Phone className="w-3 h-3" /> {item.phone_number}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No WA belum diisi</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Manajemen Staff */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Tombol Edit */}
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit data staff"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Data</span>
                      </button>

                      {/* Tombol Toggle Status */}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={actionLoadingId === item.id}
                          className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {actionLoadingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                          <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      )}
                    </div>

                    {/* Tombol Hapus */}
                    {!isSuperAdmin && (
                      <button
                        onClick={() => setDeletingStaff(item)}
                        className="p-2 min-h-[36px] min-w-[36px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center cursor-pointer"
                        title="Hapus akun staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Edit Staff */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Perbarui Data Staff
                  </h3>
                  <p className="text-[11px] text-slate-400">{editingStaff.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateStaff} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Peran Akun
                    </label>
                    <select
                      value={editRole}
                      disabled={editingStaff.email?.toLowerCase() === 'felix@salim.bz'}
                      onChange={(e) =>
                        setEditRole(e.target.value as 'staff' | 'mandor' | 'admin')
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                    >
                      <option value="staff">Staff Proyek</option>
                      <option value="mandor">Mandor Lapangan</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status Akun
                    </label>
                    <select
                      value={editIsActive ? 'active' : 'inactive'}
                      disabled={editingStaff.email?.toLowerCase() === 'felix@salim.bz'}
                      onChange={(e) => setEditIsActive(e.target.value === 'active')}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none ${
                        editIsActive
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      <option value="active">Aktif (Bisa Absen)</option>
                      <option value="inactive">Nonaktif (Diblokir)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Posisi di Proyek
                  </label>
                  <input
                    type="text"
                    required
                    value={editJob}
                    onChange={(e) => setEditJob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-slate-400" />
                    Reset Kata Sandi Baru (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika sandi tidak ingin diubah"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Isi minimal 6 karakter bila staff lupa kata sandi.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Staff */}
        {deletingStaff && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Hapus Akun Staff Ini?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apakah Anda yakin ingin menghapus akun <strong>{deletingStaff.full_name}</strong>{' '}
                  ({deletingStaff.email})? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStaff}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Ya, Hapus Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tambah Staff */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Daftarkan Akun Staff / Mandor
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Akun yang didaftarkan dapat langsung login menggunakan email & kata sandi berikut.
              </p>

              {modalError && (
                <div className="p-3 mb-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleAddStaff} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap Pekerja
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Email (Untuk Login)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@guangming.sch.id"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Awal (Min. 6 Karakter)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Peran Akun
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) =>
                        setNewRole(e.target.value as 'staff' | 'mandor' | 'admin')
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                    >
                      <option value="staff">Staff Proyek</option>
                      <option value="mandor">Mandor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor HP/WA
                    </label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Posisi di Proyek
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pengawas Struktur, Mandor Besi"
                    value={newJob}
                    onChange={(e) => setNewJob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan & Daftarkan</span>
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