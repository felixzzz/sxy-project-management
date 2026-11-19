import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTimeID(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatTimeID(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '--:--';
  }
}

export function formatDateID(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function generateWhatsAppReportText(report: any): string {
  const dayName = report.work_day_name || 'Selasa';
  const workHours = report.work_hours || 'Jam 08.00 sd 17.00 WIB';
  const contractor = report.contractor_name || 'PT. BERCA BUANA SAKTI';
  const category = report.work_category || 'PEKERJAAN PERSIAPAN';

  let text = `Selamat sore dengan ini kami kirimkan update Laporan Harian Proyek Pembangunan Gedung Sekolah GJ - Guang Ming Pusat\n`;
  text += `Hari ${dayName}  : ${formatDateID(report.report_date || report.created_at)}\n`;
  text += `Waktu Kerja : ${workHours}\n\n`;
  text += `Karyawan staff dan pekerja Harian.\n\n`;

  text += `${category} :\n`;
  if (report.work_items && Array.isArray(report.work_items) && report.work_items.length > 0) {
    report.work_items.forEach((item: string, idx: number) => {
      text += `${idx + 1}. ${item}\n`;
    });
  } else if (report.work_completed) {
    const lines = report.work_completed.split('\n').filter(Boolean);
    if (lines.length > 1) {
      lines.forEach((l: string, i: number) => {
        const cleaned = l.replace(/^\d+[\.\)]\s*/, '');
        text += `${i + 1}. ${cleaned}\n`;
      });
    } else {
      text += `1. ${report.work_completed}\n`;
    }
  }
  text += `\n`;

  text += `- JUMLAH KARYAWAN STAFF DAN PEKERJA HARIAN ${contractor} :\n`;
  
  let staffTotal = report.staff_total;
  const s = report.staff_breakdown;

  if (Array.isArray(s) && s.length > 0) {
    s.forEach((item: any, idx: number) => {
      const name = item.name || `Staff ${idx + 1}`;
      const count = Number(item.count) || 0;
      const unit = item.unit || (name.toLowerCase().includes('eng') ? 'org' : 'orang');
      text += `${idx + 1}. ${name} : ${count} ${unit}\n`;
    });
    if (!staffTotal) {
      staffTotal = s.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
    }
  } else {
    const staffMap = s || {
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
    };

    const staffLabels: [string, string][] = [
      ['PM', 'pm'],
      ['SM', 'sm'],
      ['Eng', 'eng'],
      ['HSE', 'hse'],
      ['QS', 'qs'],
      ['Admin', 'admin'],
      ['Drafter', 'drafter'],
      ['Spv', 'spv'],
      ['Survey', 'survey'],
      ['Ass Survey', 'ass_survey'],
      ['Logistics', 'logistics'],
      ['Mekanik', 'mekanik'],
      ['Security', 'security'],
    ];

    staffLabels.forEach(([label, key], idx) => {
      const count = (staffMap as any)[key];
      if (count !== undefined && count !== null) {
        const unit = key === 'eng' ? 'org' : 'orang';
        text += `${idx + 1}. ${label} : ${count} ${unit}\n`;
      }
    });

    if (!staffTotal) {
      staffTotal = Object.values(staffMap).reduce((a: number, b: any) => a + (Number(b) || 0), 0) || 17;
    }
  }

  text += `\n*Jumlah staff BBS : ${staffTotal || 17} orang\n`;
  text += `***Jumlah Manpower & Alat Berat :\n\n`;

  let manpowerTotal = report.manpower_total;
  const m = report.manpower_breakdown;

  if (Array.isArray(m) && m.length > 0) {
    m.forEach((item: any, idx: number) => {
      const name = item.name || `Manpower ${idx + 1}`;
      const count = Number(item.count) || 0;
      const unit = item.unit || 'orang';
      text += `${idx + 1}. ${name} : ${count} ${unit}\n`;
    });
    if (!manpowerTotal) {
      manpowerTotal = m.reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
    }
  } else {
    const manpowerMap = m || {
      pekerja_sipil: 22,
      k3: 1,
      operator_excavator: 1,
      operator_crane: 1,
    };

    const manpowerLabels: [string, string][] = [
      ['Pekerja Sipil', 'pekerja_sipil'],
      ['K3', 'k3'],
      ['Operator Excavator', 'operator_excavator'],
      ['Operator Mobil Cran', 'operator_crane'],
    ];

    manpowerLabels.forEach(([label, key], idx) => {
      const count = (manpowerMap as any)[key];
      if (count !== undefined && count !== null) {
        text += `${idx + 1}. ${label} : ${count} orang\n`;
      }
    });

    if (!manpowerTotal) {
      manpowerTotal = Object.values(manpowerMap).reduce((a: number, b: any) => a + (Number(b) || 0), 0) || 25;
    }
  }

  const grandTotal = report.total_workers || ((Number(staffTotal) || 0) + (Number(manpowerTotal) || 0));

  text += `\nTotal Manpower : ${manpowerTotal || 25} orang\n\n`;
  text += `Total karyawan staff dan pekerja harian = ${grandTotal} orang\n\n`;

  text += `--Kondisi Cuaca \n`;
  if (
    report.weather_timeline &&
    Array.isArray(report.weather_timeline) &&
    report.weather_timeline.length > 0
  ) {
    report.weather_timeline.forEach((item: any, idx: number) => {
      const timeStr = (item.time_range || item.timeRange || '').trim();
      const prefix = timeStr.toLowerCase().startsWith('jam') ? '' : 'Jam ';
      text += `${idx + 1}. ${prefix}${timeStr} = ${item.condition}\n`;
    });
  } else {
    text += `1. Jam 08.00 s/d 15.30 = Cerah\n2. Jam 15.30 s/d 17.00 = Hujan\n`;
  }

  if (report.work_planned_tomorrow && report.work_planned_tomorrow.trim()) {
    text += `\n--Rencana Pekerjaan Besok :\n${report.work_planned_tomorrow.trim()}\n`;
  }

  if (report.obstacles && report.obstacles.trim()) {
    text += `\n--Kendala Lapangan :\n${report.obstacles.trim()}\n`;
  }

  const photosList =
    Array.isArray(report.photos) && report.photos.length > 0
      ? report.photos
      : Array.isArray(report.documentation_photos) && report.documentation_photos.length > 0
      ? report.documentation_photos
      : [];

  if (photosList.length > 0) {
    text += `\n--Dokumentasi Progres Lapangan (${photosList.length} Foto) :\n`;
    photosList.forEach((p: any, idx: number) => {
      const captionText = p.caption ? `: ${p.caption}` : '';
      text += `${idx + 1}. Foto ${idx + 1}${captionText}\n`;
    });
  }

  return text;
}
