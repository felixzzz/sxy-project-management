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
}

export interface ProjectSite {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
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
