import { Router } from 'express';
import {
  getAllMaintenance, getMaintenanceSummary, getMaintenanceById,
  createMaintenance, updateMaintenance, deleteMaintenance,
} from '../controllers/maintenanceController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',        protect, getAllMaintenance);
router.get('/summary', protect, getMaintenanceSummary);
router.post('/',       protect, createMaintenance);
router.get('/:id',     protect, getMaintenanceById);
router.put('/:id',     protect, updateMaintenance);
router.delete('/:id',  protect, adminOnly, deleteMaintenance);

export default router;
