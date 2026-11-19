'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteRadiusMapProps {
  siteLat: number;
  siteLng: number;
  siteName: string;
  radiusMeters: number;
  userLat: number | null;
  userLng: number | null;
  userAccuracy?: number | null;
  isWithinRadius: boolean;
}

export function SiteRadiusMap({
  siteLat,
  siteLng,
  siteName,
  radiusMeters,
  userLat,
  userLng,
  userAccuracy,
  isWithinRadius,
}: SiteRadiusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const siteCircleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inisialisasi peta jika belum ada
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [siteLat, siteLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      // OpenStreetMap Tiles (Gratis & Cepat)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Icon untuk Site Proyek
      const siteIcon = L.divIcon({
        className: 'custom-site-marker',
        html: `
          <div style="background-color: #0f172a; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid #ffffff; font-size: 16px;">
            🏗️
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Pin Lokasi Proyek
      L.marker([siteLat, siteLng], { icon: siteIcon })
        .addTo(map)
        .bindPopup(`<b>${siteName}</b><br/>Area Absensi Sah (Radius: ${radiusMeters}m)`);

      // Lingkaran Radius Geofence
      const siteCircle = L.circle([siteLat, siteLng], {
        radius: radiusMeters,
        color: isWithinRadius ? '#10b981' : '#f59e0b',
        fillColor: isWithinRadius ? '#10b981' : '#f59e0b',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);
      siteCircleRef.current = siteCircle;

      mapInstanceRef.current = map;
    }

    // Update lingkaran jika status berubah
    if (siteCircleRef.current) {
      siteCircleRef.current.setStyle({
        color: isWithinRadius ? '#10b981' : '#f43f5e',
        fillColor: isWithinRadius ? '#10b981' : '#f43f5e',
      });
    }

    // Update marker posisi pengguna saat ini
    const map = mapInstanceRef.current;
    if (map && userLat !== null && userLng !== null) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4);">
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarkerRef.current.bindPopup('<b>Posisi Anda Saat Ini</b>');
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }

      // Lingkaran akurasi GPS pengguna
      if (userAccuracy && userAccuracy < 200) {
        if (!userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current = L.circle([userLat, userLng], {
            radius: userAccuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map);
        } else {
          userAccuracyCircleRef.current.setLatLng([userLat, userLng]);
          userAccuracyCircleRef.current.setRadius(userAccuracy);
        }
      }

      // Auto fit bounds jika user ada di luar agar terlihat keduanya
      const bounds = L.latLngBounds([
        [siteLat, siteLng],
        [userLat, userLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }

    return () => {
      // Tidak menghancurkan peta setiap render kecil
    };
  }, [siteLat, siteLng, siteName, radiusMeters, userLat, userLng, userAccuracy, isWithinRadius]);

  // Clean-up saat unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current && userLat !== null && userLng !== null) {
      mapInstanceRef.current.setView([userLat, userLng], 18, { animate: true });
    }
  };

  const handleCenterOnSite = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([siteLat, siteLng], 17, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Kontrol Mini Peta */}
      <div className="absolute bottom-2 right-2 z-10 flex gap-1.5">
        <button
          type="button"
          onClick={handleCenterOnSite}
          className="px-2 py-1 bg-white/95 dark:bg-slate-900/95 text-[11px] font-medium text-slate-700 dark:text-slate-300 rounded-md shadow border border-slate-200 dark:border-slate-700 active:scale-95"
        >
          📍 Site
        </button>
        {userLat !== null && (
          <button
            type="button"
            onClick={handleCenterOnUser}
            className="px-2 py-1 bg-blue-600 text-[11px] font-medium text-white rounded-md shadow active:scale-95"
          >
            🎯 Posisi Saya
          </button>
        )}
      </div>
    </div>
  );
}
