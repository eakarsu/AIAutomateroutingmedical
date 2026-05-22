import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pg from 'pg';
import authRoutes from './routes/auth.js';
import nursesRoutes from './routes/nurses.js';
import patientsRoutes from './routes/patients.js';
import visitsRoutes from './routes/visits.js';
import ordersRoutes from './routes/orders.js';
import schedulesRoutes from './routes/schedules.js';
import routesRoutes from './routes/routes.js';
import aiRoutes from './routes/ai.js';
import notificationsRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import visitNotesRoutes from './routes/visitNotes.js';
import analyticsRoutes from './routes/analytics.js';
import aiFeaturesRoutes from './routes/aiFeatures.js';
import integrationsRoutes from './routes/integrations.js';
import { startVisitReminderScheduler } from './services/notificationService.js';
import { authenticate } from './middleware/auth.js';
import { aiRateLimiter, generalLimiter } from './middleware/rateLimiter.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Database pool
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'homehealth',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Make pool available to routes
app.locals.db = pool;

// Security headers
app.use(helmet());

// CORS — restrict to CLIENT_URL if set
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server) and the configured client
    if (!origin || origin === allowedOrigin) return cb(null, true);
    cb(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Public routes (no auth)
app.use('/api/auth', authRoutes);

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes — require valid JWT on all of these
app.use('/api/nurses', authenticate, nursesRoutes);
app.use('/api/patients', authenticate, patientsRoutes);
app.use('/api/visits', authenticate, visitsRoutes);
app.use('/api/orders', authenticate, ordersRoutes);
app.use('/api/schedules', authenticate, schedulesRoutes);
app.use('/api/routes', authenticate, routesRoutes);
app.use('/api/ai', authenticate, aiRateLimiter, aiRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/visit-notes', authenticate, visitNotesRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/ai-features', authenticate, aiRateLimiter, aiFeaturesRoutes);
app.use('/api/integrations', authenticate, integrationsRoutes);

// Custom Views (4 routing-focused features) — mounted BEFORE app.listen
import customViewsRoutes from './routes/customViews.js';
app.use('/api/custom-views', authenticate, customViewsRoutes);
import credentialExpiryRoutes from './routes/caregiverCredentialExpiry.js';
app.use('/api/caregiver-credential-expiry', authenticate, credentialExpiryRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  startVisitReminderScheduler(pool);
});

// NOTE: prior CJS require() mounts removed — they were after app.listen()
// (never executed) and `require` is not defined in ESM scope.
