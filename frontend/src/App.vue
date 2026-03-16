<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar -->
    <header class="bg-blue-900 border-b border-blue-800 shadow-lg text-white sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold tracking-tight">ทำเนียบรุ่นเตรียมทหาร</h1>
          </div>
          <nav class="flex space-x-4 items-center">
            <template v-if="isAuthenticated">
              <router-link to="/" class="px-3 py-2 rounded-md font-medium text-sm hover:bg-blue-800 transition-colors" active-class="bg-blue-800 ring-1 ring-blue-700">รายชื่อ</router-link>
              <router-link to="/dashboard" class="px-3 py-2 rounded-md font-medium text-sm hover:bg-blue-800 transition-colors" active-class="bg-blue-800 ring-1 ring-blue-700">สถิติ</router-link>
              
              <div v-if="isAdmin" class="hidden sm:block border-l border-blue-700 h-6 mx-2"></div>
              
              <router-link v-if="isAdmin" to="/admin/users" class="px-3 py-2 rounded-md font-medium text-sm text-yellow-300 hover:bg-blue-800 hover:text-yellow-200 transition-colors" active-class="bg-blue-800 ring-1 ring-blue-700">
                จัดการผู้ใช้งาน
              </router-link>
              
              <div class="hidden sm:block border-l border-blue-700 h-6 mx-2"></div>
              
              <span class="text-xs text-blue-300 hidden md:block">
                {{ user.first_name }} {{ user.last_name }} 
                <span v-if="isAdmin" class="bg-yellow-500 text-blue-900 px-1.5 py-0.5 rounded text-[10px] ml-1">Admin</span>
              </span>
              
              <button @click="logout" class="px-3 py-1.5 rounded-md font-medium text-xs bg-red-600 hover:bg-red-700 text-white transition-colors ml-2 shadow-sm border border-red-800">
                ออกจากระบบ
              </button>
            </template>
            <template v-else>
              <router-link to="/login" class="px-4 py-1.5 rounded-md font-medium text-sm bg-white text-blue-900 hover:bg-gray-100 transition-colors shadow-sm">เข้าสู่ระบบ</router-link>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const isAuthenticated = ref(false);
const user = ref({});

const checkAuth = () => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (token && userData) {
    isAuthenticated.value = true;
    try {
      user.value = JSON.parse(userData);
    } catch (e) {
      user.value = {};
    }
  } else {
    isAuthenticated.value = false;
    user.value = {};
  }
};

const isAdmin = computed(() => user.value?.role === 'admin');

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  checkAuth();
  router.push('/login');
};

onMounted(() => {
  checkAuth();
  window.addEventListener('auth-change', checkAuth);
});

onBeforeUnmount(() => {
  window.removeEventListener('auth-change', checkAuth);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
