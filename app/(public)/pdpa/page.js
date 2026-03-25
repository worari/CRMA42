import Link from 'next/link';
import { CURRENT_PDPA_VERSION, PDPA_POLICY_SUMMARY } from '@/lib/pdpa';

export default function PdpaPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h1>
        <p className="mt-2 text-sm text-gray-500">เวอร์ชัน {CURRENT_PDPA_VERSION}</p>

        <div className="mt-5 space-y-3 text-sm text-gray-700">
          {PDPA_POLICY_SUMMARY.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          หากมีการปรับปรุงเวอร์ชันนโยบาย ระบบอาจร้องขอให้ผู้ใช้งานยืนยันความยินยอมใหม่อีกครั้งก่อนใช้งานต่อ
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">ผลกระทบเมื่อถอนความยินยอม (Revoke Consent)</p>
          <p className="mt-2">- จะไม่สามารถใช้งานหน้าที่ต้องยืนยันตัวตนต่อได้ จนกว่าจะยินยอมใหม่</p>
          <p>- ระบบจะหยุดประมวลผลข้อมูลส่วนบุคคลในฟังก์ชันที่อาศัยความยินยอม</p>
          <p>- ประวัติการยินยอม/ถอนความยินยอมจะถูกบันทึกไว้เพื่อการตรวจสอบ</p>
        </div>

        <div className="mt-6">
          <Link href="/register" className="text-blue-700 hover:underline">กลับไปหน้าสมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
}
