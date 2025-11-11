import { Router } from 'express';
import passport from '../config/passport';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Always show account selector
  })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback handler
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=auth_failed',
    successRedirect: '/',
  })
);

/**
 * GET /auth/me
 * Get current logged-in user info
 */
router.get('/me', (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  const { id, email, name, role, isActive, createdAt, lastLoginAt } = req.user;

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
  });
});

/**
 * POST /auth/logout
 * Log out current user
 */
router.post('/logout', requireAuth, (req, res, next) => {
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
    authenticated: req.isAuthenticated(),
    role: req.user?.role || null,
  });
});

export default router;
