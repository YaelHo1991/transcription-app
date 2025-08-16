import { db } from '../db/connection';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  settings: Record<string, any>;
}

export class ProjectModel {
  static async create(userId: string, name: string, description?: string): Promise<Project> {
    const query = `
      INSERT INTO projects (user_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [userId, name, description]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Project[]> {
    const query = `
      SELECT * FROM projects 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const { name, description, settings, is_active } = updates;
    const query = `
      UPDATE projects 
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          settings = COALESCE($4, settings),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, name, description, settings, is_active]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'UPDATE projects SET is_active = false WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }
}