<template>
  <div class="space-y-6">
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-end">
      <div class="flex-1 w-full max-w-md">
        <label for="search" class="block text-sm font-medium leading-6 text-gray-900 mb-2">ค้นหารายชื่อ</label>
        <div class="relative rounded-md shadow-sm">
          <input
            v-model="searchQuery"
            type="text"
            id="search"
            class="block w-full rounded-md border-0 py-2.5 pl-4 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="ค้นหาชื่อ นามสกุล ชื่อเล่น..."
          />
        </div>
      </div>
      
      <div class="flex items-end gap-4 w-full sm:w-auto">
        <div class="flex-1 sm:w-64">
          <label for="affiliation" class="block text-sm font-medium leading-6 text-gray-900 mb-2">สังกัด</label>
          <select
            v-model="affiliationFilter"
            id="affiliation"
            class="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          >
            <option value="">ทั้งหมด</option>
            <option value="ทบ.">ทบ.</option>
            <option value="กห.สป.">กห.สป.</option>
            <option value="บก.ทท.">บก.ทท.</option>
            <option value="ทม.รอ.">ทม.รอ.</option>
            <option value="สทป.">สทป.</option>
            <option value="ลาออก">ลาออก</option>
            <option value="เกษียณก่อนกำหนด">เกษียณก่อนกำหนด</option>
            <option value="เสียชีวิต">เสียชีวิต</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
        
        <button @click="$router.push('/form')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md shadow-sm transition-colors shrink-0">
          + เพิ่มประวัติ
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading" class="text-center py-12">
      <p class="text-gray-500">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Alumni List Map -->
    <div v-else-if="groupedAlumni.length > 0" class="space-y-12 animate-fade-in">
      <div v-for="group in groupedAlumni" :key="group.affiliation">
        <h3 class="text-xl font-black text-gray-800 mb-6 border-b-4 border-orange-500 pb-2 inline-flex items-center gap-2">
            <span class="bg-orange-100 text-orange-600 px-2 py-1 rounded shadow-sm">📍</span>
            สังกัด: {{ group.affiliation }}
            <span class="text-sm font-bold text-gray-400 ml-2">({{ group.members.length }} นาย)</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AlumniCard 
            v-for="alumni in group.members" 
            :key="alumni.id" 
            :profile="alumni"
            @click="$router.push(`/profile/${alumni.id}`)"
            class="transform hover:-translate-y-1 transition-all duration-300"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
      <p class="text-gray-500">ไม่พบรายชื่อในระบบ</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useAlumniStore } from '../store/alumniStore';
import AlumniCard from '../components/AlumniCard.vue';

const store = useAlumniStore();

const searchQuery = ref('');
const affiliationFilter = ref('');

let timeout = null;

const fetchFiltered = () => {
    store.fetchAlumni(searchQuery.value, affiliationFilter.value);
};

const groupedAlumni = computed(() => {
  if (!store.alumniList) return [];
  const result = [];
  let currentGroup = null;

  store.alumniList.forEach(alumni => {
    // Fallback logic for affiliation
    const affil = (alumni.affiliation === 'อื่นๆ' ? alumni.custom_affiliation : alumni.affiliation) || 'ไม่ระบุ';
    
    if (!currentGroup || currentGroup.affiliation !== affil) {
      let existingGroup = result.find(g => g.affiliation === affil);
      if (existingGroup) {
         currentGroup = existingGroup;
      } else {
         currentGroup = { affiliation: affil, members: [] };
         result.push(currentGroup);
      }
    }
    currentGroup.members.push(alumni);
  });
  return result;
});

// Immediate instant update for affiliation
watch(affiliationFilter, () => {
    fetchFiltered();
});

// Debounce for text search to avoid spamming the backend
watch(searchQuery, () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
        fetchFiltered();
    }, 300);
});

onMounted(() => {
  store.initSocket();
  fetchFiltered();
});
</script>
