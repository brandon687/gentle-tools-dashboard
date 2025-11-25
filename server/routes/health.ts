import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Health check endpoint for Railway deployment monitoring
router.get('/health', async (req, res) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // Check database connection (with timeout)
  if (pool) {
    try {
      const dbCheckPromise = pool.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      );

      await Promise.race([dbCheckPromise, timeoutPromise]);
      health.checks.database = { status: 'connected' };
    } catch (error: any) {
      health.checks.database = {
        status: 'disconnected',
        error: error.message
      };
      health.status = 'degraded';
    }
  } else {
    health.checks.database = { status: 'not_configured' };
  }

  // Check Google OAuth configuration
  health.checks.oauth = {
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    status: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not_configured'
  };

  // Check session configuration
  health.checks.session = {
    configured: !!process.env.SESSION_SECRET,
    status: process.env.SESSION_SECRET ? 'configured' : 'using_random'
  };

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Liveness probe - simple check that server is running
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe - check if server is ready to handle requests
router.get('/health/ready', async (req, res) => {
  let ready = true;
  const checks: any = {};

  // Quick database check
  if (pool) {
    try {
      await pool.query('SELECT 1');
      checks.database = 'ready';
    } catch {
      checks.database = 'not_ready';
      ready = false;
    }
  }

  res.status(ready ? 200 : 503).json({
    ready,
    checks
  });
});

export default router;