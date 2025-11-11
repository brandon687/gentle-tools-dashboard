# Authentication & RBAC Implementation Plan

## System Architecture

### User Roles & Tab Access

**Power User (Default)**
- Physical Inventory (view + export)
- Pending Outbound (view + export)
- Dump IMEI (view + add/delete)

**Admin**
- All tabs (Physical Inventory, Pending Outbound, Dump IMEI, Outbound IMEIs, Quick Insights, Movement Log)
- Admin Panel tab for user management
- Full CRUD on all features
- Can promote Power Users to Admin

### Database Schema

#### users table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'power_user' CHECK (role IN ('power_user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  google_id VARCHAR(255) UNIQUE
);
```

#### sessions table (already exists via express-session)

### Tab Access Matrix

| Tab                  | Power User | Admin |
|----------------------|------------|-------|
| Physical Inventory   | ✓          | ✓     |
| Pending Outbound     | ✓          | ✓     |
| Dump IMEI           | ✓          | ✓     |
| Outbound IMEIs      | ✗          | ✓     |
| Quick Insights      | ✗          | ✓     |
| Movement Log        | ✗          | ✓     |
| Admin Panel         | ✗          | ✓     |

### Authentication Flow

1. User visits app → redirected to Login page
2. Clicks "Sign in with Google"
3. OAuth redirect to Google (restricted to @scalmob.com)
4. Google callback → server validates email domain
5. Server creates/updates user record
6. Session created, user redirected to Dashboard
7. Dashboard shows tabs based on role

### Initial Admin Setup

Environment variable: `ADMIN_EMAILS=your.email@scalmob.com,other.admin@scalmob.com`
- Emails in this list automatically get admin role on first login
- Can promote other users to admin via Admin Panel

### API Endpoint Protection

All existing API endpoints require authentication:
- `/api/inventory` - Power User + Admin
- `/api/shipped-imeis` - Power User + Admin
- `/api/outbound-imeis` - Admin only
- `/api/movements` - Admin only
- `/api/sync/*` - Admin only
- `/api/users/*` - Admin only (new)

### Files to Create/Modify

**New Files:**
1. `server/db/schema.ts` - Add users table
2. `server/middleware/auth.ts` - Auth middleware
3. `server/routes/auth.ts` - OAuth routes
4. `server/routes/users.ts` - User management API
5. `client/src/pages/Login.tsx` - Login page
6. `client/src/components/AdminPanel.tsx` - User management UI
7. `client/src/components/ProtectedRoute.tsx` - Route guard
8. `client/src/contexts/AuthContext.tsx` - Auth state management
9. `client/src/lib/permissions.ts` - Permission checking utilities
10. `.env.example` - Document required env vars

**Modified Files:**
1. `server/index.ts` - Initialize passport, session
2. `server/routes.ts` - Add auth middleware to endpoints
3. `client/src/App.tsx` - Add ProtectedRoute wrapper
4. `client/src/pages/Dashboard.tsx` - Role-based tab rendering
5. `package.json` - Add passport-google-oauth20

### Environment Variables Required

```
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session
SESSION_SECRET=your_random_secret_here

# Admin emails (comma-separated)
ADMIN_EMAILS=your.email@scalmob.com

# Existing vars
DATABASE_URL=postgresql://...
GOOGLE_SHEETS_CREDENTIALS=...
```

### Security Considerations

1. ✓ Email domain validation (@scalmob.com only)
2. ✓ Session-based authentication (httpOnly cookies)
3. ✓ CSRF protection via express-session
4. ✓ Role-based access control on frontend + backend
5. ✓ API endpoint protection with middleware
6. ✓ No password storage (OAuth only)
7. ✓ Secure session storage (PostgreSQL in production)

### Testing Checklist

- [ ] Power User can access only 3 tabs
- [ ] Admin can access all 7 tabs
- [ ] Non-@scalmob.com emails are rejected
- [ ] Unauthenticated users redirected to login
- [ ] API endpoints reject unauthorized requests
- [ ] Admin can promote Power Users to Admin
- [ ] Admin can deactivate users
- [ ] Session persists across page refresh
- [ ] Logout clears session
- [ ] Initial admin emails get admin role automatically
