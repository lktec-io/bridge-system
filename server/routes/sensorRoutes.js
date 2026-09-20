import { Router } from 'express';
import {
  getDevices, getSummary, createDevice, deleteDevice, getReadings, postReading,
} from '../controllers/sensorController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/devices',              protect, getDevices);
router.get('/summary',              protect, getSummary);
router.post('/devices',             protect, adminOnly, createDevice);
router.delete('/devices/:id',       protect, adminOnly, deleteDevice);
router.get('/devices/:id/readings', protect, getReadings);
router.post('/readings',            protect, postReading);

export default router;
