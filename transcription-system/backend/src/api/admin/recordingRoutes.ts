import { Router, Request, Response } from 'express';
import { db } from '../../db/connection';

const router = Router();

// Note: Authentication and admin check are already handled by the parent router in routes.ts

// Update user recording permissions
router.put('/users/:userId/recording', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { recording_enabled, recording_pages } = req.body;
    
    let query = 'UPDATE users SET ';
    const values: any[] = [];
    const updates: string[] = [];
    let valueIndex = 1;
    
    if (recording_enabled !== undefined) {
      updates.push(`recording_enabled = $${valueIndex}`);
      values.push(recording_enabled);
      valueIndex++;
    }
    
    if (recording_pages !== undefined) {
      updates.push(`recording_pages = $${valueIndex}::jsonb`);
      values.push(JSON.stringify(recording_pages));
      valueIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    query += updates.join(', ');
    query += ` WHERE id = $${valueIndex}`;
    values.push(userId);
    
    await db.query(query, values);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recording permissions:', error);
    res.status(500).json({ error: 'Failed to update recording permissions' });
  }
});

// Get user recording permissions
// Allow users to get their own permissions OR admins to get any user's permissions
router.get('/users/:userId/recording', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUser = (req as any).user;
    
    // Check if user is getting their own permissions or if they're an admin
    const isOwnUser = requestingUser && requestingUser.id === userId;
    const isAdmin = requestingUser && requestingUser.is_admin;
    
    if (!isOwnUser && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await db.query(
      'SELECT recording_enabled, recording_pages FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      recording_enabled: user.recording_enabled || false,
      recording_pages: user.recording_pages || []
    });
  } catch (error) {
    console.error('Error getting recording permissions:', error);
    res.status(500).json({ error: 'Failed to get recording permissions' });
  }
});

export default router;