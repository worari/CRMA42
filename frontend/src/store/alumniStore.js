import { defineStore } from 'pinia';
import api from '../services/api';
import { io } from 'socket.io-client';

export const useAlumniStore = defineStore('alumni', {
  state: () => ({
    alumniList: [],
    loading: false,
    socket: null,
  }),
  actions: {
    initSocket() {
      if (this.socket) return;
      this.socket = io('http://localhost:3000');
      
      this.socket.on('ALUMNI_CREATED', (newAlumni) => {
        this.alumniList.unshift(newAlumni);
      });
      
      this.socket.on('ALUMNI_UPDATED', (updatedAlumni) => {
        const index = this.alumniList.findIndex(a => a.id === updatedAlumni.id);
        if (index !== -1) {
          this.alumniList[index] = { ...this.alumniList[index], ...updatedAlumni };
        }
      });
      
      this.socket.on('ALUMNI_DELETED', (deletedId) => {
        this.alumniList = this.alumniList.filter(a => a.id !== deletedId);
      });
    },
    async fetchAlumni(search = '', affiliation = '') {
      this.loading = true;
      try {
        const { data } = await api.getAlumni(search, affiliation);
        this.alumniList = data;
      } catch (error) {
        console.error('Error fetching alumni:', error);
      } finally {
        this.loading = false;
      }
    }
  }
});
