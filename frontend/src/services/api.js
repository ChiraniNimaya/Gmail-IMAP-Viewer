import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: () => {
    window.location.href = `${API_URL}/auth/google`;
  },
  
  getCurrentUser: () => api.get('/auth/me'),
  
  checkAuth: () => api.get('/auth/check'),
  
  logout: () => api.post('/auth/logout'),
  
  updatePreferences: (preferences) => 
    api.put('/auth/preferences', { preferences })
};

// Email API
export const emailAPI = {
  syncEmails: (params = {}) => 
    api.get('/api/emails/sync', { params }),
  
  getEmails: (params = {}) => 
    api.get('/api/emails', { params }),
  
  getEmailById: (id) => 
    api.get(`/api/emails/${id}`),
  
  searchEmails: (params) => 
    api.get('/api/emails/search', { params }),
  
  toggleReadStatus: (id, isRead) => 
    api.patch(`/api/emails/${id}/read`, { isRead }),
  
  deleteEmail: (id) => 
    api.delete(`/api/emails/${id}`),
  
};

export default api;