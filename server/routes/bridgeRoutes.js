import { Router } from 'express';
import {
  getAllBridges, getBridgePositions, getBridgeOptions,
  getBridgeById, createBridge, updateBridge, deleteBridge, getBridgeHistory,
} from '../controllers/bridgeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

/* Static segments are declared before '/:id' so they are not captured as ids. */
router.get('/positions',   protect, getBridgePositions);
router.get('/options',     protect, getBridgeOptions);

router.get('/',            protect, getAllBridges);
router.post('/',           protect, createBridge);
router.get('/:id',         protect, getBridgeById);
router.put('/:id',         protect, updateBridge);
router.delete('/:id',      protect, adminOnly, deleteBridge);
router.get('/:id/history', protect, getBridgeHistory);

export default router;
