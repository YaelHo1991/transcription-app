import { db } from '../db/connection';
import {
  SystemShortcut,
  UserShortcut,
  UserShortcutQuota,
  CombinedShortcut,
  ShortcutsResponse,
  AddShortcutRequest,
  UpdateShortcutRequest,
  ShortcutError
} from '../models/shortcut.model';

export class ShortcutService {
  /**
   * Get all shortcuts for a user (system + personal)
   */
  async getUserShortcuts(userId: string): Promise<ShortcutsResponse> {
    try {
      // Check if user is admin (based on is_admin flag only)
      const userQuery = await db.query(`
        SELECT is_admin
        FROM users
        WHERE id = $1
      `, [userId]);

      const user = userQuery.rows[0];
      const isAdmin = user && user.is_admin === true;

      console.log(`[ShortcutService] User ${userId} is_admin:`, user?.is_admin, '-> isAdmin:', isAdmin);

      // Get system shortcuts with categories - ONLY BASE SHORTCUTS, NOT AUTO-GENERATED
      const systemShortcutsQuery = await db.query(`
        SELECT
          s.shortcut,
          s.expansion,
          s.description,
          s.language,
          s.priority,
          c.name as category,
          'system' as source
        FROM system_shortcuts s
        LEFT JOIN shortcut_categories c ON s.category_id = c.id
        WHERE s.is_active = true
        AND (s.is_auto_generated = false OR s.is_auto_generated IS NULL)
        ORDER BY s.priority DESC, s.shortcut
      `);

      // Get user's personal shortcuts
      const userShortcutsQuery = await db.query(`
        SELECT 
          shortcut,
          expansion,
          language,
          'user' as source,
          'custom' as category
        FROM user_shortcuts
        WHERE user_id = $1 AND is_active = true
        ORDER BY shortcut
      `, [userId]);

      // Get user's quota
      const quotaQuery = await db.query(`
        SELECT max_shortcuts, used_shortcuts
        FROM user_shortcut_quotas
        WHERE user_id = $1
      `, [userId]);

      // Initialize quota if not exists
      let quota = quotaQuery.rows[0];
      if (!quota) {
        await db.query(`
          INSERT INTO user_shortcut_quotas (user_id, max_shortcuts, used_shortcuts)
          VALUES ($1, 100, 0)
          ON CONFLICT (user_id) DO NOTHING
        `, [userId]);
        quota = { max_shortcuts: 100, used_shortcuts: 0 };
      }

      // Get categories
      const categoriesQuery = await db.query(`
        SELECT name, display_order
        FROM shortcut_categories
        WHERE is_active = true
        ORDER BY display_order
      `);

      // Combine shortcuts (user shortcuts override system shortcuts)
      const shortcutMap = new Map<string, CombinedShortcut>();
      
      // Add system shortcuts
      systemShortcutsQuery.rows.forEach(row => {
        shortcutMap.set(row.shortcut, {
          shortcut: row.shortcut,
          expansion: row.expansion,
          source: row.source,
          category: row.category,
          description: row.description,
          language: row.language
        });
      });

      // Override with user shortcuts
      userShortcutsQuery.rows.forEach(row => {
        shortcutMap.set(row.shortcut, {
          shortcut: row.shortcut,
          expansion: row.expansion,
          source: row.source,
          category: row.category,
          language: row.language
        });
      });

      // Return unlimited quota for admin users
      const quotaResponse = isAdmin
        ? {
            max: 999999, // Effectively unlimited
            used: userShortcutsQuery.rows.length,
            remaining: 999999
          }
        : {
            max: quota.max_shortcuts,
            used: quota.used_shortcuts,
            remaining: quota.max_shortcuts - quota.used_shortcuts
          };

      console.log(`[ShortcutService] Returning quota for user ${userId}:`, quotaResponse);

      return {
        shortcuts: Array.from(shortcutMap.values()),
        quota: quotaResponse,
        categories: categoriesQuery.rows.map(r => r.name)
      };
    } catch (error) {
      console.error('Error getting user shortcuts:', error);
      throw error;
    }
  }

  /**
   * Add a personal shortcut for a user
   */
  async addUserShortcut(userId: string, request: AddShortcutRequest): Promise<UserShortcut> {
    try {
      // Check if user is admin (based on is_admin flag only)
      const userQuery = await db.query(`
        SELECT is_admin
        FROM users
        WHERE id = $1
      `, [userId]);

      const user = userQuery.rows[0];
      const isAdmin = user && user.is_admin === true;

      // Check quota (skip for admin users)
      if (!isAdmin) {
        const quotaQuery = await db.query(`
          SELECT max_shortcuts, used_shortcuts
          FROM user_shortcut_quotas
          WHERE user_id = $1
        `, [userId]);

        const quota = quotaQuery.rows[0];
        if (!quota) {
          // Initialize quota
          await db.query(`
            INSERT INTO user_shortcut_quotas (user_id)
            VALUES ($1)
          `, [userId]);
        }

        const { max_shortcuts = 100, used_shortcuts = 0 } = quota || {};

        if (used_shortcuts >= max_shortcuts) {
          throw {
            code: 'QUOTA_EXCEEDED',
            message: `Quota exceeded: You can only have ${max_shortcuts} personal shortcuts`
          } as ShortcutError;
        }
      }

      // Check if shortcut already exists for this user
      const existingUserQuery = await db.query(`
        SELECT id FROM user_shortcuts
        WHERE user_id = $1 AND shortcut = $2
      `, [userId, request.shortcut]);

      if (existingUserQuery.rows.length > 0) {
        throw {
          code: 'DUPLICATE_SHORTCUT',
          message: `קיצור "${request.shortcut}" כבר קיים`
        } as ShortcutError;
      }

      // Check if shortcut exists as system shortcut
      // TODO: Implement override functionality with allowOverride flag
      const existingSystemQuery = await db.query(`
        SELECT id, expansion FROM system_shortcuts
        WHERE shortcut = $1 AND is_active = true
      `, [request.shortcut]);

      // For now, always allow override (TODO: Check request.allowOverride when implemented)
      if (existingSystemQuery.rows.length > 0) {
        console.log(`User overriding system shortcut: ${request.shortcut}`);
      }

      // Add the shortcut (note: description column doesn't exist in DB yet)
      const result = await db.query(`
        INSERT INTO user_shortcuts (
          user_id, shortcut, expansion, language
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        userId,
        request.shortcut,
        request.expansion,
        request.language || 'he'
      ]);

      // Log usage
      await this.logShortcutUsage(userId, request.shortcut, request.expansion, 'user');

      return result.rows[0];
    } catch (error) {
      console.error('Error adding user shortcut:', error);
      throw error;
    }
  }

  /**
   * Update a user's personal shortcut
   */
  async updateUserShortcut(
    userId: string, 
    shortcutId: string, 
    request: UpdateShortcutRequest
  ): Promise<UserShortcut> {
    try {
      // Verify ownership
      const ownershipQuery = await db.query(`
        SELECT id FROM user_shortcuts
        WHERE id = $1 AND user_id = $2
      `, [shortcutId, userId]);

      if (ownershipQuery.rows.length === 0) {
        throw {
          code: 'NOT_FOUND',
          message: 'Shortcut not found or you do not have permission to edit it'
        } as ShortcutError;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (request.expansion !== undefined) {
        updates.push(`expansion = $${paramCount++}`);
        values.push(request.expansion);
      }

      if (request.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(request.is_active);
      }

      updates.push(`updated_at = NOW()`);

      // Add IDs to values
      values.push(shortcutId);
      values.push(userId);

      const result = await db.query(`
        UPDATE user_shortcuts
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating user shortcut:', error);
      throw error;
    }
  }

  /**
   * Delete a user's personal shortcut by ID
   */
  async deleteUserShortcut(userId: string, shortcutId: string): Promise<void> {
    try {
      const result = await db.query(`
        DELETE FROM user_shortcuts
        WHERE id = $1 AND user_id = $2
      `, [shortcutId, userId]);

      if (result.rowCount === 0) {
        throw {
          code: 'NOT_FOUND',
          message: 'Shortcut not found or you do not have permission to delete it'
        } as ShortcutError;
      }
    } catch (error) {
      console.error('Error deleting user shortcut:', error);
      throw error;
    }
  }

  /**
   * Delete a user's personal shortcut by shortcut text
   */
  async deleteUserShortcutByText(userId: string, shortcutText: string): Promise<void> {
    try {
      const result = await db.query(`
        DELETE FROM user_shortcuts
        WHERE shortcut = $1 AND user_id = $2
      `, [shortcutText, userId]);

      if (result.rowCount === 0) {
        throw {
          code: 'NOT_FOUND',
          message: 'Shortcut not found or you do not have permission to delete it'
        } as ShortcutError;
      }
    } catch (error) {
      console.error('Error deleting user shortcut by text:', error);
      throw error;
    }
  }

  /**
   * Get user's quota information
   */
  async getUserQuota(userId: string): Promise<UserShortcutQuota> {
    try {
      const result = await db.query(`
        SELECT * FROM user_shortcut_quotas
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        // Initialize quota
        const newQuota = await db.query(`
          INSERT INTO user_shortcut_quotas (user_id, max_shortcuts, used_shortcuts)
          VALUES ($1, 100, 0)
          RETURNING *
        `, [userId]);
        return newQuota.rows[0];
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user quota:', error);
      throw error;
    }
  }

  /**
   * Log shortcut usage for analytics
   */
  async logShortcutUsage(
    userId: string,
    shortcutText: string,
    expansionText: string,
    source: 'system' | 'user'
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO shortcut_usage_stats (
          user_id, shortcut_text, expansion_text, source
        ) VALUES ($1, $2, $3, $4)
      `, [userId, shortcutText, expansionText, source]);
    } catch (error) {
      // Don't throw on logging errors
      console.error('Error logging shortcut usage:', error);
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<any[]> {
    try {
      const result = await db.query(`
        SELECT id, name, description, display_order
        FROM shortcut_categories
        WHERE is_active = true
        ORDER BY display_order
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  /**
   * Get system shortcuts only (for admin)
   */
  async getSystemShortcuts(): Promise<SystemShortcut[]> {
    try {
      const result = await db.query(`
        SELECT s.*, c.name as category_name
        FROM system_shortcuts s
        LEFT JOIN shortcut_categories c ON s.category_id = c.id
        WHERE s.is_active = true
        AND (s.is_auto_generated = false OR s.is_auto_generated IS NULL)
        ORDER BY c.display_order, s.priority DESC, s.shortcut
      `);

      return result.rows;
    } catch (error) {
      console.error('Error getting system shortcuts:', error);
      throw error;
    }
  }

  /**
   * Search shortcuts
   */
  async searchShortcuts(userId: string, query: string): Promise<CombinedShortcut[]> {
    try {
      const searchPattern = `%${query}%`;

      // Search in both system and user shortcuts
      const result = await db.query(`
        WITH combined_shortcuts AS (
          SELECT 
            s.shortcut,
            s.expansion,
            s.description,
            s.language,
            c.name as category,
            'system' as source,
            s.priority
          FROM system_shortcuts s
          LEFT JOIN shortcut_categories c ON s.category_id = c.id
          WHERE s.is_active = true
            AND (s.shortcut ILIKE $2 OR s.expansion ILIKE $2 OR s.description ILIKE $2)
          
          UNION ALL
          
          SELECT 
            shortcut,
            expansion,
            NULL as description,
            language,
            'custom' as category,
            'user' as source,
            1000 as priority
          FROM user_shortcuts
          WHERE user_id = $1 
            AND is_active = true
            AND (shortcut ILIKE $2 OR expansion ILIKE $2)
        )
        SELECT * FROM combined_shortcuts
        ORDER BY 
          CASE source WHEN 'user' THEN 0 ELSE 1 END,
          priority DESC,
          shortcut
        LIMIT 50
      `, [userId, searchPattern]);

      return result.rows.map(row => ({
        shortcut: row.shortcut,
        expansion: row.expansion,
        source: row.source,
        category: row.category,
        description: row.description,
        language: row.language
      }));
    } catch (error) {
      console.error('Error searching shortcuts:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const shortcutService = new ShortcutService();