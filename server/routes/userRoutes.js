import { Router }  from 'express';
import {
  getUsers, updateUserRole, deleteUser,
} from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',         protect, adminOnly, getUsers);
router.put('/:id/role', protect, adminOnly, updateUserRole);
router.delete('/:id',   protect, adminOnly, deleteUser);

export default router;
