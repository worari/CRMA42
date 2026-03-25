'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, UploadCloud, CheckCircle2, Search } from 'lucide-react';
import { alumniAPI, authAPI } from '@/lib/api';
import AlumniCard from '@/components/AlumniCard';
import { useAuthStore } from '@/lib/store';
import * as XLSX from 'xlsx';

const REQUIRED_HEADERS = ['military_id', 'first_name', 'last_name'];
const IMPORT_TEMPLATE_COLUMNS = [
  { key: 'military_id', label: 'military_id', width: 16, required: true, example: '1234567890' },
  { key: 'first_name', label: 'first_name', width: 18, required: true, example: 'สมชาย' },
  { key: 'last_name', label: 'last_name', width: 20, required: true, example: 'ใจดี' },
  { key: 'nickname', label: 'nickname', width: 16, example: 'ชาย' },
  { key: 'rank', label: 'rank', width: 14, example: 'พ.อ.' },
  { key: 'position', label: 'position', width: 26, example: 'ผู้บังคับการ' },
  { key: 'branch', label: 'branch', width: 14, example: 'ร.' },
  { key: 'affiliation', label: 'affiliation', width: 16, example: 'ทบ.' },
  { key: 'blood_group', label: 'blood_group', width: 14, example: 'A' },
  { key: 'religion', label: 'religion', width: 14, example: 'พุทธ' },
  { key: 'date_of_birth', label: 'date_of_birth', width: 16, example: '1970-01-01' },
  { key: 'retirement_year', label: 'retirement_year', width: 14, example: '2030' },
  { key: 'phone_primary', label: 'phone_primary', width: 16, example: '0812345678' },
  { key: 'phone_secondary', label: 'phone_secondary', width: 16, example: '0898765432' },
  { key: 'email', label: 'email', width: 28, example: 'sample@example.com' },
  { key: 'line_id', label: 'line_id', width: 18, example: 'somchai.line' },
  { key: 'house_number', label: 'house_number', width: 14, example: '99/1' },
  { key: 'alley', label: 'alley', width: 16, example: 'พหลโยธิน 12' },
  { key: 'road', label: 'road', width: 18, example: 'พหลโยธิน' },
  { key: 'subdistrict', label: 'subdistrict', width: 18, example: 'สามเสนใน' },
  { key: 'district', label: 'district', width: 18, example: 'พญาไท' },
  { key: 'province', label: 'province', width: 20, example: 'กรุงเทพมหานคร' },
  { key: 'postal_code', label: 'postal_code', width: 14, example: '10400' },
  { key: 'status', label: 'status', width: 14, example: 'active' },
];
const EXPORT_COLUMNS = [
  ...IMPORT_TEMPLATE_COLUMNS,
  { key: 'education_summary', label: 'education_summary', width: 34, example: 'รร.เสธ.ทบ. รุ่น 1 | วปอ. รุ่น 55' },
];

const HEADER_ALIASES = {
  military_id: ['military_id', 'เลขประจำตัวทหาร', 'รหัสทหาร', 'เลขทหาร'],
  first_name: ['first_name', 'ชื่อ', 'name'],
  last_name: ['last_name', 'นามสกุล', 'surname', 'lastname'],
  nickname: ['nickname', 'ชื่อเล่น'],
  rank: ['rank', 'ยศ'],
  position: ['position', 'ตำแหน่ง'],
  branch: ['branch', 'เหล่า', 'สาขา'],
  affiliation: ['affiliation', 'สังกัด'],
  blood_group: ['blood_group', 'กลุ่มเลือด'],
  religion: ['religion', 'ศาสนา'],
  date_of_birth: ['date_of_birth', 'วันเกิด', 'วันเดือนปีเกิด'],
  phone_primary: ['phone_primary', 'เบอร์โทร', 'เบอร์โทรหลัก'],
  phone_secondary: ['phone_secondary', 'เบอร์โทรรอง'],
  email: ['email', 'อีเมล'],
  line_id: ['line_id', 'ไลน์', 'line'],
  house_number: ['house_number', 'เลขที่บ้าน'],
  alley: ['alley', 'ซอย'],
  road: ['road', 'ถนน'],
  subdistrict: ['subdistrict', 'ตำบล', 'แขวง'],
  district: ['district', 'อำเภอ', 'เขต'],
  province: ['province', 'จังหวัด'],
  postal_code: ['postal_code', 'รหัสไปรษณีย์'],
};

function normalizeText(value) {
  return String(value || '').trim();
}

function buildSheetFromColumns(rows, columns = EXPORT_COLUMNS) {
  const orderedRows = rows.map((row) =>
    columns.reduce((result, column) => {
      result[column.label] = row[column.key] ?? '';
      return result;
    }, {})
  );

  const worksheet = XLSX.utils.json_to_sheet(orderedRows, {
    header: columns.map((column) => column.label),
  });

  worksheet['!cols'] = columns.map((column) => ({ wch: column.width }));
  return worksheet;
}

function buildDirectoryExcelRow(profile) {
  return {
    military_id: normalizeText(profile.military_id),
    first_name: normalizeText(profile.first_name),
    last_name: normalizeText(profile.last_name),
    nickname: normalizeText(profile.nickname),
    rank: normalizeText(profile.rank),
    position: normalizeText(profile.position),
    branch: normalizeText(profile.branch),
    affiliation: normalizeText(getAffiliationValue(profile)),
    blood_group: normalizeText(profile.blood_group),
    religion: normalizeText(profile.religion),
    date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().slice(0, 10) : '',
    retirement_year: normalizeText(profile.retirement_year),
    phone_primary: normalizeText(profile.contacts?.phone_primary || profile.phone_primary),
    phone_secondary: normalizeText(profile.contacts?.phone_secondary || profile.phone_secondary),
    email: normalizeText(profile.contacts?.email || profile.email),
    line_id: normalizeText(profile.contacts?.line_id || profile.line_id),
    house_number: normalizeText(profile.address?.house_number || profile.house_number),
    alley: normalizeText(profile.address?.alley || profile.alley),
    road: normalizeText(profile.address?.road || profile.road),
    subdistrict: normalizeText(profile.address?.subdistrict || profile.subdistrict),
    district: normalizeText(profile.address?.district || profile.district),
    province: normalizeText(profile.address?.province || profile.province),
    postal_code: normalizeText(profile.address?.postal_code || profile.postal_code),
    education_summary: normalizeText(profile.education_summary),
    status: normalizeText(profile.status),
  };
}

function normalizeHeader(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

const AFFILIATION_PRIORITY = ['ทบ.', 'กห.สป.', 'บก.ทท.', 'สทป.', 'ทม.รอ.'];
const RANK_PRIORITY = [
  'จอมพล', 'พล.อ.', 'พล.ท.', 'พล.ต.',
  'พ.อ.(พ.)', 'พ.อ.', 'พ.ท.', 'พ.ต.',
  'ร.อ.', 'ร.ท.', 'ร.ต.',
  'จ.ส.อ.', 'ส.อ.', 'อส.ทพ.',
  'พล.อ.(พ.)', 'พล.ท.(พ.)', 'พล.ต.(พ.)',
];
const PAGE_SIZE = 5;
const AFFILIATION_THEME = {
  'ทบ.': {
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    chipActive: 'border-emerald-600 bg-emerald-600 text-white',
    badge: 'bg-emerald-600 text-white',
  },
  'กห.สป.': {
    chip: 'border-blue-200 bg-blue-50 text-blue-800',
    chipActive: 'border-blue-600 bg-blue-600 text-white',
    badge: 'bg-blue-700 text-white',
  },
  'บก.ทท.': {
    chip: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    chipActive: 'border-cyan-600 bg-cyan-600 text-white',
    badge: 'bg-cyan-700 text-white',
  },
  'สทป.': {
    chip: 'border-teal-200 bg-teal-50 text-teal-800',
    chipActive: 'border-teal-600 bg-teal-600 text-white',
    badge: 'bg-teal-700 text-white',
  },
  'ทม.รอ.': {
    chip: 'border-sky-200 bg-sky-50 text-sky-800',
    chipActive: 'border-sky-600 bg-sky-600 text-white',
    badge: 'bg-sky-700 text-white',
  },
  default: {
    chip: 'border-slate-200 bg-slate-50 text-slate-700',
    chipActive: 'border-slate-600 bg-slate-600 text-white',
    badge: 'bg-slate-600 text-white',
  },
};

function getAffiliationTheme(affiliation) {
  return AFFILIATION_THEME[affiliation] || AFFILIATION_THEME.default;
}

function getAffiliationValue(item) {
  return (item.affiliation === 'อื่นๆ' ? item.custom_affiliation : item.affiliation) || 'ไม่ระบุ';
}

function sortAffiliation(a, b) {
  const aText = normalizeText(a);
  const bText = normalizeText(b);
  const aIndex = AFFILIATION_PRIORITY.indexOf(aText);
  const bIndex = AFFILIATION_PRIORITY.indexOf(bText);

  if (aIndex !== -1 && bIndex !== -1) {
    return aIndex - bIndex;
  }
  if (aIndex !== -1) {
    return -1;
  }
  if (bIndex !== -1) {
    return 1;
  }

  return aText.localeCompare(bText, 'th');
}

function parseDateValue(value) {
  if (!value && value !== 0) {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      const iso = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      return iso;
    }
  }

  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function calculateRetirementYear(isoDate) {
  if (!isoDate) {
    return 2025;
  }

  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) {
    return 2025;
  }

  let retirementYear = birth.getFullYear() + 60;
  const bornAfterSep30 = birth.getMonth() > 8 || (birth.getMonth() === 8 && birth.getDate() > 30);
  if (bornAfterSep30) {
    retirementYear += 1;
  }

  return retirementYear;
}

function getColumnValue(row, fieldName) {
  const rowKeys = Object.keys(row);
  const aliases = HEADER_ALIASES[fieldName] || [fieldName];

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const found = rowKeys.find((key) => normalizeHeader(key) === normalizedAlias);
    if (found) {
      return row[found];
    }
  }

  return '';
}

function buildPayloadFromRow(row) {
  const militaryId = normalizeText(getColumnValue(row, 'military_id')).replace(/\D/g, '').slice(0, 10);
  const firstName = normalizeText(getColumnValue(row, 'first_name'));
  const lastName = normalizeText(getColumnValue(row, 'last_name'));

  if (!militaryId || !firstName || !lastName) {
    return { valid: false, reason: 'ข้อมูลจำเป็นไม่ครบ (military_id/first_name/last_name)' };
  }

  const birthDate = parseDateValue(getColumnValue(row, 'date_of_birth')) || '1970-01-01';
  const retirementYearText = normalizeText(getColumnValue(row, 'retirement_year')).replace(/\D/g, '');
  const retirementYear = retirementYearText ? Number(retirementYearText) : calculateRetirementYear(birthDate);

  return {
    valid: true,
    payload: {
      profile_photo: '',
      military_id: militaryId,
      rank: normalizeText(getColumnValue(row, 'rank')) || 'พล.อ.(พ.)',
      custom_rank: '',
      first_name: firstName,
      last_name: lastName,
      nickname: normalizeText(getColumnValue(row, 'nickname')),
      position: normalizeText(getColumnValue(row, 'position')) || 'ไม่ระบุ',
      branch: normalizeText(getColumnValue(row, 'branch')) || 'ร.',
      custom_branch: '',
      affiliation: normalizeText(getColumnValue(row, 'affiliation')) || 'ทบ.',
      custom_affiliation: '',
      blood_group: normalizeText(getColumnValue(row, 'blood_group')),
      religion: normalizeText(getColumnValue(row, 'religion')) || 'พุทธ',
      custom_religion: '',
      status: normalizeText(getColumnValue(row, 'status')) || 'active',
      date_of_birth: birthDate,
      retirement_year: retirementYear,
      signature_image: '',
      contacts: {
        phone_primary: normalizeText(getColumnValue(row, 'phone_primary')).replace(/\D/g, '').slice(0, 10),
        phone_secondary: normalizeText(getColumnValue(row, 'phone_secondary')).replace(/\D/g, '').slice(0, 10),
        email: normalizeText(getColumnValue(row, 'email')),
        line_id: normalizeText(getColumnValue(row, 'line_id')),
      },
      family: {
        sons_count: 0,
        daughters_count: 0,
      },
      address: {
        house_number: normalizeText(getColumnValue(row, 'house_number')),
        alley: normalizeText(getColumnValue(row, 'alley')),
        road: normalizeText(getColumnValue(row, 'road')),
        subdistrict: normalizeText(getColumnValue(row, 'subdistrict')),
        district: normalizeText(getColumnValue(row, 'district')),
        province: normalizeText(getColumnValue(row, 'province')),
        postal_code: normalizeText(getColumnValue(row, 'postal_code')).replace(/\D/g, '').slice(0, 5),
      },
      children: [],
      position_history: [],
      rank_history: [],
      education_history: [],
    },
    preview: {
      military_id: militaryId,
      first_name: firstName,
      last_name: lastName,
      rank: normalizeText(getColumnValue(row, 'rank')) || 'พล.อ.(พ.)',
      position: normalizeText(getColumnValue(row, 'position')) || 'ไม่ระบุ',
      affiliation: normalizeText(getColumnValue(row, 'affiliation')) || 'ทบ.',
    },
  };
}

export default function DirectoryPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const importInputRef = useRef(null);

  const [alumni, setAlumni] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliationFilter, setAffiliationFilter] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [importStatus, setImportStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [pendingImportRows, setPendingImportRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [draftRowErrors, setDraftRowErrors] = useState({});
  const [invalidRows, setInvalidRows] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [allowUserProfileEdit, setAllowUserProfileEdit] = useState(true);
  const [importFileName, setImportFileName] = useState('');
  const [activeAffiliationName, setActiveAffiliationName] = useState('');
  const [currentPageByAffiliation, setCurrentPageByAffiliation] = useState({});

  useEffect(() => {
    setCurrentPageByAffiliation({});
  }, [searchQuery, affiliationFilter, rankFilter]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const response = await alumniAPI.getAll('', '');
      setAlumni(response.data);
    } catch (err) {
      setError('Failed to load alumni list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  useEffect(() => {
    const fetchPermissionPolicy = async () => {
      try {
        const response = await authAPI.getPermissionSettings();
        setAllowUserProfileEdit(Boolean(response?.data?.permissions?.allow_user_profile_edit));
      } catch {
        setAllowUserProfileEdit(true);
      }
    };

    fetchPermissionPolicy();
  }, []);

  const filteredAlumni = useMemo(() => {
    const keyword = normalizeText(searchQuery).toLowerCase();

    return alumni.filter((item) => {
      const affiliationName = getAffiliationValue(item);
      const matchesAffiliation = !affiliationFilter || affiliationName === affiliationFilter;
      const matchesRank = !rankFilter || normalizeText(item.rank) === rankFilter;

      if (!matchesAffiliation || !matchesRank) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchableFields = [
        item.first_name,
        item.last_name,
        item.nickname,
        item.rank,
        item.position,
        item.branch,
        affiliationName,
        item.military_id,
      ];

      return searchableFields.some((field) => normalizeText(field).toLowerCase().includes(keyword));
    });
  }, [alumni, searchQuery, affiliationFilter, rankFilter]);

  const groupedAlumni = useMemo(() => {
    const result = {};

    filteredAlumni.forEach((item) => {
      const affil = getAffiliationValue(item);

      if (!result[affil]) {
        result[affil] = [];
      }
      result[affil].push(item);
    });

    return Object.entries(result)
      .map(([affiliation, members]) => ({
        affiliation,
        members,
      }))
      .sort((a, b) => sortAffiliation(a.affiliation, b.affiliation));
  }, [filteredAlumni]);

  const rankOptions = useMemo(() => {
    const unique = Array.from(
      new Set(alumni.map((item) => normalizeText(item.rank)).filter(Boolean))
    );
    return unique.sort((a, b) => {
      const ai = RANK_PRIORITY.indexOf(a);
      const bi = RANK_PRIORITY.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b, 'th');
    });
  }, [alumni]);

  const affiliationOptions = useMemo(() => {
    const options = Array.from(
      new Set(
        alumni
          .map((item) => (item.affiliation === 'อื่นๆ' ? item.custom_affiliation : item.affiliation))
          .filter(Boolean)
      )
    ).sort(sortAffiliation);

    if (affiliationFilter && !options.includes(affiliationFilter)) {
      options.unshift(affiliationFilter);
    }

    return options;
  }, [alumni, affiliationFilter]);

  useEffect(() => {
    if (!groupedAlumni.length) {
      setActiveAffiliationName('');
      return;
    }

    const stillExists = groupedAlumni.some((group) => group.affiliation === activeAffiliationName);
    if (!stillExists) {
      setActiveAffiliationName(groupedAlumni[0].affiliation);
    }
  }, [groupedAlumni, activeAffiliationName]);

  const activeAffiliationIndex = useMemo(() => {
    if (!groupedAlumni.length) {
      return 0;
    }
    const index = groupedAlumni.findIndex((group) => group.affiliation === activeAffiliationName);
    return index >= 0 ? index : 0;
  }, [groupedAlumni, activeAffiliationName]);

  const activeGroup = groupedAlumni[activeAffiliationIndex] || null;
  const isGeneralUserReadOnly = currentUser?.role === 'user' && !allowUserProfileEdit;
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const currentPage = activeGroup ? (currentPageByAffiliation[activeGroup.affiliation] ?? 0) : 0;
  const totalPages = activeGroup ? Math.ceil(activeGroup.members.length / PAGE_SIZE) : 0;
  const pagedMembers = activeGroup
    ? activeGroup.members.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
    : [];

  const moveAffiliation = (direction) => {
    if (!groupedAlumni.length) {
      return;
    }
    const nextIndex = (activeAffiliationIndex + direction + groupedAlumni.length) % groupedAlumni.length;
    setActiveAffiliationName(groupedAlumni[nextIndex].affiliation);
  };

  const setCurrentPage = (affiliation, page) => {
    setCurrentPageByAffiliation((prev) => ({
      ...prev,
      [affiliation]: page,
    }));
  };

  const movePage = (direction) => {
    if (!activeGroup) return;
    const nextPage = Math.max(0, Math.min(totalPages - 1, currentPage + direction));
    setCurrentPage(activeGroup.affiliation, nextPage);
  };

  useEffect(() => {
    if (!activeGroup) {
      return;
    }

    const maxPage = Math.max(0, Math.ceil(activeGroup.members.length / PAGE_SIZE) - 1);
    const page = currentPageByAffiliation[activeGroup.affiliation] ?? 0;
    if (page > maxPage) {
      setCurrentPageByAffiliation((prev) => ({ ...prev, [activeGroup.affiliation]: maxPage }));
    }
  }, [activeGroup, currentPageByAffiliation]);

  const handleExportDirectoryExcel = async () => {
    const exportSource = filteredAlumni;

    if (!exportSource.length) {
      setImportStatus('ไม่มีข้อมูลสำหรับ Export');
      return;
    }

    try {
      setImportStatus('กำลังเตรียมไฟล์ Export Excel...');

      const detailedProfiles = await Promise.all(
        exportSource.map(async (item) => {
          try {
            const response = await alumniAPI.getById(item.id);
            return { ...item, ...(response.data || {}) };
          } catch {
            return item;
          }
        })
      );

      const worksheet = buildSheetFromColumns(detailedProfiles.map(buildDirectoryExcelRow), EXPORT_COLUMNS);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'directory');

      const suffixParts = [affiliationFilter || 'all', rankFilter || 'all-ranks'];
      XLSX.writeFile(workbook, `alumni-directory-${suffixParts.join('-')}.xlsx`);
      setImportStatus(`Export Excel สำเร็จ ${detailedProfiles.length} รายการ`);
    } catch (error) {
      console.error(error);
      setImportStatus('ไม่สามารถ Export Excel ได้');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('แน่ใจหรือว่าต้องการลบประวัตินี้?')) return;

    try {
      await alumniAPI.delete(id);
      setAlumni(alumni.filter((a) => a.id !== id));
    } catch {
      alert('เกิดข้อผิดพลาด ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      IMPORT_TEMPLATE_COLUMNS.reduce((result, column) => {
        result[column.key] = column.example || '';
        return result;
      }, {}),
      IMPORT_TEMPLATE_COLUMNS.reduce((result, column) => {
        result[column.key] = '';
        return result;
      }, {}),
    ];

    const instructionRows = IMPORT_TEMPLATE_COLUMNS.map((column) => ({
      field: column.label,
      required: column.required ? 'yes' : 'no',
      example: column.example || '',
      note: column.required ? 'จำเป็นต้องกรอก' : 'ไม่บังคับ',
    }));

    const templateSheet = buildSheetFromColumns(templateRows, IMPORT_TEMPLATE_COLUMNS);
    const instructionSheet = XLSX.utils.json_to_sheet(instructionRows);
    instructionSheet['!cols'] = [
      { wch: 22 },
      { wch: 10 },
      { wch: 28 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'template');
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'instructions');
    XLSX.writeFile(workbook, 'alumni-import-template.xlsx');
    setImportStatus('ดาวน์โหลดแม่แบบนำเข้าสำเร็จ');
  };

  const downloadCsv = (rows, filename) => {
    if (!rows.length) {
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setImporting(true);
      setImportStatus('กำลังอ่านไฟล์และเตรียมพรีวิว...');

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!rows.length) {
        setImportStatus('ไม่พบข้อมูลในไฟล์');
        setImportStep(0);
        setPendingImportRows([]);
        setPreviewRows([]);
        setDraftRows([]);
        setInvalidRows([]);
        setFailedRows([]);
        return;
      }

      const headers = Object.keys(rows[0] || {}).map((header) => normalizeHeader(header));
      const missing = REQUIRED_HEADERS.filter((required) => {
        const aliases = HEADER_ALIASES[required] || [required];
        return !aliases.some((alias) => headers.includes(normalizeHeader(alias)));
      });

      if (missing.length) {
        setImportStatus(`ไฟล์ขาดคอลัมน์จำเป็น: ${missing.join(', ')}`);
        setImportStep(1);
        setPendingImportRows([]);
        setPreviewRows([]);
        setDraftRows([]);
        setInvalidRows([]);
        setFailedRows([]);
        return;
      }

      const pendingRows = [];
      const previews = [];
      const invalid = [];

      rows.forEach((row, index) => {
        const mapped = buildPayloadFromRow(row);
        if (!mapped.valid) {
          invalid.push({ row: index + 2, reason: mapped.reason });
          return;
        }
        pendingRows.push(mapped.payload);
        previews.push(mapped.preview);
      });

      setPendingImportRows(pendingRows);
      setPreviewRows(previews);
      setDraftRows(pendingRows.map((row) => buildDirectoryExcelRow(row)));
      setDraftRowErrors({});
      setInvalidRows(invalid);
      setFailedRows([]);
      setImportFileName(file.name);
      setImportStep(2);
      setImportStatus(`พร้อมนำเข้า ${pendingRows.length} รายการ`);
    } catch {
      setImportStatus('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบ .xlsx หรือ .csv');
      setImportStep(1);
      setPendingImportRows([]);
      setPreviewRows([]);
      setDraftRows([]);
      setDraftRowErrors({});
      setInvalidRows([]);
      setFailedRows([]);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDraftRowChange = (index, field, value) => {
    setDraftRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setDraftRowErrors((prev) => {
      const next = { ...prev };
      delete next[`${index}-${field}`];
      delete next[`${index}-summary`];
      return next;
    });
  };

  const validateDraftRows = async () => {
    const errors = {};
    const seen = new Set();

    let existingIds = new Set();
    try {
      const response = await alumniAPI.getAll('', '');
      const list = Array.isArray(response.data) ? response.data : [];
      existingIds = new Set(list.map((item) => String(item.military_id || '').trim()));
    } catch {
      // If pre-check source is unavailable, continue with local validation.
    }

    draftRows.forEach((row, index) => {
      const militaryId = normalizeText(row.military_id).replace(/\D/g, '').slice(0, 10);
      const firstName = normalizeText(row.first_name);
      const lastName = normalizeText(row.last_name);

      if (militaryId.length !== 10) {
        errors[`${index}-military_id`] = 'ต้องเป็นเลข 10 หลัก';
      }
      if (!firstName) {
        errors[`${index}-first_name`] = 'ต้องกรอกชื่อ';
      }
      if (!lastName) {
        errors[`${index}-last_name`] = 'ต้องกรอกนามสกุล';
      }

      if (militaryId) {
        if (seen.has(militaryId)) {
          errors[`${index}-military_id`] = 'ซ้ำในไฟล์นำเข้า';
        }
        seen.add(militaryId);

        if (existingIds.has(militaryId)) {
          errors[`${index}-military_id`] = 'ซ้ำกับข้อมูลในระบบ';
        }
      }

      if (errors[`${index}-military_id`] || errors[`${index}-first_name`] || errors[`${index}-last_name`]) {
        errors[`${index}-summary`] = 'ข้อมูลแถวนี้ไม่ครบหรือซ้ำ';
      }
    });

    setDraftRowErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmImport = async () => {
    if (!draftRows.length) {
      return;
    }

    const isValid = await validateDraftRows();
    if (!isValid) {
      setImportStatus('กรุณาแก้ไขข้อมูลที่ไฮไลต์สีแดงก่อนยืนยันนำเข้า');
      return;
    }

    setImporting(true);
    setImportStatus('กำลังนำเข้าข้อมูล...');

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (const draft of draftRows) {
      const mapped = buildPayloadFromRow(draft);
      if (!mapped.valid) {
        failCount += 1;
        failed.push({ ...draft, error: 'ข้อมูลจำเป็นไม่ครบหลังแก้ไข' });
        continue;
      }

      try {
        await alumniAPI.create(mapped.payload);
        successCount += 1;
      } catch {
        failCount += 1;
        failed.push({ ...draft, error: 'บันทึกไม่สำเร็จ (อาจมีข้อมูลซ้ำหรือรูปแบบไม่ถูกต้อง)' });
      }
    }

    setImportStatus(`นำเข้าสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
    setFailedRows(failed);
    setImportStep(3);
    setPendingImportRows([]);
    setPreviewRows([]);
    setDraftRows([]);
    setDraftRowErrors({});
    setInvalidRows([]);
    setImportFileName('');
    setImporting(false);
    fetchAlumni();
  };

  const resetImportWizard = () => {
    setImportStep(0);
    setPendingImportRows([]);
    setPreviewRows([]);
    setDraftRows([]);
    setDraftRowErrors({});
    setInvalidRows([]);
    setFailedRows([]);
    setImportFileName('');
    setImportStatus('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">ทำเนียบรายชื่อกำลังพล</h2>
            <p className="text-sm text-slate-600">ค้นหาชื่อ, ชื่อเล่น หรือหน่วยงาน เช่น ร.1 และกรองตามสังกัดได้แบบทันที</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label htmlFor="search" className="mb-2 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder="พิมพ์ชื่อ, ชื่อเล่น หรือหน่วยงาน เช่น สมชาย, ร.1"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              {isSuperAdmin && (
                <>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                <FileDown size={16} />
                แม่แบบนำเข้า
              </button>

              <button
                type="button"
                onClick={handleExportDirectoryExcel}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0d3b66] bg-[#0d3b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a2f52]"
              >
                <FileDown size={16} />
                Export Excel
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                <UploadCloud size={16} />
                {importing ? 'กำลังประมวลผล...' : 'เลือกไฟล์ Excel/CSV'}
              </button>

              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportFile}
              />

              <button
                onClick={() => router.push('/form')}
                className="rounded-lg border border-emerald-600 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
              >
                + เพิ่มประวัติ
              </button>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Filter ตามสังกัด</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAffiliationFilter('')}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  !affiliationFilter
                    ? 'border-[#0d3b66] bg-[#0d3b66] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({filteredAlumni.length})
              </button>
              {affiliationOptions.map((item) => {
                const theme = getAffiliationTheme(item);
                const isActive = affiliationFilter === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAffiliationFilter(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      isActive ? theme.chipActive : `${theme.chip} hover:brightness-95`
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {rankOptions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Filter ตามยศ</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRankFilter('')}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    !rankFilter
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ทุกยศ
                </button>
                {rankOptions.map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    onClick={() => setRankFilter(rankFilter === rank ? '' : rank)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      rankFilter === rank
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-violet-200 bg-violet-50 text-violet-800 hover:brightness-95'
                    }`}
                  >
                    {rank}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold">ผลการค้นหา:</span>
        <span>{filteredAlumni.length} รายการ</span>
        {isGeneralUserReadOnly && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            โหมดอ่านอย่างเดียวสำหรับผู้ใช้ทั่วไป
          </span>
        )}
        {searchQuery && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">คำค้น: {searchQuery}</span>
        )}
        {affiliationFilter && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getAffiliationTheme(affiliationFilter).badge}`}>
            สังกัด: {affiliationFilter}
          </span>
        )}
        {rankFilter && (
          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
            ยศ: {rankFilter}
          </span>
        )}
      </div>

      {importStatus && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {importStatus}
        </div>
      )}

      {importStep > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <span className={`rounded px-2 py-1 ${importStep >= 1 ? 'bg-slate-100 text-slate-800' : 'bg-gray-100'}`}>1) ตรวจไฟล์</span>
          <span className={`rounded px-2 py-1 ${importStep >= 2 ? 'bg-slate-100 text-slate-800' : 'bg-gray-100'}`}>2) พรีวิว/แก้ไข</span>
          <span className={`rounded px-2 py-1 ${importStep >= 3 ? 'bg-slate-100 text-slate-800' : 'bg-gray-100'}`}>3) สรุปผล</span>
          <button type="button" onClick={resetImportWizard} className="ux-btn-neutral ml-auto px-3 py-1">เริ่มใหม่</button>
        </div>
      )}

      {(previewRows.length > 0 || invalidRows.length > 0 || failedRows.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">พรีวิวการนำเข้า: {importFileName || '-'}</p>
              <p className="text-xs text-gray-600">พร้อมนำเข้า {previewRows.length} รายการ, ข้าม {invalidRows.length} รายการ</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {invalidRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadCsv(invalidRows, 'invalid-import-rows.csv')}
                  className="ux-btn-danger px-3 py-2 text-red-700"
                >
                  ดาวน์โหลดแถวที่ข้าม
                </button>
              )}
              {draftRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadCsv(draftRows, 'import-preview-edited.csv')}
                  className="ux-btn-secondary px-3 py-2"
                >
                  ส่งออกพรีวิวที่แก้แล้ว
                </button>
              )}
              {failedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadCsv(failedRows, 'failed-import-rows.csv')}
                  className="ux-btn-danger px-3 py-2 text-red-700"
                >
                  ดาวน์โหลดแถวที่ไม่สำเร็จ
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!draftRows.length || importing}
                className="ux-btn-primary inline-flex items-center gap-2 px-4 py-2 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                ยืนยันนำเข้า
              </button>
            </div>
          </div>

          {draftRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">military_id</th>
                    <th className="px-3 py-2 text-left">ชื่อ</th>
                    <th className="px-3 py-2 text-left">นามสกุล</th>
                    <th className="px-3 py-2 text-left">ยศ</th>
                    <th className="px-3 py-2 text-left">ตำแหน่ง</th>
                    <th className="px-3 py-2 text-left">สังกัด</th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.slice(0, 30).map((row, index) => (
                    <tr key={`preview-${index}`} className="border-t border-gray-100">
                      <td className="px-3 py-2"><input value={row.military_id} onChange={(e) => handleDraftRowChange(index, 'military_id', e.target.value)} className={`w-32 rounded border px-2 py-1 ${draftRowErrors[`${index}-military_id`] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></td>
                      <td className="px-3 py-2"><input value={row.first_name} onChange={(e) => handleDraftRowChange(index, 'first_name', e.target.value)} className={`w-28 rounded border px-2 py-1 ${draftRowErrors[`${index}-first_name`] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></td>
                      <td className="px-3 py-2"><input value={row.last_name} onChange={(e) => handleDraftRowChange(index, 'last_name', e.target.value)} className={`w-28 rounded border px-2 py-1 ${draftRowErrors[`${index}-last_name`] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></td>
                      <td className="px-3 py-2"><input value={row.rank} onChange={(e) => handleDraftRowChange(index, 'rank', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1" /></td>
                      <td className="px-3 py-2"><input value={row.position} onChange={(e) => handleDraftRowChange(index, 'position', e.target.value)} className="w-40 rounded border border-gray-300 px-2 py-1" /></td>
                      <td className="px-3 py-2"><input value={row.affiliation} onChange={(e) => handleDraftRowChange(index, 'affiliation', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(draftRowErrors).length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">พบข้อมูลต้องแก้ไขในพรีวิว:</p>
              <div className="mt-1 space-y-1">
                {draftRows.slice(0, 30).map((_, index) => {
                  const summary = draftRowErrors[`${index}-summary`];
                  if (!summary) {
                    return null;
                  }
                  return <p key={`summary-${index}`}>แถว {index + 1}: {summary}</p>;
                })}
              </div>
            </div>
          )}

          {invalidRows.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">รายการที่ข้าม:</p>
              <div className="mt-1 space-y-1">
                {invalidRows.slice(0, 10).map((item, index) => (
                  <p key={`invalid-${index}`}>แถว {item.row}: {item.reason}</p>
                ))}
              </div>
            </div>
          )}

          {failedRows.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">รายการที่บันทึกไม่สำเร็จ:</p>
              <div className="mt-1 space-y-1">
                {failedRows.slice(0, 10).map((item, index) => (
                  <p key={`failed-${index}`}>{item.military_id || '-'} {item.first_name || ''} {item.last_name || ''}: {item.error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-slate-500 mt-4 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      ) : groupedAlumni.length > 0 ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => moveAffiliation(-1)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                aria-label="สังกัดก่อนหน้า"
              >
                ← ก่อนหน้า
              </button>

              <p className="text-center text-sm font-semibold text-slate-700">
                เลือกสังกัดจากปุ่มด้านล่าง
              </p>

              <button
                type="button"
                onClick={() => moveAffiliation(1)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                aria-label="สังกัดถัดไป"
              >
                ถัดไป →
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {groupedAlumni.map((group, index) => {
                const theme = getAffiliationTheme(group.affiliation);
                return (
                  <button
                    key={group.affiliation}
                    type="button"
                    onClick={() => setActiveAffiliationName(group.affiliation)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      index === activeAffiliationIndex ? theme.chipActive : `${theme.chip} hover:brightness-95`
                    }`}
                  >
                    {group.affiliation} ({group.members.length} นาย)
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-center gap-1.5">
              {groupedAlumni.map((group, index) => {
                const active = index === activeAffiliationIndex;
                return (
                  <button
                    key={`dot-${group.affiliation}`}
                    type="button"
                    onClick={() => setActiveAffiliationName(group.affiliation)}
                    aria-label={`ไปสังกัด ${group.affiliation}`}
                    className={`h-2.5 rounded-full transition-all ${
                      active ? 'w-6 bg-[#0d3b66]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {activeGroup && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-[#0d3b66] to-sky-700 px-5 py-5 text-white sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="inline-flex items-center gap-2 text-xl font-black">
                      <span className={`rounded-lg px-2 py-1 shadow-sm ${getAffiliationTheme(activeGroup.affiliation).badge}`}>AFF</span>
                      สังกัด: {activeGroup.affiliation}
                    </h3>
                    <p className="mt-2 text-sm text-slate-200">แสดงข้อมูลแบบสไลด์แนวนอน หน้าละ {PAGE_SIZE} นาย พร้อมปุ่มเลื่อนและเลขหน้า</p>
                  </div>

                  <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">จำนวนกำลังพล</p>
                      <p className="mt-1 text-2xl font-black">{activeGroup.members.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">หน้าปัจจุบัน</p>
                      <p className="mt-1 text-2xl font-black">{totalPages > 0 ? currentPage + 1 : 0}/{totalPages || 1}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">แสดงรายชื่อในสังกัด {activeGroup.affiliation}</p>
                  <span className="text-xs font-medium text-slate-500">
                    แสดง {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, activeGroup.members.length)} จาก {activeGroup.members.length} นาย
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl bg-slate-50 p-2 sm:p-3">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${currentPage * 100}%)` }}
                  >
                    {Array.from({ length: totalPages }, (_, pageIdx) => {
                      const pageMembers = activeGroup.members.slice(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE);
                      return (
                        <div key={`slide-${pageIdx}`} className="w-full shrink-0">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {pageMembers.map((profile) => (
                              <AlumniCard
                                key={profile.id}
                                profile={profile}
                                onClick={() => router.push(`/profile/${profile.id}`)}
                                onView={() => router.push(`/profile/${profile.id}`)}
                                onEdit={() => router.push(`/form/${profile.id}`)}
                                onDelete={() => handleDelete(profile.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(activeGroup.affiliation, 0)}
                        disabled={currentPage === 0}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                        title="หน้าแรก"
                      >
                        |←
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(-1)}
                        disabled={currentPage === 0}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                      >
                        ← ก่อนหน้า
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        หน้า {currentPage + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => movePage(1)}
                        disabled={currentPage >= totalPages - 1}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                      >
                        ถัดไป →
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(activeGroup.affiliation, totalPages - 1)}
                        disabled={currentPage >= totalPages - 1}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                        title="หน้าสุดท้าย"
                      >
                        →|
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={`page-${i}`}
                          type="button"
                          onClick={() => setCurrentPage(activeGroup.affiliation, i)}
                          className={`min-w-[2.2rem] rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                            i === currentPage
                              ? 'border-[#0d3b66] bg-[#0d3b66] text-white'
                              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={`dot-page-${i}`}
                          type="button"
                          onClick={() => setCurrentPage(activeGroup.affiliation, i)}
                          className={`h-2.5 rounded-full transition-all ${
                            i === currentPage ? 'w-6 bg-[#0d3b66]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">ไม่พบรายชื่อในระบบ</p>
        </div>
      )}
    </div>
  );
}
