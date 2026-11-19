'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_SITE, MOCK_USERS } from '@/lib/mock-data';
import { AttendanceRecord, UserProfile, ProjectSite, UserRole } from '@/types/attendance';
import { formatTimeID, formatDateID } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { DynamicSiteMap } from '@/components/map/DynamicSiteMap';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  Megaphone,
  Download,
  Search,
  Filter,
  Eye,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Power,
  Pencil,
  Trash2,
  ExternalLink,
  LogOut,
  Sliders,
  Save,
  Calendar,
  UserPlus,
  Check,
  X,
  Radio,
  Phone,
  Mail,
  RefreshCw,
  Bell,
  Lock,
  Sparkles,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'attendance'
  | 'staff'
  | 'site'
  | 'workhours'
  | 'security'
  | 'announcements';

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading: isAuthLoading } = useAuth();

  // Tab State
  const initialTab = (searchParams.get('tab') as AdminTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as AdminTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Core Data State
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [site, setSite] = useState<ProjectSite>(DEFAULT_SITE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Staff Modal States
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<UserProfile | null>(null);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // Form Fields - New Staff
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newJob, setNewJob] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');

  // Form Fields - Edit Staff
  const [editFullName, setEditFullName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editJob, setEditJob] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>('');

  // Settings State (Site & Operasional)
  const [siteForm, setSiteForm] = useState({
    name: DEFAULT_SITE.name,
    address: DEFAULT_SITE.address || '',
    latitude: DEFAULT_SITE.latitude,
    longitude: DEFAULT_SITE.longitude,
    radius_meters: DEFAULT_SITE.radius_meters,
    work_start_time: DEFAULT_SITE.work_start_time || '08:00',
    work_end_time: DEFAULT_SITE.work_end_time || '17:00',
    late_tolerance_minutes: DEFAULT_SITE.late_tolerance_minutes || 15,
    work_days: DEFAULT_SITE.work_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    require_selfie: DEFAULT_SITE.require_selfie ?? true,
    max_gps_accuracy: DEFAULT_SITE.max_gps_accuracy || 50,
    allow_overtime: DEFAULT_SITE.allow_overtime ?? true,
    emergency_contact: DEFAULT_SITE.emergency_contact || '0811-9876-5432 (Hendra Wijaya - Project Director)',
    announcement: DEFAULT_SITE.announcement || 'Wajib mengenakan rompi keselamatan dan helm proyek di seluruh zona pembangunan struktur Sekolah Guang Ming.',
  });

  // Current Live Clock
  const [currentClock, setCurrentClock] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth Protection
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isAuthLoading, router]);

  // Load Data
  const loadDashboardData = async () => {
    if (!user || user.role !== 'admin') return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        setProfiles(MOCK_USERS);
        setIsLoading(false);
        return;
      }

      // 1. Ambil Profiles
      const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profilesData && profilesData.length > 0) {
        setProfiles(profilesData);
      } else {
        setProfiles(MOCK_USERS);
      }

      // 2. Ambil Site
      const { data: siteData } = await supabase.from('project_sites').select('*').eq('id', DEFAULT_SITE.id).maybeSingle();
      if (siteData) {
        setSite({ ...DEFAULT_SITE, ...siteData });
        setSiteForm((prev) => ({
          ...prev,
          name: siteData.name || prev.name,
          address: siteData.address || prev.address,
          latitude: siteData.latitude || prev.latitude,
          longitude: siteData.longitude || prev.longitude,
          radius_meters: siteData.radius_meters || prev.radius_meters,
          work_start_time: siteData.work_start_time || prev.work_start_time,
          work_end_time: siteData.work_end_time || prev.work_end_time,
          late_tolerance_minutes: siteData.late_tolerance_minutes || prev.late_tolerance_minutes,
          work_days: siteData.work_days || prev.work_days,
          require_selfie: siteData.require_selfie ?? prev.require_selfie,
          max_gps_accuracy: siteData.max_gps_accuracy || prev.max_gps_accuracy,
          allow_overtime: siteData.allow_overtime ?? prev.allow_overtime,
          emergency_contact: siteData.emergency_contact || prev.emergency_contact,
          announcement: siteData.announcement || prev.announcement,
        }));
      }

      // 3. Ambil Attendances
      const { data: attendancesData } = await supabase.from('attendances').select('*').order('check_in_time', { ascending: false });
      if (attendancesData) {
        const enriched = attendancesData.map((att: any) => {
          const matchedUser = (profilesData || MOCK_USERS).find((p) => p.id === att.user_id);
          return {
            ...att,
            user: matchedUser || {
              full_name: 'Staff Lapangan',
              job_position: 'Pekerja Proyek',
            },
          };
        });
        setAttendances(enriched);
      }
    } catch (err) {
      console.warn('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Save Settings Helper
  const handleSaveSettings = async (sectionName: string, payload: Partial<typeof siteForm>) => {
    setIsSaving(true);
    setSaveNotification(null);

    const merged = { ...siteForm, ...payload };
    setSiteForm(merged);

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('project_sites').upsert({
          id: DEFAULT_SITE.id,
          ...merged,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }

      // Update state
      setSite((prev) => ({ ...prev, ...merged }));
      setSaveNotification(`Pengaturan ${sectionName} berhasil disimpan ke sistem Yayasan Guang Ji!`);
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err) {
      console.warn('Gagal menyimpan ke Supabase, menyimpan lokal:', err);
      setSite((prev) => ({ ...prev, ...merged }));
      setSaveNotification(`Pengaturan ${sectionName} tersimpan (Mode Sinkronisasi Lokal).`);
      setTimeout(() => setSaveNotification(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Staff CRUD Actions
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStaff(true);
    setStaffModalError(null);

    try {
      const res = await fetch('/api/admin/users', {
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

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal menambahkan staf');

      setShowAddStaffModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewJob('');
      setNewPhone('');
      await loadDashboardData();
      setSaveNotification(`Staff ${newFullName} berhasil didaftarkan ke proyek.`);
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: unknown) {
      setStaffModalError(err instanceof Error ? err.message : 'Terjadi kegagalan penambahan staff');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSubmittingStaff(true);
    setStaffModalError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingStaff.id,
          fullName: editFullName,
          role: editRole,
          jobPosition: editJob,
          phoneNumber: editPhone,
          isActive: editIsActive,
          password: editPassword || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal memperbarui staf');

      setEditingStaff(null);
      await loadDashboardData();
      setSaveNotification(`Data staf berhasil diperbarui.`);
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: unknown) {
      setStaffModalError(err instanceof Error ? err.message : 'Gagal mengubah data staff');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleToggleStaffActive = async (targetUser: UserProfile) => {
    try {
      const updatedStatus = targetUser.is_active === false ? true : false;
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          isActive: updatedStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengubah status');
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, is_active: updatedStatus } : p))
      );
      setSaveNotification(`Status ${targetUser.full_name} diubah menjadi ${updatedStatus ? 'AKTIF' : 'NONAKTIF'}.`);
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setIsSubmittingStaff(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingStaff.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus user');
      }

      setProfiles((prev) => prev.filter((p) => p.id !== deletingStaff.id));
      setDeletingStaff(null);
      setSaveNotification(`Akun staf berhasil dihapus dari sistem.`);
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus staff');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Filter Attendances
  const filteredRecords = useMemo(() => {
    return attendances.filter((item) => {
      const name = item.user?.full_name?.toLowerCase() || '';
      const pos = item.user?.job_position?.toLowerCase() || '';
      const notes = item.notes?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      const matchQuery = name.includes(q) || pos.includes(q) || notes.includes(q);

      if (!matchQuery) return false;

      // Status filter
      if (statusFilter === 'present' && item.status !== 'present') return false;
      if (statusFilter === 'late' && item.status !== 'late') return false;

      // Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.check_in_time);
        const now = new Date();
        if (dateFilter === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === '7days') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        }
      }

      return true;
    });
  }, [attendances, searchQuery, statusFilter, dateFilter]);

  // Export CSV
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

    const rows = filteredRecords.map((item) => [
      item.id,
      item.user?.full_name || '-',
      item.user?.job_position || '-',
      formatDateID(item.check_in_time),
      formatTimeID(item.check_in_time),
      Math.round(item.check_in_distance_meters),
      item.check_out_time ? formatTimeID(item.check_out_time) : '-',
      item.status === 'present' ? 'Tepat Waktu' : item.status === 'late' ? 'Terlambat' : item.status,
      `"${item.notes || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Absensi_Guang_Ming_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = profiles.length;
    const activeStaff = profiles.filter((p) => p.is_active !== false).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayList = attendances.filter((a) => new Date(a.check_in_time) >= todayStart);
    const presentToday = todayList.length;
    const lateToday = todayList.filter((a) => a.status === 'late').length;
    const onTimeToday = todayList.filter((a) => a.status === 'present').length;
    const attendanceRate = total > 0 ? Math.round((presentToday / total) * 100) : 0;

    const avgDist =
      attendances.length > 0
        ? Math.round(
            attendances.reduce((acc, curr) => acc + curr.check_in_distance_meters, 0) /
              attendances.length
          )
        : 0;

    return {
      total,
      activeStaff,
      presentToday,
      lateToday,
      onTimeToday,
      attendanceRate,
      avgDist,
    };
  }, [profiles, attendances]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">Memeriksa hak akses administrator...</p>
      </div>
    );
  }

  // Navigation Items
  const navItems = [
    { id: 'overview' as AdminTab, label: 'Dashboard Utama', icon: LayoutDashboard, badge: 'Live' },
    { id: 'attendance' as AdminTab, label: 'Log & Rekap Absensi', icon: ClipboardList, count: attendances.length },
    { id: 'staff' as AdminTab, label: 'Kelola Tim & Staff', icon: Users, count: profiles.length },
    { id: 'site' as AdminTab, label: 'Lokasi Site & Geofence', icon: MapPin },
    { id: 'workhours' as AdminTab, label: 'Jam Kerja & Shift', icon: Clock },
    { id: 'security' as AdminTab, label: 'Keamanan Presensi', icon: ShieldCheck },
    { id: 'announcements' as AdminTab, label: 'Pengumuman Proyek', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification Banner */}
      {saveNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2.5 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          <span className="flex-1">{saveNotification}</span>
          <button
            onClick={() => setSaveNotification(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-200 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* SIDEBAR DESKTOP (Persistent on Desktop, hidden on Mobile) */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col shrink-0 border-r border-amber-500/15 bg-slate-900/90 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-amber-500/15">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-300 to-emerald-600 shadow-md shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 p-0.5 flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Logo Yayasan Guang Ji"
                  width={44}
                  height={44}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">
                  Yayasan Guang Ji
                </span>
              </div>
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">
                Portal Admin Proyek
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Sekolah Guang Ming Pusat
              </p>
            </div>
          </div>

          <div className="mt-3.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Lapangan
            </span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              {currentClock || '--:--:--'} WIB
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3.5 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigasi Utama
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  router.push(`/admin?tab=${item.id}`);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-l-4 border-amber-500 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Profile & Switch Mode */}
        <div className="p-4 border-t border-amber-500/15 bg-slate-950/60 space-y-2.5">
          <Link
            href="/"
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
            title="Buka Tampilan Absensi Karyawan"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Mode Presensi Staff</span>
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user.full_name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate leading-tight">
                  {user.full_name}
                </div>
                <div className="text-[10px] text-amber-500 font-mono uppercase tracking-wide">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE TOP BAR & HORIZONTAL TABS (Visible on < lg) */}
      {/* ============================================================ */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-emerald-600 shrink-0">
              <div className="w-full h-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500">
                Yayasan Guang Ji
              </div>
              <h2 className="text-xs font-bold text-white">Admin Dashboard</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1"
            >
              <span>Presensi</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Tabs on Mobile */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-t border-slate-800 bg-slate-950/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  router.push(`/admin?tab=${item.id}`);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto min-h-screen">
        {/* Top Header Bar for Desktop */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-amber-500/15 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-500 font-semibold">Yayasan Guang Ji</span>
              <span>/</span>
              <span className="capitalize">{activeTab}</span>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
              {navItems.find((n) => n.id === activeTab)?.label || 'Dashboard Proyek'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setStaffModalError(null);
                setShowAddStaffModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Staff Baru</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 lg:p-8 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Stat Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
                {/* 1. Total Staff */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Total Tim Proyek</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-white tracking-tight tabular-nums">
                    {metrics.total}
                  </div>
                  <p className="text-[11px] text-amber-400/90 mt-1 font-medium">
                    {metrics.activeStaff} staf aktif terdaftar
                  </p>
                </div>

                {/* 2. Kehadiran Hari Ini */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Kehadiran Hari Ini</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-emerald-400 tracking-tight tabular-nums">
                      {metrics.presentToday}
                    </span>
                    <span className="text-xs font-mono text-slate-400">/ {metrics.total} staf</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.attendanceRate}%` }}
                    />
                  </div>
                </div>

                {/* 3. Kepatuhan Geofence */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Kepatuhan Geofence</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-mono text-3xl font-extrabold text-white tracking-tight tabular-nums">
                    100%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Deviasi rata-rata: <strong className="text-amber-400 font-mono">±{metrics.avgDist}m</strong>
                  </p>
                </div>

                {/* 4. Jadwal Operasional */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Jam Operasional</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-white tracking-tight tabular-nums">
                    {siteForm.work_start_time} - {siteForm.work_end_time}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Toleransi: <strong className="text-amber-400 font-mono">+{siteForm.late_tolerance_minutes} mnt</strong>
                  </p>
                </div>
              </div>

              {/* Two Column Layout on Desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left (7 cols): Live Attendance Stream Feed */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <h3 className="font-bold text-sm text-white">
                          Aktivitas Presensi Terkini
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('attendance')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Lihat Semua Log</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/80">
                      {attendances.slice(0, 5).map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Photo Thumbnail */}
                            <button
                              onClick={() => setSelectedPhoto(item.check_in_photo_url)}
                              className="relative w-11 h-13 rounded-xl overflow-hidden border border-amber-500/30 shrink-0 group cursor-pointer"
                              title="Klik untuk zoom foto selfie"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.check_in_photo_url}
                                alt="Selfie"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {item.user?.full_name}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {item.user?.job_position}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 text-amber-400/90 font-mono">
                                  <Clock className="w-3 h-3" /> {formatTimeID(item.check_in_time)} WIB
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-400/90 font-mono">
                                  <MapPin className="w-3 h-3" /> {Math.round(item.check_in_distance_meters)}m
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'present'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            }`}>
                              {item.status === 'present' ? 'Tepat Waktu' : 'Terlambat'}
                            </span>
                            {item.notes && (
                              <p className="text-[10px] text-slate-400 max-w-[120px] truncate mt-1 italic">
                                &quot;{item.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right (5 cols): Mini Map & Active Announcements */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Interactive Site Radar */}
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <h3 className="font-bold text-xs text-white">Radar & Geofence Site Proyek</h3>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                        Radius {site.radius_meters}m
                      </span>
                    </div>

                    <div className="h-44 rounded-xl overflow-hidden border border-slate-800">
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

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-200">{site.name}</p>
                      <p className="truncate text-slate-400">{site.address}</p>
                    </div>

                    <button
                      onClick={() => setActiveTab('site')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Ubah Koordinat & Radius</span>
                    </button>
                  </div>

                  {/* Active Announcement Card */}
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-xs text-white">Pengumuman Aktif di Layar Staf</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('announcements')}
                        className="text-[10px] text-amber-400 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                      {siteForm.announcement || 'Belum ada pengumuman aktif'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Kontak Darurat: <strong className="text-slate-300 font-mono">{siteForm.emergency_contact}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: LOG & REKAP ABSENSI LENGKAP */}
          {/* ======================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama staff, jabatan, atau catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter Periode */}
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                    <button
                      onClick={() => setDateFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        dateFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setDateFilter('today')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        dateFilter === 'today' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={() => setDateFilter('7days')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        dateFilter === '7days' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      7 Hari
                    </button>
                  </div>

                  {/* Filter Status */}
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Semua Status
                    </button>
                    <button
                      onClick={() => setStatusFilter('present')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'present' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Tepat Waktu
                    </button>
                    <button
                      onClick={() => setStatusFilter('late')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'late' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Terlambat
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Data */}
              <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Data Log Kehadiran Lapangan ({filteredRecords.length})
                    </h3>
                    <p className="text-xs text-slate-400">Sinkronisasi otomatis dengan server Supabase</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Foto Selfie</th>
                        <th className="py-3 px-4">Nama Staff</th>
                        <th className="py-3 px-4">Jabatan</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Jam Masuk</th>
                        <th className="py-3 px-4">Jam Pulang</th>
                        <th className="py-3 px-4">Deviasi GPS</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                            Tidak ada data absensi yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSelectedPhoto(item.check_in_photo_url)}
                                className="w-10 h-13 rounded-lg overflow-hidden border border-amber-500/30 relative group shrink-0 cursor-pointer"
                                title="Klik zoom foto"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.check_in_photo_url}
                                  alt={item.user?.full_name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            </td>
                            <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                              {item.user?.full_name}
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {item.user?.job_position}
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                              {formatDateID(item.check_in_time)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {formatTimeID(item.check_in_time)} WIB
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-amber-400 whitespace-nowrap">
                              {item.check_out_time ? `${formatTimeID(item.check_out_time)} WIB` : '-'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                ±{Math.round(item.check_in_distance_meters)}m
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'present'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {item.status === 'present' ? 'Tepat Waktu' : 'Terlambat'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 max-w-[160px] truncate">
                              {item.notes || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: KELOLA TIM & DATA STAFF */}
          {/* ======================================================== */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Daftar Tim & Pekerja Proyek</h3>
                  <p className="text-xs text-slate-400">
                    {profiles.filter((p) => p.is_active !== false).length} akun aktif dari {profiles.length} total personil
                  </p>
                </div>

                <button
                  onClick={() => {
                    setStaffModalError(null);
                    setShowAddStaffModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tambah Staf Baru</span>
                </button>
              </div>

              {/* Roster Table */}
              <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Nama Personil</th>
                        <th className="py-3 px-4">Peran / Role</th>
                        <th className="py-3 px-4">Jabatan Lapangan</th>
                        <th className="py-3 px-4">Email Login</th>
                        <th className="py-3 px-4">No. HP / WA</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                            {p.full_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : p.role === 'mandor'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {p.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {p.job_position}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {p.email}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {p.phone_number || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStaffActive(p)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                p.is_active !== false
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900'
                              }`}
                              title="Klik untuk toggle status aktif"
                            >
                              {p.is_active !== false ? '● Aktif' : '○ Nonaktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingStaff(p);
                                  setEditFullName(p.full_name);
                                  setEditRole(p.role);
                                  setEditJob(p.job_position || '');
                                  setEditPhone(p.phone_number || '');
                                  setEditIsActive(p.is_active !== false);
                                  setEditPassword('');
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                                title="Edit Staf"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingStaff(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: LOKASI SITE & GEOFENCE */}
          {/* ======================================================== */}
          {activeTab === 'site' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-amber-500/15 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-white">Titik Koordinat & Radius Geofence</h3>
                    <p className="text-xs text-slate-400">Tentukan titik pusat dan batas toleransi absensi ponsel</p>
                  </div>
                  <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/15 px-3 py-1 rounded-xl border border-amber-500/30">
                    Radius: {siteForm.radius_meters}m
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Proyek / Site
                    </label>
                    <input
                      type="text"
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Alamat Lengkap
                    </label>
                    <input
                      type="text"
                      value={siteForm.address}
                      onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        value={siteForm.latitude}
                        onChange={(e) => setSiteForm({ ...siteForm, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        value={siteForm.longitude}
                        onChange={(e) => setSiteForm({ ...siteForm, longitude: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>

                  {/* Radius Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-500" />
                        <span>Radius Toleransi Geofence</span>
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {siteForm.radius_meters} Meter
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="10"
                      value={siteForm.radius_meters}
                      onChange={(e) => setSiteForm({ ...siteForm, radius_meters: parseInt(e.target.value, 10) })}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Ketat (20m)</span>
                      <span>Rekomendasi (100m)</span>
                      <span>Luas (500m)</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleSaveSettings('Lokasi & Geofence', {
                        name: siteForm.name,
                        address: siteForm.address,
                        latitude: siteForm.latitude,
                        longitude: siteForm.longitude,
                        radius_meters: siteForm.radius_meters,
                      })
                    }
                    disabled={isSaving}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
                    <span>Simpan Konfigurasi Lokasi & Radius</span>
                  </button>
                </div>
              </div>

              {/* Map Preview */}
              <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-amber-500/15 p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-xs text-white">Live Map Preview</h4>
                <div className="h-96 rounded-xl overflow-hidden border border-slate-800">
                  <DynamicSiteMap
                    siteLat={siteForm.latitude}
                    siteLng={siteForm.longitude}
                    siteName={siteForm.name}
                    radiusMeters={siteForm.radius_meters}
                    userLat={null}
                    userLng={null}
                    isWithinRadius={true}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pin bergambar lambang Yayasan Guang Ji menandakan titik pusat proyek. Lingkaran putus-putus menunjukkan area di mana staf diperbolehkan melakukan absensi kehadiran.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PENGATURAN JAM KERJA & SHIFT (FITUR BARU) */}
          {/* ======================================================== */}
          {activeTab === 'workhours' && (
            <div className="max-w-2xl bg-slate-900/90 rounded-2xl border border-amber-500/15 p-6 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sm text-white">Pengaturan Jam Kerja, Shift & Toleransi</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur jam masuk, jam pulang, toleransi keterlambatan dan hari kerja operasional lapangan
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jam Masuk Resmi (WIB)
                  </label>
                  <input
                    type="time"
                    value={siteForm.work_start_time}
                    onChange={(e) => setSiteForm({ ...siteForm, work_start_time: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Waktu check-in pagi standar</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jam Pulang Resmi (WIB)
                  </label>
                  <input
                    type="time"
                    value={siteForm.work_end_time}
                    onChange={(e) => setSiteForm({ ...siteForm, work_end_time: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Waktu check-out sore standar</span>
                </div>
              </div>

              {/* Toleransi Keterlambatan */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Batas Toleransi Keterlambatan
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{siteForm.late_tolerance_minutes} Menit
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={siteForm.late_tolerance_minutes}
                  onChange={(e) => setSiteForm({ ...siteForm, late_tolerance_minutes: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0 mnt (Ketat)</span>
                  <span>15 mnt (Standar Proyek)</span>
                  <span>60 mnt (Longgar)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Staf yang absen masuk setelah pukul{' '}
                  <strong className="text-amber-300 font-mono">
                    {siteForm.work_start_time} + {siteForm.late_tolerance_minutes} menit
                  </strong>{' '}
                  akan otomatis ditandai berstatus &quot;Terlambat&quot;.
                </p>
              </div>

              {/* Hari Kerja Operasional */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Hari Kerja Operasional
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                    const isChecked = siteForm.work_days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          const updated = isChecked
                            ? siteForm.work_days.filter((d) => d !== day)
                            : [...siteForm.work_days, day];
                          setSiteForm({ ...siteForm, work_days: updated });
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                          isChecked
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kebijakan Lembur */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Hitung Absensi Lembur (Overtime)</h4>
                  <p className="text-[11px] text-slate-400">
                    Otomatis catat status lembur jika staf check-out di atas jam pulang resmi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSiteForm({ ...siteForm, allow_overtime: !siteForm.allow_overtime })}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    siteForm.allow_overtime ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    siteForm.allow_overtime ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <button
                onClick={() =>
                  handleSaveSettings('Jam Kerja & Shift', {
                    work_start_time: siteForm.work_start_time,
                    work_end_time: siteForm.work_end_time,
                    late_tolerance_minutes: siteForm.late_tolerance_minutes,
                    work_days: siteForm.work_days,
                    allow_overtime: siteForm.allow_overtime,
                  })
                }
                disabled={isSaving}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
                <span>Simpan Pengaturan Jam Kerja</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: KEAMANAN & KEBIJAKAN PRESENSI (FITUR BARU) */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <div className="max-w-2xl bg-slate-900/90 rounded-2xl border border-amber-500/15 p-6 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Kebijakan Keamanan, Kamera & Anti-Fraud</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validasi biometrik wajah realtime, batas akurasi satelit GPS dan perlindungan anti-spoofing
                </p>
              </div>

              {/* Wajib Foto Selfie */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div>
                  <h4 className="text-xs font-bold text-white">Wajib Kamera Langsung (Selfie Realtime)</h4>
                  <p className="text-[11px] text-slate-400 max-w-md">
                    Memaksa browser membuka kamera perangkat dan memblokir upload foto dari galeri untuk mencegah manipulasi absensi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSiteForm({ ...siteForm, require_selfie: !siteForm.require_selfie })}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    siteForm.require_selfie ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    siteForm.require_selfie ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Batas Akurasi GPS */}
              <div className="space-y-2 pb-4 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Batas Deviasi / Akurasi Sinyal GPS</h4>
                    <p className="text-[11px] text-slate-400">
                      Tolak absensi jika sinyal GPS ponsel terlalu kabur (akurasi buruk)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Maks ±{siteForm.max_gps_accuracy} Meter
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={siteForm.max_gps_accuracy}
                  onChange={(e) => setSiteForm({ ...siteForm, max_gps_accuracy: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>±10m (Sangat Presisi)</span>
                  <span>±50m (Standar HP)</span>
                  <span>±100m (Toleransi Tinggi)</span>
                </div>
              </div>

              {/* Watermark Otomatis */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">Watermark Koordinat & Cap Waktu Otomatis</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setiap foto selfie yang diambil akan langsung ditempeli stempel permanen berupa identitas{' '}
                  <strong className="text-slate-200">Yayasan Guang Ji Indonesia</strong>, nama staf, titik koordinat satelit GPS, jarak dari lokasi site, dan tanggal/jam WIB.
                </p>
              </div>

              <button
                onClick={() =>
                  handleSaveSettings('Keamanan & Validasi', {
                    require_selfie: siteForm.require_selfie,
                    max_gps_accuracy: siteForm.max_gps_accuracy,
                  })
                }
                disabled={isSaving}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
                <span>Simpan Kebijakan Keamanan</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: PUSAT PENGUMUMAN & KONTAK LAPANGAN (FITUR BARU) */}
          {/* ======================================================== */}
          {activeTab === 'announcements' && (
            <div className="max-w-2xl bg-slate-900/90 rounded-2xl border border-amber-500/15 p-6 shadow-sm space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sm text-white">Pengumuman Proyek & Kontak Koordinator</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pesan yang Anda tulis di sini akan langsung tampil pada layar beranda seluruh staf lapangan
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Isi Pesan / Pengumuman Lapangan (Banner Berjalan)
                </label>
                <textarea
                  rows={3}
                  value={siteForm.announcement}
                  onChange={(e) => setSiteForm({ ...siteForm, announcement: e.target.value })}
                  placeholder="Contoh: Seluruh pekerja wajib mengenakan helm keselamatan dan rompi APD..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kontak Darurat / Koordinator Lapangan
                </label>
                <input
                  type="text"
                  value={siteForm.emergency_contact}
                  onChange={(e) => setSiteForm({ ...siteForm, emergency_contact: e.target.value })}
                  placeholder="Contoh: 0811-9876-5432 (Hendra Wijaya - Project Director)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Nomor telepon/WhatsApp koordinator yang dapat dihubungi saat kendala absensi</span>
              </div>

              {/* Pratinjau Tampilan */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pratinjau Tampilan di HP Staf:</span>
                <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/20 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Yayasan Guang Ji Indonesia
                  </span>
                  <p className="text-slate-200 font-semibold text-xs">Presensi Proyek Sekolah Guang Ming Pusat</p>
                  <p className="text-amber-300 text-[11px] mt-1 font-medium">
                    📢 {siteForm.announcement || 'Belum ada pengumuman.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveSettings('Pengumuman & Kontak', {
                    announcement: siteForm.announcement,
                    emergency_contact: siteForm.emergency_contact,
                  })
                }
                disabled={isSaving}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
                <span>Simpan Pengumuman & Kontak</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL: TAMBAH STAFF BARU */}
      {/* ============================================================ */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Tambah Personil Proyek Baru</h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffModalError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bambang Hermanto"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Peran Akun</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="staff">Staff Lapangan</option>
                    <option value="mandor">Mandor Proyek</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jabatan Spesifik</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengawas M/E"
                    value={newJob}
                    onChange={(e) => setNewJob(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Login</label>
                <input
                  type="email"
                  required
                  placeholder="bambang@guangming.sch.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kata Sandi Awal</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">No. WhatsApp (Opsional)</label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>Daftarkan Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT DATA STAFF */}
      {/* ============================================================ */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Edit Profil: {editingStaff.full_name}</h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Peran / Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="staff">Staff Lapangan</option>
                    <option value="mandor">Mandor Proyek</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jabatan Spesifik</label>
                  <input
                    type="text"
                    value={editJob}
                    onChange={(e) => setEditJob(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">No. WhatsApp</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reset Password (Kosongkan jika tidak diubah)
                </label>
                <input
                  type="password"
                  placeholder="Password baru..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-medium text-slate-300">Status Akun Aktif:</span>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                    editIsActive ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}
                >
                  {editIsActive ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI HAPUS STAFF */}
      {/* ============================================================ */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-white">Hapus Akun Staff?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Anda yakin ingin menghapus akun <strong className="text-white">{deletingStaff.full_name}</strong> ({deletingStaff.email})? Aksi ini permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={isSubmittingStaff}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ZOOM FOTO SELFIE LIGHTBOX */}
      {/* ============================================================ */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-md w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Foto Absensi"
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="p-4 bg-slate-900 text-white text-xs space-y-1">
              <p className="font-bold text-amber-400">Bukti Foto Absensi Lapangan • Yayasan Guang Ji</p>
              <p className="text-slate-400 text-[11px]">
                Foto terverifikasi dengan cap satelit satelit GPS dan stempel koordinat presisi.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs text-slate-400">Memuat Portal Administrator Yayasan Guang Ji...</p>
        </div>
      }
    >
      <AdminDashboardInner />
    </Suspense>
  );
}
