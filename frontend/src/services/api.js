import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const message =
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'Request timed out.' : error.message) ||
      'Unexpected error.';
    return Promise.reject(new Error(message));
  }
);

export const analysisApi = {
  submit: (repoUrl) => api.post('/analysis', { repoUrl }).then(r => r.data),
  getStatus: (id) => api.get(`/analysis/${id}`).then(r => r.data),
  list: (page = 1, limit = 10) =>
    api.get('/analysis', { params: { page, limit } }).then(r => r.data),
  delete: (id) => api.delete(`/analysis/${id}`).then(r => r.data),
};

export const reportApi = {
  getSummary: (id) => api.get(`/reports/${id}/summary`).then(r => r.data),
  getIssues: (id, filters) => api.get(`/reports/${id}/issues`, { params: filters }).then(r => r.data),
  getFiles: (id) => api.get(`/reports/${id}/files`).then(r => r.data),
  getRcdi: (id) => api.get(`/reports/${id}/rcdi`).then(r => r.data),      // NEW
  getRps: (id) => api.get(`/reports/${id}/rps`).then(r => r.data),       // NEW
  getComparison: (id) => api.get(`/reports/${id}/comparison`).then(r => r.data),
};

export default api;

// Appended: commit history endpoints
export const historyApi = {
  get: (id) => api.get(`/reports/${id}/history`).then(r => r.data),
  build: (id, maxPoints = 20, fromDate = null, toDate = null) => api.post(`/reports/${id}/history/build`, { maxPoints, fromDate, toDate }).then(r => r.data),
};
