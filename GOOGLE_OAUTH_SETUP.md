# Google OAuth Configuration Fix

## Current Status
✅ Railway is deployed and running successfully
✅ All environment variables are set correctly
❌ Google Cloud Console redirect URI is not configured properly

## Error: redirect_uri_mismatch

This error means the redirect URI in your Google Cloud Console doesn't match what your application is sending.

## Fix: Update Google Cloud Console

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Find your OAuth 2.0 Client ID:**
   - Look for: `239424835479-sp4ig5a15lrdnkcq6mdm5c42plck7s66.apps.googleusercontent.com`
   - Click on it to edit

3. **Under "Authorized JavaScript origins", add:**
   ```
   https://web-production-5bf6.up.railway.app
   ```

4. **Under "Authorized redirect URIs", add EXACTLY:**
   ```
   https://web-production-5bf6.up.railway.app/auth/google/callback
   ```

5. **For local development, also add:**
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/google/callback
     ```

6. **Click "SAVE"**

7. **Wait 5-10 seconds** for Google to propagate the changes

8. **Try logging in again:**
   https://web-production-5bf6.up.railway.app

## Important Notes

- The redirect URI must match **EXACTLY** - including:
  - Protocol (https://)
  - Domain (web-production-5bf6.up.railway.app)
  - Path (/auth/google/callback)
  - No trailing slashes
  - Case sensitive

- Make sure you're editing the correct OAuth client ID

- If you have multiple OAuth clients, make sure you're using the correct Client ID in Railway

## Verification

After saving, your Google OAuth configuration should have:

**Authorized JavaScript origins:**
- https://web-production-5bf6.up.railway.app
- http://localhost:3000 (optional, for local dev)

**Authorized redirect URIs:**
- https://web-production-5bf6.up.railway.app/auth/google/callback
- http://localhost:3000/auth/google/callback (optional, for local dev)

Once you save these changes, authentication will work immediately.
