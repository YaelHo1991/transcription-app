import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { db } from '../db/connection';

const execPromise = promisify(exec);

export interface SystemStorageInfo {
  totalGB: number;
  usedGB: number;
  availableGB: number;
  usedPercent: number;
}

export interface UserStorageInfo {
  userId: string;
  quotaLimitMB: number;
  quotaUsedMB: number;
  usedPercent: number;
}

interface StorageCache {
  userId: string;
  data: UserStorageInfo;
  timestamp: number;
  calculating?: boolean;
}

export class StorageService {
  private storageCache = new Map<string, StorageCache>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private backgroundTimer?: NodeJS.Timeout;

  constructor() {
    // Start background refresh timer
    this.startBackgroundRefresh();
  }

  /**
   * Start background refresh of storage calculations
   */
  private startBackgroundRefresh() {
    this.backgroundTimer = setInterval(async () => {
      // Refresh cache for users that have been accessed recently
      for (const [userId, cache] of this.storageCache.entries()) {
        const age = Date.now() - cache.timestamp;
        if (age > this.CACHE_TTL && age < this.BACKGROUND_REFRESH_INTERVAL * 2) {
          // Background refresh without blocking
          this.refreshUserStorageBackground(userId);
        }
      }
    }, this.BACKGROUND_REFRESH_INTERVAL);
  }

  /**
   * Background refresh of user storage (non-blocking)
   */
  private async refreshUserStorageBackground(userId: string) {
    try {
      const cached = this.storageCache.get(userId);
      if (cached && !cached.calculating) {
        cached.calculating = true;
        const actualUsedBytes = await this.calculateUserStorageUsage(userId);
        
        const result = await db.query(
          `SELECT quota_limit FROM user_storage_quotas WHERE user_id = $1`,
          [userId]
        );
        
        const quotaLimit = result.rows[0]?.quota_limit || 524288000;
        const quotaLimitMB = Math.round(quotaLimit / (1024 * 1024));
        const quotaUsedMB = Math.round(actualUsedBytes / (1024 * 1024));
        const usedPercent = quotaLimit > 0 ? (actualUsedBytes / quotaLimit) * 100 : 0;

        this.storageCache.set(userId, {
          userId,
          data: {
            userId,
            quotaLimitMB,
            quotaUsedMB,
            usedPercent: Math.round(usedPercent * 10) / 10
          },
          timestamp: Date.now(),
          calculating: false
        });
        
        // Update database with calculated value
        await db.query(
          `UPDATE user_storage_quotas SET quota_used = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
          [actualUsedBytes, userId]
        );
        
        console.log(`[StorageService] Background refresh completed for user ${userId}: ${quotaUsedMB}MB`);
      }
    } catch (error) {
      console.error(`[StorageService] Background refresh failed for user ${userId}:`, error);
      // Remove calculating flag on error
      const cached = this.storageCache.get(userId);
      if (cached) cached.calculating = false;
    }
  }

  /**
   * Get system disk storage information
   * Works on both Windows (for development) and Linux (for DigitalOcean)
   */
  async getSystemStorage(): Promise<SystemStorageInfo> {
    try {
      const platform = os.platform();
      
      if (platform === 'win32') {
        // Windows - use wmic command
        const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        
        // Parse the first data drive (usually C:)
        let totalBytes = 0;
        let freeBytes = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 3 && parts[0] === 'C:') {
            freeBytes = parseInt(parts[1]) || 0;
            totalBytes = parseInt(parts[2]) || 0;
            break;
          }
        }
        
        const usedBytes = totalBytes - freeBytes;
        const totalGB = totalBytes / (1024 * 1024 * 1024);
        const usedGB = usedBytes / (1024 * 1024 * 1024);
        const availableGB = freeBytes / (1024 * 1024 * 1024);
        const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
        
        return {
          totalGB: Math.round(totalGB * 10) / 10,
          usedGB: Math.round(usedGB * 10) / 10,
          availableGB: Math.round(availableGB * 10) / 10,
          usedPercent: Math.round(usedPercent * 10) / 10
        };
      } else {
        // Linux/Mac - use df command
        const { stdout } = await execPromise('df -B1 /');
        const lines = stdout.trim().split('\n');
        
        if (lines.length < 2) {
          throw new Error('Unable to parse df output');
        }
        
        // Parse the data line (second line)
        const parts = lines[1].trim().split(/\s+/);
        const totalBytes = parseInt(parts[1]) || 0;
        const usedBytes = parseInt(parts[2]) || 0;
        const availableBytes = parseInt(parts[3]) || 0;
        
        const totalGB = totalBytes / (1024 * 1024 * 1024);
        const usedGB = usedBytes / (1024 * 1024 * 1024);
        const availableGB = availableBytes / (1024 * 1024 * 1024);
        const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
        
        return {
          totalGB: Math.round(totalGB * 10) / 10,
          usedGB: Math.round(usedGB * 10) / 10,
          availableGB: Math.round(availableGB * 10) / 10,
          usedPercent: Math.round(usedPercent * 10) / 10
        };
      }
    } catch (error) {
      console.error('Error getting system storage:', error);
      // Return mock data for development if command fails
      return {
        totalGB: 50,
        usedGB: 15,
        availableGB: 35,
        usedPercent: 30
      };
    }
  }

  /**
   * Get storage information for a specific user (with caching)
   */
  async getUserStorage(userId: string): Promise<UserStorageInfo> {
    try {
      // Check cache first
      const cached = this.storageCache.get(userId);
      const now = Date.now();
      
      // Return cached data if fresh
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        console.log(`[StorageService] Using cached storage for user ${userId}`);
        return cached.data;
      }
      
      // Get from database (fast lookup)
      const result = await db.query(
        `SELECT 
          user_id,
          quota_limit,
          quota_used,
          updated_at
        FROM user_storage_quotas
        WHERE user_id = $1`,
        [userId]
      );

      if (result.rowCount === 0) {
        // Create default quota if doesn't exist
        await db.query(
          `INSERT INTO user_storage_quotas (user_id, quota_limit, quota_used)
           VALUES ($1, 524288000, 0)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );
        
        const defaultData: UserStorageInfo = {
          userId,
          quotaLimitMB: 500,
          quotaUsedMB: 0,
          usedPercent: 0
        };
        
        // Cache the default data and start background calculation
        this.storageCache.set(userId, {
          userId,
          data: defaultData,
          timestamp: now
        });
        
        // Trigger background calculation for new user (non-blocking)
        this.refreshUserStorageBackground(userId);
        
        return defaultData;
      }

      const row = result.rows[0];
      const quotaLimitMB = Math.round(row.quota_limit / (1024 * 1024));
      const quotaUsedMB = Math.round(row.quota_used / (1024 * 1024));
      const usedPercent = row.quota_limit > 0 ? (row.quota_used / row.quota_limit) * 100 : 0;

      const data: UserStorageInfo = {
        userId,
        quotaLimitMB,
        quotaUsedMB,
        usedPercent: Math.round(usedPercent * 10) / 10
      };
      
      // Cache the data
      this.storageCache.set(userId, {
        userId,
        data,
        timestamp: now
      });
      
      // If data is older than 30 minutes, trigger background refresh
      const dataAge = row.updated_at ? now - new Date(row.updated_at).getTime() : Infinity;
      if (dataAge > 30 * 60 * 1000) {
        this.refreshUserStorageBackground(userId);
      }
      
      console.log(`[StorageService] Returning cached/DB storage for user ${userId}: ${quotaUsedMB}MB`);
      return data;
    } catch (error) {
      console.error('Error getting user storage:', error);
      throw error;
    }
  }

  /**
   * Force refresh storage calculation for a user (use sparingly)
   */
  async forceRefreshUserStorage(userId: string): Promise<UserStorageInfo> {
    console.log(`[StorageService] Force refreshing storage for user ${userId}`);
    
    // Remove from cache to force recalculation
    this.storageCache.delete(userId);
    
    // Calculate actual usage
    const actualUsedBytes = await this.calculateUserStorageUsage(userId);
    
    // Update database
    await db.query(
      `INSERT INTO user_storage_quotas (user_id, quota_limit, quota_used)
       VALUES ($1, 524288000, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET quota_used = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, actualUsedBytes]
    );
    
    // Get fresh data
    return this.getUserStorage(userId);
  }

  /**
   * Calculate actual storage usage for a user by calculating their entire folder size
   */
  private async calculateUserStorageUsage(userId: string): Promise<number> {
    try {
      const path = require('path');
      const fs = require('fs').promises;
      
      // Determine user storage directory - use the actual location where projects are stored
      const userStorageDir = process.env.NODE_ENV === 'production' 
        ? path.join('/var/app/transcription-system/transcription-system/backend/user_data/users', userId)
        : path.join(process.cwd(), 'user_data', 'users', userId);

      // Calculate directory size recursively
      const totalSize = await this.getDirectorySize(userStorageDir);
      
      console.log(`[StorageService] User ${userId} total storage usage: ${Math.round(totalSize / (1024 * 1024))}MB`);
      return totalSize;
    } catch (error) {
      console.error('Error calculating user storage usage:', error);
      return 0;
    }
  }

  /**
   * Recursively calculate directory size
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const fs = require('fs').promises;
      let totalSize = 0;

      try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const itemPath = require('path').join(dirPath, item);
          
          try {
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              totalSize += await this.getDirectorySize(itemPath);
            } else {
              totalSize += stats.size;
            }
          } catch (itemError) {
            // Skip files that can't be accessed
            console.log(`[StorageService] Skipping inaccessible item: ${itemPath}`);
          }
        }
      } catch (dirError) {
        // Directory doesn't exist or can't be read
        console.log(`[StorageService] Directory doesn't exist or can't be read: ${dirPath}`);
        return 0;
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting directory size:', error);
      return 0;
    }
  }

  /**
   * Get storage information for all users
   */
  async getAllUsersStorage(): Promise<UserStorageInfo[]> {
    try {
      const result = await db.query(
        `SELECT 
          u.id as user_id,
          COALESCE(usq.quota_limit, 524288000) as quota_limit,
          COALESCE(usq.quota_used, 0) as quota_used
        FROM users u
        LEFT JOIN user_storage_quotas usq ON u.id = usq.user_id
        ORDER BY u.created_at DESC`
      );

      return result.rows.map(row => {
        const quotaLimitMB = Math.round(row.quota_limit / (1024 * 1024));
        const quotaUsedMB = Math.round(row.quota_used / (1024 * 1024));
        const usedPercent = row.quota_limit > 0 ? (row.quota_used / row.quota_limit) * 100 : 0;

        return {
          userId: row.user_id,
          quotaLimitMB,
          quotaUsedMB,
          usedPercent: Math.round(usedPercent * 10) / 10
        };
      });
    } catch (error) {
      console.error('Error getting all users storage:', error);
      throw error;
    }
  }

  /**
   * Update user storage quota limit
   */
  async updateUserQuota(userId: string, newQuotaMB: number): Promise<void> {
    try {
      const newQuotaBytes = newQuotaMB * 1024 * 1024;
      
      await db.query(
        `INSERT INTO user_storage_quotas (user_id, quota_limit, quota_used)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id) 
         DO UPDATE SET quota_limit = $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, newQuotaBytes]
      );
    } catch (error) {
      console.error('Error updating user quota:', error);
      throw error;
    }
  }

  /**
   * Update user storage usage (when files are added/deleted)
   */
  async updateUserUsage(userId: string, changeBytes: number): Promise<void> {
    try {
      // First ensure the user has a quota record
      await db.query(
        `INSERT INTO user_storage_quotas (user_id, quota_limit, quota_used)
         VALUES ($1, 524288000, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Then update the usage
      await db.query(
        `UPDATE user_storage_quotas 
         SET quota_used = GREATEST(0, quota_used + $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, changeBytes]
      );
    } catch (error) {
      console.error('Error updating user usage:', error);
      throw error;
    }
  }

  /**
   * Calculate total storage allocated and used across all users
   */
  async getTotalStorageStats(): Promise<{
    totalAllocatedMB: number;
    totalUsedMB: number;
    userCount: number;
  }> {
    try {
      const result = await db.query(
        `SELECT 
          SUM(quota_limit) as total_allocated,
          SUM(quota_used) as total_used,
          COUNT(*) as user_count
        FROM user_storage_quotas`
      );

      const row = result.rows[0];
      return {
        totalAllocatedMB: Math.round((row.total_allocated || 0) / (1024 * 1024)),
        totalUsedMB: Math.round((row.total_used || 0) / (1024 * 1024)),
        userCount: parseInt(row.user_count) || 0
      };
    } catch (error) {
      console.error('Error getting total storage stats:', error);
      throw error;
    }
  }

  /**
   * Clear all storage for a specific user
   */
  async clearUserStorage(userId: string): Promise<{
    filesDeleted: number;
    bytesFreed: number;
  }> {
    try {
      const path = require('path');
      const fs = require('fs').promises;
      
      // Determine user storage directory - use the actual location where projects are stored
      const userStorageDir = process.env.NODE_ENV === 'production' 
        ? path.join('/var/app/transcription-system/transcription-system/backend/user_data/users', userId)
        : path.join(process.cwd(), 'user_data', 'users', userId);

      // Calculate current size before deletion
      const bytesBeforeDeletion = await this.getDirectorySize(userStorageDir);
      
      // Count files before deletion
      let filesDeleted = 0;
      try {
        filesDeleted = await this.countFiles(userStorageDir);
      } catch (error) {
        console.log(`[StorageService] Could not count files for user ${userId}:`, error);
      }

      // Delete the entire user directory using built-in fs
      try {
        await fs.rm(userStorageDir, { recursive: true, force: true });
        console.log(`[StorageService] Deleted storage directory for user ${userId}`);
      } catch (error: any) {
        // If fs.rm is not available (older Node), try fs.rmdir
        if (error.code === 'ERR_INVALID_ARG_TYPE' || !fs.rm) {
          try {
            await fs.rmdir(userStorageDir, { recursive: true });
            console.log(`[StorageService] Deleted storage directory for user ${userId} using fs.rmdir`);
          } catch (rmdirError) {
            console.error(`[StorageService] Failed to delete directory for user ${userId}:`, rmdirError);
          }
        } else {
          console.error(`[StorageService] Failed to delete directory for user ${userId}:`, error);
        }
      }

      // Update the user's quota usage to 0
      await db.query(
        `UPDATE user_storage_quotas 
         SET quota_used = 0, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );

      // Also clear any project references from the database
      await db.query(
        `DELETE FROM projects WHERE user_id = $1`,
        [userId]
      );

      return {
        filesDeleted,
        bytesFreed: bytesBeforeDeletion
      };
    } catch (error) {
      console.error('Error clearing user storage:', error);
      throw error;
    }
  }

  /**
   * Clear storage for all users (DANGER!)
   */
  async clearAllUsersStorage(): Promise<{
    totalFilesDeleted: number;
    totalBytesFreed: number;
    usersCleared: number;
  }> {
    try {
      // Get all users
      const usersResult = await db.query('SELECT id FROM users');
      
      let totalFilesDeleted = 0;
      let totalBytesFreed = 0;
      let usersCleared = 0;

      // Clear storage for each user
      for (const user of usersResult.rows) {
        try {
          const result = await this.clearUserStorage(user.id);
          totalFilesDeleted += result.filesDeleted;
          totalBytesFreed += result.bytesFreed;
          usersCleared++;
        } catch (error) {
          console.error(`Failed to clear storage for user ${user.id}:`, error);
        }
      }

      return {
        totalFilesDeleted,
        totalBytesFreed,
        usersCleared
      };
    } catch (error) {
      console.error('Error clearing all users storage:', error);
      throw error;
    }
  }

  /**
   * Count files in a directory recursively
   */
  private async countFiles(dirPath: string): Promise<number> {
    try {
      const fs = require('fs').promises;
      let fileCount = 0;

      try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const itemPath = require('path').join(dirPath, item);
          
          try {
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              fileCount += await this.countFiles(itemPath);
            } else {
              fileCount++;
            }
          } catch (itemError) {
            // Skip files that can't be accessed
          }
        }
      } catch (dirError) {
        // Directory doesn't exist or can't be read
        return 0;
      }

      return fileCount;
    } catch (error) {
      console.error('Error counting files:', error);
      return 0;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
    }
  }
}

export default new StorageService();