import { Router, Request, Response } from 'express';
import { db } from '../../db/connection';

const router = Router();

/**
 * Development admin routes for shortcuts - NO AUTHENTICATION REQUIRED
 * These are for development only
 */

// Get all system shortcuts
router.get('/shortcuts', async (req: Request, res: Response) => {
  try {
    const shortcuts = await db.query(`
      SELECT 
        s.id,
        s.shortcut,
        s.expansion,
        s.description,
        s.is_active,
        c.name as category,
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
        description,
        is_active,
        (SELECT COUNT(*) FROM system_shortcuts WHERE category_id = sc.id) as shortcut_count
      FROM shortcut_categories sc
      ORDER BY display_order
    `);

    res.json({
      shortcuts: shortcuts.rows,
      categories: categories.rows
    });
  } catch (error) {
    console.error('Error fetching shortcuts:', error);
    res.status(500).json({ error: 'Failed to fetch shortcuts' });
  }
});

// Add shortcut
router.post('/shortcuts', async (req: Request, res: Response) => {
  try {
    const { shortcut, expansion, category, description, is_active = true } = req.body;

    // Get category ID
    const categoryResult = await db.query(
      'SELECT id FROM shortcut_categories WHERE name = $1',
      [category]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const categoryId = categoryResult.rows[0].id;

    // Insert
    const result = await db.query(`
      INSERT INTO system_shortcuts (shortcut, expansion, category_id, description, is_active, language)
      VALUES ($1, $2, $3, $4, $5, 'he')
      ON CONFLICT (shortcut, language) DO UPDATE
      SET expansion = EXCLUDED.expansion,
          category_id = EXCLUDED.category_id,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [shortcut, expansion, categoryId, description, is_active]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding shortcut:', error);
    res.status(500).json({ error: 'Failed to add shortcut' });
  }
});

// Update shortcut
router.put('/shortcuts/:id', async (req: Request, res: Response) => {
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
      
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      }
    }

    // Build update
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
    
    // Use the original ID from the database, not the temporary frontend ID
    const findResult = await db.query(
      'SELECT id FROM system_shortcuts WHERE shortcut = $1',
      [req.body.originalShortcut || shortcut]
    );
    
    if (findResult.rows.length > 0) {
      values.push(findResult.rows[0].id);
      
      await db.query(`
        UPDATE system_shortcuts
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
      `, values);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Shortcut not found' });
    }
  } catch (error) {
    console.error('Error updating shortcut:', error);
    res.status(500).json({ error: 'Failed to update shortcut' });
  }
});

// Delete shortcut
router.delete('/shortcuts/:shortcut', async (req: Request, res: Response) => {
  try {
    const { shortcut } = req.params;
    
    const result = await db.query(
      'DELETE FROM system_shortcuts WHERE shortcut = $1 RETURNING id',
      [decodeURIComponent(shortcut)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shortcut not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shortcut:', error);
    res.status(500).json({ error: 'Failed to delete shortcut' });
  }
});

// Add category
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, label, is_active = true } = req.body;
    
    // Use label as description since we don't have a label column
    const result = await db.query(`
      INSERT INTO shortcut_categories (name, description, is_active, display_order)
      VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM shortcut_categories))
      ON CONFLICT (name) DO UPDATE
      SET description = EXCLUDED.description,
          is_active = EXCLUDED.is_active
      RETURNING id
    `, [name, label, is_active]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

export default router;