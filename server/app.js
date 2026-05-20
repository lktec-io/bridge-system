import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import morgan     from 'morgan';
import rateLimit  from 'express-rate-limit';
import path       from 'path';
import { fileURLToPath } from 'url';

import { sanitizeBody }       from './middleware/validate.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

import authRoutes       from './routes/authRoutes.js';
import userRoutes       from './routes/userRoutes.js';
import bridgeRoutes     from './routes/bridgeRoutes.js';
import inspectionRoutes from './routes/inspectionRoutes.js';
import photoRoutes      from './routes/photoRoutes.js';
import dashboardRoutes  from './routes/dashboardRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Trust Nginx reverse proxy ─────────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.disable('x-powered-by');

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://bridge.nardio.online',
  'https://bridge.nardio.online',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── HTTP request logging ──────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Input sanitization ────────────────────────────────────────
app.use(sanitizeBody);

// ── Static file serving (local uploads) ──────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: 'Too many auth requests — please try again in 15 minutes' },
});

const apiLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             300,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: 'Too many requests — please try again later' },
});

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/users',       apiLimiter,  userRoutes);
app.use('/api/bridges',     apiLimiter,  bridgeRoutes);
app.use('/api/inspections', apiLimiter,  inspectionRoutes);
app.use('/api/photos',      apiLimiter,  photoRoutes);
app.use('/api/dashboard',   apiLimiter,  dashboardRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({
  status:      'ok',
  environment: process.env.NODE_ENV || 'development',
  uptime:      `${Math.floor(process.uptime())}s`,
  timestamp:   new Date().toISOString(),
}));

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────
app.use(globalErrorHandler);

export default app;
