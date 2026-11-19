'use client';

import dynamic from 'next/dynamic';

export const DynamicSiteMap = dynamic(
  () => import('./SiteRadiusMap').then((mod) => mod.SiteRadiusMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-400 text-xs">
        <span>Memuat Peta Lokasi Site...</span>
      </div>
    ),
  }
);
