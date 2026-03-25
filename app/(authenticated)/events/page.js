'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import {
  Calendar, MapPin, Users, Plus, Edit2, Trash2,
  X, CheckCircle, Clock, ChevronRight, Search,
  Send, Bell, AlertCircle, Loader2
} from 'lucide-react';

const STATUS_CONFIG = {
  upcoming:   { label: 'กำลังจะมาถึง', color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  ongoing:    { label: 'กำลังดำเนินการ', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  completed:  { label: 'เสร็จสิ้น',      color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400'  },
  cancelled:  { label: 'ยกเลิก',          color: 'bg-red-100 text-red-600',     dot: 'bg-red-400'   },
};

const EMPTY_FORM = {
  title: '', description: '', event_date: '',
  location: '', max_attendees: '', status: 'upcoming', cover_image: ''
};

// ──────────── Modal: สร้าง/แก้ไขงาน ────────────
function EventModal({ event, onClose, onSave, loading }) {
  const [form, setForm] = useState(event || EMPTY_FORM);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.event_date) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {event ? '✏️ แก้ไขงาน' : '📅 สร้างงานใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่องาน <span className="text-red-500">*</span>
            </label>
            <input
              name="title" value={form.title} onChange={handleChange}
              placeholder="เช่น งานเลี้ยงรุ่นประจำปี 2568"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              placeholder="รายละเอียดงาน..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันและเวลา <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local" name="event_date" value={form.event_date} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนที่นั่ง</label>
              <input
                type="number" name="max_attendees" value={form.max_attendees} onChange={handleChange}
                placeholder="ไม่จำกัด"
                min="1"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่</label>
            <input
              name="location" value={form.location} onChange={handleChange}
              placeholder="เช่น โรงแรมทหารบก กรุงเทพฯ"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              name="status" value={form.status} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────── Modal: รายชื่อผู้เข้าร่วม ────────────
function AttendeesModal({ event, onClose }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const storedAuth = JSON.parse(localStorage.getItem('auth') || '{}');
        const token = storedAuth?.state?.token || storedAuth?.token || null;
        const res = await fetch(`/api/events/${event.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchRegistrations();
  }, [event.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">รายชื่อผู้เข้าร่วม</h2>
            <p className="text-sm text-gray-500 mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto text-[#0d3b66]" size={32} />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>ยังไม่มีผู้ลงทะเบียน</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrations.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {r.rank} {r.first_name} {r.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      ลงทะเบียน: {new Date(r.registered_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────── Event Card ────────────
function EventCard({ event, canManage, onEdit, onDelete, onRegister, onCancelRegister, onViewAttendees, isSubmitting }) {
  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;
  const isFull = event.max_attendees && event.registered_count >= event.max_attendees;
  const isPast = event.status === 'completed' || event.status === 'cancelled';
  const isRegistered = !!event.is_registered;
  const canRegister = !isPast && !isRegistered && !isFull;
  const canCancel = !isPast && isRegistered;

  const dateStr = new Date(event.event_date).toLocaleDateString('th-TH', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  const timeStr = new Date(event.event_date).toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* Status bar */}
      <div className={`h-1.5 w-full ${statusCfg.dot}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {isRegistered && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                <CheckCircle size={12} />
                ลงทะเบียนแล้ว
              </span>
            )}
          </div>
          {canManage && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(event)}
                className="p-1.5 hover:bg-sky-50 text-[#0d3b66] rounded-lg transition-colors">
                <Edit2 size={15} />
              </button>
              <button onClick={() => onDelete(event)}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{event.title}</h3>

        {event.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>
        )}

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={15} className="text-blue-500 shrink-0" />
            <span>{dateStr} เวลา {timeStr} น.</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={15} className="text-red-400 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={15} className="text-green-500 shrink-0" />
            <span>
              {event.registered_count || 0} คนลงทะเบียน
              {event.max_attendees && (
                <span className={`ml-1 ${isFull ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  / {event.max_attendees} ที่นั่ง{isFull && ' (เต็ม)'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewAttendees(event)}
            className="flex-none px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Users size={14} />
            รายชื่อ
          </button>
          {!isPast && (
            <>
              <button
                onClick={() => onRegister(event)}
                disabled={!canRegister || isSubmitting}
                className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  !canRegister || isSubmitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#0d3b66] hover:bg-[#0a2f52] text-white'
                }`}
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                {isSubmitting ? 'กำลังดำเนินการ...' : isFull ? 'เต็มแล้ว' : 'ลงทะเบียนเข้าร่วม'}
              </button>
              {canCancel && (
                <button
                  onClick={() => onCancelRegister(event)}
                  disabled={isSubmitting}
                  className={`flex-none px-3 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  ยกเลิก
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────── Main Page ────────────
export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'attendees' | 'delete'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [registeringEventId, setRegisteringEventId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // all | mine
  const [toast, setToast] = useState(null);

  const user = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);
  const isEditorOrAdmin = user?.role === 'editor' || user?.role === 'super_admin';

  const getToken = () => {
    if (authToken) return authToken;
    try {
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      return stored?.state?.token || stored?.token || null;
    }
    catch { return null; }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/events', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) setEvents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── CRUD Handlers ──
  const handleSave = async (form) => {
    setSavingEvent(true);
    try {
      const token = getToken();
      const isEdit = !!selectedEvent?.id;
      const url = isEdit ? `/api/events/${selectedEvent.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showToast(isEdit ? 'แก้ไขงานสำเร็จ' : 'สร้างงานสำเร็จ');
        setModalType(null);
        fetchEvents();
      } else {
        const data = await res.json();
        showToast(data.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (e) {
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
    } finally { setSavingEvent(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('ลบงานสำเร็จ');
        setModalType(null);
        fetchEvents();
      }
    } catch (e) { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  const registerOrCancel = async (event, action = 'register') => {
    const token = getToken();
    if (!token) {
      showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
      return;
    }

    setRegisteringEventId(event.id);
    try {
      const isRegistered = action === 'cancel';
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(isRegistered ? {} : { body: JSON.stringify({}) })
      });

      const data = await res.json().catch(() => ({}));
      const successMessage = isRegistered ? 'ยกเลิกการเข้าร่วมสำเร็จ' : 'ลงทะเบียนสำเร็จ';
      showToast(data.message || (res.ok ? successMessage : 'เกิดข้อผิดพลาด'), res.ok ? 'success' : 'error');
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleRegister = async (event) => {
    await registerOrCancel(event, 'register');
  };

  const handleCancelRegister = async (event) => {
    if (!confirm(`ยืนยันยกเลิกการเข้าร่วมกิจกรรม "${event.title}" ?`)) {
      return;
    }
    await registerOrCancel(event, 'cancel');
  };

  const getStatusPriority = (status) => {
    if (status === 'ongoing') return 0;
    if (status === 'upcoming') return 1;
    if (status === 'completed') return 2;
    if (status === 'cancelled') return 3;
    return 4;
  };

  // Filtered and sorted events
  const filteredEvents = events
    .filter(ev => {
    const matchSearch = !search || ev.title.toLowerCase().includes(search.toLowerCase()) || ev.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || ev.status === filterStatus;
    const matchViewMode = viewMode === 'all' || !!ev.is_registered;
    return matchSearch && matchStatus && matchViewMode;
  })
    .sort((a, b) => {
      const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (statusDiff !== 0) return statusDiff;

      const timeA = new Date(a.event_date).getTime();
      const timeB = new Date(b.event_date).getTime();

      // upcoming/ongoing => nearest first, completed/cancelled => latest first
      if (a.status === 'upcoming' || a.status === 'ongoing') {
        return timeA - timeB;
      }

      return timeB - timeA;
    });

  const upcomingCount = events.filter(e => e.status === 'upcoming' || e.status === 'ongoing').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">งานรุ่น</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {upcomingCount > 0
                ? `มี ${upcomingCount} งานที่กำลังจะมาถึง`
                : 'ติดตามข่าวสารและกิจกรรมของรุ่น'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-[#0d3b66] text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setViewMode('mine')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'mine'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              กิจกรรมของฉัน
            </button>
            {isEditorOrAdmin && (
              <button
                onClick={() => { setSelectedEvent(null); setModalType('create'); }}
                className="flex items-center gap-2 bg-[#0d3b66] hover:bg-[#0a2f52] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                สร้างงานใหม่
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่องาน, สถานที่..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all', 'ทั้งหมด'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                filterStatus === val
                  ? 'bg-[#0d3b66] text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#0d3b66]" size={36} />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={56} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">ไม่พบงานที่ตรงกับเงื่อนไข</p>
          {isEditorOrAdmin && (
            <button
              onClick={() => { setSelectedEvent(null); setModalType('create'); }}
              className="mt-4 text-[#0d3b66] hover:underline text-sm"
            >
              + สร้างงานใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              canManage={isEditorOrAdmin}
              onEdit={(ev) => { setSelectedEvent(ev); setModalType('edit'); }}
              onDelete={(ev) => { setSelectedEvent(ev); setModalType('delete'); }}
              onRegister={handleRegister}
              onCancelRegister={handleCancelRegister}
              onViewAttendees={(ev) => { setSelectedEvent(ev); setModalType('attendees'); }}
              isSubmitting={registeringEventId === ev.id}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(modalType === 'create' || modalType === 'edit') && (
        <EventModal
          event={modalType === 'edit' ? {
            ...selectedEvent,
            event_date: selectedEvent?.event_date
              ? new Date(selectedEvent.event_date).toISOString().slice(0, 16)
              : ''
          } : null}
          onClose={() => setModalType(null)}
          onSave={handleSave}
          loading={savingEvent}
        />
      )}

      {modalType === 'attendees' && selectedEvent && (
        <AttendeesModal
          event={selectedEvent}
          onClose={() => setModalType(null)}
        />
      )}

      {modalType === 'delete' && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">ยืนยันการลบ</h3>
                <p className="text-sm text-slate-500">การลบจะไม่สามารถกู้คืนได้</p>
              </div>
            </div>
            <p className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong>"{selectedEvent.title}"</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalType(null)} className="ux-btn-secondary flex-1 px-4 py-2.5 text-sm">
                ยกเลิก
              </button>
              <button onClick={handleDelete} className="ux-btn-danger flex-1 px-4 py-2.5 text-sm">
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}