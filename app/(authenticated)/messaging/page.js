'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { messagingAPI, eventsAPI } from '@/lib/api';
import {
  Send, MessageSquare, Users, Calendar, FlaskConical,
  CheckCircle, XCircle, Info, Bell, Copy, Check
} from 'lucide-react';

export default function MessagingPage() {
  const [message, setMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventTarget, setEventTarget] = useState('registered');
  const [eventMessage, setEventMessage] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('broadcast');
  const [copied, setCopied] = useState(false);

  const user = useAuthStore((state) => state.user);
  const isEditorOrAdmin = user?.role === 'editor' || user?.role === 'super_admin';

  const WEBHOOK_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/api/messaging/line/webhook`
    : '/api/messaging/line/webhook';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll();
      if (Array.isArray(response?.data)) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleAction = async (action) => {
    setLoading(true);
    setResult(null);

    try {
      let response;

      switch (action) {
        case 'test':
          response = await messagingAPI.testAdmin();
          break;
        case 'broadcast':
          if (!message.trim()) { alert('กรุณาพิมพ์ข้อความ'); setLoading(false); return; }
          response = await messagingAPI.broadcast(message);
          break;
        case 'event':
          if (!selectedEvent) { alert('กรุณาเลือกงาน'); setLoading(false); return; }
          response = await messagingAPI.sendEventNotification(selectedEvent, {
            target: eventTarget,
            message: eventMessage,
          });
          break;
        default:
          break;
      }

      const data = response?.data;
      setResult(data);

      if (data?.success) {
        if (action === 'broadcast') setMessage('');
        if (action === 'event') setEventMessage('');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด';
      setResult({ success: false, error: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isEditorOrAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="mx-auto mb-3 text-slate-500" size={48} />
          <p className="text-slate-700 font-medium text-lg">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-gray-500 text-sm mt-1">เฉพาะ Editor และ Super Admin เท่านั้น</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'broadcast', label: 'ส่งประกาศ', icon: Users },
    { id: 'event', label: 'แจ้งเตือนงาน', icon: Calendar },
    { id: 'test', label: 'ทดสอบระบบ', icon: FlaskConical },
    { id: 'setup', label: 'ตั้งค่า Webhook', icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-[#0d3b66] p-2 rounded-lg">
          <MessageSquare size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ระบบส่งข้อความ LINE</h1>
          <p className="text-sm text-gray-500">Bot: crma42_Bot | Channel ID: 2009467653</p>
        </div>
      </div>

      {/* Result Alert */}
      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          result.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {result.success
            ? <CheckCircle className="shrink-0 mt-0.5" size={20} />
            : <XCircle className="shrink-0 mt-0.5" size={20} />
          }
          <div className="flex-1">
            <p className="font-semibold">
              {result.success ? '✅ ส่งสำเร็จ' : '❌ ส่งไม่สำเร็จ'}
            </p>
            {result.successful !== undefined && (
              <p className="text-sm mt-1">
                ส่งสำเร็จ {result.successful} คน
                {result.failed > 0 && ` | ล้มเหลว ${result.failed} คน`}
              </p>
            )}
            {result.error && <p className="text-sm mt-1">ข้อผิดพลาด: {result.error}</p>}
            {result.message && !result.success && <p className="text-sm mt-1">{result.message}</p>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-emerald-50 text-[#0d3b66] border-b-2 border-[#0d3b66]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── ส่งประกาศ ── */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ข้อความประกาศ <span className="text-gray-400">(จะส่งถึงทุกคนที่มี LINE ID ในระบบ)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="พิมพ์ข้อประกาศที่ต้องการส่ง เช่น ข่าวสาร, นัดหมาย, ประชาสัมพันธ์..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-none text-sm"
                  rows={5}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length} ตัวอักษร</p>
              </div>
              <button
                onClick={() => handleAction('broadcast')}
                disabled={loading || !message.trim()}
                className="w-full bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Send size={18} />
                {loading ? 'กำลังส่ง...' : 'ส่งประกาศ'}
              </button>
            </div>
          )}

          {/* ── แจ้งเตือนงาน ── */}
          {activeTab === 'event' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลือกงานที่ต้องการแจ้งเตือน
                </label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                >
                  <option value="">-- เลือกงาน --</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} — {new Date(event.event_date).toLocaleDateString('th-TH', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })} ({event.registered_count || 0} ลงทะเบียน)
                    </option>
                  ))}
                </select>
                {events.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">ยังไม่มีงานในระบบ กรุณาสร้างงานก่อน</p>
                )}
              </div>

              {selectedEvent && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                  {(() => {
                    const ev = events.find(e => e.id === selectedEvent);
                    if (!ev) return null;
                    return (
                      <div className="space-y-1">
                        <p className="font-medium text-blue-900">📌 {ev.title}</p>
                        <p className="text-blue-700">📅 {new Date(ev.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        {ev.location && <p className="text-blue-700">📍 {ev.location}</p>}
                        <p className="text-blue-700">👥 ผู้ลงทะเบียน: {ev.registered_count || 0} คน</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">กลุ่มผู้รับแจ้งเตือน</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className={`border rounded-xl px-3 py-2 text-sm cursor-pointer ${eventTarget === 'registered' ? 'border-[#0d3b66] bg-blue-50 text-[#0d3b66]' : 'border-gray-200 text-gray-600'}`}>
                    <input
                      type="radio"
                      name="event-target"
                      value="registered"
                      checked={eventTarget === 'registered'}
                      onChange={(e) => setEventTarget(e.target.value)}
                      className="mr-2"
                    />
                    ผู้ลงทะเบียนงานนี้
                  </label>
                  <label className={`border rounded-xl px-3 py-2 text-sm cursor-pointer ${eventTarget === 'all' ? 'border-[#0d3b66] bg-blue-50 text-[#0d3b66]' : 'border-gray-200 text-gray-600'}`}>
                    <input
                      type="radio"
                      name="event-target"
                      value="all"
                      checked={eventTarget === 'all'}
                      onChange={(e) => setEventTarget(e.target.value)}
                      className="mr-2"
                    />
                    ทุกคนที่มี LINE ID
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ข้อความแจ้งเตือนงาน (ไม่บังคับ)
                </label>
                <textarea
                  value={eventMessage}
                  onChange={(e) => setEventMessage(e.target.value)}
                  placeholder="ปล่อยว่างเพื่อใช้ข้อความอัตโนมัติจากข้อมูลกิจกรรม"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-none text-sm"
                  rows={4}
                />
              </div>

              <button
                onClick={() => handleAction('event')}
                disabled={loading || !selectedEvent}
                className="w-full bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Bell size={18} />
                {loading ? 'กำลังส่ง...' : 'ส่งแจ้งเตือนงานรุ่น'}
              </button>
            </div>
          )}

          {/* ── ทดสอบระบบ ── */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">ทดสอบการส่งข้อความ</p>
                    <p className="text-yellow-700 mt-1">ระบบจะส่งข้อความทดสอบไปยัง LINE ของ Admin</p>
                    <p className="text-yellow-600 mt-1 font-mono text-xs">User ID: {process.env.NEXT_PUBLIC_LINE_CHANNEL_ID ? 'U4985c723d1186626147a8519860aaabe' : 'U4985c723d1186626147a8519860aaabe'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAction('test')}
                disabled={loading}
                className="w-full bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <FlaskConical size={18} />
                {loading ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบ'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                หากได้รับข้อความใน LINE แสดงว่าระบบพร้อมใช้งาน ✅
              </p>
            </div>
          )}

          {/* ── ตั้งค่า Webhook ── */}
          {activeTab === 'setup' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  🔗 Webhook URL สำหรับตั้งค่าใน LINE Developers Console
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 break-all">
                    {WEBHOOK_URL}
                  </code>
                  <button
                    onClick={copyWebhook}
                    className="shrink-0 p-2 bg-[#0d3b66] hover:bg-[#0a2f52] text-white rounded-lg transition-colors"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">ขั้นตอนการตั้งค่า:</p>
                <ol className="text-sm text-gray-600 space-y-3">
                  <li className="flex gap-3">
                    <span className="bg-[#0d3b66] text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                    <span>เข้าไปที่ <a href="https://developers.line.biz/console/" target="_blank" className="text-[#0d3b66] underline">LINE Developers Console</a></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#0d3b66] text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                    <span>เลือก Channel: <strong>crma42_Bot</strong> (Channel ID: 2009467653)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#0d3b66] text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                    <span>ไปที่ <strong>Messaging API → Webhook settings</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#0d3b66] text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">4</span>
                    <span>วาง Webhook URL ด้านบน แล้วกด <strong>Verify</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-[#0d3b66] text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">5</span>
                    <span>เปิดใช้งาน <strong>Use webhook</strong></span>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">📌 สิ่งที่ Bot จะทำเมื่อมีคนติดตาม:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• ส่งข้อความต้อนรับพร้อม LINE User ID</li>
                  <li>• ผู้ใช้พิมพ์ &quot;ID&quot; เพื่อดู User ID ของตัวเอง</li>
                  <li>• นำ ID ไปกรอกในโปรไฟล์เพื่อรับแจ้งเตือน</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-500 space-y-1">
            <p>• ระบบส่งได้เฉพาะสมาชิกที่มี LINE ID บันทึกในโปรไฟล์</p>
            <p>• สมาชิกรับ LINE ID ได้โดยติดตาม Bot แล้วพิมพ์ &quot;ID&quot;</p>
            <p>• LINE Messaging API สามารถส่งได้สูงสุด 500 คน/ครั้ง (Multicast)</p>
          </div>
        </div>
      </div>
    </div>
  );
}