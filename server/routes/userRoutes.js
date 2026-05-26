import { Router }  from 'express';
import {
  getUsers, updateUserRole, deleteUser,
  adminCreateUser, updateUserDetails, changeUserPassword,
} from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/',                protect, adminOnly, getUsers);
router.post('/',               protect, adminOnly, adminCreateUser);
router.put('/:id/role',        protect, adminOnly, updateUserRole);
router.put('/:id/password',    protect, adminOnly, changeUserPassword);
router.put('/:id',             protect, adminOnly, updateUserDetails);
router.delete('/:id',          protect, adminOnly, deleteUser);

export default router;
