import { formatThaiDate } from '@/lib/profileDocumentExport';

export default function ProfileDocumentTemplate({ profile }) {
  if (!profile) {
    return null;
  }

  const fullName = `${profile.rank || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  const today = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article
      className="mx-auto w-full max-w-[210mm] min-h-[297mm] border border-red-900 bg-white p-[14mm] text-[15px] leading-relaxed text-gray-900 shadow-md"
      style={{ fontFamily: "'TH Sarabun New', 'Sarabun', Tahoma, sans-serif" }}
    >
      <header className="mb-5 border-b-[3px] border-double border-red-900 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-20" />
          <div className="text-center">
            <img src="/garuda-seal.svg" alt="ตราครุฑ" className="mx-auto mb-2 h-16 w-16 object-contain" />
            <p className="text-base font-bold text-red-900">แบบฟอร์มข้อมูลประวัติส่วนบุคคล</p>
            <h1 className="text-3xl font-extrabold tracking-wide text-red-900">ทำเนียบรุ่นเตรียมทหาร CRMA42</h1>
            <p className="text-sm text-gray-700">ใช้สำหรับการจัดเก็บข้อมูลและออกเอกสารอ้างอิงภายในระบบ</p>
          </div>
          <div className="w-20 text-right text-sm leading-6 text-gray-700">
            <p>เลขที่เอกสาร: CRMA42-{profile.id || '-'}</p>
            <p>วันที่พิมพ์: {today}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 border border-red-200 p-3 md:grid-cols-[45mm_1fr]">
        <div className="space-y-3">
          <div className="h-[58mm] w-full overflow-hidden border border-gray-500 bg-white">
            {profile.profile_photo ? (
              <img src={profile.profile_photo} alt="profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">ไม่มีรูปประจำตัว</div>
            )}
          </div>

          <div className="h-16 w-full overflow-hidden border border-gray-500 bg-white p-1">
            {profile.signature_image ? (
              <img src={profile.signature_image} alt="signature" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">ไม่มีลายเซ็น</div>
            )}
          </div>
          <p className="text-center text-xs text-gray-600">ภาพถ่ายและลายมือชื่อเจ้าของประวัติ</p>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <p><strong>เลขประจำตัวทหาร:</strong> {profile.military_id || '-'}</p>
            <p><strong>ยศ:</strong> {profile.rank === 'อื่นๆ' ? profile.custom_rank : profile.rank}</p>
            <p><strong>ชื่อ-นามสกุล:</strong> {fullName || '-'}</p>
            <p><strong>ชื่อเล่น:</strong> {profile.nickname || '-'}</p>
            <p><strong>เหล่า:</strong> {profile.branch === 'อื่นๆ' ? profile.custom_branch : profile.branch}</p>
            <p><strong>สังกัด:</strong> {profile.affiliation === 'อื่นๆ' ? profile.custom_affiliation : profile.affiliation}</p>
            <p><strong>ตำแหน่ง:</strong> {profile.position || '-'}</p>
            <p><strong>วันเดือนปีเกิด:</strong> {formatThaiDate(profile.date_of_birth)}</p>
            <p><strong>ปีเกษียณ:</strong> {profile.retirement_year ? `พ.ศ. ${Number(profile.retirement_year) + 543}` : '-'}</p>
            <p><strong>สถานะ:</strong> {profile.status || '-'}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 border border-gray-400 p-3">
        <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-bold text-red-900">1. ข้อมูลติดต่อ</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <p><strong>เบอร์โทรศัพท์หลัก:</strong> {profile.contacts?.phone_primary || '-'}</p>
          <p><strong>เบอร์โทรศัพท์รอง:</strong> {profile.contacts?.phone_secondary || '-'}</p>
          <p><strong>อีเมล:</strong> {profile.contacts?.email || '-'}</p>
          <p><strong>Line ID:</strong> {profile.contacts?.line_id || '-'}</p>
        </div>
      </section>

      <section className="mt-3 border border-gray-400 p-3">
        <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-bold text-red-900">2. ข้อมูลที่อยู่ตามทะเบียนบ้าน</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <p><strong>เลขที่บ้าน:</strong> {profile.address?.house_number || '-'}</p>
          <p><strong>ซอย:</strong> {profile.address?.alley || '-'}</p>
          <p><strong>ถนน:</strong> {profile.address?.road || '-'}</p>
          <p><strong>จังหวัด:</strong> {profile.address?.province || '-'}</p>
          <p><strong>อำเภอ/เขต:</strong> {profile.address?.district || '-'}</p>
          <p><strong>ตำบล/แขวง:</strong> {profile.address?.subdistrict || '-'}</p>
          <p><strong>รหัสไปรษณีย์:</strong> {profile.address?.postal_code || '-'}</p>
        </div>
      </section>

      <footer className="mt-7 border-t border-red-900 pt-4 text-sm">
        <p className="mb-3 text-gray-700">ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นเป็นความจริงทุกประการ</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="text-center">
            <p className="mb-8">ลงชื่อ ........................................................</p>
            <p>({fullName || '....................................................'})</p>
            <p>เจ้าของประวัติ</p>
          </div>
          <div className="text-center">
            <p className="mb-8">ลงชื่อ ........................................................</p>
            <p>(........................................................)</p>
            <p>ผู้ตรวจสอบข้อมูล</p>
          </div>
        </div>
      </footer>
    </article>
  );
}
