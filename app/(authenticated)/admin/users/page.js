'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Check, X, Pencil, Trash2, Loader2, RefreshCw, Monitor, Smartphone, Globe, ChevronDown, ChevronUp, Activity, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';

const USERS_PAGE_SIZE = 10;
const SESSIONS_PAGE_SIZE = 10;
const PDPA_PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 20;

function getVisiblePageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
}

function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        แสดง {start}-{end} จาก {totalItems} รายการ
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          หน้าแรก
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ย้อนกลับ
        </button>
        <div className="flex flex-wrap items-center gap-1">
          {visiblePages.map((item) => {
            if (typeof item !== 'number') {
              return (
                <span key={item} className="px-2 py-2 text-sm text-gray-400">
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-[40px] rounded-lg border px-3 py-2 text-sm font-medium ${
                  item === page
                    ? 'border-[#0d3b66] bg-[#0d3b66] text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          หน้าถัดไป
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          หน้าสุดท้าย
        </button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [consentLogs, setConsentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logVersionFilter, setLogVersionFilter] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('');
  const [activityEntityFilter, setActivityEntityFilter] = useState('');
  const [activityIpFilter, setActivityIpFilter] = useState('');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [allowUserProfileEdit, setAllowUserProfileEdit] = useState(true);
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [consentPage, setConsentPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [clearLogsTarget, setClearLogsTarget] = useState('all');
  const [clearLogsDialogTarget, setClearLogsDialogTarget] = useState(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState(null);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [clearLogsMenuOpen, setClearLogsMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const clearLogsMenuRef = useRef(null);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    fetchUsers();
    fetchPdpaLogs();
    fetchActivityLogs();
    fetchPermissionSettings();
    fetchSessions();
  }, []);

  // Auto-refresh sessions every 60s
  useEffect(() => {
    const timer = setInterval(() => { fetchSessions(); }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!clearLogsMenuRef.current) {
        return;
      }

      if (!clearLogsMenuRef.current.contains(event.target)) {
        setClearLogsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (deleteUserDialog && !deletingId) {
          setDeleteUserDialog(null);
          return;
        }

        if (clearLogsDialogTarget && !clearingLogs) {
          setClearLogsDialogTarget(null);
          return;
        }

        setClearLogsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [clearLogsDialogTarget, clearingLogs, deleteUserDialog, deletingId]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getUsers();
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPdpaLogs = async () => {
    try {
      const response = await authAPI.getPdpaConsentLogs();
      setConsentLogs(response.data || []);
    } catch (err) {
      console.error('Failed to load PDPA logs', err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await authAPI.getActivityLogs(500);
      setActivityLogs(response.data || []);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await authAPI.getSessions();
      setSessions(response.data?.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchPermissionSettings = async () => {
    try {
      const response = await authAPI.getPermissionSettings();
      setAllowUserProfileEdit(Boolean(response?.data?.permissions?.allow_user_profile_edit));
    } catch (err) {
      console.error('Failed to load permission settings', err);
    }
  };

  const handleToggleUserProfileEdit = async () => {
    try {
      setUpdatingPermission(true);
      const response = await authAPI.updatePermissionSettings({
        allow_user_profile_edit: !allowUserProfileEdit,
      });
      const enabled = Boolean(response?.data?.permissions?.allow_user_profile_edit);
      setAllowUserProfileEdit(enabled);
      await fetchActivityLogs();
      showToast('success', 'บันทึกนโยบายสำเร็จ', enabled ? 'เปิดสิทธิ์แก้ไขโปรไฟล์สำหรับผู้ใช้ทั่วไปแล้ว' : 'ปิดสิทธิ์แก้ไขโปรไฟล์สำหรับผู้ใช้ทั่วไปแล้ว');
    } catch (err) {
      showToast('error', 'บันทึกนโยบายไม่สำเร็จ', err.response?.data?.message || 'Failed to update permission setting');
      console.error(err);
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      setUpdatingId(userId);
      await authAPI.updateUserStatus(userId, newStatus);
      await fetchUsers();
      await fetchActivityLogs();
      showToast('success', 'อัปเดตสถานะสำเร็จ', `เปลี่ยนสถานะผู้ใช้งานเป็น ${newStatus}`);
    } catch (err) {
      showToast('error', 'อัปเดตสถานะไม่สำเร็จ', err.response?.data?.message || 'Failed to update user status');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      await authAPI.updateUserRole(userId, newRole);
      await fetchUsers();
      await fetchActivityLogs();
      showToast('success', 'อัปเดตบทบาทสำเร็จ', `เปลี่ยนบทบาทผู้ใช้งานเป็น ${newRole}`);
    } catch (err) {
      showToast('error', 'อัปเดตบทบาทไม่สำเร็จ', err.response?.data?.message || 'Failed to update user role');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await authAPI.updateUserInfo(editingUser.id, editForm);
      setEditingUser(null);
      await fetchUsers();
      await fetchActivityLogs();
      showToast('success', 'บันทึกข้อมูลสำเร็จ', 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
    } catch (err) {
      showToast('error', 'บันทึกข้อมูลไม่สำเร็จ', err.response?.data?.message || 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้');
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteUserDialog = (user) => {
    setDeleteUserDialog(user);
  };

  const closeDeleteUserDialog = () => {
    if (!deletingId) {
      setDeleteUserDialog(null);
    }
  };

  const handleDeleteUser = async (user = deleteUserDialog) => {
    if (!user) return;
    setDeletingId(user.id);
    try {
      await authAPI.deleteUser(user.id);
      await fetchUsers();
      await fetchActivityLogs();
      setDeleteUserDialog(null);
      showToast('success', 'ลบบัญชีสำเร็จ', `ลบบัญชี ${user.first_name || ''} ${user.last_name || ''}`.trim());
    } catch (err) {
      showToast('error', 'ลบบัญชีไม่สำเร็จ', err.response?.data?.message || 'เกิดข้อผิดพลาด ไม่สามารถลบได้');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const getClearLogsOption = (target) => {
    if (target === 'activity') {
      return {
        title: 'ล้างเฉพาะ Activity Log',
        detail: 'จะลบประวัติการใช้งานทั้งหมด และอาจทำให้รายการผู้ที่กำลังใช้งานหายไปจนกว่าจะมีการล็อกอินใหม่',
      };
    }

    if (target === 'pdpa') {
      return {
        title: 'ล้างเฉพาะ PDPA Log',
        detail: 'จะลบประวัติการยินยอม PDPA ทั้งหมดออกจากระบบ',
      };
    }

    return {
      title: 'ล้าง log ทั้งหมด',
      detail: 'จะลบทั้ง Activity Log และประวัติการยินยอม PDPA ออกจากระบบทั้งหมด',
    };
  };

  const openClearLogsDialog = (target) => {
    setClearLogsTarget(target);
    setClearLogsDialogTarget(target);
    setClearLogsMenuOpen(false);
  };

  const closeClearLogsDialog = () => {
    if (clearingLogs) {
      return;
    }

    setClearLogsDialogTarget(null);
  };

  const handleClearLogs = async (target = clearLogsTarget) => {
    try {
      setClearingLogs(true);
      setClearLogsTarget(target);
      const response = await authAPI.clearLogStore(target);
      await Promise.all([fetchActivityLogs(), fetchPdpaLogs(), fetchSessions()]);
      setExpandedLogId(null);
      showToast('success', 'ล้างข้อมูลเรียบร้อย', `Activity Log: ${response.data?.deleted?.activity ?? 0} รายการ | PDPA Log: ${response.data?.deleted?.pdpa ?? 0} รายการ`);
      setClearLogsMenuOpen(false);
      setClearLogsDialogTarget(null);
    } catch (err) {
      showToast('error', 'ล้างข้อมูลไม่สำเร็จ', err.response?.data?.message || 'ไม่สามารถล้างข้อมูล log ได้');
      console.error(err);
    } finally {
      setClearingLogs(false);
    }
  };

  const exportPdpaLogsCsv = () => {
    if (!filteredConsentLogs.length) {
      return;
    }

    const rows = filteredConsentLogs.map((log) => ({
      first_name: log.first_name || '',
      last_name: log.last_name || '',
      email: log.email || '',
      consent: log.consent ? 'ยินยอม' : 'ไม่ยินยอม',
      pdpa_version: log.pdpa_version || '',
      consent_at: log.consent_at ? new Date(log.consent_at).toISOString() : '',
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pdpa-consent-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdpaLogsXlsx = () => {
    if (!filteredConsentLogs.length) {
      return;
    }

    const rows = filteredConsentLogs.map((log) => ({
      ชื่อ: log.first_name || '',
      นามสกุล: log.last_name || '',
      อีเมล: log.email || '',
      สถานะ: log.consent ? 'ยินยอม' : 'ไม่ยินยอม',
      เวอร์ชัน: log.pdpa_version || '',
      เวลา: log.consent_at ? new Date(log.consent_at).toLocaleString('th-TH') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'pdpa_logs');
    XLSX.writeFile(wb, 'pdpa-consent-logs.xlsx');
  };

  const filteredConsentLogs = useMemo(() => {
    const search = logSearch.trim().toLowerCase();

    return consentLogs.filter((log) => {
      const fullName = `${log.first_name || ''} ${log.last_name || ''}`.trim().toLowerCase();
      const email = (log.email || '').toLowerCase();
      const version = (log.pdpa_version || '').toLowerCase();
      const status = log.consent ? 'consent' : 'revoke';
      const date = log.consent_at ? new Date(log.consent_at) : null;

      if (search && !fullName.includes(search) && !email.includes(search)) {
        return false;
      }

      if (logStatusFilter && status !== logStatusFilter) {
        return false;
      }

      if (logVersionFilter && version !== logVersionFilter.toLowerCase()) {
        return false;
      }

      if (logDateFrom) {
        const from = new Date(`${logDateFrom}T00:00:00`);
        if (!date || date < from) {
          return false;
        }
      }

      if (logDateTo) {
        const to = new Date(`${logDateTo}T23:59:59`);
        if (!date || date > to) {
          return false;
        }
      }

      return true;
    });
  }, [consentLogs, logSearch, logStatusFilter, logVersionFilter, logDateFrom, logDateTo]);

  const availableVersions = useMemo(() => {
    const set = new Set(consentLogs.map((log) => log.pdpa_version).filter(Boolean));
    return Array.from(set).sort();
  }, [consentLogs]);

  const availableActivityEntities = useMemo(() => {
    const set = new Set(activityLogs.map((log) => log.entity_type).filter(Boolean));
    return Array.from(set).sort();
  }, [activityLogs]);

  const filteredActivityLogs = useMemo(() => {
    const search = activitySearch.trim().toLowerCase();

    return activityLogs.filter((log) => {
      const actorName = `${log.actor_first_name || ''} ${log.actor_last_name || ''}`.trim().toLowerCase();
      const actorEmail = String(log.actor_email || '').toLowerCase();
      const action = String(log.action || '').toUpperCase();
      const entityType = String(log.entity_type || '').toLowerCase();
      const date = log.created_at ? new Date(log.created_at) : null;

      if (search && !actorName.includes(search) && !actorEmail.includes(search)) {
        return false;
      }

      if (activityActionFilter && action !== activityActionFilter) {
        return false;
      }

      if (activityEntityFilter && entityType !== activityEntityFilter.toLowerCase()) {
        return false;
      }

      if (activityDateFrom) {
        const from = new Date(`${activityDateFrom}T00:00:00`);
        if (!date || date < from) {
          return false;
        }
      }

      if (activityDateTo) {
        const to = new Date(`${activityDateTo}T23:59:59`);
        if (!date || date > to) {
          return false;
        }
      }

      if (activityIpFilter && !(log.ip_address || '').includes(activityIpFilter)) {
        return false;
      }

      return true;
    });
  }, [activityLogs, activitySearch, activityActionFilter, activityEntityFilter, activityIpFilter, activityDateFrom, activityDateTo]);

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.ip_address || '').includes(q)
    );
  }, [sessions, sessionSearch]);

  useEffect(() => {
    setUsersPage(1);
  }, [users.length]);

  useEffect(() => {
    setSessionsPage(1);
  }, [filteredSessions.length, sessionSearch]);

  useEffect(() => {
    setConsentPage(1);
  }, [filteredConsentLogs.length, logSearch, logStatusFilter, logVersionFilter, logDateFrom, logDateTo]);

  useEffect(() => {
    setActivityPage(1);
  }, [filteredActivityLogs.length, activitySearch, activityActionFilter, activityEntityFilter, activityIpFilter, activityDateFrom, activityDateTo]);

  const userTotalPages = Math.max(1, Math.ceil(users.length / USERS_PAGE_SIZE));
  const sessionTotalPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PAGE_SIZE));
  const consentTotalPages = Math.max(1, Math.ceil(filteredConsentLogs.length / PDPA_PAGE_SIZE));
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityLogs.length / ACTIVITY_PAGE_SIZE));

  const paginatedUsers = users.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);
  const paginatedSessions = filteredSessions.slice((sessionsPage - 1) * SESSIONS_PAGE_SIZE, sessionsPage * SESSIONS_PAGE_SIZE);
  const paginatedConsentLogs = filteredConsentLogs.slice((consentPage - 1) * PDPA_PAGE_SIZE, consentPage * PDPA_PAGE_SIZE);
  const paginatedActivityLogs = filteredActivityLogs.slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE);

  function parseUA(ua) {
    if (!ua || ua === 'unknown') return { browser: 'Unknown', os: 'Unknown', device: '🖥️ คอมพิวเตอร์' };
    let browser = 'Other', os = 'Other', device = '🖥️ คอมพิวเตอร์';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/MSIE|Trident/.test(ua)) browser = 'IE';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    if (/Mobile|Android|iPhone/.test(ua)) device = '📱 มือถือ';
    else if (/iPad|Tablet/.test(ua)) device = '📟 แท็บเล็ต';
    return { browser, os, device };
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'เพิ่งเข้าสู่ระบบ';
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    return `${Math.floor(h / 24)} วันที่แล้ว`;
  }


  const exportActivityLogsCsv = () => {
    if (!filteredActivityLogs.length) {
      return;
    }

    const rows = filteredActivityLogs.map((log) => ({
      created_at: log.created_at ? new Date(log.created_at).toISOString() : '',
      actor_name: `${log.actor_first_name || ''} ${log.actor_last_name || ''}`.trim(),
      actor_email: log.actor_email || '',
      actor_role: log.actor_role || '',
      action: log.action || '',
      entity_type: log.entity_type || '',
      entity_id: log.entity_id || '',
      details: JSON.stringify(log.details || {}),
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activity-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportActivityLogsXlsx = () => {
    if (!filteredActivityLogs.length) {
      return;
    }

    const rows = filteredActivityLogs.map((log) => ({
      เวลา: log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '',
      ผู้ดำเนินการ: `${log.actor_first_name || ''} ${log.actor_last_name || ''}`.trim(),
      อีเมล: log.actor_email || '',
      บทบาท: log.actor_role || '',
      การกระทำ: log.action || '',
      ประเภทข้อมูล: log.entity_type || '',
      รหัสรายการ: log.entity_id || '',
      รายละเอียด: JSON.stringify(log.details || {}),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'activity_logs');
    XLSX.writeFile(wb, 'activity-logs.xlsx');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const EditUserModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">✏️ แก้ไขข้อมูลผู้ใช้งาน</h2>
          <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input
                value={editForm.first_name}
                onChange={(e) => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="ชื่อ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
              <input
                value={editForm.last_name}
                onChange={(e) => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="นามสกุล"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              value={editForm.phone_number}
              onChange={(e) => setEditForm(p => ({ ...p, phone_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0812345678"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setEditingUser(null)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex-1 px-4 py-2 bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              {savingEdit && <Loader2 size={14} className="animate-spin" />}
              {savingEdit ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ClearLogsConfirmDialog = () => {
    const option = getClearLogsOption(clearLogsDialogTarget);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-red-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ยืนยันการล้างข้อมูล log</h2>
              <p className="mt-1 text-sm text-gray-500">การดำเนินการนี้ไม่สามารถกู้คืนได้</p>
            </div>
            <button
              type="button"
              onClick={closeClearLogsDialog}
              disabled={clearingLogs}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
              <p className="text-sm font-semibold text-red-800">{option.title}</p>
              <p className="mt-1 text-sm text-red-700">{option.detail}</p>
            </div>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              หลังยืนยัน ระบบจะลบข้อมูลที่เลือกทันที และไม่สามารถย้อนคืนได้
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
            <button
              type="button"
              onClick={closeClearLogsDialog}
              disabled={clearingLogs}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleClearLogs(clearLogsDialogTarget)}
              disabled={clearingLogs}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {clearingLogs && <Loader2 size={14} className="animate-spin" />}
              {clearingLogs ? 'กำลังล้าง...' : 'ยืนยันการล้าง'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteUserConfirmDialog = () => {
    if (!deleteUserDialog) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-red-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ยืนยันการลบบัญชีผู้ใช้งาน</h2>
              <p className="mt-1 text-sm text-gray-500">การดำเนินการนี้ไม่สามารถกู้คืนได้</p>
            </div>
            <button
              type="button"
              onClick={closeDeleteUserDialog}
              disabled={Boolean(deletingId)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
              <p className="text-sm font-semibold text-red-800">
                {deleteUserDialog.first_name || ''} {deleteUserDialog.last_name || ''}
              </p>
              <p className="mt-1 text-sm text-red-700">{deleteUserDialog.email || deleteUserDialog.phone_number || '-'}</p>
              <p className="mt-3 text-sm text-red-700">บัญชีนี้จะถูกลบออกจากระบบทันที</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
            <button
              type="button"
              onClick={closeDeleteUserDialog}
              disabled={Boolean(deletingId)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleDeleteUser(deleteUserDialog)}
              disabled={Boolean(deletingId)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {Boolean(deletingId) && <Loader2 size={14} className="animate-spin" />}
              {Boolean(deletingId) ? 'กำลังลบ...' : 'ยืนยันการลบ'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ToastNotice = () => {
    if (!toast) {
      return null;
    }

    return (
      <div className="fixed right-4 top-4 z-[60] w-full max-w-sm rounded-2xl border bg-white shadow-2xl">
        <div className={`flex items-start gap-3 rounded-2xl px-4 py-4 ${toast.type === 'success' ? 'border border-emerald-200 bg-emerald-50' : 'border border-red-200 bg-red-50'}`}>
          <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${toast.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
              {toast.title}
            </p>
            <p className={`mt-1 text-sm ${toast.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/70 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-4 rounded">
          สิทธิ์ไม่พอสำหรับหน้านี้ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่อีกครั้งเพื่อรับสิทธิ์ล่าสุดของบัญชี `super_admin`
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editingUser && <EditUserModal />}
      {clearLogsDialogTarget && <ClearLogsConfirmDialog />}
      {deleteUserDialog && <DeleteUserConfirmDialog />}
      {toast && <ToastNotice />}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <span className="text-gray-600">จำนวนผู้ใช้งาน: {users.length}</span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">นโยบายการแก้ไขข้อมูลผู้ใช้งานทั่วไป</h2>
            <p className="text-sm text-slate-600">กำหนดให้บทบาทผู้ใช้ทั่วไป (user) แก้ไขข้อมูลโปรไฟล์ได้หรือไม่</p>
          </div>

          <button
            type="button"
            onClick={handleToggleUserProfileEdit}
            disabled={updatingPermission}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              allowUserProfileEdit
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {updatingPermission
              ? 'กำลังบันทึก...'
              : allowUserProfileEdit
                ? 'เปิดสิทธิ์แก้ไข (คลิกเพื่อปิด)'
                : 'ปิดสิทธิ์แก้ไข (คลิกเพื่อเปิด)'}
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          สถานะปัจจุบัน:{' '}
          <span className={`font-semibold ${allowUserProfileEdit ? 'text-emerald-700' : 'text-amber-700'}`}>
            {allowUserProfileEdit ? 'ผู้ใช้ทั่วไปแก้ไขโปรไฟล์ได้' : 'ผู้ใช้ทั่วไปเป็นโหมดดูอย่างเดียว (ค้นหา/ดูข้อมูล)'}
          </span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">ไม่มีผู้ใช้งาน</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">ชื่อ</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">อีเมล</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">เบอร์โทรศัพท์</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">บทบาท</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">สถานะ</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">PDPA</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.email}</td>
                    <td className="px-6 py-4 text-gray-700">{user.phone_number || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'super_admin'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.role === 'editor' || user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'super_admin' ? 'ผู้ดูแลสูงสุด' : user.role === 'editor' || user.role === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้'}
                        </span>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                          disabled={updatingId === user.id || user.id === currentUser?.id}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                          title={user.id === currentUser?.id ? 'ไม่สามารถปรับบทบาทบัญชีตัวเองในหน้านี้' : 'กำหนดบทบาทผู้ใช้งาน'}
                        >
                          <option value="user">ผู้ใช้</option>
                          <option value="editor">ผู้ดูแล</option>
                          <option value="admin">ผู้ดูแล (legacy)</option>
                          <option value="super_admin">ผู้ดูแลสูงสุด</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.status === 'approved' && 'อนุมัติ'}
                        {user.status === 'pending' && 'รอการอนุมัติ'}
                        {user.status === 'rejected' && 'ปฏิเสธ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      <div className="space-y-1">
                        <div>
                          {user.pdpa_consent ? 'ยินยอมแล้ว' : 'ยังไม่ยินยอม'}
                        </div>
                        <div className="text-gray-500">{user.pdpa_version || '-'}</div>
                        <div className="text-gray-500">
                          {user.pdpa_consent_at ? new Date(user.pdpa_consent_at).toLocaleString('th-TH') : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleStatusUpdate(user.id, 'approved')}
                          disabled={updatingId === user.id || user.status === 'approved'}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                          title="อนุมัติ"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(user.id, 'rejected')}
                          disabled={updatingId === user.id || user.status === 'rejected'}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          title="ปฏิเสธ"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={updatingId === user.id || deletingId === user.id}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          title="แก้ไขข้อมูล"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteUserDialog(user)}
                          disabled={deletingId === user.id || user.id === currentUser?.id}
                          className="px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors"
                          title={user.id === currentUser?.id ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบบัญชี'}
                        >
                          {deletingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={usersPage}
            totalPages={userTotalPages}
            totalItems={users.length}
            pageSize={USERS_PAGE_SIZE}
            onPageChange={(page) => setUsersPage(Math.min(userTotalPages, Math.max(1, page)))}
          />
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${sessions.filter(s => s.is_online).length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                ผู้ที่กำลังใช้งาน / Session ล่าสุด
                {sessions.filter(s => s.is_online).length > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    {sessions.filter(s => s.is_online).length} ออนไลน์
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">แสดงผู้ใช้ที่เข้าสู่ระบบล่าสุดในช่วง 30 วัน พร้อมข้อมูลอุปกรณ์, IP และวิธีเข้าสู่ระบบ</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / อีเมล / IP"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-56"
              />
              <button
                onClick={fetchSessions}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                รีเฟรช
              </button>
            </div>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="p-6 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">ไม่พบข้อมูล Session ในช่วง 30 วันที่ผ่านมา</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedSessions.map((s) => {
              const ua = parseUA(s.user_agent);
              return (
                <div key={s.user_id} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-[220px] flex-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.is_online ? 'bg-green-500 ring-2 ring-green-200' : 'bg-gray-300'}`}
                      title={s.is_online ? 'ออนไลน์ (เข้าใช้ภายใน 30 นาที)' : 'ออฟไลน์'}
                    />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.first_name || ''} {s.last_name || ''}</p>
                      <p className="text-xs text-gray-500">{s.email || s.phone_number || '-'}</p>
                      <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        s.role === 'super_admin' ? 'bg-yellow-100 text-yellow-800' :
                        s.role === 'admin' || s.role === 'editor' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{s.role}</span>
                    </div>
                  </div>
                  <div className="min-w-[180px] text-sm text-gray-700">
                    <p className="flex items-center gap-1.5 font-mono text-xs">
                      <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      {s.ip_address || '-'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{ua.device} • {ua.browser} / {ua.os}</p>
                  </div>
                  <div className="text-sm text-right min-w-[160px]">
                    <p className="text-gray-700 text-xs">{s.last_login_at ? new Date(s.last_login_at).toLocaleString('th-TH') : '-'}</p>
                    <p className={`mt-0.5 text-xs font-medium ${s.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                      {relativeTime(s.last_login_at)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.details?.method === 'otp' ? '🔐 เข้าด้วย OTP' : '🔑 เข้าด้วยรหัสผ่าน'}
                    </p>
                  </div>
                </div>
              );
            })}
            <PaginationControls
              page={sessionsPage}
              totalPages={sessionTotalPages}
              totalItems={filteredSessions.length}
              pageSize={SESSIONS_PAGE_SIZE}
              onPageChange={(page) => setSessionsPage(Math.min(sessionTotalPages, Math.max(1, page)))}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ประวัติการยินยอม PDPA</h2>
              <p className="text-sm text-gray-500">แสดงล่าสุด 200 รายการ</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportPdpaLogsCsv}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportPdpaLogsXlsx}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
              >
                Export XLSX
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรืออีเมล"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทุกสถานะ</option>
              <option value="consent">ยินยอม</option>
              <option value="revoke">ถอนความยินยอม</option>
            </select>
            <select
              value={logVersionFilter}
              onChange={(e) => setLogVersionFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทุกเวอร์ชัน</option>
              {availableVersions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
            <input
              type="date"
              value={logDateFrom}
              onChange={(e) => setLogDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={logDateTo}
              onChange={(e) => setLogDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {filteredConsentLogs.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">ยังไม่มีบันทึกการยินยอม</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">ผู้ใช้</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">อีเมล</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">สถานะ</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">เวอร์ชัน</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">{log.first_name || '-'} {log.last_name || ''}</td>
                      <td className="px-6 py-4 text-gray-700">{log.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.consent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                          {log.consent ? 'ยินยอม' : 'ไม่ยินยอม'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{log.pdpa_version || '-'}</td>
                      <td className="px-6 py-4 text-gray-700">{log.consent_at ? new Date(log.consent_at).toLocaleString('th-TH') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={consentPage}
              totalPages={consentTotalPages}
              totalItems={filteredConsentLogs.length}
              pageSize={PDPA_PAGE_SIZE}
              onPageChange={(page) => setConsentPage(Math.min(consentTotalPages, Math.max(1, page)))}
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activity Log (Audit Trail)</h2>
              <p className="text-sm text-gray-500">บันทึกประวัติการแก้ไขข้อมูลว่าใครทำอะไรเมื่อใด แสดงล่าสุด 500 รายการ</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div ref={clearLogsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setClearLogsMenuOpen((current) => !current)}
                  disabled={clearingLogs}
                  className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {clearingLogs ? 'กำลังล้าง...' : 'เมนูล้าง log'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${clearLogsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {clearLogsMenuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-red-100 bg-white shadow-lg">
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                      เลือกรายการที่ต้องการล้าง
                    </div>
                    <div className="p-2">
                      {[
                        { value: 'all', label: 'ล้าง log ทั้งหมด', detail: 'ล้าง Activity Log และ PDPA Log' },
                        { value: 'activity', label: 'ล้างเฉพาะ Activity Log', detail: 'ล้างประวัติการใช้งานทั้งหมด' },
                        { value: 'pdpa', label: 'ล้างเฉพาะ PDPA Log', detail: 'ล้างประวัติการยินยอม PDPA ทั้งหมด' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            openClearLogsDialog(option.value);
                          }}
                          className={`w-full rounded-lg px-3 py-3 text-left hover:bg-red-50 ${clearLogsTarget === option.value ? 'bg-red-50' : ''}`}
                        >
                          <div className="text-sm font-medium text-gray-900">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.detail}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fetchActivityLogs()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                รีเฟรช
              </button>
              <button
                type="button"
                onClick={exportActivityLogsCsv}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportActivityLogsXlsx}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
              >
                Export XLSX
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <input
              type="text"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="ค้นหาชื่อหรืออีเมล"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={activityActionFilter}
              onChange={(e) => setActivityActionFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทุกการกระทำ</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
            <select
              value={activityEntityFilter}
              onChange={(e) => setActivityEntityFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทุกประเภทข้อมูล</option>
              {availableActivityEntities.map((entity) => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
            <input
              type="text"
              value={activityIpFilter}
              onChange={(e) => setActivityIpFilter(e.target.value)}
              placeholder="กรองตาม IP"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
            <input
              type="date"
              value={activityDateFrom}
              onChange={(e) => setActivityDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={activityDateTo}
              onChange={(e) => setActivityDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {filteredActivityLogs.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">ยังไม่มีบันทึกกิจกรรม</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">เวลา</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">ผู้ดำเนินการ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">การกระทำ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">รายการ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">IP / อุปกรณ์</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivityLogs.map((log) => {
                    const ua = parseUA(log.user_agent);
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-700 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{relativeTime(log.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-xs">{log.actor_first_name || '-'} {log.actor_last_name || ''}</div>
                          <div className="text-xs text-gray-500">{log.actor_email || '-'}</div>
                          <div className="text-xs text-gray-400">({log.actor_role || '-'})</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            log.action === 'LOGIN' ? 'bg-teal-100 text-teal-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">
                          <p>{log.entity_type || '-'}</p>
                          {log.entity_id && <p className="font-mono text-gray-400">{String(log.entity_id).slice(0, 12)}{String(log.entity_id).length > 12 ? '…' : ''}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-gray-700">{log.ip_address || '-'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ua.device} {ua.browser}</p>
                        </td>
                        <td className="px-4 py-3">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <div>
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                {isExpanded ? 'ซ่อน' : 'แสดง'}
                              </button>
                              {isExpanded && (
                                <pre className="mt-1 max-w-[280px] whitespace-pre-wrap break-words rounded bg-gray-50 p-2 text-xs text-gray-600 border border-gray-200">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={activityPage}
              totalPages={activityTotalPages}
              totalItems={filteredActivityLogs.length}
              pageSize={ACTIVITY_PAGE_SIZE}
              onPageChange={(page) => setActivityPage(Math.min(activityTotalPages, Math.max(1, page)))}
            />
          </>
        )}
      </div>
    </div>
  );
}
