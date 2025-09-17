import fs from 'fs/promises';
import path from 'path';

interface BatchDownloadInfo {
  startTime: number;
  completed: boolean;
  totalFiles: number;
  completedFiles: number;
  mediaNames: { [index: number]: string };
  progress: { [index: number]: { progress: number; status: string; error?: string } };
  urls: any[];
  userId: string;
  projectId: string;
  projectName: string;
  playlistMetadata?: any;
  playlistCookieFile?: Buffer;
  cookieFiles?: { [key: string]: Buffer };
}

class BatchStorageService {
  private batchDir: string;

  constructor() {
    // Store batch data in a persistent directory
    this.batchDir = path.join(process.cwd(), 'batch-storage');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.batchDir, { recursive: true });
    } catch (error) {
      console.error('[BatchStorage] Failed to create batch directory:', error);
    }
  }

  private getBatchFilePath(batchId: string): string {
    return path.join(this.batchDir, `${batchId}.json`);
  }

  async saveBatch(batchId: string, data: BatchDownloadInfo): Promise<void> {
    try {
      const filePath = this.getBatchFilePath(batchId);

      // Convert buffer data to base64 for JSON storage
      const dataToSave = {
        ...data,
        playlistCookieFile: data.playlistCookieFile ?
          data.playlistCookieFile.toString('base64') : undefined,
        cookieFiles: data.cookieFiles ?
          Object.fromEntries(
            Object.entries(data.cookieFiles).map(([key, buffer]) =>
              [key, buffer.toString('base64')]
            )
          ) : undefined
      };

      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      console.log(`[BatchStorage] Saved batch ${batchId} to file`);
    } catch (error) {
      console.error(`[BatchStorage] Failed to save batch ${batchId}:`, error);
    }
  }

  async loadBatch(batchId: string): Promise<BatchDownloadInfo | null> {
    try {
      const filePath = this.getBatchFilePath(batchId);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Convert base64 back to buffer
      if (parsed.playlistCookieFile) {
        parsed.playlistCookieFile = Buffer.from(parsed.playlistCookieFile, 'base64');
      }
      if (parsed.cookieFiles) {
        parsed.cookieFiles = Object.fromEntries(
          Object.entries(parsed.cookieFiles).map(([key, base64]: [string, any]) =>
            [key, Buffer.from(base64, 'base64')]
          )
        );
      }

      console.log(`[BatchStorage] Loaded batch ${batchId} from file`);
      return parsed;
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error(`[BatchStorage] Failed to load batch ${batchId}:`, error);
      }
      return null;
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    try {
      const filePath = this.getBatchFilePath(batchId);
      await fs.unlink(filePath);
      console.log(`[BatchStorage] Deleted batch ${batchId} file`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error(`[BatchStorage] Failed to delete batch ${batchId}:`, error);
      }
    }
  }

  async cleanupOldBatches(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.batchDir);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.batchDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.unlink(filePath);
            console.log(`[BatchStorage] Cleaned up old batch file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('[BatchStorage] Failed to cleanup old batches:', error);
    }
  }
}

export const batchStorageService = new BatchStorageService();