<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">Data Analytics <span class="text-red-700">Dashboard</span></h2>
        <p class="mt-1 text-sm text-gray-500">ระบบวิเคราะห์ข้อมูลภาพรวม ทำเนียบรุ่น จปร.42</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-24">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
    </div>

    <div v-else class="space-y-8">
      <!-- Top Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Card -->
        <div class="bg-gradient-to-br from-red-800 to-red-600 rounded-2xl shadow-xl p-6 text-white transform transition duration-300 hover:scale-105">
          <div class="flex items-center justify-between">
            <h3 class="text-red-100 text-lg font-medium opacity-80">ยอดกำลังพลทั้งหมด</h3>
            <svg class="h-8 w-8 text-red-200 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p class="mt-4 text-5xl font-extrabold tracking-tight">{{ total }} <span class="text-2xl font-medium text-red-200">นาย</span></p>
        </div>

        <!-- Rank Stats Quick View -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
          <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wider">ชั้นยศสูงสุดปัจจุบัน</h3>
          <div v-if="ranks.length > 0" class="mt-2 text-3xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3">
            {{ getHighestRankCount().rank }}
          </div>
          <p v-if="ranks.length > 0" class="mt-1 text-sm text-gray-500">จำนวน {{ getHighestRankCount().count }} นาย (คิดเป็น {{ Math.round((getHighestRankCount().count/total)*100) }}%)</p>
        </div>
        
        <!-- Retiring This/Next Year -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
          <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wider">จำนวนผู้เกษียณอายุ (ปี 2569)</h3>
          <div class="mt-2 text-3xl font-bold text-gray-900 border-l-4 border-yellow-500 pl-3">
             {{ getRetirementCountByYear(2569) }}
          </div>
          <p class="mt-1 text-sm text-gray-500">นาย ที่จะกำลังจะเกษียณราชการ</p>
        </div>

        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
          <h3 class="text-gray-500 text-sm font-medium uppercase tracking-wider">จำนวนผู้เกษียณอายุ (ปี 2570)</h3>
          <div class="mt-2 text-3xl font-bold text-gray-900 border-l-4 border-orange-500 pl-3">
             {{ getRetirementCountByYear(2570) }}
          </div>
          <p class="mt-1 text-sm text-gray-500">นาย ที่จะกำลังจะเกษียณราชการถัดไป</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Retirement Trend Bar Chart -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 class="font-bold text-gray-900 text-lg mb-6 flex items-center">
             <span class="w-2 h-6 bg-red-600 rounded mr-3"></span>
             กราฟสรุปจำนวนผู้เกษียณอายุในแต่ละปี
          </h3>
          <div class="h-80 relative">
             <Bar :data="retirementChartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Affiliation Pie Chart -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 class="font-bold text-gray-900 text-lg mb-6 flex items-center">
             <span class="w-2 h-6 bg-blue-600 rounded mr-3"></span>
             สัดส่วนการกระจายตัวตาม "หน่วยงาน/สังกัด"
          </h3>
          <div class="h-80 relative flex justify-center">
             <Doughnut :data="affiliationChartData" :options="pieOptions" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Rank Distribution Bar Chart (Horizontal) -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 class="font-bold text-gray-900 text-lg mb-6 flex items-center">
             <span class="w-2 h-6 bg-yellow-500 rounded mr-3"></span>
             สถิติจำนวนยศปัจจุบันในแต่ละระดับ
          </h3>
          <div class="h-[350px] relative">
             <Bar :data="rankChartData" :options="horizontalBarOptions" />
          </div>
        </div>

        <!-- Branch Pie Chart -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 class="font-bold text-gray-900 text-lg mb-6 flex items-center">
             <span class="w-2 h-6 bg-green-500 rounded mr-3"></span>
             สัดส่วนย่อยตาม "เหล่าทหาร"
          </h3>
          <div class="h-[350px] relative flex justify-center">
             <Pie :data="branchChartData" :options="pieOptions" />
          </div>
        </div>
      </div>

      <!-- Interactive Map: Deployment Map -->
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 overflow-hidden">
        <div class="mb-6 flex justify-between items-center">
          <h3 class="font-bold text-gray-900 text-lg flex items-center">
             <span class="w-2 h-6 bg-indigo-600 rounded mr-3"></span>
             Deployment Map (แผนที่การกระจายกำลัง/ที่อยู่อาศัย)
          </h3>
          <span class="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-medium">ภาพรวมประเทศไทย</span>
        </div>
        <div class="h-[500px] w-full bg-gray-100 rounded-xl overflow-hidden relative" id="leaflet-map-container" style="z-index: 1;">
        </div>
        
        <div class="mt-6">
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">สรุปข้อมูลเชิงแผนที่</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div v-for="item in provinceSummaries" :key="item.province" class="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                <p class="text-xs font-medium text-gray-600 truncate" :title="item.province">{{ item.province }}</p>
                <p class="mt-1 text-lg font-bold text-indigo-700">{{ item.count }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import api from '../services/api';
// Chart JS imports
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Pie, Doughnut } from 'vue-chartjs'
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const loading = ref(true);
const total = ref(0);
const ranks = ref([]);
const affiliations = ref([]);
const branches = ref([]);
const retirements = ref([]);
const provinces = ref([]);

// Mapping constants for plotting
const provinceCoordinates = {
  "กรุงเทพมหานคร": [13.7563, 100.5018],
  "เชียงใหม่": [18.7883, 98.9853],
  "ชลบุรี": [13.3611, 100.9847],
  "ขอนแก่น": [16.4322, 102.8236],
  "นครราชสีมา": [14.9799, 102.0978],
  "สงขลา": [7.1898, 100.5954],
  "สุราษฎร์ธานี": [9.1332, 99.3175],
  "พระนครศรีอยุธยา": [14.3582, 100.5596],
  "พิษณุโลก": [16.8211, 100.2659],
  "ประจวบคีรีขันธ์": [11.8123, 99.7972],
  "เชียงราย": [19.9105, 99.8406],
  "อุดรธานี": [17.4138, 102.7872],
  "นครสวรรค์": [15.7058, 100.1415],
  "ภูเก็ต": [7.8804, 98.3923]
};

const getHighestRankCount = () => {
  if (!ranks.value.length) return { rank: '-', count: 0 };
  // Find highest count (assuming that's what makes sense for summary)
  return ranks.value.reduce((prev, current) => (parseInt(prev.count) > parseInt(current.count)) ? prev : current);
};

const getRetirementCountByYear = (year) => {
  const item = retirements.value.find(r => r.retirement_year == year);
  return item ? item.count : 0;
};

// Computed chart objects
const retirementChartData = computed(() => {
  return {
    labels: retirements.value.map(r => `ปี พ.ศ. ${r.retirement_year}`),
    datasets: [{
      label: 'จำนวน (นาย)',
      backgroundColor: 'rgba(220, 38, 38, 0.8)', // red-600
      borderColor: 'rgba(220, 38, 38, 1)',
      borderWidth: 1,
      borderRadius: 4,
      data: retirements.value.map(r => parseInt(r.count))
    }]
  }
});

const affiliationChartData = computed(() => {
  const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
  return {
    labels: affiliations.value.map(a => a.affiliation || 'ไม่ระบุ'),
    datasets: [{
      backgroundColor: colors.slice(0, affiliations.value.length),
      borderWidth: 0,
      hoverOffset: 4,
      data: affiliations.value.map(a => parseInt(a.count))
    }]
  }
});

const branchChartData = computed(() => {
  const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b', '#d97706'];
  return {
    labels: branches.value.map(a => a.branch || 'ไม่ระบุ'),
    datasets: [{
      backgroundColor: colors.slice(0, branches.value.length),
      borderWidth: 0,
      data: branches.value.map(a => parseInt(a.count))
    }]
  }
});

const rankChartData = computed(() => {
  return {
    labels: ranks.value.map(a => a.rank || 'ไม่ระบุ'),
    datasets: [{
      label: 'จำนวน (นาย)',
      backgroundColor: 'rgba(245, 158, 11, 0.8)', // amber-500
      borderRadius: 4,
      data: ranks.value.map(a => parseInt(a.count))
    }]
  }
});

const provinceSummaries = computed(() => {
  // Take top 12 by count
  return [...provinces.value].sort((a,b) => b.count - a.count).slice(0, 12);
});

// Options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
};

const horizontalBarOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right' } },
  cutout: '50%'
};

const initMap = () => {
  // Leaflet map initialization focused on Thailand
  const map = L.map('leaflet-map-container', {
      zoomControl: true,
      scrollWheelZoom: false
  }).setView([13.7367, 100.5231], 6); // Default view Thailand

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      maxZoom: 19
  }).addTo(map);

  // Group markers for bounds
  const markers = [];

  provinces.value.forEach(p => {
    if (!p.province) return;
    const count = p.count;
    let coords = provinceCoordinates[p.province];
    
    // If we don't have hardcoded coords, apply a random offset around central Thailand to show multiple pins
    if (!coords) {
        const r1 = (Math.random() - 0.5) * 4;
        const r2 = (Math.random() - 0.5) * 4;
        coords = [15.8700 + r1, 100.9925 + r2];
    }
    
    // Create custom icon or circle marker representing count
    const radiusSize = Math.max(10, Math.min(30, count * 3));
    
    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: rgba(79, 70, 229, 0.8); color: white; border: 2px solid white; border-radius: 50%; width: ${radiusSize}px; height: ${radiusSize}px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${radiusSize < 20 ? '10px' : '12px'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">${count}</div>`,
        iconSize: [radiusSize, radiusSize],
        iconAnchor: [radiusSize/2, radiusSize/2]
    });

    const marker = L.marker(coords, { icon: icon }).addTo(map);
    marker.bindPopup(`<b>จังหวัด:</b> ${p.province}<br><b>จำนวน:</b> ${count} นาย`);
    markers.push(marker);
  });

  if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
  }
};

const loadStats = async () => {
    try {
        const stats = await api.getDashboardStats();
        total.value = stats.data.total;
        ranks.value = stats.data.rankDistribution;
        affiliations.value = stats.data.affiliationDistribution;
        branches.value = stats.data.branchDistribution;
        retirements.value = stats.data.retirementDistribution || [];

        const mapData = await api.getMapDistribution();
        provinces.value = mapData.data;

        await nextTick(); // Wait for DOM flush so map container is ready
        initMap();
        
    } catch (e) {
        console.error('Failed to load dashboard', e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadStats();
});
</script>
