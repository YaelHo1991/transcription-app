import { db } from '../db/connection';
import storageService from './storageService';

interface BackgroundJob {
  id: string;
  type: 'storage_calculation' | 'audio_duration_extraction';
  userId: string;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class BackgroundJobService {
  private jobs = new Map<string, BackgroundJob>();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    // Start processing jobs every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 30000);
  }

  /**
   * Queue a storage calculation job for a user
   */
  queueStorageCalculation(userId: string): string {
    const jobId = `storage_${userId}_${Date.now()}`;
    
    // Cancel any existing storage calculation job for this user
    for (const [id, job] of this.jobs.entries()) {
      if (job.type === 'storage_calculation' && job.userId === userId && job.status === 'pending') {
        this.jobs.delete(id);
        console.log(`[BackgroundJobs] Cancelled duplicate storage job for user ${userId}`);
      }
    }

    const job: BackgroundJob = {
      id: jobId,
      type: 'storage_calculation',
      userId,
      data: {},
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    console.log(`[BackgroundJobs] Queued storage calculation for user ${userId}`);
    
    // Process immediately if not already processing
    if (!this.isProcessing) {
      setTimeout(() => this.processJobs(), 100);
    }
    
    return jobId;
  }

  /**
   * Queue an audio duration extraction job
   */
  queueAudioDurationExtraction(userId: string, projectId: string, mediaId: string, audioPath: string): string {
    const jobId = `audio_${userId}_${projectId}_${mediaId}_${Date.now()}`;
    
    const job: BackgroundJob = {
      id: jobId,
      type: 'audio_duration_extraction',
      userId,
      data: { projectId, mediaId, audioPath },
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    console.log(`[BackgroundJobs] Queued audio duration extraction for ${projectId}/${mediaId}`);
    
    return jobId;
  }

  /**
   * Process pending jobs
   */
  private async processJobs() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const pendingJobs = Array.from(this.jobs.values()).filter(job => job.status === 'pending');
    
    if (pendingJobs.length === 0) {
      this.isProcessing = false;
      return;
    }

    // Process up to 2 jobs at a time to avoid overwhelming the system
    const jobsToProcess = pendingJobs.slice(0, 2);
    
    await Promise.all(jobsToProcess.map(job => this.processJob(job)));
    
    this.isProcessing = false;
  }

  /**
   * Process a single job
   */
  private async processJob(job: BackgroundJob) {
    try {
      job.status = 'running';
      job.startedAt = new Date();
      console.log(`[BackgroundJobs] Starting job ${job.id} (${job.type})`);

      if (job.type === 'storage_calculation') {
        await this.processStorageCalculation(job);
      } else if (job.type === 'audio_duration_extraction') {
        await this.processAudioDurationExtraction(job);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      console.log(`[BackgroundJobs] Completed job ${job.id} in ${job.completedAt.getTime() - job.startedAt!.getTime()}ms`);
      
      // Remove completed job after 5 minutes to free memory
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 5 * 60 * 1000);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      console.error(`[BackgroundJobs] Failed job ${job.id}:`, error);
      
      // Remove failed job after 1 hour
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Process storage calculation job
   */
  private async processStorageCalculation(job: BackgroundJob) {
    console.log(`[BackgroundJobs] Calculating storage for user ${job.userId}`);
    
    // Force refresh will recalculate and update the cache
    await storageService.forceRefreshUserStorage(job.userId);
    
    console.log(`[BackgroundJobs] Storage calculation completed for user ${job.userId}`);
  }

  /**
   * Process audio duration extraction job
   */
  private async processAudioDurationExtraction(job: BackgroundJob) {
    const { projectId, mediaId, audioPath } = job.data;
    console.log(`[BackgroundJobs] Extracting audio duration for ${projectId}/${mediaId}`);
    
    try {
      const mm = await import('music-metadata');
      const metadata = await mm.parseFile(audioPath);
      const duration = metadata.format.duration || 0;
      
      // Update the media metadata file with the duration
      const fs = require('fs').promises;
      const path = require('path');
      
      const metadataPath = path.join(
        process.cwd(), 'user_data', 'users', job.userId, 'projects', projectId, 'media', mediaId, 'metadata.json'
      );
      
      try {
        const existingMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        existingMetadata.duration = duration;
        existingMetadata.lastModified = new Date().toISOString();
        await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));
        
        console.log(`[BackgroundJobs] Updated duration for ${mediaId}: ${duration} seconds`);
      } catch (error) {
        console.error(`[BackgroundJobs] Could not update metadata for ${mediaId}:`, error);
      }
      
    } catch (error) {
      console.error(`[BackgroundJobs] Could not extract duration from ${audioPath}:`, error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get job statistics
   */
  getStats(): { pending: number; running: number; completed: number; failed: number } {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();