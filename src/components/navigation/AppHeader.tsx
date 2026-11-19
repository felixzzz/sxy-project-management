'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, User, LogOut } from 'lucide-react';
import { UserProfile } from '@/types/attendance';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  user: UserProfile;
}

export function AppHeader({ user }: AppHeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 dark:border-amber-500/15 px-4 py-2.5 shadow-sm">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-emerald-600 to-rose-600 shadow-sm shrink-0 transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-950 p-0.5 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo Yayasan Guang Ji"
                width={36}
                height={36}
                priority
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white leading-none">
                SXY Absensi
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60 leading-tight">
                Guang Ji
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Sekolah Guang Ming Pusat
            </p>
          </div>
        </Link>

        {/* User Info & Logout Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
              user.role === 'admin'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {user.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                {user.full_name?.split(' ')[0] || 'Staff'}
              </div>
              <div className="text-[9px] uppercase font-mono font-bold tracking-wider text-amber-600 dark:text-amber-400">
                {user.role}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
            title="Keluar / Logout"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
