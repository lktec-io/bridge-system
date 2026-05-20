import { Router } from 'express';
import { uploadPhoto, deletePhoto } from '../controllers/photoController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/upload',  protect, upload.single('photo'), uploadPhoto);
router.delete('/:id',   protect, adminOnly, deletePhoto);

export default router;
