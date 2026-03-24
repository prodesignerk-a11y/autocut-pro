'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Upload,
  Clock,
  CreditCard,
  Settings,
  LogOut,
  Scissors,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Upload Video' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-surface-card border-r border-surface-border z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-glow">
          <Scissors size={18} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-lg leading-none">AutoCut</span>
          <span className="block text-xs text-primary-400 font-medium">Pro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-muted'
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  isActive ? 'text-primary-400' : 'text-gray-500'
                )}
              />
              {label}
              {isActive && (
                <ChevronRight size={14} className="ml-auto text-primary-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-surface-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
