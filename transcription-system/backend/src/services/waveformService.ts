import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import axios from 'axios';
import * as os from 'os';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

interface WaveformData {
  peaks: number[];
  duration: number;
  peakCount: number;
}

interface WaveformGenerationOptions {
  fileId: string;
  fileUrl: string;
  fileSize: number;
  targetPeaks?: number; // Default: 2000
}

class WaveformService {
  private pool: Pool;
  private tempDir: string;
  
  constructor(pool: Pool) {
    this.pool = pool;
    this.tempDir = path.join(os.tmpdir(), 'waveforms');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate waveform data for a media file
   */
  async generateWaveform(options: WaveformGenerationOptions): Promise<WaveformData> {
    const { fileId, fileUrl, fileSize, targetPeaks = 2000 } = options;
    const startTime = Date.now();
    
    try {
      // Check if waveform already exists
      const existing = await this.getWaveform(fileId);
      if (existing) {
        // console.log removed for production
        return existing;
      }

      // Download file to temp location if it's a URL
      let inputPath: string;
      if (fileUrl.startsWith('http')) {
        inputPath = await this.downloadFile(fileUrl, fileId);
      } else {
        inputPath = fileUrl;
      }

      // Get audio duration using FFprobe
      const duration = await this.getAudioDuration(inputPath);
      
      // Generate waveform peaks using FFmpeg
      const peaks = await this.extractPeaks(inputPath, targetPeaks, duration);
      
      // Clean up temp file if we downloaded it
      if (fileUrl.startsWith('http')) {
        await fsPromises.unlink(inputPath).catch(() => {});
      }

      // Store in database
      const processingTime = (Date.now() - startTime) / 1000;
      await this.storeWaveform({
        fileId,
        fileUrl,
        fileSize,
        duration,
        peaks,
        peakCount: peaks.length,
        processingTime
      });

      return {
        peaks,
        duration,
        peakCount: peaks.length
      };
    } catch (error) {
      console.error('Waveform generation failed:', error);
      throw new Error(`Failed to generate waveform: ${error.message}`);
    }
  }

  /**
   * Get waveform data from database
   */
  async getWaveform(fileId: string): Promise<WaveformData | null> {
    try {
      const query = `
        SELECT peaks, duration, peak_count as "peakCount"
        FROM waveforms
        WHERE file_id = $1
      `;
      
      const result = await this.pool.query(query, [fileId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get waveform:', error);
      return null;
    }
  }

  /**
   * Get a segment of waveform data (for progressive loading)
   */
  async getWaveformSegment(fileId: string, start: number, end: number): Promise<any> {
    try {
      const waveform = await this.getWaveform(fileId);
      if (!waveform) {
        return null;
      }

      const segment = waveform.peaks.slice(start, end);
      
      return {
        segment,
        startIndex: start,
        endIndex: Math.min(end, waveform.peaks.length),
        totalPeaks: waveform.peakCount
      };
    } catch (error) {
      console.error('Failed to get waveform segment:', error);
      return null;
    }
  }

  /**
   * Delete waveform data
   */
  async deleteWaveform(fileId: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM waveforms WHERE file_id = $1';
      const result = await this.pool.query(query, [fileId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete waveform:', error);
      return false;
    }
  }

  /**
   * Private: Download file to temp location
   */
  private async downloadFile(url: string, fileId: string): Promise<string> {
    const tempPath = path.join(this.tempDir, `${fileId}_temp.mp3`);
    const writer = fs.createWriteStream(tempPath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempPath));
      writer.on('error', reject);
    });
  }

  /**
   * Private: Get audio duration using FFprobe
   */
  private async getAudioDuration(inputPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
      );
      
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Failed to get duration:', error);
      throw new Error('Failed to get audio duration');
    }
  }

  /**
   * Private: Extract audio peaks using FFmpeg
   */
  private async extractPeaks(inputPath: string, targetPeaks: number, duration: number): Promise<number[]> {
    const tempDataPath = path.join(this.tempDir, `${Date.now()}_peaks.dat`);
    
    try {
      // Calculate sample rate to get desired number of peaks
      // We want targetPeaks samples for the entire duration
      const sampleRate = Math.round(targetPeaks / duration);
      
      // Extract raw PCM data at reduced sample rate
      await execAsync(
        `ffmpeg -i "${inputPath}" -ac 1 -filter:a aresample=${sampleRate} -map 0:a -c:a pcm_s16le -f s16le "${tempDataPath}"`
      );

      // Read and process the raw PCM data
      const buffer = await fsPromises.readFile(tempDataPath);
      const peaks: number[] = [];
      
      // Process PCM data (16-bit signed little-endian)
      for (let i = 0; i < buffer.length - 1; i += 2) {
        const sample = buffer.readInt16LE(i);
        const normalized = Math.abs(sample) / 32768; // Normalize to 0-1
        peaks.push(normalized);
      }

      // Clean up temp file
      await fsPromises.unlink(tempDataPath).catch(() => {});

      // Resample to exact target peaks if needed
      if (peaks.length > targetPeaks) {
        return this.resamplePeaks(peaks, targetPeaks);
      }

      return peaks;
    } catch (error) {
      // Clean up on error
      await fsPromises.unlink(tempDataPath).catch(() => {});
      console.error('Failed to extract peaks:', error);
      throw new Error('Failed to extract audio peaks');
    }
  }

  /**
   * Private: Resample peaks to target count
   */
  private resamplePeaks(peaks: number[], targetCount: number): number[] {
    const result: number[] = [];
    const ratio = peaks.length / targetCount;
    
    for (let i = 0; i < targetCount; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      
      // Get max peak in this range
      let maxPeak = 0;
      for (let j = start; j < end && j < peaks.length; j++) {
        maxPeak = Math.max(maxPeak, peaks[j]);
      }
      
      result.push(maxPeak);
    }
    
    return result;
  }

  /**
   * Private: Store waveform in database
   */
  private async storeWaveform(data: {
    fileId: string;
    fileUrl: string;
    fileSize: number;
    duration: number;
    peaks: number[];
    peakCount: number;
    processingTime: number;
  }): Promise<void> {
    const query = `
      INSERT INTO waveforms (
        file_id, file_url, file_size, duration, 
        peaks, peak_count, processing_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (file_id) 
      DO UPDATE SET 
        peaks = EXCLUDED.peaks,
        peak_count = EXCLUDED.peak_count,
        processing_time = EXCLUDED.processing_time,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      data.fileId,
      data.fileUrl,
      data.fileSize,
      data.duration,
      JSON.stringify(data.peaks),
      data.peakCount,
      data.processingTime
    ]);
  }

  /**
   * Clean up old waveforms (older than specified days)
   */
  async cleanupOldWaveforms(daysOld: number = 30): Promise<number> {
    try {
      const query = `
        DELETE FROM waveforms 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      `;
      
      const result = await this.pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old waveforms:', error);
      return 0;
    }
  }
}

export default WaveformService;