import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection';
import { chunkService, ChunkInfo } from './chunkService';
import storageService from './storageService';
import { projectService } from './projectService';

const streamPipeline = promisify(pipeline);

// Migration States
export type MigrationState = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'rolled_back';
export type StorageType = 'local' | 'server' | 'server_chunked';

// Core Interfaces
export interface MigrationResult {
  migrationId: string;
  success: boolean;
  progress: number;
  state: MigrationState;
  error?: string;
  estimatedTimeRemaining?: number;
  bytesTransferred?: number;
  totalBytes?: number;
}

export interface MediaStorageInfo {
  mediaId: string;
  userId: string;
  storageType: StorageType;
  size: number;
  chunkInfo?: ChunkInfo;
  localPath?: string;
  computerId?: string;
  lastVerified?: Date;
  migrationHistory?: MigrationHistoryEntry[];
}

export interface MigrationHistoryEntry {
  migrationId: string;
  fromType: StorageType;
  toType: StorageType;
  timestamp: Date;
  success: boolean;
  duration?: number;
  error?: string;
}

export interface LocalValidationResult {
  isValid: boolean;
  exists: boolean;
  accessible: boolean;
  sizeMatches: boolean;
  lastChecked: Date;
  error?: string;
}

export interface SyncResult {
  syncedFiles: number;
  failedFiles: number;
  totalSize: number;
  errors: string[];
}

export interface OptimizationResult {
  recommendedMigrations: Array<{
    mediaId: string;
    currentType: StorageType;
    recommendedType: StorageType;
    reason: string;
    priority: number;
  }>;
  potentialSavings: number;
  estimatedTime: number;
}

export interface CostAnalysis {
  storageSpaceRequired: number;
  networkBandwidthRequired: number;
  timeEstimateMinutes: number;
  serverResourcesRequired: number;
  recommendationScore: number; // 1-10, higher is better recommendation
}

export interface CleanupResult {
  failedMigrationsRemoved: number;
  orphanedRecordsRemoved: number;
  diskSpaceFreed: number;
  errors: string[];
}

export interface UserPreferences {
  preferredStorageType?: StorageType;
  maxLocalStorageUsage?: number; // in bytes
  autoMigrateThreshold?: number; // file size in bytes
  allowChunkedStorage?: boolean;
  computerIds?: string[];
}

// Internal interfaces
interface MigrationMetadata {
  migrationId: string;
  mediaId: string;
  userId: string;
  fromType: StorageType;
  toType: StorageType;
  state: MigrationState;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  rollbackData?: any;
  settings?: any;
}

/**
 * HybridStorageService - Orchestrates media storage across local, server, and chunked storage
 * 
 * Features:
 * - Safe migrations with rollback capability
 * - Resume interrupted operations
 * - Real-time progress tracking
 * - Storage optimization recommendations
 * - Data integrity verification
 * - Local file validation and synchronization
 */
export class HybridStorageService {
  private activeMigrations = new Map<string, MigrationMetadata>();
  private progressCallbacks = new Map<string, (progress: MigrationResult) => void>();

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize service and database tables
   */
  private async initializeService(): Promise<void> {
    try {
      await this.initializeMigrationTables();
      await this.recoverActiveMigrations();
      console.log('[HybridStorageService] Service initialized successfully');
    } catch (error) {
      console.error('[HybridStorageService] Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Initialize database tables for migration tracking
   */
  private async initializeMigrationTables(): Promise<void> {
    try {
      // Create storage_migrations table
      await db.query(`
        CREATE TABLE IF NOT EXISTS storage_migrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          migration_id VARCHAR(255) UNIQUE NOT NULL,
          media_id VARCHAR(255) NOT NULL,
          user_id UUID NOT NULL,
          from_type VARCHAR(20) NOT NULL,
          to_type VARCHAR(20) NOT NULL,
          state VARCHAR(20) NOT NULL DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          error_message TEXT,
          rollback_data JSONB,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_storage_migrations_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_storage_migrations_media_user ON storage_migrations(media_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_storage_migrations_state ON storage_migrations(state);
        CREATE INDEX IF NOT EXISTS idx_storage_migrations_user_id ON storage_migrations(user_id);
        CREATE INDEX IF NOT EXISTS idx_storage_migrations_start_time ON storage_migrations(start_time);
      `);

      console.log('[HybridStorageService] Migration tables initialized successfully');
    } catch (error) {
      console.error('[HybridStorageService] Failed to initialize migration tables:', error);
      throw error;
    }
  }

  /**
   * Recover any active migrations that may have been interrupted
   */
  private async recoverActiveMigrations(): Promise<void> {
    try {
      const result = await db.query(`
        SELECT * FROM storage_migrations 
        WHERE state IN ('pending', 'in_progress', 'paused')
        ORDER BY start_time ASC
      `);

      for (const row of result.rows) {
        const metadata: MigrationMetadata = {
          migrationId: row.migration_id,
          mediaId: row.media_id,
          userId: row.user_id,
          fromType: row.from_type as StorageType,
          toType: row.to_type as StorageType,
          state: row.state as MigrationState,
          progress: row.progress,
          startTime: row.start_time,
          endTime: row.end_time,
          error: row.error_message,
          rollbackData: row.rollback_data,
          settings: row.settings
        };

        this.activeMigrations.set(row.migration_id, metadata);
        
        // Mark old migrations as failed if they've been running too long
        const ageHours = (Date.now() - metadata.startTime.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          await this.markMigrationFailed(row.migration_id, 'Migration timeout - abandoned after 24 hours');
        }
      }

      console.log(`[HybridStorageService] Recovered ${result.rows.length} active migrations`);
    } catch (error) {
      console.error('[HybridStorageService] Failed to recover active migrations:', error);
    }
  }

  /**
   * Migrate media to server storage
   */
  async migrateToServer(
    mediaId: string, 
    userId: string, 
    progressCallback?: (progress: MigrationResult) => void
  ): Promise<MigrationResult> {
    const migrationId = uuidv4();
    
    try {
      console.log(`[HybridStorageService] Starting server migration for media ${mediaId}`);
      
      // Get current storage info
      const currentInfo = await this.getMediaStorageInfo(mediaId, userId);
      if (!currentInfo) {
        throw new Error('Media not found');
      }
      
      if (currentInfo.storageType === 'server') {
        return {
          migrationId,
          success: true,
          progress: 100,
          state: 'completed',
          bytesTransferred: 0,
          totalBytes: currentInfo.size
        };
      }

      // Check storage quota
      const quotaCheck = await storageService.canUserUpload(userId, currentInfo.size);
      if (!quotaCheck.canUpload) {
        throw new Error(`Storage quota exceeded: ${quotaCheck.message}`);
      }

      // Initialize migration tracking
      await this.initializeMigration(migrationId, mediaId, userId, currentInfo.storageType, 'server');
      
      if (progressCallback) {
        this.progressCallbacks.set(migrationId, progressCallback);
      }

      // Perform migration based on source type
      let result: MigrationResult;
      
      if (currentInfo.storageType === 'local') {
        result = await this.migrateLocalToServer(migrationId, currentInfo, progressCallback);
      } else if (currentInfo.storageType === 'server_chunked') {
        result = await this.migrateChunkedToServer(migrationId, currentInfo, progressCallback);
      } else {
        throw new Error(`Unsupported migration from ${currentInfo.storageType} to server`);
      }

      return result;
    } catch (error) {
      console.error(`[HybridStorageService] Server migration failed:`, error);
      await this.markMigrationFailed(migrationId, error instanceof Error ? error.message : 'Unknown error');
      return {
        migrationId,
        success: false,
        progress: 0,
        state: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.progressCallbacks.delete(migrationId);
      this.activeMigrations.delete(migrationId);
    }
  }

  /**
   * Migrate media to local storage
   */
  async migrateToLocal(
    mediaId: string, 
    userId: string, 
    localPath: string,
    computerId?: string
  ): Promise<MigrationResult> {
    const migrationId = uuidv4();
    
    try {
      console.log(`[HybridStorageService] Starting local migration for media ${mediaId} to ${localPath}`);
      
      // Get current storage info
      const currentInfo = await this.getMediaStorageInfo(mediaId, userId);
      if (!currentInfo) {
        throw new Error('Media not found');
      }
      
      if (currentInfo.storageType === 'local' && currentInfo.localPath === localPath) {
        return {
          migrationId,
          success: true,
          progress: 100,
          state: 'completed',
          bytesTransferred: 0,
          totalBytes: currentInfo.size
        };
      }

      // Validate local path
      const directory = path.dirname(localPath);
      try {
        await fs.access(directory);
      } catch {
        throw new Error(`Local directory not accessible: ${directory}`);
      }

      // Initialize migration tracking
      await this.initializeMigration(migrationId, mediaId, userId, currentInfo.storageType, 'local', {
        localPath,
        computerId: computerId || require('os').hostname()
      });

      // Perform migration
      const result = await this.migrateToLocalStorage(migrationId, currentInfo, localPath, computerId);
      return result;
      
    } catch (error) {
      console.error(`[HybridStorageService] Local migration failed:`, error);
      await this.markMigrationFailed(migrationId, error instanceof Error ? error.message : 'Unknown error');
      return {
        migrationId,
        success: false,
        progress: 0,
        state: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.activeMigrations.delete(migrationId);
    }
  }

  /**
   * Migrate media to chunked server storage
   */
  async migrateToChunked(
    mediaId: string, 
    userId: string,
    progressCallback?: (progress: MigrationResult) => void
  ): Promise<MigrationResult> {
    const migrationId = uuidv4();
    
    try {
      console.log(`[HybridStorageService] Starting chunked migration for media ${mediaId}`);
      
      // Get current storage info
      const currentInfo = await this.getMediaStorageInfo(mediaId, userId);
      if (!currentInfo) {
        throw new Error('Media not found');
      }
      
      if (currentInfo.storageType === 'server_chunked') {
        return {
          migrationId,
          success: true,
          progress: 100,
          state: 'completed',
          bytesTransferred: 0,
          totalBytes: currentInfo.size
        };
      }

      // Check storage quota
      const quotaCheck = await storageService.canUserUpload(userId, currentInfo.size);
      if (!quotaCheck.canUpload) {
        throw new Error(`Storage quota exceeded: ${quotaCheck.message}`);
      }

      // Initialize migration tracking
      await this.initializeMigration(migrationId, mediaId, userId, currentInfo.storageType, 'server_chunked');
      
      if (progressCallback) {
        this.progressCallbacks.set(migrationId, progressCallback);
      }

      // Get source file for chunking
      let sourceFilePath: string;
      
      if (currentInfo.storageType === 'local') {
        if (!currentInfo.localPath) {
          throw new Error('Local file path not available');
        }
        sourceFilePath = currentInfo.localPath;
      } else if (currentInfo.storageType === 'server') {
        // Get server file path - this would be in user's project directory
        sourceFilePath = await this.getServerFilePath(mediaId, userId);
      } else {
        throw new Error(`Unsupported migration from ${currentInfo.storageType} to chunked`);
      }

      // Create chunks using chunk service
      const chunkInfo = await chunkService.chunkFile(sourceFilePath, mediaId, userId);
      
      // Update database with chunked storage info
      await this.updateMediaStorageType(mediaId, userId, 'server_chunked', {
        chunkInfo
      });

      await this.markMigrationCompleted(migrationId);
      
      return {
        migrationId,
        success: true,
        progress: 100,
        state: 'completed',
        bytesTransferred: currentInfo.size,
        totalBytes: currentInfo.size
      };
      
    } catch (error) {
      console.error(`[HybridStorageService] Chunked migration failed:`, error);
      await this.markMigrationFailed(migrationId, error instanceof Error ? error.message : 'Unknown error');
      return {
        migrationId,
        success: false,
        progress: 0,
        state: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.progressCallbacks.delete(migrationId);
      this.activeMigrations.delete(migrationId);
    }
  }

  /**
   * Resume interrupted migration
   */
  async resumeMigration(migrationId: string): Promise<MigrationResult> {
    try {
      const migration = this.activeMigrations.get(migrationId);
      if (!migration) {
        // Try to load from database
        const result = await db.query(
          'SELECT * FROM storage_migrations WHERE migration_id = $1',
          [migrationId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Migration not found');
        }
        
        const row = result.rows[0];
        if (row.state === 'completed') {
          return {
            migrationId,
            success: true,
            progress: 100,
            state: 'completed'
          };
        }
        
        if (row.state === 'failed') {
          return {
            migrationId,
            success: false,
            progress: row.progress,
            state: 'failed',
            error: row.error_message
          };
        }
      }

      // Resume the appropriate migration type
      const metadata = migration || await this.loadMigrationMetadata(migrationId);
      
      if (metadata.toType === 'server') {
        return await this.migrateToServer(metadata.mediaId, metadata.userId);
      } else if (metadata.toType === 'local') {
        const settings = metadata.settings as any;
        return await this.migrateToLocal(
          metadata.mediaId, 
          metadata.userId, 
          settings.localPath,
          settings.computerId
        );
      } else if (metadata.toType === 'server_chunked') {
        return await this.migrateToChunked(metadata.mediaId, metadata.userId);
      } else {
        throw new Error(`Cannot resume migration to ${metadata.toType}`);
      }
      
    } catch (error) {
      console.error(`[HybridStorageService] Resume migration failed:`, error);
      return {
        migrationId,
        success: false,
        progress: 0,
        state: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get storage recommendation based on file size and user preferences
   */
  getStorageRecommendation(mediaSize: number, userPrefs: UserPreferences): StorageType {
    const sizeInMB = mediaSize / (1024 * 1024);
    
    // Large files (>100MB) benefit from chunked storage
    if (sizeInMB > 100 && userPrefs.allowChunkedStorage !== false) {
      return 'server_chunked';
    }
    
    // Medium files (10-100MB) - prefer server storage
    if (sizeInMB > 10) {
      return 'server';
    }
    
    // Small files - consider user preference and local storage limits
    if (userPrefs.preferredStorageType === 'local' && 
        (!userPrefs.maxLocalStorageUsage || mediaSize < userPrefs.maxLocalStorageUsage)) {
      return 'local';
    }
    
    return 'server';
  }

  /**
   * Validate local file accessibility and integrity
   */
  async validateLocalFile(mediaId: string, userId: string): Promise<LocalValidationResult> {
    try {
      const storageInfo = await this.getMediaStorageInfo(mediaId, userId);
      
      if (!storageInfo || storageInfo.storageType !== 'local' || !storageInfo.localPath) {
        return {
          isValid: false,
          exists: false,
          accessible: false,
          sizeMatches: false,
          lastChecked: new Date(),
          error: 'Not a local file or path not available'
        };
      }

      // Check if file exists
      let exists = false;
      let accessible = false;
      let sizeMatches = false;
      let error: string | undefined;

      try {
        const stats = await fs.stat(storageInfo.localPath);
        exists = true;
        accessible = true;
        sizeMatches = stats.size === storageInfo.size;
        
        if (!sizeMatches) {
          error = `Size mismatch: expected ${storageInfo.size}, got ${stats.size}`;
        }
      } catch (fileError) {
        exists = false;
        accessible = false;
        error = fileError instanceof Error ? fileError.message : 'File access error';
      }

      // Update last check timestamp
      await this.updateLastLocalCheck(mediaId, userId);

      const result: LocalValidationResult = {
        isValid: exists && accessible && sizeMatches,
        exists,
        accessible,
        sizeMatches,
        lastChecked: new Date(),
        error
      };

      console.log(`[HybridStorageService] Local validation for ${mediaId}: ${JSON.stringify(result)}`);
      return result;
      
    } catch (error) {
      console.error(`[HybridStorageService] Local validation failed:`, error);
      return {
        isValid: false,
        exists: false,
        accessible: false,
        sizeMatches: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Synchronize local files for a user
   */
  async syncLocalFiles(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      syncedFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      errors: []
    };

    try {
      // Get all local files for user
      const mediaFiles = await this.getUserMediaByStorageType(userId, 'local');
      
      for (const media of mediaFiles) {
        try {
          const validation = await this.validateLocalFile(media.mediaId, userId);
          
          if (validation.isValid) {
            result.syncedFiles++;
            result.totalSize += media.size;
          } else {
            result.failedFiles++;
            result.errors.push(`${media.mediaId}: ${validation.error}`);
            
            // Mark as inaccessible in database
            await this.markLocalFileInaccessible(media.mediaId, userId, validation.error);
          }
        } catch (error) {
          result.failedFiles++;
          result.errors.push(`${media.mediaId}: ${error instanceof Error ? error.message : 'Sync error'}`);
        }
      }

      console.log(`[HybridStorageService] Sync completed: ${result.syncedFiles} synced, ${result.failedFiles} failed`);
      return result;
      
    } catch (error) {
      console.error(`[HybridStorageService] Sync failed:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Sync operation failed');
      return result;
    }
  }

  /**
   * Optimize user storage with recommendations
   */
  async optimizeUserStorage(userId: string): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      recommendedMigrations: [],
      potentialSavings: 0,
      estimatedTime: 0
    };

    try {
      // Get user preferences
      const userPrefs = await this.getUserPreferences(userId);
      
      // Get all user's media files
      const allMedia = await this.getAllUserMedia(userId);
      
      for (const media of allMedia) {
        const recommendedType = this.getStorageRecommendation(media.size, userPrefs);
        
        if (recommendedType !== media.storageType) {
          let priority = 1;
          let reason = '';
          
          // Calculate priority and reason
          if (media.storageType === 'local' && !await this.validateLocalFile(media.mediaId, userId)) {
            priority = 10; // High priority for inaccessible local files
            reason = 'Local file is inaccessible';
          } else if (recommendedType === 'server_chunked' && media.size > 100 * 1024 * 1024) {
            priority = 7; // High priority for large files
            reason = 'Large file benefits from chunked storage';
          } else if (recommendedType === 'server' && media.storageType === 'local') {
            priority = 5; // Medium priority for server storage
            reason = 'Better reliability with server storage';
          } else {
            priority = 3; // Low priority for other optimizations
            reason = 'Storage optimization opportunity';
          }

          result.recommendedMigrations.push({
            mediaId: media.mediaId,
            currentType: media.storageType,
            recommendedType,
            reason,
            priority
          });
        }
      }

      // Sort by priority (highest first)
      result.recommendedMigrations.sort((a, b) => b.priority - a.priority);
      
      // Calculate estimated time and savings
      result.estimatedTime = result.recommendedMigrations.length * 5; // 5 minutes per migration estimate
      result.potentialSavings = result.recommendedMigrations
        .filter(m => m.recommendedType === 'server_chunked')
        .reduce((sum, m) => {
          const media = allMedia.find(media => media.mediaId === m.mediaId);
          return sum + (media ? media.size * 0.2 : 0); // Estimate 20% savings from chunking
        }, 0);

      console.log(`[HybridStorageService] Optimization analysis: ${result.recommendedMigrations.length} recommendations`);
      return result;
      
    } catch (error) {
      console.error(`[HybridStorageService] Storage optimization failed:`, error);
      return result;
    }
  }

  /**
   * Get comprehensive media storage information
   */
  async getMediaStorageInfo(mediaId: string, userId: string): Promise<MediaStorageInfo | null> {
    try {
      const result = await db.query(`
        SELECT 
          file_name,
          file_size,
          storage_type,
          original_path,
          chunk_info,
          computer_id,
          last_local_check,
          created_at,
          updated_at
        FROM media_files 
        WHERE id = $1 AND user_id = $2
      `, [mediaId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Get migration history
      const historyResult = await db.query(`
        SELECT 
          migration_id,
          from_type,
          to_type,
          start_time,
          end_time,
          state,
          error_message
        FROM storage_migrations
        WHERE media_id = $1 AND user_id = $2
        ORDER BY start_time DESC
        LIMIT 10
      `, [mediaId, userId]);

      const migrationHistory: MigrationHistoryEntry[] = historyResult.rows.map(histRow => ({
        migrationId: histRow.migration_id,
        fromType: histRow.from_type,
        toType: histRow.to_type,
        timestamp: histRow.start_time,
        success: histRow.state === 'completed',
        duration: histRow.end_time ? 
          (histRow.end_time.getTime() - histRow.start_time.getTime()) / 1000 : undefined,
        error: histRow.error_message
      }));

      let chunkInfo: ChunkInfo | undefined;
      if (row.storage_type === 'server_chunked' && row.chunk_info) {
        chunkInfo = await chunkService.getChunkInfo(mediaId, userId);
      }

      return {
        mediaId,
        userId,
        storageType: row.storage_type as StorageType,
        size: parseInt(row.file_size),
        chunkInfo,
        localPath: row.original_path,
        computerId: row.computer_id,
        lastVerified: row.last_local_check ? new Date(row.last_local_check) : undefined,
        migrationHistory
      };
      
    } catch (error) {
      console.error(`[HybridStorageService] Failed to get media storage info:`, error);
      return null;
    }
  }

  /**
   * Calculate migration cost analysis
   */
  async calculateMigrationCost(mediaId: string, targetType: StorageType): Promise<CostAnalysis> {
    try {
      const storageInfo = await this.getMediaStorageInfo(mediaId, 'default'); // TODO: Get actual user ID
      if (!storageInfo) {
        throw new Error('Media not found');
      }

      const sizeInMB = storageInfo.size / (1024 * 1024);
      
      let networkBandwidthRequired = 0;
      let timeEstimateMinutes = 0;
      let serverResourcesRequired = 0;
      let recommendationScore = 5; // Default neutral score

      // Calculate based on migration type
      if (storageInfo.storageType === 'local' && targetType === 'server') {
        networkBandwidthRequired = storageInfo.size; // Full upload
        timeEstimateMinutes = Math.max(1, sizeInMB / 10); // Assume 10MB/min upload
        serverResourcesRequired = storageInfo.size;
        recommendationScore = 7; // Generally good to move to server
      } else if (storageInfo.storageType === 'server' && targetType === 'server_chunked') {
        networkBandwidthRequired = 0; // Already on server
        timeEstimateMinutes = Math.max(2, sizeInMB / 50); // Processing time
        serverResourcesRequired = storageInfo.size * 1.2; // Temporary space needed
        recommendationScore = sizeInMB > 100 ? 8 : 4; // Better for large files
      } else if (targetType === 'local') {
        networkBandwidthRequired = storageInfo.size; // Full download
        timeEstimateMinutes = Math.max(1, sizeInMB / 20); // Assume 20MB/min download
        serverResourcesRequired = 0;
        recommendationScore = 3; // Generally not recommended unless specifically needed
      }

      return {
        storageSpaceRequired: storageInfo.size,
        networkBandwidthRequired,
        timeEstimateMinutes,
        serverResourcesRequired,
        recommendationScore
      };
      
    } catch (error) {
      console.error(`[HybridStorageService] Failed to calculate migration cost:`, error);
      return {
        storageSpaceRequired: 0,
        networkBandwidthRequired: 0,
        timeEstimateMinutes: 0,
        serverResourcesRequired: 0,
        recommendationScore: 1
      };
    }
  }

  /**
   * Clean up failed migrations and orphaned records
   */
  async cleanupFailedMigrations(userId?: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      failedMigrationsRemoved: 0,
      orphanedRecordsRemoved: 0,
      diskSpaceFreed: 0,
      errors: []
    };

    try {
      // Clean up failed migrations older than 7 days
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const whereClause = userId ? 
        'WHERE state IN (\'failed\', \'completed\') AND start_time < $1 AND user_id = $2' :
        'WHERE state IN (\'failed\', \'completed\') AND start_time < $1';
      
      const params = userId ? [cutoffDate, userId] : [cutoffDate];
      
      const cleanupResult = await db.query(`
        DELETE FROM storage_migrations ${whereClause}
        RETURNING *
      `, params);

      result.failedMigrationsRemoved = cleanupResult.rows.length;

      // Clean up orphaned chunk metadata
      const orphanResult = await chunkService.cleanupOrphanedChunks(userId);
      result.orphanedRecordsRemoved = orphanResult.orphanedChunksRemoved;
      result.diskSpaceFreed = orphanResult.bytesFreed;
      result.errors = result.errors.concat(orphanResult.errors);

      console.log(`[HybridStorageService] Cleanup completed: ${result.failedMigrationsRemoved} migrations, ${result.orphanedRecordsRemoved} orphaned chunks`);
      return result;
      
    } catch (error) {
      console.error(`[HybridStorageService] Cleanup failed:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Cleanup operation failed');
      return result;
    }
  }

  // Private helper methods
  
  private async initializeMigration(
    migrationId: string,
    mediaId: string,
    userId: string,
    fromType: StorageType,
    toType: StorageType,
    settings?: any
  ): Promise<void> {
    await db.query(`
      INSERT INTO storage_migrations (
        migration_id, media_id, user_id, from_type, to_type, state, settings
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
    `, [migrationId, mediaId, userId, fromType, toType, JSON.stringify(settings || {})]);

    const metadata: MigrationMetadata = {
      migrationId,
      mediaId,
      userId,
      fromType,
      toType,
      state: 'pending',
      progress: 0,
      startTime: new Date(),
      settings
    };

    this.activeMigrations.set(migrationId, metadata);
  }

  private async markMigrationCompleted(migrationId: string): Promise<void> {
    await db.query(`
      UPDATE storage_migrations 
      SET state = 'completed', progress = 100, end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE migration_id = $1
    `, [migrationId]);

    const migration = this.activeMigrations.get(migrationId);
    if (migration) {
      migration.state = 'completed';
      migration.progress = 100;
      migration.endTime = new Date();
    }
  }

  private async markMigrationFailed(migrationId: string, error: string): Promise<void> {
    await db.query(`
      UPDATE storage_migrations 
      SET state = 'failed', error_message = $2, end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE migration_id = $1
    `, [migrationId, error]);

    const migration = this.activeMigrations.get(migrationId);
    if (migration) {
      migration.state = 'failed';
      migration.error = error;
      migration.endTime = new Date();
    }
  }

  private async updateMigrationProgress(migrationId: string, progress: number): Promise<void> {
    await db.query(`
      UPDATE storage_migrations 
      SET progress = $2, updated_at = CURRENT_TIMESTAMP
      WHERE migration_id = $1
    `, [migrationId, progress]);

    const migration = this.activeMigrations.get(migrationId);
    if (migration) {
      migration.progress = progress;
    }

    // Notify progress callback if registered
    const callback = this.progressCallbacks.get(migrationId);
    if (callback) {
      callback({
        migrationId,
        success: true,
        progress,
        state: 'in_progress'
      });
    }
  }

  private async migrateLocalToServer(
    migrationId: string,
    currentInfo: MediaStorageInfo,
    progressCallback?: (progress: MigrationResult) => void
  ): Promise<MigrationResult> {
    if (!currentInfo.localPath) {
      throw new Error('Local path not available');
    }

    // Validate local file exists
    const validation = await this.validateLocalFile(currentInfo.mediaId, currentInfo.userId);
    if (!validation.isValid) {
      throw new Error(`Local file validation failed: ${validation.error}`);
    }

    // Create server destination path
    const serverPath = await this.getServerFilePath(currentInfo.mediaId, currentInfo.userId, true);
    
    // Copy file to server with progress tracking
    await this.copyFileWithProgress(
      currentInfo.localPath,
      serverPath,
      (progress) => this.updateMigrationProgress(migrationId, progress)
    );

    // Update database
    await this.updateMediaStorageType(currentInfo.mediaId, currentInfo.userId, 'server');
    await this.markMigrationCompleted(migrationId);

    return {
      migrationId,
      success: true,
      progress: 100,
      state: 'completed',
      bytesTransferred: currentInfo.size,
      totalBytes: currentInfo.size
    };
  }

  private async migrateChunkedToServer(
    migrationId: string,
    currentInfo: MediaStorageInfo,
    progressCallback?: (progress: MigrationResult) => void
  ): Promise<MigrationResult> {
    if (!currentInfo.chunkInfo) {
      throw new Error('Chunk info not available');
    }

    // Assemble chunks to server file
    const serverPath = await this.getServerFilePath(currentInfo.mediaId, currentInfo.userId, true);
    const assemblyResult = await chunkService.assembleChunks(currentInfo.mediaId, currentInfo.userId, false);
    
    if (!assemblyResult.success || !assemblyResult.buffer) {
      throw new Error(`Failed to assemble chunks: ${assemblyResult.error}`);
    }

    // Write assembled file
    await fs.writeFile(serverPath, assemblyResult.buffer);

    // Update database
    await this.updateMediaStorageType(currentInfo.mediaId, currentInfo.userId, 'server');
    
    // Clean up chunks
    await chunkService.deleteMediaChunks(currentInfo.mediaId, currentInfo.userId);
    
    await this.markMigrationCompleted(migrationId);

    return {
      migrationId,
      success: true,
      progress: 100,
      state: 'completed',
      bytesTransferred: currentInfo.size,
      totalBytes: currentInfo.size
    };
  }

  private async migrateToLocalStorage(
    migrationId: string,
    currentInfo: MediaStorageInfo,
    localPath: string,
    computerId?: string
  ): Promise<MigrationResult> {
    let sourceStream: NodeJS.ReadableStream;

    if (currentInfo.storageType === 'server') {
      const serverPath = await this.getServerFilePath(currentInfo.mediaId, currentInfo.userId);
      sourceStream = createReadStream(serverPath);
    } else if (currentInfo.storageType === 'server_chunked') {
      const assemblyResult = await chunkService.assembleChunks(currentInfo.mediaId, currentInfo.userId, true);
      if (!assemblyResult.success || !assemblyResult.stream) {
        throw new Error(`Failed to assemble chunks: ${assemblyResult.error}`);
      }
      sourceStream = assemblyResult.stream;
    } else {
      throw new Error(`Cannot migrate from ${currentInfo.storageType} to local`);
    }

    // Create local file with progress tracking
    const writeStream = createWriteStream(localPath);
    await streamPipeline(sourceStream, writeStream);

    // Update database
    await this.updateMediaStorageType(currentInfo.mediaId, currentInfo.userId, 'local', {
      localPath,
      computerId: computerId || require('os').hostname()
    });
    
    await this.markMigrationCompleted(migrationId);

    return {
      migrationId,
      success: true,
      progress: 100,
      state: 'completed',
      bytesTransferred: currentInfo.size,
      totalBytes: currentInfo.size
    };
  }

  private async updateMediaStorageType(
    mediaId: string,
    userId: string,
    storageType: StorageType,
    additionalData?: any
  ): Promise<void> {
    let updateQuery = 'UPDATE media_files SET storage_type = $1, updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [storageType];
    let paramIndex = 2;

    if (storageType === 'local' && additionalData) {
      updateQuery += `, original_path = $${paramIndex}, computer_id = $${paramIndex + 1}`;
      params.push(additionalData.localPath, additionalData.computerId);
      paramIndex += 2;
    } else if (storageType === 'server_chunked' && additionalData?.chunkInfo) {
      updateQuery += `, chunk_info = $${paramIndex}`;
      params.push(JSON.stringify(additionalData.chunkInfo));
      paramIndex++;
    } else if (storageType === 'server') {
      updateQuery += ', original_path = NULL, computer_id = NULL, chunk_info = $' + paramIndex;
      params.push('{}');
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`;
    params.push(mediaId, userId);

    await db.query(updateQuery, params);
  }

  private async getServerFilePath(mediaId: string, userId: string, createDir: boolean = false): Promise<string> {
    // This is a simplified implementation - in reality, you'd need to determine
    // the actual project structure and file location
    const userDir = path.join(process.cwd(), 'user_data', 'users', userId, 'media');
    
    if (createDir) {
      await fs.mkdir(userDir, { recursive: true });
    }
    
    return path.join(userDir, `${mediaId}.bin`);
  }

  private async copyFileWithProgress(
    source: string,
    destination: string,
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    const stats = await fs.stat(source);
    const totalSize = stats.size;
    let copiedBytes = 0;

    const readStream = createReadStream(source);
    const writeStream = createWriteStream(destination);

    readStream.on('data', (chunk: Buffer) => {
      copiedBytes += chunk.length;
      if (progressCallback) {
        const progress = Math.round((copiedBytes / totalSize) * 100);
        progressCallback(progress);
      }
    });

    await streamPipeline(readStream, writeStream);
  }

  private async loadMigrationMetadata(migrationId: string): Promise<MigrationMetadata> {
    const result = await db.query(
      'SELECT * FROM storage_migrations WHERE migration_id = $1',
      [migrationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Migration metadata not found');
    }

    const row = result.rows[0];
    return {
      migrationId: row.migration_id,
      mediaId: row.media_id,
      userId: row.user_id,
      fromType: row.from_type,
      toType: row.to_type,
      state: row.state,
      progress: row.progress,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error_message,
      rollbackData: row.rollback_data,
      settings: row.settings
    };
  }

  private async updateLastLocalCheck(mediaId: string, userId: string): Promise<void> {
    await db.query(
      'UPDATE media_files SET last_local_check = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [mediaId, userId]
    );
  }

  private async markLocalFileInaccessible(mediaId: string, userId: string, error?: string): Promise<void> {
    // Could add an 'accessible' column to track this state
    await db.query(
      'UPDATE media_files SET last_local_check = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [mediaId, userId]
    );
  }

  private async getUserMediaByStorageType(userId: string, storageType: StorageType): Promise<MediaStorageInfo[]> {
    const result = await db.query(`
      SELECT id, file_name, file_size, original_path, computer_id, last_local_check
      FROM media_files 
      WHERE user_id = $1 AND storage_type = $2
    `, [userId, storageType]);

    return result.rows.map(row => ({
      mediaId: row.id,
      userId,
      storageType,
      size: parseInt(row.file_size),
      localPath: row.original_path,
      computerId: row.computer_id,
      lastVerified: row.last_local_check ? new Date(row.last_local_check) : undefined
    }));
  }

  private async getAllUserMedia(userId: string): Promise<MediaStorageInfo[]> {
    const result = await db.query(`
      SELECT id, file_name, file_size, storage_type, original_path, computer_id, last_local_check
      FROM media_files 
      WHERE user_id = $1
    `, [userId]);

    return result.rows.map(row => ({
      mediaId: row.id,
      userId,
      storageType: row.storage_type as StorageType,
      size: parseInt(row.file_size),
      localPath: row.original_path,
      computerId: row.computer_id,
      lastVerified: row.last_local_check ? new Date(row.last_local_check) : undefined
    }));
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // This is a simplified implementation - you might want to store user preferences in the database
    return {
      preferredStorageType: 'server',
      maxLocalStorageUsage: 1024 * 1024 * 1024, // 1GB default
      autoMigrateThreshold: 100 * 1024 * 1024, // 100MB
      allowChunkedStorage: true,
      computerIds: []
    };
  }
}

// Export singleton instance
export const hybridStorageService = new HybridStorageService();
export default hybridStorageService;