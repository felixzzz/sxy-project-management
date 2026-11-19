'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MOCK_USERS } from '@/lib/mock-data';
import { UserProfile } from '@/types/attendance';
import { ArrowLeft, UserPlus, Shield, User, HardHat, Phone, Mail, CheckCircle2 } from 'lucide-react';

export default function AdminStaffPage() {
  const [currentUser] = useState<UserProfile>(MOCK_USERS[1]);
  const [staffList, setStaffList] = useState<UserProfile[]>(MOCK_USERS);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<'staff' | 'mandor' | 'admin'>('staff');
  const [newJob, setNewJob] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      full_name: newFullName,
      email: newEmail,
      role: newRole,
      job_position: newJob || 'Staff Proyek',
      phone_number: newPhone,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setStaffList([...staffList, newUser]);
    setShowAddModal(false);
    setNewFullName('');
    setNewEmail('');
    setNewJob('');
    setNewPhone('');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={currentUser} />

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
                Total: {staffList.length} orang terdaftar di proyek
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
        </div>

        {/* List Staf */}
        <div className="space-y-2.5">
          {staffList.map((user) => (
            <div
              key={user.id}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : user.role === 'mandor'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {user.role === 'admin' && <Shield className="w-5 h-5" />}
                  {user.role === 'mandor' && <HardHat className="w-5 h-5" />}
                  {user.role === 'staff' && <User className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {user.full_name}
                    </h4>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                          : user.role === 'mandor'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.job_position}
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </span>
                    {user.phone_number && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3" /> {user.phone_number}
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

        {/* Modal Tambah Staff */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Tambah Akun Staff Proyek
              </h3>

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
                    Email
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Peran / Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="staff">Staff</option>
                      <option value="mandor">Mandor</option>
                      <option value="admin">Admin</option>
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
                    placeholder="Contoh: Mandor Mekanikal & Elektrikal"
                    value={newJob}
                    onChange={(e) => setNewJob(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <BottomNav userRole={currentUser.role} />
    </div>
  );
}
