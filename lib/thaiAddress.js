const rawDb = require('thai-address-database/database/db.json');

const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function expandDb(data) {
  const lookup = data.lookup ? data.lookup.split('|') : [];
  const words = data.words ? data.words.split('|') : [];
  const useLookup = Boolean(data.lookup && data.words);
  const source = useLookup ? data.data : data;
  const expanded = [];

  const translate = (value) => {
    if (!useLookup) {
      return value;
    }

    const text = typeof value === 'number' ? lookup[value] : value;
    return text.replace(/[A-Z]/g, (ch) => {
      const code = ch.charCodeAt(0);
      return words[code < 97 ? code - 65 : 26 + code - 97];
    });
  };

  if (!source[0]?.length) {
    return source;
  }

  source.forEach((provinceEntry) => {
    const province = translate(provinceEntry[0]);
    provinceEntry[1].forEach((amphoeEntry) => {
      const amphoe = translate(amphoeEntry[0]);
      amphoeEntry[1].forEach((districtEntry) => {
        const district = translate(districtEntry[0]);
        const zipcodes = Array.isArray(districtEntry[1]) ? districtEntry[1] : [districtEntry[1]];
        zipcodes.forEach((zipcode) => {
          expanded.push({ province, amphoe, district, zipcode: String(zipcode) });
        });
      });
    });
  });

  return expanded;
}

const records = expandDb(rawDb);

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'th'));
}

function includeText(value, query) {
  if (!query) {
    return true;
  }
  return value.toLowerCase().includes(query.toLowerCase());
}

function getProvinces(query = '') {
  return uniqueSorted(records.map((item) => item.province)).filter((name) => includeText(name, query));
}

function getAmphoes(province, query = '') {
  return uniqueSorted(
    records
      .filter((item) => item.province === province)
      .map((item) => item.amphoe)
  ).filter((name) => includeText(name, query));
}

function getDistricts(province, amphoe, query = '') {
  return uniqueSorted(
    records
      .filter((item) => item.province === province && item.amphoe === amphoe)
      .map((item) => item.district)
  ).filter((name) => includeText(name, query));
}

function getZipcode(province, amphoe, district) {
  const found = records.find(
    (item) => item.province === province && item.amphoe === amphoe && item.district === district
  );
  return found ? found.zipcode : '';
}

module.exports = {
  MONTHS,
  getProvinces,
  getAmphoes,
  getDistricts,
  getZipcode,
};
