# SXY Absensi - Proyek Sekolah Guang Ming Pusat

Web application absensi staf proyek berbasis **Geofencing GPS presisi** dan **Foto Selfie Realtime anti-galeri**, dibangun dengan **Next.js (App Router)**, **Tailwind CSS**, dan **Supabase**.

---

## 🚀 Fitur Utama

1. **Geofencing & Verifikasi Radius Lapangan**:
   - Hanya staff yang berada di dalam radius proyek (default: 100m dari koordinat Sekolah Guang Ming Pusat) yang dapat melakukan absensi.
   - Perhitungan jarak ganda: Client-side untuk feedback instan + **Server-side validation** menggunakan rumus *Haversine* demi keamanan data.
   - Peta visualisasi interaktif menggunakan **Leaflet + OpenStreetMap** (tanpa biaya API Key Google Maps).

2. **Kamera Selfie Realtime (Anti-Upload Galeri)**:
   - Menggunakan stream kamera langsung (`getUserMedia`) dan fallback native mobile (`capture="user"`).
   - Menghalangi pemilihan gambar dari galeri/penyimpanan lokal HP.
   - **Watermarking Otomatis:** Nama staff, tanggal/waktu (WIB), koordinat GPS (lat, lng), dan jarak dari site dicetak langsung ke dalam foto secara permanen.

3. **Portal Akses Admin & Manajemen**:
   - **Live Attendance Feed:** Log kehadiran seluruh staf dan mandor secara realtime hari ini.
   - **Zoom Bukti Foto:** Inspeksi foto selfie lapangan beserta watermarknya.
   - **Pengaturan Site & Radius:** Admin dapat mengubah koordinat lokasi Sekolah Guang Ming Pusat dan mengatur radius toleransi langsung dari slider UI.
   - **Export Rekapitulasi:** Ekspor data kehadiran ke format CSV/Excel untuk kebutuhan payroll atau mandor.
   - **Manajemen Staff:** Kelola data staf, peran (admin/mandor/staff), dan status kerja.

4. **Desain Mobile-First & Anti-AI Slop**:
   - Mematuhi standar aksesibilitas WCAG (touch target $\ge 44\text{px}$ pada layar sentuh).
   - Dynamic viewport (`100dvh`) dan safe-area insets (`env(safe-area-inset-bottom)`) agar nyaman digunakan di browser mobile.
   - Tipografi monospaced tabular untuk angka jam dan jarak agar tidak terjadi layout shift.

---

## 🛠️ Menjalankan di Lokal (Development)

Proyek ini telah dilengkapi dengan mode simulasi / mock sehingga dapat langsung dijalankan dan diuji bahkan sebelum menghubungkan akun Supabase:

```bash
# 1. Install dependencies (sudah terpasang jika menggunakan repo ini)
pnpm install

# 2. Jalankan development server
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser laptop atau HP dalam jaringan lokal yang sama.

---

## 🗄️ Menghubungkan ke Supabase (Database & Storage)

Jika proyek Supabase Anda sudah siap:

1. **Jalankan Skema SQL**:
   - Buka SQL Editor di dashboard [Supabase](https://supabase.com).
   - Buka file [`supabase/schema.sql`](./supabase/schema.sql) di repositori ini, salin seluruh kodenya, dan jalankan (*Run*).
   - Skrip ini akan otomatis membuat tabel `profiles`, `project_sites`, `attendances`, storage bucket `attendance-photos`, dan kebijakan keamanan Row Level Security (RLS).

2. **Konfigurasi Environment**:
   - Buat file `.env.local` dan isi kredensial dari menu *Project Settings > API*:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
     SUPABASE_SERVICE_ROLE_KEY=eyJh...

     # Koordinat Sekolah Guang Ming Pusat
     NEXT_PUBLIC_DEFAULT_SITE_NAME="Sekolah Guang Ming Pusat"
     NEXT_PUBLIC_DEFAULT_SITE_LAT=-6.1432
     NEXT_PUBLIC_DEFAULT_SITE_LNG=106.7215
     NEXT_PUBLIC_DEFAULT_SITE_RADIUS=100
     ```

---

## 📱 Panduan Navigasi Halaman

- **`/` (Beranda Staff)**: Dashboard absensi staff, jam digital, radar geofence, mini peta, dan tombol kamera selfie.
- **`/riwayat`**: Riwayat kehadiran pribadi staff beserta thumbnail foto bukti.
- **`/admin`**: Dashboard monitoring admin, log kehadiran realtime, export CSV.
- **`/admin/site`**: Halaman konfigurasi koordinat dan slider radius site Sekolah Guang Ming Pusat.
- **`/admin/staff`**: Manajemen akun staff dan mandor proyek.
- **`/login`**: Halaman login dan akses cepat demo persona.
