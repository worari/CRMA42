'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const STATUS_LABEL = {
  upcoming: 'กำลังจะมาถึง',
  ongoing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

export default function MyEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authToken = useAuthStore((s) => s.token);

  const getToken = () => {
    if (authToken) return authToken;
    try {
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      return stored?.state?.token || stored?.token || null;
    } catch {
      return null;
    }
  };

  const fetchMyEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        setError('กรุณาเข้าสู่ระบบก่อน');
        setEvents([]);
        return;
      }

      const res = await fetch('/api/events?mine=1', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(data?.message || 'ไม่สามารถโหลดกิจกรรมของฉันได้');
        setEvents([]);
        return;
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError('ไม่สามารถโหลดกิจกรรมของฉันได้');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">กิจกรรมของฉัน</h1>
            <p className="mt-0.5 text-sm text-slate-600">รายการกิจกรรมที่คุณลงทะเบียนเข้าร่วม</p>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0d3b66] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0a2f52]"
          >
            <ArrowLeft size={16} />
            กลับหน้ากิจกรรม
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#0d3b66]" size={36} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          <Calendar size={42} className="mx-auto mb-3 text-slate-300" />
          <p>ยังไม่มีกิจกรรมที่ลงทะเบียน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                ลงทะเบียนแล้ว
              </div>
              <h2 className="mb-2 text-lg font-bold text-slate-900 line-clamp-2">{event.title}</h2>
              <p className="mb-4 text-sm text-slate-500">{STATUS_LABEL[event.status] || event.status}</p>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-blue-500" />
                  {new Date(event.event_date).toLocaleDateString('th-TH')}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-red-500" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-green-500" />
                  {event.registered_count || 0} คนเข้าร่วม
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
