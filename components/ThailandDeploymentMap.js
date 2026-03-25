'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const THAILAND_CENTER = [13.7563, 100.5018];

// Province center points used for high-level distribution map visualization.
const PROVINCE_COORDS = {
  กรุงเทพมหานคร: [13.7563, 100.5018],
  กระบี่: [8.0863, 98.9063],
  กาญจนบุรี: [14.0228, 99.5328],
  กาฬสินธุ์: [16.438, 103.506],
  กำแพงเพชร: [16.4828, 99.5227],
  ขอนแก่น: [16.4419, 102.835],
  จันทบุรี: [12.6112, 102.1038],
  ฉะเชิงเทรา: [13.6904, 101.0779],
  ชลบุรี: [13.3611, 100.9847],
  ชัยนาท: [15.1852, 100.1251],
  ชัยภูมิ: [15.8068, 102.0315],
  ชุมพร: [10.493, 99.1804],
  เชียงราย: [19.9105, 99.8406],
  เชียงใหม่: [18.7883, 98.9853],
  ตรัง: [7.5563, 99.6114],
  ตราด: [12.2428, 102.5175],
  ตาก: [16.8847, 99.1259],
  นครนายก: [14.2069, 101.2131],
  นครปฐม: [13.8199, 100.0622],
  นครพนม: [17.392, 104.7695],
  นครราชสีมา: [14.9799, 102.0977],
  นครศรีธรรมราช: [8.4324, 99.9599],
  นครสวรรค์: [15.693, 100.1226],
  นนทบุรี: [13.8621, 100.5144],
  นราธิวาส: [6.4264, 101.8253],
  น่าน: [18.7756, 100.773],
  บึงกาฬ: [18.3609, 103.6464],
  บุรีรัมย์: [14.993, 103.1029],
  ปทุมธานี: [14.0208, 100.525],
  ประจวบคีรีขันธ์: [11.8124, 99.7973],
  ปราจีนบุรี: [14.05, 101.3688],
  ปัตตานี: [6.8695, 101.2505],
  พระนครศรีอยุธยา: [14.3532, 100.5689],
  พังงา: [8.4509, 98.5255],
  พัทลุง: [7.6179, 100.074],
  พิจิตร: [16.4419, 100.3491],
  พิษณุโลก: [16.8211, 100.2659],
  เพชรบุรี: [13.1112, 99.9391],
  เพชรบูรณ์: [16.419, 101.1606],
  แพร่: [18.1458, 100.141],
  พะเยา: [19.192, 99.8786],
  ภูเก็ต: [7.8804, 98.3923],
  มหาสารคาม: [16.1848, 103.3],
  มุกดาหาร: [16.5424, 104.7227],
  แม่ฮ่องสอน: [19.302, 97.9654],
  ยโสธร: [15.7926, 104.1452],
  ยะลา: [6.5411, 101.2804],
  ร้อยเอ็ด: [16.0567, 103.6531],
  ระนอง: [9.9529, 98.6085],
  ระยอง: [12.6814, 101.2816],
  ราชบุรี: [13.5367, 99.8171],
  ลพบุรี: [14.7995, 100.6534],
  ลำปาง: [18.2888, 99.4908],
  ลำพูน: [18.5742, 99.0087],
  เลย: [17.486, 101.7223],
  ศรีสะเกษ: [15.1186, 104.322],
  สกลนคร: [17.1614, 104.1479],
  สงขลา: [7.1988, 100.5951],
  สตูล: [6.6238, 100.0674],
  สมุทรปราการ: [13.5991, 100.5998],
  สมุทรสงคราม: [13.4098, 100.0023],
  สมุทรสาคร: [13.5475, 100.2744],
  สระแก้ว: [13.824, 102.0646],
  สระบุรี: [14.5289, 100.9101],
  สิงห์บุรี: [14.8936, 100.3967],
  สุโขทัย: [17.0056, 99.8264],
  สุพรรณบุรี: [14.4742, 100.1177],
  สุราษฎร์ธานี: [9.1382, 99.3217],
  สุรินทร์: [14.8829, 103.4937],
  หนองคาย: [17.8783, 102.7413],
  หนองบัวลำภู: [17.2218, 102.426],
  อ่างทอง: [14.5896, 100.455],
  อำนาจเจริญ: [15.8657, 104.6258],
  อุดรธานี: [17.4138, 102.787],
  อุตรดิตถ์: [17.6201, 100.0993],
  อุทัยธานี: [15.3835, 100.0246],
  อุบลราชธานี: [15.2287, 104.8564],
};

function normalizeProvince(province) {
  return String(province || '')
    .trim()
    .replace(/^จังหวัด\s*/, '')
    .replace(/\s+/g, '');
}

function resolveProvinceLatLng(province) {
  const normalized = normalizeProvince(province);
  const exact = Object.entries(PROVINCE_COORDS).find(([key]) => normalizeProvince(key) === normalized);
  return exact ? exact[1] : null;
}

function getHeatColor(value, maxValue) {
  if (!maxValue || value <= 0) {
    return '#93c5fd';
  }

  const ratio = value / maxValue;
  if (ratio >= 0.8) return '#b91c1c';
  if (ratio >= 0.6) return '#dc2626';
  if (ratio >= 0.4) return '#ea580c';
  if (ratio >= 0.2) return '#f59e0b';
  return '#60a5fa';
}

export default function ThailandDeploymentMap({ points = [], legendTitle = 'ความหนาแน่นข้อมูล' }) {
  const mappedPoints = useMemo(() => {
    return points
      .map((item) => {
        const latLng = resolveProvinceLatLng(item.province);
        if (!latLng) {
          return null;
        }

        const count = Number(item.count || 0);
        return {
          province: item.province,
          count,
          latLng,
          radius: Math.min(26, Math.max(8, 6 + count * 1.8)),
        };
      })
      .filter(Boolean);
  }, [points]);

  const maxCount = useMemo(
    () => mappedPoints.reduce((max, point) => Math.max(max, Number(point.count || 0)), 0),
    [mappedPoints]
  );

  if (!mappedPoints.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        ยังไม่มีข้อมูลจังหวัดที่สามารถแสดงบนแผนที่ได้
      </div>
    );
  }

  // Ensure Leaflet default marker assets resolve correctly in Next.js build output.
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={THAILAND_CENTER} zoom={6} style={{ height: '460px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedPoints.map((point) => (
          <CircleMarker
            key={`${point.province}-${point.latLng[0]}-${point.latLng[1]}`}
            center={point.latLng}
            radius={point.radius}
            pathOptions={{
              color: '#1e3a8a',
              fillColor: getHeatColor(point.count, maxCount),
              fillOpacity: 0.65,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-slate-900">{point.province}</p>
                <p className="text-slate-700">จำนวนสมาชิก: {point.count} คน</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow">
        <p className="font-semibold text-slate-900">{legendTitle}</p>
        <div className="mt-2 space-y-1 text-slate-700">
          <div className="flex items-center gap-2"><span className="h-3 w-5 rounded" style={{ backgroundColor: '#60a5fa' }} /> ต่ำ</div>
          <div className="flex items-center gap-2"><span className="h-3 w-5 rounded" style={{ backgroundColor: '#f59e0b' }} /> ปานกลาง</div>
          <div className="flex items-center gap-2"><span className="h-3 w-5 rounded" style={{ backgroundColor: '#dc2626' }} /> สูง</div>
          <div className="flex items-center gap-2"><span className="h-3 w-5 rounded" style={{ backgroundColor: '#b91c1c' }} /> สูงมาก</div>
        </div>
      </div>
    </div>
  );
}
