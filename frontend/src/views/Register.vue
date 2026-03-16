<template>
  <div class="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
      <div>
        <h2 class="mt-2 text-center text-3xl font-extrabold text-gray-900 border-b-2 border-red-800 pb-4">
          ลงทะเบียนขอเข้าใช้งานระบบ<br>
          <span class="text-xl font-medium text-gray-600">ทำเนียบรุ่น จปร.42</span>
        </h2>
        <p class="mt-4 text-center text-sm text-gray-600">
          กรุณากรอกข้อมูลให้ครบถ้วนและรอผู้ดูแลระบบอนุมัติการเข้าใช้งาน
        </p>
      </div>

      <div v-if="successMsg" class="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              ลงทะเบียนสำเร็จ!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>
                {{ successMsg }}
              </p>
            </div>
            <div class="mt-4">
              <router-link to="/login" class="text-green-800 font-bold hover:underline">
                กลับไปยังหน้าเข้าสู่ระบบ
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <form v-else class="mt-6 space-y-6" @submit.prevent="handleRegister">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input id="first_name" v-model="form.first_name" type="text" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="สมชาย">
          </div>
          <div>
            <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
            <input id="last_name" v-model="form.last_name" type="text" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="รักชาติ">
          </div>
        </div>

        <div>
          <label for="military_id" class="block text-sm font-medium text-gray-700 mb-1">รหัสประจำตัวทหาร (ไม่บังคับ)</label>
          <input id="military_id" v-model="form.military_id" type="text" 
            class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
            placeholder="1234567890">
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">อีเมลผู้ใช้งาน</label>
          <input id="email" v-model="form.email" type="email" required 
            class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
            placeholder="example@rta.mi.th">
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input id="password" v-model="form.password" type="password" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="รหัสผ่าน">
          </div>
          <div>
            <label for="confirm_password" class="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
            <input id="confirm_password" v-model="form.confirm_password" type="password" required 
              class="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm" 
              placeholder="ยืนยันรหัสผ่านอีกครั้ง">
          </div>
        </div>

        <div v-if="errorMsg" class="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          {{ errorMsg }}
        </div>

        <div>
          <button type="submit" 
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
            :disabled="isLoading">
            <span v-if="isLoading">กำลังส่งข้อมูล...</span>
            <span v-else>ลงทะเบียน</span>
          </button>
        </div>
        
        <div class="text-center text-sm">
          <p class="text-gray-600">
            มีบัญชีผู้ใช้งานแล้ว? 
            <router-link to="/login" class="font-medium text-red-600 hover:text-red-500 underline">
              เข้าสู่ระบบ
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

const form = reactive({
  first_name: '',
  last_name: '',
  military_id: '',
  email: '',
  password: '',
  confirm_password: ''
});

const errorMsg = ref('');
const successMsg = ref('');
const isLoading = ref(false);

const handleRegister = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  
  if (form.password !== form.confirm_password) {
    errorMsg.value = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
    return;
  }
  
  if (form.password.length < 6) {
    errorMsg.value = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    return;
  }
  
  isLoading.value = true;
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        military_id: form.military_id || null,
        first_name: form.first_name,
        last_name: form.last_name
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    }
    
    successMsg.value = data.message || 'บันทึกข้อมูลเรียบร้อย โปรดรอการอนุมัติจากผู้ดูแลระบบ';
    
  } catch (error) {
    errorMsg.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>
