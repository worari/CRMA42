<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center space-x-4 relative group">
    <!-- Profile Photo Section -->
    <div class="flex-shrink-0 relative">
      <img v-if="profile.profile_photo" :src="profile.profile_photo" :alt="profile.first_name" class="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100" />
      <div v-else class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-gray-100">
        <span class="text-blue-800 font-bold text-lg">{{ profile.first_name ? profile.first_name.charAt(0) : '?' }}</span>
      </div>
      <span v-if="profile.affiliation === 'เสียชีวิต'" class="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white" title="เสียชีวิต"></span>
    </div>
    
    <!-- Info Section -->
    <div class="flex-1 min-w-0">
      <p class="text-lg font-bold text-gray-900 truncate">
        {{ profile.rank }} {{ profile.first_name }} {{ profile.last_name }}
      </p>
      
      <!-- IMPORTANT FORMAT: Rank (Affiliation) (Branch) -->
      <p class="text-sm font-medium text-blue-600 truncate mt-1">
        {{ profile.rank }} ({{ profile.affiliation }}) ({{ profile.branch }})
      </p>
      
      <p v-if="profile.position" class="text-xs text-gray-500 truncate mt-1">
        {{ profile.position }}
      </p>
    </div>

    <!-- Admin Delete Button (visible on hover) -->
    <button
      v-if="isAdmin"
      @click.stop="handleDelete"
      class="absolute top-2 right-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
      title="ลบข้อมูล"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete']);

const isAdmin = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.role === 'admin';
  } catch { return false; }
});

const handleDelete = () => {
  const name = `${props.profile.rank} ${props.profile.first_name} ${props.profile.last_name}`;
  if (confirm(`⚠️ ยืนยันการลบข้อมูล\n\n"${name}"\n\nการดำเนินการนี้ไม่สามารถกู้คืนได้`)) {
    emit('delete', props.profile.id);
  }
};
</script>
