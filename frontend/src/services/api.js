import axios from 'axios';

const api = axios.create({
  baseURL: '/api' // Using Vite proxy to localhost:3000/api
});

export default {
  getAlumni(search = '', affiliation = '') {
    return api.get('/alumni', { params: { name: search, affiliation } });
  },
  getAlumniById(id) {
    return api.get(`/alumni/${id}`);
  },
  createAlumni(data) {
    return api.post('/alumni', data);
  },
  updateAlumni(id, data) {
    return api.put(`/alumni/${id}`, data);
  },
  deleteAlumni(id) {
    return api.delete(`/alumni/${id}`);
  },
  getDictionary(type) {
    return api.get(`/alumni/dictionary/${type}`);
  },
  getDashboardStats() {
    return api.get('/dashboard/stats');
  },
  getMapDistribution() {
    return api.get('/dashboard/map');
  }
};
