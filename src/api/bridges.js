import api from './axios';

/**
 * `config` is forwarded to axios so callers can pass an AbortSignal —
 * usePaginatedQuery relies on this to cancel superseded requests.
 */
export const bridgesAPI = {
  // Paginated: params { page, limit, search, condition, dateFilter, sortBy, sortDir }
  // Responds { rows, total, page, limit, pages }
  getAll:       (params, config)   => api.get('/bridges', { params, ...config }),
  // Slim payload for the GIS viewport — coordinates + condition only
  getPositions: (config)           => api.get('/bridges/positions', config),
  // id + label only, for form pickers
  getOptions:   (config)           => api.get('/bridges/options', config),
  getById:      (id, config)       => api.get(`/bridges/${id}`, config),
  create:       (data)             => api.post('/bridges', data),
  update:       (id, data)         => api.put(`/bridges/${id}`, data),
  delete:       (id)               => api.delete(`/bridges/${id}`),
  getDashboard: (config)           => api.get('/dashboard', config),
  getHistory:   (id, config)       => api.get(`/bridges/${id}/history`, config),
};

export const inspectionsAPI = {
  getAll:  (params, config)  => api.get('/inspections', { params, ...config }),
  getById: (id, config)      => api.get(`/inspections/${id}`, config),
  create:  (data)            => api.post('/inspections', data),
  update:  (id, data)        => api.put(`/inspections/${id}`, data),
  // 200 approved · 409 already signed off · 403 self-approval · 422 no defect
  resolve: (id, resolvedBy)  => api.patch(`/inspections/${id}/resolve`, { resolvedBy }),
  delete:  (id)              => api.delete(`/inspections/${id}`),
};

export const photosAPI = {
  upload: (formData) => api.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/photos/${id}`),
};

export const historyAPI = {
  // Paginated: params { page, limit, actionType, bridgeId, userId }
  getAll:     (params, config) => api.get('/history', { params, ...config }),
  getActions: (config)         => api.get('/history/actions', config),
};
