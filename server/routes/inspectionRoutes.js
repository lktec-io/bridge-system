import { Router } from 'express';
import {
  getAllInspections, getInspectionById,
  createInspection, updateInspection, resolveInspection, deleteInspection,
} from '../controllers/inspectionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',              protect, getAllInspections);
router.post('/',             protect, createInspection);
router.get('/:id',           protect, getInspectionById);
router.put('/:id',           protect, updateInspection);
router.patch('/:id/resolve', protect, resolveInspection);
router.delete('/:id',        protect, adminOnly, deleteInspection);

export default router;
