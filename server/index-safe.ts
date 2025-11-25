import './env'; // Load and validate environment variables first
import express, { type Request, Response, NextFunction } from "express";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from './config/passport';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import crypto from 'crypto';
import { pool } from './db';

const app = express();

// Trust Railway proxy for secure cookies
app.set('trust proxy', 1);

// Log all environment variables (redacted for security)
console.log('🚀 Starting Gentle Tools Dashboard Server');
console.log('📦 Environment:', process.env.NODE_ENV || 'development');
console.log('🌍 Available environment variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')) {
    console.log(`   ${key}: [REDACTED]`);
  } else {
    console.log(`   ${key}: ${process.env[key]?.substring(0, 50)}${(process.env[key]?.length || 0) > 50 ? '...' : ''}`);
  }
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Body parsing middleware
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Session configuration with fallback
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  // Generate a random session secret if not provided
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  SESSION_SECRET not set. Using randomly generated secret.');
  console.warn('⚠️  This will cause sessions to be lost on server restart.');
  console.warn('⚠️  Please set SESSION_SECRET environment variable for production.');
}

// Configure PostgreSQL session store for production with better error handling
const PgSession = connectPgSimple(session);
let sessionStore: any = undefined;

// Only create session store if pool exists - wrap in async to prevent blocking
const initSessionStore = async () => {
  if (pool) {
    try {
      // Test the connection first with a timeout
      const testConnection = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Database connection timeout'));
        }, 5000); // 5 second timeout

        pool.query('SELECT 1', (err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve(true);
        });
      });

      await testConnection;

      sessionStore = new PgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15,
        errorLog: (err: any) => {
          console.error('Session store error:', err);
        }
      });
      console.log('✅ PostgreSQL session store initialized');
      return true;
    } catch (error) {
      console.error('⚠️  Failed to initialize session store:', error);
      return false;
    }
  }
  return false;
};

// Initialize session store asynchronously - don't block startup
initSessionStore().then((success) => {
  if (!success) {
    console.warn('⚠️  Using MemoryStore for sessions - sessions will be lost on restart');
  }
});

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust Railway's proxy
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax', // Allow cookies on OAuth redirects
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Session debugging middleware
app.use((req, res, next) => {
  // Only log session info for auth-related routes or if authenticated
  if (req.path.startsWith('/api/auth') || req.isAuthenticated()) {
    console.log(`🔐 Session Debug [${req.method} ${req.path}]:`);
    console.log(`   Session ID: ${req.sessionID}`);
    console.log(`   Authenticated: ${req.isAuthenticated()}`);
    console.log(`   User: ${req.user?.email || 'None'}`);
    console.log(`   Cookie: ${req.headers.cookie ? 'Present' : 'Missing'}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Main startup with better error handling and timeouts
(async () => {
  try {
    console.log('🚀 Starting server initialization...');

    // Add timeout for route registration
    const registerWithTimeout = new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Route registration timeout after 30 seconds'));
      }, 30000);

      try {
        const server = await registerRoutes(app);
        clearTimeout(timeout);
        resolve(server);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });

    const server = await registerWithTimeout as any;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error('Express error handler:', err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);

    // Add server startup timeout
    const startupTimeout = setTimeout(() => {
      console.error('❌ Server failed to start within 60 seconds');
      process.exit(1);
    }, 60000);

    server.listen(port, "0.0.0.0", () => {
      clearTimeout(startupTimeout);
      log(`✅ Server successfully started on port ${port}`);
      console.log(`🌐 Server is listening on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('❌ FATAL: Failed to start server:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    // Don't exit immediately - let Railway see the error
    setTimeout(() => process.exit(1), 1000);
  }
})();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Give time for error to be logged
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Give time for error to be logged
  setTimeout(() => process.exit(1), 1000);
});