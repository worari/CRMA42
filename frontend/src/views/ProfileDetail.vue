<template>
  <div v-if="loading" class="text-center py-12">กำลังโหลดข้อมูล...</div>
  
  <div v-else-if="profile" class="max-w-4xl mx-auto space-y-6">
    
    <!-- Top Actions -->
    <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <button @click="$router.push('/')" class="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-2 transition-colors">
        ← กลับไปหน้ารายชื่อ
      </button>
      <div class="flex gap-3">
        <button @click="$router.push(`/form/${profile.id}`)" class="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-amber-200 transition-colors">✏️ แก้ไขข้อมูล</button>
        <button @click="printDoc()" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-200 transition-colors">พิมพ์ DOC</button>
        <button @click="printPdf()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700 transition-colors">Export PDF</button>
      </div>
    </div>

    <!-- Biography Content to Print -->
    <div id="bio-print-area" class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      
      <!-- Header / Profile Section -->
      <div class="p-8 sm:p-10 border-b border-gray-100 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-blue-50 to-white">
        <img v-if="profile.profile_photo" :src="profile.profile_photo" class="h-40 w-40 rounded-full object-cover shadow-md ring-4 ring-white" />
        <div v-else class="h-40 w-40 rounded-full bg-blue-100 flex items-center justify-center shadow-md ring-4 ring-white">
          <span class="text-blue-800 font-bold text-5xl">{{ profile.first_name ? profile.first_name.charAt(0) : '?' }}</span>
        </div>
        
        <div class="text-center md:text-left space-y-2">
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">{{ profile.rank }} {{ profile.first_name }} {{ profile.last_name }} <span v-if="profile.nickname" class="text-xl text-gray-500 font-normal">({{ profile.nickname }})</span></h1>
          <p class="text-lg text-blue-700 font-semibold">{{ profile.rank }} ({{ profile.affiliation }}) ({{ profile.branch }})</p>
          <p class="text-gray-600 flex items-center justify-center md:justify-start gap-2">
            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">{{ profile.status }}</span>
            <span v-if="profile.affiliation === 'เสียชีวิต'" class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">เสียชีวิต</span>
          </p>
          <p class="text-gray-700 mt-2 font-medium">ตำแหน่ง: <span class="text-gray-900">{{ profile.position || '-' }}</span></p>
          <p class="text-sm text-gray-500">รหัสประจำตัวทหาร: {{ profile.military_id }}</p>
        </div>
      </div>

      <!-- Details Grid Grid -->
      <div class="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        
        <!-- Personal & Dates -->
        <div>
          <h3 class="text-lg font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1 mb-4">ข้อมูลส่วนตัว</h3>
          <dl class="space-y-3 text-sm">
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">วันเกิด</dt>
              <dd class="text-gray-900 col-span-2">{{ formatDate(profile.date_of_birth) }}</dd>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">ปีที่เกษียณ</dt>
              <dd class="text-gray-900 col-span-2 font-semibold">{{ profile.retirement_year || '-' }}</dd>
            </div>
          </dl>
        </div>

        <!-- Contact Info -->
        <div>
          <h3 class="text-lg font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1 mb-4">การติดต่อ</h3>
          <dl class="space-y-3 text-sm">
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">โทรศัพท์หลัก</dt>
              <dd class="text-gray-900 col-span-2">{{ profile.contacts?.phone_primary || '-' }}</dd>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">เบอร์สำรอง</dt>
              <dd class="text-gray-900 col-span-2">{{ profile.contacts?.phone_secondary || '-' }}</dd>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">อีเมล</dt>
              <dd class="text-gray-900 col-span-2">{{ profile.contacts?.email || '-' }}</dd>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <dt class="text-gray-500 font-medium">Line ID</dt>
              <dd class="text-gray-900 col-span-2">{{ profile.contacts?.line_id || '-' }}</dd>
            </div>
          </dl>
        </div>

        <!-- Family Info & Children -->
        <div>
          <h3 class="text-lg font-bold text-gray-900 border-b-2 border-orange-500 inline-block pb-1 mb-4">ข้อมูลครอบครัวและบุตร</h3>
          
          <div class="space-y-4">
            <dl class="text-sm bg-orange-50 p-4 rounded-lg flex items-center justify-between border border-orange-100">
              <div class="flex gap-4">
                <p><span class="text-gray-600 font-medium">บุตรชาย:</span> <span class="text-orange-700 font-bold ml-1">{{ profile.family?.sons_count || 0 }} คน</span></p>
                <div class="border-l border-orange-200"></div>
                <p><span class="text-gray-600 font-medium">บุตรสาว:</span> <span class="text-orange-700 font-bold ml-1">{{ profile.family?.daughters_count || 0 }} คน</span></p>
              </div>
            </dl>

            <div v-if="profile.children && profile.children.length > 0" class="space-y-3 mt-4">
              <div v-for="(child, idx) in profile.children" :key="idx" class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <p class="font-bold text-orange-600 text-sm mb-3">บุตรคนที่ {{ idx + 1 }}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p><span class="text-gray-500 font-medium w-16 inline-block">ชื่อ-สกุล:</span> <span class="text-gray-900 font-semibold">{{ child.title || ''}}{{ child.first_name }} {{ child.last_name }}</span></p>
                  <p><span class="text-gray-500 font-medium w-16 inline-block">อาชีพ:</span> <span class="text-gray-900">{{ child.occupation || '-' }}</span></p>
                  <p><span class="text-gray-500 font-medium w-16 inline-block">เกิด:</span> <span class="text-gray-900">{{ formatDate(child.birth_date) }}</span></p>
                  <p><span class="text-gray-500 font-medium w-16 inline-block">อายุ:</span> <span class="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">{{ child.birth_date ? calculateDurationText(child.birth_date, null) : '-' }}</span></p>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500 italic mt-2 ml-1">
              - ไม่พบข้อมูลบุตร -
            </div>
          </div>
        </div>

        <!-- History -->
        <div class="md:col-span-2">
          <h3 class="text-lg font-bold text-gray-900 border-b-2 border-orange-500 inline-block pb-1 mb-4">ประวัติชั้นยศและตำแหน่ง</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Rank History -->
            <div>
              <h4 class="font-bold text-orange-600 text-sm mb-3">ประวัติชั้นยศ</h4>
              <div v-if="profile.rank_history && profile.rank_history.length > 0" class="space-y-3">
                <div v-for="(rh, idx) in profile.rank_history" :key="idx" class="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm">
                  <p class="font-bold text-gray-800">{{ rh.rank_name }} <span v-if="rh.order_number" class="text-gray-500 font-normal text-xs ml-1">(คำสั่ง: {{rh.order_number}})</span></p>
                  <p class="text-gray-600 mt-1 line-clamp-1">{{ formatDate(rh.start_date) }} - {{ rh.end_date ? formatDate(rh.end_date) : 'ปัจจุบัน' }}</p>
                  <p class="text-xs font-semibold text-green-600 mt-1">รวม: {{ calculateDurationText(rh.start_date, rh.end_date) }}</p>
                </div>
              </div>
              <div v-else class="text-sm text-gray-500 italic">- ไม่มีประวัติ -</div>
            </div>

            <!-- Position History -->
            <div>
              <h4 class="font-bold text-green-600 text-sm mb-3">ประวัติตำแหน่ง</h4>
              <div v-if="profile.position_history && profile.position_history.length > 0" class="space-y-3">
                <div v-for="(ph, idx) in profile.position_history" :key="idx" class="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm">
                  <p class="font-bold text-gray-800">{{ ph.position_name }} <span v-if="ph.order_number" class="text-gray-500 font-normal text-xs ml-1">(คำสั่ง: {{ph.order_number}})</span></p>
                  <p class="text-gray-600 mt-1 line-clamp-1">{{ formatDate(ph.start_date) }} - {{ ph.end_date ? formatDate(ph.end_date) : 'ปัจจุบัน' }}</p>
                  <p class="text-xs font-semibold text-green-600 mt-1">รวม: {{ calculateDurationText(ph.start_date, ph.end_date) }}</p>
                </div>
              </div>
              <div v-else class="text-sm text-gray-500 italic">- ไม่มีประวัติ -</div>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div>
          <h3 class="text-lg font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1 mb-4">ที่อยู่ปัจจุบัน</h3>
          <address class="not-italic text-sm text-gray-900 leading-relaxed space-y-1">
            <p v-if="profile.address?.house_number">บ้านเลขที่ {{ profile.address.house_number }} <span v-if="profile.address.alley">ซอย {{ profile.address.alley }}</span></p>
            <p v-if="profile.address?.road">ถนน {{ profile.address.road }}</p>
            <p v-if="profile.address?.subdistrict">ตำบล/แขวง {{ profile.address.subdistrict }}</p>
            <p v-if="profile.address?.district">อำเภอ/เขต {{ profile.address.district }}</p>
            <p v-if="profile.address?.province || profile.address?.postal_code">จังหวัด {{ profile.address?.province }} รหัสไปรษณีย์ {{ profile.address?.postal_code }}</p>
            <p v-if="!profile.address?.house_number" class="text-gray-500">- ไม่มีข้อมูลที่อยู่ -</p>
          </address>
        </div>
      </div>
      
      <!-- Signature -->
      <div class="p-8 sm:p-10 border-t border-gray-100 flex flex-col items-end">
         <img v-if="profile.signature_image" :src="profile.signature_image" class="h-16 w-auto object-contain mb-2" />
         <div v-else class="h-16 w-48 border-b border-dashed border-gray-400 mb-2"></div>
         <p class="text-sm font-medium text-gray-900 text-center w-48">({{ profile.first_name }} {{ profile.last_name }})</p>
         <p class="text-xs text-gray-500 mt-1 w-48 text-center">เจ้าของประวัติ</p>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import html2pdf from 'html2pdf.js';
import api from '../services/api';

const route = useRoute();
const profile = ref(null);
const loading = ref(true);

const loadProfile = async () => {
    try {
        const res = await api.getAlumniById(route.params.id);
        profile.value = res.data;
    } catch (e) {
        console.error('Failed to load detail', e);
        alert('เกิดข้อผิดพลาด ไม่พบข้อมูล');
    } finally {
        loading.value = false;
    }
};

const calculateDurationText = (start, end) => {
    if(!start) return '-';
    let d1 = new Date(start);
    let d2 = end ? new Date(end) : new Date();

    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return '-';

    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
        days += prevMonth.getDate();
    }
    
    if (months < 0) {
        years--;
        months += 12;
    }

    let result = '';
    if (years > 0) result += `${years} ปี `;
    if (months > 0) result += `${months} เดือน `;
    if (days > 0) result += `${days} วัน`;
    
    return result.trim() || '0 วัน';
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const printPdf = () => {
    const element = document.getElementById('bio-print-area');
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `ประวัติ_${profile.value.first_name}_${profile.value.last_name}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
};

const printDoc = () => {
    alert("DOC Export is functionally mocked in local development. For production this would utilize docx library to generate Word docs.");
};

onMounted(() => {
    loadProfile();
});
</script>
