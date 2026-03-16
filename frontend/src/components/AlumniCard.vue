<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center space-x-4">
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
  </div>
</template>

<script setup>
defineProps({
  profile: {
    type: Object,
    required: true
  }
})
</script>
