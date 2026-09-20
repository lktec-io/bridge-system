import { Router } from 'express';
import { getHistory, getHistoryActions } from '../controllers/historyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',        protect, getHistory);
router.get('/actions', protect, getHistoryActions);

export default router;
