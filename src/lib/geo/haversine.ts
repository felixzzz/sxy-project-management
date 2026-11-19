/**
 * Kalkulasi Jarak Geografis Menggunakan Formula Haversine
 * Menghitung jarak garis lurus (great-circle distance) antara 2 titik koordinat bumi dalam satuan meter.
 */

const EARTH_RADIUS_METERS = 6371000; // Radius rata-rata bumi

/**
 * Mengubah derajat ke radian
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak antara 2 titik koordinat dalam meter
 */
export function calculateDistanceHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10; // Pembulatan 1 desimal (contoh: 42.5 meter)
}

/**
 * Memeriksa apakah koordinat pengguna berada dalam radius proyek
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  siteLat: number,
  siteLng: number,
  allowedRadiusMeters: number
): {
  isWithin: boolean;
  distanceMeters: number;
  excessMeters: number;
} {
  const distance = calculateDistanceHaversine(userLat, userLng, siteLat, siteLng);
  const isWithin = distance <= allowedRadiusMeters;
  const excess = isWithin ? 0 : Math.round(distance - allowedRadiusMeters);

  return {
    isWithin,
    distanceMeters: distance,
    excessMeters: excess,
  };
}

/**
 * Format jarak agar ramah dibaca manusia
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format koordinat desimal
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Validasi akurasi GPS: jika deviasi GPS terlalu besar (> 100m), biasanya sinyal buruk
 * atau menggunakan Cell-Tower triangulation yang tidak akurat untuk absensi proyek.
 */
export function isGpsAccuracyAcceptable(accuracyMeters: number | null): boolean {
  if (accuracyMeters === null) return true;
  return accuracyMeters <= 100; // Toleransi deviasi maksimal 100m
}
