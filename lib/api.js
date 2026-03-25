import axios from 'axios';
import { getStoredAuth } from '@/lib/store';

const apiClient = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
});

// Interceptor to add token to requests
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const storedAuth = getStoredAuth();
      if (storedAuth?.token) {
        config.headers.Authorization = `Bearer ${storedAuth.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const alumniAPI = {
  getAll: (search = '', affiliation = '') =>
    apiClient.get('/api/alumni', { params: { name: search, affiliation } }),
  getById: (id) =>
    apiClient.get(`/api/alumni/${id}`),
  create: (data) =>
    apiClient.post('/api/alumni', data),
  update: (id, data) =>
    apiClient.put(`/api/alumni/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/api/alumni/${id}`),
  getDictionary: (type) =>
    apiClient.get(`/api/alumni/dictionary/${type}`),
};

export const authAPI = {
  register: (data) =>
    apiClient.post('/api/auth/register', data),
  login: (email, password) =>
    apiClient.post('/api/auth/login', { email, password }),
  requestOtp: (phone_number) =>
    apiClient.post('/api/auth/otp/request', { phone_number }),
  verifyOtp: (challenge_id, phone_number, otp_code) =>
    apiClient.post('/api/auth/otp/verify', { challenge_id, phone_number, otp_code }),
  getOtpAnalytics: (range = '24h', dateFrom = '', dateTo = '') =>
    apiClient.get('/api/auth/otp/analytics', {
      params: {
        range,
        ...(dateFrom ? { from: dateFrom } : {}),
        ...(dateTo ? { to: dateTo } : {}),
      },
    }),
  getUsers: () =>
    apiClient.get('/api/auth/users'),
  getPermissionSettings: () =>
    apiClient.get('/api/auth/settings/permissions'),
  updatePermissionSettings: (permissions) =>
    apiClient.put('/api/auth/settings/permissions', permissions),
  updateUserStatus: (id, status) =>
    apiClient.put(`/api/auth/users/${id}`, { status }),
  updateUserRole: (id, role) =>
    apiClient.put(`/api/auth/users/${id}`, { role }),
  updateUserInfo: (id, data) =>
    apiClient.put(`/api/auth/users/${id}`, data),
  deleteUser: (id) =>
    apiClient.delete(`/api/auth/users/${id}`),
  getSessions: () =>
    apiClient.get('/api/auth/sessions'),
  getActivityLogs: (limit = 200) =>
    apiClient.get('/api/activity', { params: { limit } }),
  clearLogStore: (target = 'all') =>
    apiClient.delete('/api/activity', { params: { target } }),
  getPdpaConsent: () =>
    apiClient.get('/api/auth/pdpa'),
  acceptPdpaConsent: (version = 'v1.0') =>
    apiClient.put('/api/auth/pdpa', { pdpa_consent: true, pdpa_version: version }),
  revokePdpaConsent: () =>
    apiClient.delete('/api/auth/pdpa'),
  getPdpaConsentLogs: () =>
    apiClient.get('/api/auth/pdpa/logs'),
};

export const eventsAPI = {
  getAll: () =>
    apiClient.get('/api/events'),
  getById: (id) =>
    apiClient.get(`/api/events/${id}`),
  create: (data) =>
    apiClient.post('/api/events', data),
  update: (id, data) =>
    apiClient.put(`/api/events/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/api/events/${id}`),
  register: (eventId, alumniId) =>
    apiClient.post(`/api/events/${eventId}/register`, { alumni_id: alumniId }),
  unregister: (eventId, alumniId) =>
    apiClient.delete(`/api/events/${eventId}/register?alumni_id=${alumniId}`),
};

export const fundAPI = {
  getSummary: () =>
    apiClient.get('/api/fund'),
  contribute: (data) =>
    apiClient.post('/api/fund', data),
  approve: (id) =>
    apiClient.put(`/api/fund/${id}`, { action: 'approve' }),
  reject: (id) =>
    apiClient.put(`/api/fund/${id}`, { action: 'reject' }),
  delete: (id) =>
    apiClient.delete(`/api/fund/${id}`),
};

export const messagingAPI = {
  // ส่งข้อความทดสอบหา Admin
  testAdmin: (message) =>
    apiClient.post('/api/messaging/line', { type: 'test_admin', message }),
  // ส่งประกาศทุกคน
  broadcast: (message) =>
    apiClient.post('/api/messaging/line', { type: 'broadcast', message }),
  // ส่งแจ้งเตือนงานรุ่น
  sendEventNotification: (eventId, options = {}) =>
    apiClient.post('/api/messaging/line', {
      type: 'event_notification',
      eventId,
      target: options.target || 'registered',
      message: options.message,
    }),
  // ส่งหาคนเดียว
  sendToUser: (userId, message) =>
    apiClient.post('/api/messaging/line', { type: 'single', userId, message }),
  // Generic
  sendLineMessage: (type, data) =>
    apiClient.post('/api/messaging/line', { type, ...data }),
  sendBirthdayGreetingNow: (payload = {}) =>
    apiClient.post('/api/messaging/line/birthday', payload),
};

export const dashboardAPI = {
  getStats: (month) =>
    apiClient.get('/api/dashboard/stats', { params: month ? { month } : {} }),
  getMapDistribution: () =>
    apiClient.get('/api/dashboard/map'),
};

export default apiClient;
