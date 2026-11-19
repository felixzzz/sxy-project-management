'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, History, Shield, Settings } from 'lucide-react';
import { UserRole } from '@/types/attendance';

interface BottomNavProps {
  userRole: UserRole;
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Absen',
      href: '/',
      icon: Clock,
      isActive: pathname === '/',
    },
    {
      label: 'Riwayat',
      href: '/riwayat',
      icon: History,
      isActive: pathname === '/riwayat',
    },
    ...(userRole === 'admin'
      ? [
          {
            label: 'Admin Panel',
            href: '/admin',
            icon: Shield,
            isActive: pathname.startsWith('/admin') && !pathname.includes('/site'),
          },
          {
            label: 'Site Proyek',
            href: '/admin/site',
            icon: Settings,
            isActive: pathname === '/admin/site',
          },
        ]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded-xl transition-colors min-h-[48px] ${
                item.isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
