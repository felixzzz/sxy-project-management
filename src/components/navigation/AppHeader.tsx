'use client';

import React from 'react';
import Link from 'next/link';
import { HardHat, ShieldCheck, User, LogOut } from 'lucide-react';
import { UserProfile } from '@/types/attendance';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  user: UserProfile;
}

export function AppHeader({ user }: AppHeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white leading-none">
              SXY Absensi
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Sekolah Guang Ming Pusat
            </p>
          </div>
        </Link>

        {/* User Info & Logout Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              {user.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                {user.full_name?.split(' ')[0] || 'Staff'}
              </div>
              <div className="text-[9px] text-slate-400 uppercase font-mono font-medium tracking-wider">
                {user.role}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
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
