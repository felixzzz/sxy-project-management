export type UserRole = 'staff' | 'mandor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  job_position?: string;
  phone_number?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProjectSite {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  // Pengaturan Operasional & Kebijakan
  work_start_time?: string;
  work_end_time?: string;
  late_tolerance_minutes?: number;
  work_days?: string[];
  require_selfie?: boolean;
  max_gps_accuracy?: number;
  allow_overtime?: boolean;
  emergency_contact?: string;
  announcement?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'early_leave' | 'overtime';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user?: UserProfile;
  site_id: string;
  site?: ProjectSite;
  
  // Check In
  check_in_time: string;
  check_in_lat: number;
  check_in_lng: number;
  check_in_accuracy?: number;
  check_in_distance_meters: number;
  check_in_photo_url: string;

  // Check Out
  check_out_time?: string;
  check_out_lat?: number;
  check_out_lng?: number;
  check_out_accuracy?: number;
  check_out_distance_meters?: number;
  check_out_photo_url?: string;

  status: AttendanceStatus;
  is_within_geofence: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type GeolocationStatus = 
  | 'idle'
  | 'requesting'
  | 'in_range'
  | 'out_of_range'
  | 'low_accuracy'
  | 'permission_denied'
  | 'unavailable'
  | 'timeout';

export interface GeolocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceToSite: number | null; // in meters
  isWithinRadius: boolean;
  errorMessage?: string;
}

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'heavy_rain';

export interface ProjectZone {
  id: string;
  site_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface WorkerCategoryItem {
  id: string;
  name: string;
  count: number;
  unit?: string;
}

export type StaffBreakdown =
  | WorkerCategoryItem[]
  | {
      pm?: number;
      sm?: number;
      eng?: number;
      hse?: number;
      qs?: number;
      admin?: number;
      drafter?: number;
      spv?: number;
      survey?: number;
      ass_survey?: number;
      logistics?: number;
      mekanik?: number;
      security?: number;
      [key: string]: any;
    };

export type ManpowerBreakdown =
  | WorkerCategoryItem[]
  | {
      pekerja_sipil?: number;
      k3?: number;
      operator_excavator?: number;
      operator_crane?: number;
      lainnya?: number;
      [key: string]: any;
    };

export interface WeatherTimelineItem {
  id?: string;
  start_time?: string;
  end_time?: string;
  time_range: string;
  condition: string;
}

export interface ReportPhotoItem {
  id: string;
  url: string;
  caption: string;
  created_at?: string;
}

export interface DailySiteReport {
  id: string;
  site_id: string;
  site?: ProjectSite;
  reporter_id: string;
  reporter?: UserProfile;
  report_date: string;
  work_day_name?: string; // e.g. "Selasa"
  work_hours?: string; // e.g. "Jam 08.00 sd 17.00 WIB"
  contractor_name?: string; // e.g. "PT. BERCA BUANA SAKTI"
  zone_name: string;
  weather_condition: WeatherCondition;
  weather_timeline?: WeatherTimelineItem[];
  worker_headcount: number; // total manpower
  staff_total?: number;
  manpower_total?: number;
  total_workers?: number;
  staff_breakdown?: StaffBreakdown;
  manpower_breakdown?: ManpowerBreakdown;
  work_category?: string; // e.g. "PEKERJAAN PERSIAPAN"
  work_items?: string[];
  work_completed: string;
  work_planned_tomorrow?: string;
  obstacles?: string;
  latitude: number;
  longitude: number;
  photo_url: string; // Primary photo (backward-compatibility)
  photos?: ReportPhotoItem[]; // Multiple progress photos with captions
  documentation_photos?: ReportPhotoItem[]; // Alias for Supabase column
  created_at: string;
  updated_at?: string;
}

