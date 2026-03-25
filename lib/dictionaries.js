const CONTROLLED_DICTIONARIES = {
  rank: ['พล.อ.(พ.)', 'พล.อ.', 'พล.ท.', 'พล.ต.', 'พ.อ.(พ.)', 'พ.อ.', 'พ.ท.', 'พ.ต.', 'อื่นๆ'],
  branch: ['ร.', 'ม.', 'ป.', 'ช.', 'ส.', 'สพ.', 'ขว.', 'ขส.', 'พธ.', 'ผท.', 'สห.', 'อื่นๆ'],
  affiliation: ['ทบ.', 'กห.สป.', 'บก.ทท.', 'สทป.', 'ทม.รอ.', 'ลาออก', 'เกษียณก่อนกำหนด', 'เสียชีวิต', 'อื่นๆ'],
  religion: ['พุทธ', 'อิสลาม', 'คริสต์', 'อื่นๆ'],
  marital_status: ['โสด', 'สมรส', 'หย่า', 'หม้าย', 'อื่นๆ'],
};

const CONTROLLED_ALIASES = {
  rank: {
    'พลอ': 'พล.อ.',
    'พล.อ': 'พล.อ.',
    'พลท': 'พล.ท.',
    'พล.ท': 'พล.ท.',
    'พลต': 'พล.ต.',
    'พล.ต': 'พล.ต.',
    'พอ': 'พ.อ.',
    'พ.อ': 'พ.อ.',
    'พท': 'พ.ท.',
    'พ.ท': 'พ.ท.',
    'พต': 'พ.ต.',
    'พ.ต': 'พ.ต.',
  },
  branch: {
    ราบ: 'ร.',
    ทหารราบ: 'ร.',
    ม้า: 'ม.',
    ทหารม้า: 'ม.',
    ปืนใหญ่: 'ป.',
    ทหารปืนใหญ่: 'ป.',
    ช่าง: 'ช.',
    สื่อสาร: 'ส.',
    สพ: 'สพ.',
    ขว: 'ขว.',
    ขส: 'ขส.',
    พธ: 'พธ.',
    ผท: 'ผท.',
    สห: 'สห.',
  },
  affiliation: {
    ทบ: 'ทบ.',
    กหสป: 'กห.สป.',
    บกทท: 'บก.ทท.',
    สทป: 'สทป.',
    ทมรอ: 'ทม.รอ.',
  },
  religion: {
    พุทธศาสนา: 'พุทธ',
    อิสลามศาสนา: 'อิสลาม',
    คริส: 'คริสต์',
    คริสต์ศาสนา: 'คริสต์',
  },
  marital_status: {
    แต่งงาน: 'สมรส',
    สมรสแล้ว: 'สมรส',
    หย่าร้าง: 'หย่า',
  },
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/\(|\)/g, '');
}

export function getControlledDictionary(type) {
  return CONTROLLED_DICTIONARIES[type] || [];
}

export function resolveControlledValue(type, rawValue) {
  const text = normalizeText(rawValue);
  if (!text) {
    return { value: '', customValue: '' };
  }

  const options = getControlledDictionary(type);
  const key = normalizeKey(text);

  const directOption = options.find((item) => normalizeKey(item) === key);
  if (directOption) {
    return { value: directOption, customValue: '' };
  }

  const aliasMap = CONTROLLED_ALIASES[type] || {};
  if (aliasMap[key]) {
    return { value: aliasMap[key], customValue: '' };
  }

  if (options.includes('อื่นๆ')) {
    return { value: 'อื่นๆ', customValue: text };
  }

  return { value: text, customValue: '' };
}

export function normalizeControlledPayload(payload) {
  const next = { ...payload };
  const mappings = [
    { field: 'rank', customField: 'custom_rank', type: 'rank' },
    { field: 'branch', customField: 'custom_branch', type: 'branch' },
    { field: 'affiliation', customField: 'custom_affiliation', type: 'affiliation' },
    { field: 'religion', customField: 'custom_religion', type: 'religion' },
    { field: 'marital_status', customField: 'custom_marital_status', type: 'marital_status' },
  ];

  for (const map of mappings) {
    const { value, customValue } = resolveControlledValue(map.type, next[map.field]);
    next[map.field] = value;

    if (map.customField) {
      if (value === 'อื่นๆ') {
        next[map.customField] = normalizeText(customValue || next[map.customField]);
      } else {
        next[map.customField] = '';
      }
    }
  }

  return next;
}

export { CONTROLLED_DICTIONARIES };
