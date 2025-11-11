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

// Configure PostgreSQL session store for production
const PgSession = connectPgSimple(session);
const sessionStore = pool ? new PgSession({
  pool: pool,
  tableName: 'session', // PostgreSQL table name
  createTableIfMissing: true, // Auto-create session table
  pruneSessionInterval: 60 * 15, // Clean up expired sessions every 15 minutes
}) : undefined;

if (sessionStore) {
  console.log('✅ Using PostgreSQL session store for persistent sessions');
} else {
  console.warn('⚠️  Using MemoryStore for sessions - sessions will be lost on restart');
}

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();