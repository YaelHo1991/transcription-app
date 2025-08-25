import { Router, Request, Response } from 'express';
import { db } from '../../db/connection';

const router = Router();

/**
 * Advanced shortcuts admin routes for transformations and exceptions
 */

// Get all category transformations
router.get('/transformations', async (req: Request, res: Response) => {
  try {
    const transformations = await db.query(`
      SELECT 
        ct.*,
        sc.name as category_name,
        sc.label as category_label
      FROM category_transformations ct
      JOIN shortcut_categories sc ON ct.category_id = sc.id
      ORDER BY sc.display_order, ct.priority
    `);

    res.json(transformations.rows);
  } catch (error) {
    console.error('Error fetching transformations:', error);
    res.status(500).json({ error: 'Failed to fetch transformations' });
  }
});

// Add or update category transformation
router.post('/transformations', async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      prefix,
      suffix,
      transformation_template,
      apply_with_space,
      apply_with_comma,
      apply_with_period,
      transformation_type,
      priority = 0,
      is_active = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO category_transformations (
        category_id, prefix, suffix, transformation_template, apply_with_space, apply_with_comma,
        apply_with_period, transformation_type, priority, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      category_id, prefix, suffix, transformation_template, apply_with_space, apply_with_comma,
      apply_with_period, transformation_type, priority, is_active
    ]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding transformation:', error);
    res.status(500).json({ error: 'Failed to add transformation' });
  }
});

// Update transformation
router.put('/transformations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = [
      'prefix', 'suffix', 'transformation_template', 'apply_with_space', 'apply_with_comma',
      'apply_with_period', 'transformation_type', 'priority', 'is_active'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.query(`
      UPDATE category_transformations
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating transformation:', error);
    res.status(500).json({ error: 'Failed to update transformation' });
  }
});

// Delete transformation
router.delete('/transformations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.query('DELETE FROM category_transformations WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transformation:', error);
    res.status(500).json({ error: 'Failed to delete transformation' });
  }
});

// Get shortcut exceptions
router.get('/exceptions', async (req: Request, res: Response) => {
  try {
    const exceptions = await db.query(`
      SELECT 
        se.*,
        ss.shortcut,
        ss.expansion,
        ct.prefix as transformation_prefix,
        ct.suffix as transformation_suffix,
        ct.transformation_type
      FROM shortcut_exceptions se
      JOIN system_shortcuts ss ON se.shortcut_id = ss.id
      LEFT JOIN category_transformations ct ON se.transformation_id = ct.id
      ORDER BY ss.shortcut
    `);

    res.json(exceptions.rows);
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
});

// Add exception
router.post('/exceptions', async (req: Request, res: Response) => {
  try {
    const {
      shortcut_id,
      transformation_id,
      exception_type,
      custom_prefix,
      custom_suffix,
      notes,
      is_active = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO shortcut_exceptions (
        shortcut_id, transformation_id, exception_type,
        custom_prefix, custom_suffix, notes, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      shortcut_id, transformation_id, exception_type,
      custom_prefix, custom_suffix, notes, is_active
    ]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding exception:', error);
    res.status(500).json({ error: 'Failed to add exception' });
  }
});

// Delete exception
router.delete('/exceptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.query('DELETE FROM shortcut_exceptions WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exception:', error);
    res.status(500).json({ error: 'Failed to delete exception' });
  }
});

// Get multiple categories for a shortcut
router.get('/shortcuts/:shortcut_id/categories', async (req: Request, res: Response) => {
  try {
    const { shortcut_id } = req.params;
    
    const categories = await db.query(`
      SELECT 
        sc.id,
        sc.name,
        sc.label,
        scm.is_primary
      FROM shortcut_category_mappings scm
      JOIN shortcut_categories sc ON scm.category_id = sc.id
      WHERE scm.shortcut_id = $1
      ORDER BY scm.is_primary DESC, sc.display_order
    `, [shortcut_id]);

    res.json(categories.rows);
  } catch (error) {
    console.error('Error fetching shortcut categories:', error);
    res.status(500).json({ error: 'Failed to fetch shortcut categories' });
  }
});

// Add category to shortcut
router.post('/shortcuts/:shortcut_id/categories', async (req: Request, res: Response) => {
  try {
    const { shortcut_id } = req.params;
    const { category_id, is_primary = false } = req.body;

    // If setting as primary, unset other primaries
    if (is_primary) {
      await db.query(
        'UPDATE shortcut_category_mappings SET is_primary = false WHERE shortcut_id = $1',
        [shortcut_id]
      );
    }

    await db.query(`
      INSERT INTO shortcut_category_mappings (shortcut_id, category_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (shortcut_id, category_id) 
      DO UPDATE SET is_primary = EXCLUDED.is_primary
    `, [shortcut_id, category_id, is_primary]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding category to shortcut:', error);
    res.status(500).json({ error: 'Failed to add category to shortcut' });
  }
});

// Remove category from shortcut
router.delete('/shortcuts/:shortcut_id/categories/:category_id', async (req: Request, res: Response) => {
  try {
    const { shortcut_id, category_id } = req.params;
    
    await db.query(
      'DELETE FROM shortcut_category_mappings WHERE shortcut_id = $1 AND category_id = $2',
      [shortcut_id, category_id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing category from shortcut:', error);
    res.status(500).json({ error: 'Failed to remove category from shortcut' });
  }
});

// Test transformation application
router.post('/test-transformation', async (req: Request, res: Response) => {
  try {
    const { shortcut, context = '' } = req.body;
    
    const result = await db.query(
      'SELECT apply_category_transformations($1, (SELECT expansion FROM system_shortcuts WHERE shortcut = $1), $2) as transformed',
      [shortcut, context]
    );

    if (result.rows.length > 0) {
      res.json({ 
        original: shortcut,
        transformed: result.rows[0].transformed,
        context: context
      });
    } else {
      res.status(404).json({ error: 'Shortcut not found' });
    }
  } catch (error) {
    console.error('Error testing transformation:', error);
    res.status(500).json({ error: 'Failed to test transformation' });
  }
});

// Update categories with labels
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, label, is_active } = req.body;
    
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
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    await db.query(`
      UPDATE shortcut_categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

export default router;