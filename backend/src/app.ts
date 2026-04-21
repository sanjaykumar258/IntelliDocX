// ============================================================
// IntelliDocX Backend — Main Application Entry
// All imports MUST be at the top of the file (TypeScript rule)
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/authRoutes';
import orgRoutes from './routes/organizationRoutes';
import userRoutes from './routes/userRoutes';
import documentRoutes from './routes/documentRoutes';
import workflowRoutes from './routes/workflowRoutes';
import notificationRoutes from './routes/notificationRoutes';
import analyticsRoutes from './analytics/analyticsRoutes';
import searchRoutes from './routes/searchRoutes';
import folderRoutes from './routes/folderRoutes';
import adminRoutes from './routes/adminRoutes';
import chatRoutes from './routes/chatRoutes';
import auditRoutes from './routes/auditRoutes';
import ticketRoutes from './routes/ticketRoutes';
import hrRoutes from './routes/hrRoutes';
import employeeDocRoutes from './routes/employeeDocRoutes';

// Middleware imports
import { requireAuth } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { globalSanitizer } from './middleware/validation';
import { rateLimiter } from './middleware/rateLimiter';

// Utility imports
import prisma from './utils/prisma';
import redisClient from './utils/redis';
import { v4 as uuidv4 } from 'uuid';
import minioClient, { ensureBucketExists, BUCKET_NAME } from './storage/minioClient';
import axios from 'axios';
import { checkSLABreaches } from './services/slaService';
import Logger from './utils/logger';
import { initializeSocketServer } from './sockets/socketServer';

// Event & Worker imports (side-effect only)
import './events/handlers';
import './workers/documentWorker';

dotenv.config();

const app = express();

// ── Request ID Middleware ────────────────────────────────────
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ── HTTP Server & Socket.IO ──────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    // Allow frontend origin in both dev and prod
    origin: process.env.NODE_ENV === 'production'
      ? ['http://localhost', 'http://127.0.0.1', 'http://localhost:5173']
      : '*',
    methods: ['GET', 'POST'],
  },
});

initializeSocketServer(io);

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost', 'http://127.0.0.1', 'http://localhost:5173']
    : true, // true mirrors the request Origin header — required for credentials
  credentials: true,
}));

// ── Logging ─────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => Logger.http(message.trim()),
  },
}));

// ── Body Parsing & Sanitization ──────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(globalSanitizer);

// ── Rate Limiting (production only) ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(rateLimiter);
}

// ═══════════════════════════════════════════════════════════
//  HEALTH CHECK ROUTES (public)
// ═══════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'IntelliDocX Backend' });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (error: any) {
    Logger.error(`DB Health Check Failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/health/cache', async (_req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'ok', cache: 'connected' });
  } catch (error: any) {
    Logger.error(`Redis Health Check Failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/health/storage', async (_req, res) => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    res.json({ status: 'ok', storage: 'minio', bucket: BUCKET_NAME, accessible: exists });
  } catch (error: any) {
    Logger.error(`Storage Health Check Failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/health/ai', async (_req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.get(`${aiServiceUrl}/health`);
    res.json({ status: 'ok', ai_service: response.data });
  } catch (error: any) {
    Logger.error(`AI Service Health Check Failed: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  PUBLIC SHARE ENDPOINT (no auth required)
// ═══════════════════════════════════════════════════════════

app.get('/api/share/:token', async (req, res) => {
  try {
    const share = await prisma.documentShare.findUnique({
      where: { token: req.params.token },
      include: {
        document: {
          include: {
            owner: { select: { id: true, name: true } },
            metadata: true,
          },
        },
      },
    });

    if (!share || !share.isActive) {
      return res.status(404).json({ message: 'Share link not found or deactivated' });
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return res.status(410).json({ message: 'Share link has expired' });
    }

    res.json({
      document: share.document,
      permissions: share.permissions,
      expiresAt: share.expiresAt,
    });
  } catch (error: any) {
    Logger.error(`Share endpoint error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════

// Public auth routes
app.use('/api/auth', authRoutes);

// All protected routes share this middleware chain
const protectedMiddleware = [requireAuth, tenantMiddleware];

app.use('/api/organizations', protectedMiddleware, orgRoutes);
app.use('/api/users', protectedMiddleware, userRoutes);

// Employee-specific document routes MUST come before the main documentRoutes
// because main routes have a /:id wildcard that would intercept /my and /my/stats
app.use('/api/documents', protectedMiddleware, employeeDocRoutes);
app.use('/api/documents', protectedMiddleware, documentRoutes);

app.use('/api/workflows', protectedMiddleware, workflowRoutes);
app.use('/api/search', protectedMiddleware, searchRoutes);
app.use('/api/folders', protectedMiddleware, folderRoutes);
app.use('/api/analytics', protectedMiddleware, analyticsRoutes);
app.use('/api/chat', protectedMiddleware, chatRoutes);

// Admin routes — accept-invitation is intentionally public, the router handles its own auth
app.use('/api/admin', adminRoutes);

app.use('/api', protectedMiddleware, notificationRoutes);
app.use('/api/audit-logs', protectedMiddleware, auditRoutes);

// IT & HR — now correctly behind protectedMiddleware for tenant context
app.use('/api/tickets', protectedMiddleware, ticketRoutes);
app.use('/api/hr', protectedMiddleware, hrRoutes);

// ═══════════════════════════════════════════════════════════
//  BACKGROUND SCHEDULERS
// ═══════════════════════════════════════════════════════════

// Initialize MinIO bucket
ensureBucketExists();

// SLA Breach Checker — runs every 15 minutes
setInterval(async () => {
  try {
    Logger.info('Running SLA Checker...');
    await checkSLABreaches();
  } catch (err) {
    Logger.error(`SLA Checker failed: ${err}`);
  }
}, 15 * 60 * 1000);

// Document Expiry Checker — runs every hour
setInterval(async () => {
  try {
    Logger.info('Running Document Expiry Checker...');
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find documents expiring within 7 days and notify owners
    const expiringSoon = await prisma.document.findMany({
      where: {
        expiryDate: { lte: sevenDaysFromNow, gte: now },
        status: 'ACTIVE',
      },
      include: { owner: true },
    });

    for (const doc of expiringSoon) {
      const daysLeft = Math.ceil((doc.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      // Avoid duplicate expiry notifications by checking recent ones
      const recentNotification = await prisma.notification.findFirst({
        where: {
          userId: doc.ownerId,
          title: 'Document Expiring Soon',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
          message: { contains: doc.title },
        },
      });

      if (!recentNotification) {
        await prisma.notification.create({
          data: {
            userId: doc.ownerId,
            organizationId: doc.organizationId,
            type: 'DOCUMENT',
            title: 'Document Expiring Soon',
            message: `"${doc.title}" expires in ${daysLeft} day(s)`,
          },
        });
      }
    }

    // Auto-archive expired documents
    const expired = await prisma.document.findMany({
      where: {
        expiryDate: { lt: now },
        status: 'ACTIVE',
        autoArchive: true,
      },
    });

    for (const doc of expired) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'ARCHIVED' },
      });
      Logger.info(`Auto-archived expired document: ${doc.title}`);
    }

    Logger.info(`Expiry check: ${expiringSoon.length} expiring soon, ${expired.length} auto-archived`);
  } catch (err) {
    Logger.error(`Expiry Checker failed: ${err}`);
  }
}, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER (must be last middleware)
// ═══════════════════════════════════════════════════════════

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = res.getHeader('X-Request-ID');
  Logger.error(`[${requestId}] Unhandled Error: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export { app, httpServer, io };
