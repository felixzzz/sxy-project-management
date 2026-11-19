import { NextRequest, NextResponse } from 'next/server';
import { calculateDistanceHaversine } from '@/lib/geo/haversine';
import { DEFAULT_SITE, MOCK_ATTENDANCES, MOCK_USERS } from '@/lib/mock-data';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action, // 'check_in' | 'check_out'
      userId,
      siteId,
      latitude,
      longitude,
      accuracy,
      photoBase64,
      notes,
    } = body;

    // 1. Validasi Kelengkapan Parameter
    if (!action || !userId || latitude === undefined || longitude === undefined || !photoBase64) {
      return NextResponse.json(
        { error: 'Parameter tidak lengkap: action, userId, latitude, longitude, dan foto wajib ada.' },
        { status: 400 }
      );
    }

    // 2. Ambil Data Site Proyek (Sekolah Guang Ming Pusat)
    const site = DEFAULT_SITE;

    // Sanitasi UUID agar selalu kompatibel dengan tipe UUID Postgres
    const isValidUUID = (id?: string) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    const safeSiteId = isValidUUID(siteId)
      ? siteId
      : '11111111-1111-1111-1111-111111111111';

    const safeUserId = isValidUUID(userId)
      ? userId
      : '00000000-0000-0000-0000-000000000001';

    // 3. SERVER-SIDE GEOFENCE VALIDATION (Wajib dihitung ulang di server demi keamanan)
    const verifiedDistanceMeters = calculateDistanceHaversine(
      latitude,
      longitude,
      site.latitude,
      site.longitude
    );

    const isWithinGeofence = verifiedDistanceMeters <= site.radius_meters;

    if (!isWithinGeofence) {
      return NextResponse.json(
        {
          error: `Absensi Ditolak: Anda berada di luar radius area Sekolah Guang Ming Pusat. Jarak Anda: ${Math.round(
            verifiedDistanceMeters
          )} meter (Batas toleransi maksimal: ${site.radius_meters} meter).`,
          verifiedDistanceMeters,
          allowedRadiusMeters: site.radius_meters,
        },
        { status: 403 }
      );
    }

    // 4. Jika Supabase Sudah Dikonfigurasi di Environment
    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        // Pastikan record project_site terdaftar di database
        try {
          await supabase.from('project_sites').upsert({
            id: safeSiteId,
            name: site.name,
            address: site.address,
            latitude: site.latitude,
            longitude: site.longitude,
            radius_meters: site.radius_meters,
            is_active: true,
          });
        } catch (err) {
          console.warn('Upsert project_site error:', err);
        }

        // Upload foto ke Supabase Storage (attendance-photos)
        let photoUrl = photoBase64;
        try {
          const photoBuffer = Buffer.from(
            photoBase64.replace(/^data:image\/\w+;base64,/, ''),
            'base64'
          );
          const fileName = `${safeUserId}/${action}-${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('attendance-photos')
            .upload(fileName, photoBuffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('attendance-photos')
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              photoUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('Storage upload error:', uploadError);
          }
        } catch (err) {
          console.warn('Photo storage processing error:', err);
        }

        if (action === 'check_in') {
          const { data, error } = await supabase
            .from('attendances')
            .insert({
              user_id: safeUserId,
              site_id: safeSiteId,
              check_in_time: new Date().toISOString(),
              check_in_lat: latitude,
              check_in_lng: longitude,
              check_in_accuracy: accuracy || null,
              check_in_distance_meters: verifiedDistanceMeters,
              check_in_photo_url: photoUrl,
              status: 'present',
              is_within_geofence: true,
              notes: notes || null,
            })
            .select('*')
            .single();

          if (error) {
            console.error('Supabase attendances insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }

          return NextResponse.json({ success: true, data });
        } else {
          // Check-out: Update record hari ini
          const { data, error } = await supabase
            .from('attendances')
            .update({
              check_out_time: new Date().toISOString(),
              check_out_lat: latitude,
              check_out_lng: longitude,
              check_out_accuracy: accuracy || null,
              check_out_distance_meters: verifiedDistanceMeters,
              check_out_photo_url: photoUrl,
              notes: notes || null,
            })
            .eq('user_id', safeUserId)
            .is('check_out_time', null)
            .select('*')
            .single();

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }

          return NextResponse.json({ success: true, data });
        }
      }
    }

    // 5. Fallback Mock Response (Saat user belum memasukkan API keys Supabase di .env.local)
    const newRecord = {
      id: `att-${Date.now()}`,
      user_id: userId,
      user: MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0],
      site_id: site.id,
      site: site,
      check_in_time: new Date().toISOString(),
      check_in_lat: latitude,
      check_in_lng: longitude,
      check_in_accuracy: accuracy,
      check_in_distance_meters: verifiedDistanceMeters,
      check_in_photo_url: photoBase64,
      status: 'present',
      is_within_geofence: true,
      notes,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Absensi berhasil disimpan (Mock / Demo Mode)',
      data: newRecord,
    });
  } catch (error: unknown) {
    console.error('Attendance API Error:', error);
    const message = error instanceof Error ? error.message : 'Terjadi kegagalan server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
