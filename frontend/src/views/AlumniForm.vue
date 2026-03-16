<template>
  <div class="max-w-7xl mx-auto pb-12 relative animate-fade-in">
    <!-- Header with orange-green gradient -->
    <div class="bg-gradient-to-r from-orange-500 to-green-600 p-8 rounded-t-3xl shadow-lg flex items-center justify-between mb-8">
      <h2 class="text-3xl font-extrabold text-white tracking-tight">
        {{ isEdit ? '✏️ แก้ไขข้อมูลประวัติ' : '✨ เพิ่มประวัติใหม่' }}
      </h2>
      <button type="button" @click="$router.push('/')" class="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-xl backdrop-blur flex items-center gap-2 transition-all">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        กลับไปหน้ารายชื่อ
      </button>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccess" class="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm transition-opacity">
      <div class="bg-white rounded-3xl p-8 transform transition-all shadow-2xl max-w-sm w-full text-center border-t-8 border-green-500 animate-slide-up">
        <div class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 mb-6 border-4 border-white shadow-inner animate-bounce">
          <svg class="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 class="text-3xl font-black text-gray-900 mb-2">บันทึกสำเร็จ!</h3>
        <p class="text-gray-500 mb-8 font-medium">ข้อมูลถูกบันทึกเข้าสู่ระบบเรียบร้อยแล้ว</p>
        <button @click="closeSuccess" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl w-full transition-colors shadow-lg shadow-green-200">เยี่ยมไปเลย (OK)</button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl shadow-sm relative">
      <strong class="font-bold">เกิดข้อผิดพลาด! </strong>
      <span class="block sm:inline">{{ errorMessage }}</span>
      <button type="button" @click="errorMessage = ''" class="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-500 hover:text-red-700">&times;</button>
    </div>

    <form @submit.prevent="submitForm" class="space-y-10 bg-white shadow-xl border border-gray-100 rounded-b-3xl p-8 sm:p-12 -mt-10 relative z-10">
      
      <!-- Uploads Section -->
      <section class="space-y-6 pb-8 border-b border-orange-100">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">📸 รูปถ่ายและลายเซ็น</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 ml-4">
          <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <label class="block text-sm font-bold text-gray-700 mb-3">รูปถ่ายประจำตัว <span class="text-orange-500 font-normal">(ไม่เกิน 500KB - .jpg/.png)</span></label>
            <div class="mt-2 flex items-center gap-x-6">
              <img v-if="form.profile_photo" :src="form.profile_photo" class="h-40 w-40 object-cover rounded-2xl shadow-md ring-4 ring-white" />
              <div v-else class="h-40 w-40 rounded-2xl bg-white shadow-inner flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-gray-400 text-xs font-medium">รูปถ่ายสี่เหลี่ยม</span>
              </div>
              <label class="cursor-pointer bg-white border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-gray-700 text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-orange-500">
                <span>อัปโหลดรูปภาพ</span>
                <input type="file" @change="e => handleImage(e, 'profile_photo')" accept=".jpg, .jpeg, .png" class="sr-only" />
              </label>
            </div>
          </div>

          <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex-1 flex flex-col">
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-bold text-gray-700">ลายเซ็น <span class="text-orange-500 font-normal">(.png ทะลุพื้นหลัง)</span></label>
              <button type="button" @click="clearSignature" class="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold transition-colors">🗑️ ลบลายเซ็น</button>
            </div>
            
            <div class="mt-2 flex flex-col gap-y-3 flex-1">
              <!-- Electronic Signature Canvas Area -->
              <div class="relative bg-white rounded-xl shadow-inner border-2 border-dashed border-gray-300 overflow-hidden w-full h-32 touch-none">
                <div class="absolute inset-0 opacity-10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')]"></div>
                <canvas 
                    ref="sigCanvas" 
                    @mousedown="startDraw" 
                    @mousemove="draw" 
                    @mouseup="endDraw" 
                    @mouseleave="endDraw" 
                    @touchstart.prevent="startDraw" 
                    @touchmove.prevent="draw" 
                    @touchend.prevent="endDraw" 
                    class="w-full h-full cursor-crosshair absolute inset-0 z-20"></canvas>
                <!-- Display existing image if not currently drawing fresh -->
                <img v-if="form.signature_image && !isDrawingSignatureActive" :src="form.signature_image" class="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 p-2" />
                <div v-else-if="!form.signature_image && !isDrawingSignatureActive" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 text-gray-300 font-medium text-sm">เซ็นที่นี่ด้วยเมาส์ หรือ ปากกา/นิ้ว</div>
              </div>

              <div class="flex justify-between items-center mt-2">
                 <span class="text-xs text-gray-500">สามารถวาดบนช่องว่างได้เลย</span>
                 <label class="cursor-pointer text-sm font-bold text-orange-600 hover:text-orange-700 underline transition-colors">
                    อัปโหลดไฟล์แทน
                    <input type="file" @change="e => { handleImage(e, 'signature_image', true); isDrawingSignatureActive = false; clearCanvasOnly(); }" accept=".png" class="sr-only" />
                 </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Personal Info Section -->
      <section class="space-y-6 pb-8 border-b border-orange-100">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">ข้อมูลส่วนบุคคลและข้อมูลรับราชการ</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 ml-4">
          <div class="md:col-span-3 lg:col-span-1 p-4 bg-orange-50 rounded-xl border border-orange-100 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full -mr-8 -mt-8"></div>
            <label class="block text-sm font-bold text-orange-900 mb-1">เลขประจำตัวทหาร (10 หลัก)</label>
            <input v-model="form.military_id" @input="filterNumber('military_id', 10)" required maxlength="10" minlength="10" pattern="[0-9]{10}" type="text" placeholder="1234567890" class="block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-orange-200 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm font-mono tracking-widest bg-white" />
          </div>

          <div class="md:col-span-3 lg:col-span-2"></div> <!-- spacer -->

          <div class="md:col-span-1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ยศ</label>
            <select v-model="form.rank" required class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white transition-colors">
              <option value="" disabled>เลือกยศ</option>
              <option value="พล.อ.">พล.อ.</option>
              <option value="พล.ท.">พล.ท.</option>
              <option value="พล.ต.">พล.ต.</option>
              <option value="พ.อ.(พ.)">พ.อ.(พ.)</option>
              <option value="พ.อ.">พ.อ.</option>
              <option value="พ.ท.">พ.ท.</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          <div class="md:col-span-2" v-if="form.rank === 'อื่นๆ'">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ระบุยศที่ต้องการ</label>
            <input v-model="form.custom_rank" required type="text" placeholder="พิมพ์ยศเต็ม" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>
          <div class="md:col-span-2" v-else></div>

          <div class="md:col-span-1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ชื่อจริง</label>
            <input v-model="form.first_name" required type="text" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>

          <div class="md:col-span-1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">นามสกุล</label>
            <input v-model="form.last_name" required type="text" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>

          <div class="md:col-span-1">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ชื่อเล่น <span class="text-gray-400 font-normal">(ถ้ามี)</span></label>
            <input v-model="form.nickname" type="text" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>

          <div class="md:col-span-3 relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ตำแหน่งปัจจุบัน</label>
            <input v-model="form.position" type="text" @focus="showPositionSuggestionsDropdown = true" @blur="setTimeout(() => showPositionSuggestionsDropdown = false, 200)" placeholder="พิมพ์เพื่อค้นหาหรือระบุตำแหน่งใหม่..." class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
            
            <div v-show="showPositionSuggestionsDropdown && positionSuggestions.length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
                <ul>
                    <li v-for="pos in filteredPositions(form.position)" :key="pos" @mousedown="form.position = pos" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ pos }}</li>
                </ul>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">สังกัด</label>
            <select v-model="form.affiliation" required class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white transition-colors">
              <option value="" disabled>เลือกสังกัด</option>
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

          <div class="md:col-span-2" v-if="form.affiliation === 'อื่นๆ'">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ระบุสังกัดอื่นๆ</label>
            <input v-model="form.custom_affiliation" required type="text" placeholder="พิมพ์ชื่อสังกัด" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>
          <div class="md:col-span-2" v-else></div>

          <div v-if="form.affiliation !== 'เสียชีวิต'">
            <label class="block text-sm font-semibold text-gray-700 mb-1">สถานะครอบครัว</label>
            <select v-model="form.status" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white transition-colors">
              <option value="">เลือกสถานะ (ไม่ระบุ)</option>
              <option value="โสด">โสด</option>
              <option value="สมรส">สมรส</option>
              <option value="หย่า">หย่า</option>
              <option value="หม้าย">หม้าย</option>
            </select>
          </div>
          <div v-else></div> <!-- spacer -->

          <!-- Vertical Divider for Desktop -->
          <div class="md:col-span-1 border-r border-gray-200 pr-6 hidden md:block border-dashed"></div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">เหล่าทหาร</label>
            <select v-model="form.branch" required class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white transition-colors">
              <option value="" disabled>เลือกเหล่า</option>
              <option value="ร.">ร.</option>
              <option value="ม.">ม.</option>
              <option value="ป.">ป.</option>
              <option value="ช.">ช.</option>
              <option value="ส.">ส.</option>
              <option value="สพ.">สพ.</option>
              <option value="ขส.">ขส.</option>
              <option value="พธ.">พธ.</option>
              <option value="สห.">สห.</option>
              <option value="ผท.">ผท.</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          <div class="md:col-span-2" v-if="form.branch === 'อื่นๆ'">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ระบุเหล่าอื่นๆ</label>
            <input v-model="form.custom_branch" required type="text" class="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm bg-gray-50 focus:bg-white" />
          </div>
          <div class="md:col-span-2" v-else></div> <!-- spacer -->

          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
            <label class="block text-sm font-bold text-gray-700 mb-1">📅 วันเดือนปีเกิด</label>
            <input v-model="form.date_of_birth" @change="calculateRetirement" required type="date" class="block w-full rounded-lg border-gray-300 py-2 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-green-500 sm:text-sm" />
          </div>

          <div class="md:col-span-2 bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 flex items-center gap-4">
             <div class="h-12 w-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xl shadow">P</div>
             <div>
                <label class="block text-sm font-bold text-green-900">ปีที่เกษียณอายุราชการสุดขีด</label>
                <div class="flex items-center gap-2">
                    <input v-model="form.retirement_year" readonly type="number" class="block w-32 rounded-lg border-0 py-1.5 text-green-800 bg-white shadow-sm ring-1 ring-inset ring-green-300 sm:text-base font-black text-center" />
                    <span class="text-xs text-green-700 font-medium bg-green-200/50 px-2 py-1 rounded">คำนวณอัตโนมัติ (1 ต.ค. หลังอายุครบ 60 ปี)</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      <!-- History Section -->
      <section class="space-y-6 pb-8 border-b border-orange-100">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">ประวัติชั้นยศและตำแหน่ง</h3>
        
        <div class="ml-4 space-y-10">
          <!-- Rank History -->
          <div>
            <div class="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                <h4 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span class="bg-orange-100 text-orange-600 p-1.5 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg></span>
                    ประวัติชั้นยศ
                </h4>
            </div>
            <div class="space-y-4">
                <div v-for="(rh, index) in form.rank_history" :key="'rh'+index" class="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm relative group">
                    <button type="button" @click="form.rank_history.splice(index, 1)" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div class="md:col-span-3">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">อัตรายศ</label>
                            <select v-model="rh.rank_name" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm">
                                <option value="">เลือกยศ</option>
                                <option value="พล.อ.">พล.อ.</option>
                                <option value="พล.ท.">พล.ท.</option>
                                <option value="พล.ต.">พล.ต.</option>
                                <option value="พ.อ.(พ.)">พ.อ.(พ.)</option>
                                <option value="พ.อ.">พ.อ.</option>
                                <option value="พ.ท.">พ.ท.</option>
                                <option value="พ.ต.">พ.ต.</option>
                                <option value="ร.อ.">ร.อ.</option>
                                <option value="ร.ท.">ร.ท.</option>
                                <option value="ร.ต.">ร.ต.</option>
                            </select>
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ที่คำสั่ง</label>
                            <input v-model="rh.order_number" type="text" placeholder="ระบุเลขที่คำสั่ง" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ตั้งแต่</label>
                            <input v-model="rh.start_date" type="date" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ถึง</label>
                            <input v-model="rh.end_date" type="date" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">รวมเวลา</label>
                            <div class="block w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium shadow-inner text-center">
                                {{ calculateDurationText(rh.start_date, rh.end_date) }}
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" @click="form.rank_history.push({ rank_name:'', order_number:'', start_date:'', end_date:'' })" class="w-full py-3 border-2 border-dashed border-orange-300 text-orange-600 bg-orange-50/30 rounded-xl hover:bg-orange-50 font-bold transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    เพิ่มประวัติชั้นยศ
                </button>
            </div>
          </div>

          <!-- Position History -->
          <div>
            <div class="flex items-center justify-between mb-4 border-b border-gray-200 pb-2 mt-8">
                <h4 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span class="bg-green-100 text-green-600 p-1.5 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></span>
                    ประวัติตำแหน่ง
                </h4>
            </div>
            <div class="space-y-4">
                <div v-for="(ph, index) in form.position_history" :key="'ph'+index" class="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm relative group">
                    <button type="button" @click="form.position_history.splice(index, 1)" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div class="md:col-span-3 relative">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ชื่อตำแหน่ง</label>
                            <!-- Position autocomplete block for history -->
                            <input v-model="ph.position_name" type="text" placeholder="พิมพ์ชื่อตำแหน่ง" @focus="ph._showSuggestion = true" @blur="setTimeout(()=> ph._showSuggestion = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                            <div v-show="ph._showSuggestion && filteredPositions(ph.position_name).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
                                <ul>
                                    <li v-for="pos in filteredPositions(ph.position_name)" :key="pos" @mousedown="ph.position_name = pos" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ pos }}</li>
                                </ul>
                            </div>
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ที่คำสั่ง</label>
                            <input v-model="ph.order_number" type="text" placeholder="ระบุเลขที่คำสั่ง" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ตั้งแต่</label>
                            <input v-model="ph.start_date" type="date" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ถึง</label>
                            <input v-model="ph.end_date" type="date" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">รวมเวลา</label>
                            <div class="block w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium shadow-inner text-center">
                                {{ calculateDurationText(ph.start_date, ph.end_date) }}
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" @click="form.position_history.push({ position_name:'', order_number:'', start_date:'', end_date:'' })" class="w-full py-3 border-2 border-dashed border-green-300 text-green-600 bg-green-50/30 rounded-xl hover:bg-green-50 font-bold transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    เพิ่มประวัติตำแหน่ง
                </button>
            </div>
          </div>

        </div>
      </section>

      <!-- Contact Info Section -->
      <section class="space-y-6 pb-8 border-b border-orange-100">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">☎️ การติดต่อสื่อสาร</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ml-4">
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-200">
            <label class="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์หลัก (10 หลัก)</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">📱</span>
              <input v-model="form.contacts.phone_primary" @input="filterNumber('contacts.phone_primary', 10)" maxlength="10" pattern="[0-9]{10}" type="tel" placeholder="08XXXXXXXX" class="block w-full rounded-lg pl-10 border-gray-300 py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-green-500 sm:text-sm font-mono" />
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-200">
            <label class="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์สำรอง</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">📞</span>
              <input v-model="form.contacts.phone_secondary" @input="filterNumber('contacts.phone_secondary', 10)" maxlength="10" pattern="[0-9]{0,10}" type="tel" placeholder="08XXXXXXXX" class="block w-full rounded-lg pl-10 border-gray-300 py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-green-500 sm:text-sm font-mono" />
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-200">
            <label class="block text-sm font-bold text-gray-700 mb-1">อีเมล</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">✉️</span>
              <!-- Strict Email Pattern per requirement -->
              <input v-model="form.contacts.email" pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,4}$" type="email" placeholder="example@mail.com" class="block w-full rounded-lg pl-10 border-gray-300 py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-green-500 sm:text-sm bg-white" />
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-orange-200">
            <label class="block text-sm font-bold text-gray-700 mb-1">Line ID</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-[#00B900]">L</span>
              <input v-model="form.contacts.line_id" type="text" placeholder="Line ID" class="block w-full rounded-lg pl-10 border-gray-300 py-2.5 text-gray-900 shadow-sm focus:ring-2 focus:ring-green-500 sm:text-sm bg-white" />
            </div>
          </div>
        </div>
      </section>

      <!-- Family Info Section -->
      <section class="space-y-6 pb-8 border-b border-orange-100">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">👨‍👩‍👧‍👦 ข้อมูลเกี่ยวกับบุตร</h3>
        
        <div class="ml-4 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-inner">
                <div>
                    <label class="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">👦 จำนวนบุตรชายรวม</label>
                    <input v-model="form.family.sons_count" type="number" min="0" class="block w-full rounded-xl border-blue-200 py-3 px-4 text-blue-900 font-bold shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-lg text-center bg-white/80" />
                </div>
                <div>
                    <label class="block text-sm font-bold text-pink-900 mb-2 flex items-center gap-2">👧 จำนวนบุตรสาวรวม</label>
                    <input v-model="form.family.daughters_count" type="number" min="0" class="block w-full rounded-xl border-pink-200 py-3 px-4 text-pink-900 font-bold shadow-sm focus:ring-2 focus:ring-pink-500 sm:text-lg text-center bg-white/80" />
                </div>
            </div>

            <!-- Dynamic Children -->
            <div class="space-y-6">
                <div v-for="(child, index) in form.children" :key="index" class="p-6 border-2 border-orange-100 rounded-2xl bg-white shadow-md relative overflow-hidden transition-all hover:border-orange-300">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-8 -mt-8 -z-10"></div>
                    
                    <button type="button" @click="removeChild(index)" class="absolute top-4 right-4 text-red-400 hover:text-white bg-red-50 hover:bg-red-500 font-bold text-sm px-4 py-1.5 rounded-lg transition-all shadow-sm">ลบข้อมูล</button>
                    
                    <h4 class="font-extrabold text-orange-600 mb-6 text-xl flex items-center gap-2">
                        <span class="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">{{ index + 1 }}</span>
                        ข้อมูลบุตร
                    </h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-bold text-gray-700 mb-1">คำนำหน้า</label>
                            <select v-model="child.title" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm bg-gray-50 focus:bg-white text-gray-900">
                                <option value="">เลือก</option>
                                <option value="ด.ช.">ด.ช.</option>
                                <option value="ด.ญ.">ด.ญ.</option>
                                <option value="นาย">นาย</option>
                                <option value="นางสาว">นางสาว</option>
                                <option value="นาง">นาง</option>
                            </select>
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-sm font-bold text-gray-700 mb-1">ชื่อจริง</label>
                            <input v-model="child.first_name" type="text" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm bg-gray-50 focus:bg-white text-gray-900" />
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-sm font-bold text-gray-700 mb-1">นามสกุล</label>
                            <input v-model="child.last_name" type="text" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm bg-gray-50 focus:bg-white text-gray-900" />
                        </div>
                        <div class="md:col-span-4">
                            <label class="block text-sm font-bold text-gray-700 mb-1">วันเดือนปีเกิด</label>
                            <input v-model="child.birth_date" type="date" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm bg-gray-50 focus:bg-white text-gray-900" />
                        </div>

                        <!-- Dynamic Age -->
                        <div class="md:col-span-4">
                            <label class="block text-sm font-bold text-gray-700 mb-1">อายุ <span class="text-green-600 text-xs font-normal bg-green-100 px-1 rounded">คำนวณอัตโนมัติ</span></label>
                            <div class="block w-full rounded-lg border border-gray-200 py-2 px-3 text-green-700 bg-green-50 shadow-inner sm:text-sm font-bold text-center">
                            {{ calculateDetailedAge(child.birth_date) || '-' }}
                            </div>
                        </div>

                        <div class="md:col-span-8 relative">
                            <label class="block text-sm font-bold text-gray-700 mb-1">อาชีพ</label>
                             <input v-model="child.occupation" type="text" placeholder="ระบุอาชีพ" @focus="child._showSuggestion = true" @blur="setTimeout(()=> child._showSuggestion = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm bg-gray-50 focus:bg-white" />
                             <!-- Suggestion dropdwon -->
                            <div v-show="child._showSuggestion && filteredOccupations(child.occupation).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
                                <ul>
                                    <li v-for="occ in filteredOccupations(child.occupation)" :key="occ" @mousedown="child.occupation = occ" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ occ }}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button type="button" @click="addChild" class="w-full py-4 border-2 border-dashed border-orange-400 text-orange-600 bg-white rounded-2xl hover:bg-orange-50 font-bold transition-colors shadow-sm flex items-center justify-center gap-3 text-lg">
                    <span class="bg-orange-200 text-orange-700 rounded-full p-1"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></span>
                    เพิ่มข้อมูลบุตรลงในประวัติ
                </button>
            </div>
        </div>
      </section>

      <!-- Address Info Section -->
      <section class="space-y-6 pb-4">
        <h3 class="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50 rounded-r-lg">🏠 ข้อมูลที่อยู่ปัจจุบัน</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 ml-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">บ้านเลขที่</label>
            <input v-model="form.address.house_number" type="text" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">ตรอก/ซอย</label>
            <input v-model="form.address.alley" type="text" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
          </div>
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ถนน</label>
            <input v-model="form.address.road" type="text" @focus="showRoadSuggestions = true" @blur="setTimeout(()=> showRoadSuggestions = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
            <div v-show="showRoadSuggestions && filteredAddress('road', form.address.road).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
              <ul><li v-for="item in filteredAddress('road', form.address.road)" :key="item" @mousedown="form.address.road = item" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ item }}</li></ul>
            </div>
          </div>
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">ตำบล/แขวง</label>
            <input v-model="form.address.subdistrict" type="text" @focus="showSubdistrictSuggestions = true" @blur="setTimeout(()=> showSubdistrictSuggestions = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
            <div v-show="showSubdistrictSuggestions && filteredAddress('subdistrict', form.address.subdistrict).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
              <ul><li v-for="item in filteredAddress('subdistrict', form.address.subdistrict)" :key="item" @mousedown="form.address.subdistrict = item" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ item }}</li></ul>
            </div>
          </div>
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">อำเภอ/เขต</label>
            <input v-model="form.address.district" type="text" @focus="showDistrictSuggestions = true" @blur="setTimeout(()=> showDistrictSuggestions = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
            <div v-show="showDistrictSuggestions && filteredAddress('district', form.address.district).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
              <ul><li v-for="item in filteredAddress('district', form.address.district)" :key="item" @mousedown="form.address.district = item" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ item }}</li></ul>
            </div>
          </div>
          <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">จังหวัด</label>
            <input v-model="form.address.province" type="text" @focus="showProvinceSuggestions = true" @blur="setTimeout(()=> showProvinceSuggestions = false, 200)" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white" />
            <div v-show="showProvinceSuggestions && filteredAddress('province', form.address.province).length > 0" class="absolute z-20 w-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 max-h-48 overflow-auto">
              <ul><li v-for="item in filteredAddress('province', form.address.province)" :key="item" @mousedown="form.address.province = item" class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0">{{ item }}</li></ul>
            </div>
          </div>
          <div class="md:col-span-3 lg:col-span-1">
            <label class="block text-sm font-bold text-gray-900 mb-1">รหัสไปรษณีย์ (5 หลัก)</label>
            <input v-model="form.address.postal_code" @input="filterNumber('address.postal_code', 5)" maxlength="5" pattern="[0-9]{5}" type="text" placeholder="10xxx" class="block w-full rounded-lg border-gray-300 py-2 sm:text-sm shadow-sm focus:ring-2 focus:ring-green-500 bg-white font-mono text-lg tracking-widest text-center" />
          </div>
        </div>
      </section>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
        <button type="button" @click="$router.push('/')" class="w-full sm:w-auto text-base font-bold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 py-4 px-8 rounded-xl transition-colors">ยกเลิก</button>
        <button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-green-600 px-10 py-4 text-lg font-bold text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 transition-all transform flex items-center justify-center gap-2">
          <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSubmitting ? 'กำลังบันทึก...' : '✅ บันทึกข้อมูลเข้าสู่ระบบ' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';

const route = useRoute();
const router = useRouter();

const isEdit = ref(false);
const isSubmitting = ref(false);
const showSuccess = ref(false);
const errorMessage = ref('');
const resultId = ref(null);

// Electronic Signature Implementation
const sigCanvas = ref(null);
let sigCtx = null;
let isDrawingStroke = false;
const isDrawingSignatureActive = ref(false);

const initCanvas = () => {
  if (sigCanvas.value) {
    const canvas = sigCanvas.value;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    sigCtx = canvas.getContext('2d');
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#000000';
  }
};

const getCanvasPos = (evt) => {
  const rect = sigCanvas.value.getBoundingClientRect();
  if (evt.touches) {
    return {
      x: evt.touches[0].clientX - rect.left,
      y: evt.touches[0].clientY - rect.top
    };
  }
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
};

const startDraw = (evt) => {
  isDrawingStroke = true;
  isDrawingSignatureActive.value = true;
  if (form.value.signature_image && !isDrawingSignatureActive.value) {
      clearCanvasOnly();
  }
  const pos = getCanvasPos(evt);
  sigCtx.beginPath();
  sigCtx.moveTo(pos.x, pos.y);
};

const draw = (evt) => {
  if (!isDrawingStroke) return;
  const pos = getCanvasPos(evt);
  sigCtx.lineTo(pos.x, pos.y);
  sigCtx.stroke();
};

const endDraw = () => {
  if (isDrawingStroke) {
    isDrawingStroke = false;
    sigCtx.closePath();
    form.value.signature_image = sigCanvas.value.toDataURL('image/png');
  }
};

const clearCanvasOnly = () => {
  if (sigCtx && sigCanvas.value) {
    sigCtx.clearRect(0, 0, sigCanvas.value.width, sigCanvas.value.height);
  }
};

const clearSignature = () => {
  clearCanvasOnly();
  form.value.signature_image = '';
  isDrawingSignatureActive.value = false;
};

// Autocomplete Stores
const positionDict = ref([]);
const occupationDict = ref([]);
const roadDict = ref([]);
const subdistrictDict = ref([]);
const districtDict = ref([]);
const provinceDict = ref([]);

const showPositionSuggestionsDropdown = ref(false);
const showRoadSuggestions = ref(false);
const showSubdistrictSuggestions = ref(false);
const showDistrictSuggestions = ref(false);
const showProvinceSuggestions = ref(false);

const filteredPositions = (query) => {
    if (!query) return positionDict.value;
    return positionDict.value.filter(p => typeof p === 'string' && p.toLowerCase().includes(query.toLowerCase()));
};
const filteredOccupations = (query) => {
    if (!query) return occupationDict.value;
    return occupationDict.value.filter(o => typeof o === 'string' && o.toLowerCase().includes(query.toLowerCase()));
};
const filteredAddress = (field, query) => {
    let dict = [];
    if(field === 'road') dict = roadDict.value;
    else if(field === 'subdistrict') dict = subdistrictDict.value;
    else if(field === 'district') dict = districtDict.value;
    else if(field === 'province') dict = provinceDict.value;
    
    if (!query) return dict;
    return dict.filter(item => typeof item === 'string' && item.toLowerCase().includes(query.toLowerCase()));
};

const form = ref({
  military_id: '',
  rank: '',
  custom_rank: '',
  first_name: '',
  last_name: '',
  nickname: '',
  position: '',
  branch: '',
  custom_branch: '',
  affiliation: '',
  custom_affiliation: '',
  status: '',
  date_of_birth: '',
  retirement_year: '',
  profile_photo: '',
  signature_image: '',
  contacts: { phone_primary: '', phone_secondary: '', email: '', line_id: '' },
  family: { sons_count: 0, daughters_count: 0 },
  children: [],
  position_history: [],
  rank_history: [],
  address: { house_number: '', alley: '', road: '', subdistrict: '', district: '', province: '', postal_code: '' }
});

const filterNumber = (keyPath, length = null) => {
  let keys = keyPath.split('.');
  let obj = form.value;
  for(let i=0; i<keys.length-1; i++) {
    obj = obj[keys[i]];
  }
  let finalKey = keys[keys.length-1];
  
  if (!obj[finalKey]) return;
  
  let val = obj[finalKey].replace(/\D/g, ''); // replace non-digits
  if (length) {
    val = val.substring(0, length);
  }
  obj[finalKey] = val;
};

// Calculate Date differences in format Y Years M Months D Days
const calculateDurationText = (start, end) => {
    if(!start) return '-';
    let d1 = new Date(start);
    let d2 = end ? new Date(end) : new Date(); // if no end date, use today

    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d1 > d2) return '-';

    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();

    if (days < 0) {
        months--;
        // Get days in previous month
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

const calculateDetailedAge = (dobString) => {
   return calculateDurationText(dobString, null);
};

const addChild = () => {
    form.value.children.push({
        title: '',
        first_name: '',
        last_name: form.value.last_name || '', // prepopulate with family name
        birth_date: '',
        occupation: '',
        _showSuggestion: false
    });
};

const removeChild = (index) => {
    form.value.children.splice(index, 1);
};

const calculateRetirement = () => {
  if (!form.value.date_of_birth) return;
  const dob = new Date(form.value.date_of_birth);
  let retireYear = dob.getFullYear() + 60;
  
  // Born Oct(9), Nov(10), Dec(11) -> Retire next year after Sept 30
  if (dob.getMonth() >= 9) { 
    retireYear += 1;
  }
  form.value.retirement_year = retireYear;
};

const handleImage = (event, key, pngOnly = false) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 500 * 1024) {
    errorMessage.value = 'ขนาดไฟล์ต้องไม่เกิน 500KB';
    event.target.value = '';
    return;
  }

  if (pngOnly && file.type !== 'image/png') {
    errorMessage.value = 'อนุญาตเฉพาะไฟล์ .png เท่านั้นสำหรับลายเซ็น';
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    form.value[key] = reader.result;
    errorMessage.value = '';
  };
};

const loadDictionaries = async () => {
    try {
        const [posRes, occRes, roadRes, subRes, distRes, provRes] = await Promise.all([
            api.getDictionary('positions'),
            api.getDictionary('occupations'),
            api.getDictionary('roads'),
            api.getDictionary('subdistricts'),
            api.getDictionary('districts'),
            api.getDictionary('provinces')
        ]);
        positionDict.value = posRes.data;
        occupationDict.value = occRes.data;
        roadDict.value = roadRes.data;
        subdistrictDict.value = subRes.data;
        districtDict.value = distRes.data;
        provinceDict.value = provRes.data;
    } catch (e) {
        console.error('Failed fetching dicts', e);
    }
};

const loadProfile = async () => {
  if (!route.params.id) return;
  isEdit.value = true;
  try {
    const { data } = await api.getAlumniById(route.params.id);
    
    // Bind dates to input[type=date] format yyyy-mm-dd
    if (data.date_of_birth) data.date_of_birth = new Date(data.date_of_birth).toISOString().split('T')[0];
    
    if (data.children && Array.isArray(data.children)) {
        data.children = data.children.map(c => {
            if(c.birth_date) c.birth_date = new Date(c.birth_date).toISOString().split('T')[0];
            return c;
        });
    }

    if (data.position_history && Array.isArray(data.position_history)) {
        data.position_history = data.position_history.map(ph => {
            if(ph.start_date) ph.start_date = new Date(ph.start_date).toISOString().split('T')[0];
            if(ph.end_date) ph.end_date = new Date(ph.end_date).toISOString().split('T')[0];
            return ph;
        });
    }

    if (data.rank_history && Array.isArray(data.rank_history)) {
        data.rank_history = data.rank_history.map(rh => {
            if(rh.start_date) rh.start_date = new Date(rh.start_date).toISOString().split('T')[0];
            if(rh.end_date) rh.end_date = new Date(rh.end_date).toISOString().split('T')[0];
            return rh;
        });
    }

    form.value = { ...form.value, ...data };
  } catch (error) {
    console.error('Failed to load profile', error);
  }
};

const submitForm = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    if (form.value.rank !== 'อื่นๆ') form.value.custom_rank = null;
    if (form.value.branch !== 'อื่นๆ') form.value.custom_branch = null;
    if (form.value.affiliation !== 'อื่นๆ') form.value.custom_affiliation = null;
    if (form.value.affiliation === 'เสียชีวิต') form.value.status = 'เสียชีวิต';

    if (isEdit.value) {
      await api.updateAlumni(route.params.id, form.value);
      resultId.value = route.params.id;
    } else {
      const res = await api.createAlumni(form.value);
      resultId.value = res.data.id;
    }
    showSuccess.value = true;
  } catch (error) {
    errorMessage.value = 'ไม่สามารถบันทึกข้อมูลได้: ' + (error.response?.data?.details || error.message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSubmitting.value = false;
  }
};

const closeSuccess = () => {
    showSuccess.value = false;
    router.push(`/profile/${resultId.value}`);
};

onMounted(() => {
  loadDictionaries();
  loadProfile();
  setTimeout(() => initCanvas(), 100);
  window.addEventListener('resize', initCanvas);
});
</script>

<style scoped>
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fade-in 0.5s ease-out; }
.animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
