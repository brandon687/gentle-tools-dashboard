# Quick Start Guide - Authentication Setup

## Get Started in 5 Steps

### Step 1: Get Google OAuth Credentials (10 min)

1. Go to https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Add redirect URI: `http://localhost:5000/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

### Step 2: Update Environment Variables (2 min)

Open `.env` and update these lines:

```bash
# Replace with your actual credentials
GOOGLE_CLIENT_ID=paste_your_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_client_secret_here

# Add your @scalmob.com email
ADMIN_EMAILS=your.email@scalmob.com

# Generate a random secret (run this command):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=paste_generated_secret_here
```

### Step 3: Verify Database Migration (1 min)

The users table should already be created, but verify:

```bash
npm run db:push
```

You should see: ✓ Changes applied

### Step 4: Start the Server (1 min)

```bash
npm run dev
```

Wait for: "serving on port 5000"

### Step 5: Test Authentication (2 min)

1. Open http://localhost:5000
2. Click **"Sign in with Google"**
3. Sign in with your @scalmob.com account
4. You should see the dashboard!

---

## What You'll See

### As the First Admin User:
- All 7 tabs visible
- Access to Admin Panel
- User management features

### Test Admin Functions:
1. Click **"Admin Panel"** tab
2. You'll see yourself listed as Admin
3. When other team members login, they'll appear here as Power Users
4. You can promote them to Admin if needed

---

## Troubleshooting

**"Unauthorized" error?**
→ Make sure you're using a @scalmob.com email address

**"Authentication failed"?**
→ Double-check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

**Can't see Admin Panel?**
→ Add your email to ADMIN_EMAILS in .env and restart server

**Session not working?**
→ Make sure SESSION_SECRET is set in .env

---

## Next Steps

1. **Test with your team** - Have them login and verify Power User access
2. **Promote admins** - Use Admin Panel to promote trusted users
3. **Review security** - Read `IMPLEMENTATION_SUMMARY.md` for security considerations
4. **Setup for production** - Follow `AUTH_SETUP_GUIDE.md` for deployment

---

## Quick Reference

### User Roles

**Power User** (Default)
- Physical Inventory ✓
- Pending Outbound ✓
- Dump IMEI ✓

**Admin**
- All Power User tabs
- Quick Insights ✓
- Outbound IMEIs ✓
- Movement Log ✓
- Admin Panel ✓

### Key Files
- `.env` - Configuration
- `AUTH_SETUP_GUIDE.md` - Detailed setup
- `IMPLEMENTATION_SUMMARY.md` - Complete documentation

---

**Need Help?** Check the full documentation in `AUTH_SETUP_GUIDE.md`
