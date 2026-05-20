import api from './axios';

export const bridgesAPI = {
  getAll:       (params) => api.get('/bridges', { params }),
  getById:      (id)     => api.get(`/bridges/${id}`),
  create:       (data)   => api.post('/bridges', data),
  update:       (id, data) => api.put(`/bridges/${id}`, data),
  delete:       (id)     => api.delete(`/bridges/${id}`),
  getDashboard: ()       => api.get('/dashboard'),
  getHistory:   (id)     => api.get(`/bridges/${id}/history`),
};

export const inspectionsAPI = {
  getAll:  (params)      => api.get('/inspections', { params }),
  getById: (id)          => api.get(`/inspections/${id}`),
  create:  (data)        => api.post('/inspections', data),
  update:  (id, data)    => api.put(`/inspections/${id}`, data),
  resolve: (id, resolvedBy) => api.patch(`/inspections/${id}/resolve`, { resolvedBy }),
  delete:  (id)          => api.delete(`/inspections/${id}`),
};

export const photosAPI = {
  upload: (formData) => api.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/photos/${id}`),
};
