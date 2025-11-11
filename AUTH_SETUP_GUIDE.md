# Authentication & Authorization Setup Guide

## Overview

This guide will help you configure Google OAuth authentication and role-based access control (RBAC) for the Gentle Tools Dashboard.

## Prerequisites

- Google Cloud Platform account
- Admin access to your @scalmob.com Google Workspace
- Access to the application's .env file

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Navigate to https://console.cloud.google.com/apis/credentials
2. Select your project or create a new one

### 1.2 Create OAuth 2.0 Client ID
1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **"Web application"** as the application type
3. Name it: `Gentle Tools Dashboard - Production`

### 1.3 Configure Authorized Redirect URIs
Add the following redirect URIs:
- Development: `http://localhost:5000/auth/google/callback`
- Production: `https://your-domain.com/auth/google/callback`

### 1.4 Save Credentials
1. Click **"CREATE"**
2. Copy the **Client ID** and **Client Secret**
3. Keep these values secure!

## Step 2: Configure Environment Variables

### 2.1 Update .env File

Open `.env` and update the following variables:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session Secret (generate a strong random string)
SESSION_SECRET=generate_a_long_random_string_here

# Admin Emails (your @scalmob.com email)
ADMIN_EMAILS=brandon@scalmob.com,admin@scalmob.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 2.2 Generate Strong Session Secret

Run this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET`.

## Step 3: Configure Google Workspace Domain Restriction

### 3.1 Optional: Restrict OAuth to @scalmob.com Domain

In Google Cloud Console:
1. Go to **"OAuth consent screen"**
2. Under **"Authorized domains"**, add: `scalmob.com`
3. Under **"User type"**, select **"Internal"** if you want only your organization
4. Click **"SAVE AND CONTINUE"**

This ensures only @scalmob.com users can authenticate.

## Step 4: Test the Implementation

### 4.1 Start the Development Server

```bash
npm run dev
```

### 4.2 Test Authentication Flow

1. Navigate to `http://localhost:5000`
2. You should be redirected to `/login`
3. Click **"Sign in with Google"**
4. Select your @scalmob.com account
5. Grant permissions when prompted
6. You should be redirected to the dashboard

### 4.3 Verify User Role

First user to login with an email in `ADMIN_EMAILS` will be an admin.
All other @scalmob.com users will be Power Users by default.

## Step 5: Manage Users (Admin Only)

### 5.1 Access Admin Panel

1. Login as an admin
2. Click on the **"Admin Panel"** tab
3. You'll see a list of all users

### 5.2 Change User Roles

- **Power User**: Can access Physical Inventory, Pending Outbound, Dump IMEI
- **Admin**: Full access to all features including Admin Panel

To change a role:
1. Select the new role from the dropdown next to the user
2. The change is applied immediately

### 5.3 Deactivate Users

To prevent a user from accessing the dashboard:
1. Click **"Deactivate"** next to their name
2. Confirm the action
3. They will be logged out and unable to sign in

## User Role Access Matrix

| Tab                  | Power User | Admin |
|----------------------|------------|-------|
| Physical Inventory   | ✓          | ✓     |
| Pending Outbound     | ✓          | ✓     |
| Dump IMEI           | ✓          | ✓     |
| Outbound IMEIs      | ✗          | ✓     |
| Quick Insights      | ✗          | ✓     |
| Movement Log        | ✗          | ✓     |
| Admin Panel         | ✗          | ✓     |

## Security Features

✓ **OAuth 2.0 Authentication** - Secure Google sign-in
✓ **Domain Restriction** - Only @scalmob.com emails allowed
✓ **Session Management** - Secure HTTP-only cookies
✓ **Role-Based Access Control** - Granular permissions
✓ **API Endpoint Protection** - All routes require authentication
✓ **Active User Validation** - Deactivated users cannot access

## Troubleshooting

### "Unauthorized" Error
- **Cause**: Your email is not @scalmob.com
- **Solution**: Use a valid @scalmob.com Google account

### "Authentication Failed" Error
- **Cause**: OAuth credentials are incorrect or missing
- **Solution**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in .env

### "Session Error" after Login
- **Cause**: `SESSION_SECRET` is missing or invalid
- **Solution**: Add a strong random string to `SESSION_SECRET` in .env

### Can't Access Admin Panel
- **Cause**: Your email is not in `ADMIN_EMAILS`
- **Solution**: Add your email to `ADMIN_EMAILS` in .env and restart the server

### Redirect URI Mismatch
- **Cause**: Callback URL doesn't match Google Cloud Console
- **Solution**: Ensure `GOOGLE_CALLBACK_URL` matches the authorized redirect URIs

## Production Deployment Checklist

Before deploying to production:

- [ ] Update `GOOGLE_CALLBACK_URL` to production URL
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Generate new strong `SESSION_SECRET` for production
- [ ] Set `NODE_ENV=production`
- [ ] Configure `SESSION_SECRET` securely (use environment variables)
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Review and update `ADMIN_EMAILS` list
- [ ] Test authentication flow on production
- [ ] Test role permissions on production
- [ ] Enable Google Workspace domain restriction
- [ ] Set up session storage with PostgreSQL (for multiple servers)

## Support

If you encounter issues:
1. Check the server console for error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations have been run: `npm run db:push`
4. Contact the development team for assistance

## Additional Notes

- Users are automatically created on first login
- User roles can be changed anytime by admins
- Sessions expire after 7 days of inactivity
- Deactivated users are logged out immediately
