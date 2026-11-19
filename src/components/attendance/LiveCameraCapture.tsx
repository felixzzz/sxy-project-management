'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, SwitchCamera, X } from 'lucide-react';
import { formatDateTimeID } from '@/lib/utils';

interface LiveCameraCaptureProps {
  staffName: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  isWithinRadius: boolean;
  siteName: string;
  onPhotoCaptured: (photoBase64: string) => void;
  onCancel?: () => void;
}

export function LiveCameraCapture({
  staffName,
  latitude,
  longitude,
  distanceMeters,
  isWithinRadius,
  siteName,
  onPhotoCaptured,
  onCancel,
}: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mulai stream kamera WebRTC
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);

    // Matikan stream sebelumnya jika ada
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
          width: { ideal: 720 },
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

  // Mengganti kamera depan / belakang
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Menggambar watermark langsung pada canvas sebelum diekspor
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const timestamp = formatDateTimeID(new Date().toISOString());
    const coordsText =
      latitude !== null && longitude !== null
        ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : 'Koordinat tidak terbaca';
    const distText =
      distanceMeters !== null
        ? `${Math.round(distanceMeters)}m dari ${siteName} (${isWithinRadius ? 'DALAM RADIUS' : 'LUAR RADIUS'})`
        : 'Jarak tidak diketahui';

    // Banner gelap di bagian bawah
    const bannerHeight = 100;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Garis aksen indikator hijau/merah (sesuai palet logo)
    ctx.fillStyle = isWithinRadius ? '#15803d' : '#dc2626';
    ctx.fillRect(0, height - bannerHeight, width, 4);

    // Identitas Resmi Yayasan Guang Ji
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🏛️ YAYASAN GUANG JI INDONESIA • SEKOLAH GUANG MING PUSAT', 16, height - bannerHeight + 20);

    // Teks Watermark Staff & Waktu
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`👤 ${staffName}`, 16, height - bannerHeight + 42);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`🕒 ${timestamp} WIB`, 16, height - bannerHeight + 64);

    ctx.font = '11px monospace';
    ctx.fillStyle = isWithinRadius ? '#4ade80' : '#f87171';
    ctx.fillText(`📍 GPS: ${coordsText} • ${distText}`, 16, height - bannerHeight + 84);
  };

  // Jepret foto dari live video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    // Jika kamera depan, mirror gambar agar natural saat selfie
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Bubuhkan watermark bukti absensi asli
    drawWatermark(ctx, width, height);

    // Konversi ke format WebP / JPEG terkompresi
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Matikan stream kamera setelah dijepret
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Fallback: Jepretan kamera native mobile via <input capture="user">
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

        // Skala gambar agar ukuran file tidak terlalu besar
        const maxDim = 1000;
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-sm">Ambil Foto Selfie Lapangan</h3>
          <p className="text-xs text-slate-400">Harus foto langsung di lokasi proyek</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Tutup Kamera"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {/* Hidden Canvas untuk processing watermark */}
        <canvas ref={canvasRef} className="hidden" />

        {capturedImage ? (
          // Pratinjau Foto Hasil Jepretan
          <div className="relative w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Hasil Selfie Absensi"
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute top-4 left-4 right-4 bg-emerald-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Foto asli tersimpan dengan watermark koordinat realtime</span>
            </div>
          </div>
        ) : cameraError ? (
          // Tampilan jika kamera WebRTC diblokir/error -> fallback ke input native capture
          <div className="p-6 text-center max-w-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h4 className="font-bold text-base mb-1">Akses Kamera Terkendala</h4>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Browser tidak dapat mengakses video langsung. Gunakan mode kamera bawaan HP (khusus kamera, tanpa opsi galeri).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleNativeCapture}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Camera className="w-5 h-5" />
              Buka Kamera HP Langsung
            </button>
          </div>
        ) : (
          // Live Video Stream Viewfinder
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Overlay Target Framing */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="w-56 h-64 border-2 border-dashed border-amber-300/60 rounded-3xl mb-8 flex items-end justify-center pb-3">
                <span className="text-[11px] bg-black/70 px-2.5 py-1 rounded-full text-amber-200 font-medium">
                  Posisikan Wajah di Sini
                </span>
              </div>
            </div>

            {/* Badge Status Lokasi Real-time */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 backdrop-blur-md ${
                  isWithinRadius ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {distanceMeters !== null
                  ? `${Math.round(distanceMeters)}m dari Site`
                  : 'Mencari GPS...'}
              </div>

              {/* Tombol flip kamera */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-full bg-slate-900/80 text-white pointer-events-auto backdrop-blur-md active:scale-95 hover:bg-slate-800"
                aria-label="Putar Kamera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-4 pb-8 bg-slate-900 border-t border-slate-800">
        {capturedImage ? (
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-3.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
              Foto Ulang
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-950/50 text-white cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Gunakan Foto
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              onClick={capturePhoto}
              disabled={isLoading || Boolean(cameraError)}
              className="w-20 h-20 rounded-full border-4 border-amber-400/90 p-1 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
              aria-label="Jepret Foto"
            >
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-8 h-8 text-slate-900" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
