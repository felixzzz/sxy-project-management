import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum dipasang di file .env.local. Buka Dashboard Supabase > Project Settings > API > Project API keys (service_role secret) untuk mengaktifkan fitur manajemen staff.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET: Ambil daftar seluruh staff beserta statusnya
export async function GET() {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kegagalan server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Buat akun staff / mandor / admin baru
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

    const supabaseAdmin = getAdminClient();

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

    // 2. Simpan profil di public.profiles
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

// PATCH / PUT: Perbarui data profil staf, role, jabatan, status aktif/nonaktif, atau reset password
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || body.userId;
    const { fullName, role, jobPosition, phoneNumber, isActive, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID staff wajib disertakan.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    // Pastikan akun utama admin felix@salim.bz tidak bisa dinonaktifkan atau diturunkan
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingProfile?.email?.toLowerCase() === 'felix@salim.bz') {
      if (isActive === false) {
        return NextResponse.json(
          { error: 'Akun Super Admin utama tidak dapat dinonaktifkan.' },
          { status: 400 }
        );
      }
    }

    // 1. Siapkan update profil
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updates.full_name = fullName;
    if (role !== undefined) updates.role = role;
    if (jobPosition !== undefined) updates.job_position = jobPosition;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber || null;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 2. Perbarui Auth jika ada perubahan password atau user metadata
    const authUpdates: Record<string, unknown> = {};
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
      }
      authUpdates.password = password.trim();
    }
    if (fullName || role || jobPosition) {
      authUpdates.user_metadata = {
        full_name: fullName || existingProfile?.full_name,
        role: role || existingProfile?.role,
        job_position: jobPosition || existingProfile?.job_position,
      };
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
      if (authError) {
        console.warn('Update Auth user warning:', authError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Data staff ${updatedProfile.full_name} berhasil diperbarui.`,
      user: updatedProfile,
    });
  } catch (err: unknown) {
    console.error('Update User Error:', err);
    const msg = err instanceof Error ? err.message : 'Terjadi kegagalan server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Alias PUT ke PATCH agar support kedua HTTP method
export const PUT = PATCH;

// DELETE: Hapus akun staff secara permanen
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || searchParams.get('userId');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?.userId;
      } catch {
        // Body mungkin kosong jika dikirim melalui URL
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Parameter id wajib ada.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', id)
      .maybeSingle();

    if (existingProfile?.email?.toLowerCase() === 'felix@salim.bz') {
      return NextResponse.json(
        { error: 'Akun Super Admin utama tidak dapat dihapus.' },
        { status: 400 }
      );
    }

    // Hapus dari Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.warn('Delete auth user warning:', authError);
    }

    // Hapus dari Profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Akun staff berhasil dihapus dari sistem.',
    });
  } catch (err: unknown) {
    console.error('Delete User Error:', err);
    const msg = err instanceof Error ? err.message : 'Terjadi kegagalan server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
