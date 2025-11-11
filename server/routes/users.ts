import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /users
 * Get all users (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users);

    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /users/:id/role
 * Update user role (admin only)
 */
router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['power_user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "power_user" or "admin"'
      });
    }

    // Prevent self-demotion from admin
    if (req.user!.id === userId && role !== 'admin') {
      return res.status(400).json({
        error: 'Cannot demote yourself',
        message: 'You cannot change your own admin role'
      });
    }

    const updatedUsers = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * PATCH /users/:id/status
 * Activate or deactivate user (admin only)
 */
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'isActive must be a boolean value'
      });
    }

    // Prevent self-deactivation
    if (req.user!.id === userId && !isActive) {
      return res.status(400).json({
        error: 'Cannot deactivate yourself',
        message: 'You cannot deactivate your own account'
      });
    }

    const updatedUsers = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * GET /users/stats
 * Get user statistics (admin only)
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select().from(users);

    const stats = {
      total: allUsers.length,
      active: allUsers.filter(u => u.isActive).length,
      inactive: allUsers.filter(u => !u.isActive).length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      powerUsers: allUsers.filter(u => u.role === 'power_user').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;
