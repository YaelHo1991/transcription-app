import { Router } from 'express';
import { mockUsers, mockLicenses } from './mock-data';
import { developmentHTML } from './development-html';

const router = Router();

// Dev tools main page - serve HTML
router.get('/', (req, res) => {
  // Send the complete development HTML
  res.send(developmentHTML);
});

// API endpoint for mock users (used by dev dashboard)
router.get('/api/users', (req, res) => {
  res.json(mockUsers);
});

// API endpoint for mock licenses
router.get('/api/licenses', (req, res) => {
  res.json(mockLicenses);
});

// API endpoint for user by ID
router.get('/api/users/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// API endpoint for system stats
router.get('/api/stats', (req, res) => {
  res.json({
    totalUsers: mockUsers.length,
    adminUsers: mockUsers.filter(u => u.is_admin).length,
    crmUsers: mockUsers.filter(u => u.permissions.includes('A')).length,
    transcribers: mockUsers.filter(u => u.permissions.includes('D')).length,
    activeLicenses: mockLicenses.filter(l => l.status === 'active').length
  });
});

export default router;