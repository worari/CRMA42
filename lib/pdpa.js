export const CURRENT_PDPA_VERSION =
  process.env.NEXT_PUBLIC_PDPA_VERSION ||
  process.env.PDPA_VERSION ||
  'v1.0';

export function needsPdpaReconsent(user) {
  if (!user?.pdpa_consent) {
    return true;
  }

  return (user?.pdpa_version || '') !== CURRENT_PDPA_VERSION;
}

export const PDPA_POLICY_SUMMARY = [
  'ระบบเก็บข้อมูลส่วนบุคคลเพื่อจัดการทำเนียบรุ่นและกิจกรรมที่เกี่ยวข้อง',
  'ข้อมูลอาจถูกใช้เพื่อการติดต่อสื่อสารและแจ้งเตือนผ่าน LINE/อีเมล',
  'ผู้ใช้งานสามารถขอแก้ไขหรือถอนความยินยอมได้ตามช่องทางที่กำหนด',
];
