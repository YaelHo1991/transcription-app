import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { db } from '../db/connection';
import storageService from './storageService';

const streamPipeline = promisify(pipeline);

// Constants
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ORPHAN_AGE_THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

// TypeScript Interfaces
export interface ChunkInfo {
  mediaId: string;
  userId: string;
  originalFileName: string;
  originalSize: number;
  totalChunks: number;
  chunkSize: number;
  chunks: ChunkMetadata[];
  createdAt: string;
  lastModified: string;
  isComplete: boolean;
  mimeType?: string;
  checksum?: string;
}

export interface ChunkMetadata {
  chunkIndex: number;
  chunkId: string;
  size: number;
  checksum: string;
  filePath: string;
  createdAt: string;
  isStored: boolean;
}

export interface ChunkStorageResult {
  success: boolean;
  chunkId: string;
  filePath: string;
  error?: string;
}

export interface AssemblyResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  error?: string;
}

export interface CleanupResult {
  orphanedChunksRemoved: number;
  bytesFreed: number;
  errors: string[];
}

export interface ResumeInfo {
  mediaId: string;
  userId: string;
  lastChunkIndex: number;
  totalChunks: number;
  missingChunks: number[];
  canResume: boolean;
}

export interface ChunkProgress {
  mediaId: string;
  totalChunks: number;
  completedChunks: number;
  progress: number;
  estimatedTimeRemaining?: number;
}

/**
 * ChunkService - Handles file chunking, storage, and reassembly for large media files
 * 
 * Features:
 * - Split files into 5MB chunks for efficient storage and transfer
 * - Organized directory structure per user and media
 * - Resume capability for interrupted transfers
 * - Cleanup of orphaned chunks
 * - Integration with quota management
 * - Support for streaming large files
 */
export class ChunkService {
  private baseDir: string;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Use the same base directory structure as other services
    this.baseDir = path.join(process.cwd(), 'user_data');
    this.initializeService();
    this.startCleanupTimer();
  }

  /**
   * Initialize the service and ensure required database tables exist
   */
  private async initializeService(): Promise<void> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.baseDir, { recursive: true });

      // Create chunk metadata table if it doesn't exist
      await this.initializeChunkTables();

      console.log('[ChunkService] Service initialized successfully');
    } catch (error) {
      console.error('[ChunkService] Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Initialize database tables for chunk metadata
   */
  private async initializeChunkTables(): Promise<void> {
    try {
      // Create chunk_metadata table
      await db.query(`
        CREATE TABLE IF NOT EXISTS chunk_metadata (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          media_id VARCHAR(255) NOT NULL,
          user_id UUID NOT NULL,
          original_filename VARCHAR(255) NOT NULL,
          original_size BIGINT NOT NULL,
          total_chunks INTEGER NOT NULL,
          chunk_size INTEGER NOT NULL,
          mime_type VARCHAR(100),
          checksum VARCHAR(255),
          chunk_info JSONB NOT NULL,
          is_complete BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(media_id, user_id)
        )
      `);

      // Create indexes for better performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_chunk_metadata_media_user ON chunk_metadata(media_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_chunk_metadata_user_id ON chunk_metadata(user_id);
        CREATE INDEX IF NOT EXISTS idx_chunk_metadata_created_at ON chunk_metadata(created_at);
        CREATE INDEX IF NOT EXISTS idx_chunk_metadata_is_complete ON chunk_metadata(is_complete);
      `);

      // Add foreign key constraint to users table
      try {
        await db.query(`
          ALTER TABLE chunk_metadata 
          ADD CONSTRAINT fk_chunk_metadata_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        `);
      } catch (error) {
        // Constraint might already exist, ignore error
      }

      console.log('[ChunkService] Database tables initialized successfully');
    } catch (error) {
      console.error('[ChunkService] Failed to initialize database tables:', error);
      throw error;
    }
  }

  /**
   * Start the cleanup timer for orphaned chunks
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupOrphanedChunks();
      } catch (error) {
        console.error('[ChunkService] Automatic cleanup failed:', error);
      }
    }, CLEANUP_INTERVAL);
  }

  /**
   * Get user-specific chunks directory
   */
  private getUserChunksDir(userId: string): string {
    const safeUserId = userId.toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.baseDir, 'users', safeUserId, 'chunks');
  }

  /**
   * Get media-specific chunks directory
   */
  private getMediaChunksDir(userId: string, mediaId: string): string {
    const safeMediaId = mediaId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.getUserChunksDir(userId), safeMediaId);
  }

  /**
   * Generate chunk ID
   */
  private generateChunkId(mediaId: string, chunkIndex: number): string {
    return `${mediaId}_chunk_${chunkIndex.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate file checksum (simple hash for now)
   */
  private async calculateChecksum(buffer: Buffer): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Chunk a file into smaller pieces
   */
  async chunkFile(filePath: string, mediaId: string, userId: string, originalFileName?: string): Promise<ChunkInfo> {
    try {
      console.log(`[ChunkService] Starting to chunk file: ${filePath} for user ${userId}, media ${mediaId}`);

      // Check if file exists
      const fileStats = await fs.stat(filePath);
      if (!fileStats.isFile()) {
        throw new Error('Provided path is not a file');
      }

      const originalSize = fileStats.size;
      const totalChunks = Math.ceil(originalSize / CHUNK_SIZE);
      const fileName = originalFileName || path.basename(filePath);

      // Check user storage quota
      const storageCheck = await storageService.canUserUpload(userId, originalSize);
      if (!storageCheck.canUpload) {
        throw new Error(`Storage quota exceeded: ${storageCheck.message}`);
      }

      // Create chunks directory
      const chunksDir = this.getMediaChunksDir(userId, mediaId);
      await fs.mkdir(chunksDir, { recursive: true });

      // Initialize chunk info
      const chunkInfo: ChunkInfo = {
        mediaId,
        userId,
        originalFileName: fileName,
        originalSize,
        totalChunks,
        chunkSize: CHUNK_SIZE,
        chunks: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isComplete: false
      };

      // Create chunks
      const fileStream = createReadStream(filePath);
      let chunkIndex = 0;
      let totalBytesRead = 0;

      const chunks: ChunkMetadata[] = [];

      return new Promise((resolve, reject) => {
        const processChunk = async (chunkBuffer: Buffer) => {
          try {
            const chunkId = this.generateChunkId(mediaId, chunkIndex);
            const chunkFileName = `${chunkId}.bin`;
            const chunkFilePath = path.join(chunksDir, chunkFileName);

            // Save chunk to disk
            await fs.writeFile(chunkFilePath, chunkBuffer);

            // Calculate checksum
            const checksum = await this.calculateChecksum(chunkBuffer);

            // Create chunk metadata
            const chunkMetadata: ChunkMetadata = {
              chunkIndex,
              chunkId,
              size: chunkBuffer.length,
              checksum,
              filePath: chunkFilePath,
              createdAt: new Date().toISOString(),
              isStored: true
            };

            chunks.push(chunkMetadata);
            chunkIndex++;
            totalBytesRead += chunkBuffer.length;

            console.log(`[ChunkService] Created chunk ${chunkIndex}/${totalChunks} for ${mediaId}`);
          } catch (error) {
            console.error(`[ChunkService] Error processing chunk ${chunkIndex}:`, error);
            throw error;
          }
        };

        let buffer = Buffer.alloc(0);

        fileStream.on('data', async (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);

          // Process complete chunks
          while (buffer.length >= CHUNK_SIZE) {
            const chunkBuffer = buffer.slice(0, CHUNK_SIZE);
            buffer = buffer.slice(CHUNK_SIZE);

            try {
              await processChunk(chunkBuffer);
            } catch (error) {
              fileStream.destroy();
              reject(error);
              return;
            }
          }
        });

        fileStream.on('end', async () => {
          try {
            // Process remaining data as final chunk
            if (buffer.length > 0) {
              await processChunk(buffer);
            }

            // Update chunk info
            chunkInfo.chunks = chunks;
            chunkInfo.isComplete = true;
            chunkInfo.lastModified = new Date().toISOString();

            // Store metadata in database
            await this.storeChunkInfo(chunkInfo);

            // Update user storage usage
            await storageService.incrementUsedStorage(userId, originalSize);

            console.log(`[ChunkService] Successfully chunked file into ${totalChunks} chunks for ${mediaId}`);
            resolve(chunkInfo);
          } catch (error) {
            reject(error);
          }
        });

        fileStream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[ChunkService] Error chunking file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Store chunk metadata in database
   */
  private async storeChunkInfo(chunkInfo: ChunkInfo): Promise<void> {
    try {
      await db.query(`
        INSERT INTO chunk_metadata (
          media_id, user_id, original_filename, original_size, total_chunks,
          chunk_size, mime_type, checksum, chunk_info, is_complete, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (media_id, user_id) 
        DO UPDATE SET 
          original_filename = $3,
          original_size = $4,
          total_chunks = $5,
          chunk_size = $6,
          mime_type = $7,
          checksum = $8,
          chunk_info = $9,
          is_complete = $10,
          updated_at = CURRENT_TIMESTAMP
      `, [
        chunkInfo.mediaId,
        chunkInfo.userId,
        chunkInfo.originalFileName,
        chunkInfo.originalSize,
        chunkInfo.totalChunks,
        chunkInfo.chunkSize,
        chunkInfo.mimeType,
        chunkInfo.checksum,
        JSON.stringify(chunkInfo.chunks),
        chunkInfo.isComplete
      ]);
    } catch (error) {
      console.error('[ChunkService] Error storing chunk info in database:', error);
      throw error;
    }
  }

  /**
   * Store a single chunk
   */
  async storeChunk(chunkData: Buffer, chunkIndex: number, mediaId: string, userId: string): Promise<ChunkStorageResult> {
    try {
      // Ensure chunks directory exists
      const chunksDir = this.getMediaChunksDir(userId, mediaId);
      await fs.mkdir(chunksDir, { recursive: true });

      // Generate chunk ID and file path
      const chunkId = this.generateChunkId(mediaId, chunkIndex);
      const chunkFileName = `${chunkId}.bin`;
      const chunkFilePath = path.join(chunksDir, chunkFileName);

      // Save chunk to disk
      await fs.writeFile(chunkFilePath, chunkData);

      console.log(`[ChunkService] Stored chunk ${chunkIndex} for ${mediaId} (${chunkData.length} bytes)`);

      return {
        success: true,
        chunkId,
        filePath: chunkFilePath
      };
    } catch (error) {
      console.error(`[ChunkService] Error storing chunk ${chunkIndex} for ${mediaId}:`, error);
      return {
        success: false,
        chunkId: this.generateChunkId(mediaId, chunkIndex),
        filePath: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Assemble chunks back into complete file
   */
  async assembleChunks(mediaId: string, userId: string, outputStream?: boolean): Promise<AssemblyResult> {
    try {
      console.log(`[ChunkService] Assembling chunks for ${mediaId}, user ${userId}`);

      // Get chunk info from database
      const chunkInfo = await this.getChunkInfo(mediaId, userId);
      if (!chunkInfo) {
        return { success: false, error: 'Chunk info not found' };
      }

      if (!chunkInfo.isComplete) {
        return { success: false, error: 'Chunks are not complete' };
      }

      const chunksDir = this.getMediaChunksDir(userId, mediaId);

      if (outputStream) {
        // Return as stream for large files
        return await this.assembleToStream(chunkInfo, chunksDir);
      } else {
        // Return as buffer for smaller files
        return await this.assembleToBuffer(chunkInfo, chunksDir);
      }
    } catch (error) {
      console.error(`[ChunkService] Error assembling chunks for ${mediaId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Assemble chunks to buffer
   */
  private async assembleToBuffer(chunkInfo: ChunkInfo, chunksDir: string): Promise<AssemblyResult> {
    try {
      const buffers: Buffer[] = [];
      let totalSize = 0;

      // Read all chunks in order
      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunkId = this.generateChunkId(chunkInfo.mediaId, i);
        const chunkFilePath = path.join(chunksDir, `${chunkId}.bin`);

        try {
          const chunkBuffer = await fs.readFile(chunkFilePath);
          buffers.push(chunkBuffer);
          totalSize += chunkBuffer.length;
        } catch (error) {
          return { success: false, error: `Missing chunk ${i}` };
        }
      }

      const completeBuffer = Buffer.concat(buffers, totalSize);

      console.log(`[ChunkService] Assembled ${chunkInfo.totalChunks} chunks into buffer (${totalSize} bytes)`);

      return {
        success: true,
        buffer: completeBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Buffer assembly failed'
      };
    }
  }

  /**
   * Assemble chunks to stream
   */
  private async assembleToStream(chunkInfo: ChunkInfo, chunksDir: string): Promise<AssemblyResult> {
    const { Readable } = require('stream');

    const stream = new Readable({
      read() {
        // Implementation will be handled by the generator
      }
    });

    // Start async chunk reading
    setImmediate(async () => {
      try {
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
          const chunkId = this.generateChunkId(chunkInfo.mediaId, i);
          const chunkFilePath = path.join(chunksDir, `${chunkId}.bin`);

          try {
            const chunkBuffer = await fs.readFile(chunkFilePath);
            if (!stream.push(chunkBuffer)) {
              // Wait for drain event if needed
              await new Promise(resolve => stream.once('drain', resolve));
            }
          } catch (error) {
            stream.destroy(new Error(`Missing chunk ${i}`));
            return;
          }
        }

        // Signal end of stream
        stream.push(null);

        console.log(`[ChunkService] Assembled ${chunkInfo.totalChunks} chunks into stream`);
      } catch (error) {
        stream.destroy(error instanceof Error ? error : new Error('Stream assembly failed'));
      }
    });

    return {
      success: true,
      stream
    };
  }

  /**
   * Get chunk information from database
   */
  async getChunkInfo(mediaId: string, userId: string): Promise<ChunkInfo | null> {
    try {
      const result = await db.query(`
        SELECT * FROM chunk_metadata 
        WHERE media_id = $1 AND user_id = $2
      `, [mediaId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const chunks = JSON.parse(row.chunk_info);

      return {
        mediaId: row.media_id,
        userId: row.user_id,
        originalFileName: row.original_filename,
        originalSize: parseInt(row.original_size),
        totalChunks: row.total_chunks,
        chunkSize: row.chunk_size,
        chunks,
        createdAt: row.created_at.toISOString(),
        lastModified: row.updated_at.toISOString(),
        isComplete: row.is_complete,
        mimeType: row.mime_type,
        checksum: row.checksum
      };
    } catch (error) {
      console.error(`[ChunkService] Error getting chunk info for ${mediaId}:`, error);
      return null;
    }
  }

  /**
   * Resume interrupted upload
   */
  async resumeUpload(mediaId: string, userId: string): Promise<ResumeInfo> {
    try {
      const chunkInfo = await this.getChunkInfo(mediaId, userId);
      if (!chunkInfo) {
        return {
          mediaId,
          userId,
          lastChunkIndex: -1,
          totalChunks: 0,
          missingChunks: [],
          canResume: false
        };
      }

      // Check which chunks are actually present on disk
      const chunksDir = this.getMediaChunksDir(userId, mediaId);
      const missingChunks: number[] = [];
      let lastChunkIndex = -1;

      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunkId = this.generateChunkId(mediaId, i);
        const chunkFilePath = path.join(chunksDir, `${chunkId}.bin`);

        try {
          await fs.access(chunkFilePath);
          lastChunkIndex = i;
        } catch {
          missingChunks.push(i);
        }
      }

      return {
        mediaId,
        userId,
        lastChunkIndex,
        totalChunks: chunkInfo.totalChunks,
        missingChunks,
        canResume: missingChunks.length > 0
      };
    } catch (error) {
      console.error(`[ChunkService] Error checking resume info for ${mediaId}:`, error);
      return {
        mediaId,
        userId,
        lastChunkIndex: -1,
        totalChunks: 0,
        missingChunks: [],
        canResume: false
      };
    }
  }

  /**
   * Get upload progress
   */
  async getProgress(mediaId: string, userId: string): Promise<ChunkProgress> {
    try {
      const chunkInfo = await this.getChunkInfo(mediaId, userId);
      if (!chunkInfo) {
        return {
          mediaId,
          totalChunks: 0,
          completedChunks: 0,
          progress: 0
        };
      }

      // Count existing chunks on disk
      const chunksDir = this.getMediaChunksDir(userId, mediaId);
      let completedChunks = 0;

      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunkId = this.generateChunkId(mediaId, i);
        const chunkFilePath = path.join(chunksDir, `${chunkId}.bin`);

        try {
          await fs.access(chunkFilePath);
          completedChunks++;
        } catch {
          // Chunk doesn't exist
        }
      }

      const progress = chunkInfo.totalChunks > 0 ? (completedChunks / chunkInfo.totalChunks) * 100 : 0;

      return {
        mediaId,
        totalChunks: chunkInfo.totalChunks,
        completedChunks,
        progress: Math.round(progress * 100) / 100
      };
    } catch (error) {
      console.error(`[ChunkService] Error getting progress for ${mediaId}:`, error);
      return {
        mediaId,
        totalChunks: 0,
        completedChunks: 0,
        progress: 0
      };
    }
  }

  /**
   * Clean up orphaned chunks
   */
  async cleanupOrphanedChunks(userId?: string): Promise<CleanupResult> {
    console.log(`[ChunkService] Starting cleanup of orphaned chunks${userId ? ` for user ${userId}` : ''}`);
    
    const result: CleanupResult = {
      orphanedChunksRemoved: 0,
      bytesFreed: 0,
      errors: []
    };

    try {
      // Get all chunk metadata from database
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];
      
      const dbResult = await db.query(`
        SELECT media_id, user_id, created_at, original_size 
        FROM chunk_metadata 
        ${whereClause}
      `, params);

      const validChunks = new Set();
      for (const row of dbResult.rows) {
        validChunks.add(`${row.user_id}/${row.media_id}`);
      }

      // Scan filesystem for chunk directories
      const usersDir = path.join(this.baseDir, 'users');
      
      try {
        const userDirs = await fs.readdir(usersDir);
        
        for (const userDir of userDirs) {
          if (userId && userDir !== userId.replace(/[^a-zA-Z0-9-_]/g, '_')) {
            continue;
          }

          const userChunksDir = path.join(usersDir, userDir, 'chunks');
          
          try {
            const mediaDirs = await fs.readdir(userChunksDir);
            
            for (const mediaDir of mediaDirs) {
              const fullKey = `${userDir}/${mediaDir}`;
              const mediaChunksDir = path.join(userChunksDir, mediaDir);
              
              // Check if this chunk set is orphaned
              const stats = await fs.stat(mediaChunksDir);
              const ageMs = Date.now() - stats.mtimeMs;
              
              if (!validChunks.has(fullKey) && ageMs > ORPHAN_AGE_THRESHOLD) {
                try {
                  // Calculate size before deletion
                  const size = await this.getDirectorySize(mediaChunksDir);
                  
                  // Remove orphaned chunk directory
                  await fs.rm(mediaChunksDir, { recursive: true, force: true });
                  
                  result.orphanedChunksRemoved++;
                  result.bytesFreed += size;
                  
                  console.log(`[ChunkService] Removed orphaned chunks for ${fullKey} (${Math.round(size / 1024)} KB)`);
                } catch (error) {
                  const errorMsg = `Failed to remove ${mediaChunksDir}: ${error}`;
                  result.errors.push(errorMsg);
                  console.error(`[ChunkService] ${errorMsg}`);
                }
              }
            }
          } catch (error) {
            // User chunks directory doesn't exist
          }
        }
      } catch (error) {
        // Users directory doesn't exist
      }

      // Also clean up incomplete chunks older than threshold
      const cutoffDate = new Date(Date.now() - ORPHAN_AGE_THRESHOLD);
      const cleanupResult = await db.query(`
        DELETE FROM chunk_metadata 
        WHERE is_complete = FALSE AND created_at < $1
        ${userId ? 'AND user_id = $2' : ''}
      `, userId ? [cutoffDate, userId] : [cutoffDate]);

      if (cleanupResult.rowCount > 0) {
        console.log(`[ChunkService] Cleaned up ${cleanupResult.rowCount} incomplete chunk metadata entries`);
      }

      console.log(`[ChunkService] Cleanup completed: ${result.orphanedChunksRemoved} orphaned chunks removed, ${Math.round(result.bytesFreed / (1024 * 1024))} MB freed`);
      
      return result;
    } catch (error) {
      console.error('[ChunkService] Error during cleanup:', error);
      result.errors.push(`Cleanup failed: ${error}`);
      return result;
    }
  }

  /**
   * Calculate directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error(`[ChunkService] Error calculating directory size for ${dirPath}:`, error);
      return 0;
    }
  }

  /**
   * Delete chunks for a specific media
   */
  async deleteMediaChunks(mediaId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[ChunkService] Deleting chunks for ${mediaId}, user ${userId}`);

      // Remove chunk directory from filesystem
      const chunksDir = this.getMediaChunksDir(userId, mediaId);
      
      try {
        await fs.rm(chunksDir, { recursive: true, force: true });
      } catch (error) {
        // Directory might not exist, that's OK
      }

      // Remove metadata from database
      await db.query(`
        DELETE FROM chunk_metadata 
        WHERE media_id = $1 AND user_id = $2
      `, [mediaId, userId]);

      console.log(`[ChunkService] Successfully deleted chunks for ${mediaId}`);
      return true;
    } catch (error) {
      console.error(`[ChunkService] Error deleting chunks for ${mediaId}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics for chunks
   */
  async getStorageStats(userId?: string): Promise<{
    totalChunkSets: number;
    totalChunks: number;
    totalSizeBytes: number;
    incompleteChunkSets: number;
  }> {
    try {
      const whereClause = userId ? 'WHERE user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await db.query(`
        SELECT 
          COUNT(*) as total_chunk_sets,
          SUM(total_chunks) as total_chunks,
          SUM(original_size) as total_size_bytes,
          SUM(CASE WHEN is_complete = FALSE THEN 1 ELSE 0 END) as incomplete_chunk_sets
        FROM chunk_metadata
        ${whereClause}
      `, params);

      const row = result.rows[0];
      return {
        totalChunkSets: parseInt(row.total_chunk_sets) || 0,
        totalChunks: parseInt(row.total_chunks) || 0,
        totalSizeBytes: parseInt(row.total_size_bytes) || 0,
        incompleteChunkSets: parseInt(row.incomplete_chunk_sets) || 0
      };
    } catch (error) {
      console.error('[ChunkService] Error getting storage stats:', error);
      return {
        totalChunkSets: 0,
        totalChunks: 0,
        totalSizeBytes: 0,
        incompleteChunkSets: 0
      };
    }
  }

  /**
   * Verify chunk integrity
   */
  async verifyChunkIntegrity(mediaId: string, userId: string): Promise<{
    isValid: boolean;
    missingChunks: number[];
    corruptedChunks: number[];
    errors: string[];
  }> {
    const result = {
      isValid: true,
      missingChunks: [] as number[],
      corruptedChunks: [] as number[],
      errors: [] as string[]
    };

    try {
      const chunkInfo = await this.getChunkInfo(mediaId, userId);
      if (!chunkInfo) {
        result.isValid = false;
        result.errors.push('Chunk info not found in database');
        return result;
      }

      const chunksDir = this.getMediaChunksDir(userId, mediaId);

      // Verify each chunk
      for (let i = 0; i < chunkInfo.totalChunks; i++) {
        const chunkId = this.generateChunkId(mediaId, i);
        const chunkFilePath = path.join(chunksDir, `${chunkId}.bin`);

        try {
          const chunkBuffer = await fs.readFile(chunkFilePath);
          const expectedChunk = chunkInfo.chunks.find(c => c.chunkIndex === i);

          if (expectedChunk) {
            // Verify checksum
            const actualChecksum = await this.calculateChecksum(chunkBuffer);
            if (actualChecksum !== expectedChunk.checksum) {
              result.corruptedChunks.push(i);
              result.isValid = false;
            }

            // Verify size
            if (chunkBuffer.length !== expectedChunk.size) {
              result.errors.push(`Chunk ${i} size mismatch: expected ${expectedChunk.size}, got ${chunkBuffer.length}`);
              result.isValid = false;
            }
          }
        } catch (error) {
          result.missingChunks.push(i);
          result.isValid = false;
        }
      }

      if (result.missingChunks.length > 0 || result.corruptedChunks.length > 0) {
        result.isValid = false;
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Verification failed: ${error}`);
      return result;
    }
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    console.log('[ChunkService] Service destroyed');
  }
}

// Export singleton instance
export const chunkService = new ChunkService();
export default chunkService;