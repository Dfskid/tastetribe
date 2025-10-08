'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Users, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/discover', label: 'Discover', icon: Map },
    { href: '/social', label: 'Social', icon: Users },
    { href: '/movies', label: 'Movies', icon: Film },
  ];

  return (
    <>
      <div className="fixed top-4 right-4 z-50 hidden md:block">
        <ThemeToggle />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50 md:hidden">
        <div className="flex justify-around items-center h-16">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                  isActive
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            );
          })}
          <div className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
