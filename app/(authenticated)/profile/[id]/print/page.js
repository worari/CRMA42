'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react';
import { alumniAPI } from '@/lib/api';
import ProfileDocumentTemplate from '@/components/ProfileDocumentTemplate';
import { exportProfilePdf, exportProfileWord } from '@/lib/profileDocumentExport';

export default function ProfilePrintPage() {
  const params = useParams();
  const router = useRouter();
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await alumniAPI.getById(params.id);
        setProfile(response.data);
      } catch (err) {
        setError('ไม่สามารถโหลดข้อมูลเอกสารได้');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    await exportProfilePdf(contentRef.current, `profile-${params.id}.pdf`);
  };

  const handleExportWord = () => {
    exportProfileWord(contentRef.current, `profile-${params.id}.doc`);
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-700">กำลังโหลดเอกสาร...</div>;
  }

  if (error || !profile) {
    return <div className="py-16 text-center text-red-700">{error || 'ไม่พบข้อมูลประวัติ'}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="ux-btn-secondary inline-flex items-center gap-2 px-4 py-2"
        >
          <ArrowLeft size={16} />
          กลับ
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="ux-btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Printer size={16} />
            พิมพ์
          </button>
          <button
            type="button"
            onClick={handleExportWord}
            className="ux-btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <FileText size={16} />
            Word
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="ux-btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Download size={16} />
            PDF
          </button>
        </div>
      </div>

      <div ref={contentRef}>
        <ProfileDocumentTemplate profile={profile} />
      </div>
    </div>
  );
}
