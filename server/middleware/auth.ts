import { Request, Response, NextFunction } from 'express';
import { User } from '../db/schema';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string | null;
      googleId: string | null;
      role: string;
      isActive: boolean;
      createdAt: Date;
      lastLoginAt: Date | null;
      updatedAt: Date;
    }
  }
}

/**
 * Middleware to require authentication
 * Checks if user is logged in via session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }

  // Check if user account is active
  if (!req.user.isActive) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Your account has been deactivated'
    });
  }

  next();
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This action requires admin privileges'
    });
  }

  next();
}

/**
 * Middleware to validate email domain
 * Ensures only @scalmob.com emails can register/login
 */
export function validateEmailDomain(email: string): boolean {
  return email.endsWith('@scalmob.com');
}

/**
 * Middleware to check if email should be admin
 * Based on ADMIN_EMAILS environment variable
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  return adminEmails.includes(email);
}
