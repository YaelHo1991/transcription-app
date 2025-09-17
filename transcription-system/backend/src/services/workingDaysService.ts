import * as fs from 'fs/promises';
import * as path from 'path';

interface WorkingDaysData {
  workingDays: string[]; // Array of dates in YYYY-MM-DD format
  lastActiveDate: string;
  totalWorkingDays: number;
}

class WorkingDaysService {
  /**
   * Track a working day for a project
   */
  async trackWorkingDay(
    userId: string,
    projectId: string,
    mediaId: string
  ): Promise<WorkingDaysData> {
    const workingDaysPath = path.join(
      process.cwd(),
      'user_data',
      'users',
      userId,
      'projects',
      projectId,
      'workingDays.json'
    );

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let data: WorkingDaysData;

    try {
      // Try to read existing data
      const existing = await fs.readFile(workingDaysPath, 'utf-8');
      data = JSON.parse(existing);

      // Add today if not already present
      if (!data.workingDays.includes(today)) {
        data.workingDays.push(today);
        data.workingDays.sort(); // Keep chronological order
      }
    } catch (error) {
      // File doesn't exist, create new data
      data = {
        workingDays: [today],
        lastActiveDate: today,
        totalWorkingDays: 1
      };
    }

    // Update metadata
    data.lastActiveDate = today;
    data.totalWorkingDays = data.workingDays.length;

    // Save updated data
    await fs.mkdir(path.dirname(workingDaysPath), { recursive: true });
    await fs.writeFile(workingDaysPath, JSON.stringify(data, null, 2));

    console.log(`[WorkingDays] Tracked working day for project ${projectId}: Day ${data.totalWorkingDays}`);

    return data;
  }

  /**
   * Get the working days data for a project
   */
  async getWorkingDays(
    userId: string,
    projectId: string
  ): Promise<WorkingDaysData | null> {
    const workingDaysPath = path.join(
      process.cwd(),
      'user_data',
      'users',
      userId,
      'projects',
      projectId,
      'workingDays.json'
    );

    try {
      const data = await fs.readFile(workingDaysPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the date from N working days ago
   */
  async getWorkingDayThreshold(
    userId: string,
    projectId: string,
    daysBack: number = 7
  ): Promise<string | null> {
    const data = await this.getWorkingDays(userId, projectId);

    if (!data || data.workingDays.length === 0) {
      return null;
    }

    // If we have fewer working days than requested, return the earliest
    if (data.workingDays.length <= daysBack) {
      return data.workingDays[0];
    }

    // Get the date from N working days ago
    const index = data.workingDays.length - daysBack;
    return data.workingDays[index];
  }

  /**
   * Clean up old backups based on working days
   */
  async pruneOldBackups(
    userId: string,
    projectId: string,
    mediaId: string,
    keepWorkingDays: number = 7
  ): Promise<number> {
    const backupDir = path.join(
      process.cwd(),
      'user_data',
      'users',
      userId,
      'projects',
      projectId,
      'media',
      mediaId,
      'backups'
    );

    try {
      // Get the threshold date
      const thresholdDate = await this.getWorkingDayThreshold(userId, projectId, keepWorkingDays);

      if (!thresholdDate) {
        console.log('[WorkingDays] No threshold date found, keeping all backups');
        return 0;
      }

      const thresholdTime = new Date(thresholdDate).getTime();
      console.log(`[WorkingDays] Pruning backups older than ${thresholdDate} (keeping last ${keepWorkingDays} working days)`);

      // Get all backup files
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup_v'));

      let deletedCount = 0;

      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        // Check if the backup is older than our threshold
        if (stats.mtime.getTime() < thresholdTime) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`[WorkingDays] Deleted old backup: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`[WorkingDays] Pruned ${deletedCount} old backups for media ${mediaId}`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[WorkingDays] Error pruning backups:', error);
      return 0;
    }
  }
}

export default new WorkingDaysService();