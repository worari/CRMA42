<template>
  <div class="flex gap-2 w-full">
    <!-- Day -->
    <select v-model="selectedDay" class="block w-1/3 rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" @change="emitDate" :required="required">
      <option value="" disabled>วัน</option>
      <option v-for="d in days" :key="d" :value="d">{{ d }}</option>
    </select>
    
    <!-- Month -->
    <select v-model="selectedMonth" class="block w-1/3 rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" @change="emitDate" :required="required">
      <option value="" disabled>เดือน</option>
      <option v-for="(m, i) in months" :key="i" :value="i+1">{{ m }}</option>
    </select>
    
    <!-- Year -->
    <select v-model="selectedYear" class="block w-1/3 rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" @change="emitDate" :required="required">
      <option value="" disabled>พ.ศ.</option>
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String, // format YYYY-MM-DD
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectedDay = ref('');
const selectedMonth = ref('');
const selectedYear = ref(''); // พ.ศ.

const days = computed(() => {
  if (selectedMonth.value && selectedYear.value) {
    const m = selectedMonth.value;
    const yAD = selectedYear.value - 543;
    // Number of days in the month
    const dim = new Date(yAD, m, 0).getDate();
    return Array.from({length: dim}, (_, i) => i + 1);
  }
  return Array.from({length: 31}, (_, i) => i + 1);
});

const months = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
// Generate array of years from 100 years ago to 10 years in the future (BE)
const currentYearBE = new Date().getFullYear() + 543;
const years = Array.from({length: 120}, (_, i) => currentYearBE + 10 - i);

let isUpdatingFromProp = false;

const parseDateFromValue = (val) => {
  if (val && typeof val === 'string' && val.includes('-')) {
    const parts = val.split('-'); // [YYYY, MM, DD]
    if (parts.length >= 3) {
      selectedYear.value = parseInt(parts[0]) + 543; // BE
      selectedMonth.value = parseInt(parts[1]);
      selectedDay.value = parseInt(parts[2]);
    }
  } else {
    selectedDay.value = '';
    selectedMonth.value = '';
    selectedYear.value = '';
  }
};

onMounted(() => {
  isUpdatingFromProp = true;
  parseDateFromValue(props.modelValue);
  isUpdatingFromProp = false;
});

watch(() => props.modelValue, (newVal) => {
  isUpdatingFromProp = true;
  parseDateFromValue(newVal);
  isUpdatingFromProp = false;
});

const emitDate = () => {
  if (isUpdatingFromProp) return;
  
  if (selectedDay.value && selectedMonth.value && selectedYear.value) {
    const d = String(selectedDay.value).padStart(2, '0');
    const m = String(selectedMonth.value).padStart(2, '0');
    const yAD = selectedYear.value - 543; // Convert back to AD
    const dateStr = `${yAD}-${m}-${d}`;
    
    // adjust day if out of bounds for the selected month/year
    const dim = new Date(yAD, selectedMonth.value, 0).getDate();
    if (selectedDay.value > dim) {
      selectedDay.value = dim;
    }
    
    const finalDateStr = `${yAD}-${String(selectedMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`;
    
    emit('update:modelValue', finalDateStr);
    emit('change', finalDateStr);
  } else {
    emit('update:modelValue', '');
    emit('change', '');
  }
};

watch([selectedDay, selectedMonth, selectedYear], () => {
  emitDate();
});
</script>
