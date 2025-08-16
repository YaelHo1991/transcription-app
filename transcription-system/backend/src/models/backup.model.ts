import { db } from '../db/connection';

export interface TranscriptionBackup {
  id: string;
  transcription_id: string;
  version_number: number;
  file_path: string;
  created_at: Date;
  file_size?: number;
  blocks_count?: number;
  speakers_count?: number;
  words_count?: number;
  change_summary?: string;
}

export class BackupModel {
  static async create(
    transcriptionId: string,
    versionNumber: number,
    filePath: string,
    metadata?: {
      file_size?: number;
      blocks_count?: number;
      speakers_count?: number;
      words_count?: number;
      change_summary?: string;
    }
  ): Promise<TranscriptionBackup> {
    const query = `
      INSERT INTO transcription_backups (
        transcription_id, version_number, file_path,
        file_size, blocks_count, speakers_count, words_count, change_summary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await db.query(query, [
      transcriptionId,
      versionNumber,
      filePath,
      metadata?.file_size,
      metadata?.blocks_count,
      metadata?.speakers_count,
      metadata?.words_count,
      metadata?.change_summary
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<TranscriptionBackup | null> {
    const query = 'SELECT * FROM transcription_backups WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByTranscriptionId(
    transcriptionId: string,
    limit: number = 50
  ): Promise<TranscriptionBackup[]> {
    const query = `
      SELECT * FROM transcription_backups 
      WHERE transcription_id = $1
      ORDER BY version_number DESC
      LIMIT $2
    `;
    const result = await db.query(query, [transcriptionId, limit]);
    return result.rows;
  }

  static async getLatestVersion(transcriptionId: string): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(version_number), 0) as latest_version
      FROM transcription_backups
      WHERE transcription_id = $1
    `;
    const result = await db.query(query, [transcriptionId]);
    return result.rows[0].latest_version;
  }

  static async findByVersion(
    transcriptionId: string,
    versionNumber: number
  ): Promise<TranscriptionBackup | null> {
    const query = `
      SELECT * FROM transcription_backups 
      WHERE transcription_id = $1 AND version_number = $2
    `;
    const result = await db.query(query, [transcriptionId, versionNumber]);
    return result.rows[0] || null;
  }

  static async deleteOldBackups(
    transcriptionId: string,
    keepCount: number = 100
  ): Promise<string[]> {
    // Get the file paths of backups to be deleted
    const query = `
      WITH backups_to_keep AS (
        SELECT id FROM transcription_backups
        WHERE transcription_id = $1
        ORDER BY version_number DESC
        LIMIT $2
      )
      DELETE FROM transcription_backups
      WHERE transcription_id = $1 
      AND id NOT IN (SELECT id FROM backups_to_keep)
      RETURNING file_path
    `;
    const result = await db.query(query, [transcriptionId, keepCount]);
    return result.rows.map(row => row.file_path);
  }

  static async getBackupsByDateRange(
    transcriptionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TranscriptionBackup[]> {
    const query = `
      SELECT * FROM transcription_backups 
      WHERE transcription_id = $1 
      AND created_at BETWEEN $2 AND $3
      ORDER BY version_number DESC
    `;
    const result = await db.query(query, [transcriptionId, startDate, endDate]);
    return result.rows;
  }
}