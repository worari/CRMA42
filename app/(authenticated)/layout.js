'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredAuth, useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { CURRENT_PDPA_VERSION } from '@/lib/pdpa';
import { CalendarDays, LayoutDashboard, LogOut, Menu, MessageSquare, Shield, UserCircle2, Users, Wallet, X } from 'lucide-react';

export default function AuthLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [checkingPdpa, setCheckingPdpa] = useState(true);
  const [needsPdpaConsent, setNeedsPdpaConsent] = useState(false);
  const [acceptingPdpa, setAcceptingPdpa] = useState(false);
  const [pdpaError, setPdpaError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check auth on mount
    const storedAuth = getStoredAuth();
    if (!storedAuth?.token && !token) {
      router.push('/login');
    }
  }, [token, router]);

  useEffect(() => {
    const checkPdpa = async () => {
      const storedAuth = getStoredAuth();
      if (!storedAuth?.token && !token) {
        return;
      }

      if ((storedAuth?.user?.pdpa_consent || user?.pdpa_consent) && (storedAuth?.user?.pdpa_version || user?.pdpa_version) === CURRENT_PDPA_VERSION) {
        setNeedsPdpaConsent(false);
        setCheckingPdpa(false);
        return;
      }

      try {
        const response = await authAPI.getPdpaConsent();
        const consent = !!response.data?.pdpa_consent;
        const needsReconsent = !!response.data?.needs_reconsent;
        setNeedsPdpaConsent(!consent || needsReconsent);

        if (consent && !needsReconsent) {
          const auth = getStoredAuth();
          if (auth?.user && auth?.token) {
            setAuth(
              {
                ...auth.user,
                pdpa_consent: true,
                pdpa_consent_at: response.data?.pdpa_consent_at,
                pdpa_version: response.data?.pdpa_version,
              },
              auth.token
            );
          }
        }
      } catch {
        setNeedsPdpaConsent(true);
      } finally {
        setCheckingPdpa(false);
      }
    };

    checkPdpa();
  }, [token, user?.pdpa_consent, setAuth]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isSuperAdmin = user?.role === 'super_admin';
  const isEditorOrAdmin = user?.role === 'editor' || user?.role === 'admin' || user?.role === 'super_admin';
  const roleLabel = isSuperAdmin
    ? 'ผู้ดูแลระบบสูงสุด'
    : user?.role === 'admin'
      ? 'ผู้ดูแลระบบ'
      : user?.role === 'editor'
        ? 'ผู้ช่วยผู้ดูแล'
        : 'ผู้ใช้งานระบบ';

  const navigationItems = [
    { href: '/directory', label: 'รายชื่อกำลังพล', icon: Users, show: true },
    { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, show: true },
    { href: '/events', label: 'กิจกรรม', icon: CalendarDays, show: true },
    { href: '/fund', label: 'กองทุน', icon: Wallet, show: true },
    { href: '/messaging', label: 'ส่งข้อความ', icon: MessageSquare, show: isEditorOrAdmin },
    { href: '/admin/users', label: 'จัดการผู้ใช้งาน', icon: Shield, show: isSuperAdmin },
  ].filter((item) => item.show);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('auth');
    router.push('/login');
  };

  const handleAcceptPdpa = async () => {
    setAcceptingPdpa(true);
    setPdpaError('');

    try {
      const response = await authAPI.acceptPdpaConsent(CURRENT_PDPA_VERSION);
      const auth = getStoredAuth();
      if (auth?.user && auth?.token) {
        setAuth(
          {
            ...auth.user,
            pdpa_consent: true,
            pdpa_consent_at: response.data?.pdpa_consent_at,
            pdpa_version: response.data?.pdpa_version,
          },
          auth.token
        );
      }
      setNeedsPdpaConsent(false);
    } catch (error) {
      setPdpaError(error?.response?.data?.message || 'ไม่สามารถบันทึกการยินยอม PDPA ได้');
    } finally {
      setAcceptingPdpa(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-700/70 bg-gradient-to-b from-[#062341] via-[#0b355e] to-[#0f4f67] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/90">CRMA 42</p>
              <h1 className="mt-1 text-lg font-bold leading-tight">Alumni Admin</h1>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-white/85 hover:bg-white/15 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="ปิดแถบเมนู"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                        active
                          ? 'bg-emerald-500/90 text-slate-950 shadow-lg shadow-emerald-900/20'
                          : 'text-white/90 hover:bg-white/12'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-white/15 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500/85 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              <LogOut size={16} />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="เปิดเมนู"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-800">ระบบทำเนียบรุ่นเตรียมทหาร</p>
                <p className="text-xs text-slate-500">ศูนย์กลางจัดการข้อมูลกำลังพล</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <UserCircle2 className="text-emerald-700" size={20} />
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.first_name || '-'} {user?.last_name || ''}
                </p>
                <p className="text-xs font-medium text-emerald-700">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>

      {!checkingPdpa && needsPdpaConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-blue-100 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-blue-900">ยินยอมการใช้ข้อมูลส่วนบุคคล (PDPA)</h2>
            <p className="mt-3 text-sm text-gray-700">
              เพื่อใช้งานระบบทำเนียบรุ่นต่อไป กรุณายืนยันการยินยอมให้ระบบเก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล
              ตามวัตถุประสงค์ของการจัดการข้อมูลสมาชิก การติดต่อสื่อสาร และการแจ้งเตือนที่เกี่ยวข้อง
            </p>
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              เวอร์ชันเอกสาร: {CURRENT_PDPA_VERSION} {' '}(
              <Link href="/pdpa" className="underline" target="_blank">
                อ่านนโยบาย
              </Link>
              )
            </div>
            {pdpaError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {pdpaError}
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleAcceptPdpa}
                disabled={acceptingPdpa}
                className="rounded-lg bg-blue-800 px-4 py-2 text-white hover:bg-blue-900 disabled:opacity-60"
              >
                {acceptingPdpa ? 'กำลังบันทึก...' : 'ยินยอมและดำเนินการต่อ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
