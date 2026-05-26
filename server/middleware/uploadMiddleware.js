import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

let storage;

if (process.env.UPLOAD_MODE === 'cloudinary') {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:           'bms_bridges',
      allowed_formats:  ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation:   [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
} else {
  const uploadPath = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename:    (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
