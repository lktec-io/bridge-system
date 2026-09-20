import api from './axios';

export const maintenanceAPI = {
  getAll:     (params)     => api.get('/maintenance', { params }),
  getSummary: ()           => api.get('/maintenance/summary'),
  getById:    (id)         => api.get(`/maintenance/${id}`),
  create:     (data)       => api.post('/maintenance', data),
  update:     (id, data)   => api.put(`/maintenance/${id}`, data),
  delete:     (id)         => api.delete(`/maintenance/${id}`),
};

export const MAINTENANCE_TYPES = [
  { value: 'ROUTINE',        label: 'Routine' },
  { value: 'PREVENTIVE',     label: 'Preventive' },
  { value: 'EMERGENCY',      label: 'Emergency' },
  { value: 'REHABILITATION', label: 'Rehabilitation' },
];

export const MAINTENANCE_STATUSES = [
  { value: 'PLANNED',     label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'CANCELLED',   label: 'Cancelled' },
];
