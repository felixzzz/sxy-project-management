'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_SITE, MOCK_USERS, MOCK_DAILY_REPORTS } from '@/lib/mock-data';
import { AttendanceRecord, UserProfile, ProjectSite, UserRole, DailySiteReport, WeatherCondition } from '@/types/attendance';
import { formatTimeID, formatDateID, formatDateTimeID, generateWhatsAppReportText, getDayNameID } from '@/lib/utils';
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
  FileBarChart,
  Printer,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Camera,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  ZoomIn,
  AlertTriangle,
  HardHat,
  Copy,
  Share2,
  Building,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'attendance'
  | 'site_reports'
  | 'reports'
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
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    time?: string;
    staffName?: string;
  } | string | null>(null);

  // Reports Module State
  const [reportSubTab, setReportSubTab] = useState<'daily' | 'monthly' | 'staff'>('daily');
  const [reportDate, setReportDate] = useState<string>('');
  const [reportMonth, setReportMonth] = useState<number>(0);
  const [reportYear, setReportYear] = useState<number>(2026);
  const [reportStaffId, setReportStaffId] = useState<string>('');
  const [todayStr, setTodayStr] = useState<string>('');
  const [currentPrintDate, setCurrentPrintDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    setReportDate(formatted);
    setReportMonth(today.getMonth());
    setReportYear(today.getFullYear());
    setTodayStr(formatted);
    setCurrentPrintDate(formatDateID(today.toISOString()));
  }, []);

  // Site Diary / Laporan Harian Proyek State
  const [dailyReports, setDailyReports] = useState<DailySiteReport[]>([]);
  const [selectedReportDetail, setSelectedReportDetail] = useState<DailySiteReport | null>(null);
  const [selectedReportPhotoIndex, setSelectedReportPhotoIndex] = useState<number>(0);
  const [reportZoneFilter, setReportZoneFilter] = useState<string>('all');
  const [siteReportSearchQuery, setSiteReportSearchQuery] = useState<string>('');
  const [siteReportDateFilter, setSiteReportDateFilter] = useState<'all' | 'today'>('all');

  // Staff Modal States
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<UserProfile | null>(null);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // Report Edit & Backdate Modal States (Admin Only)
  const [editingReport, setEditingReport] = useState<DailySiteReport | null>(null);
  const [editReportDate, setEditReportDate] = useState<string>('');
  const [editWorkDayName, setEditWorkDayName] = useState<string>('');
  const [editZoneName, setEditZoneName] = useState<string>('');
  const [editWorkCategory, setEditWorkCategory] = useState<string>('');
  const [editWorkCompleted, setEditWorkCompleted] = useState<string>('');
  const [editWorkPlannedTomorrow, setEditWorkPlannedTomorrow] = useState<string>('');
  const [editObstacles, setEditObstacles] = useState<string>('');
  const [editWeatherCondition, setEditWeatherCondition] = useState<WeatherCondition>('sunny');
  const [editStaffTotal, setEditStaffTotal] = useState<number>(17);
  const [editManpowerTotal, setEditManpowerTotal] = useState<number>(25);
  const [isSubmittingReportEdit, setIsSubmittingReportEdit] = useState<boolean>(false);
  const [reportEditError, setReportEditError] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<DailySiteReport | null>(null);

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

      // 4. Ambil Laporan Harian Proyek (Site Diary)
      try {
        const reportsRes = await fetch('/api/reports');
        const reportsJson = await reportsRes.json();
        if (reportsJson.data && Array.isArray(reportsJson.data)) {
          setDailyReports(reportsJson.data);
        } else {
          setDailyReports(MOCK_DAILY_REPORTS);
        }
      } catch {
        setDailyReports(MOCK_DAILY_REPORTS);
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

    if (editPassword && editPassword.trim().length > 0 && editPassword.trim().length < 6) {
      setStaffModalError('Password baru minimal 6 karakter.');
      setIsSubmittingStaff(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStaff.id,
          userId: editingStaff.id,
          fullName: editFullName,
          role: editRole,
          jobPosition: editJob,
          phoneNumber: editPhone,
          isActive: editIsActive,
          password: editPassword?.trim() ? editPassword.trim() : undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Gagal memperbarui staf');

      if (resData.user) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === editingStaff.id ? { ...p, ...resData.user } : p))
        );
      }
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetUser.id,
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
      setSaveNotification(err instanceof Error ? err.message : 'Gagal mengubah status staf');
      setTimeout(() => setSaveNotification(null), 4000);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setIsSubmittingStaff(true);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(deletingStaff.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingStaff.id, userId: deletingStaff.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus user');
      }

      const deletedName = deletingStaff.full_name;
      setProfiles((prev) => prev.filter((p) => p.id !== deletingStaff.id));
      setDeletingStaff(null);
      setSaveNotification(`Akun ${deletedName} berhasil dihapus dari sistem.`);
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus staff');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const openEditReportModal = (rep: DailySiteReport) => {
    setReportEditError(null);
    setEditingReport(rep);
    const repDate = rep.report_date || (rep.created_at ? rep.created_at.split('T')[0] : '');
    setEditReportDate(repDate);
    setEditWorkDayName(rep.work_day_name || getDayNameID(repDate));
    setEditZoneName(rep.zone_name);
    setEditWorkCategory(rep.work_category || 'PEKERJAAN PERSIAPAN');
    setEditWorkCompleted(rep.work_completed);
    setEditWorkPlannedTomorrow(rep.work_planned_tomorrow || '');
    setEditObstacles(rep.obstacles || '');
    setEditWeatherCondition(rep.weather_condition);
    setEditStaffTotal(rep.staff_total || 17);
    setEditManpowerTotal(rep.manpower_total || rep.worker_headcount || 25);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !user) return;
    setIsSubmittingReportEdit(true);
    setReportEditError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReport.id,
          adminUserId: user.id,
          reportDate: editReportDate,
          workDayName: editWorkDayName,
          zoneName: editZoneName.trim(),
          workCategory: editWorkCategory,
          workCompleted: editWorkCompleted.trim(),
          workPlannedTomorrow: editWorkPlannedTomorrow.trim(),
          obstacles: editObstacles.trim(),
          weatherCondition: editWeatherCondition,
          staffTotal: editStaffTotal,
          manpowerTotal: editManpowerTotal,
          totalWorkers: editStaffTotal + editManpowerTotal,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Gagal mengubah laporan.');

      const updated = resJson.data;
      setDailyReports((prev) =>
        prev.map((r) => (r.id === editingReport.id ? { ...r, ...updated } : r))
      );
      if (selectedReportDetail && selectedReportDetail.id === editingReport.id) {
        setSelectedReportDetail((prev) => (prev ? { ...prev, ...updated } : null));
      }

      setEditingReport(null);
      setSaveNotification(`Laporan untuk tanggal ${editReportDate} berhasil diperbarui.`);
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: unknown) {
      setReportEditError(err instanceof Error ? err.message : 'Gagal mengubah laporan.');
    } finally {
      setIsSubmittingReportEdit(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport || !user) return;
    setIsSubmittingReportEdit(true);
    try {
      const res = await fetch(
        `/api/reports?id=${encodeURIComponent(deletingReport.id)}&adminUserId=${encodeURIComponent(user.id)}`,
        { method: 'DELETE' }
      );
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Gagal menghapus laporan.');

      setDailyReports((prev) => prev.filter((r) => r.id !== deletingReport.id));
      if (selectedReportDetail && selectedReportDetail.id === deletingReport.id) {
        setSelectedReportDetail(null);
      }
      setDeletingReport(null);
      setSaveNotification('Laporan proyek berhasil dihapus.');
      setTimeout(() => setSaveNotification(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus laporan.');
    } finally {
      setIsSubmittingReportEdit(false);
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
        if (dateFilter === 'today') {
          if (!todayStr || !item.check_in_time.startsWith(todayStr)) return false;
        } else if (dateFilter === '7days') {
          const itemTime = new Date(item.check_in_time).getTime();
          const nowMs = todayStr ? new Date(`${todayStr}T23:59:59`).getTime() : 0;
          if (nowMs && nowMs - itemTime > 7 * 86400000) return false;
        }
      }

      return true;
    });
  }, [attendances, searchQuery, statusFilter, dateFilter, todayStr]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Absen',
      'Nama Staff',
      'Jabatan',
      'Tanggal',
      'Jam Masuk (WIB)',
      'Jarak Masuk (meter)',
      'Foto Masuk (URL)',
      'Jam Pulang (WIB)',
      'Foto Pulang (URL)',
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
      `"${item.check_in_photo_url || '-'}"`,
      item.check_out_time ? formatTimeID(item.check_out_time) : '-',
      `"${item.check_out_photo_url || '-'}"`,
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

    const todayList = todayStr
      ? attendances.filter((a) => a.check_in_time.startsWith(todayStr))
      : [];
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
  }, [profiles, attendances, todayStr]);

  // Ensure default reportStaffId is initialized
  useEffect(() => {
    if (!reportStaffId && profiles.length > 0) {
      setReportStaffId(profiles[0].id);
    }
  }, [profiles, reportStaffId]);

  // Indonesian Month Constants
  const MONTH_NAMES = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  // Duration Helper
  const formatDuration = (startIso?: string, endIso?: string | null): string => {
    if (!startIso || !endIso) return '-';
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffMs = Math.max(0, end - start);
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}j ${mins}m`;
  };

  // Helper CSV Downloader
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Calculations - Daily Report
  const dailyAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendances.forEach((att) => {
      const attDate = new Date(att.check_in_time);
      const localDateStr = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}-${String(attDate.getDate()).padStart(2, '0')}`;
      if (localDateStr === reportDate) {
        if (!map.has(att.user_id)) {
          map.set(att.user_id, att);
        }
      }
    });
    return map;
  }, [attendances, reportDate]);

  const dailyStaffRows = useMemo(() => {
    return profiles.map((p) => {
      const att = dailyAttendanceMap.get(p.id);
      return {
        profile: p,
        attendance: att || null,
        status: att ? att.status : 'absent',
      };
    });
  }, [profiles, dailyAttendanceMap]);

  const dailyStats = useMemo(() => {
    const total = profiles.length;
    let presentCount = 0;
    let lateCount = 0;
    let onTimeCount = 0;

    dailyStaffRows.forEach((row) => {
      if (row.attendance) {
        presentCount++;
        if (row.attendance.status === 'late') {
          lateCount++;
        } else {
          onTimeCount++;
        }
      }
    });

    const absentCount = total - presentCount;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      total,
      presentCount,
      lateCount,
      onTimeCount,
      absentCount,
      rate,
    };
  }, [profiles, dailyStaffRows]);

  const handleExportDailyReport = () => {
    const headers = [
      'No',
      'Nama Staff',
      'Jabatan',
      'Email',
      'Tanggal',
      'Status Kehadiran',
      'Jam Masuk (WIB)',
      'Jarak Presensi (m)',
      'Foto Masuk (URL)',
      'Jam Pulang (WIB)',
      'Foto Pulang (URL)',
      'Total Durasi Kerja',
      'Catatan',
    ];
    const rows = dailyStaffRows.map((row, idx) => {
      const att = row.attendance;
      const statusText = !att
        ? 'Belum Presensi'
        : att.status === 'present'
        ? 'Tepat Waktu'
        : 'Terlambat';
      return [
        idx + 1,
        `"${row.profile.full_name}"`,
        `"${row.profile.job_position || '-'}"`,
        `"${row.profile.email || '-'}"`,
        reportDate,
        `"${statusText}"`,
        att?.check_in_time ? formatTimeID(att.check_in_time) : '-',
        att?.check_in_distance_meters ? Math.round(att.check_in_distance_meters) : '-',
        `"${att?.check_in_photo_url || '-'}"`,
        att?.check_out_time ? formatTimeID(att.check_out_time) : '-',
        `"${att?.check_out_photo_url || '-'}"`,
        att ? formatDuration(att.check_in_time, att.check_out_time) : '-',
        `"${att?.notes || '-'}"`,
      ];
    });
    downloadCsv(`Laporan_Harian_GuangJi_${reportDate}.csv`, headers, rows);
  };

  // 2. Calculations - Monthly Report
  const monthlyStaffSummary = useMemo(() => {
    return profiles.map((staff) => {
      const staffAtts = attendances.filter((att) => {
        if (att.user_id !== staff.id) return false;
        const d = new Date(att.check_in_time);
        return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
      });

      const totalDays = staffAtts.length;
      const onTimeDays = staffAtts.filter((a) => a.status === 'present').length;
      const lateDays = staffAtts.filter((a) => a.status === 'late').length;

      let totalMinutes = 0;
      let checkInMinutesSum = 0;

      staffAtts.forEach((a) => {
        if (a.check_in_time && a.check_out_time) {
          const start = new Date(a.check_in_time).getTime();
          const end = new Date(a.check_out_time).getTime();
          totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
        }
        const d = new Date(a.check_in_time);
        checkInMinutesSum += d.getHours() * 60 + d.getMinutes();
      });

      const avgCheckInMin = totalDays > 0 ? Math.round(checkInMinutesSum / totalDays) : null;
      const avgCheckInStr =
        avgCheckInMin !== null
          ? `${String(Math.floor(avgCheckInMin / 60)).padStart(2, '0')}:${String(avgCheckInMin % 60).padStart(2, '0')} WIB`
          : '-';

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMins = totalMinutes % 60;
      const durationStr = totalMinutes > 0 ? `${totalHours}j ${remainingMins}m` : '-';
      const attendanceRate = Math.min(100, Math.round((totalDays / 26) * 100));

      return {
        staff,
        totalDays,
        onTimeDays,
        lateDays,
        totalMinutes,
        durationStr,
        avgCheckInStr,
        attendanceRate,
        records: staffAtts,
      };
    });
  }, [profiles, attendances, reportMonth, reportYear]);

  const monthlyOverallStats = useMemo(() => {
    const totalLogs = monthlyStaffSummary.reduce((sum, item) => sum + item.totalDays, 0);
    const totalOnTime = monthlyStaffSummary.reduce((sum, item) => sum + item.onTimeDays, 0);
    const totalMinutes = monthlyStaffSummary.reduce((sum, item) => sum + item.totalMinutes, 0);
    const onTimeRate = totalLogs > 0 ? Math.round((totalOnTime / totalLogs) * 100) : 0;
    const totalHours = Math.floor(totalMinutes / 60);

    return {
      totalLogs,
      totalHours,
      onTimeRate,
      activeStaffCount: profiles.length,
    };
  }, [monthlyStaffSummary, profiles]);

  const handleExportMonthlyReport = () => {
    const monthName = MONTH_NAMES[reportMonth];
    const headers = [
      'No',
      'Nama Staff',
      'Jabatan',
      'Email',
      'Periode Bulan',
      'Tahun',
      'Total Hari Hadir',
      'Hadir Tepat Waktu',
      'Terlambat',
      'Akumulasi Jam Kerja',
      'Rata-rata Jam Masuk',
      'Persentase Kehadiran',
    ];
    const rows = monthlyStaffSummary.map((item, idx) => [
      idx + 1,
      `"${item.staff.full_name}"`,
      `"${item.staff.job_position || '-'}"`,
      `"${item.staff.email || '-'}"`,
      monthName,
      reportYear,
      item.totalDays,
      item.onTimeDays,
      item.lateDays,
      `"${item.durationStr}"`,
      `"${item.avgCheckInStr}"`,
      `"${item.attendanceRate}%"`,
    ]);
    downloadCsv(`Rekap_Bulanan_GuangJi_${monthName}_${reportYear}.csv`, headers, rows);
  };

  // 3. Calculations - Per Staff Report
  const selectedStaffProfile = useMemo(() => {
    return profiles.find((p) => p.id === reportStaffId) || profiles[0] || null;
  }, [profiles, reportStaffId]);

  const selectedStaffRecords = useMemo(() => {
    if (!selectedStaffProfile) return [];
    return attendances.filter((a) => a.user_id === selectedStaffProfile.id);
  }, [attendances, selectedStaffProfile]);

  const staffStats = useMemo(() => {
    const total = selectedStaffRecords.length;
    const onTime = selectedStaffRecords.filter((a) => a.status === 'present').length;
    const late = selectedStaffRecords.filter((a) => a.status === 'late').length;

    let totalMinutes = 0;
    selectedStaffRecords.forEach((a) => {
      if (a.check_in_time && a.check_out_time) {
        const start = new Date(a.check_in_time).getTime();
        const end = new Date(a.check_out_time).getTime();
        totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const punctualRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return {
      total,
      onTime,
      late,
      totalDurationStr: `${hours} jam ${mins} menit`,
      punctualRate,
    };
  }, [selectedStaffRecords]);

  const handleExportStaffReport = () => {
    if (!selectedStaffProfile) return;
    const headers = [
      'No',
      'Nama Staff',
      'Jabatan',
      'Tanggal',
      'Jam Masuk (WIB)',
      'Jarak GPS (m)',
      'Foto Masuk (URL)',
      'Jam Pulang (WIB)',
      'Foto Pulang (URL)',
      'Durasi Kerja',
      'Status Kehadiran',
      'Catatan',
    ];
    const rows = selectedStaffRecords.map((att, idx) => {
      const statusText = att.status === 'present' ? 'Tepat Waktu' : 'Terlambat';
      return [
        idx + 1,
        `"${selectedStaffProfile.full_name}"`,
        `"${selectedStaffProfile.job_position || '-'}"`,
        formatDateID(att.check_in_time),
        formatTimeID(att.check_in_time),
        Math.round(att.check_in_distance_meters),
        `"${att.check_in_photo_url || '-'}"`,
        att.check_out_time ? formatTimeID(att.check_out_time) : '-',
        `"${att.check_out_photo_url || '-'}"`,
        formatDuration(att.check_in_time, att.check_out_time),
        `"${statusText}"`,
        `"${att.notes || '-'}"`,
      ];
    });
    const safeName = selectedStaffProfile.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCsv(`Rekap_Staff_${safeName}_${reportYear}.csv`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  // Site Diary Filtering & Correlation Calculations
  const reportsToday = useMemo(() => {
    return dailyReports.filter(
      (r) => r.report_date === todayStr || (r.created_at && r.created_at.startsWith(todayStr))
    );
  }, [dailyReports, todayStr]);

  const totalHeadcountToday = useMemo(() => {
    return reportsToday.reduce((sum, r) => sum + (r.worker_headcount || 0), 0);
  }, [reportsToday]);

  const latestWeatherCondition: WeatherCondition = useMemo(() => {
    if (reportsToday.length > 0) return reportsToday[0].weather_condition;
    if (dailyReports.length > 0) return dailyReports[0].weather_condition;
    return 'sunny';
  }, [reportsToday, dailyReports]);

  const availableZones = useMemo(() => {
    const set = new Set<string>();
    dailyReports.forEach((r) => {
      if (r.zone_name) set.add(r.zone_name);
    });
    return Array.from(set);
  }, [dailyReports]);

  const filteredSiteReports = useMemo(() => {
    return dailyReports.filter((rep) => {
      if (siteReportDateFilter === 'today') {
        const isToday =
          rep.report_date === todayStr || (rep.created_at && rep.created_at.startsWith(todayStr));
        if (!isToday) return false;
      }
      if (reportZoneFilter !== 'all' && rep.zone_name !== reportZoneFilter) {
        return false;
      }
      if (siteReportSearchQuery.trim()) {
        const q = siteReportSearchQuery.toLowerCase();
        const reporterName = rep.reporter?.full_name?.toLowerCase() || '';
        const zoneName = rep.zone_name?.toLowerCase() || '';
        const workComp = rep.work_completed?.toLowerCase() || '';
        const obst = rep.obstacles?.toLowerCase() || '';
        if (
          !reporterName.includes(q) &&
          !zoneName.includes(q) &&
          !workComp.includes(q) &&
          !obst.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [dailyReports, siteReportDateFilter, reportZoneFilter, siteReportSearchQuery, todayStr]);

  const handleExportSiteReportsCsv = () => {
    const headers = [
      'No',
      'Tanggal Laporan',
      'Waktu Kirim (WIB)',
      'Nama Pengawas / Mandor',
      'Jabatan',
      'Zona Proyek',
      'Kondisi Cuaca',
      'Jumlah Tukang (Headcount)',
      'Pekerjaan Selesai',
      'Rencana Pekerjaan Besok',
      'Kendala Lapangan',
      'Koordinat GPS',
      'URL Foto Bukti',
    ];
    const rows = filteredSiteReports.map((rep, idx) => [
      idx + 1,
      rep.report_date,
      formatTimeID(rep.created_at),
      `"${rep.reporter?.full_name || '-'}"`,
      `"${rep.reporter?.job_position || '-'}"`,
      `"${rep.zone_name}"`,
      `"${rep.weather_condition}"`,
      rep.worker_headcount || 0,
      `"${rep.work_completed.replace(/"/g, '""')}"`,
      `"${(rep.work_planned_tomorrow || '-').replace(/"/g, '""')}"`,
      `"${(rep.obstacles || '-').replace(/"/g, '""')}"`,
      `"${rep.latitude}, ${rep.longitude}"`,
      `"${rep.photo_url}"`,
    ]);
    downloadCsv(`Site_Diary_GuangJi_${todayStr}.csv`, headers, rows);
  };

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
    { id: 'attendance' as AdminTab, label: 'Log Presensi', icon: ClipboardList, count: attendances.length },
    { id: 'site_reports' as AdminTab, label: 'Laporan Proyek (Site Diary)', icon: FileText, count: dailyReports.length, badge: 'Baru' },
    { id: 'reports' as AdminTab, label: 'Rekap Presensi & Jam Kerja', icon: FileBarChart },
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
                            {/* Photo Thumbnails (Masuk & Pulang) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() =>
                                  setSelectedPhoto({
                                    url: item.check_in_photo_url,
                                    title: 'Foto Selfie Masuk (Clock In)',
                                    staffName: item.user?.full_name,
                                    time: `${formatTimeID(item.check_in_time)} WIB`,
                                    subtitle: `Presensi Masuk • Jarak: ${Math.round(
                                      item.check_in_distance_meters
                                    )}m`,
                                  })
                                }
                                className="relative w-10 h-13 rounded-xl overflow-hidden border border-emerald-500/40 shrink-0 group cursor-pointer shadow-xs"
                                title="Foto Masuk (Clock In)"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.check_in_photo_url}
                                  alt="Selfie Masuk"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent flex items-end justify-center p-0.5">
                                  <span className="text-[7px] text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded font-extrabold">
                                    IN
                                  </span>
                                </div>
                              </button>

                              {item.check_out_photo_url ? (
                                <button
                                  onClick={() =>
                                    setSelectedPhoto({
                                      url: item.check_out_photo_url!,
                                      title: 'Foto Selfie Pulang (Clock Out)',
                                      staffName: item.user?.full_name,
                                      time: item.check_out_time
                                        ? `${formatTimeID(item.check_out_time)} WIB`
                                        : undefined,
                                      subtitle: `Presensi Pulang • Jarak: ${
                                        item.check_out_distance_meters
                                          ? Math.round(item.check_out_distance_meters)
                                          : 0
                                      }m`,
                                    })
                                  }
                                  className="relative w-10 h-13 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 group cursor-pointer shadow-xs"
                                  title="Foto Pulang (Clock Out)"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.check_out_photo_url}
                                    alt="Selfie Pulang"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent flex items-end justify-center p-0.5">
                                    <span className="text-[7px] text-amber-300 bg-amber-950/90 px-1 py-0.2 rounded font-extrabold">
                                      OUT
                                    </span>
                                  </div>
                                </button>
                              ) : (
                                <div
                                  className="w-10 h-13 rounded-xl border border-dashed border-slate-700/80 flex flex-col items-center justify-center text-[7px] text-slate-500 shrink-0 bg-slate-950/40"
                                  title="Belum Absen Pulang (Clock Out)"
                                >
                                  <span className="font-bold text-slate-400">OUT</span>
                                  <span className="text-[7px] text-slate-500">Belum</span>
                                </div>
                              )}
                            </div>

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
                  {/* Site Diary Preview Banner */}
                  <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-slate-900/90 p-4 rounded-2xl border border-amber-500/25 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Site Diary & Dokumentasi Proyek</span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-1">
                        {reportsToday.length} laporan progres hari ini • {totalHeadcountToday} tukang di lapangan
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Cuaca: {latestWeatherCondition === 'sunny' ? 'Cerah ☀️' : latestWeatherCondition === 'cloudy' ? 'Berawan ⛅' : latestWeatherCondition === 'rainy' ? 'Hujan 🌧️' : 'Hujan Lebat ⛈️'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('site_reports')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                    >
                      <span>Buka Log</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

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
              {/* Shortcut Banner to Advanced Reports */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <FileBarChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Pusat Laporan & Rekapitulasi Presensi</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">Lengkap</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tersedia rekapitulasi harian terperinci, rekap bulanan tim, serta kartu riwayat absensi per personil staff.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    router.push('/admin?tab=reports');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Buka Menu Rekapitulasi ➔</span>
                </button>
              </div>

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
                <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Data Log Kehadiran Lapangan ({filteredRecords.length})
                    </h3>
                    <p className="text-xs text-slate-400">Sinkronisasi otomatis dengan server Supabase</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                    title="Export data absensi terfilter ke file CSV"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Export CSV ({filteredRecords.length} Log)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Foto (IN / OUT)</th>
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
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    setSelectedPhoto({
                                      url: item.check_in_photo_url,
                                      title: 'Foto Selfie Masuk (Clock In)',
                                      staffName: item.user?.full_name,
                                      time: `${formatTimeID(item.check_in_time)} WIB`,
                                      subtitle: `Tanggal: ${formatDateID(item.check_in_time)} • Deviasi GPS: ${Math.round(
                                        item.check_in_distance_meters
                                      )}m`,
                                    })
                                  }
                                  className="w-9 h-12 rounded-lg overflow-hidden border border-emerald-500/40 relative group shrink-0 cursor-pointer shadow-xs"
                                  title="Klik zoom Foto Masuk (Clock In)"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.check_in_photo_url}
                                    alt="Masuk"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-[7px] text-emerald-300 font-black text-center py-0.5 tracking-tighter">
                                    IN
                                  </span>
                                </button>

                                {item.check_out_photo_url ? (
                                  <button
                                    onClick={() =>
                                      setSelectedPhoto({
                                        url: item.check_out_photo_url!,
                                        title: 'Foto Selfie Pulang (Clock Out)',
                                        staffName: item.user?.full_name,
                                        time: item.check_out_time
                                          ? `${formatTimeID(item.check_out_time)} WIB`
                                          : undefined,
                                        subtitle: `Tanggal: ${
                                          item.check_out_time ? formatDateID(item.check_out_time) : '-'
                                        } • Deviasi GPS: ${
                                          item.check_out_distance_meters
                                            ? Math.round(item.check_out_distance_meters)
                                            : 0
                                        }m`,
                                      })
                                    }
                                    className="w-9 h-12 rounded-lg overflow-hidden border border-amber-500/40 relative group shrink-0 cursor-pointer shadow-xs"
                                    title="Klik zoom Foto Pulang (Clock Out)"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.check_out_photo_url}
                                      alt="Pulang"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                    <span className="absolute bottom-0 inset-x-0 bg-amber-950/90 text-[7px] text-amber-300 font-black text-center py-0.5 tracking-tighter">
                                      OUT
                                    </span>
                                  </button>
                                ) : (
                                  <div
                                    className="w-9 h-12 rounded-lg border border-dashed border-slate-700/70 flex flex-col items-center justify-center text-[8px] text-slate-500 shrink-0 bg-slate-950/40"
                                    title="Belum Melakukan Clock Out"
                                  >
                                    <span className="font-bold text-slate-400">OUT</span>
                                    <span className="text-[7px] text-slate-500">-</span>
                                  </div>
                                )}
                              </div>
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
          {/* TAB: LAPORAN HARIAN PROYEK & SITE DIARY (KEMAJUAN FISIK) */}
          {/* ======================================================== */}
          {activeTab === 'site_reports' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Site Operations & Field Management</span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-500" />
                      Laporan Harian Proyek (Site Diary)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Pusat pemantauan kegiatan konstruksi Sekolah Guang Ming Pusat. Mengkorelasikan presensi pengawas, headcount tukang mandor, kondisi cuaca, dan dokumentasi fisik lapangan dengan watermark GPS.
                    </p>
                  </div>

                  {/* Actions: Print, Export, WhatsApp & Input Laporan */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <button
                      onClick={() => {
                        const targetReport = filteredSiteReports[0] || dailyReports[0];
                        if (targetReport) {
                          const waText = generateWhatsAppReportText(targetReport);
                          navigator.clipboard.writeText(waText);
                          setSaveNotification('Format Laporan WhatsApp berhasil disalin ke clipboard! Siap dikirim ke grup WA.');
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Salin WA Hari Ini</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                      title="Cetak Laporan Site Diary Resmi (PDF)"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Cetak / PDF</span>
                    </button>

                    <button
                      onClick={handleExportSiteReportsCsv}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV Proyek</span>
                    </button>

                    <Link
                      href="/laporan"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>+ Input Laporan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 4 Project Correlation Metric Cards Sesuai Format Real Proyek */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
                {/* 1. Kondisi Cuaca Berkala Lapangan */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Cuaca Berkala Site</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Sun className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">08.00 - 15.30:</span>
                      <span className="text-amber-400">Cerah ☀️</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">15.30 - 17.00:</span>
                      <span className="text-blue-400">Hujan 🌧️</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    Efek hujan tercatat resmi di log harian
                  </p>
                </div>

                {/* 2. Total Karyawan Staff & Pekerja Harian */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-blue-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Total SDM Lapangan</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-blue-400 tracking-tight tabular-nums">
                      {filteredSiteReports[0]?.total_workers || 42}
                    </span>
                    <span className="text-xs font-mono text-slate-400">orang total</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    <strong className="text-blue-400">{filteredSiteReports[0]?.staff_total || 17} Staff</strong> + <strong className="text-amber-400">{filteredSiteReports[0]?.manpower_total || 25} Manpower</strong>
                  </p>
                </div>

                {/* 3. Manpower & Alat Berat */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Manpower & Alat Berat</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <HardHat className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-amber-400 tracking-tight tabular-nums">
                      {filteredSiteReports[0]?.manpower_total || 25}
                    </span>
                    <span className="text-xs font-mono text-slate-400">orang</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    22 Sipil • 1 K3 • 1 Excavator • 1 Crane
                  </p>
                </div>

                {/* 4. Staff Kontraktor PT. BBS */}
                <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-xs relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Staff Kontraktor BBS</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-emerald-400 tracking-tight tabular-nums">
                      {filteredSiteReports[0]?.staff_total || 17}
                    </span>
                    <span className="text-xs font-mono text-slate-400">staff di site</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    PM, SM, Eng, HSE, QS, Spv, Survey, Logistik
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={siteReportSearchQuery}
                    onChange={(e) => setSiteReportSearchQuery(e.target.value)}
                    placeholder="Cari pengawas, zona, pekerjaan..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  {siteReportSearchQuery && (
                    <button
                      onClick={() => setSiteReportSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {/* Filter Tanggal */}
                  <select
                    value={siteReportDateFilter}
                    onChange={(e) => setSiteReportDateFilter(e.target.value as 'all' | 'today')}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="all">Semua Tanggal</option>
                    <option value="today">Hari Ini Saja</option>
                  </select>

                  {/* Filter Zona */}
                  <select
                    value={reportZoneFilter}
                    onChange={(e) => setReportZoneFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 max-w-[200px] truncate"
                  >
                    <option value="all">Semua Zona Proyek</option>
                    {availableZones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs text-slate-400 font-mono">
                    {filteredSiteReports.length} laporan
                  </span>
                </div>
              </div>

              {/* SECTION A: GALERI DOKUMENTASI FISIK PROYEK (VISUAL GRID) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-white">Galeri Foto Lapangan Ber-Watermark GPS</h3>
                  </div>
                  <span className="text-xs text-slate-400">Klik foto untuk inspeksi detail resolusi penuh</span>
                </div>

                {filteredSiteReports.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-300">Tidak ada dokumentasi yang sesuai filter</p>
                    <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau ubah filter tanggal.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSiteReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm hover:border-amber-500/40 transition-all flex flex-col group"
                      >
                        {/* Foto Thumbnail dengan Watermark GPS */}
                        <div
                          onClick={() => {
                            setSelectedReportDetail(rep);
                            setSelectedReportPhotoIndex(0);
                          }}
                          className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rep.photo_url}
                            alt="Foto Lapangan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                              <MapPin className="w-3 h-3" />
                              GPS Verified
                            </span>
                            <div className="flex items-center gap-1.5">
                              {Array.isArray(rep.photos) && rep.photos.length > 1 && (
                                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  🖼️ {rep.photos.length} Foto
                                </span>
                              )}
                              <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <ZoomIn className="w-3 h-3" />
                                Inspeksi
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-[150px]">
                                {rep.zone_name}
                              </span>
                              <div className="text-right">
                                <span className="text-[10px] text-amber-400 font-mono font-bold block">
                                  📅 {formatDateID(rep.report_date || rep.created_at)}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono block">
                                  Input: {formatTimeID(rep.created_at)} WIB {rep.updated_at && rep.updated_at !== rep.created_at ? '• Diedit' : ''}
                                </span>
                              </div>
                            </div>

                            <h4 className="text-xs font-bold text-white">
                              {rep.reporter?.full_name || 'Pengawas Lapangan'}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {rep.reporter?.job_position || 'Staff Proyek'}
                            </p>

                            <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                              {rep.work_completed}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] gap-2">
                            <span className="text-slate-400 flex items-center gap-1 text-[10px] font-mono">
                              <Users className="w-3 h-3 text-blue-400" />
                              {rep.total_workers ? `${rep.total_workers} SDM` : `${rep.worker_headcount} Tukang`}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditReportModal(rep);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Edit Laporan & Backdate (Admin)"
                              >
                                <Pencil className="w-2.5 h-2.5 text-amber-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const waText = generateWhatsAppReportText(rep);
                                  navigator.clipboard.writeText(waText);
                                  setSaveNotification('Format Laporan WhatsApp berhasil disalin!');
                                }}
                                className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Salin Pesan Format WhatsApp"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Salin WA</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION B: TABEL LENGKAP SITE DIARY */}
              <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm space-y-0">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-white">Log Site Diary Terstruktur</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Total {filteredSiteReports.length} Laporan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Pengawas / Mandor</th>
                        <th className="py-3 px-4">Zona Proyek</th>
                        <th className="py-3 px-4">Cuaca</th>
                        <th className="py-3 px-4 text-center">Tukang</th>
                        <th className="py-3 px-4 min-w-[200px]">Uraian Pekerjaan Selesai</th>
                        <th className="py-3 px-4 min-w-[160px]">Kendala Lapangan</th>
                        <th className="py-3 px-4 text-right">Foto & WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSiteReports.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                            Tidak ada data site diary.
                          </td>
                        </tr>
                      ) : (
                        filteredSiteReports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                              <div className="font-bold text-white flex items-center gap-1">
                                <span>📅</span>
                                <span>{formatDateID(rep.report_date || rep.created_at)}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Input: {formatTimeID(rep.created_at)} WIB
                              </div>
                              {rep.updated_at && rep.updated_at !== rep.created_at && (
                                <div className="text-[9px] text-amber-400 font-bold">
                                  Update: {formatTimeID(rep.updated_at)} WIB
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-bold text-white">{rep.reporter?.full_name || 'Staff Lapangan'}</div>
                              <div className="text-[10px] text-slate-400">{rep.reporter?.job_position || '-'}</div>
                            </td>
                            <td className="py-3 px-4 text-amber-300/90 font-medium whitespace-nowrap">
                              {rep.zone_name}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                              {rep.weather_condition === 'sunny'
                                ? '☀️ Cerah'
                                : rep.weather_condition === 'cloudy'
                                ? '⛅ Mendung'
                                : rep.weather_condition === 'rainy'
                                ? '🌧️ Hujan'
                                : '⛈️ Hujan Lebat'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-blue-400">
                              {rep.total_workers || rep.worker_headcount || 0}
                            </td>
                            <td className="py-3 px-4 text-slate-200 leading-relaxed">
                              <pre className="font-sans whitespace-pre-wrap text-xs">
                                {rep.work_completed}
                              </pre>
                              {rep.work_planned_tomorrow && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Rencana besok: {rep.work_planned_tomorrow}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {rep.obstacles ? (
                                <span className="text-rose-400 font-medium text-[11px] flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{rep.obstacles}</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditReportModal(rep)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-[10px] border border-amber-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Edit Laporan & Tanggal (Admin)"
                                >
                                  <Pencil className="w-3 h-3 text-amber-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const waText = generateWhatsAppReportText(rep);
                                    navigator.clipboard.writeText(waText);
                                    setSaveNotification('Format Laporan WhatsApp berhasil disalin!');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Salin Pesan Format WhatsApp"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Salin WA</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedReportDetail(rep);
                                    setSelectedReportPhotoIndex(0);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] border border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Detail</span>
                                </button>
                              </div>
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
          {/* TAB: LAPORAN & REKAPITULASI PROYEK (HARIAN / BULANAN / PER STAFF) */}
          {/* ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Header Card / Mode Switcher */}
              <div className="p-5 lg:p-6 rounded-2xl bg-slate-900/90 border border-amber-500/20 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Modul Laporan & Rekapitulasi Presensi</span>
                    </div>
                    <h2 className="text-lg lg:text-xl font-black text-white tracking-tight">
                      Laporan Kehadiran Yayasan Guang Ji
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Pusat analisis kehadiran tim proyek Sekolah Guang Ming. Pilih periode harian, bulanan, atau telusuri profil riwayat absensi personil staff.
                    </p>
                  </div>

                  {/* Actions: Print & Export */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <button
                      onClick={handlePrint}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                      title="Cetak Dokumen atau Simpan sebagai PDF"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Cetak / PDF</span>
                    </button>

                    {reportSubTab === 'daily' && (
                      <button
                        onClick={handleExportDailyReport}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV Harian</span>
                      </button>
                    )}

                    {reportSubTab === 'monthly' && (
                      <button
                        onClick={handleExportMonthlyReport}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV Bulanan</span>
                      </button>
                    )}

                    {reportSubTab === 'staff' && (
                      <button
                        onClick={handleExportStaffReport}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV Staff</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Tab Selector Pills */}
                <div className="mt-6 flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 w-fit overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setReportSubTab('daily')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'daily'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Rekap Harian</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('monthly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'monthly'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4" />
                    <span>Rekap Bulanan</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('staff')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'staff'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Rekap Per Staff</span>
                  </button>
                </div>
              </div>

              {/* Printable Letterhead (Only visible during window.print()) */}
              <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900 text-slate-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image src="/logo.png" alt="Logo" width={56} height={56} className="w-14 h-14 object-contain" />
                    <div>
                      <h1 className="text-base font-black uppercase tracking-wider">Yayasan Guang Ji Indonesia</h1>
                      <h2 className="text-sm font-bold">Proyek Pembangunan Sekolah Guang Ming Pusat</h2>
                      <p className="text-xs text-slate-600">{site.address || 'Cengkareng, Jakarta Barat'}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold">Laporan Resmi Sistem Presensi</p>
                    <p className="text-slate-600">Dicetak: {currentPrintDate || '-'}</p>
                    <p className="text-slate-600">Oleh: {user.full_name} ({user.role})</p>
                  </div>
                </div>
              </div>

              {/* ====================================================== */}
              {/* SUB-VIEW 1: REKAP HARIAN */}
              {/* ====================================================== */}
              {reportSubTab === 'daily' && (
                <div className="space-y-6">
                  {/* Date Controls & Filter */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400">Pilih Tanggal:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const d = new Date(reportDate);
                            d.setDate(d.getDate() - 1);
                            setReportDate(d.toISOString().split('T')[0]);
                          }}
                          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                          title="Hari Sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />

                        <button
                          onClick={() => {
                            const d = new Date(reportDate);
                            d.setDate(d.getDate() + 1);
                            setReportDate(d.toISOString().split('T')[0]);
                          }}
                          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                          title="Hari Berikutnya"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => setReportDate(new Date().toISOString().split('T')[0])}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-semibold cursor-pointer"
                      >
                        Hari Ini
                      </button>

                      <button
                        onClick={() => {
                          const yest = new Date();
                          yest.setDate(yest.getDate() - 1);
                          setReportDate(yest.toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold cursor-pointer"
                      >
                        Kemarin
                      </button>
                    </div>

                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateID(reportDate + 'T00:00:00')}</span>
                    </div>
                  </div>

                  {/* Daily Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/15">
                      <div className="text-slate-400 text-xs font-medium">Total Personil</div>
                      <div className="text-2xl font-black text-white mt-1">{dailyStats.total}</div>
                      <div className="text-[11px] text-slate-500 mt-1">Personil terdaftar</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20">
                      <div className="text-emerald-400 text-xs font-medium">Hadir Tepat Waktu</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{dailyStats.onTimeCount}</div>
                      <div className="text-[11px] text-emerald-500/80 mt-1">Sebelum {site.work_start_time} WIB</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/20">
                      <div className="text-amber-400 text-xs font-medium">Terlambat</div>
                      <div className="text-2xl font-black text-amber-400 mt-1">{dailyStats.lateCount}</div>
                      <div className="text-[11px] text-amber-500/80 mt-1">Melebihi toleransi ({site.late_tolerance_minutes}m)</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/20">
                      <div className="text-rose-400 text-xs font-medium">Belum Presensi / Absen</div>
                      <div className="text-2xl font-black text-rose-400 mt-1">{dailyStats.absentCount}</div>
                      <div className="text-[11px] text-rose-500/80 mt-1">Tingkat kehadiran: {dailyStats.rate}%</div>
                    </div>
                  </div>

                  {/* Daily Attendance Table */}
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">
                          Rincian Kehadiran Personil ({dailyStaffRows.length} Staff)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Status presensi tanggal {formatDateID(reportDate + 'T00:00:00')}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {dailyStats.presentCount} dari {dailyStats.total} Hadir
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Personil</th>
                            <th className="px-4 py-3">Jabatan</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Jam Masuk</th>
                            <th className="px-4 py-3">Jam Pulang</th>
                            <th className="px-4 py-3">Durasi</th>
                            <th className="px-4 py-3">Foto</th>
                            <th className="px-4 py-3">Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {dailyStaffRows.map(({ profile: staff, attendance: att, status }) => (
                            <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                                    {staff.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white leading-tight">{staff.full_name}</div>
                                    <div className="text-[10px] text-slate-500">{staff.email}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-medium text-slate-300">
                                {staff.job_position || '-'}
                              </td>

                              <td className="px-4 py-3.5">
                                {status === 'present' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Tepat Waktu</span>
                                  </span>
                                ) : status === 'late' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Terlambat</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                                    <XCircle className="w-3 h-3" />
                                    <span>Belum Presensi</span>
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3.5">
                                {att?.check_in_time ? (
                                  <div>
                                    <div className="font-mono font-bold text-white">
                                      {formatTimeID(att.check_in_time)} WIB
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {Math.round(att.check_in_distance_meters)}m dari site
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 font-mono">--:--</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5">
                                {att?.check_out_time ? (
                                  <div className="font-mono font-bold text-emerald-400">
                                    {formatTimeID(att.check_out_time)} WIB
                                  </div>
                                ) : att ? (
                                  <span className="text-[11px] text-amber-400 font-medium">Sedang Bertugas</span>
                                ) : (
                                  <span className="text-slate-600 font-mono">--:--</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 font-mono text-slate-300">
                                {att ? formatDuration(att.check_in_time, att.check_out_time) : '-'}
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  {att?.check_in_photo_url ? (
                                    <button
                                      onClick={() =>
                                        setSelectedPhoto({
                                          url: att.check_in_photo_url,
                                          title: 'Foto Selfie Masuk (Clock In)',
                                          staffName: staff.full_name,
                                          time: `${formatTimeID(att.check_in_time)} WIB`,
                                          subtitle: `Presensi Masuk • Jarak: ${Math.round(
                                            att.check_in_distance_meters
                                          )}m`,
                                        })
                                      }
                                      className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Lihat Selfie Masuk (Clock In)"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>IN</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}

                                  {att?.check_out_photo_url ? (
                                    <button
                                      onClick={() =>
                                        setSelectedPhoto({
                                          url: att.check_out_photo_url!,
                                          title: 'Foto Selfie Pulang (Clock Out)',
                                          staffName: staff.full_name,
                                          time: att.check_out_time
                                            ? `${formatTimeID(att.check_out_time)} WIB`
                                            : undefined,
                                          subtitle: `Presensi Pulang • Jarak: ${
                                            att.check_out_distance_meters
                                              ? Math.round(att.check_out_distance_meters)
                                              : 0
                                          }m`,
                                        })
                                      }
                                      className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Lihat Selfie Pulang (Clock Out)"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>OUT</span>
                                    </button>
                                  ) : null}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                                {att?.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ====================================================== */}
              {/* SUB-VIEW 2: REKAP BULANAN */}
              {/* ====================================================== */}
              {reportSubTab === 'monthly' && (
                <div className="space-y-6">
                  {/* Month & Year Selectors */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400">Pilih Periode Bulan:</span>
                      
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={idx}>{name}</option>
                        ))}
                      </select>

                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      >
                        {[2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <CalendarRange className="w-4 h-4" />
                      <span>Periode: {MONTH_NAMES[reportMonth]} {reportYear}</span>
                    </div>
                  </div>

                  {/* Monthly Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/15">
                      <div className="text-slate-400 text-xs font-medium">Total Log Presensi</div>
                      <div className="text-2xl font-black text-white mt-1">{monthlyOverallStats.totalLogs}</div>
                      <div className="text-[11px] text-slate-500 mt-1">Pencatatan bulan ini</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20">
                      <div className="text-emerald-400 text-xs font-medium">Ketepatan Waktu</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{monthlyOverallStats.onTimeRate}%</div>
                      <div className="text-[11px] text-emerald-500/80 mt-1">Presensi on-time</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/20">
                      <div className="text-blue-400 text-xs font-medium">Akumulasi Jam Kerja</div>
                      <div className="text-2xl font-black text-blue-400 mt-1">{monthlyOverallStats.totalHours} Jam</div>
                      <div className="text-[11px] text-blue-500/80 mt-1">Total kontribusi tim</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/20">
                      <div className="text-purple-400 text-xs font-medium">Personil Aktif</div>
                      <div className="text-2xl font-black text-purple-400 mt-1">{monthlyOverallStats.activeStaffCount}</div>
                      <div className="text-[11px] text-purple-500/80 mt-1">Terdata di database</div>
                    </div>
                  </div>

                  {/* Monthly Summary Table */}
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">
                          Rekapitulasi Kehadiran Karyawan - {MONTH_NAMES[reportMonth]} {reportYear}
                        </h3>
                        <p className="text-xs text-slate-400">Ringkasan performa kehadiran dan total jam kerja setiap staff</p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {monthlyStaffSummary.length} Personil Terdata
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">No</th>
                            <th className="px-4 py-3">Nama Staff</th>
                            <th className="px-4 py-3">Jabatan</th>
                            <th className="px-4 py-3 text-center">Hari Hadir</th>
                            <th className="px-4 py-3 text-center">Tepat Waktu</th>
                            <th className="px-4 py-3 text-center">Terlambat</th>
                            <th className="px-4 py-3">Total Jam Kerja</th>
                            <th className="px-4 py-3">Rata-rata Masuk</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {monthlyStaffSummary.map((item, idx) => (
                            <tr key={item.staff.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3.5 text-slate-500 font-mono">{idx + 1}</td>
                              <td className="px-4 py-3.5 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                                    {item.staff.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <span>{item.staff.full_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-slate-300">{item.staff.job_position || '-'}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-white">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 font-mono">
                                  {item.totalDays} hari
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center font-bold text-emerald-400 font-mono">
                                {item.onTimeDays}
                              </td>
                              <td className="px-4 py-3.5 text-center font-bold text-amber-400 font-mono">
                                {item.lateDays}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-slate-200">{item.durationStr}</td>
                              <td className="px-4 py-3.5 font-mono text-slate-400">{item.avgCheckInStr}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setReportStaffId(item.staff.id);
                                    setReportSubTab('staff');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-[11px] font-semibold border border-slate-700 cursor-pointer"
                                >
                                  Detail Staff ➔
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ====================================================== */}
              {/* SUB-VIEW 3: REKAP PER STAFF */}
              {/* ====================================================== */}
              {reportSubTab === 'staff' && (
                <div className="space-y-6">
                  {/* Staff Selector */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                      <label className="text-xs font-bold text-slate-400 shrink-0">Pilih Personil:</label>
                      <select
                        value={reportStaffId}
                        onChange={(e) => setReportStaffId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.job_position || 'Staff'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-slate-400">
                      Menampilkan seluruh riwayat presensi yang terekam
                    </div>
                  </div>

                  {/* Staff Info Card & Metrics */}
                  {selectedStaffProfile && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/20 shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 p-0.5 shadow-md">
                            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-xl font-black text-amber-400">
                              {selectedStaffProfile.full_name?.charAt(0) || 'S'}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">
                                {selectedStaffProfile.full_name}
                              </h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase font-bold border border-amber-500/30">
                                {selectedStaffProfile.role}
                              </span>
                            </div>
                            <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                              {selectedStaffProfile.job_position || 'Staff Lapangan Sekolah Guang Ming'}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span>📧 {selectedStaffProfile.email || '-'}</span>
                              <span>📞 {selectedStaffProfile.phone_number || '-'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">Status Akun</div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif Bekerja
                          </span>
                        </div>
                      </div>

                      {/* 4 Staff Personal KPI Metric Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                          <div className="text-slate-400 text-[11px]">Total Presensi</div>
                          <div className="text-xl font-black text-white mt-0.5">{staffStats.total} Log</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20">
                          <div className="text-emerald-400 text-[11px]">Tepat Waktu</div>
                          <div className="text-xl font-black text-emerald-400 mt-0.5">{staffStats.onTime} Kali</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20">
                          <div className="text-amber-400 text-[11px]">Terlambat</div>
                          <div className="text-xl font-black text-amber-400 mt-0.5">{staffStats.late} Kali</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-blue-500/20">
                          <div className="text-blue-400 text-[11px]">Total Jam Kerja</div>
                          <div className="text-xl font-black text-blue-400 mt-0.5">{staffStats.totalDurationStr}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Staff History Table */}
                  <div className="bg-slate-900/90 rounded-2xl border border-amber-500/15 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          Riwayat Catatan Absensi Lengkap ({selectedStaffRecords.length} Record)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Daftar kronologis jam masuk, jam pulang, dan jarak verifikasi
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Jam Masuk</th>
                            <th className="px-4 py-3">Jarak Masuk</th>
                            <th className="px-4 py-3">Jam Pulang</th>
                            <th className="px-4 py-3">Durasi</th>
                            <th className="px-4 py-3">Foto</th>
                            <th className="px-4 py-3">Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedStaffRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-slate-500 text-xs">
                                Belum ada data absensi tercatat untuk personil ini.
                              </td>
                            </tr>
                          ) : (
                            selectedStaffRecords.map((att) => (
                              <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-white">
                                  {formatDateID(att.check_in_time)}
                                </td>

                                <td className="px-4 py-3.5">
                                  {att.status === 'present' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Tepat Waktu</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>Terlambat</span>
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 font-mono font-bold text-white">
                                  {formatTimeID(att.check_in_time)} WIB
                                </td>

                                <td className="px-4 py-3.5 font-mono text-slate-400">
                                  {Math.round(att.check_in_distance_meters)} m
                                </td>

                                <td className="px-4 py-3.5 font-mono text-slate-300">
                                  {att.check_out_time ? `${formatTimeID(att.check_out_time)} WIB` : '-'}
                                </td>

                                <td className="px-4 py-3.5 font-mono text-slate-300">
                                  {formatDuration(att.check_in_time, att.check_out_time)}
                                </td>

                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    {att.check_in_photo_url ? (
                                      <button
                                        onClick={() =>
                                          setSelectedPhoto({
                                            url: att.check_in_photo_url,
                                            title: 'Foto Selfie Masuk (Clock In)',
                                            staffName: selectedStaffProfile?.full_name,
                                            time: `${formatTimeID(att.check_in_time)} WIB`,
                                            subtitle: `Tanggal: ${formatDateID(
                                              att.check_in_time
                                            )} • Jarak: ${Math.round(att.check_in_distance_meters)}m`,
                                          })
                                        }
                                        className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Lihat Selfie Masuk (Clock In)"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>IN</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}

                                    {att.check_out_photo_url ? (
                                      <button
                                        onClick={() =>
                                          setSelectedPhoto({
                                            url: att.check_out_photo_url!,
                                            title: 'Foto Selfie Pulang (Clock Out)',
                                            staffName: selectedStaffProfile?.full_name,
                                            time: att.check_out_time
                                              ? `${formatTimeID(att.check_out_time)} WIB`
                                              : undefined,
                                            subtitle: `Tanggal: ${
                                              att.check_out_time ? formatDateID(att.check_out_time) : '-'
                                            } • Jarak: ${
                                              att.check_out_distance_meters
                                                ? Math.round(att.check_out_distance_meters)
                                                : 0
                                            }m`,
                                          })
                                        }
                                        className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Lihat Selfie Pulang (Clock Out)"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>OUT</span>
                                      </button>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                                  {att.notes || '-'}
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
                                  setStaffModalError(null);
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

            {staffModalError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffModalError}</span>
              </div>
            )}

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
      {/* MODAL: DETAIL & ZOOM FOTO SITE DIARY */}
      {/* ============================================================ */}
      {selectedReportDetail && (
        (() => {
          const adminReportPhotos =
            Array.isArray(selectedReportDetail.photos) && selectedReportDetail.photos.length > 0
              ? selectedReportDetail.photos
              : Array.isArray(selectedReportDetail.documentation_photos) &&
                selectedReportDetail.documentation_photos.length > 0
              ? selectedReportDetail.documentation_photos
              : selectedReportDetail.photo_url
              ? [{ id: 'p1', url: selectedReportDetail.photo_url, caption: 'Dokumentasi Lapangan' }]
              : [];

          const currentAdminPhoto = adminReportPhotos[selectedReportPhotoIndex] || adminReportPhotos[0];

          return (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-3xl flex items-center justify-between text-white z-10 bg-slate-900/90 px-4 py-3 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {selectedReportDetail.zone_name}
                    </span>
                    <span className="text-xs font-bold text-white flex items-center gap-1 font-mono">
                      📅 {formatDateID(selectedReportDetail.report_date || selectedReportDetail.created_at)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (Input: {formatDateTimeID(selectedReportDetail.created_at)} WIB)
                    </span>
                    {selectedReportDetail.updated_at && selectedReportDetail.updated_at !== selectedReportDetail.created_at && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                        Diupdate: {formatDateTimeID(selectedReportDetail.updated_at)} WIB
                      </span>
                    )}
                    {adminReportPhotos.length > 1 && (
                      <span className="text-[10px] font-bold bg-blue-600/80 text-white px-2 py-0.5 rounded-md">
                        Foto {selectedReportPhotoIndex + 1} dari {adminReportPhotos.length}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mt-1 text-white">
                    {selectedReportDetail.reporter?.full_name} ({selectedReportDetail.reporter?.job_position})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditReportModal(selectedReportDetail)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    title="Edit Laporan & Backdate"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-950" />
                    <span>Edit Laporan</span>
                  </button>
                  <button
                    onClick={() => setSelectedReportDetail(null)}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative flex-1 max-w-3xl w-full flex items-center justify-center my-3 overflow-hidden rounded-2xl bg-black border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAdminPhoto?.url || selectedReportDetail.photo_url}
                  alt={currentAdminPhoto?.caption || 'Inspeksi Foto Dokumentasi'}
                  className="max-h-full max-w-full object-contain"
                />

                {/* Tombol Carousel Navigasi Foto */}
                {adminReportPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedReportPhotoIndex((prev) =>
                          prev > 0 ? prev - 1 : adminReportPhotos.length - 1
                        )
                      }
                      className="absolute left-3 p-2.5 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer transition-colors shadow-lg"
                      title="Foto Sebelumnya"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedReportPhotoIndex((prev) =>
                          prev < adminReportPhotos.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-3 p-2.5 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer transition-colors shadow-lg"
                      title="Foto Berikutnya"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="w-full max-w-3xl bg-slate-900/90 text-white p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5">
                {/* Keterangan Foto Aktif */}
                {currentAdminPhoto?.caption && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs leading-snug">
                    <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider mb-0.5">
                      Keterangan Foto #{selectedReportPhotoIndex + 1}:
                    </span>
                    {currentAdminPhoto.caption}
                  </div>
                )}

                {/* Thumbnail carousel jika foto > 1 */}
                {adminReportPhotos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {adminReportPhotos.map((p, idx) => (
                      <button
                        key={p.id || idx}
                        onClick={() => setSelectedReportPhotoIndex(idx)}
                        className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          selectedReportPhotoIndex === idx
                            ? 'border-amber-500 scale-105'
                            : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    {selectedReportDetail.contractor_name || 'PT. BERCA BUANA SAKTI'}
                  </span>
                  <span className="font-mono text-blue-400 font-bold">
                    Total SDM: {selectedReportDetail.total_workers || 42} Orang ({selectedReportDetail.staff_total || 17} Staff + {selectedReportDetail.manpower_total || 25} Manpower)
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">
                    {selectedReportDetail.work_category || 'Rincian Pekerjaan Selesai'}:
                  </span>
                  <pre className="font-sans whitespace-pre-wrap text-white leading-relaxed text-[11px] max-h-24 overflow-y-auto">
                    {selectedReportDetail.work_completed}
                  </pre>
                </div>
                {selectedReportDetail.work_planned_tomorrow && (
                  <div>
                    <span className="font-semibold text-slate-400 text-[10px]">Rencana Besok:</span>
                    <p className="text-slate-300 mt-0.5">{selectedReportDetail.work_planned_tomorrow}</p>
                  </div>
                )}
                {selectedReportDetail.obstacles && (
                  <div className="pt-1.5 border-t border-slate-800 text-rose-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Kendala Lapangan: {selectedReportDetail.obstacles}</span>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const waText = generateWhatsAppReportText(selectedReportDetail);
                      navigator.clipboard.writeText(waText);
                      setSaveNotification('Format Laporan WhatsApp berhasil disalin ke clipboard!');
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Format WhatsApp (BBS & Guang Ming)</span>
                  </button>
                  <button
                    onClick={() => {
                      const waText = generateWhatsAppReportText(selectedReportDetail);
                      window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer border border-slate-700"
                    title="Kirim ke WhatsApp Langsung"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT LAPORAN PROYEK & BACKDATE (ADMIN ONLY) */}
      {/* ============================================================ */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Akses Administrator • Edit & Backdate Laporan</span>
                </div>
                <h3 className="font-bold text-sm text-white mt-0.5">
                  Edit Laporan #{editingReport.id.slice(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setEditingReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportEditError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reportEditError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateReport} className="space-y-3.5 text-xs">
              {/* Backdate Tanggal Laporan */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <label className="block text-xs font-bold text-amber-400">
                  📅 Tanggal Pekerjaan / Laporan (Bisa Backdate)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={editReportDate}
                    onChange={(e) => {
                      setEditReportDate(e.target.value);
                      setEditWorkDayName(getDayNameID(e.target.value));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    required
                    value={editWorkDayName}
                    onChange={(e) => setEditWorkDayName(e.target.value)}
                    placeholder="Nama Hari (contoh: Rabu)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Diisi untuk tanggal berapa pekerjaan ini berlangsung. Waktu riwayat update sistem akan otomatis tercatat.
                </p>
              </div>

              {/* Zona & Kategori */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Zona / Lokasi</label>
                  <input
                    type="text"
                    required
                    value={editZoneName}
                    onChange={(e) => setEditZoneName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Kategori Pekerjaan</label>
                  <input
                    type="text"
                    required
                    value={editWorkCategory}
                    onChange={(e) => setEditWorkCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Uraian Pekerjaan Selesai */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Uraian Pekerjaan Selesai <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={editWorkCompleted}
                  onChange={(e) => setEditWorkCompleted(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                />
              </div>

              {/* Rencana Besok & Kendala */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Rencana Besok</label>
                  <textarea
                    rows={2}
                    value={editWorkPlannedTomorrow}
                    onChange={(e) => setEditWorkPlannedTomorrow(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Kendala Lapangan</label>
                  <textarea
                    rows={2}
                    value={editObstacles}
                    onChange={(e) => setEditObstacles(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                  />
                </div>
              </div>

              {/* Cuaca & Jumlah SDM */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Cuaca</label>
                  <select
                    value={editWeatherCondition}
                    onChange={(e) => setEditWeatherCondition(e.target.value as WeatherCondition)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="sunny">☀️ Cerah</option>
                    <option value="cloudy">⛅ Mendung</option>
                    <option value="rainy">🌧️ Hujan</option>
                    <option value="heavy_rain">⛈️ Hujan Lebat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Staff BBS</label>
                  <input
                    type="number"
                    min="0"
                    value={editStaffTotal}
                    onChange={(e) => setEditStaffTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Manpower</label>
                  <input
                    type="number"
                    min="0"
                    value={editManpowerTotal}
                    onChange={(e) => setEditManpowerTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const target = editingReport;
                    setEditingReport(null);
                    setDeletingReport(target);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Laporan</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingReport(null)}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReportEdit}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReportEdit ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>Simpan Perubahan Laporan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI HAPUS LAPORAN (ADMIN ONLY) */}
      {/* ============================================================ */}
      {deletingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-white">Hapus Laporan Proyek?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Anda yakin ingin menghapus laporan <strong className="text-white">{deletingReport.zone_name}</strong> tanggal <strong className="text-white">{formatDateID(deletingReport.report_date || deletingReport.created_at)}</strong>? Aksi ini permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingReport(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteReport}
                disabled={isSubmittingReportEdit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReportEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Hapus Laporan</span>
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
              src={typeof selectedPhoto === 'string' ? selectedPhoto : selectedPhoto.url}
              alt="Foto Absensi"
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="p-4 bg-slate-900 text-white text-xs space-y-1">
              <p className="font-bold text-amber-400">
                {typeof selectedPhoto === 'object' && selectedPhoto.title
                  ? selectedPhoto.title
                  : 'Bukti Foto Absensi Lapangan • Yayasan Guang Ji'}
              </p>
              {typeof selectedPhoto === 'object' && selectedPhoto.staffName && (
                <p className="text-white font-medium text-xs">
                  {selectedPhoto.staffName} {selectedPhoto.time ? `• ${selectedPhoto.time}` : ''}
                </p>
              )}
              <p className="text-slate-400 text-[11px]">
                {typeof selectedPhoto === 'object' && selectedPhoto.subtitle
                  ? selectedPhoto.subtitle
                  : 'Foto terverifikasi dengan cap satelit GPS dan stempel koordinat presisi.'}
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
