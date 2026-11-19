'use client';

import React from 'react';
import Link from 'next/link';
import { HardHat, ShieldCheck, User } from 'lucide-react';
import { UserProfile } from '@/types/attendance';

interface AppHeaderProps {
  user: UserProfile;
  onSwitchRole?: (newRole: 'staff' | 'admin') => void;
}

export function AppHeader({ user, onSwitchRole }: AppHeaderProps) {
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

        {/* User Profile Pill & Quick Role Switch */}
        <div className="flex items-center gap-2">
          {onSwitchRole && (
            <button
              type="button"
              onClick={() => onSwitchRole(user.role === 'admin' ? 'staff' : 'admin')}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-medium hover:bg-slate-200"
              title="Ganti persona simulasi"
            >
              Mode: <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{user.role}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
              {user.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold leading-tight">{user.full_name.split(' ')[0]}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
