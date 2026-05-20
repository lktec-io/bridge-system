import api from './axios';

export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  register:       (data) => api.post('/auth/register', data),
  getProfile:     ()     => api.get('/auth/me'),
  getAllUsers:     ()     => api.get('/users/'),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  deleteUser:     (id)   => api.delete(`/users/${id}`),
};
