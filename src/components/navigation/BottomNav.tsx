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
            label: 'Portal Admin',
            href: '/admin',
            icon: Shield,
            isActive: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-amber-500/20 dark:border-amber-500/15 shadow-lg"
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-xs rounded-xl transition-all min-h-[48px] ${
                item.isActive
                  ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${item.isActive ? 'stroke-[2.5] text-amber-600 dark:text-amber-400' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
