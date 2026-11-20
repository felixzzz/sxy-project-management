'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  FileText,
  Camera,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  X,
  History,
  Send,
  Plus,
  Minus,
  Copy,
  Check,
  Share2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  HardHat,
  Truck,
  Building,
  Trash2,
  ImagePlus,
  Edit3,
  Lock,
  Save,
} from 'lucide-react';

import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { SiteCameraCapture } from '@/components/report/SiteCameraCapture';
import { TimeDropdown15, minutesToTime } from '@/components/report/TimeDropdown15';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  WeatherCondition,
  DailySiteReport,
  ProjectZone,
  ProjectSite,
  GeolocationState,
  WorkerCategoryItem,
  ReportPhotoItem,
  WeatherTimelineItem,
} from '@/types/attendance';
import { DEFAULT_SITE, DEFAULT_PROJECT_ZONES, MOCK_DAILY_REPORTS } from '@/lib/mock-data';
import { formatDateID, formatDateTimeID, getDayNameID, generateWhatsAppReportText } from '@/lib/utils';
import { isWithinGeofence } from '@/lib/geo/haversine';

interface WeatherTimelineRow {
  id: string;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "15:30"
  condition: string; // e.g. "Cerah"
}

// Convert "HH:mm" to minutes from midnight
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Calculate duration string (e.g. "7 jam 30 mnt")
const formatDuration = (startTime: string, endTime: string): string => {
  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);
  if (endM <= startM) return '';
  const diff = endM - startM;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours} jam ${mins} mnt`;
  if (hours > 0) return `${hours} jam`;
  return `${mins} mnt`;
};

interface WeatherValidationResult {
  isValid: boolean;
  rowErrors: Record<string, string>;
  generalError?: string;
}

// Strictly Validate No-Overlap and Start < End
const validateWeatherTimeline = (rows: WeatherTimelineRow[]): WeatherValidationResult => {
  const rowErrors: Record<string, string> = {};
  let generalError: string | undefined;

  // 1. Validasi jam selesai harus lebih besar dari jam mulai
  rows.forEach((row, idx) => {
    const startM = timeToMinutes(row.startTime);
    const endM = timeToMinutes(row.endTime);

    if (endM <= startM) {
      rowErrors[row.id] = `Jam selesai (${row.endTime}) harus lebih akhir dari jam mulai (${row.startTime}).`;
      if (!generalError) generalError = rowErrors[row.id];
    }
  });

  // 2. Validasi tumpang tindih (overlap)
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const rowA = rows[i];
      const rowB = rows[j];
      const startA = timeToMinutes(rowA.startTime);
      const endA = timeToMinutes(rowA.endTime);
      const startB = timeToMinutes(rowB.startTime);
      const endB = timeToMinutes(rowB.endTime);

      // Overlap terjadi jika rentang saling memotong: (startA < endB) && (endA > startB)
      if (startA < endB && endA > startB) {
        const msgA = `Tumpang tindih dengan Periode #${j + 1} (${rowB.startTime} - ${rowB.endTime}).`;
        const msgB = `Tumpang tindih dengan Periode #${i + 1} (${rowA.startTime} - ${rowA.endTime}).`;
        rowErrors[rowA.id] = rowErrors[rowA.id] ? `${rowErrors[rowA.id]} & ${msgA}` : msgA;
        rowErrors[rowB.id] = rowErrors[rowB.id] ? `${rowErrors[rowB.id]} & ${msgB}` : msgB;
        if (!generalError) {
          generalError = `Periode cuaca #${i + 1} dan #${j + 1} tumpang tindih (overlapping). Waktu cuaca tidak boleh overlapping.`;
        }
      }
    }
  }

  return {
    isValid: Object.keys(rowErrors).length === 0,
    rowErrors,
    generalError,
  };
};

export default function LaporanPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === 'felix@salim.bz';

  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');
  const [site, setSite] = useState<ProjectSite>(DEFAULT_SITE);
  const [reports, setReports] = useState<DailySiteReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);

  // Form Header State
  const [contractorName, setContractorName] = useState<string>('PT. BERCA BUANA SAKTI');
  const [workCategory, setWorkCategory] = useState<string>('PEKERJAAN PERSIAPAN');
  const [reportDate, setReportDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [workDayName, setWorkDayName] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return getDayNameID(`${year}-${month}-${day}`);
  });
  const [workHours, setWorkHours] = useState<string>('Jam 08.00 sd 17.00 WIB');

  const handleDateChange = (newDate: string) => {
    setReportDate(newDate);
    setWorkDayName(getDayNameID(newDate));
  };

  // 1. Zonasi dibuat dalam bentuk Free Text
  const [selectedZone, setSelectedZone] = useState<string>(
    'Area Pondasi Tower Crane & Direksi Keet'
  );

  const QUICK_ZONE_SUGGESTIONS = [
    'Area Pondasi Tower Crane',
    'Direksi Keet Kontraktor',
    'Barak Pekerja BBS',
    'Gedung Sekolah GJ Lt. 1',
    'Area Lab Test Mixindo',
    'Akses Pintu Masuk Proyek',
  ];

  // 2 & 3. Textarea State (Pekerjaan, Rencana Besok, Kendala)
  const [workCompleted, setWorkCompleted] = useState<string>(
    '1. Pekerjaan pemasangan bekisting Pondasi Tower Cran\n2. Pembuatan direksi keet kontraktor\n3. Pembuatan Barak pekerja\n4. Test Trial Mix Beton di Lab MIXINDO PT. MERAK JAYA BETON'
  );
  const [workPlannedTomorrow, setWorkPlannedTomorrow] = useState<string>(
    'Pengecoran pondasi tower crane dan penyelesaian dinding direksi keet.'
  );
  const [obstacles, setObstacles] = useState<string>(
    'Hujan jam 15.30 s/d 17.00 WIB memperlambat mobilisasi material semen ke barak.'
  );

  // Auto-resize refs for textareas
  const workCompletedRef = useRef<HTMLTextAreaElement | null>(null);
  const workPlannedTomorrowRef = useRef<HTMLTextAreaElement | null>(null);
  const obstaclesRef = useRef<HTMLTextAreaElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 44)}px`;
  };

  useEffect(() => {
    if (workCompletedRef.current) autoResizeTextarea(workCompletedRef.current);
  }, [workCompleted]);

  useEffect(() => {
    if (workPlannedTomorrowRef.current) autoResizeTextarea(workPlannedTomorrowRef.current);
  }, [workPlannedTomorrow]);

  useEffect(() => {
    if (obstaclesRef.current) autoResizeTextarea(obstaclesRef.current);
  }, [obstacles]);

  // 4. Dynamic Categories for Staff & Manpower
  const [showStaffSection, setShowStaffSection] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<WorkerCategoryItem[]>([
    { id: '1', name: 'PM', count: 1, unit: 'orang' },
    { id: '2', name: 'SM', count: 1, unit: 'orang' },
    { id: '3', name: 'Eng', count: 1, unit: 'org' },
    { id: '4', name: 'HSE', count: 2, unit: 'orang' },
    { id: '5', name: 'QS', count: 1, unit: 'orang' },
    { id: '6', name: 'Admin', count: 1, unit: 'orang' },
    { id: '7', name: 'Drafter', count: 1, unit: 'orang' },
    { id: '8', name: 'Spv', count: 2, unit: 'orang' },
    { id: '9', name: 'Survey', count: 1, unit: 'orang' },
    { id: '10', name: 'Ass Survey', count: 2, unit: 'orang' },
    { id: '11', name: 'Logistics', count: 2, unit: 'orang' },
    { id: '12', name: 'Mekanik', count: 1, unit: 'orang' },
    { id: '13', name: 'Security', count: 1, unit: 'orang' },
  ]);

  const [showManpowerSection, setShowManpowerSection] = useState<boolean>(true);
  const [manpowerList, setManpowerList] = useState<WorkerCategoryItem[]>([
    { id: '1', name: 'Pekerja Sipil', count: 22, unit: 'orang' },
    { id: '2', name: 'K3', count: 1, unit: 'orang' },
    { id: '3', name: 'Operator Excavator', count: 1, unit: 'orang' },
    { id: '4', name: 'Operator Mobil Cran', count: 1, unit: 'orang' },
  ]);

  // Staff category actions
  const handleAddStaffCategory = () => {
    const newItem: WorkerCategoryItem = {
      id: `staff_${Date.now()}`,
      name: 'Posisi Baru',
      count: 1,
      unit: 'orang',
    };
    setStaffList((prev) => [...prev, newItem]);
    setShowStaffSection(true);
  };

  const handleUpdateStaff = (id: string, field: 'name' | 'count' | 'unit', val: any) => {
    setStaffList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'count') {
          return { ...item, count: Math.max(0, Number(val) || 0) };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleDeleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((item) => item.id !== id));
  };

  // Manpower category actions
  const handleAddManpowerCategory = () => {
    const newItem: WorkerCategoryItem = {
      id: `manpower_${Date.now()}`,
      name: 'Kategori Baru',
      count: 1,
      unit: 'orang',
    };
    setManpowerList((prev) => [...prev, newItem]);
    setShowManpowerSection(true);
  };

  const handleUpdateManpower = (id: string, field: 'name' | 'count' | 'unit', val: any) => {
    setManpowerList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'count') {
          return { ...item, count: Math.max(0, Number(val) || 0) };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleDeleteManpower = (id: string) => {
    setManpowerList((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const staffTotal = useMemo(() => {
    return staffList.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  }, [staffList]);

  const manpowerTotal = useMemo(() => {
    return manpowerList.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  }, [manpowerList]);

  const grandTotalWorkers = useMemo(() => staffTotal + manpowerTotal, [staffTotal, manpowerTotal]);

  // 5. Catatan Cuaca Lapangan (Strict Time Format, 15-Minute Increment, Non-Overlapping)
  const [selectedWeather, setSelectedWeather] = useState<WeatherCondition>('rainy');
  const [weatherTimeline, setWeatherTimeline] = useState<WeatherTimelineRow[]>([
    { id: '1', startTime: '08:00', endTime: '15:30', condition: 'Cerah' },
    { id: '2', startTime: '15:30', endTime: '17:00', condition: 'Hujan' },
  ]);

  // Real-time validation of weather timeline
  const weatherValidation = useMemo(() => {
    return validateWeatherTimeline(weatherTimeline);
  }, [weatherTimeline]);

  // Add new weather period snapping directly to previous end time
  const handleAddWeatherRow = () => {
    const lastRow = weatherTimeline[weatherTimeline.length - 1];
    let nextStart = '17:00';
    let nextEnd = '18:00';

    if (lastRow) {
      nextStart = lastRow.endTime;
      const lastEndM = timeToMinutes(lastRow.endTime);
      const newEndM = Math.min(22 * 60, lastEndM + 60);
      nextEnd = minutesToTime(newEndM);
      if (nextEnd === nextStart && lastEndM < 22 * 60) {
        const stepM = Math.min(22 * 60, lastEndM + 30);
        nextEnd = minutesToTime(stepM);
      }
    }

    const newRow: WeatherTimelineRow = {
      id: `weather_${Date.now()}`,
      startTime: nextStart,
      endTime: nextEnd,
      condition: 'Cerah',
    };
    setWeatherTimeline((prev) => [...prev, newRow]);
  };

  const handleUpdateWeather = (
    id: string,
    field: 'startTime' | 'endTime' | 'condition',
    val: string
  ) => {
    setWeatherTimeline((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        // Smart auto-advance: jika startTime diubah melewati endTime, majukan endTime secara otomatis (maks 22:00)
        if (field === 'startTime') {
          const startM = timeToMinutes(val);
          const endM = timeToMinutes(updated.endTime);
          if (endM <= startM) {
            const nextEndM = Math.min(22 * 60, startM + 60);
            updated.endTime = minutesToTime(nextEndM);
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteWeather = (id: string) => {
    if (weatherTimeline.length <= 1) return;
    setWeatherTimeline((prev) => prev.filter((item) => item.id !== id));
  };

  // Auto-chain: Rapatkan waktu berurutan agar otomatis tidak ada celah & tanpa overlap (maks 22:00)
  const handleAutoChainWeather = () => {
    setWeatherTimeline((prev) => {
      if (prev.length <= 1) return prev;
      const sorted = [...prev].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
      const chained: WeatherTimelineRow[] = [];
      for (let i = 0; i < sorted.length; i++) {
        if (i === 0) {
          chained.push(sorted[i]);
        } else {
          const prevRow = chained[i - 1];
          const prevEndM = timeToMinutes(prevRow.endTime);
          const currentDurationM = Math.max(
            30,
            timeToMinutes(sorted[i].endTime) - timeToMinutes(sorted[i].startTime)
          );
          const newEndM = Math.min(22 * 60, prevEndM + currentDurationM);

          chained.push({
            ...sorted[i],
            startTime: prevRow.endTime,
            endTime: minutesToTime(newEndM),
          });
        }
      }
      return chained;
    });
    setSuccessToast('Waktu cuaca berhasil dirapatkan berurutan tanpa overlap!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 6. Multiple Photos with Captions State
  const [progressPhotos, setProgressPhotos] = useState<ReportPhotoItem[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedWaId, setCopiedWaId] = useState<string | null>(null);

  // Lightbox Zoom Modals
  const [zoomReport, setZoomReport] = useState<DailySiteReport | null>(null);
  const [zoomReportPhotoIndex, setZoomReportPhotoIndex] = useState<number>(0);
  const [zoomPhotoModal, setZoomPhotoModal] = useState<{
    url: string;
    caption?: string;
    index: number;
    total: number;
  } | null>(null);

  // Edit & Backdate Modal State (Khusus Administrator)
  const [editingReport, setEditingReport] = useState<DailySiteReport | null>(null);
  const [editReportDate, setEditReportDate] = useState<string>('');
  const [editWorkDayName, setEditWorkDayName] = useState<string>('');
  const [editWorkCategory, setEditWorkCategory] = useState<string>('');
  const [editWorkHours, setEditWorkHours] = useState<string>('');
  const [editZoneName, setEditZoneName] = useState<string>('');
  const [editWorkCompleted, setEditWorkCompleted] = useState<string>('');
  const [editWorkPlannedTomorrow, setEditWorkPlannedTomorrow] = useState<string>('');
  const [editObstacles, setEditObstacles] = useState<string>('');
  const [editWeatherCondition, setEditWeatherCondition] = useState<WeatherCondition>('sunny');
  const [editStaffTotal, setEditStaffTotal] = useState<number>(17);
  const [editManpowerTotal, setEditManpowerTotal] = useState<number>(25);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [reportEditError, setReportEditError] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<DailySiteReport | null>(null);

  const openEditReportModal = (rep: DailySiteReport) => {
    setReportEditError(null);
    setEditingReport(rep);
    const repDate = rep.report_date || (rep.created_at ? rep.created_at.split('T')[0] : '');
    setEditReportDate(repDate);
    setEditWorkDayName(rep.work_day_name || getDayNameID(repDate));
    setEditWorkCategory(rep.work_category || 'PEKERJAAN PERSIAPAN');
    setEditWorkHours(rep.work_hours || 'Jam 08.00 sd 17.00 WIB');
    setEditZoneName(rep.zone_name);
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
    setIsSubmittingEdit(true);
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
          workHours: editWorkHours,
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
      setReports((prev) =>
        prev.map((r) => (r.id === editingReport.id ? { ...r, ...updated } : r))
      );
      if (zoomReport && zoomReport.id === editingReport.id) {
        setZoomReport((prev) => (prev ? { ...prev, ...updated } : null));
      }

      setEditingReport(null);
      setSuccessToast(`Laporan tanggal ${editReportDate} berhasil diperbarui!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: unknown) {
      setReportEditError(err instanceof Error ? err.message : 'Gagal mengubah laporan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deletingReport || !user) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(
        `/api/reports?id=${encodeURIComponent(deletingReport.id)}&adminUserId=${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: deletingReport.id, adminUserId: user.id }),
        }
      );
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Gagal menghapus laporan.');

      setReports((prev) => prev.filter((r) => r.id !== deletingReport.id));
      if (zoomReport && zoomReport.id === deletingReport.id) {
        setZoomReport(null);
      }
      if (editingReport && editingReport.id === deletingReport.id) {
        setEditingReport(null);
      }
      setDeletingReport(null);
      setSuccessToast('Laporan harian berhasil dihapus.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus laporan');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Suggestions for Photo Captions
  const CAPTION_SUGGESTIONS = [
    'Bekisting Pondasi TC',
    'Direksi Keet Kontraktor',
    'Barak Pekerja',
    'Test Mix Beton Mixindo',
    'Pembesian Tulangan',
    'Pengecoran Fisik',
    'Mobilisasi Alat Berat',
  ];

  // GPS State
  const [geoState, setGeoState] = useState<GeolocationState>({
    status: 'requesting',
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceToSite: null,
    isWithinRadius: false,
  });

  // Wajib Login
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Load project site from Supabase (or fallback)
  useEffect(() => {
    async function loadSite() {
      const supabase = createClient();
      if (!supabase) return;

      try {
        const { data: siteData } = await supabase
          .from('project_sites')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (siteData) setSite(siteData);
      } catch (err) {
        console.warn('Load site error:', err);
      }
    }
    loadSite();
  }, []);

  // Fetch reports list
  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (res.ok && json.data) {
        setReports(json.data);
      } else {
        setReports(MOCK_DAILY_REPORTS);
      }
    } catch {
      setReports(MOCK_DAILY_REPORTS);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Geolocation Watcher
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoState((prev) => ({
        ...prev,
        status: 'unavailable',
        errorMessage: 'GPS tidak didukung oleh browser.',
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const { isWithin, distanceMeters } = isWithinGeofence(
          latitude,
          longitude,
          site.latitude,
          site.longitude,
          site.radius_meters
        );
        setGeoState({
          status: isWithin ? 'in_range' : 'out_of_range',
          latitude,
          longitude,
          accuracy,
          distanceToSite: distanceMeters,
          isWithinRadius: isWithin,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoState((prev) => ({
          ...prev,
          status: err.code === 1 ? 'permission_denied' : 'unavailable',
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [site.latitude, site.longitude, site.radius_meters]);

  // Client-Side Watermarking Function (Reusable for Single/Multiple)
  const processImageWithWatermark = useCallback(
    (file: File, photoIndex: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1280;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            ctx.drawImage(img, 0, 0, w, h);

            // Watermark Resmi Proyek
            const timestamp = formatDateTimeID(new Date().toISOString());
            const coordsText =
              geoState.latitude !== null && geoState.longitude !== null
                ? `${geoState.latitude.toFixed(6)}, ${geoState.longitude.toFixed(6)}`
                : `${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}`;
            const distText =
              geoState.distanceToSite !== null && geoState.distanceToSite !== undefined
                ? `Jarak: ${Math.round(geoState.distanceToSite)}m`
                : 'Lokasi Site';

            const bannerHeight = 110;

            // Background overlay gelap di bagian bawah
            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
            ctx.fillRect(0, h - bannerHeight, w, bannerHeight);

            // Garis aksen emas Guang Ming
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(0, h - bannerHeight, w, 4);

            // Baris 1: Header Yayasan & Kontraktor & Proyek + Tag Dokumentasi
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(
              `🏛️ YAYASAN GUANG JI • PT. BERCA BUANA SAKTI • DOKUMENTASI #${photoIndex}`,
              16,
              h - bannerHeight + 22
            );

            // Baris 2: Nama Zona Proyek
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(
              `📍 Zona: ${selectedZone || 'Area Proyek'}`,
              16,
              h - bannerHeight + 46
            );

            // Baris 3: Nama Pengawas & Posisi
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(
              `👤 ${user?.full_name || 'Pengawas'} (${user?.job_position || 'Staff Lapangan'})`,
              16,
              h - bannerHeight + 68
            );

            // Baris 4: Waktu, Log Cuaca Format Waktu, dan GPS
            ctx.font = '11px monospace';
            ctx.fillStyle = '#94a3b8';
            const weatherSummary = weatherTimeline
              .map(
                (item) =>
                  `${item.startTime.replace(':', '.')} s/d ${item.endTime.replace(':', '.')}: ${item.condition}`
              )
              .join(' • ');

            ctx.fillText(
              `🕒 ${timestamp} WIB • ${weatherSummary ? weatherSummary.slice(0, 32) : 'Cuaca Proyek'} • GPS: ${coordsText} (${distText})`,
              16,
              h - bannerHeight + 90
            );

            const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            resolve(watermarkedDataUrl);
          };
          img.onerror = reject;
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    [
      geoState.latitude,
      geoState.longitude,
      geoState.distanceToSite,
      site.latitude,
      site.longitude,
      selectedZone,
      user?.full_name,
      user?.job_position,
      weatherTimeline,
    ]
  );

  // Gallery Multiple Photo Upload Handler
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessingPhotos(true);
    setErrorMessage(null);

    try {
      const newItems: ReportPhotoItem[] = [];
      const currentCount = progressPhotos.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const watermarkedUrl = await processImageWithWatermark(file, currentCount + i + 1);
        newItems.push({
          id: `photo_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          url: watermarkedUrl,
          caption: '',
        });
      }

      setProgressPhotos((prev) => [...prev, ...newItems]);
      setSuccessToast(
        `${files.length} foto berhasil ditambahkan & dicetak watermark GPS! Silakan beri keterangan.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Gallery processing error:', err);
      setErrorMessage('Terjadi kendala saat memproses beberapa foto dari galeri.');
    } finally {
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const handleUpdateCaption = (photoId: string, caption: string) => {
    setProgressPhotos((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, caption } : item))
    );
  };

  const handleDeletePhoto = (photoId: string) => {
    setProgressPhotos((prev) => prev.filter((item) => item.id !== photoId));
  };

  // Copy WhatsApp Formatted Message
  const handleCopyWhatsApp = (report: DailySiteReport) => {
    const waText = generateWhatsAppReportText(report);
    navigator.clipboard.writeText(waText);
    setCopiedWaId(report.id);
    setSuccessToast(
      'Format Laporan WhatsApp berhasil disalin ke clipboard! Siap dipaste ke grup WA.'
    );
    setTimeout(() => {
      setCopiedWaId(null);
      setSuccessToast(null);
    }, 4000);
  };

  const handleShareWhatsApp = (report: DailySiteReport) => {
    const waText = generateWhatsAppReportText(report);
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedZone.trim()) {
      setErrorMessage('Wajib mengisi nama zona / lokasi pekerjaan.');
      const el = document.getElementById('zone-input-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!workCompleted.trim()) {
      setErrorMessage('Harap isi ringkasan pekerjaan yang telah diselesaikan hari ini.');
      const el = document.getElementById('work-completed-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validasi Cuaca: Tidak boleh overlapping dan format jam valid
    if (!weatherValidation.isValid) {
      setErrorMessage(
        weatherValidation.generalError ||
          'Periode cuaca lapangan tumpang tindih (overlapping) atau jam selesai mendahului jam mulai. Harap sesuaikan waktu cuaca.'
      );
      const el = document.getElementById('weather-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (progressPhotos.length === 0) {
      setErrorMessage('Wajib melampirkan minimal 1 foto dokumentasi progres lapangan (dari galeri atau kamera).');
      const el = document.getElementById('photo-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const primaryPhoto = progressPhotos[0]?.url || '';

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: user.id,
          siteId: site.id,
          reportDate,
          workDayName,
          workHours,
          contractorName,
          zoneName: selectedZone.trim(),
          workCategory,
          staffBreakdown: staffList,
          manpowerBreakdown: manpowerList,
          staffTotal,
          manpowerTotal,
          totalWorkers: grandTotalWorkers,
          weatherCondition: selectedWeather,
          weatherTimeline: weatherTimeline.map((item) => ({
            start_time: item.startTime,
            end_time: item.endTime,
            time_range: `${item.startTime.replace(':', '.')} s/d ${item.endTime.replace(':', '.')}`,
            condition: item.condition,
          })),
          workerHeadcount: manpowerTotal,
          workCompleted: workCompleted.trim(),
          workPlannedTomorrow: workPlannedTomorrow.trim(),
          obstacles: obstacles.trim(),
          latitude: geoState.latitude || site.latitude,
          longitude: geoState.longitude || site.longitude,
          photoBase64: primaryPhoto,
          photos: progressPhotos,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengirim laporan harian.');
      }

      if (json.data) {
        setReports((prev) => [json.data, ...prev]);
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSuccessToast('Laporan Harian Proyek (BBS & Guang Ming) berhasil disimpan & disinkronisasi!');
      setTimeout(() => setSuccessToast(null), 5000);

      setProgressPhotos([]);
      fetchReports();
      setActiveSubTab('history');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-slate-400">Memeriksa autentikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <AppHeader user={user} />

      <main className="max-w-md mx-auto px-4 pt-3.5 space-y-4">
        {/* Banner Identitas Resmi Laporan Harian */}
        <div className="px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-blue-500/15 to-transparent border border-amber-500/30 dark:border-amber-500/25 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              Sekolah GJ - Guang Ming Pusat
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {workHours}
            </span>
          </div>
          <h2 className="text-xs font-black text-slate-900 dark:text-white">
            Laporan Harian Kontraktor: {contractorName}
          </h2>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">
            Format resmi sinkronisasi pesan WhatsApp & arsip dokumentasi progres ber-watermark.
          </p>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Switcher: Input Laporan vs Riwayat */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl border border-slate-300/60 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Input Laporan Harian
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat & WhatsApp
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {reports.length}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* SUBTAB 1: INPUT LAPORAN HARIAN LAPANGAN */}
        {/* ============================================================== */}
        {activeSubTab === 'create' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SELEKSI TANGGAL LAPORAN & BACKDATE (KHUSUS ADMIN) */}
            {isAdmin ? (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 rounded-2xl border border-amber-500/30 dark:border-amber-500/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Tanggal Pelaksanaan Pekerjaan
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Admin: Backdate Aktif
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Pilih Tanggal:
                    </label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Hari Pelaksanaan:
                    </label>
                    <input
                      type="text"
                      value={workDayName}
                      onChange={(e) => setWorkDayName(e.target.value)}
                      placeholder="Senin / Selasa / dll"
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-400/90 leading-tight">
                  Laporan akan tercatat sebagai pekerjaan tanggal <strong>{formatDateID(reportDate)}</strong>. Waktu input asli tetap tersimpan otomatis di riwayat sistem.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Hari {workDayName}, {formatDateID(reportDate)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Tanggal Hari Ini (Otomatis)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5" />
                  Staff
                </span>
              </div>
            )}

            {/* 1. Kategori & Rincian Pekerjaan */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-amber-500" />
                  Kategori Pekerjaan
                </label>
                <input
                  type="text"
                  value={workCategory}
                  onChange={(e) => setWorkCategory(e.target.value.toUpperCase())}
                  placeholder="PEKERJAAN PERSIAPAN"
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-right uppercase focus:outline-none"
                />
              </div>

              {/* Waktu Kerja Shift Proyek */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Waktu Kerja:
                </label>
                <select
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Jam 08.00 sd 17.00 WIB">Jam 08.00 sd 17.00 WIB (Normal)</option>
                  <option value="Jam 08.00 sd 15.30 WIB">Jam 08.00 sd 15.30 WIB (Hujan Sore)</option>
                  <option value="Jam 08.00 sd 21.00 WIB">Jam 08.00 sd 21.00 WIB (Lembur)</option>
                  <option value="Jam 08.00 sd 22.00 WIB">Jam 08.00 sd 22.00 WIB (Lembur Cor)</option>
                </select>
              </div>

              {/* Requirement 1: Zonasi Free Text + Quick Chips */}
              <div id="zone-input-section" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Zona / Lokasi Pekerjaan <span className="text-rose-500">*</span>
                  </label>
                  {selectedZone && (
                    <button
                      type="button"
                      onClick={() => setSelectedZone('')}
                      className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  placeholder="Ketik lokasi spesifik (contoh: Area Pondasi Tower Crane, Direksi Keet...)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Pilih Cepat:</span>
                  {QUICK_ZONE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        if (!selectedZone.trim()) {
                          setSelectedZone(suggestion);
                        } else if (!selectedZone.includes(suggestion)) {
                          setSelectedZone(`${selectedZone}, ${suggestion}`);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement 2: Textarea Daftar Pekerjaan Mengikuti Panjangnya */}
              <div id="work-completed-section">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Daftar Pekerjaan Yang Dilakukan Hari Ini <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={workCompletedRef}
                  required
                  value={workCompleted}
                  onChange={(e) => {
                    setWorkCompleted(e.target.value);
                    autoResizeTextarea(e.currentTarget);
                  }}
                  rows={4}
                  placeholder="1. Pekerjaan pemasangan bekisting Pondasi Tower Cran&#10;2. Pembuatan direksi keet kontraktor..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed overflow-hidden resize-none transition-[height] duration-75 min-h-[96px]"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Format bernomor (1, 2, 3..) otomatis tersusun rapi saat disalin ke WhatsApp grup.
                </p>
              </div>

              {/* Requirement 3: Rencana Pekerjaan Besok dalam Format Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Rencana Pekerjaan Besok
                </label>
                <textarea
                  ref={workPlannedTomorrowRef}
                  value={workPlannedTomorrow}
                  onChange={(e) => {
                    setWorkPlannedTomorrow(e.target.value);
                    autoResizeTextarea(e.currentTarget);
                  }}
                  rows={2}
                  placeholder="1. Pengecoran pondasi tower crane&#10;2. Penyelesaian atap direksi keet..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed overflow-hidden resize-none transition-[height] duration-75 min-h-[58px]"
                />
              </div>

              {/* Requirement 3: Kendala Lapangan dalam Format Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kendala / Catatan Lapangan
                </label>
                <textarea
                  ref={obstaclesRef}
                  value={obstacles}
                  onChange={(e) => {
                    setObstacles(e.target.value);
                    autoResizeTextarea(e.currentTarget);
                  }}
                  rows={2}
                  placeholder="Hujan jam 15.30 memperlambat mobilisasi material semen ke barak..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed overflow-hidden resize-none transition-[height] duration-75 min-h-[58px]"
                />
              </div>
            </div>

            {/* Requirement 4: Tenaga Kerja (Manpower & Staff BBS) dengan Dynamic Categories */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
              {/* Grand Total Indicator */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600/10 via-amber-500/10 to-emerald-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Karyawan Staff & Pekerja Harian
                  </span>
                  <div className="font-mono text-xl font-extrabold text-blue-600 dark:text-blue-400">
                    {grandTotalWorkers} Orang Total
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">
                    {staffTotal} Staff
                  </span>
                  <span className="text-slate-400"> + </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {manpowerTotal} Manpower
                  </span>
                </div>
              </div>

              {/* A. Manpower Lapangan & Alat Berat (Dynamic Category) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowManpowerSection(!showManpowerSection)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-500" />
                    Manpower & Alat Berat:{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {manpowerTotal} Orang
                    </strong>
                  </span>
                  {showManpowerSection ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showManpowerSection && (
                  <div className="p-3 space-y-2 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {manpowerList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="pt-2 pb-1 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateManpower(item.id, 'name', e.target.value)
                            }
                            placeholder="Nama Kategori / Alat"
                            className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-500 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateManpower(item.id, 'count', item.count - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                            title="Kurang 1"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.count}
                            onChange={(e) =>
                              handleUpdateManpower(item.id, 'count', e.target.value)
                            }
                            className="w-10 py-1 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 rounded-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateManpower(item.id, 'count', item.count + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                            title="Tambah 1"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteManpower(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Tombol Tambah Kategori Manpower */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAddManpowerCategory}
                        className="w-full py-2 px-3 border border-dashed border-amber-500/40 hover:border-amber-500 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Kategori Manpower / Alat Berat
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* B. Staff PT. Berca Buana Sakti (BBS) (Dynamic Category) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowStaffSection(!showStaffSection)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-500" />
                    Staff {contractorName}:{' '}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {staffTotal} Orang
                    </strong>
                  </span>
                  {showStaffSection ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showStaffSection && (
                  <div className="p-3 space-y-2 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                    {staffList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="pt-2 pb-1 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateStaff(item.id, 'name', e.target.value)
                            }
                            placeholder="Posisi Staff (PM, SM, HSE...)"
                            className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStaff(item.id, 'count', item.count - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                            title="Kurang 1"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.count}
                            onChange={(e) =>
                              handleUpdateStaff(item.id, 'count', e.target.value)
                            }
                            className="w-10 py-1 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 rounded-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStaff(item.id, 'count', item.count + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                            title="Tambah 1"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                            title="Hapus Posisi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Tombol Tambah Posisi Staff */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAddStaffCategory}
                        className="w-full py-2 px-3 border border-dashed border-blue-500/40 hover:border-blue-500 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Posisi Staff BBS
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Requirement 5: Catatan Cuaca Lapangan (Format Time, Kelipatan 30 Menit, Tidak Overlapping) */}
            <div id="weather-section" className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Kondisi Cuaca Lapangan (Log Waktu)
                  </label>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pukul 08:00 s/d 22:00 WIB • Kelipatan 30 menit • Tanpa overlap
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {weatherTimeline.length > 1 && (
                    <button
                      type="button"
                      onClick={handleAutoChainWeather}
                      className="text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Ratakan urutan jam bersambung tanpa ada overlap"
                    >
                      Rapatkan Urutan
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddWeatherRow}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Periode
                  </button>
                </div>
              </div>

              {/* Alert jika terjadi tumpang tindih (overlapping) */}
              {!weatherValidation.isValid && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{weatherValidation.generalError}</span>
                </div>
              )}

              {/* Weather rows matching full wrapper width */}
              <div className="w-full space-y-2.5">
                {weatherTimeline.map((row, idx) => {
                  const rowError = weatherValidation.rowErrors[row.id];
                  const duration = formatDuration(row.startTime, row.endTime);

                  return (
                    <div
                      key={row.id}
                      className={`w-full p-3 rounded-xl border transition-all ${
                        rowError
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/80 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60'
                      } space-y-2.5`}
                    >
                      {/* Header Periode: Nomor, Durasi, Pilihan Cuaca, Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            Periode #{idx + 1}
                          </span>
                          {duration ? (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                              {duration}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={row.condition}
                            onChange={(e) =>
                              handleUpdateWeather(row.id, 'condition', e.target.value)
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="Cerah">☀️ Cerah</option>
                            <option value="Berawan">⛅ Berawan</option>
                            <option value="Hujan">🌧️ Hujan</option>
                            <option value="Hujan Lebat">⛈️ Hujan Lebat (Stop Kerja)</option>
                            <option value="Gerimis">🌦️ Gerimis</option>
                          </select>

                          {weatherTimeline.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWeather(row.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Hapus Periode Cuaca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Baris Time Selectors: Jam Mulai & Jam Selesai Menggunakan TimeDropdown15 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        {/* Jam Mulai */}
                        <TimeDropdown15
                          label="Jam Mulai"
                          value={row.startTime}
                          onChange={(newVal) =>
                            handleUpdateWeather(row.id, 'startTime', newVal)
                          }
                          quickPresets={['08:00', '12:00', '13:00', '15:30', '17:00']}
                          hasError={!!rowError}
                        />

                        {/* Jam Selesai */}
                        <TimeDropdown15
                          label="Jam Selesai"
                          value={row.endTime}
                          onChange={(newVal) =>
                            handleUpdateWeather(row.id, 'endTime', newVal)
                          }
                          referenceStartTime={row.startTime}
                          isEndTime={true}
                          quickPresets={['12:00', '15:30', '17:00', '18:00', '21:00', '22:00']}
                          hasError={!!rowError}
                        />
                      </div>

                      {/* Baris Shortcut Preset Waktu Cepat */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Set Cepat:
                        </span>
                        {[
                          { label: '08:00 - 15:30 (Cerah)', start: '08:00', end: '15:30' },
                          { label: '15:30 - 17:00 (Hujan)', start: '15:30', end: '17:00' },
                          { label: '08:00 - 12:00 (Pagi)', start: '08:00', end: '12:00' },
                          { label: '13:00 - 17:00 (Siang)', start: '13:00', end: '17:00' },
                          { label: '17:00 - 21:00 (Lembur)', start: '17:00', end: '21:00' },
                          { label: '17:00 - 22:00 (Lembur Maks)', start: '17:00', end: '22:00' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              handleUpdateWeather(row.id, 'startTime', preset.start);
                              handleUpdateWeather(row.id, 'endTime', preset.end);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              row.startTime === preset.start && row.endTime === preset.end
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Error Message per baris jika ada */}
                      {rowError && (
                        <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1 pt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{rowError}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Format jam otomatis tersusun rapi: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">08.00 s/d 15.30</span> saat disalin ke WhatsApp.
              </p>
            </div>

            {/* Foto Progress Multiple & Keterangan Foto */}
            <div id="photo-section" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3.5">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
              />

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    Foto Progres Lapangan & Keterangan <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Bisa upload banyak foto (multiple) disertai keterangan pada tiap foto
                  </p>
                </div>
                {progressPhotos.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {progressPhotos.length} Foto Siap
                  </span>
                )}
              </div>

              {/* Loading State saat Watermarking Batch */}
              {isProcessingPhotos && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Sedang memproses & mencetak watermark GPS ke semua foto...</span>
                </div>
              )}

              {progressPhotos.length === 0 ? (
                <div className="space-y-2.5">
                  {/* Pilihan 1: Galeri Multiple (Primary) */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-amber-500/50 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-amber-700 dark:text-amber-400 transition-all cursor-pointer group"
                  >
                    <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <ImagePlus className="w-7 h-7" />
                    </div>
                    <div className="text-center px-4">
                      <span className="text-xs font-extrabold block text-slate-900 dark:text-white">
                        Pilih Foto Progres dari Galeri (Bisa Pilih Banyak)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                        Pilih beberapa foto sekaligus dari album HP • Otomatis dicetak watermark GPS resmi
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">atau</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  {/* Pilihan 2: Buka Kamera Langsung (Alternative) */}
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ambil Foto Langsung dengan Kamera</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Daftar Foto & Keterangan */}
                  <div className="space-y-3">
                    {progressPhotos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5"
                      >
                        {/* Foto Thumbnail + Action Buttons */}
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black aspect-video flex items-center justify-center group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={`Foto Dokumentasi #${pIdx + 1}`}
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/80 text-amber-400 border border-amber-500/30">
                              Foto #{pIdx + 1}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              GPS Watermarked
                            </span>
                          </div>

                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setZoomPhotoModal({
                                  url: photo.url,
                                  caption: photo.caption,
                                  index: pIdx + 1,
                                  total: progressPhotos.length,
                                })
                              }
                              className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs transition-colors cursor-pointer"
                              title="Perbesar Foto"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                              title="Hapus Foto Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Input Keterangan Foto */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-amber-500" />
                              Keterangan Foto #{pIdx + 1}:
                            </label>
                            <span className="text-[9px] text-slate-400">
                              {photo.caption ? `${photo.caption.length} karakter` : 'Silakan beri deskripsi'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                            placeholder="Contoh: Pekerjaan pemasangan bekisting Pondasi Tower Crane..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />

                          {/* Quick Suggestion Chips untuk Keterangan */}
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[9px] text-slate-400 font-semibold">Saran:</span>
                            {CAPTION_SUGGESTIONS.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => {
                                  if (!photo.caption.trim()) {
                                    handleUpdateCaption(photo.id, sug);
                                  } else if (!photo.caption.includes(sug)) {
                                    handleUpdateCaption(photo.id, `${photo.caption} - ${sug}`);
                                  }
                                }}
                                className="px-2 py-0.5 rounded text-[9px] bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                + {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tombol Tambah Foto Lebih Lanjut */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>+ Tambah dari Galeri</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      <span>+ Ambil Kamera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alert Warning sebelum Submit Button jika belum memenuhi syarat */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {progressPhotos.length === 0 && !errorMessage && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <Camera className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Lampirkan minimal 1 foto progres (via Kamera atau Galeri di atas) untuk mengirim laporan.</span>
              </div>
            )}

            {!weatherValidation.isValid && !errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Catatan cuaca belum valid: {weatherValidation.generalError}</span>
              </div>
            )}

            {/* Tombol Kirim Laporan */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isSubmitting
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Menyimpan & Mengunggah Laporan ({progressPhotos.length} Foto)...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Laporan Harian ({progressPhotos.length} Foto Progres)
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 2: RIWAYAT & SALIN KE WHATSAPP */}
        {/* ============================================================== */}
        {activeSubTab === 'history' && (
          <div className="space-y-3">
            {isLoadingReports ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                <p className="text-xs text-slate-400">Memuat arsip laporan...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Belum ada laporan harian
                </p>
                <p className="text-[11px] text-slate-500">
                  Mulai input laporan harian pertama Anda.
                </p>
              </div>
            ) : (
              reports.map((rep) => {
                const isCopied = copiedWaId === rep.id;

                const repPhotos: ReportPhotoItem[] =
                  Array.isArray(rep.photos) && rep.photos.length > 0
                    ? rep.photos
                    : Array.isArray(rep.documentation_photos) && rep.documentation_photos.length > 0
                    ? rep.documentation_photos
                    : rep.photo_url
                    ? [{ id: 'p1', url: rep.photo_url, caption: 'Dokumentasi Progres Fisik' }]
                    : [];

                return (
                  <div
                    key={rep.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-xs space-y-3"
                  >
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {rep.work_category || 'PEKERJAAN PERSIAPAN'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {rep.work_hours || '08.00 - 17.00 WIB'}
                          </span>
                          {rep.updated_at && rep.updated_at !== rep.created_at && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                              <Edit3 className="w-2.5 h-2.5" />
                              Diedit
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {rep.contractor_name || 'PT. BERCA BUANA SAKTI'}
                        </h4>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Pekerjaan: Hari {rep.work_day_name || getDayNameID(rep.report_date)}, {formatDateID(rep.report_date || rep.created_at)}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Zona: <span className="font-semibold text-slate-800 dark:text-slate-200">{rep.zone_name}</span> • Pelapor:{' '}
                            {rep.reporter?.full_name || 'Staff Lapangan'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono pt-0.5">
                            <span>Input: {formatDateTimeID(rep.created_at)}</span>
                            {rep.updated_at && rep.updated_at !== rep.created_at && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                • Update: {formatDateTimeID(rep.updated_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-500/20 block">
                          {rep.total_workers || 42} Orang Total
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          ({rep.staff_total || 17} Staff + {rep.manpower_total || 25} Manpower)
                        </span>
                      </div>
                    </div>

                    {/* Uraian Pekerjaan Box */}
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <p className="font-bold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Rincian Pekerjaan Selesai:
                      </p>
                      <pre className="font-sans whitespace-pre-wrap leading-relaxed text-[11px]">
                        {rep.work_completed}
                      </pre>

                      {rep.work_planned_tomorrow && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 text-[11px] flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Rencana Besok: {rep.work_planned_tomorrow}</span>
                        </div>
                      )}

                      {rep.obstacles && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Kendala: {rep.obstacles}</span>
                        </div>
                      )}

                      {/* Timeline Cuaca Pada Riwayat */}
                      {rep.weather_timeline && rep.weather_timeline.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Cuaca:</span>
                          {rep.weather_timeline.map((wt: any, wIdx: number) => (
                            <span
                              key={wIdx}
                              className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-800 dark:text-slate-200"
                            >
                              {wt.time_range}: <strong>{wt.condition}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Galeri Multiple Foto Progres dengan Keterangan */}
                    {repPhotos.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-500" />
                            Foto Dokumentasi ({repPhotos.length} Foto)
                          </span>
                          <span className="text-[10px] text-slate-400">Klik untuk inspeksi</span>
                        </div>

                        <div className={`grid gap-2 ${repPhotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {repPhotos.map((photo, pIdx) => (
                            <div
                              key={photo.id || pIdx}
                              onClick={() => {
                                setZoomReport(rep);
                                setZoomReportPhotoIndex(pIdx);
                              }}
                              className="group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-900 cursor-pointer flex flex-col hover:border-amber-500/40 transition-all shadow-xs"
                            >
                              <div className="relative aspect-video w-full overflow-hidden bg-black">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.url}
                                  alt={photo.caption || `Foto #${pIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2">
                                  <span className="text-[9px] font-bold text-amber-400 bg-black/60 px-1.5 py-0.5 rounded">
                                    #{pIdx + 1}
                                  </span>
                                  <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <ZoomIn className="w-2.5 h-2.5" />
                                    Inspeksi
                                  </span>
                                </div>
                              </div>
                              {photo.caption && (
                                <div className="p-2 bg-slate-950 text-[10px] text-slate-300 line-clamp-2 leading-snug border-t border-slate-800">
                                  {photo.caption}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action WhatsApp & Edit Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => openEditReportModal(rep)}
                          className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Edit Laporan & Tanggal Backdate"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyWhatsApp(rep)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-100'
                        }`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{isCopied ? 'Tersalin!' : 'Salin Format WA'}</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(rep)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Buka Langsung di WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* MODAL KAMERA DOKUMENTASI LAPANGAN (TAMBAH FOTO KE PROGRESS PHOTOS) */}
      {showCamera && (
        <SiteCameraCapture
          staffName={user.full_name}
          jobPosition={user.job_position || 'Staff Lapangan'}
          zoneName={selectedZone}
          weatherCondition={selectedWeather}
          latitude={geoState.latitude || site.latitude}
          longitude={geoState.longitude || site.longitude}
          distanceMeters={geoState.distanceToSite}
          siteName={site.name}
          onPhotoCaptured={(photo) => {
            const newPhoto: ReportPhotoItem = {
              id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              url: photo,
              caption: '',
            };
            setProgressPhotos((prev) => [...prev, newPhoto]);
            setShowCamera(false);
            setSuccessToast('Foto kamera berhasil ditambahkan! Silakan beri keterangan foto.');
            setTimeout(() => setSuccessToast(null), 4000);
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* MODAL ZOOM SINGLE PHOTO MODAL DARI INPUT FORM */}
      {zoomPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-white z-10 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-xs font-bold">
                Inspeksi Foto #{zoomPhotoModal.index} dari {zoomPhotoModal.total}
              </h3>
              <p className="text-[10px] text-slate-400">
                {selectedZone || 'Area Proyek'} • GPS Watermarked
              </p>
            </div>
            <button
              onClick={() => setZoomPhotoModal(null)}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden rounded-2xl bg-black border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomPhotoModal.url}
              alt="Inspeksi Foto"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {zoomPhotoModal.caption && (
            <div className="bg-slate-900/90 text-white p-3.5 rounded-2xl border border-slate-800 text-xs">
              <span className="text-[10px] text-amber-400 font-bold uppercase block mb-0.5">
                Keterangan Foto:
              </span>
              <p className="text-slate-200 text-xs leading-relaxed">{zoomPhotoModal.caption}</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL ZOOM INSPEKSI FOTO LAPORAN + MULTIPLE CAROUSEL */}
      {zoomReport && (
        (() => {
          const repPhotos: ReportPhotoItem[] =
            Array.isArray(zoomReport.photos) && zoomReport.photos.length > 0
              ? zoomReport.photos
              : Array.isArray(zoomReport.documentation_photos) &&
                zoomReport.documentation_photos.length > 0
              ? zoomReport.documentation_photos
              : zoomReport.photo_url
              ? [{ id: 'p1', url: zoomReport.photo_url, caption: 'Dokumentasi Progres Fisik' }]
              : [];

          const currentPhoto = repPhotos[zoomReportPhotoIndex] || repPhotos[0];

          return (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-white z-10 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-xs font-bold">
                    {zoomReport.work_category || zoomReport.zone_name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {zoomReport.contractor_name || 'PT. BERCA BUANA SAKTI'} •{' '}
                    {formatDateID(zoomReport.report_date)} • Foto {zoomReportPhotoIndex + 1} dari{' '}
                    {repPhotos.length}
                  </p>
                </div>
                <button
                  onClick={() => setZoomReport(null)}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden rounded-2xl bg-black border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPhoto?.url || zoomReport.photo_url}
                  alt={currentPhoto?.caption || 'Inspeksi Foto Dokumentasi'}
                  className="max-h-full max-w-full object-contain"
                />

                {/* Tombol Navigasi Prev/Next Foto */}
                {repPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomReportPhotoIndex((prev) =>
                          prev > 0 ? prev - 1 : repPhotos.length - 1
                        )
                      }
                      className="absolute left-3 p-2 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer transition-colors"
                      title="Foto Sebelumnya"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomReportPhotoIndex((prev) =>
                          prev < repPhotos.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer transition-colors"
                      title="Foto Berikutnya"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="bg-slate-900/90 text-white p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                {currentPhoto?.caption && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-snug">
                    <span className="font-bold text-amber-400 block text-[10px] uppercase">
                      Keterangan Foto #{zoomReportPhotoIndex + 1}:
                    </span>
                    {currentPhoto.caption}
                  </div>
                )}

                {/* Thumbnail switcher jika foto > 1 */}
                {repPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {repPhotos.map((p, idx) => (
                      <button
                        key={p.id || idx}
                        onClick={() => setZoomReportPhotoIndex(idx)}
                        className={`w-12 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          zoomReportPhotoIndex === idx
                            ? 'border-amber-500 scale-105'
                            : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Total Tenaga Kerja:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {zoomReport.total_workers || 42} Orang ({zoomReport.staff_total || 17} Staff +{' '}
                    {zoomReport.manpower_total || 25} Manpower)
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const target = zoomReport;
                        setZoomReport(null);
                        openEditReportModal(target);
                      }}
                      className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                      title="Edit Laporan & Backdate"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyWhatsApp(zoomReport)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin Format WhatsApp
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(zoomReport)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* ============================================================ */}
      {/* MODAL EDIT LAPORAN & BACKDATE TANGGAL (KHUSUS ADMIN) */}
      {/* ============================================================ */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Edit Laporan & Backdate</h3>
                  <p className="text-[10px] text-slate-400">
                    ID: {editingReport.id.substring(0, 8)}... • Pelapor: {editingReport.reporter?.full_name || 'Staff'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportEditError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{reportEditError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateReport} className="space-y-3.5">
              {/* Backdate Tanggal Laporan & Hari */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Tanggal Pelaksanaan (Backdate)
                  </label>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Hari: {editWorkDayName || 'Pilih Hari'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tanggal:</label>
                    <input
                      type="date"
                      required
                      value={editReportDate}
                      onChange={(e) => {
                        setEditReportDate(e.target.value);
                        setEditWorkDayName(getDayNameID(e.target.value));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Nama Hari:</label>
                    <input
                      type="text"
                      required
                      value={editWorkDayName}
                      onChange={(e) => setEditWorkDayName(e.target.value)}
                      placeholder="Senin, Selasa, dll"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-300/80 leading-tight">
                  Laporan akan tercatat untuk tanggal pelaksanaan di atas. Riwayat update waktu asli tetap tersimpan.
                </p>
              </div>

              {/* Zona & Waktu Kerja */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Zona / Lokasi</label>
                  <input
                    type="text"
                    required
                    value={editZoneName}
                    onChange={(e) => setEditZoneName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Waktu Kerja</label>
                  <input
                    type="text"
                    value={editWorkHours}
                    onChange={(e) => setEditWorkHours(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-xs"
                  />
                </div>
              </div>

              {/* Kategori Pekerjaan */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">Kategori Pekerjaan</label>
                <input
                  type="text"
                  required
                  value={editWorkCategory}
                  onChange={(e) => setEditWorkCategory(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-xs uppercase"
                />
              </div>

              {/* Uraian Pekerjaan Selesai */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Uraian Pekerjaan Selesai <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editWorkCompleted}
                  onChange={(e) => setEditWorkCompleted(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none text-xs"
                />
              </div>

              {/* Rencana Besok & Kendala */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Rencana Besok</label>
                  <textarea
                    rows={2}
                    value={editWorkPlannedTomorrow}
                    onChange={(e) => setEditWorkPlannedTomorrow(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Kendala Lapangan</label>
                  <textarea
                    rows={2}
                    value={editObstacles}
                    onChange={(e) => setEditObstacles(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none text-xs"
                  />
                </div>
              </div>

              {/* Cuaca & Jumlah SDM */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Cuaca</label>
                  <select
                    value={editWeatherCondition}
                    onChange={(e) => setEditWeatherCondition(e.target.value as WeatherCondition)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-xs"
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
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Manpower</label>
                  <input
                    type="number"
                    min="0"
                    value={editManpowerTotal}
                    onChange={(e) => setEditManpowerTotal(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-mono text-xs"
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
                  className="px-2.5 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Laporan</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingReport(null)}
                    className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {isSubmittingEdit ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL KONFIRMASI HAPUS LAPORAN (ADMIN ONLY) */}
      {/* ============================================================ */}
      {deletingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
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
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteReport}
                disabled={isSubmittingEdit}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole={user.role} />
    </div>
  );
}