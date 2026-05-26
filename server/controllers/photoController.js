import path    from 'path';
import { fileURLToPath } from 'url';
import fs       from 'fs';
import pool     from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logHistory } from '../services/historyService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;

// Build media base URL for local uploads (no trailing slash)
const mediaBase = () =>
  (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { bridgeId, photoType } = req.body;
  if (!bridgeId || !photoType) {
    return res.status(400).json({ message: 'bridgeId and photoType are required' });
  }
  if (!['PHOTO_1', 'PHOTO_2'].includes(photoType)) {
    return res.status(400).json({ message: 'photoType must be PHOTO_1 or PHOTO_2' });
  }

  // Remove existing photo of same type for this bridge
  const [existing] = await pool.query(
    'SELECT * FROM photos WHERE bridge_id = ? AND photo_type = ?',
    [Number(bridgeId), photoType]
  );
  if (existing.length) {
    const old = existing[0];
    if (process.env.UPLOAD_MODE === 'cloudinary' && old.public_id) {
      await cloudinary.uploader.destroy(old.public_id).catch(() => {});
    } else if (old.photo_url) {
      const localPath = path.join(__dirname, '..', 'uploads', path.basename(old.photo_url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
    await pool.query('DELETE FROM photos WHERE id = ?', [old.id]);
  }

  let photoUrl, publicId;

  if (process.env.UPLOAD_MODE === 'cloudinary') {
    // multer-storage-cloudinary sets req.file.path = secure_url, req.file.filename = public_id
    photoUrl = req.file.path;
    publicId = req.file.filename;
  } else {
    // Local disk storage: store full absolute URL so frontend doesn't need to reconstruct it
    photoUrl = `${mediaBase()}/uploads/${req.file.filename}`;
    publicId = null;
  }

  const [result] = await pool.query(
    'INSERT INTO photos (bridge_id, photo_url, photo_type, public_id) VALUES (?, ?, ?, ?)',
    [Number(bridgeId), photoUrl, photoType, publicId]
  );

  await logHistory(Number(bridgeId), req.user?.id, 'PHOTO_UPLOADED', {}, { photoType });

  const [rows] = await pool.query('SELECT * FROM photos WHERE id = ?', [result.insertId]);
  const p      = rows[0];
  res.status(201).json({
    id:        p.id,
    bridgeId:  p.bridge_id,
    photoUrl:  p.photo_url,
    photoType: p.photo_type,
    publicId:  p.public_id,
    createdAt: toISO(p.created_at),
  });
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM photos WHERE id = ?', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ message: 'Photo not found' });

  const photo = rows[0];

  if (process.env.UPLOAD_MODE === 'cloudinary' && photo.public_id) {
    await cloudinary.uploader.destroy(photo.public_id).catch(() => {});
  } else if (photo.photo_url) {
    const localPath = path.join(__dirname, '..', 'uploads', path.basename(photo.photo_url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }

  await pool.query('DELETE FROM photos WHERE id = ?', [photo.id]);
  res.json({ message: 'Photo deleted successfully' });
});
