import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, role, jobPosition, phoneNumber } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, dan nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Jika service role key belum disetel
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY belum dipasang di file .env.local. Buka Dashboard Supabase > Project Settings > API > Project API keys (service_role secret) untuk mengaktifkan pembuatan akun staff oleh admin.',
        },
        { status: 400 }
      );
    }

    // Gunakan Admin Client dengan service_role untuk membuat user di Supabase Auth
    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Buat User di Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'staff',
        job_position: jobPosition || 'Staff Proyek',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Simpan atau perbarui profil di public.profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role || 'staff',
        job_position: jobPosition || 'Staff Proyek',
        phone_number: phoneNumber || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (profileError) {
      console.warn('Profile upsert warning:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: `Akun untuk ${fullName} berhasil dibuat.`,
      user: profileData || authData.user,
    });
  } catch (err: unknown) {
    console.error('Create User Error:', err);
    const msg = err instanceof Error ? err.message : 'Terjadi kegagalan server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
