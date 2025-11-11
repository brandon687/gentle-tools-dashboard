import { Router } from 'express';
import passport, { googleOAuthEnabled } from '../config/passport';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 */
router.get('/google', (req, res, next) => {
  if (!googleOAuthEnabled) {
    return res.status(503).json({
      error: 'Google OAuth is not configured',
      message: 'Please configure Google OAuth environment variables to enable authentication.',
      required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL']
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Always show account selector
  })(req, res, next);
});

/**
 * GET /auth/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback', (req, res, next) => {
  if (!googleOAuthEnabled) {
    return res.redirect('/login?error=oauth_not_configured');
  }

  console.log('📥 OAuth callback received');
  console.log('   Session ID before auth:', req.sessionID);
  console.log('   Session data before auth:', JSON.stringify(req.session));
  console.log('   Is authenticated before:', req.isAuthenticated());

  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('❌ OAuth authentication error:', err);
      return res.redirect('/login?error=auth_failed');
    }

    if (!user) {
      console.error('❌ No user returned from OAuth');
      console.error('   Info:', info);
      return res.redirect('/login?error=auth_failed');
    }

    console.log('✅ OAuth authentication successful for user:', user.email);

    req.logIn(user, (err: any) => {
      if (err) {
        console.error('❌ Error during req.logIn:', err);
        return next(err);
      }

      console.log('✅ User logged in successfully');
      console.log('   Session ID after login:', req.sessionID);
      console.log('   Session data after login:', JSON.stringify(req.session));
      console.log('   Is authenticated after:', req.isAuthenticated());
      console.log('   User in session:', req.user?.email);

      // Force session save before redirect
      req.session.save((err: any) => {
        if (err) {
          console.error('❌ Error saving session:', err);
          return next(err);
        }

        console.log('✅ Session saved successfully, redirecting to /');
        res.redirect('/');
      });
    });
  })(req, res, next);
});

/**
 * GET /auth/me
 * Get current logged-in user info
 */
router.get('/me', (req, res) => {
  console.log('🔍 /auth/me endpoint called');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session data:', JSON.stringify(req.session));
  console.log('   Is authenticated:', req.isAuthenticated());
  console.log('   User:', req.user?.email || 'No user');
  console.log('   Cookies:', req.headers.cookie);

  // If OAuth is disabled, return a mock user for development
  if (!googleOAuthEnabled) {
    return res.json({
      authenticated: false,
      user: null,
      oauthEnabled: false,
      message: 'Authentication is disabled. Running in development mode without OAuth.'
    });
  }

  if (!req.isAuthenticated() || !req.user) {
    console.log('❌ User not authenticated in /auth/me');
    return res.json({
      authenticated: false,
      user: null,
      oauthEnabled: true
    });
  }

  const { id, email, name, role, isActive, createdAt, lastLoginAt } = req.user;

  console.log('✅ User authenticated in /auth/me:', email);

  res.json({
    authenticated: true,
    user: {
      id,
      email,
      name,
      role,
      isActive,
      createdAt,
      lastLoginAt,
    },
    oauthEnabled: true
  });
});

/**
 * POST /auth/logout
 * Log out current user
 */
router.post('/logout', (req, res, next) => {
  if (!googleOAuthEnabled) {
    return res.json({ success: true, message: 'No authentication to log out from' });
  }

  if (!req.isAuthenticated()) {
    return res.json({ success: true, message: 'Not logged in' });
  }

  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }

      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

/**
 * GET /auth/check
 * Simple authentication check endpoint
 */
router.get('/check', (req, res) => {
  res.json({
    authenticated: googleOAuthEnabled ? req.isAuthenticated() : false,
    role: req.user?.role || null,
    oauthEnabled: googleOAuthEnabled
  });
});

/**
 * GET /auth/status
 * Get authentication system status
 */
router.get('/status', (req, res) => {
  res.json({
    oauthEnabled: googleOAuthEnabled,
    sessionConfigured: !!process.env.SESSION_SECRET,
    adminEmailsConfigured: !!process.env.ADMIN_EMAILS,
    environment: process.env.NODE_ENV || 'development',
    message: googleOAuthEnabled
      ? 'Authentication system is fully configured'
      : 'Authentication is disabled. Configure Google OAuth to enable.'
  });
});

export default router;