-- ==============================================================================
-- SKEMA DATABASE ABSENSI PROYEK SEKOLAH GUANG MING PUSAT
-- Salin dan jalankan seluruh isi file ini di Supabase SQL Editor
-- ==============================================================================

-- 1. TABEL PROFIL PENGGUNA (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'mandor', 'admin')) DEFAULT 'staff',
    job_position TEXT DEFAULT 'Staff Konstruksi',
    phone_number TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL LOKASI PROYEK (PROJECT SITES)
CREATE TABLE IF NOT EXISTS public.project_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL CATATAN ABSENSI (ATTENDANCES)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.project_sites(id) ON DELETE SET NULL,
    
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON public.attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_check_in_time ON public.attendances(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. TRIGGER: AUTO INSERT ROW PROFILE KETIKA ADA USER BARU DAFTAR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, job_position)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    COALESCE(NEW.raw_user_meta_data->>'job_position', 'Staff Proyek')
  )
  ON CONFLICT (id) DO NOTHING;
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

-- 6. STORAGE BUCKET UNTUK FOTO SELFIE ABSENSI
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES (Idempotent: Drop dulu jika sudah ada, baru Create)
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Project sites readable by authenticated users" ON public.project_sites;
CREATE POLICY "Project sites readable by authenticated users"
  ON public.project_sites FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Project sites editable by admin" ON public.project_sites;
CREATE POLICY "Project sites editable by admin"
  ON public.project_sites FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Staff can view own attendance records" ON public.attendances;
CREATE POLICY "Staff can view own attendance records"
  ON public.attendances FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'mandor'))
  );

DROP POLICY IF EXISTS "Staff can insert own attendance" ON public.attendances;
CREATE POLICY "Staff can insert own attendance"
  ON public.attendances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can update own attendance for check-out" ON public.attendances;
CREATE POLICY "Staff can update own attendance for check-out"
  ON public.attendances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage Policy
DROP POLICY IF EXISTS "Authenticated users can upload attendance photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload attendance photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attendance-photos');

DROP POLICY IF EXISTS "Attendance photos are publicly readable" ON storage.objects;
CREATE POLICY "Attendance photos are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'attendance-photos');
