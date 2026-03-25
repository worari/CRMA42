'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { dashboardAPI, messagingAPI } from '@/lib/api';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const valueLabelPlugin = {
  id: 'valueLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta || meta.hidden) {
        return;
      }

      meta.data.forEach((element, index) => {
        const rawValue = Array.isArray(dataset.data) ? dataset.data[index] : null;
        const value = Number(rawValue || 0);
        if (!value) {
          return;
        }

        const label = String(value);
        ctx.font = '700 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Arc elements (pie chart)
        if (typeof element.startAngle === 'number') {
          const angle = (element.startAngle + element.endAngle) / 2;
          const radius = element.innerRadius + (element.outerRadius - element.innerRadius) * 0.62;
          const x = element.x + Math.cos(angle) * radius;
          const y = element.y + Math.sin(angle) * radius;

          ctx.fillStyle = '#111827';
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeText(label, x, y);
          ctx.fillText(label, x, y);
          return;
        }

        // Bar elements
        if (typeof element.x === 'number' && typeof element.y === 'number') {
          const x = element.x;
          const y = element.y - 12;
          ctx.fillStyle = '#14532d';
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeText(label, x, y);
          ctx.fillText(label, x, y);
        }
      });
    });

    ctx.restore();
  },
};

ChartJS.register(valueLabelPlugin);

const ThailandDeploymentMap = dynamic(() => import('@/components/ThailandDeploymentMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
      กำลังโหลดแผนที่ประเทศไทย...
    </div>
  ),
});

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [distributionMode, setDistributionMode] = useState('affiliation');
  const [mapData, setMapData] = useState({ points: [], total_with_province: 0 });
  const [mapGroupBy, setMapGroupBy] = useState('all');
  const [mapFilterValue, setMapFilterValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [birthdaySending, setBirthdaySending] = useState(false);
  const [birthdaySendResult, setBirthdaySendResult] = useState('');
  const [birthdayMessage, setBirthdayMessage] = useState('สุขสันต์วันเกิดครับ/ค่ะ {rank} {first_name} {last_name}\n\nขอให้มีสุขภาพแข็งแรง มีความสุข และประสบความสำเร็จในทุกด้าน\n\nจากระบบทำเนียบรุ่น CRMA42');
  const [selectedBirthdayIds, setSelectedBirthdayIds] = useState([]);

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsResponse, mapResponse] = await Promise.all([
          dashboardAPI.getStats(selectedMonth),
          dashboardAPI.getMapDistribution(),
        ]);
        setStats(statsResponse.data);
        setMapData(mapResponse.data || { points: [], total_with_province: 0 });
      } catch (err) {
        setError('Failed to load statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedMonth]);

  const distributionSource = distributionMode === 'branch'
    ? (stats?.branchDistribution || [])
    : (stats?.affiliationDistribution || []);

  const distributionLabel = distributionMode === 'branch' ? 'เหล่า' : 'สังกัด';

  const rankTop = [...(stats?.rankDistribution || [])]
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 8);

  const mapFilterOptions = useMemo(() => {
    if (mapGroupBy === 'affiliation') {
      return (stats?.affiliationDistribution || [])
        .map((item) => item.affiliation)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), 'th'));
    }

    if (mapGroupBy === 'branch') {
      return (stats?.branchDistribution || [])
        .map((item) => item.branch)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), 'th'));
    }

    return [];
  }, [mapGroupBy, stats?.affiliationDistribution, stats?.branchDistribution]);

  const filteredMapPoints = useMemo(() => {
    const source = mapData.points || [];
    if (mapGroupBy === 'all' || !mapFilterValue) {
      return source.map((point) => ({ ...point, filtered_count: Number(point.count || 0) }));
    }

    return source
      .map((point) => {
        const count = mapGroupBy === 'affiliation'
          ? Number(point.affiliation_counts?.[mapFilterValue] || 0)
          : Number(point.branch_counts?.[mapFilterValue] || 0);
        return {
          ...point,
          filtered_count: count,
        };
      })
      .filter((point) => point.filtered_count > 0)
      .sort((a, b) => b.filtered_count - a.filtered_count || String(a.province).localeCompare(String(b.province), 'th'));
  }, [mapData.points, mapGroupBy, mapFilterValue]);

  const mapFilteredTotal = useMemo(() => {
    return filteredMapPoints.reduce((sum, point) => sum + Number(point.filtered_count || 0), 0);
  }, [filteredMapPoints]);

  const distributionTotal = useMemo(() => {
    return distributionSource.reduce((sum, item) => sum + Number(item.count || 0), 0);
  }, [distributionSource]);

  const distributionTop = useMemo(() => {
    return [...distributionSource]
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0] || null;
  }, [distributionSource]);

  const rankTotal = useMemo(() => {
    return (stats?.rankDistribution || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  }, [stats?.rankDistribution]);

  const retirementTotal = useMemo(() => {
    return (stats?.retirementDistribution || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  }, [stats?.retirementDistribution]);

  const birthdayList = stats?.birthdayInMonth || [];

  useEffect(() => {
    setSelectedBirthdayIds([]);
  }, [selectedMonth]);

  const formatThaiFullDate = (value) => {
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
  };

  const handleSendBirthdayGreeting = async (payload) => {
    setBirthdaySending(true);
    setBirthdaySendResult('');

    try {
      const response = await messagingAPI.sendBirthdayGreetingNow(payload);
      const data = response.data;
      setBirthdaySendResult(
        `ส่งสำเร็จ ${data.sent || 0} คน, ข้าม ${data.skipped || 0} คน, ล้มเหลว ${data.failed || 0} คน`
      );
    } catch (err) {
      setBirthdaySendResult(err?.response?.data?.message || 'ส่งข้อความวันเกิดไม่สำเร็จ');
    } finally {
      setBirthdaySending(false);
    }
  };

  const handleSendTodayBirthdayGreeting = () => {
    handleSendBirthdayGreeting({ mode: 'today' });
  };

  const handleSendAllInMonth = () => {
    handleSendBirthdayGreeting({
      mode: 'all_in_month',
      month: selectedMonth,
      message: birthdayMessage,
    });
  };

  const handleSendSelected = () => {
    if (!selectedBirthdayIds.length) {
      setBirthdaySendResult('กรุณาเลือกรายชื่ออย่างน้อย 1 คน');
      return;
    }

    handleSendBirthdayGreeting({
      mode: 'selected',
      alumni_ids: selectedBirthdayIds,
      message: birthdayMessage,
    });
  };

  const handleSendSingle = (alumniId) => {
    handleSendBirthdayGreeting({
      mode: 'single',
      alumni_id: alumniId,
      message: birthdayMessage,
    });
  };

  const toggleBirthdaySelection = (alumniId, checked) => {
    setSelectedBirthdayIds((prev) => {
      if (checked) {
        if (prev.includes(alumniId)) {
          return prev;
        }
        return [...prev, alumniId];
      }
      return prev.filter((id) => id !== alumniId);
    });
  };

  const toggleSelectAllVisible = (checked) => {
    if (!checked) {
      setSelectedBirthdayIds([]);
      return;
    }
    setSelectedBirthdayIds(birthdayList.map((item) => item.id));
  };

  if (loading) {
    return (
      <div className="ux-surface text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d3b66] mx-auto"></div>
        <p className="text-slate-700 mt-4 font-semibold">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="ux-surface text-center py-12 text-[#0d3b66] font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ux-surface p-5">
        <h1 className="ux-page-title">Interactive Analytics Dashboard</h1>
        <p className="ux-page-subtitle mt-1">วิเคราะห์ภาพรวมกำลังพลรุ่น: เกษียณ สังกัด/เหล่า ยศ และการกระจายตามจังหวัด</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="ux-kpi p-5">
          <p className="text-slate-700 text-sm">จำนวนศิษย์เก่าทั้งหมด</p>
          <p className="text-4xl font-black text-[#0d3b66] mt-1">{stats.total}</p>
        </div>
        <div className="ux-kpi p-5">
          <p className="text-slate-700 text-sm">วันเกิดวันนี้</p>
          <p className="text-4xl font-black text-[#0d3b66] mt-1">{stats.todayBirthdayCount || 0}</p>
        </div>
        <div className="ux-kpi p-5">
          <p className="text-slate-700 text-sm">ผู้มีวันเกิดเดือนนี้</p>
          <p className="text-4xl font-black text-[#0d3b66] mt-1">{stats.birthdayInMonth?.length || 0}</p>
        </div>
        <div className="ux-kpi p-5">
          <p className="text-slate-700 text-sm">สมาชิกที่แสดงบนแผนที่</p>
          <p className="text-4xl font-black text-emerald-700 mt-1">{mapFilteredTotal || 0}</p>
        </div>
      </div>

      <div className="ux-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">แจ้งเตือนวันเกิดรายเดือน</h3>
            <p className="text-sm text-gray-600">เลือกเดือนเพื่อดูรายชื่อและจัดการการส่งข้อความอวยพร</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="ux-input text-sm"
            >
              {thaiMonths.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSendTodayBirthdayGreeting}
              disabled={birthdaySending}
              className="ux-btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {birthdaySending ? 'กำลังส่ง...' : 'ส่งสุขสันต์วันเกิดวันนี้ (LINE)'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <p className="text-sm font-semibold text-slate-800">ข้อความอวยพร (รองรับตัวแปร {'{rank}'} {'{first_name}'} {'{last_name}'})</p>
          <textarea
            value={birthdayMessage}
            onChange={(e) => setBirthdayMessage(e.target.value)}
            rows={4}
            className="ux-input w-full text-sm"
            placeholder="พิมพ์ข้อความอวยพร..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSendAllInMonth}
              disabled={birthdaySending || !birthdayList.length}
              className="rounded-md bg-[#0d3b66] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a2f52] disabled:opacity-50"
            >
              ส่งทั้งหมดในเดือนนี้ ({birthdayList.length})
            </button>
            <button
              type="button"
              onClick={handleSendSelected}
              disabled={birthdaySending || !selectedBirthdayIds.length}
              className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              ส่งเฉพาะที่เลือก ({selectedBirthdayIds.length})
            </button>
          </div>
        </div>

        {birthdaySendResult && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800">
            {birthdaySendResult}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={birthdayList.length > 0 && selectedBirthdayIds.length === birthdayList.length}
                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2 text-left">วันเกิด</th>
                <th className="px-3 py-2 text-left">รายชื่อ</th>
                <th className="px-3 py-2 text-left">ชื่อเล่น</th>
                <th className="px-3 py-2 text-left">สถานะ LINE</th>
                <th className="px-3 py-2 text-left">ส่งรายคน</th>
              </tr>
            </thead>
            <tbody>
              {(stats.birthdayInMonth || []).length > 0 ? (
                stats.birthdayInMonth.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedBirthdayIds.includes(item.id)}
                        onChange={(e) => toggleBirthdaySelection(item.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">{formatThaiFullDate(item.date_of_birth)}</td>
                    <td className="px-3 py-2">{item.rank} {item.first_name} {item.last_name}</td>
                    <td className="px-3 py-2">{item.nickname || '-'}</td>
                    <td className="px-3 py-2">{item.line_id ? 'พร้อมส่ง' : 'ไม่มี LINE ID'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleSendSingle(item.id)}
                        disabled={birthdaySending || !item.line_id}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        ส่งให้คนนี้
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-600" colSpan={6}>ไม่พบรายชื่อวันเกิดในเดือนนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ux-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">การกระจายตาม {distributionLabel}</h3>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 text-sm">
              <button
                type="button"
                onClick={() => setDistributionMode('affiliation')}
                className={`rounded-md px-3 py-1 ${distributionMode === 'affiliation' ? 'bg-[#0d3b66] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                สังกัด
              </button>
              <button
                type="button"
                onClick={() => setDistributionMode('branch')}
                className={`rounded-md px-3 py-1 ${distributionMode === 'branch' ? 'bg-[#0d3b66] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                เหล่า
              </button>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-700">ยอดรวม</p>
              <p className="text-3xl font-black text-[#0d3b66]">{distributionTotal}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-xs text-emerald-800">สูงสุด</p>
              <p className="text-xl font-black text-emerald-700 truncate">{distributionTop ? `${distributionTop[distributionMode] || 'ไม่ระบุ'} (${Number(distributionTop.count || 0)})` : '-'}</p>
            </div>
          </div>
          {distributionSource.length > 0 && (
            <Pie
              data={{
                labels: distributionSource.map((item) => item[distributionMode] || 'ไม่ระบุ'),
                datasets: [{
                  data: distributionSource.map((item) => Number(item.count || 0)),
                  backgroundColor: [
                    '#f97316', '#22c55e', '#fb923c', '#4ade80', '#ea580c',
                    '#16a34a', '#fdba74', '#86efac', '#c2410c', '#15803d'
                  ],
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                layout: {
                  padding: {
                    top: 12,
                    right: 8,
                    left: 8,
                    bottom: 8,
                  },
                },
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.label}: ${context.parsed} คน`,
                    },
                  },
                },
              }}
            />
          )}
        </div>

        <div className="ux-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">สถิติจำนวนยศปัจจุบันในแต่ละระดับ</h3>
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-xs text-green-800">ยอดรวมทุกยศ</p>
            <p className="text-4xl font-black text-green-700">{rankTotal}</p>
          </div>
          {rankTop.length > 0 && (
            <Bar
              data={{
                labels: rankTop.map((item) => item.rank || 'ไม่ระบุ'),
                datasets: [{
                  label: 'จำนวน',
                  data: rankTop.map((item) => Number(item.count || 0)),
                  backgroundColor: '#22c55e',
                  borderColor: '#15803d',
                  borderWidth: 1,
                }],
              }}
              options={{
                responsive: true,
                layout: {
                  padding: {
                    top: 18,
                    right: 10,
                    left: 10,
                    bottom: 0,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.parsed.y} คน`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-700">
            {(stats.rankDistribution || []).map((item) => (
              <div key={item.rank || 'unknown'} className="rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
                {(item.rank || 'ไม่ระบุ')}: {Number(item.count || 0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ux-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">กราฟสรุปจำนวนผู้ที่กำลังจะเกษียณในแต่ละปี</h3>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-700">ยอดรวมผู้ที่อยู่ในกลุ่มปีเกษียณ</p>
          <p className="text-4xl font-black text-[#0d3b66]">{retirementTotal}</p>
        </div>
        {stats.retirementDistribution && stats.retirementDistribution.length > 0 && (
          <Bar
            data={{
              labels: stats.retirementDistribution.map((item) => item.retirement_year ? `พ.ศ. ${Number(item.retirement_year) + 543}` : '-'),
              datasets: [{
                label: 'จำนวนที่จะเกษียณ',
                data: stats.retirementDistribution.map((item) => Number(item.count || 0)),
                borderColor: '#ea580c',
                backgroundColor: '#fb923c',
                borderWidth: 1,
              }],
            }}
            options={{
              responsive: true,
                layout: {
                  padding: {
                    top: 18,
                    right: 10,
                    left: 10,
                    bottom: 0,
                  },
                },
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `ปี ${context.label}: ${context.parsed.y} คน`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
            }}
          />
        )}
      </div>

      <div className="ux-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">แผนที่ประเทศไทย (Leaflet) การกระจายกำลัง</h3>
            <p className="text-sm text-slate-600">ปักหมุดตามจังหวัดที่มีข้อมูลที่พักอาศัย/ประจำการ และขนาดวงกลมสัมพันธ์กับจำนวนสมาชิก</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700">
            จังหวัดที่แสดงผล: {filteredMapPoints.length}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={mapGroupBy}
            onChange={(e) => {
              setMapGroupBy(e.target.value);
              setMapFilterValue('');
            }}
            className="ux-input text-sm"
          >
            <option value="all">แสดงทั้งหมด</option>
            <option value="affiliation">กรองตามสังกัด</option>
            <option value="branch">กรองตามเหล่า</option>
          </select>

          <select
            value={mapFilterValue}
            onChange={(e) => setMapFilterValue(e.target.value)}
            disabled={mapGroupBy === 'all'}
            className="ux-input text-sm disabled:bg-slate-100"
          >
            <option value="">ทุกค่า</option>
            {mapFilterOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            โหมดแผนที่: {mapGroupBy === 'all' ? 'ภาพรวมทั้งหมด' : mapGroupBy === 'affiliation' ? `สังกัด ${mapFilterValue || 'ทั้งหมด'}` : `เหล่า ${mapFilterValue || 'ทั้งหมด'}`}
          </div>
        </div>

        <ThailandDeploymentMap
          points={filteredMapPoints.map((item) => ({ ...item, count: item.filtered_count }))}
          legendTitle={mapGroupBy === 'all' ? 'ความหนาแน่นรวม' : mapGroupBy === 'affiliation' ? `ความหนาแน่น: สังกัด ${mapFilterValue || 'ทั้งหมด'}` : `ความหนาแน่น: เหล่า ${mapFilterValue || 'ทั้งหมด'}`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50 p-4">
        <p className="text-slate-700 text-sm">
          Dashboard นี้เป็น Interactive Analytics: คุณสามารถสลับการวิเคราะห์ตามสังกัด/เหล่า, ตรวจแนวโน้มปีเกษียณ,
          ดูสัดส่วนยศปัจจุบัน และติดตามการกระจายตัวบนแผนที่ประเทศไทยได้ในหน้าเดียว
        </p>
      </div>
    </div>
  );
}
