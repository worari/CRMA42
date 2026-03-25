'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { CURRENT_PDPA_VERSION } from '@/lib/pdpa';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    line_user_id: '',
    first_name: '',
    last_name: '',
    pdpa_consent: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineEmail = params.get('line_email');
    const lineUserId = params.get('line_user_id');
    const lineName = params.get('line_name');
    const updates = {};
    if (lineEmail) updates.email = lineEmail;
    if (lineUserId) updates.line_user_id = lineUserId;
    if (lineName) {
      const parts = lineName.trim().split(/\s+/);
      if (parts.length >= 2) {
        updates.first_name = parts.slice(0, -1).join(' ');
        updates.last_name = parts[parts.length - 1];
      } else {
        updates.first_name = lineName;
      }
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone_number') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone_number: digitsOnly }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = formData.email.trim().toLowerCase();
    const isLineMode = Boolean(formData.line_user_id);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง เช่น example@mail.com');
      return;
    }

    if (!isLineMode) {
      if (formData.password !== formData.confirmPassword) {
        setError('รหัสผ่านไม่ตรงกัน');
        return;
      }
      if (formData.password.length < 6) {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
    }

    if (!formData.pdpa_consent) {
      setError('กรุณายินยอมให้ใช้ข้อมูลส่วนบุคคลตาม PDPA');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone_number)) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ตัวเลขเท่านั้น)');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        email: normalizedEmail,
        ...(isLineMode ? {} : { password: formData.password }),
        phone_number: formData.phone_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        line_user_id: formData.line_user_id || undefined,
        pdpa_consent: formData.pdpa_consent,
        pdpa_version: CURRENT_PDPA_VERSION,
      });

      setSuccess('สมัครสมาชิกสำเร็จ! กรุณารอการอนุมัติจากผู้ดูแล');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isLineMode = Boolean(formData.line_user_id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0d3b66] to-[#064e3b] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">

        <div className="mb-5 text-center">
          {isLineMode && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#06C755' }}>
              <svg width="14" height="14" viewBox="0 0 40 38" fill="none">
                <path d="M40 15.75C40 7.051 31.046 0 20 0S0 7.05 0 15.75c0 7.789 6.91 14.31 16.24 15.554.633.137 1.495.417 1.713.958.196.49.128 1.257.063 1.756l-.277 1.663c-.085.491-.39 1.922 1.682 1.048 2.072-.874 11.19-6.594 15.27-11.288C37.575 22.22 40 19.16 40 15.75z" fill="white"/>
              </svg>
              สมัครผ่าน LINE
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">สมัครสมาชิก</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLineMode ? 'กรอกข้อมูลเพิ่มเติม — ไม่ต้องตั้งรหัสผ่าน ใช้ LINE เข้าระบบได้เลย' : 'สร้างบัญชีใหม่'}
          </p>
        </div>

        {error && (
          <div className="ux-form-alert ux-form-alert-error mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อ</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="ux-input text-sm" placeholder="ชื่อจริง" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">นามสกุล</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="ux-input text-sm" placeholder="นามสกุล" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">เบอร์โทรศัพท์ (10 หลัก)</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              className="ux-input text-sm"
              placeholder="08xxxxxxxx"
            />
            <p className="mt-1 text-xs text-slate-500">ใช้สำหรับเข้าระบบด้วย OTP และการติดต่อจากผู้ดูแล</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">อีเมล{isLineMode ? ' (สำหรับติดต่อและเข้าระบบช่องสปาร์ก)' : ''}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="ux-input text-sm"
              placeholder="example@email.com"
            />
          </div>

          {!isLineMode && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="ux-input text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="ux-input text-sm"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
            <input
              type="checkbox"
              name="pdpa_consent"
              checked={formData.pdpa_consent}
              onChange={handleChange}
              className="mt-0.5"
            />
            <span>
              ข้าพเจ้ายินยอมให้ระบบเก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคลตามกฎหมาย PDPA
              {' '}(<Link href="/pdpa" className="underline" target="_blank">อ่านนโยบาย</Link>)
            </span>
          </label>

          <button type="submit" disabled={loading} className="ux-btn-primary w-full py-2.5 disabled:opacity-50">
            {loading ? 'กำลังสมัคร...' : isLineMode ? 'ยืนยันและสมัครสมาชิก' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          มีบัญชีแล้ว?{' '}
          <Link href="/login" className="font-semibold text-[#0d3b66] hover:underline">เข้าสู่ระบบที่นี่</Link>
        </p>
      </div>
    </div>
  );
}
