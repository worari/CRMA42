'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  useEffect(() => {
    // Check for LINE login results
    const urlParams = new URLSearchParams(window.location.search);
    const lineAuthPayload = urlParams.get('line_auth');
    const lineError = urlParams.get('error');
    const pdpaRevoked = urlParams.get('pdpa_revoked');

    if (pdpaRevoked) {
      setError('คุณได้ถอนความยินยอม PDPA แล้ว กรุณายืนยันการยินยอมใหม่หลังเข้าสู่ระบบ');
      return;
    }

    if (lineAuthPayload) {
      try {
        const base64 = lineAuthPayload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(paddedBase64));
        if (!decoded?.token || !decoded?.user) {
          setError('ข้อมูลการเข้าสู่ระบบ LINE ไม่ถูกต้อง');
          return;
        }
        setAuth(decoded.user, decoded.token);
        router.replace('/directory');
        return;
      } catch {
        setError('ไม่สามารถอ่านข้อมูลเข้าสู่ระบบจาก LINE ได้');
        return;
      }
    }

    if (lineError) {
      const lineErrorMap = {
        line_config_missing: 'ระบบ LINE Login ยังไม่ถูกตั้งค่าในเซิร์ฟเวอร์',
        line_login_failed: 'ไม่พบรหัสยืนยันจาก LINE กรุณาลองใหม่',
        line_token_failed: 'ไม่สามารถยืนยันตัวตนกับ LINE ได้',
        line_profile_failed: 'ไม่สามารถดึงข้อมูลผู้ใช้จาก LINE ได้',
        line_userid_missing: 'ไม่พบ LINE User ID จากบัญชีที่ใช้เข้าสู่ระบบ',
        line_email_required: 'บัญชี LINE นี้ไม่ได้อนุญาตอีเมล จึงไม่สามารถเข้าสู่ระบบได้',
        line_not_linked: 'บัญชี LINE นี้ยังไม่ได้ผูกกับผู้ใช้ในระบบ กรุณาใส่เบอร์โทรก่อนกด LINE Login หรือเข้าสู่ระบบด้วยอีเมล',
        line_account_mismatch: 'บัญชีนี้ผูก LINE ไว้คนละบัญชี กรุณาติดต่อผู้ดูแลระบบ',
        line_phone_mismatch: 'เบอร์โทรนี้ถูกผูกกับ LINE อื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ',
        line_pending_approval: 'บัญชีของคุณยังรอการอนุมัติจากผู้ดูแลระบบ',
        line_rejected: 'บัญชีของคุณถูกปฏิเสธการใช้งาน',
        line_login_error: 'เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบด้วย LINE',
      };
      setError(lineErrorMap[lineError] || 'LINE Login failed. Please try again.');
    }
  }, [router, setAuth]);

  const handleLineLogin = () => {
    setError('');
    setInfo('');
    setLineLoading(true);

    window.location.href = '/api/auth/line?start=1';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      setAuth(user, token);
      
      router.push('/directory');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0d3b66] to-[#064e3b] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">ทำเนียบรุ่นเตรียมทหาร</h1>
          <p className="mt-1 text-sm text-slate-500">Military Alumni Directory</p>
        </div>

        {error && (
          <div className="ux-form-alert ux-form-alert-error mb-4 text-sm">{error}</div>
        )}
        {info && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{info}</div>
        )}

        {/* PRIMARY: LINE Login button */}
        <button
          type="button"
          onClick={handleLineLogin}
          disabled={lineLoading}
          className="mb-1 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-base font-bold text-white shadow-md transition-opacity disabled:opacity-60"
          style={{ backgroundColor: lineLoading ? '#74c990' : '#06C755' }}
        >
          <svg width="22" height="22" viewBox="0 0 40 38" fill="none">
            <path
              d="M40 15.75C40 7.051 31.046 0 20 0S0 7.05 0 15.75c0 7.789 6.91 14.31 16.24 15.554.633.137 1.495.417 1.713.958.196.49.128 1.257.063 1.756l-.277 1.663c-.085.491-.39 1.922 1.682 1.048 2.072-.874 11.19-6.594 15.27-11.288C37.575 22.22 40 19.16 40 15.75z"
              fill="white"
            />
          </svg>
          {lineLoading ? 'กำลังเชื่อมต่อ LINE...' : 'เข้าสู่ระบบด้วย LINE'}
        </button>
        <p className="mb-5 text-center text-xs text-slate-400">วิธีที่แนะนำ — เร็ว ไม่ต้องจำรหัสผ่าน</p>

        {/* Email/password login */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">หรือเข้าสู่ระบบด้วยอีเมล / รหัสผ่าน</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="ux-input text-sm"
              placeholder="อีเมล"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="ux-input text-sm"
              placeholder="รหัสผ่าน"
            />
            <button
              type="submit"
              disabled={loading}
              className="ux-btn-secondary w-full py-2 text-sm disabled:opacity-50"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="font-semibold text-[#0d3b66] hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}
