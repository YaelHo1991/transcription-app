import { Router } from 'express';
import { mockUsers, mockLicenses } from './mock-data';
import { developmentHTML } from './development-html';
import { db } from '../db/connection';

const router = Router();

// Dev tools main page - serve HTML
router.get('/', (req, res) => {
  // Send the complete development HTML
  res.send(developmentHTML);
});

// API endpoint for real database users (used by dev dashboard)
router.get('/api/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        username,
        full_name,
        email,
        permissions,
        personal_company,
        transcriber_code,
        plain_password,
        created_at,
        last_login,
        is_active,
        is_admin
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fallback to mock data if database error
    res.json(mockUsers);
  }
});

// API endpoint for mock licenses
router.get('/api/licenses', (req, res) => {
  res.json(mockLicenses);
});

// API endpoint for user by ID
router.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE endpoint for removing users
router.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length > 0) {
      console.log(`✅ User deleted: ${result.rows[0].email}`);
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// API endpoint for system stats - use real data
router.get('/api/stats', async (req, res) => {
  try {
    const users = await db.query('SELECT * FROM users');
    const userRows = users.rows;
    
    res.json({
      totalUsers: userRows.length,
      adminUsers: userRows.filter(u => u.is_admin).length,
      crmUsers: userRows.filter(u => u.permissions && u.permissions.includes('A')).length,
      transcribers: userRows.filter(u => u.permissions && u.permissions.includes('D')).length,
      activeLicenses: userRows.filter(u => u.is_active).length
    });
  } catch (error) {
    // Fallback to mock data
    res.json({
      totalUsers: mockUsers.length,
      adminUsers: mockUsers.filter(u => u.is_admin).length,
      crmUsers: mockUsers.filter(u => u.permissions.includes('A')).length,
      transcribers: mockUsers.filter(u => u.permissions.includes('D')).length,
      activeLicenses: mockLicenses.filter(l => l.status === 'active').length
    });
  }
});

export default router;