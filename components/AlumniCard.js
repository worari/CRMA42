'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { Pencil, Phone, Trash2 } from 'lucide-react';

function toPhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function formatPhone(phone) {
  const digits = toPhoneDigits(phone);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone || '-';
}

function formatBirthDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('th-TH');
}

export default function AlumniCard({ profile, onClick, onView, onEdit, onDelete }) {
  const [canDeleteProfile, setCanDeleteProfile] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    setMounted(true);
    setCanDeleteProfile(user?.role === 'editor' || user?.role === 'super_admin');
    setCanEditProfile(user?.role === 'editor' || user?.role === 'admin' || user?.role === 'super_admin');
  }, [user]);

  if (!mounted) return null;

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(profile.id);
  };

  const handleView = (e) => {
    e.stopPropagation();
    onView?.(profile.id);
  };

  const primaryPhone = profile.phone_primary || profile.phone_secondary || '';
  const primaryPhoneDigits = toPhoneDigits(primaryPhone);
  const educationText = String(profile.education_summary || '').trim();

  return (
    <>
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 cursor-pointer"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-sky-100 via-white to-amber-100 opacity-80" />

      <div className="relative z-10 p-4">
        <div className="mx-auto w-2/5 min-w-[64px] max-w-[84px] rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-slate-200">
            {profile.profile_photo ? (
              <img
                src={profile.profile_photo}
                alt={profile.first_name}
                className="h-full w-full object-cover object-center"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sky-100">
                <span className="text-4xl font-black text-sky-700">
                  {profile.first_name ? profile.first_name.charAt(0) : '?'}
                </span>
              </div>
            )}

            {profile.status === 'เสียชีวิต' && (
              <span
                title="เสียชีวิต"
                className="absolute right-2 top-2 rounded-full border border-red-200 bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow"
              >
                Memorial
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <p className="truncate text-base font-extrabold text-slate-900">
            {profile.rank} {profile.first_name} {profile.last_name}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-sky-700">
            สังกัด {profile.affiliation || '-'} • เหล่า {profile.branch || '-'}
          </p>

          <div className="mt-3 space-y-1.5 text-xs text-slate-700">
            <div className="rounded-md bg-slate-50 px-2 py-1"><span className="font-semibold">เบอร์ติดต่อ:</span>{' '}
              {primaryPhoneDigits ? (
                <a
                  href={`tel:${primaryPhoneDigits}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-blue-700 underline"
                >
                  <Phone size={12} /> {formatPhone(primaryPhoneDigits)}
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-1"><span className="font-semibold">วันเกิด:</span> {formatBirthDate(profile.date_of_birth)}</div>
            <div className="rounded-md bg-slate-50 px-2 py-1"><span className="font-semibold">ปีเกษียณ (พ.ศ.):</span> {profile.retirement_year ? Number(profile.retirement_year) + 543 : '-'}</div>
            <div className="rounded-md bg-slate-50 px-2 py-1 truncate"><span className="font-semibold">ตำแหน่ง:</span> {profile.position || '-'}</div>
            <div className="rounded-md bg-slate-50 px-2 py-1 line-clamp-2"><span className="font-semibold">การศึกษา:</span> {educationText || '-'}</div>
          </div>
        </div>

        {(onView || canEditProfile || canDeleteProfile) && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
            {onView && (
              <button
                onClick={handleView}
                title="ดูโปรไฟล์"
                className="inline-flex h-7 max-w-full items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-2 text-[11px] font-semibold leading-tight text-slate-700 hover:bg-slate-100"
              >
                ดูโปรไฟล์
              </button>
            )}
            {canEditProfile && (
              <button
                onClick={handleEdit}
                title="แก้ไขข้อมูล"
                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Pencil size={14} /> แก้ไข
              </button>
            )}
            {canDeleteProfile && (
              <button
                onClick={handleDelete}
                title="ลบข้อมูล"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 size={14} /> ลบ
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {showDeleteConfirm && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
      >
        <div
          className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-slate-900">ยืนยันการลบข้อมูล</p>
              <p className="mt-1 text-sm text-slate-600">
                &ldquo;{profile.rank} {profile.first_name} {profile.last_name}&rdquo;
              </p>
              <p className="mt-2 text-xs font-medium text-red-600">การดำเนินการนี้ไม่สามารถกู้คืนได้</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(false); onDelete?.(profile.id); }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              ลบข้อมูล
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
