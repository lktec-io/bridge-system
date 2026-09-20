import api from './axios';

export const sensorsAPI = {
  getDevices:  (params)          => api.get('/sensors/devices', { params }),
  getSummary:  ()                => api.get('/sensors/summary'),
  getReadings: (id, params)      => api.get(`/sensors/devices/${id}/readings`, { params }),
  createDevice: (data)           => api.post('/sensors/devices', data),
  deleteDevice: (id)             => api.delete(`/sensors/devices/${id}`),
  postReading:  (data)           => api.post('/sensors/readings', data),
};

export const SENSOR_TYPES = [
  { value: 'TILT',         label: 'Tilt',         unit: 'deg'  },
  { value: 'VIBRATION',    label: 'Vibration',    unit: 'mm/s' },
  { value: 'STRAIN',       label: 'Strain',       unit: 'µε'   },
  { value: 'DISPLACEMENT', label: 'Displacement', unit: 'mm'   },
  { value: 'TEMPERATURE',  label: 'Temperature',  unit: '°C'   },
  { value: 'WATER_LEVEL',  label: 'Water level',  unit: 'm'    },
  { value: 'CRACK_WIDTH',  label: 'Crack width',  unit: 'mm'   },
];
