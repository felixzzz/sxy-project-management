import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SITE, MOCK_DAILY_REPORTS, MOCK_USERS } from '@/lib/mock-data';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { DailySiteReport } from '@/types/attendance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const siteId = searchParams.get('siteId');

    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        let query = supabase
          .from('daily_site_reports')
          .select(`
            *,
            reporter:profiles(id, full_name, email, role, job_position, avatar_url),
            site:project_sites(id, name, address, latitude, longitude, radius_meters)
          `)
          .order('created_at', { ascending: false });

        if (date) {
          query = query.eq('report_date', date);
        }
        if (userId) {
          query = query.eq('reporter_id', userId);
        }
        if (siteId) {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, data });
        }
      }
    }

    // Fallback Mock Data
    let reports = [...MOCK_DAILY_REPORTS];
    if (date) {
      reports = reports.filter((r) => r.report_date === date);
    }
    if (userId) {
      reports = reports.filter((r) => r.reporter_id === userId);
    }
    if (siteId) {
      reports = reports.filter((r) => r.site_id === siteId);
    }

    return NextResponse.json({ success: true, data: reports });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil data laporan harian';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reporterId,
      siteId,
      reportDate,
      workDayName = 'Selasa',
      workHours = 'Jam 08.00 sd 17.00 WIB',
      contractorName = 'PT. BERCA BUANA SAKTI',
      zoneName,
      weatherCondition = 'sunny',
      weatherTimeline = [],
      workerHeadcount = 25,
      staffTotal = 17,
      manpowerTotal = 25,
      totalWorkers = 42,
      staffBreakdown,
      manpowerBreakdown,
      workCategory = 'PEKERJAAN PERSIAPAN',
      workItems = [],
      workCompleted,
      workPlannedTomorrow = '',
      obstacles = '',
      latitude,
      longitude,
      photoBase64,
      photos = [],
      documentationPhotos = [],
    } = body;

    const rawPhotosList = Array.isArray(photos) && photos.length > 0
      ? photos
      : Array.isArray(documentationPhotos) && documentationPhotos.length > 0
      ? documentationPhotos
      : photoBase64
      ? [{ id: `photo_1`, url: photoBase64, caption: 'Dokumentasi Lapangan' }]
      : [];

    const primaryPhotoBase64 = photoBase64 || rawPhotosList[0]?.url;

    // 1. Validasi Kelengkapan Parameter
    if (!reporterId || !zoneName || !workCompleted || (!primaryPhotoBase64 && rawPhotosList.length === 0)) {
      return NextResponse.json(
        { error: 'Parameter tidak lengkap: Pelapor, Zona, Rincian Pekerjaan, dan minimal 1 Foto Progres wajib diisi.' },
        { status: 400 }
      );
    }

    // 2. Sanitasi UUID
    const isValidUUID = (id?: string) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    const safeReporterId = isValidUUID(reporterId)
      ? reporterId
      : '00000000-0000-0000-0000-000000000001';

    const safeSiteId = isValidUUID(siteId)
      ? siteId
      : '11111111-1111-1111-1111-111111111111';

    const finalReportDate = reportDate || new Date().toISOString().split('T')[0];

    // 3. Simpan ke Supabase jika terkonfigurasi
    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        // Proses & upload seluruh foto ke Storage bucket (site-reports atau fallback attendance-photos)
        const processedPhotos: typeof rawPhotosList = [];

        for (let i = 0; i < rawPhotosList.length; i++) {
          const item = rawPhotosList[i];
          if (item.url && item.url.startsWith('data:image/')) {
            try {
              const photoBuffer = Buffer.from(
                item.url.replace(/^data:image\/\w+;base64,/, ''),
                'base64'
              );
              const fileName = `${safeReporterId}/report-${Date.now()}-${i + 1}.jpg`;

              // Coba upload ke bucket site-reports
              const { error: uploadError } = await supabase.storage
                .from('site-reports')
                .upload(fileName, photoBuffer, {
                  contentType: 'image/jpeg',
                  upsert: true,
                });

              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                  .from('site-reports')
                  .getPublicUrl(fileName);
                processedPhotos.push({
                  ...item,
                  url: publicUrlData?.publicUrl || item.url,
                });
              } else {
                // Fallback upload ke attendance-photos jika bucket site-reports bermasalah
                const { error: fallbackError } = await supabase.storage
                  .from('attendance-photos')
                  .upload(fileName, photoBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                  });
                if (!fallbackError) {
                  const { data: publicUrlData } = supabase.storage
                    .from('attendance-photos')
                    .getPublicUrl(fileName);
                  processedPhotos.push({
                    ...item,
                    url: publicUrlData?.publicUrl || item.url,
                  });
                } else {
                  console.warn('Storage upload fallback warning:', fallbackError);
                  processedPhotos.push(item);
                }
              }
            } catch (upErr) {
              console.warn('Photo upload processing error:', upErr);
              processedPhotos.push(item);
            }
          } else {
            processedPhotos.push(item);
          }
        }

        const primaryUploadedUrl = processedPhotos[0]?.url || photoBase64 || '';

        // Insert ke tabel daily_site_reports
        let { data, error } = await supabase
          .from('daily_site_reports')
          .insert({
            site_id: safeSiteId,
            reporter_id: safeReporterId,
            report_date: finalReportDate,
            work_day_name: workDayName,
            work_hours: workHours,
            contractor_name: contractorName,
            zone_name: zoneName,
            work_category: workCategory,
            work_items: workItems,
            staff_breakdown: staffBreakdown,
            manpower_breakdown: manpowerBreakdown,
            weather_timeline: weatherTimeline,
            staff_total: Number(staffTotal) || 17,
            manpower_total: Number(manpowerTotal) || 25,
            total_workers: Number(totalWorkers) || 42,
            weather_condition: weatherCondition,
            worker_headcount: Number(workerHeadcount) || 25,
            work_completed: workCompleted,
            work_planned_tomorrow: workPlannedTomorrow || null,
            obstacles: obstacles || null,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null,
            photo_url: primaryUploadedUrl,
            documentation_photos: processedPhotos,
            photos: processedPhotos,
          })
          .select(`
            *,
            reporter:profiles(id, full_name, email, role, job_position, avatar_url),
            site:project_sites(id, name, address, latitude, longitude, radius_meters)
          `)
          .single();

        // Jika ada error kolom skema lama, coba fallback insert dengan kolom dasar
        if (error && error.code !== 'PGRST205') {
          console.warn('Mencoba fallback insert daily_site_reports skema standar...', error.message);
          const fallbackRes = await supabase
            .from('daily_site_reports')
            .insert({
              site_id: safeSiteId,
              reporter_id: safeReporterId,
              report_date: finalReportDate,
              zone_name: zoneName,
              weather_condition: weatherCondition,
              worker_headcount: Number(workerHeadcount) || 0,
              work_completed: workCompleted,
              work_planned_tomorrow: workPlannedTomorrow || null,
              obstacles: obstacles || null,
              latitude: latitude ? Number(latitude) : null,
              longitude: longitude ? Number(longitude) : null,
              photo_url: primaryUploadedUrl,
              documentation_photos: processedPhotos,
              photos: processedPhotos,
            })
            .select(`
              *,
              reporter:profiles(id, full_name, email, role, job_position, avatar_url),
              site:project_sites(id, name, address, latitude, longitude, radius_meters)
            `)
            .single();

          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
            error = null;
          } else {
            error = fallbackRes.error || error;
          }
        }

        if (error) {
          console.error('Supabase daily_site_reports insert error:', error);
          if (error.code === 'PGRST205' || error.message.includes('daily_site_reports')) {
            return NextResponse.json(
              {
                error:
                  "Tabel database 'daily_site_reports' belum dibuat di Supabase. Harap jalankan script SQL migrasi (di supabase/schema.sql) pada Supabase SQL Editor.",
              },
              { status: 500 }
            );
          }
          return NextResponse.json(
            { error: `Gagal menyimpan ke database Supabase: ${error.message}` },
            { status: 500 }
          );
        }

        if (data) {
          return NextResponse.json({ success: true, data });
        }
      }
    }

    // 4. Fallback Mock Response (Jika Supabase belum disetup)
    const reporterUser = MOCK_USERS.find((u) => u.id === safeReporterId) || MOCK_USERS[0];
    const newMockReport: DailySiteReport = {
      id: `rep-${Date.now()}`,
      site_id: safeSiteId,
      site: DEFAULT_SITE,
      reporter_id: safeReporterId,
      reporter: reporterUser,
      report_date: finalReportDate,
      work_day_name: workDayName,
      work_hours: workHours,
      contractor_name: contractorName,
      zone_name: zoneName,
      work_category: workCategory,
      work_items: workItems.length > 0 ? workItems : workCompleted.split('\n').filter(Boolean),
      weather_condition: weatherCondition,
      weather_timeline: weatherTimeline.length > 0 ? weatherTimeline : [
        { time_range: '08.00 s/d 15.30', condition: 'Cerah' },
        { time_range: '15.30 s/d 17.00', condition: 'Hujan' },
      ],
      staff_breakdown: staffBreakdown || {
        pm: 1,
        sm: 1,
        eng: 1,
        hse: 2,
        qs: 1,
        admin: 1,
        drafter: 1,
        spv: 2,
        survey: 1,
        ass_survey: 2,
        logistics: 2,
        mekanik: 1,
        security: 1,
      },
      manpower_breakdown: manpowerBreakdown || {
        pekerja_sipil: 22,
        k3: 1,
        operator_excavator: 1,
        operator_crane: 1,
      },
      staff_total: Number(staffTotal) || 17,
      manpower_total: Number(manpowerTotal) || 25,
      total_workers: Number(totalWorkers) || 42,
      worker_headcount: Number(workerHeadcount) || 25,
      work_completed: workCompleted,
      work_planned_tomorrow: workPlannedTomorrow,
      obstacles: obstacles,
      latitude: latitude || DEFAULT_SITE.latitude,
      longitude: longitude || DEFAULT_SITE.longitude,
      photo_url: primaryPhotoBase64 || '',
      photos: rawPhotosList,
      documentation_photos: rawPhotosList,
      created_at: new Date().toISOString(),
    };

    MOCK_DAILY_REPORTS.unshift(newMockReport);
    return NextResponse.json({ success: true, data: newMockReport });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat mengirim laporan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
