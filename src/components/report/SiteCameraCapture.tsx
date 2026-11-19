'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, SwitchCamera, X, MapPin, Sparkles } from 'lucide-react';
import { formatDateTimeID } from '@/lib/utils';
import { WeatherCondition } from '@/types/attendance';

interface SiteCameraCaptureProps {
  staffName: string;
  jobPosition?: string;
  zoneName: string;
  weatherCondition?: WeatherCondition;
  latitude: number | null;
  longitude: number | null;
  distanceMeters?: number | null;
  siteName: string;
  onPhotoCaptured: (photoBase64: string) => void;
  onCancel?: () => void;
}

export function SiteCameraCapture({
  staffName,
  jobPosition = 'Pengawas Lapangan',
  zoneName,
  weatherCondition = 'sunny',
  latitude,
  longitude,
  distanceMeters,
  siteName,
  onPhotoCaptured,
  onCancel,
}: SiteCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  // Default kamera belakang ('environment') untuk memotret fisik konstruksi proyek
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getWeatherLabel = (cond: WeatherCondition) => {
    switch (cond) {
      case 'sunny':
        return '☀️ Cerah';
      case 'cloudy':
        return '⛅ Berawan';
      case 'rainy':
        return '🌧️ Hujan Ringan';
      case 'heavy_rain':
        return '⛈️ Hujan Lebat (Stop Kerja)';
      default:
        return '☀️ Cerah';
    }
  };

  // Mulai stream kamera WebRTC
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera langsung. Gunakan mode kamera native.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.warn('Gagal membuka kamera WebRTC:', err);
      const message = err instanceof Error ? err.message : 'Izin kamera ditolak';
      setCameraError(message);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Menggambar watermark resmi proyek langsung pada canvas
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const timestamp = formatDateTimeID(new Date().toISOString());
    const coordsText =
      latitude !== null && longitude !== null
        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : 'Koordinat GPS';
    const distText =
      distanceMeters !== null && distanceMeters !== undefined
        ? `Jarak: ${Math.round(distanceMeters)}m`
        : 'Lokasi Site';

    const bannerHeight = 110;

    // Background overlay gelap di bagian bawah
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Garis aksen emas Guang Ming
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, height - bannerHeight, width, 4);

    // Baris 1: Header Yayasan & Nama Proyek & Kontraktor
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🏛️ YAYASAN GUANG JI • PT. BERCA BUANA SAKTI • SEKOLAH GUANG MING PUSAT', 16, height - bannerHeight + 22);

    // Baris 2: Nama Zona Proyek (Sangat penting untuk identifikasi lapangan)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`📍 Zona: ${zoneName || 'Area Proyek'}`, 16, height - bannerHeight + 46);

    // Baris 3: Nama Pengawas & Posisi
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`👤 ${staffName} (${jobPosition})`, 16, height - bannerHeight + 68);

    // Baris 4: Waktu, Cuaca, dan GPS
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      `🕒 ${timestamp} WIB • ${getWeatherLabel(weatherCondition)} • GPS: ${coordsText} (${distText})`,
      16,
      height - bannerHeight + 90
    );
  };

  // Jepret foto dari live video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || 800;
    const height = video.videoHeight || 600;

    canvas.width = width;
    canvas.height = height;

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    drawWatermark(ctx, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Fallback native mobile input
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
        ctx.drawImage(img, 0, 0, w, h);
        drawWatermark(ctx, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 sm:p-5 backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-500" />
          <div className="text-left">
            <h2 className="text-xs font-bold text-white">Dokumentasi Lapangan Realtime</h2>
            <p className="text-[10px] text-amber-400 font-medium truncate max-w-[200px]">
              {zoneName || 'Pilih Zona Proyek'}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={() => {
              if (stream) stream.getTracks().forEach((track) => track.stop());
              onCancel();
            }}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden rounded-2xl bg-slate-950 border border-slate-800">
        {capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Foto Dokumentasi Lapangan"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {cameraError ? (
              <div className="text-center p-6 space-y-4 max-w-sm">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-300">{cameraError}</p>
                <div className="pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Buka Kamera Native HP
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover rounded-xl ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />
                {/* Visual Viewfinder Reticle */}
                <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-black/60 text-amber-400 font-mono px-2 py-0.5 rounded-md border border-amber-500/30">
                      LIVE STREAM
                    </span>
                    <span className="text-[10px] bg-black/60 text-emerald-400 font-mono px-2 py-0.5 rounded-md border border-emerald-500/30">
                      GPS TERVERIFIKASI
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] bg-black/70 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                      Arahkan kamera ke area pekerjaan/konstruksi fisik
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hidden Elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCapture}
          className="hidden"
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="z-10 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
        {capturedImage ? (
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Foto Ulang
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Gunakan Foto Ini
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {/* Tombol switch kamera depan / belakang */}
            <button
              onClick={toggleFacingMode}
              disabled={isLoading || Boolean(cameraError)}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Ganti Kamera Depan / Belakang"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* Tombol jepret utama */}
            <button
              onClick={capturePhoto}
              disabled={isLoading || Boolean(cameraError)}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-slate-950" />
              Jepret Dokumentasi Lapangan
            </button>

            {/* Tombol fallback buka kamera HP langsung */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Kamera Bawaan HP"
            >
              <Camera className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
