import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../../db/connection';
import { authenticateToken } from '../../../middleware/auth.middleware';

const router = Router();

/**
 * Admin endpoints for managing system shortcuts
 * These require admin privileges
 */

// Extended Request interface for admin user
interface AdminRequest extends Request {
  user?: {
    id: string;
    username: string;
    permissions: string;
    is_admin?: boolean;
  };
}

// Middleware to check admin access
const requireAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Check if user is admin in database
  try {
    const result = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [user.id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    user.is_admin = true;
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Apply authentication to all admin routes
router.use(authenticateToken);

/**
 * GET /api/admin/shortcuts
 * Get all system shortcuts with full details
 */
router.get('/', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const shortcuts = await db.query(`
      SELECT 
        s.id,
        s.shortcut,
        s.expansion,
        s.description,
        s.language,
        s.priority,
        s.is_active,
        c.name as category,
        c.label as category_label,
        s.created_at,
        s.updated_at
      FROM system_shortcuts s
      LEFT JOIN shortcut_categories c ON s.category_id = c.id
      ORDER BY c.display_order, s.shortcut
    `);

    const categories = await db.query(`
      SELECT 
        id,
        name,
        label,
        description,
        display_order,
        is_active,
        (SELECT COUNT(*) FROM system_shortcuts WHERE category_id = sc.id) as shortcut_count
      FROM shortcut_categories sc
      ORDER BY display_order
    `);

    res.json({
      shortcuts: shortcuts.rows,
      categories: categories.rows
    });
  } catch (error: any) {
    console.error('Error fetching admin shortcuts:', error);
    res.status(500).json({ error: 'Failed to fetch shortcuts' });
  }
});

/**
 * POST /api/admin/shortcuts
 * Add a new system shortcut
 */
router.post('/', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { shortcut, expansion, category, description, is_active = true } = req.body;

    // Validate required fields
    if (!shortcut || !expansion || !category) {
      return res.status(400).json({ 
        error: 'Shortcut, expansion, and category are required' 
      });
    }

    // Get category ID
    const categoryResult = await db.query(
      'SELECT id FROM shortcut_categories WHERE name = $1',
      [category]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const categoryId = categoryResult.rows[0].id;

    // Check for duplicates
    const existing = await db.query(
      'SELECT id FROM system_shortcuts WHERE shortcut = $1',
      [shortcut]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Shortcut already exists',
        suggestion: generateSuggestion(shortcut)
      });
    }

    // Insert new shortcut
    const result = await db.query(`
      INSERT INTO system_shortcuts (shortcut, expansion, category_id, description, is_active, language)
      VALUES ($1, $2, $3, $4, $5, 'he')
      RETURNING id, shortcut, expansion, description, is_active, created_at
    `, [shortcut, expansion, categoryId, description, is_active]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error adding system shortcut:', error);
    res.status(500).json({ error: 'Failed to add shortcut' });
  }
});

/**
 * PUT /api/admin/shortcuts/:id
 * Update a system shortcut
 */
router.put('/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { shortcut, expansion, category, description, is_active } = req.body;

    // Get category ID if category provided
    let categoryId;
    if (category) {
      const categoryResult = await db.query(
        'SELECT id FROM shortcut_categories WHERE name = $1',
        [category]
      );
      
      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      
      categoryId = categoryResult.rows[0].id;
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (shortcut !== undefined) {
      updates.push(`shortcut = $${paramCount++}`);
      values.push(shortcut);
    }
    if (expansion !== undefined) {
      updates.push(`expansion = $${paramCount++}`);
      values.push(expansion);
    }
    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramCount++}`);
      values.push(categoryId);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(`
      UPDATE system_shortcuts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shortcut not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating system shortcut:', error);
    res.status(500).json({ error: 'Failed to update shortcut' });
  }
});

/**
 * DELETE /api/admin/shortcuts/:id
 * Delete a system shortcut
 */
router.delete('/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM system_shortcuts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shortcut not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting system shortcut:', error);
    res.status(500).json({ error: 'Failed to delete shortcut' });
  }
});

/**
 * POST /api/admin/shortcuts/categories
 * Add a new category
 */
router.post('/categories', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { name, label, description = '', is_active = true } = req.body;

    if (!name || !label) {
      return res.status(400).json({ 
        error: 'Name and label are required' 
      });
    }

    // Check for duplicates
    const existing = await db.query(
      'SELECT id FROM shortcut_categories WHERE name = $1',
      [name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    // Get next display order
    const orderResult = await db.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM shortcut_categories'
    );
    const displayOrder = orderResult.rows[0].next_order;

    const result = await db.query(`
      INSERT INTO shortcut_categories (name, label, description, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, label, description, displayOrder, is_active]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

/**
 * PUT /api/admin/shortcuts/categories/:id
 * Update a category
 */
router.put('/categories/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, label, description, is_active } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (label !== undefined) {
      updates.push(`label = $${paramCount++}`);
      values.push(label);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    values.push(id);

    const result = await db.query(`
      UPDATE shortcut_categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/admin/shortcuts/categories/:id
 * Delete a category (only if empty)
 */
router.delete('/categories/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category has shortcuts
    const shortcutsCount = await db.query(
      'SELECT COUNT(*) as count FROM system_shortcuts WHERE category_id = $1',
      [id]
    );

    if (parseInt(shortcutsCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing shortcuts' 
      });
    }

    const result = await db.query(
      'DELETE FROM shortcut_categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Helper function to generate suggestions for duplicate shortcuts
function generateSuggestion(original: string): string {
  // Simple suggestion - add a number
  return original + '2';
}

export default router;