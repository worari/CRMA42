'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import {
  Wallet, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Trash2, X, ChevronDown, ChevronUp,
  AlertCircle, Loader2, Receipt, DollarSign, Filter,
  Upload, Eye, EyeOff
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'ปฏิเสธ',    color: 'bg-red-100 text-red-600',     icon: XCircle },
};

const PAYMENT_METHODS = ['โอนเงิน', 'เช็ค', 'พร้อมเพย์', 'เงินสด'];
const EXPENSE_CATEGORIES = ['งานกิจกรรม', 'สวัสดิการสมาชิก', 'อุปกรณ์/เอกสาร', 'ประชาสัมพันธ์', 'อื่นๆ'];

// ────────────── Contribute Modal ──────────────
function ContributeModal({ alumni, purposes, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    alumni_name: alumni ? `${alumni.rank || ''} ${alumni.first_name || ''} ${alumni.last_name || ''}`.trim() : '',
    alumni_id: alumni?.id || '',
    amount: '',
    purpose: purposes[0]?.name || 'กองทุนทั่วไป',
    payment_method: 'โอนเงิน',
    note: '',
    slip_image: ''
  });
  const [showSlipPreview, setShowSlipPreview] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSlipUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, slip_image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.alumni_name || !form.amount || parseFloat(form.amount) <= 0) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">💰 สมทบกองทุนรุ่น</h2>
            <p className="text-sm text-gray-500 mt-0.5">บันทึกการสมทบเพื่อรออนุมัติ</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อผู้สมทบ <span className="text-red-500">*</span>
            </label>
            <input
              name="alumni_name" value={form.alumni_name} onChange={handleChange}
              placeholder="ยศ ชื่อ นามสกุล"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                จำนวนเงิน (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" name="amount" value={form.amount} onChange={handleChange}
                placeholder="0.00" min="1" step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วิธีชำระ</label>
              <select
                name="payment_method" value={form.payment_method} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วัตถุประสงค์</label>
            <select
              name="purpose" value={form.purpose} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            >
              {purposes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              name="note" value={form.note} onChange={handleChange}
              placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สลิปการโอนเงิน</label>
            <input
              type="file" accept="image/*" onChange={handleSlipUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {form.slip_image && (
              <button
                type="button"
                onClick={() => setShowSlipPreview(!showSlipPreview)}
                className="mt-2 text-xs text-[#0d3b66] flex items-center gap-1"
              >
                {showSlipPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                {showSlipPreview ? 'ซ่อนสลิป' : 'ดูสลิป'}
              </button>
            )}
            {showSlipPreview && form.slip_image && (
              <img src={form.slip_image} alt="Slip" className="mt-2 rounded-xl border border-gray-200 max-h-48 object-contain w-full" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#0d3b66] hover:bg-[#0a2f52] disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'กำลังบันทึก...' : 'บันทึกการสมทบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({ onClose, onSave, loading }) {
  const [form, setForm] = useState({
    amount: '',
    purpose: 'รายจ่ายกองทุน',
    expense_category: EXPENSE_CATEGORIES[0],
    payment_method: 'จ่ายออก',
    note: '',
    contribution_date: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">💸 บันทึกรายจ่ายกองทุน</h2>
            <p className="text-sm text-gray-500 mt-0.5">บันทึกการใช้เงินกองทุนสำหรับการตรวจสอบย้อนหลัง</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท) <span className="text-red-500">*</span></label>
              <input
                type="number" name="amount" value={form.amount} onChange={handleChange}
                min="1" step="0.01" placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ใช้เงิน</label>
              <input
                type="date" name="contribution_date" value={form.contribution_date} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดรายจ่าย</label>
            <select
              name="expense_category" value={form.expense_category} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วัตถุประสงค์</label>
            <input
              name="purpose" value={form.purpose} onChange={handleChange}
              placeholder="รายละเอียดวัตถุประสงค์การใช้เงิน"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              name="note" value={form.note} onChange={handleChange}
              rows={3} placeholder="บันทึกรายละเอียดเพิ่มเติม"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'กำลังบันทึก...' : 'บันทึกรายจ่าย'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────── Contribution Row ──────────────
function ContributionRow({ contribution, canManage, onApprove, onReject, onDelete }) {
  const cfg = STATUS_CONFIG[contribution.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const [showSlip, setShowSlip] = useState(false);
  const transactionType = contribution.transaction_type === 'expense' ? 'expense' : 'income';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-semibold text-gray-800 text-sm truncate">
            {contribution.alumni_first
              ? `${contribution.rank || ''} ${contribution.alumni_first} ${contribution.alumni_last}`.trim()
              : contribution.alumni_name}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon size={11} />
            {cfg.label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            transactionType === 'expense' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {transactionType === 'expense' ? 'รายจ่าย' : 'รายรับ'}
          </span>
          {transactionType === 'expense' && contribution.expense_category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {contribution.expense_category}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>📌 {contribution.purpose || 'กองทุนทั่วไป'}</span>
          <span>💳 {contribution.payment_method}</span>
          <span>📅 {new Date(contribution.contribution_date).toLocaleDateString('th-TH')}</span>
        </div>
        {contribution.note && <p className="text-xs text-gray-400 mt-1 italic">{contribution.note}</p>}
        {contribution.slip_image && (
          <button onClick={() => setShowSlip(!showSlip)} className="text-xs text-blue-500 mt-1 flex items-center gap-1">
            <Eye size={11} /> {showSlip ? 'ซ่อนสลิป' : 'ดูสลิป'}
          </button>
        )}
        {showSlip && contribution.slip_image && (
          <img src={contribution.slip_image} alt="Slip" className="mt-2 rounded-lg border border-gray-200 max-h-40 object-contain" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <p className={`text-lg font-bold whitespace-nowrap ${
          contribution.status === 'approved'
            ? transactionType === 'expense' ? 'text-red-600' : 'text-green-600'
            : contribution.status === 'rejected' ? 'text-slate-500' : 'text-yellow-600'
        }`}>
          {transactionType === 'expense' ? '-' : '+'}฿{parseFloat(contribution.amount).toLocaleString()}
        </p>

        {canManage && contribution.status === 'pending' && (
          <div className="flex gap-1">
            <button onClick={() => onApprove(contribution.id)}
              className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="อนุมัติ">
              <CheckCircle size={16} />
            </button>
            <button onClick={() => onReject(contribution.id)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="ปฏิเสธ">
              <XCircle size={16} />
            </button>
          </div>
        )}

        {canManage && typeof onDelete === 'function' && (
          <button onClick={() => onDelete(contribution.id)}
            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="ลบ">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────── Main Page ──────────────
export default function FundPage() {
  const [data, setData] = useState({
    total_approved: 0,
    total_income_approved: 0,
    total_expense_approved: 0,
    total_balance: 0,
    total_pending: 0,
    contributions: [],
    purposes: [],
    monthly_summary: [],
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingContrib, setSavingContrib] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState(null);

  const user = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);
  const isEditorOrAdmin = user?.role === 'editor' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const getToken = () => {
    if (authToken) return authToken;
    try {
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      return stored?.state?.token || stored?.token || null;
    } catch { return null; }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setData({
          total_approved: 0,
          total_income_approved: 0,
          total_expense_approved: 0,
          total_balance: 0,
          total_pending: 0,
          contributions: [],
          purposes: [],
          monthly_summary: [],
        });
        return;
      }

      const res = await fetch('/api/fund', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleContribute = async (form) => {
    setSavingContrib(true);
    try {
      const token = getToken();
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (res.ok) {
        showToast(result.message || 'บันทึกสำเร็จ');
        setShowModal(false);
        setFilterStatus('all');
        fetchData();
      } else {
        showToast(result.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch (e) { showToast('เกิดข้อผิดพลาด', 'error'); }
    finally { setSavingContrib(false); }
  };

  const handleApprove = async (id) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/fund/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'approve' })
      });
      if (res.ok) { showToast('อนุมัติสำเร็จ'); fetchData(); }
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  const handleExpense = async (form) => {
    setSavingExpense(true);
    try {
      const token = getToken();
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, transaction_type: 'expense' })
      });
      const result = await res.json();
      if (res.ok) {
        showToast(result.message || 'บันทึกรายจ่ายสำเร็จ');
        setShowExpenseModal(false);
        setFilterType('expense');
        fetchData();
      } else {
        showToast(result.message || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleReject = async (id) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/fund/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'reject' })
      });
      if (res.ok) { showToast('ปฏิเสธสำเร็จ'); fetchData(); }
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/fund/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { showToast('ลบสำเร็จ'); fetchData(); }
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  // Filtered contributions
  const filtered = data.contributions.filter(c => {
    const statusPass = filterStatus === 'all' || c.status === filterStatus;
    const type = c.transaction_type === 'expense' ? 'expense' : 'income';
    const typePass = filterType === 'all' || filterType === type;
    const monthKey = c.contribution_date ? new Date(c.contribution_date).toISOString().slice(0, 7) : '';
    const monthPass = filterMonth === 'all' || monthKey === filterMonth;
    const query = searchText.trim().toLowerCase();
    const searchable = `${c.alumni_name || ''} ${c.purpose || ''} ${c.note || ''} ${c.payment_method || ''} ${c.expense_category || ''}`.toLowerCase();
    const searchPass = !query || searchable.includes(query);
    return statusPass && typePass && monthPass && searchPass;
  });
  const pendingCount = data.contributions.filter(c => c.status === 'pending').length;
  const monthOptions = [...new Set(data.contributions
    .map(c => c.contribution_date ? new Date(c.contribution_date).toISOString().slice(0, 7) : '')
    .filter(Boolean))].sort((a, b) => b.localeCompare(a));

  // Summary by purpose
  const byPurpose = data.contributions
    .filter(c => c.status === 'approved' && (c.transaction_type || 'income') === 'income')
    .reduce((acc, c) => {
      const key = c.purpose || 'กองทุนทั่วไป';
      acc[key] = (acc[key] || 0) + parseFloat(c.amount);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
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
            <h1 className="text-2xl font-bold text-slate-900">กองทุนรุ่น</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {pendingCount > 0 && isEditorOrAdmin
                ? `⚠️ มี ${pendingCount} รายการรออนุมัติ`
                : 'บริหารกองทุนรุ่น CRMA42'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0d3b66] hover:bg-[#0a2f52] text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
            >
              <Plus size={18} />
              สมทบกองทุน
            </button>
            {isEditorOrAdmin && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
              >
                <DollarSign size={18} />
                บันทึกรายจ่าย
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[#0d3b66]" size={36} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#0d3b66] to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <span className="text-green-100 text-sm font-medium">คงเหลือสุทธิ</span>
              </div>
              <p className="text-3xl font-bold">
                ฿{(data.total_balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-green-200 text-xs mt-1">
                รายรับ {(data.total_income_approved || 0).toLocaleString()} - รายจ่าย {(data.total_expense_approved || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-emerald-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">รายรับอนุมัติแล้ว</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                ฿{(data.total_income_approved || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} className="text-red-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">รายจ่ายอนุมัติแล้ว</span>
              </div>
              <p className="text-3xl font-bold text-red-600">
                ฿{(data.total_expense_approved || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-yellow-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium">รออนุมัติ</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                ฿{data.total_pending.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-gray-400 text-xs mt-1">{pendingCount} รายการ</p>
            </div>
          </div>

          {data.monthly_summary?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 สรุปรายเดือน (ปีปัจจุบัน)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {data.monthly_summary.slice(0, 4).map((item) => (
                  <div key={item.month} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 mb-1">{item.month}</p>
                    <p className="text-sm text-emerald-700 font-semibold">+฿{Number(item.income || 0).toLocaleString()}</p>
                    <p className="text-sm text-red-700 font-semibold">-฿{Number(item.expense || 0).toLocaleString()}</p>
                    <p className="text-sm text-[#0d3b66] font-bold mt-1">คงเหลือ ฿{(Number(item.income || 0) - Number(item.expense || 0)).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Purpose */}
          {Object.keys(byPurpose).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">💡 จำแนกตามวัตถุประสงค์</h3>
              <div className="space-y-3">
                {Object.entries(byPurpose).map(([purpose, amount]) => {
                  const pct = data.total_approved > 0 ? (amount / data.total_approved) * 100 : 0;
                  return (
                    <div key={purpose}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{purpose}</span>
                        <span className="font-semibold text-emerald-700">฿{amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0d3b66] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contributions List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">ประวัติการสมทบ</h3>
              <div className="flex flex-wrap gap-2 justify-end">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="ค้นหา ชื่อ/วัตถุประสงค์/หมายเหตุ"
                  className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 w-52"
                />
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-slate-300"
                >
                  <option value="all">ทุกเดือน</option>
                  {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-slate-300"
                >
                  <option value="all">ทุกประเภท</option>
                  <option value="income">รายรับ</option>
                  <option value="expense">รายจ่าย</option>
                </select>
                {['all', 'pending', 'approved', 'rejected'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterStatus === s
                        ? 'bg-[#0d3b66] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'ทั้งหมด' : STATUS_CONFIG[s]?.label}
                    {s === 'pending' && pendingCount > 0 && (
                      <span className="ml-1 bg-yellow-500 text-white rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                  <p>ไม่มีรายการตามเงื่อนไขที่ค้นหา</p>
                </div>
              ) : (
                filtered.map(c => (
                  <ContributionRow
                    key={c.id}
                    contribution={c}
                    canManage={isEditorOrAdmin}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={isSuperAdmin ? handleDelete : null}
                  />
                ))
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <p className="text-green-800 text-sm font-medium mb-2">💡 เกี่ยวกับกองทุนรุ่น</p>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• กองทุนใช้สำหรับสนับสนุนกิจกรรมต่างๆ ของรุ่น</li>
              <li>• ทุกรายการจะอยู่ในสถานะ "รออนุมัติ" จนกว่า Admin จะตรวจสอบ</li>
              <li>• กรุณาแนบสลิปการโอนเงินทุกครั้ง</li>
            </ul>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ContributeModal
          alumni={null}
          purposes={data.purposes}
          onClose={() => setShowModal(false)}
          onSave={handleContribute}
          loading={savingContrib}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSave={handleExpense}
          loading={savingExpense}
        />
      )}
    </div>
  );
}