import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markRead,
  markAllRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(protect);

router.get('/',              getNotifications);
router.put('/read-all',      markAllRead);
router.put('/:id/read',      markRead);

export default router;
