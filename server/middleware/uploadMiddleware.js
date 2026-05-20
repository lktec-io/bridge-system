import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bridge-system',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const storage =
  process.env.UPLOAD_MODE === 'cloudinary' ? cloudStorage : localStorage;

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;
