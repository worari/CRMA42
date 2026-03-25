'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredAuth, useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
    const storedAuth = getStoredAuth();
    if (storedAuth?.token && !user) {
      useAuthStore.setState(storedAuth);
    }
  }, [user]);

  if (!mounted) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isEditorOrAdmin = user?.role === 'editor' || user?.role === 'admin' || user?.role === 'super_admin';

  const handleLogout = () => {
    logout();
    localStorage.removeItem('auth');
    router.push('/login');
  };

  const navClass = (href, isAdminMenu = false) => {
    const active = pathname?.startsWith(href);
    if (isAdminMenu) {
      return [
        'px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all whitespace-nowrap shadow-sm',
        active
          ? 'border-green-600 bg-green-400 text-black ring-2 ring-green-300'
          : 'border-green-600 bg-green-100 text-black hover:bg-green-200',
      ].join(' ');
    }
    return [
      'px-3 py-1.5 rounded-lg border text-sm font-bold transition-all whitespace-nowrap shadow-sm',
      active
        ? 'border-orange-500 bg-orange-400 text-black ring-2 ring-orange-300'
        : 'border-amber-400/80 bg-white/80 text-black hover:bg-amber-100 hover:border-amber-500',
    ].join(' ');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-amber-400/60 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 text-black shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black tracking-tight text-black sm:text-xl">ทำเนียบรุ่นเตรียมทหาร CRMA42</h1>
          </div>
          <nav className="flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-amber-400/70 bg-white/40 px-2 py-1.5">
            {token ? (
              <>
                <Link
                  href="/directory"
                  className={navClass('/directory')}
                >
                  รายชื่อ
                </Link>
                <Link
                  href="/dashboard"
                  className={navClass('/dashboard')}
                >
                  สถิติ
                </Link>
                <Link
                  href="/events"
                  className={navClass('/events')}
                >
                  งานรุ่น
                </Link>
                <Link
                  href="/fund"
                  className={navClass('/fund')}
                >
                  กองทุน
                </Link>
                {isEditorOrAdmin && (
                  <Link
                    href="/messaging"
                    className={navClass('/messaging')}
                  >
                    ข้อความ
                  </Link>
                )}

                {isSuperAdmin && <div className="hidden sm:block border-l border-amber-500/50 h-6 mx-1"></div>}

                {isSuperAdmin && (
                  <Link
                    href="/admin/users"
                    className={navClass('/admin/users', true)}
                  >
                    จัดการผู้ใช้งาน
                  </Link>
                )}

                <div className="hidden sm:block border-l border-amber-500/50 h-6 mx-1"></div>

                <span className="hidden text-xs text-black font-semibold md:block">
                  {user?.first_name} {user?.last_name}
                  {isAdmin && (
                    <span className="ml-1 rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {isSuperAdmin ? 'ผู้ดูแลสูงสุด' : 'ผู้ดูแล'}
                    </span>
                  )}
                </span>

                <button
                  onClick={handleLogout}
                  className="ml-1 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-1.5 text-xs font-black text-black transition-colors hover:bg-red-100"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-amber-100 bg-amber-300 px-4 py-1.5 text-sm font-black text-green-950 transition-colors hover:bg-amber-200"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
