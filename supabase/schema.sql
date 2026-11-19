-- ==============================================================================
-- SKEMA DATABASE ABSENSI PROYEK SEKOLAH GUANG MING PUSAT
-- Salin dan jalankan seluruh isi file ini di Supabase SQL Editor
-- ==============================================================================

-- 1. TABEL PROFIL PENGGUNA (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'mandor', 'admin')) DEFAULT 'staff',
    job_position TEXT DEFAULT 'Staff Konstruksi',
    phone_number TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lepaskan constraint fk ke auth.users jika ada agar akun demo / staff mandor bisa di-insert langsung
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. TABEL LOKASI PROYEK (PROJECT SITES)
CREATE TABLE IF NOT EXISTS public.project_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    work_start_time TEXT DEFAULT '08:00',
    work_end_time TEXT DEFAULT '17:00',
    late_tolerance_minutes INTEGER DEFAULT 15,
    work_days TEXT[] DEFAULT ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    require_selfie BOOLEAN DEFAULT TRUE,
    max_gps_accuracy INTEGER DEFAULT 50,
    allow_overtime BOOLEAN DEFAULT TRUE,
    emergency_contact TEXT DEFAULT '0811-9876-5432 (Hendra Wijaya - Project Director)',
    announcement TEXT DEFAULT 'Wajib mengenakan rompi keselamatan dan helm proyek di seluruh zona pembangunan struktur Sekolah Guang Ming.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom migrasi idempotensi jika tabel sudah ada sebelumnya
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS work_start_time TEXT DEFAULT '08:00';
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS work_end_time TEXT DEFAULT '17:00';
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS late_tolerance_minutes INTEGER DEFAULT 15;
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS work_days TEXT[] DEFAULT ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS require_selfie BOOLEAN DEFAULT TRUE;
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS max_gps_accuracy INTEGER DEFAULT 50;
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS allow_overtime BOOLEAN DEFAULT TRUE;
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT '0811-9876-5432 (Hendra Wijaya - Project Director)';
ALTER TABLE public.project_sites ADD COLUMN IF NOT EXISTS announcement TEXT DEFAULT 'Wajib mengenakan rompi keselamatan dan helm proyek di seluruh zona pembangunan struktur Sekolah Guang Ming.';

-- 3. TABEL CATATAN ABSENSI (ATTENDANCES)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    site_id UUID,
    
    -- Check-in
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_in_lat DOUBLE PRECISION NOT NULL,
    check_in_lng DOUBLE PRECISION NOT NULL,
    check_in_accuracy DOUBLE PRECISION,
    check_in_distance_meters DOUBLE PRECISION NOT NULL,
    check_in_photo_url TEXT NOT NULL,
    
    -- Check-out
    check_out_time TIMESTAMPTZ,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    check_out_accuracy DOUBLE PRECISION,
    check_out_distance_meters DOUBLE PRECISION,
    check_out_photo_url TEXT,
    
    -- Status & Notes
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'early_leave', 'overtime')) DEFAULT 'present',
    is_within_geofence BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lepaskan foreign key ketat agar riwayat absensi tidak hilang jika profil diedit/dihapus
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_user_id_fkey;
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_site_id_fkey;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON public.attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_check_in_time ON public.attendances(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. TRIGGER: AUTO INSERT ROW PROFILE KETIKA ADA USER BARU DAFTAR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  has_admin BOOLEAN;
BEGIN
  -- Cek apakah sudah ada admin terdaftar. Jika belum, jadikan user pertama ini sebagai Admin Utama
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO has_admin;

  INSERT INTO public.profiles (id, email, full_name, role, job_position)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NOT has_admin THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'job_position',
      CASE WHEN NOT has_admin THEN 'Project Director' ELSE 'Staff Proyek' END
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SEED DATA DEFAULT (Sekolah Guang Ming Pusat)
INSERT INTO public.project_sites (
  id,
  name,
  address,
  latitude,
  longitude,
  radius_meters,
  is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Sekolah Guang Ming Pusat',
  'Kawasan Proyek Sekolah Guang Ming Pusat, Jakarta Barat',
  -6.1386571,
  106.7420345,
  100,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters;

-- SEED DATA PROFIL STAFF & ADMIN AWAL
INSERT INTO public.profiles (id, email, full_name, role, job_position)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'budi.santoso@guangming.sch.id', 'Budi Santoso', 'staff', 'Pengawas Struktur & Sipil'),
  ('00000000-0000-0000-0000-000000000002', 'admin.proyek@guangming.sch.id', 'Hendra Wijaya', 'admin', 'Project Director'),
  ('00000000-0000-0000-0000-000000000003', 'mandor.ahmad@guangming.sch.id', 'Ahmad Fauzi', 'mandor', 'Mandor Besi & Bekisting'),
  ('00000000-0000-0000-0000-000000000004', 'siti.nurhaliza@guangming.sch.id', 'Siti Rahmawati', 'staff', 'Quality Control (QC)')
ON CONFLICT (id) DO NOTHING;

-- 6. STORAGE BUCKET UNTUK FOTO SELFIE ABSENSI
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES (Idempotent: Drop dulu jika ada, lalu Create)
-- Profiles Policies
DROP POLICY IF EXISTS "Profiles readable by public" ON public.profiles;
CREATE POLICY "Profiles readable by public"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Profiles editable by public" ON public.profiles;
CREATE POLICY "Profiles editable by public"
  ON public.profiles FOR ALL
  TO public
  USING (true);

-- Project Sites Policies
DROP POLICY IF EXISTS "Project sites readable by public" ON public.project_sites;
CREATE POLICY "Project sites readable by public"
  ON public.project_sites FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Project sites editable by public" ON public.project_sites;
CREATE POLICY "Project sites editable by public"
  ON public.project_sites FOR ALL
  TO public
  USING (true);

-- Attendances Policies
DROP POLICY IF EXISTS "Allow insert attendances" ON public.attendances;
CREATE POLICY "Allow insert attendances"
  ON public.attendances FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select attendances" ON public.attendances;
CREATE POLICY "Allow select attendances"
  ON public.attendances FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow update attendances" ON public.attendances;
CREATE POLICY "Allow update attendances"
  ON public.attendances FOR UPDATE
  TO public
  USING (true);

-- Storage Policies
DROP POLICY IF EXISTS "Allow upload attendance photos" ON storage.objects;
CREATE POLICY "Allow upload attendance photos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'attendance-photos');

DROP POLICY IF EXISTS "Allow select attendance photos" ON storage.objects;
CREATE POLICY "Allow select attendance photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'attendance-photos');

-- ==============================================================================
-- MODUL 2: OPERASIONAL PROYEK & LAPORAN HARIAN LAPANGAN (DAILY SITE REPORT)
-- ==============================================================================

-- 9. TABEL ZONA PROYEK (PROJECT ZONES)
CREATE TABLE IF NOT EXISTS public.project_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED ZONA DEFAULT SEKOLAH GUANG MING PUSAT
INSERT INTO public.project_zones (site_id, name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Gedung Utama - Lantai 1 (Lobby & Kelas)'),
  ('11111111-1111-1111-1111-111111111111', 'Gedung Utama - Lantai 2 (Laboratorium)'),
  ('11111111-1111-1111-1111-111111111111', 'Gedung Olahraga & Auditorium'),
  ('11111111-1111-1111-1111-111111111111', 'Area Pagar Keliling & Saluran Luar')
ON CONFLICT DO NOTHING;

-- 10. TABEL LAPORAN HARIAN LAPANGAN (DAILY SITE REPORTS)
CREATE TABLE IF NOT EXISTS public.daily_site_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID,
    reporter_id UUID NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_day_name TEXT DEFAULT 'Selasa',
    work_hours TEXT DEFAULT 'Jam 08.00 sd 17.00 WIB',
    contractor_name TEXT DEFAULT 'PT. BERCA BUANA SAKTI',
    zone_name TEXT NOT NULL,
    work_category TEXT DEFAULT 'PEKERJAAN PERSIAPAN',
    work_items JSONB,
    staff_breakdown JSONB,
    manpower_breakdown JSONB,
    weather_timeline JSONB,
    staff_total INTEGER DEFAULT 17,
    manpower_total INTEGER DEFAULT 25,
    total_workers INTEGER DEFAULT 42,
    weather_condition TEXT NOT NULL CHECK (weather_condition IN ('sunny', 'cloudy', 'rainy', 'heavy_rain')) DEFAULT 'sunny',
    worker_headcount INTEGER DEFAULT 25,
    work_completed TEXT NOT NULL,
    work_planned_tomorrow TEXT,
    obstacles TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom tambahan idempotent untuk table yang sudah terlanjur dibuat
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS work_day_name TEXT DEFAULT 'Selasa';
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS work_hours TEXT DEFAULT 'Jam 08.00 sd 17.00 WIB';
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS contractor_name TEXT DEFAULT 'PT. BERCA BUANA SAKTI';
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS work_category TEXT DEFAULT 'PEKERJAAN PERSIAPAN';
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS work_items JSONB;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS staff_breakdown JSONB;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS manpower_breakdown JSONB;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS weather_timeline JSONB;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS staff_total INTEGER DEFAULT 17;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS manpower_total INTEGER DEFAULT 25;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS total_workers INTEGER DEFAULT 42;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS documentation_photos JSONB;
ALTER TABLE public.daily_site_reports ADD COLUMN IF NOT EXISTS photos JSONB;

-- Lepaskan foreign key ketat jika ada
ALTER TABLE public.daily_site_reports DROP CONSTRAINT IF EXISTS daily_site_reports_reporter_id_fkey;
ALTER TABLE public.daily_site_reports DROP CONSTRAINT IF EXISTS daily_site_reports_site_id_fkey;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON public.daily_site_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.daily_site_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_site_id ON public.daily_site_reports(site_id);

-- 11. STORAGE BUCKET UNTUK FOTO DOKUMENTASI LAPORAN HARIAN
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-reports', 'site-reports', true)
ON CONFLICT (id) DO NOTHING;

-- 12. RLS & POLICIES UNTUK ZONA & LAPORAN HARIAN
ALTER TABLE public.project_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_site_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project zones readable by public" ON public.project_zones;
CREATE POLICY "Project zones readable by public"
  ON public.project_zones FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow select daily reports" ON public.daily_site_reports;
CREATE POLICY "Allow select daily reports"
  ON public.daily_site_reports FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow insert daily reports" ON public.daily_site_reports;
CREATE POLICY "Allow insert daily reports"
  ON public.daily_site_reports FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update daily reports" ON public.daily_site_reports;
CREATE POLICY "Allow update daily reports"
  ON public.daily_site_reports FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow delete daily reports" ON public.daily_site_reports;
CREATE POLICY "Allow delete daily reports"
  ON public.daily_site_reports FOR DELETE
  TO public
  USING (true);

-- Storage policies untuk site-reports
DROP POLICY IF EXISTS "Allow upload site report photos" ON storage.objects;
CREATE POLICY "Allow upload site report photos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'site-reports');

DROP POLICY IF EXISTS "Allow select site report photos" ON storage.objects;
CREATE POLICY "Allow select site report photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-reports');

