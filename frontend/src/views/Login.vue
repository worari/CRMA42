<template>
  <div class="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 border-b-2 border-red-800 pb-4">
          เข้าสู่ระบบ<br>
          <span class="text-xl font-medium text-gray-600">ระบบบริหารจัดการ ทำเนียบรุ่น จปร.42</span>
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="mb-4">
            <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">อีเมลผู้ใช้งาน</label>
            <input id="email-address" v-model="email" name="email" type="email" autocomplete="email" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="example@rta.mi.th">
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="รหัสผ่าน">
          </div>
        </div>

        <div v-if="errorMsg" class="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          {{ errorMsg }}
        </div>

        <div>
          <button type="submit" 
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
            :disabled="isLoading">
            <span v-if="isLoading">กำลังเข้าสู่ระบบ...</span>
            <span v-else>เข้าสู่ระบบ</span>
          </button>
        </div>
        
        <div class="text-center text-sm">
          <p class="text-gray-600">
            ยังไม่มีบัญชีผู้ใช้งานใช่หรือไม่? 
            <router-link to="/register" class="font-medium text-red-600 hover:text-red-500 underline">
              ลงทะเบียนขอเข้าใช้งาน
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
    
    // Save to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Dispatch event for App.vue to update UI
    window.dispatchEvent(new Event('auth-change'));
    
    router.push('/');
  } catch (error) {
    errorMsg.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>
