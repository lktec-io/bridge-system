import { Router } from 'express';
import {
  getAllBridges, getBridgeById,
  createBridge, updateBridge, deleteBridge, getBridgeHistory,
} from '../controllers/bridgeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',              protect, getAllBridges);
router.post('/',             protect, createBridge);
router.get('/:id',           protect, getBridgeById);
router.put('/:id',           protect, updateBridge);
router.delete('/:id',        protect, adminOnly, deleteBridge);
router.get('/:id/history',   protect, getBridgeHistory);

export default router;
