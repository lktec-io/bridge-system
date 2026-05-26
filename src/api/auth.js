import api from './axios';

export const authAPI = {
  login:             (data)       => api.post('/auth/login', data),
  register:          (data)       => api.post('/auth/register', data),
  getProfile:        ()           => api.get('/auth/me'),
  getAllUsers:        ()           => api.get('/users/'),
  createUser:        (data)       => api.post('/users/', data),
  updateUser:        (id, data)   => api.put(`/users/${id}`, data),
  changePassword:    (id, data)   => api.put(`/users/${id}/password`, data),
  updateUserRole:    (id, role)   => api.put(`/users/${id}/role`, { role }),
  deleteUser:        (id)         => api.delete(`/users/${id}`),
};
