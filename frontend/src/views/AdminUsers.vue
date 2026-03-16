<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 border-l-4 border-red-800 pl-3">
        อนุมัติผู้ขอเข้าใช้งานระบบ
      </h1>
      <router-link to="/" class="text-red-700 hover:text-red-900 font-medium text-sm flex items-center">
        ← กลับไปหน้าทำเนียบ
      </router-link>
    </div>

    <div v-if="error" class="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm text-sm text-red-700">
      {{ error }}
    </div>

    <div class="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ชื่อ-นามสกุล</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">อีเมล / รหัสทหาร</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">สถานะ</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">วันที่ลงทะเบียน</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                <div class="h-5 w-5 animate-spin mx-auto border-2 border-red-600 border-t-transparent rounded-full mb-2"></div>
                กำลังโหลดข้อมูลส่วนนี้...
              </td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                ไม่มีข้อมูลผู้ขอเข้าใช้งาน
              </td>
            </tr>
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{{ user.first_name }} {{ user.last_name }}</div>
                <div class="text-sm text-gray-500" v-if="user.role === 'admin'">(ผู้ดูแลระบบ)</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                <div>{{ user.email }}</div>
                <div v-if="user.military_id" class="text-xs text-gray-500">รหัสทหาร: {{ user.military_id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="{
                        'bg-green-100 text-green-800 border border-green-200': user.status === 'approved',
                        'bg-yellow-100 text-yellow-800 border border-yellow-200': user.status === 'pending',
                        'bg-red-100 text-red-800 border border-red-200': user.status === 'rejected'
                      }">
                  {{ getStatusText(user.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div v-if="user.role !== 'admin'" class="flex space-x-2">
                  <button @click="updateStatus(user.id, 'approved')" 
                          class="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                          :disabled="user.status === 'approved'">
                    อนุมัติ
                  </button>
                  <button @click="updateStatus(user.id, 'rejected')" 
                          class="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                          :disabled="user.status === 'rejected'">
                    ปฏิเสธ
                  </button>
                </div>
                <div v-else class="text-xs text-gray-400 italic">ไม่สามารถแก้ไขได้</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const users = ref([]);
const loading = ref(true);
const error = ref('');

const fetchUsers = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/api/auth/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) { throw new Error('Failed to fetch data'); }

    users.value = await response.json();
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id, status) => {
  if (!confirm(`คุณต้องการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} สิทธ์การเข้าใช้งานของผู้ใช้นี้ใช่หรือไม่?`)) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3000/api/auth/users/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) { throw new Error('Failed to update status'); }

    const data = await response.json();
    alert('อัพเดทสถานะสำเร็จ: ' + data.message);
    fetchUsers(); // Reload the list
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ: ' + err.message);
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'approved': return 'อนุมัติแล้ว';
    case 'pending': return 'รอการอนุมัติ';
    case 'rejected': return 'ถูกปฏิเสธ';
    default: return status;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('th-TH', options);
};

onMounted(() => {
  fetchUsers();
});
</script>
