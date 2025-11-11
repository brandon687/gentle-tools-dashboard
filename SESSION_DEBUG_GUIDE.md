# 🔍 Session Persistence Debugging Guide

## Current Issue

Users can successfully authenticate with Google OAuth but are immediately redirected back to the login page, suggesting the session is not persisting between requests.

---

## What We Know ✅

1. **Google OAuth is working** - Users can select their @scalmob.com account
2. **Railway deployment is successful** - All environment variables are set correctly
3. **OAuth callback is reached** - Google redirects back to the app
4. **Extensive logging has been added** by the user to track:
   - Session ID before/after authentication
   - User serialization/deserialization
   - Cookie data in requests
   - `/auth/me` endpoint checks

---

## What We Need to Investigate 🔍

### Step 1: Check Railway Logs for Session Flow

Look for these specific log messages in Railway deployment logs:

```
📥 OAuth callback received
   Session ID before auth: [session-id]
   Session data before auth: {...}
   Is authenticated before: false

✅ OAuth authentication successful for user: [email]
✅ User logged in successfully
   Session ID after login: [session-id]
   Session data after login: {...}
   Is authenticated after: true
   User in session: [email]

✅ Session saved successfully, redirecting to /

🔍 /auth/me endpoint called
   Session ID: [session-id]
   Session data: {...}
   Is authenticated: [true/false]
   User: [email or 'No user']
   Cookies: connect.sid=...
```

**Key Questions:**
1. Does the Session ID change between `/auth/google/callback` and the subsequent request to `/`?
2. Is `req.isAuthenticated()` true immediately after login but false on the next request?
3. Is the `connect.sid` cookie being sent in subsequent requests?
4. Is the session data empty on subsequent requests?

### Step 2: Browser Network Tab Analysis

Open DevTools → Network tab and observe:

1. **Request to `/auth/google/callback`:**
   - Check Response Headers for `Set-Cookie: connect.sid=...`
   - Note the cookie attributes: `HttpOnly`, `Secure`, `SameSite`, `Path`

2. **Redirect to `/`:**
   - Check Request Headers for `Cookie: connect.sid=...`
   - Is the same session ID being sent?

3. **Request to `/auth/me`:**
   - Check Request Headers for `Cookie: connect.sid=...`
   - Check Response body - is `authenticated: true`?

### Step 3: Browser Cookie Inspection

In DevTools → Application tab → Cookies:

1. Look for cookie named `connect.sid`
2. Check its properties:
   - Domain: `web-production-5bf6.up.railway.app`
   - Path: `/`
   - Expires: Should be 7 days from now
   - HttpOnly: ✓
   - Secure: ✓
   - SameSite: `Lax` or `Strict`

**If cookie is missing:** Session cookie is not being set
**If cookie exists but not sent:** Cookie attributes are blocking it

---

## Most Likely Root Causes

### Hypothesis 1: Cookie SameSite Attribute Issue ⭐ MOST LIKELY
**Symptoms:** Session works on callback but not on next request

The current code has `sameSite: 'lax'` which should work, but Railway's proxy might be causing issues.

**Diagnosis:**
```typescript
// Check server/index.ts line 56
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax', // <-- Could be the issue
  maxAge: 1000 * 60 * 60 * 24 * 7,
}
```

**Potential Fix:**
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7,
}
```

⚠️ **Warning:** `sameSite: 'none'` requires `secure: true` and has security implications.

### Hypothesis 2: Proxy Trust Configuration
**Symptoms:** Cookie shows as Secure but connection is not recognized as secure

**Current Code:**
```typescript
// server/index.ts line 12
app.set('trust proxy', 1);

// server/index.ts line 52
proxy: true,
```

**Potential Issue:** Railway may use multiple proxies (not just 1)

**Potential Fix:**
```typescript
app.set('trust proxy', true); // Trust all proxies
```

### Hypothesis 3: Session Store Memory Issue
**Symptoms:** Session saved but immediately lost

Railway restarts or the MemoryStore is not properly initialized.

**Current Code:**
```typescript
// Using default MemoryStore (implicit)
session({
  secret: sessionSecret,
  // No store specified - uses MemoryStore
})
```

**Solution:** Implement PostgreSQL-backed session store (see SECURITY_FIXES_ROADMAP.md)

### Hypothesis 4: Cookie Path Mismatch
**Symptoms:** Cookie set but not sent on subsequent requests

**Check:** Is the cookie path set to `/` and does Railway have any URL rewriting?

**Potential Fix:**
```typescript
cookie: {
  path: '/',
  domain: process.env.NODE_ENV === 'production'
    ? 'web-production-5bf6.up.railway.app'
    : undefined,
  // ... other options
}
```

### Hypothesis 5: Session Serialization Error
**Symptoms:** User serialized but not deserialized

**Check logs for:**
```
🔒 Serializing user to session: [id] [email]
🔓 Deserializing user from session, ID: [id]
❌ User not found during deserialization, ID: [id]
```

**If deserialization fails:** Database query is failing or user was deleted

---

## Diagnostic Test Plan

### Test 1: Simple Cookie Test
Add a test endpoint to verify cookies work at all:

```typescript
// In server/index.ts (TEMPORARY - REMOVE AFTER TESTING)
app.get('/test-cookie', (req, res) => {
  res.cookie('test-cookie', 'test-value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60000,
  });
  res.json({ message: 'Cookie set' });
});

app.get('/check-cookie', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers.cookie,
  });
});
```

**Test:**
1. Visit `/test-cookie`
2. Visit `/check-cookie`
3. If `test-cookie` appears, cookies work. If not, cookie configuration is broken.

### Test 2: Session Store Test
Check if sessions persist at all:

```typescript
// In server/index.ts (TEMPORARY)
app.get('/test-session', (req, res) => {
  if (!req.session.views) {
    req.session.views = 0;
  }
  req.session.views++;
  res.json({
    sessionId: req.sessionID,
    views: req.session.views,
  });
});
```

**Test:**
1. Visit `/test-session` multiple times
2. If `views` increments, session store works
3. If `views` stays at 1, session store is broken

### Test 3: Passport Serialization Test
Test if user serialization/deserialization works:

```typescript
// In server/routes/auth.ts (TEMPORARY)
router.get('/test-auth', requireAuth, (req, res) => {
  res.json({
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    sessionData: req.session,
  });
});
```

---

## Step-by-Step Investigation Protocol

### Phase 1: Gather Data (Don't Change Code Yet)

1. **User attempts login on Railway**
2. **User shares Railway logs** (full console output from startup to after failed login)
3. **User shares browser Network tab** (HAR file or screenshots)
4. **User shares browser Cookies** (screenshot of Application → Cookies)

### Phase 2: Analyze Data

Based on the logs and network traces, identify:

1. Is session ID changing between requests? → Session fixation or regeneration issue
2. Is cookie being set in response? → Cookie configuration issue
3. Is cookie being sent in subsequent requests? → Browser/domain/SameSite issue
4. Is user being serialized? → Check logs for serialization
5. Is user being deserialized? → Check logs for deserialization
6. Is session data present? → Session store issue

### Phase 3: Targeted Fix

Based on analysis, implement ONE fix at a time:

1. Deploy fix
2. Test immediately
3. If fixed, document solution
4. If not fixed, revert and try next hypothesis

---

## Quick Wins to Try

### Option A: Simplify Cookie Settings (Least Risky)
```typescript
cookie: {
  secure: false, // TEMPORARY TEST - Set to true after testing
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7,
}
```

### Option B: Use Lax Cookie with Domain (Medium Risk)
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  domain: process.env.NODE_ENV === 'production'
    ? '.up.railway.app'
    : undefined,
  maxAge: 1000 * 60 * 60 * 24 * 7,
}
```

### Option C: PostgreSQL Session Store (Highest Reliability)
```typescript
import pgSession from 'connect-pg-simple';
const PgStore = pgSession(session);

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);
```

---

## Expected Outcomes

### Success Criteria:
1. User authenticates with Google
2. User is redirected to `/`
3. Dashboard loads showing authenticated content
4. `/auth/me` returns `authenticated: true`
5. User can navigate between pages without re-authenticating
6. Session persists for 7 days

### Failure Indicators:
1. User redirected back to login page
2. `/auth/me` returns `authenticated: false`
3. Session ID changes between requests
4. Cookie not present in browser
5. User sees "Please sign in" message

---

## Next Steps

**DO NOT make code changes until we have:**
1. Railway logs showing the full authentication flow
2. Browser Network tab data showing cookie behavior
3. Clear identification of which hypothesis matches the symptoms

**Once we have data, implement ONE fix at a time and test immediately.**

This methodical approach will prevent the frustrating cycle of:
- Make a change → Deploy → Wait → Still broken → Make another change → Deploy...

Instead:
- Gather data → Analyze → Identify root cause → Implement targeted fix → Success ✅
