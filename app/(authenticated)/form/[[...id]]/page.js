'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, FilePlus2, Plus, Trash2, UploadCloud, PenLine, X } from 'lucide-react';
import { alumniAPI, authAPI } from '@/lib/api';
import { CONTROLLED_DICTIONARIES } from '@/lib/dictionaries';
import SignaturePad from '@/components/SignaturePad';

const RANK_OPTIONS = CONTROLLED_DICTIONARIES.rank;
const BRANCH_OPTIONS = CONTROLLED_DICTIONARIES.branch;
const AFFILIATION_OPTIONS = CONTROLLED_DICTIONARIES.affiliation;
const BLOOD_GROUP_OPTIONS = ['A', 'B', 'AB', 'O'];
const BASIC_AFFILIATION_OPTIONS = ['ทบ.', 'สป.กห.', 'บก.ทบ.', 'สทป.', 'ทม.รอ.', 'เกษียณก่อนกำหนด', 'ลาออก', 'เสียชีวิต', 'กรอกเอง'];
const BASIC_RANK_OPTIONS = ['พล.อ.(พ.)', 'พล.อ.', 'พล.ท.', 'พล.ต.', 'พ.อ.(พ.)', 'พ.อ.', 'พ.ท.', 'พ.ต.', 'กรอกเอง'];
const BASIC_BRANCH_OPTIONS = ['ร.', 'ม.', 'ป.', 'ช.', 'ส.', 'สพ.', 'ขว.', 'พธ.', 'ขส.', 'สห.', 'ผท.', 'กรอกเอง'];
const BASIC_BLOOD_GROUP_OPTIONS = ['A', 'B', 'AB', 'O', 'กรอกเอง'];
const RELIGION_OPTIONS = CONTROLLED_DICTIONARIES.religion;
const MARITAL_STATUS_OPTIONS = CONTROLLED_DICTIONARIES.marital_status;
const CHILD_TITLE_OPTIONS = ['ด.ช.', 'ด.ญ.', 'นาย', 'น.ส.', 'นาง'];

const EMPTY_FORM = {
  profile_photo: '',
  military_id: '',
  rank: 'พล.อ.(พ.)',
  custom_rank: '',
  first_name: '',
  last_name: '',
  nickname: '',
  position: '',
  branch: 'ร.',
  custom_branch: '',
  affiliation: 'ทบ.',
  custom_affiliation: '',
  blood_group: '',
  religion: 'พุทธ',
  custom_religion: '',
  marital_status: '',
  custom_marital_status: '',
  status: 'active',
  date_of_birth: '',
  retirement_year: '',
  signature_image: '',
  contacts: {
    phone_primary: '',
    phone_secondary: '',
    email: '',
    line_id: '',
  },
  family: {
    sons_count: 0,
    daughters_count: 0,
  },
  address: {
    house_number: '',
    alley: '',
    road: '',
    subdistrict: '',
    district: '',
    province: '',
    postal_code: '',
  },
  children: [],
  position_history: [],
  rank_history: [],
  education_history: [],
};

const EMPTY_CHILD = {
  title: 'ด.ช.',
  first_name: '',
  last_name: '',
  nickname: '',
  birth_date: '',
};

const EMPTY_POSITION_HISTORY = {
  position_name: '',
  order_number: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

const EMPTY_RANK_HISTORY = {
  rank_name: '',
  order_number: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

const EMPTY_EDUCATION = {
  institution_name: '',
  course_name: '',
  class_no: '',
  graduated_year: '',
};

function toDateIso(day, month, yearBE) {
  if (!day || !month || !yearBE) {
    return '';
  }
  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return '';
  }
  const yearCE = Number(yearBE) - 543;
  if (yearCE < 1900 || yearCE > 2200) {
    return '';
  }
  const d = new Date(yearCE, monthNumber - 1, Number(day));
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  if (d.getDate() !== Number(day) || d.getMonth() !== monthNumber - 1 || d.getFullYear() !== yearCE) {
    return '';
  }
  return d.toISOString().slice(0, 10);
}

function parseDateIso(isoDate) {
  if (!isoDate) {
    return { day: '', month: '', yearBE: '' };
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return { day: '', month: '', yearBE: '' };
  }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    yearBE: String(d.getFullYear() + 543),
  };
}

function calculateAgeParts(isoDate) {
  if (!isoDate) {
    return null;
  }
  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonthDate.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) {
    return null;
  }

  return { years, months, days };
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

function calculateRetirementYear(isoDate) {
  if (!isoDate) {
    return '';
  }
  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) {
    return '';
  }

  let retirementYear = birth.getFullYear() + 60;
  const bornAfterSep30 = birth.getMonth() > 8 || (birth.getMonth() === 8 && birth.getDate() > 30);
  if (bornAfterSep30) {
    retirementYear += 1;
  }

  return String(retirementYear);
}

function sanitizeDigits(value, max = 10) {
  return value.replace(/\D/g, '').slice(0, max);
}

async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function convertYearToBE(ceYear) {
  if (!ceYear && ceYear !== 0) {
    return '';
  }
  const numeric = Number(ceYear);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return String(numeric + 543);
}

function DictionaryAutocomplete({ label, name, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedOptions = useMemo(
    () => Array.from(new Set((options || []).map((item) => String(item || '').trim()).filter(Boolean))),
    [options]
  );
  const filteredOptions = useMemo(() => {
    const query = String(value || '').trim().toLowerCase();
    if (!query) {
      return normalizedOptions.slice(0, 10);
    }
    return normalizedOptions
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 10);
  }, [value, normalizedOptions]);

  const handlePick = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      setActiveIndex(0);
      return;
    }

    if (!open || filteredOptions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < filteredOptions.length) {
      event.preventDefault();
      handlePick(filteredOptions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
      <input
        name={name}
        value={value}
        onChange={(event) => {
          onChange(event);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className="ux-input"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filteredOptions.map((item, index) => (
            <button
              key={`${name}-${item}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                handlePick(item);
              }}
              className={`block w-full px-3 py-2 text-left text-sm text-slate-700 ${
                index === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BirthdayInput({ value, onChange, onValidationChange }) {
  const [parts, setParts] = useState(() => parseDateIso(value));
  const [rawDateText, setRawDateText] = useState('');
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  useEffect(() => {
    const nextParts = parseDateIso(value);
    setParts(nextParts);
    if (nextParts.day && nextParts.month && nextParts.yearBE) {
      setRawDateText(`${nextParts.day}/${nextParts.month}/${nextParts.yearBE}`);
    }
  }, [value]);

  useEffect(() => {
    const { day, month, yearBE } = parts;
    const hasAnyInput = Boolean(day || month || yearBE || rawDateText);
    let message = '';

    if (!hasAnyInput) {
      onValidationChange?.('');
      return;
    }

    if (day) {
      const dayNum = Number(day);
      if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
        message = 'วันต้องอยู่ในช่วง 01-31';
      }
    }

    if (!message && month) {
      const monthNum = Number(month);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        message = 'เดือนต้องอยู่ในช่วง 01-12';
      }
    }

    if (!message && yearBE) {
      const yearNum = Number(yearBE);
      if (yearBE.length < 4) {
        message = 'ปี พ.ศ. ต้องมี 4 หลัก';
      } else if (!Number.isInteger(yearNum) || yearNum < 2400 || yearNum > 2800) {
        message = 'ปี พ.ศ. ไม่อยู่ในช่วงที่รองรับ';
      }
    }

    if (!message && day.length === 2 && month.length === 2 && yearBE.length === 4) {
      const iso = toDateIso(day, month, yearBE);
      if (!iso) {
        message = 'วันเดือนปีเกิดไม่ถูกต้อง';
      }
    }

    onValidationChange?.(message);
  }, [parts, rawDateText, onValidationChange]);

  const pushDate = (nextParts) => {
    setParts(nextParts);
    onChange(toDateIso(nextParts.day, nextParts.month, nextParts.yearBE));
  };

  const parseRawDateText = (text) => {
    const cleaned = text.replace(/[^\d/]/g, '');
    if (!cleaned) {
      return { day: '', month: '', yearBE: '' };
    }

    if (cleaned.includes('/')) {
      const [d = '', m = '', y = ''] = cleaned.split('/');
      return {
        day: sanitizeDigits(d, 2),
        month: sanitizeDigits(m, 2),
        yearBE: sanitizeDigits(y, 4),
      };
    }

    const digits = sanitizeDigits(cleaned, 8);
    return {
      day: digits.slice(0, 2),
      month: digits.slice(2, 4),
      yearBE: digits.slice(4, 8),
    };
  };

  const handleRawTextChange = (event) => {
    const nextText = event.target.value.replace(/[^\d/]/g, '').slice(0, 10);
    setRawDateText(nextText);
    const nextParts = parseRawDateText(nextText);
    pushDate(nextParts);
  };

  const handlePart = (part, rawValue) => {
    const maxLength = part === 'yearBE' ? 4 : 2;
    const digitsOnly = sanitizeDigits(rawValue, maxLength);

    let partVal = digitsOnly;
    if (part === 'day' && partVal) {
      const asNumber = Number(partVal);
      if (asNumber > 31) {
        partVal = '31';
      }
    }
    if (part === 'month' && partVal) {
      const asNumber = Number(partVal);
      if (asNumber > 12) {
        partVal = '12';
      }
    }

    const nextParts = {
      ...parts,
      [part]: partVal,
    };

    pushDate(nextParts);

    const day = nextParts.day ? nextParts.day.padStart(2, '0') : '';
    const month = nextParts.month ? nextParts.month.padStart(2, '0') : '';
    const yearBE = nextParts.yearBE || '';
    setRawDateText(`${day}${day || month || yearBE ? '/' : ''}${month}${month || yearBE ? '/' : ''}${yearBE}`);

    if (part === 'day' && partVal.length === 2) {
      monthRef.current?.focus();
    }
    if (part === 'month' && partVal.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleBackspaceJump = (event, part) => {
    if (event.key !== 'Backspace') {
      return;
    }
    if (part === 'month' && !parts.month) {
      dayRef.current?.focus();
    }
    if (part === 'yearBE' && !parts.yearBE) {
      monthRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={rawDateText}
        onChange={handleRawTextChange}
        placeholder="dd/mm/yyyy เช่น 07/11/2510"
        className="ux-input"
        inputMode="numeric"
      />
      <div className="grid grid-cols-3 gap-2">
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={parts.day}
        onChange={(event) => handlePart('day', event.target.value)}
        onKeyDown={(event) => handleBackspaceJump(event, 'day')}
        placeholder="dd"
        maxLength={2}
        className="ux-input text-center font-semibold"
      />
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        value={parts.month}
        onChange={(event) => handlePart('month', event.target.value)}
        onKeyDown={(event) => handleBackspaceJump(event, 'month')}
        placeholder="mm"
        maxLength={2}
        className="ux-input text-center font-semibold"
      />
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        value={parts.yearBE}
        onChange={(event) => handlePart('yearBE', event.target.value)}
        onKeyDown={(event) => handleBackspaceJump(event, 'yearBE')}
        placeholder="yyyy"
        maxLength={4}
        className="ux-input text-center font-semibold"
      />
      </div>
    </div>
  );
}

function ThaiDatePicker({ value, onChange, yearOptions = [] }) {
  const [parts, setParts] = useState(() => parseDateIso(value));

  useEffect(() => {
    setParts(parseDateIso(value));
  }, [value]);

  const handlePart = (part, rawValue) => {
    const maxLength = part === 'yearBE' ? 4 : 2;
    const nextVal = sanitizeDigits(rawValue, maxLength);
    const nextParts = { ...parts, [part]: nextVal };
    setParts(nextParts);
    onChange(toDateIso(nextParts.day, nextParts.month, nextParts.yearBE));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={parts.day}
        onChange={(event) => handlePart('day', event.target.value)}
        placeholder="dd"
        maxLength={2}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        inputMode="numeric"
        value={parts.month}
        onChange={(event) => handlePart('month', event.target.value)}
        placeholder="mm"
        maxLength={2}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        inputMode="numeric"
        value={parts.yearBE}
        onChange={(event) => handlePart('yearBE', event.target.value)}
        placeholder="yyyy"
        maxLength={4}
        list="thai-datepicker-year-options"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <datalist id="thai-datepicker-year-options">
        {yearOptions.map((year) => (
          <option key={year} value={year} />
        ))}
      </datalist>
    </div>
  );
}

export default function AlumniFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id ? params.id[0] : null;
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [currentRole, setCurrentRole] = useState('');
  const [allowUserProfileEdit, setAllowUserProfileEdit] = useState(true);
  const [policyLoading, setPolicyLoading] = useState(true);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  const [positionOptions, setPositionOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subdistrictOptions, setSubdistrictOptions] = useState([]);
  const [birthdayInputError, setBirthdayInputError] = useState('');

  const currentYearBE = new Date().getFullYear() + 543;
  const yearOptions = useMemo(
    () => Array.from({ length: 85 }, (_, index) => String(currentYearBE - index)),
    [currentYearBE]
  );

  const token = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    try {
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      return stored?.state?.token || stored?.token || '';
    } catch {
      return '';
    }
  }, []);

  const ageParts = useMemo(() => calculateAgeParts(formData.date_of_birth), [formData.date_of_birth]);
  const retirementYearBE = useMemo(() => convertYearToBE(formData.retirement_year), [formData.retirement_year]);
  const realtimeErrors = useMemo(() => {
    const errors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'กรุณากรอกชื่อ';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'กรุณากรอกนามสกุล';
    }
    if (formData.military_id.length !== 10) {
      errors.military_id = 'เลขประจำตัวทหารต้องมี 10 หลัก';
    }
    if (!formData.position.trim()) {
      errors.position = 'กรุณากรอกตำแหน่ง';
    }
    if (birthdayInputError) {
      errors.date_of_birth = birthdayInputError;
    } else if (!formData.date_of_birth) {
      errors.date_of_birth = 'กรุณากรอกวันเดือนปีเกิดให้ถูกต้อง';
    }
    if (formData.contacts.phone_primary && formData.contacts.phone_primary.length !== 10) {
      errors.phone_primary = 'เบอร์โทรศัพท์หลักต้องมี 10 หลัก';
    }
    if (formData.contacts.phone_secondary && formData.contacts.phone_secondary.length !== 10) {
      errors.phone_secondary = 'เบอร์โทรศัพท์รองต้องมี 10 หลัก';
    }
    if (formData.contacts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contacts.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (formData.rank_history.some((item) => item.start_date && !item.is_current && item.end_date && new Date(item.end_date) < new Date(item.start_date))) {
      errors.rank_history = 'ประวัติยศมีช่วงวันที่ไม่ถูกต้อง';
    }
    if (formData.rank_history.some((item) => item.rank_name?.trim() && !item.start_date)) {
      errors.rank_history_start_date = 'ประวัติยศ: กรุณาเลือกวันที่เริ่มต้นให้ทุกรายการที่มีการกรอกยศ';
    }
    if (formData.position_history.some((item) => item.start_date && !item.is_current && item.end_date && new Date(item.end_date) < new Date(item.start_date))) {
      errors.position_history = 'ประวัติตำแหน่งมีช่วงวันที่ไม่ถูกต้อง';
    }
    if (formData.position_history.some((item) => item.position_name?.trim() && !item.start_date)) {
      errors.position_history_start_date = 'ประวัติตำแหน่ง: กรุณาเลือกวันที่เริ่มต้นให้ทุกรายการที่มีการกรอกตำแหน่ง';
    }

    return errors;
  }, [formData, birthdayInputError]);
  const hasRealtimeErrors = Object.keys(realtimeErrors).length > 0;

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!signatureModalOpen) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSignatureModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [signatureModalOpen]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      const role = stored?.state?.user?.role || stored?.user?.role || '';
      setCurrentRole(role);
    } catch {
      setCurrentRole('');
    }
  }, []);

  useEffect(() => {
    const fetchPermissionPolicy = async () => {
      try {
        const response = await authAPI.getPermissionSettings();
        setAllowUserProfileEdit(Boolean(response?.data?.permissions?.allow_user_profile_edit));
      } catch {
        setAllowUserProfileEdit(true);
      } finally {
        setPolicyLoading(false);
      }
    };

    fetchPermissionPolicy();
  }, []);

  useEffect(() => {
    const fetchDictionaries = async () => {
      try {
        const response = await alumniAPI.getDictionary('positions');
        setPositionOptions(Array.isArray(response.data) ? response.data : []);
      } catch {
        setPositionOptions([]);
      }
    };

    fetchDictionaries();
  }, []);

  const isUserReadOnly = !!id && currentRole === 'user' && !allowUserProfileEdit;

  useEffect(() => {
    if (policyLoading || !isUserReadOnly) {
      return;
    }

    router.replace(`/profile/${id}?readonly=1`);
  }, [policyLoading, isUserReadOnly, router, id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await alumniAPI.getById(id);
        const incoming = response.data;
        const mappedRankHistory = (incoming.rank_history || []).map((item) => ({
          rank_name: item.rank_name || item.rank || '',
          order_number: item.order_number || '',
          start_date: item.start_date || '',
          end_date: item.end_date || '',
          is_current: !item.end_date,
        }));

        setFormData((prev) => ({
          ...prev,
          ...incoming,
          contacts: { ...prev.contacts, ...(incoming.contacts || {}) },
          address: { ...prev.address, ...(incoming.address || {}) },
          family: { ...prev.family, ...(incoming.family || {}) },
          children: (incoming.children || []).map((item) => ({
            title: item.title || 'ด.ช.',
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            nickname: item.nickname || '',
            birth_date: item.birth_date || '',
          })),
          rank_history: mappedRankHistory,
          position_history: (incoming.position_history || []).map((item) => ({
            position_name: item.position_name || '',
            order_number: item.order_number || '',
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            is_current: !item.end_date,
          })),
          education_history: (incoming.education_history || []).map((item) => ({
            institution_name: item.institution_name || '',
            course_name: item.course_name || '',
            class_no: item.class_no || '',
            graduated_year: item.graduated_year ? convertYearToBE(item.graduated_year) : '',
          })),
        }));
      } catch {
        setError('ไม่สามารถโหลดข้อมูลประวัติได้');
        showToast('ไม่สามารถโหลดข้อมูลประวัติได้', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const fetchAddressOptions = async (level, paramsObj = {}) => {
    if (!token) {
      return [];
    }

    const query = new URLSearchParams({ level, ...paramsObj }).toString();
    const response = await fetch(`/api/address/thai?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.options || [];
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const options = await fetchAddressOptions('province', { q: formData.address.province || '' });
      setProvinceOptions(options);
    }, 200);
    return () => clearTimeout(timer);
  }, [formData.address.province, token]);

  useEffect(() => {
    if (!formData.address.province) {
      setDistrictOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const options = await fetchAddressOptions('amphoe', {
        province: formData.address.province,
        q: formData.address.district || '',
      });
      setDistrictOptions(options);
    }, 200);
    return () => clearTimeout(timer);
  }, [formData.address.province, formData.address.district, token]);

  useEffect(() => {
    if (!formData.address.province || !formData.address.district) {
      setSubdistrictOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const options = await fetchAddressOptions('district', {
        province: formData.address.province,
        amphoe: formData.address.district,
        q: formData.address.subdistrict || '',
      });
      setSubdistrictOptions(options);
    }, 200);
    return () => clearTimeout(timer);
  }, [formData.address.province, formData.address.district, formData.address.subdistrict, token]);

  useEffect(() => {
    const fillZipcode = async () => {
      if (!token || !formData.address.province || !formData.address.district || !formData.address.subdistrict) {
        return;
      }

      const query = new URLSearchParams({
        level: 'zipcode',
        province: formData.address.province,
        amphoe: formData.address.district,
        district: formData.address.subdistrict,
      }).toString();

      const response = await fetch(`/api/address/thai?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (data.zipcode) {
        setFormData((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            postal_code: data.zipcode,
          },
        }));
      }
    };

    fillZipcode();
  }, [formData.address.province, formData.address.district, formData.address.subdistrict, token]);

  const handleBasicChange = (event) => {
    const { name, value } = event.target;

    if (name === 'military_id') {
      setFormData((prev) => ({ ...prev, military_id: sanitizeDigits(value, 10) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'phone_primary' || name === 'phone_secondary') {
      nextValue = sanitizeDigits(value, 10);
    }

    setFormData((prev) => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        [name]: nextValue,
      },
    }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      const nextAddress = { ...prev.address, [name]: value };

      if (name === 'province') {
        nextAddress.district = '';
        nextAddress.subdistrict = '';
        nextAddress.postal_code = '';
      }

      if (name === 'district') {
        nextAddress.subdistrict = '';
        nextAddress.postal_code = '';
      }

      if (name === 'subdistrict') {
        nextAddress.postal_code = '';
      }

      return {
        ...prev,
        address: nextAddress,
      };
    });
  };

  const handlePhotoFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'warning');
      return;
    }

    const base64 = await toBase64(file);
    setFormData((prev) => ({ ...prev, profile_photo: base64 }));
    showToast('อัปโหลดรูปประจำตัวเรียบร้อย', 'success');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    await handlePhotoFile(file);
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    await handlePhotoFile(file);
  };

  const handleArrayChange = (field, index, key, value) => {
    setFormData((prev) => {
      const list = [...prev[field]];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, [field]: list };
    });
  };

  const handleAddItem = (field, template) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], { ...template }],
    }));
  };

  const handleRemoveItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const validateHistoryDates = (items, name) => {
    for (const item of items) {
      if (item.start_date && !item.is_current && item.end_date && new Date(item.end_date) < new Date(item.start_date)) {
        setError(`${name}: วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (isUserReadOnly) {
      const message = 'ผู้ดูแลระบบปิดสิทธิ์แก้ไขข้อมูลสำหรับผู้ใช้ทั่วไปชั่วคราว (โหมดดูข้อมูลเท่านั้น)';
      setError(message);
      showToast(message, 'warning');
      return;
    }

    if (!formData.first_name || !formData.last_name || formData.military_id.length !== 10) {
      setError('กรุณากรอกชื่อ นามสกุล และเลขประจำตัวทหารให้ครบ 10 หลัก');
      showToast('ข้อมูลพื้นฐานยังไม่ครบถ้วน', 'warning');
      return;
    }

    if (!formData.position.trim()) {
      setError('กรุณากรอกตำแหน่ง');
      showToast('กรุณากรอกตำแหน่ง', 'warning');
      return;
    }

    if (!formData.date_of_birth) {
      setError('กรุณาเลือกวันเดือนปีเกิดให้ถูกต้อง');
      showToast('กรุณาเลือกวันเดือนปีเกิดให้ถูกต้อง', 'warning');
      return;
    }

    if (formData.contacts.phone_primary && formData.contacts.phone_primary.length !== 10) {
      setError('เบอร์โทรศัพท์หลักต้องมี 10 หลัก');
      showToast('เบอร์โทรศัพท์หลักต้องมี 10 หลัก', 'warning');
      return;
    }

    if (formData.contacts.phone_secondary && formData.contacts.phone_secondary.length !== 10) {
      setError('เบอร์โทรศัพท์รองต้องมี 10 หลัก');
      showToast('เบอร์โทรศัพท์รองต้องมี 10 หลัก', 'warning');
      return;
    }

    if (!validateHistoryDates(formData.rank_history, 'ประวัติยศ')) {
      return;
    }

    if (formData.rank_history.some((item) => item.rank_name?.trim() && !item.start_date)) {
      setError('ประวัติยศ: กรุณาเลือกวันที่เริ่มต้นให้ทุกรายการที่มีการกรอกยศ');
      showToast('ประวัติยศยังขาดวันที่เริ่มต้น', 'warning');
      return;
    }

    if (!validateHistoryDates(formData.position_history, 'ประวัติตำแหน่ง')) {
      return;
    }

    if (formData.position_history.some((item) => item.position_name?.trim() && !item.start_date)) {
      setError('ประวัติตำแหน่ง: กรุณาเลือกวันที่เริ่มต้นให้ทุกรายการที่มีการกรอกตำแหน่ง');
      showToast('ประวัติตำแหน่งยังขาดวันที่เริ่มต้น', 'warning');
      return;
    }

    const payload = {
      ...formData,
      rank_history: formData.rank_history
        .filter((item) => item.rank_name)
        .map((item) => ({
          rank_name: item.rank_name,
          order_number: item.order_number,
          start_date: item.start_date,
          end_date: item.is_current ? null : (item.end_date || null),
          rank: item.rank_name,
        })),
      position_history: formData.position_history
        .filter((item) => item.position_name)
        .map((item) => ({
          position_name: item.position_name,
          order_number: item.order_number,
          start_date: item.start_date,
          end_date: item.is_current ? null : (item.end_date || null),
        })),
      children: formData.children.filter((item) => item.first_name || item.last_name),
      education_history: formData.education_history
        .filter((item) => item.course_name)
        .map((item) => ({
          institution_name: item.institution_name,
          course_name: item.course_name,
          class_no: item.class_no,
          graduated_year: item.graduated_year ? Number(item.graduated_year) - 543 : null,
        })),
    };

    setSubmitting(true);

    try {
      if (id) {
        await alumniAPI.update(id, payload);
        setSuccess('บันทึกข้อมูลสำเร็จ');
        showToast('อัปเดตข้อมูลสำเร็จ', 'success');
      } else {
        await alumniAPI.create(payload);
        setSuccess('เพิ่มประวัติสำเร็จ');
        showToast('เพิ่มประวัติสำเร็จ', 'success');
      }

      setTimeout(() => {
        router.push('/directory');
      }, 900);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'บันทึกข้อมูลไม่สำเร็จ');
      showToast('บันทึกข้อมูลไม่สำเร็จ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
        <p className="mt-4 text-slate-700">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="ux-form-theme space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="ux-btn-secondary inline-flex items-center gap-2 px-4 py-2"
      >
        <ArrowLeft size={18} />
        กลับไป
      </button>

      <div className="ux-form-shell">
        <div className="ux-form-hero px-6 py-6">
          <h1 className="text-2xl font-black md:text-3xl">{id ? 'แก้ไขประวัติส่วนบุคคล' : 'เพิ่มประวัติใหม่'}</h1>
          <p className="ux-form-hero-subtitle mt-1 text-sm">ดีไซน์ใหม่รองรับมือถือ, ตรวจสอบข้อมูลอัตโนมัติ และกรอกประวัติแบบครบถ้วน</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7 px-4 py-5 md:px-6 md:py-6">
          {error && <div className="ux-form-alert ux-form-alert-error">{error}</div>}
          {success && <div className="ux-form-alert ux-form-alert-success">{success}</div>}
          {!policyLoading && isUserReadOnly && (
            <div className="ux-form-alert ux-form-alert-warn text-sm">
              ผู้ดูแลระบบกำหนดโหมดอ่านอย่างเดียวสำหรับผู้ใช้ทั่วไป คุณยังดูข้อมูลได้ แต่ไม่สามารถบันทึกการแก้ไข
            </div>
          )}
          {hasRealtimeErrors && (
            <div className="ux-form-alert ux-form-alert-warn text-sm">
              ระบบพบข้อมูลที่ต้องแก้ไข {Object.keys(realtimeErrors).length} จุดก่อนบันทึก
            </div>
          )}

          <section className="ux-form-section md:p-5">
            <h2 className="ux-form-section-title">1. ข้อมูลพื้นฐาน</h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">รูปประจำตัว (ลากวางไฟล์ได้)</label>
<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Portrait preview frame */}
                  <div className="relative mx-auto flex-shrink-0 sm:mx-0">
                    <div className="flex h-48 w-36 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50 shadow">
                      {formData.profile_photo ? (
                        <img
                          src={formData.profile_photo}
                          alt="profile"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-slate-400">ยังไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                    {formData.profile_photo && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, profile_photo: '' }));
                          showToast('ลบรูปประจำตัวแล้ว', 'info');
                        }}
                        className="absolute -right-2 -top-2 rounded-full border border-red-200 bg-white p-1 text-red-500 shadow hover:bg-red-50"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {/* Upload area */}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handlePhotoDrop}
                      className={`w-full rounded-xl border-2 border-dashed p-4 text-left transition ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <UploadCloud size={18} />
                        <span>ลากไฟล์รูปมาวาง หรือกดเพื่อเลือกไฟล์</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">รองรับ JPG, PNG - รูปแสดงเต็มกรอบ ไม่ครอบตัด</p>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <DictionaryAutocomplete
                label="สังกัด"
                name="affiliation"
                value={formData.affiliation}
                options={BASIC_AFFILIATION_OPTIONS}
                onChange={handleBasicChange}
                placeholder="เลือก/พิมพ์สังกัด"
              />

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">เลขประจำตัวทหาร (10 หลัก)</label>
                <input
                  name="military_id"
                  value={formData.military_id}
                  onChange={handleBasicChange}
                  inputMode="numeric"
                  maxLength={10}
                  required
                  className="ux-input"
                  placeholder="กรอกตัวเลข 10 หลัก"
                />
                {realtimeErrors.military_id && <p className="mt-1 text-xs text-red-600">{realtimeErrors.military_id}</p>}
              </div>

              <DictionaryAutocomplete
                label="ยศ"
                name="rank"
                value={formData.rank}
                options={BASIC_RANK_OPTIONS}
                onChange={handleBasicChange}
                placeholder="เลือก/พิมพ์ยศ"
              />

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อ</label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleBasicChange}
                  required
                  className="ux-input"
                />
                {realtimeErrors.first_name && <p className="mt-1 text-xs text-red-600">{realtimeErrors.first_name}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">นามสกุล</label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleBasicChange}
                  required
                  className="ux-input"
                />
                {realtimeErrors.last_name && <p className="mt-1 text-xs text-red-600">{realtimeErrors.last_name}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อเล่น</label>
                <input
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleBasicChange}
                  className="ux-input"
                />
              </div>

              <DictionaryAutocomplete
                label="เหล่า"
                name="branch"
                value={formData.branch}
                options={BASIC_BRANCH_OPTIONS}
                onChange={handleBasicChange}
                placeholder="เลือก/พิมพ์เหล่า"
              />

              <div>
                <DictionaryAutocomplete
                  label="ตำแหน่ง"
                  name="position"
                  value={formData.position}
                  options={positionOptions}
                  onChange={handleBasicChange}
                  placeholder="ค้นหาตำแหน่ง หรือพิมพ์ใหม่"
                />
                {realtimeErrors.position && <p className="mt-1 text-xs text-red-600">{realtimeErrors.position}</p>}
              </div>

              <DictionaryAutocomplete
                label="กลุ่มเลือด"
                name="blood_group"
                value={formData.blood_group}
                options={BASIC_BLOOD_GROUP_OPTIONS}
                onChange={handleBasicChange}
                placeholder="เลือก A, B, AB, O หรือพิมพ์เอง"
              />

              <div>
                {(formData.rank === 'อื่นๆ' || formData.rank === 'กรอกเอง') && (
                  <input
                    name="custom_rank"
                    value={formData.custom_rank}
                    onChange={handleBasicChange}
                    placeholder="กรอกยศเอง"
                    className="ux-input"
                  />
                )}
              </div>

              <div>
                {(formData.branch === 'อื่นๆ' || formData.branch === 'กรอกเอง') && (
                  <input
                    name="custom_branch"
                    value={formData.custom_branch}
                    onChange={handleBasicChange}
                    placeholder="กรอกเหล่าเอง"
                    className="ux-input"
                  />
                )}
              </div>

              <div>
                {(formData.affiliation === 'อื่นๆ' || formData.affiliation === 'กรอกเอง') && (
                  <input
                    name="custom_affiliation"
                    value={formData.custom_affiliation}
                    onChange={handleBasicChange}
                    placeholder="กรอกสังกัดเอง"
                    className="ux-input"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ศาสนา</label>
                <select
                  name="religion"
                  value={formData.religion}
                  onChange={handleBasicChange}
                  className="ux-input"
                >
                  {RELIGION_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                {formData.religion === 'อื่นๆ' && (
                  <input
                    name="custom_religion"
                    value={formData.custom_religion}
                    onChange={handleBasicChange}
                    placeholder="กรอกศาสนา"
                    className="mt-2 ux-input"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">สถานภาพ</label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleBasicChange}
                  className="ux-input"
                >
                  <option value="">เลือกสถานภาพ</option>
                  {MARITAL_STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                {formData.marital_status === 'อื่นๆ' && (
                  <input
                    name="custom_marital_status"
                    value={formData.custom_marital_status}
                    onChange={handleBasicChange}
                    placeholder="กรอกสถานภาพ"
                    className="mt-2 ux-input"
                  />
                )}
              </div>

              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-gray-700">วันเกิด (กรอกแบบตัวเลข)</label>
                <BirthdayInput
                  value={formData.date_of_birth}
                  onChange={(iso) => setFormData((prev) => ({
                    ...prev,
                    date_of_birth: iso,
                    retirement_year: calculateRetirementYear(iso),
                  }))}
                  onValidationChange={setBirthdayInputError}
                />
                <p className="mt-2 text-xs text-slate-500">รูปแบบ: [dd] [mm] [yyyy] เช่น 07 11 2510 ระบบจะเลื่อนไปช่องถัดไปให้อัตโนมัติ</p>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-700">
                    อายุปัจจุบัน: {ageParts ? `${ageParts.years} ปี ${ageParts.months} เดือน ${ageParts.days} วัน` : '-'}
                  </div>
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-700">
                    ปีที่เกษียณ (พ.ศ.): {retirementYearBE || '-'}
                  </div>
                </div>
                {realtimeErrors.date_of_birth && <p className="mt-2 text-xs text-red-600">{realtimeErrors.date_of_birth}</p>}
              </div>

              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">ภาพลายเซ็นต์</label>
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700">
                      {formData.signature_image ? 'มีลายเซ็นแล้ว สามารถกดแก้ไขเพื่อวาดใหม่ได้' : 'ยังไม่มีลายเซ็น กรุณากดปุ่มแก้ไขเพื่อวาดหรืออัปโหลด'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSignatureModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <PenLine size={14} />
                        แก้ไขภาพลายเซ็นต์
                      </button>
                      {formData.signature_image && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, signature_image: '' }));
                            showToast('ลบลายเซ็นแล้ว', 'info');
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                        >
                          ลบลายเซ็น
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-300 bg-white p-2">
                    {formData.signature_image ? (
                      <img
                        src={formData.signature_image}
                        alt="signature"
                        className="h-24 w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center text-sm text-gray-500">ยังไม่มีภาพลายเซ็นต์</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <h2 className="ux-form-section-title">2. ข้อมูลติดต่อ</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">เบอร์โทรศัพท์หลัก (10 หลัก)</label>
                <input
                  name="phone_primary"
                  value={formData.contacts.phone_primary}
                  onChange={handleContactChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="ux-input"
                />
                {realtimeErrors.phone_primary && <p className="mt-1 text-xs text-red-600">{realtimeErrors.phone_primary}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">เบอร์โทรศัพท์รอง (10 หลัก)</label>
                <input
                  name="phone_secondary"
                  value={formData.contacts.phone_secondary}
                  onChange={handleContactChange}
                  inputMode="numeric"
                  maxLength={10}
                  className="ux-input"
                />
                {realtimeErrors.phone_secondary && <p className="mt-1 text-xs text-red-600">{realtimeErrors.phone_secondary}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">อีเมล</label>
                <input
                  type="email"
                  name="email"
                  value={formData.contacts.email}
                  onChange={handleContactChange}
                  className="ux-input"
                  placeholder="example@email.com"
                />
                {realtimeErrors.email && <p className="mt-1 text-xs text-red-600">{realtimeErrors.email}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Line ID</label>
                <input
                  name="line_id"
                  value={formData.contacts.line_id}
                  onChange={handleContactChange}
                  className="ux-input"
                />
              </div>
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <h2 className="ux-form-section-title">3. ที่อยู่</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">เลขที่บ้าน</label>
                <input
                  name="house_number"
                  value={formData.address.house_number}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ซอย</label>
                <input
                  name="alley"
                  value={formData.address.alley}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ถนน</label>
                <input
                  name="road"
                  value={formData.address.road}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">จังหวัด</label>
                <input
                  list="province-options"
                  name="province"
                  value={formData.address.province}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
                <datalist id="province-options">
                  {provinceOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">อำเภอ/เขต</label>
                <input
                  list="district-options"
                  name="district"
                  value={formData.address.district}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
                <datalist id="district-options">
                  {districtOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">ตำบล/แขวง</label>
                <input
                  list="subdistrict-options"
                  name="subdistrict"
                  value={formData.address.subdistrict}
                  onChange={handleAddressChange}
                  className="ux-input"
                />
                <datalist id="subdistrict-options">
                  {subdistrictOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">รหัสไปรษณีย์</label>
                <input
                  name="postal_code"
                  value={formData.address.postal_code}
                  onChange={handleAddressChange}
                  className="ux-input bg-slate-50"
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ux-form-section-title mb-0">4. ประวัติยศ</h2>
              <button
                type="button"
                onClick={() => handleAddItem('rank_history', EMPTY_RANK_HISTORY)}
                className="ux-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-3">
              {realtimeErrors.rank_history && <p className="text-sm text-red-600">{realtimeErrors.rank_history}</p>}
              {realtimeErrors.rank_history_start_date && <p className="text-sm text-red-600">{realtimeErrors.rank_history_start_date}</p>}
              {formData.rank_history.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายการประวัติยศ</p>}
              {formData.rank_history.map((item, index) => {
                const isLatestRank = index === formData.rank_history.length - 1;
                return (
                <div key={`rank-${index}`} className="rounded-xl border border-slate-300 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      list={`rank-history-options-${index}`}
                      value={item.rank_name}
                      onChange={(event) => handleArrayChange('rank_history', index, 'rank_name', event.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="เลือกยศจากรายการ หรือพิมพ์เอง"
                    />
                    <datalist id={`rank-history-options-${index}`}>
                      {RANK_OPTIONS.map((rank) => (
                        <option key={`${rank}-${index}`} value={rank} />
                      ))}
                    </datalist>
                    <input
                      value={item.order_number}
                      onChange={(event) => handleArrayChange('rank_history', index, 'order_number', event.target.value)}
                      className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="คำสั่ง/ลำดับ"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('rank_history', index)}
                      className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isLatestRank && (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!item.is_current}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          handleArrayChange('rank_history', index, 'is_current', checked);
                          if (checked) {
                            handleArrayChange('rank_history', index, 'end_date', '');
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#0d3b66] focus:ring-emerald-500"
                      />
                      ยศล่าสุดถึงปัจจุบัน
                    </label>
                  )}
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">วันที่เริ่มต้น</p>
                      <ThaiDatePicker
                        value={item.start_date}
                        onChange={(iso) => handleArrayChange('rank_history', index, 'start_date', iso)}
                        yearOptions={yearOptions}
                      />
                      {item.rank_name?.trim() && !item.start_date && (
                        <p className="mt-1 text-xs text-red-600">กรุณาเลือกวันที่เริ่มต้น</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">วันที่สิ้นสุด</p>
                      {item.is_current ? (
                        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">ปัจจุบัน</div>
                      ) : (
                        <ThaiDatePicker
                          value={item.end_date}
                          onChange={(iso) => handleArrayChange('rank_history', index, 'end_date', iso)}
                          yearOptions={yearOptions}
                        />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-gray-600">
                    ระยะเวลา: {calculateDuration(item.start_date, item.is_current ? new Date().toISOString().slice(0, 10) : item.end_date)}{item.is_current ? ' (ถึงปัจจุบัน)' : ''}
                  </div>
                </div>
              );
              })}
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ux-form-section-title mb-0">5. ประวัติตำแหน่ง</h2>
              <button
                type="button"
                onClick={() => handleAddItem('position_history', EMPTY_POSITION_HISTORY)}
                className="ux-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-3">
              {realtimeErrors.position_history && <p className="text-sm text-red-600">{realtimeErrors.position_history}</p>}
              {realtimeErrors.position_history_start_date && <p className="text-sm text-red-600">{realtimeErrors.position_history_start_date}</p>}
              {formData.position_history.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายการประวัติตำแหน่ง</p>}
              {formData.position_history.map((item, index) => {
                const isLatestPosition = index === formData.position_history.length - 1;
                return (
                <div key={`position-${index}`} className="rounded-xl border border-slate-300 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      list={`position-history-options-${index}`}
                      value={item.position_name}
                      onChange={(event) => handleArrayChange('position_history', index, 'position_name', event.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="เลือกตำแหน่งจากรายการ หรือพิมพ์เอง"
                    />
                    <datalist id={`position-history-options-${index}`}>
                      {positionOptions.map((position) => (
                        <option key={`${position}-${index}`} value={position} />
                      ))}
                    </datalist>
                    <input
                      value={item.order_number}
                      onChange={(event) => handleArrayChange('position_history', index, 'order_number', event.target.value)}
                      className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="คำสั่ง/ลำดับ"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('position_history', index)}
                      className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isLatestPosition && (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!item.is_current}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          handleArrayChange('position_history', index, 'is_current', checked);
                          if (checked) {
                            handleArrayChange('position_history', index, 'end_date', '');
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#0d3b66] focus:ring-emerald-500"
                      />
                      ตำแหน่งล่าสุดถึงปัจจุบัน
                    </label>
                  )}
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">วันที่เริ่มต้น</p>
                      <ThaiDatePicker
                        value={item.start_date}
                        onChange={(iso) => handleArrayChange('position_history', index, 'start_date', iso)}
                        yearOptions={yearOptions}
                      />
                      {item.position_name?.trim() && !item.start_date && (
                        <p className="mt-1 text-xs text-red-600">กรุณาเลือกวันที่เริ่มต้น</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">วันที่สิ้นสุด</p>
                      {item.is_current ? (
                        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">ปัจจุบัน</div>
                      ) : (
                        <ThaiDatePicker
                          value={item.end_date}
                          onChange={(iso) => handleArrayChange('position_history', index, 'end_date', iso)}
                          yearOptions={yearOptions}
                        />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-gray-600">
                    ระยะเวลา: {calculateDuration(item.start_date, item.is_current ? new Date().toISOString().slice(0, 10) : item.end_date)}{item.is_current ? ' (ถึงปัจจุบัน)' : ''}
                  </div>
                </div>
              );
              })}
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ux-form-section-title mb-0">6. ประวัติการศึกษา</h2>
              <button
                type="button"
                onClick={() => handleAddItem('education_history', EMPTY_EDUCATION)}
                className="ux-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-3">
              {formData.education_history.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีรายการประวัติการศึกษา</p>}
              {formData.education_history.map((item, index) => (
                <div key={`education-${index}`} className="rounded-xl border border-slate-300 bg-slate-50/70 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    <input
                      value={item.institution_name || ''}
                      onChange={(event) => handleArrayChange('education_history', index, 'institution_name', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
                      placeholder="สถาบัน"
                    />
                    <input
                      value={item.course_name}
                      onChange={(event) => handleArrayChange('education_history', index, 'course_name', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="ชื่อการศึกษา/หลักสูตร"
                    />
                    <input
                      value={item.class_no}
                      onChange={(event) => handleArrayChange('education_history', index, 'class_no', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="รุ่นที่"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={item.graduated_year}
                        onChange={(event) => handleArrayChange('education_history', index, 'graduated_year', event.target.value)}
                        className="ux-input"
                      >
                        <option value="">ปีสำเร็จ (พ.ศ.)</option>
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem('education_history', index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ux-form-section md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ux-form-section-title mb-0">7. ข้อมูลบุตร</h2>
              <button
                type="button"
                onClick={() => handleAddItem('children', EMPTY_CHILD)}
                className="ux-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                <Plus size={14} /> เพิ่มบุตร
              </button>
            </div>

            <div className="space-y-3">
              {formData.children.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีข้อมูลบุตร</p>}
              {formData.children.map((item, index) => {
                const age = calculateAgeParts(item.birth_date);
                return (
                  <div key={`child-${index}`} className="rounded-xl border border-slate-300 bg-slate-50/70 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <select
                        value={item.title}
                        onChange={(event) => handleArrayChange('children', index, 'title', event.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {CHILD_TITLE_OPTIONS.map((title) => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                      <input
                        value={item.first_name}
                        onChange={(event) => handleArrayChange('children', index, 'first_name', event.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="ชื่อ"
                      />
                      <input
                        value={item.last_name}
                        onChange={(event) => handleArrayChange('children', index, 'last_name', event.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="นามสกุล"
                      />
                      <input
                        value={item.nickname}
                        onChange={(event) => handleArrayChange('children', index, 'nickname', event.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="ชื่อเล่น"
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <p className="mb-1 text-xs font-medium text-gray-500">วันเดือนปีเกิด (พ.ศ.)</p>
                        <ThaiDatePicker
                          value={item.birth_date}
                          onChange={(iso) => handleArrayChange('children', index, 'birth_date', iso)}
                          yearOptions={yearOptions}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-gray-600 sm:w-48">
                        <span>{age ? `${age.years} ปี ${age.months} เดือน` : 'อายุ -'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem('children', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => router.push('/directory')}
              className="ux-btn-neutral px-4 py-2"
            >
              ยกเลิก
            </button>

            <div className="flex gap-3">
              {id && (
                <button
                  type="button"
                  onClick={() => router.push(`/profile/${id}/print`)}
                  className="ux-btn-secondary inline-flex items-center gap-2 px-4 py-2"
                >
                  <FilePlus2 size={16} />
                  พิมพ์เอกสาร
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || hasRealtimeErrors || isUserReadOnly}
                className="ux-btn-primary inline-flex items-center gap-2 px-5 py-2 disabled:opacity-60"
              >
                <Save size={16} />
                {submitting ? 'กำลังบันทึก...' : id ? 'อัปเดตข้อมูล' : 'เพิ่มประวัติ'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {signatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-bold text-slate-800">แก้ไขภาพลายเซ็นต์</h3>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4">
              <SignaturePad
                value={formData.signature_image}
                onChange={(value) => setFormData((prev) => ({ ...prev, signature_image: value }))}
                onAction={(type, message) => showToast(message, type)}
              />
            </div>

            <div className="flex justify-end border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setSignatureModalOpen(false);
                  showToast('ปิดหน้าต่างแก้ไขลายเซ็น', 'info');
                }}
                className="ux-btn-secondary px-4 py-2 text-sm"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60]">
          <div
            className={`min-w-[240px] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : toast.type === 'warning'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-800'
              }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
