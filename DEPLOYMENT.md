# Railway Deployment Guide

## Environment Variables Required

The application will now deploy on Railway even without all environment variables, but to enable full functionality, you need to set the following:

### Required for Google OAuth Authentication

1. **GOOGLE_CLIENT_ID** - Your Google OAuth client ID
   - Format: `YOUR_CLIENT_ID.apps.googleusercontent.com`
   - Get from: Google Cloud Console > APIs & Services > Credentials

2. **GOOGLE_CLIENT_SECRET** - Your Google OAuth client secret
   - Format: `GOCSPX-XXXXXXXXXXXXXXXXXXXX`
   - Get from: Google Cloud Console > APIs & Services > Credentials

3. **GOOGLE_CALLBACK_URL** - The OAuth callback URL
   - Format: `https://YOUR-RAILWAY-APP-URL/auth/google/callback`
   - Example: `https://web-production-5bf6.up.railway.app/auth/google/callback`

### Required for Session Management

4. **SESSION_SECRET** - A random secret for signing session cookies
   - Generate one using: `node scripts/generate-secret.js`
   - Example: `643a094469d4637bd413cba578078018bc4d8f15bef3f45be722c34b600d4a13`

### Optional but Recommended

5. **ADMIN_EMAILS** - Comma-separated list of admin email addresses
   - Example: `brandon@scalmob.com,admin@scalmob.com`

6. **DATABASE_URL** - PostgreSQL connection string (if not set, uses in-memory storage)
   - Format: `postgresql://user:password@host:port/database?sslmode=require`

## Checking Deployment Status

After deployment, you can check the configuration status at:

- **Health Check**: `https://YOUR-APP-URL/health`
  - Shows which environment variables are configured
  - Indicates if OAuth is enabled or disabled
  - Shows database connection status

- **Auth Status**: `https://YOUR-APP-URL/auth/status`
  - Specific authentication system status
  - Shows if OAuth is available

## Deployment Steps

1. **Set Environment Variables in Railway**:
   - Go to your Railway project
   - Click on your service
   - Go to the "Variables" tab
   - Add each environment variable listed above

2. **Verify Variables are Set**:
   - Railway should automatically redeploy when you add variables
   - Check the deployment logs for configuration messages

3. **Test the Deployment**:
   - Visit `https://YOUR-APP-URL/health` to verify configuration
   - If OAuth is configured, test login at `https://YOUR-APP-URL/`

## Troubleshooting

### OAuth Not Working
- Check that all three OAuth variables are set (CLIENT_ID, CLIENT_SECRET, CALLBACK_URL)
- Ensure the callback URL matches exactly what's configured in Google Cloud Console
- The callback URL should use your Railway app's production URL

### Session Issues
- Make sure SESSION_SECRET is set
- Without it, sessions will be lost on every server restart

### Database Connection
- DATABASE_URL is optional - the app works without it but with limited functionality
- If set, ensure it's a valid PostgreSQL connection string with SSL enabled

## Running Without Authentication (Development Mode)

If OAuth environment variables are not set, the application will:
- Run without authentication requirements
- Show warnings in the console
- Allow access to all endpoints without login
- Display a message that authentication is disabled

This is useful for testing the deployment before configuring OAuth.