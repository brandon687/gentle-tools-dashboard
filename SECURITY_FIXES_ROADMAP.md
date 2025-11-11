# 🔒 Security Fixes Roadmap - Gentle Tools Dashboard

## Current Status: ⚠️ MULTIPLE CRITICAL VULNERABILITIES

Based on comprehensive security audit completed on 2025-11-11.

---

## 🚨 PRIORITY 1: CRITICAL FIXES (Deploy Today)

### 1. Remove Authentication Bypass
**File:** `server/middleware/auth.ts`
**Risk:** Complete authentication bypass in production
**Status:** ❌ Not Fixed

```typescript
// CURRENT CODE - INSECURE:
if (!googleOAuthEnabled) {
  console.warn('⚠️  Auth middleware bypassed - OAuth is disabled');
  return next();  // DANGEROUS!
}

// SECURE FIX:
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Never bypass in production
  if (process.env.NODE_ENV === 'production' && !googleOAuthEnabled) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Authentication system is not configured'
    });
  }

  // Development-only bypass with mock user
  if (process.env.NODE_ENV === 'development' && !googleOAuthEnabled) {
    console.warn('⚠️  DEV MODE: Auth bypassed');
    req.user = { id: -1, email: 'dev@test.com', role: 'admin' } as any;
    return next();
  }

  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
```

### 2. Implement CSRF Protection
**Files:** `server/index.ts`, all POST/PUT/DELETE endpoints
**Risk:** Malicious sites can perform actions on behalf of logged-in users
**Status:** ❌ Not Implemented

```bash
npm install csurf cookie-parser
```

```typescript
// server/index.ts
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply to all state-changing routes
app.use(['/api/sync', '/api/shipped-imeis', '/api/movements', '/api/users'], csrfProtection);

// Provide token to client
app.get('/api/csrf-token', requireAuth, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

```typescript
// client/src/lib/api.ts - Update fetch calls
async function apiCall(url: string, options: RequestInit = {}) {
  // Get CSRF token
  const tokenRes = await fetch('/api/csrf-token');
  const { csrfToken } = await tokenRes.json();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'csrf-token': csrfToken,
    }
  });
}
```

### 3. Add Rate Limiting
**File:** `server/index.ts`
**Risk:** Brute force attacks, DDoS, resource exhaustion
**Status:** ❌ Not Implemented

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

// Strict auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth', authLimiter);

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
});

app.use('/api', apiLimiter);

// Very strict sync limiting
const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 syncs per hour
  message: 'Sync rate limit exceeded',
});

app.use(['/api/sync', '/api/cache/sync-outbound'], syncLimiter);
```

### 4. Secure Debug Endpoint
**File:** `server/routes.ts`
**Risk:** Exposes environment variables and system config
**Status:** ❌ Not Secured

```typescript
// Remove in production or heavily restrict
app.get('/api/debug/env', requireAuth, requireAdmin, (req, res) => {
  // Block in production entirely
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Additional IP whitelist for development
  const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  if (!allowedIPs.includes(req.ip || '')) {
    console.error(`🚫 Unauthorized debug access attempt from IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... rest of debug logic
});
```

---

## 🔴 PRIORITY 2: HIGH PRIORITY (Within 48 Hours)

### 5. Input Validation with Zod
**Files:** All API endpoints in `server/routes.ts`
**Status:** ❌ Not Implemented

```bash
npm install zod
```

```typescript
// server/validators/schemas.ts
import { z } from 'zod';

export const imeiSchema = z.string()
  .regex(/^\d{15,17}$/, 'IMEI must be 15-17 digits');

export const bulkImeiSchema = z.object({
  imeis: z.array(imeiSchema)
    .min(1, 'At least one IMEI required')
    .max(1000, 'Maximum 1000 IMEIs per request')
});

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const searchQuerySchema = z.object({
  search: z.string().min(3).max(100).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(1000)).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).default('0'),
});
```

```typescript
// Use in routes
import { bulkImeiSchema } from './validators/schemas';

app.post('/api/shipped-imeis', requireAuth, async (req, res) => {
  try {
    const validated = bulkImeiSchema.parse(req.body);
    const { imeis } = validated;
    // ... rest of logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    throw error;
  }
});
```

### 6. Session Regeneration on Login
**File:** `server/routes/auth.ts`
**Status:** ❌ Not Implemented

```typescript
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.redirect('/login?error=auth_failed');
    }

    // Regenerate session to prevent fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('❌ Session regeneration failed:', err);
        return next(err);
      }

      req.logIn(user, (err: any) => {
        if (err) {
          console.error('❌ Error during req.logIn:', err);
          return next(err);
        }

        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Error saving session:', err);
            return next(err);
          }

          console.log('✅ User logged in with new session:', user.email);
          res.redirect('/');
        });
      });
    });
  })(req, res, next);
});
```

### 7. Add Security Headers with Helmet
**File:** `server/index.ts`
**Status:** ❌ Not Implemented

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust for your frontend needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### 8. Implement Security Event Logging
**Files:** New `server/lib/securityLogger.ts`, throughout application
**Status:** ❌ Not Implemented

```bash
npm install winston
```

```typescript
// server/lib/securityLogger.ts
import winston from 'winston';

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export function logSecurityEvent(
  event: string,
  metadata: {
    req?: Request;
    user?: any;
    severity?: 'info' | 'warning' | 'error';
    [key: string]: any;
  }
) {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ip: metadata.req?.ip,
    userAgent: metadata.req?.headers['user-agent'],
    user: metadata.req?.user?.email || metadata.user?.email,
    ...metadata,
  };

  const severity = metadata.severity || 'info';
  securityLogger[severity](JSON.stringify(logData));
}
```

```typescript
// Use in authentication
import { logSecurityEvent } from '../lib/securityLogger';

// Failed login
if (!validateEmailDomain(email)) {
  logSecurityEvent('AUTH_FAILED_INVALID_DOMAIN', {
    email,
    reason: 'non-scalmob domain',
    severity: 'warning'
  });
  return done(new Error('Invalid domain'), undefined);
}

// Successful login
logSecurityEvent('AUTH_SUCCESS', {
  user: user.email,
  role: user.role,
  severity: 'info'
});

// Role change
logSecurityEvent('USER_ROLE_CHANGED', {
  targetUser: userEmail,
  oldRole: currentRole,
  newRole: newRole,
  performedBy: req.user.email,
  severity: 'warning'
});
```

---

## 🟡 PRIORITY 3: MEDIUM PRIORITY (Within 1 Week)

### 9. Sanitize Error Messages
**Files:** All routes in `server/routes.ts`
**Status:** ❌ Not Implemented

```typescript
// server/lib/errorHandler.ts
export function sanitizeError(error: any, context?: string): string {
  // Log full error internally
  console.error(`Error in ${context}:`, error);

  if (process.env.NODE_ENV === 'production') {
    // Return generic message to client
    return 'An error occurred processing your request';
  }

  // In development, return detailed error
  return error.message || 'Unknown error';
}

// Usage in routes
try {
  const data = await fetchInventoryData();
  res.json(data);
} catch (error: any) {
  res.status(500).json({
    error: 'Failed to fetch inventory data',
    message: sanitizeError(error, 'fetchInventory')
  });
}
```

### 10. Add Request Size Limits
**File:** `server/index.ts`
**Status:** ❌ Not Implemented

```typescript
app.use(express.json({
  limit: '1mb', // Prevent large payload attacks
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: false,
  limit: '1mb'
}));
```

### 11. Implement PostgreSQL Session Store
**File:** `server/index.ts`
**Risk:** Sessions lost on server restart (MemoryStore issue)
**Status:** ❌ Not Implemented

```bash
npm install connect-pg-simple
```

```typescript
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { db } from './db';

const PgStore = pgSession(session);

app.use(
  session({
    store: new PgStore({
      pool: db, // Your Drizzle DB connection pool
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict', // Changed from 'lax' to 'strict' for better security
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);
```

---

## 🟢 PRIORITY 4: LOW PRIORITY (Nice to Have)

### 12. Reduce Console Logging in Production
**Files:** Throughout codebase
**Status:** ❌ Not Implemented

```typescript
// server/lib/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};

// Replace console.log with logger.debug throughout codebase
```

---

## 📋 Implementation Checklist

### Phase 1: Critical (Today)
- [ ] Fix authentication bypass in middleware
- [ ] Add CSRF protection
- [ ] Implement rate limiting
- [ ] Secure/remove debug endpoint
- [ ] Test all fixes on staging

### Phase 2: High Priority (48 hours)
- [ ] Add Zod validation to all endpoints
- [ ] Implement session regeneration
- [ ] Add Helmet security headers
- [ ] Set up security event logging
- [ ] Test authentication flow end-to-end

### Phase 3: Medium Priority (1 week)
- [ ] Sanitize all error messages
- [ ] Add request size limits
- [ ] Migrate to PostgreSQL session store
- [ ] Add monitoring/alerting
- [ ] Security penetration testing

### Phase 4: Low Priority (Ongoing)
- [ ] Reduce console logging
- [ ] Regular dependency updates
- [ ] Code reviews for security
- [ ] Security training for team

---

## 🧪 Testing Strategy

### Security Testing Tools to Implement:

1. **OWASP ZAP** - Automated security scanner
2. **npm audit** - Check for vulnerable dependencies
3. **Snyk** - Continuous security monitoring
4. **Burp Suite** - Manual penetration testing

### Test Cases to Run:

```bash
# Check for vulnerable dependencies
npm audit

# Run security scan
npm install -g snyk
snyk test

# Test rate limiting
for i in {1..10}; do curl http://localhost:3000/auth/google; done

# Test CSRF protection
curl -X POST http://localhost:3000/api/shipped-imeis \
  -H "Content-Type: application/json" \
  -d '{"imeis":["123456789012345"]}'
# Should fail with CSRF error

# Test authentication bypass
curl http://localhost:3000/api/users
# Should return 401 Unauthorized
```

---

## 📊 Success Metrics

- [ ] All CRITICAL vulnerabilities resolved
- [ ] All HIGH priority issues resolved
- [ ] Security audit score: 90%+
- [ ] Zero authentication bypasses possible
- [ ] Rate limiting functional on all endpoints
- [ ] CSRF protection active on all state-changing endpoints
- [ ] Security event logging capturing all auth events
- [ ] Session store persisting across restarts

---

## 🚀 Deployment Plan (Zero Downtime)

1. **Create feature branch**: `security-hardening`
2. **Implement Priority 1 fixes**
3. **Test locally with all scenarios**
4. **Deploy to Railway staging environment**
5. **Run automated security tests**
6. **Manual penetration testing**
7. **Get team approval**
8. **Deploy to production during low-traffic window**
9. **Monitor for 24 hours**
10. **Implement Priority 2 fixes**

**Timeline:** Priority 1 fixes should be deployed TODAY. This is critical.
