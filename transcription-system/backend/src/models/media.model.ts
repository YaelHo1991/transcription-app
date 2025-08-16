import { db } from '../db/connection';

export interface MediaFile {
  id: string;
  user_id: string;
  project_id?: string;
  file_name: string;
  file_path?: string;
  external_url?: string;
  file_size?: number;
  duration_seconds?: number;
  mime_type?: string;
  created_at: Date;
  metadata: Record<string, any>;
}

export class MediaModel {
  static async create(
    userId: string,
    fileName: string,
    options: {
      projectId?: string;
      filePath?: string;
      externalUrl?: string;
      fileSize?: number;
      durationSeconds?: number;
      mimeType?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<MediaFile> {
    const query = `
      INSERT INTO media_files (
        user_id, project_id, file_name, file_path, external_url,
        file_size, duration_seconds, mime_type, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await db.query(query, [
      userId,
      options.projectId,
      fileName,
      options.filePath,
      options.externalUrl,
      options.fileSize,
      options.durationSeconds,
      options.mimeType,
      options.metadata || {}
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<MediaFile | null> {
    const query = 'SELECT * FROM media_files WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<MediaFile[]> {
    const query = `
      SELECT * FROM media_files 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findByProjectId(projectId: string): Promise<MediaFile[]> {
    const query = `
      SELECT * FROM media_files 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [projectId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<MediaFile>): Promise<MediaFile | null> {
    const { file_name, file_path, external_url, file_size, duration_seconds, mime_type, metadata } = updates;
    const query = `
      UPDATE media_files 
      SET file_name = COALESCE($2, file_name),
          file_path = COALESCE($3, file_path),
          external_url = COALESCE($4, external_url),
          file_size = COALESCE($5, file_size),
          duration_seconds = COALESCE($6, duration_seconds),
          mime_type = COALESCE($7, mime_type),
          metadata = COALESCE($8, metadata)
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [
      id, file_name, file_path, external_url, file_size, duration_seconds, mime_type, metadata
    ]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM media_files WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  static async getTranscriptions(mediaId: string): Promise<any[]> {
    const query = `
      SELECT t.*, tm.is_primary, tm.linked_at
      FROM transcriptions t
      JOIN transcription_media tm ON t.id = tm.transcription_id
      WHERE tm.media_id = $1 AND t.is_active = true
      ORDER BY tm.linked_at DESC
    `;
    const result = await db.query(query, [mediaId]);
    return result.rows;
  }
}