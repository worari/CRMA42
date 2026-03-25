'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { alumniAPI, authAPI } from '@/lib/api';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import ProfileDocumentTemplate from '@/components/ProfileDocumentTemplate';
import { exportProfilePdf, exportProfileWord } from '@/lib/profileDocumentExport';
import { useAuthStore } from '@/lib/store';

function formatThaiDate(value) {
  if (!value) {
    return '-';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) {
    return '-';
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return '-';
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    const prevMonthDate = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonthDate.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return `${years} ปี ${months} เดือน ${days} วัน`;
}

function calculateAge(isoDate) {
  if (!isoDate) {
    return '-';
  }
  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) {
    return '-';
  }

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    return '-';
  }

  return `${years} ปี ${months} เดือน`;
}

export default function ProfileDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const contentRef = useRef(null);
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingPdpa, setRevokingPdpa] = useState(false);
  const showReadOnlyNotice = searchParams.get('readonly') === '1';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await alumniAPI.getById(params.id);
        setProfile(response.data);
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params.id]);

  const handleExportWord = () => {
    exportProfileWord(contentRef.current, `profile-${params.id}.doc`);
  };

  const handleExportPdf = async () => {
    await exportProfilePdf(contentRef.current, `profile-${params.id}.pdf`);
  };

  const canRevokeOwnPdpa = !!authUser?.id;

  const ownPdpaStatusLabel = authUser?.pdpa_consent ? 'ยินยอมแล้ว' : 'ยังไม่ยินยอม';
  const ownPdpaStatusClass = authUser?.pdpa_consent
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';

  const handleRevokePdpa = async () => {
    const confirmed = window.confirm('การถอนความยินยอม PDPA จะทำให้ไม่สามารถใช้งานระบบต่อได้จนกว่าจะยินยอมใหม่ ต้องการดำเนินการต่อหรือไม่?');
    if (!confirmed) {
      return;
    }

    try {
      setRevokingPdpa(true);
      await authAPI.revokePdpaConsent();
      alert('ถอนความยินยอม PDPA เรียบร้อย ระบบจะออกจากระบบทันที');
      logout();
      localStorage.removeItem('auth');
      router.replace('/login?pdpa_revoked=1');
    } catch (err) {
      alert(err?.response?.data?.message || 'ไม่สามารถถอนความยินยอมได้');
    } finally {
      setRevokingPdpa(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-slate-500 mt-4 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'ไม่พบประวัติ'}</p>
        <button
          onClick={() => router.back()}
          className="ux-btn-secondary px-4 py-2"
        >
          กลับไป
        </button>
      </div>
    );
  }

  const maritalStatusText = profile.marital_status === 'อื่นๆ'
    ? (profile.custom_marital_status || '-')
    : (profile.marital_status || '-');

  const educationSummaryItems = profile.education_history?.length
    ? profile.education_history
      .map((item) => {
        if (!item.course_name) {
          return '';
        }
        const classText = item.class_no ? ` รุ่น ${item.class_no}` : '';
        const yearText = item.graduated_year ? ` (${Number(item.graduated_year) + 543})` : '';
        return `${item.course_name}${classText}${yearText}`;
      })
      .filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#0d3b66] hover:text-[#0a2f52] font-semibold"
      >
        <ArrowLeft size={20} />
        กลับไป
      </button>

      <div className="ux-card p-6 md:p-8">
        {showReadOnlyNotice && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>ผู้ดูแลระบบปิดสิทธิ์แก้ไขข้อมูลสำหรับผู้ใช้ทั่วไปชั่วคราว ขณะนี้คุณอยู่ในโหมดดูข้อมูลอย่างเดียว</p>
            <button
              type="button"
              onClick={() => router.push('/directory')}
              className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              กลับไปค้นหา
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {profile.profile_photo ? (
              <div className="h-48 w-36 overflow-hidden rounded-xl ring-4 ring-gray-200 bg-gray-50 flex items-center justify-center">
                <img
                  src={profile.profile_photo}
                  alt={profile.first_name}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-48 w-36 rounded-xl bg-blue-100 flex items-center justify-center ring-4 ring-gray-200">
                <span className="text-blue-800 font-bold text-6xl">
                  {profile.first_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profile.rank} {profile.first_name} {profile.last_name}
            </h1>

            {canRevokeOwnPdpa && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${ownPdpaStatusClass}`}>
                  PDPA: {ownPdpaStatusLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-700">
                  เวอร์ชัน: {authUser?.pdpa_version || '-'}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-700">
                  ยืนยันล่าสุด: {authUser?.pdpa_consent_at ? new Date(authUser.pdpa_consent_at).toLocaleString('th-TH') : '-'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <p className="text-gray-600">เลขประจำตัวทหาร</p>
                <p className="font-medium text-gray-900">{profile.military_id}</p>
              </div>

              <div>
                <p className="text-gray-600">สังกัด</p>
                <p className="font-medium text-gray-900">
                  {profile.affiliation === 'อื่นๆ' ? profile.custom_affiliation : profile.affiliation}
                </p>
              </div>

              <div>
                <p className="text-gray-600">เหล่า</p>
                <p className="font-medium text-gray-900">
                  {profile.branch === 'อื่นๆ' ? profile.custom_branch : profile.branch}
                </p>
              </div>

              <div>
                <p className="text-gray-600">ตำแหน่ง</p>
                <p className="font-medium text-gray-900">{profile.position || '-'}</p>
              </div>

              <div>
                <p className="text-gray-600">วุฒิการศึกษา</p>
                {educationSummaryItems.length ? (
                  <ul className="font-medium text-gray-900 list-disc list-inside space-y-0.5">
                    {educationSummaryItems.map((item, index) => (
                      <li key={`edu-summary-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-medium text-gray-900">-</p>
                )}
              </div>

              <div>
                <p className="text-gray-600">วันเดือนปีเกิด</p>
                <p className="font-medium text-gray-900">
                  {new Date(profile.date_of_birth).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-gray-600">ปีเกษียณ</p>
                <p className="font-medium text-gray-900">{profile.retirement_year ? Number(profile.retirement_year) + 543 : '-'}</p>
              </div>

              <div>
                <p className="text-gray-600">สถานภาพ</p>
                <p className="font-medium text-gray-900">{maritalStatusText}</p>
              </div>

              <div>
                <p className="text-gray-600">กลุ่มเลือด</p>
                <p className="font-medium text-gray-900">{profile.blood_group || '-'}</p>
              </div>

              <div>
                <p className="text-gray-600">ศาสนา</p>
                <p className="font-medium text-gray-900">{profile.religion === 'อื่นๆ' ? profile.custom_religion || '-' : (profile.religion || '-')}</p>
              </div>
            </div>

            {/* Memorial Section for Deceased */}
            {profile.status === 'เสียชีวิต' && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-slate-700 text-lg">🕊️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">ดาวแห่งความทรงจำ</h3>
                </div>
                <p className="text-slate-700 mb-4">
                  เพื่อนร่วมรุ่นของเรา {profile.rank} {profile.first_name} {profile.last_name} 
                  ได้จากเราไปแล้ว แต่ความทรงจำและความดีงามยังคงอยู่ในใจเราเสมอ
                </p>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h4 className="font-medium text-gray-900 mb-2">ข้อความไว้อาลัย</h4>
                  <p className="text-gray-600 italic">
                    &quot;เพื่อนที่รัก คุณจะอยู่ในใจเราเสมอ ขอให้พบแต่ความสุขในที่แห่งนั้น&quot;
                  </p>
                  <p className="text-sm text-gray-500 mt-2">- จากเพื่อนร่วมรุ่น</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push(`/form/${profile.id}`)}
                className="ux-btn-secondary px-6 py-2"
              >
                แก้ไข
              </button>
              <button
                onClick={() => router.push(`/profile/${profile.id}/print`)}
                className="ux-btn-primary px-6 py-2"
              >
                พิมพ์เอกสาร
              </button>
              <button
                onClick={handleExportWord}
                className="ux-btn-primary inline-flex items-center gap-2 px-6 py-2"
              >
                <FileText size={16} />
                Word
              </button>
              <button
                onClick={handleExportPdf}
                className="ux-btn-primary inline-flex items-center gap-2 px-6 py-2"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={() => window.history.back()}
                className="ux-btn-neutral px-6 py-2"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {profile.contacts && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">ข้อมูลติดต่อ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">เบอร์โทรศัพท์หลัก</p>
                <p className="font-medium text-gray-900">{profile.contacts.phone_primary || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">เบอร์โทรศัพท์สอง</p>
                <p className="font-medium text-gray-900">{profile.contacts.phone_secondary || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">อีเมล</p>
                <p className="font-medium text-gray-900">{profile.contacts.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Line ID</p>
                <p className="font-medium text-gray-900">{profile.contacts.line_id || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        {profile.address && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">ที่อยู่</h2>
            <div className="text-sm text-gray-900">
              {profile.address.house_number && <p>{profile.address.house_number}</p>}
              {profile.address.road && <p>{profile.address.road}</p>}
              {profile.address.subdistrict && <p>ตำบล {profile.address.subdistrict}</p>}
              {profile.address.district && <p>อำเภอ {profile.address.district}</p>}
              {profile.address.province && <p>จังหวัด {profile.address.province}</p>}
              {profile.address.postal_code && <p>{profile.address.postal_code}</p>}
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 gap-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">ประวัติยศ</h2>
            {profile.rank_history?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">ชั้นยศ/อัตรา</th>
                      <th className="px-3 py-2 text-left">ตั้งแต่</th>
                      <th className="px-3 py-2 text-left">ถึง</th>
                      <th className="px-3 py-2 text-left">รวมระยะเวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.rank_history.map((item, index) => (
                      <tr key={`rank-${index}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.rank_name || item.rank || '-'}</td>
                        <td className="px-3 py-2">{formatThaiDate(item.start_date)}</td>
                        <td className="px-3 py-2">{formatThaiDate(item.end_date)}</td>
                        <td className="px-3 py-2">{calculateDuration(item.start_date, item.end_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">ประวัติตำแหน่ง</h2>
            {profile.position_history?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">ชื่อตำแหน่ง</th>
                      <th className="px-3 py-2 text-left">ตั้งแต่</th>
                      <th className="px-3 py-2 text-left">ถึง</th>
                      <th className="px-3 py-2 text-left">รวมระยะเวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.position_history.map((item, index) => (
                      <tr key={`position-${index}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.position_name || '-'}</td>
                        <td className="px-3 py-2">{formatThaiDate(item.start_date)}</td>
                        <td className="px-3 py-2">{formatThaiDate(item.end_date)}</td>
                        <td className="px-3 py-2">{calculateDuration(item.start_date, item.end_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">ประวัติการศึกษา</h2>
            {profile.education_history?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">หลักสูตร</th>
                      <th className="px-3 py-2 text-left">รุ่นที่</th>
                      <th className="px-3 py-2 text-left">ปีสำเร็จ (พ.ศ.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.education_history.map((item, index) => (
                      <tr key={`education-${index}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.course_name || '-'}</td>
                        <td className="px-3 py-2">{item.class_no || '-'}</td>
                        <td className="px-3 py-2">{item.graduated_year ? Number(item.graduated_year) + 543 : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">ข้อมูลบุตร</h2>
            {profile.children?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.children.map((child, index) => (
                  <div key={`child-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-900">{child.title || ''} {child.first_name || ''} {child.last_name || ''}</p>
                    <p className="text-gray-600">ชื่อเล่น: {child.nickname || '-'}</p>
                    <p className="text-gray-600">วันเกิด: {formatThaiDate(child.birth_date)}</p>
                    <p className="text-gray-600">อายุ: {calculateAge(child.birth_date)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </section>
        </div>

        {canRevokeOwnPdpa && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-bold text-slate-800">การจัดการความยินยอม PDPA</h3>
            <p className="mt-1 text-sm text-slate-700">
              หากถอนความยินยอม ระบบจะจำกัดการใช้งานจนกว่าจะยินยอมใหม่อีกครั้ง
            </p>
            <button
              type="button"
              onClick={handleRevokePdpa}
              disabled={revokingPdpa}
              className="mt-3 ux-btn-danger px-4 py-2 text-sm disabled:opacity-60"
            >
              {revokingPdpa ? 'กำลังดำเนินการ...' : 'ถอนความยินยอม PDPA'}
            </button>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
        <div ref={contentRef}>
          <ProfileDocumentTemplate profile={profile} />
        </div>
      </div>
    </div>
  );
}
