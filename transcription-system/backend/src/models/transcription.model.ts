import { db } from '../db/connection';

export interface Transcription {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  current_version: number;
  created_at: Date;
  updated_at: Date;
  last_backup_at?: Date;
  is_active: boolean;
  auto_backup_enabled: boolean;
  settings: Record<string, any>;
}

export interface TranscriptionMedia {
  id: string;
  transcription_id: string;
  media_id: string;
  is_primary: boolean;
  linked_at: Date;
}

export class TranscriptionModel {
  static async create(
    userId: string, 
    title: string, 
    projectId?: string
  ): Promise<Transcription> {
    const query = `
      INSERT INTO transcriptions (user_id, title, project_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [userId, title, projectId]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Transcription | null> {
    const query = 'SELECT * FROM transcriptions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Transcription[]> {
    const query = `
      SELECT t.*, p.name as project_name 
      FROM transcriptions t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1 AND t.is_active = true
      ORDER BY t.updated_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findByProjectId(projectId: string): Promise<Transcription[]> {
    const query = `
      SELECT * FROM transcriptions 
      WHERE project_id = $1 AND is_active = true
      ORDER BY updated_at DESC
    `;
    const result = await db.query(query, [projectId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Transcription>): Promise<Transcription | null> {
    const { title, current_version, last_backup_at, auto_backup_enabled, settings } = updates;
    const query = `
      UPDATE transcriptions 
      SET title = COALESCE($2, title),
          current_version = COALESCE($3, current_version),
          last_backup_at = COALESCE($4, last_backup_at),
          auto_backup_enabled = COALESCE($5, auto_backup_enabled),
          settings = COALESCE($6, settings),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [
      id, title, current_version, last_backup_at, auto_backup_enabled, settings
    ]);
    return result.rows[0] || null;
  }

  static async linkMedia(
    transcriptionId: string, 
    mediaId: string, 
    isPrimary: boolean = false
  ): Promise<TranscriptionMedia> {
    const query = `
      INSERT INTO transcription_media (transcription_id, media_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (transcription_id, media_id) 
      DO UPDATE SET is_primary = $3
      RETURNING *
    `;
    const result = await db.query(query, [transcriptionId, mediaId, isPrimary]);
    return result.rows[0];
  }

  static async unlinkMedia(transcriptionId: string, mediaId: string): Promise<boolean> {
    const query = `
      DELETE FROM transcription_media 
      WHERE transcription_id = $1 AND media_id = $2
    `;
    const result = await db.query(query, [transcriptionId, mediaId]);
    return result.rowCount > 0;
  }

  static async getLinkedMedia(transcriptionId: string): Promise<any[]> {
    const query = `
      SELECT m.*, tm.is_primary, tm.linked_at
      FROM media_files m
      JOIN transcription_media tm ON m.id = tm.media_id
      WHERE tm.transcription_id = $1
      ORDER BY tm.is_primary DESC, tm.linked_at DESC
    `;
    const result = await db.query(query, [transcriptionId]);
    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'UPDATE transcriptions SET is_active = false WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }
}