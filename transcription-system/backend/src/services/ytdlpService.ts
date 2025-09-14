import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface YtDlpOptions {
  url: string;
  outputPath: string;
  cookieFile?: string;
  quality?: 'high' | 'medium' | 'low';
  downloadType?: 'video' | 'audio';
  onProgress?: (progress: number) => void;
}

interface VideoInfo {
  title: string;
  duration: number;
  filename: string;
  format: string;
  hasVideo?: boolean; // Indicates if the content has video streams
  vcodec?: string;
  height?: number;
}

interface FormatInfo {
  quality: 'high' | 'medium' | 'low';
  resolution: string;
  estimatedSize: string;
  format: string;
}

interface PlaylistVideoInfo {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  uploader?: string;
  uploadDate?: string;
}

interface PlaylistInfo {
  title: string;
  id: string;
  description?: string;
  uploader?: string;
  videoCount: number;
  videos: PlaylistVideoInfo[];
}

export class YtDlpService {
  /**
   * Get the correct yt-dlp command for the platform
   */
  private static getYtDlpCommand(): string {
    if (process.platform === 'win32') {
      // On Windows, try to use the full path if yt-dlp is not in PATH
      const possiblePaths = [
        'C:/Users/ayelh/AppData/Local/Programs/Python/Python313/Scripts/yt-dlp.exe',
        'C:/Python/Scripts/yt-dlp.exe',
        'C:/Python313/Scripts/yt-dlp.exe',
        'yt-dlp.exe',
        'yt-dlp'
      ];
      
      for (const ytdlpPath of possiblePaths) {
        console.log(`[YtDlpService] Checking path: ${ytdlpPath}`);
        if (fs.existsSync(ytdlpPath)) {
          console.log(`[YtDlpService] Found yt-dlp at: ${ytdlpPath}`);
          return ytdlpPath;
        } else {
          console.log(`[YtDlpService] Path does not exist: ${ytdlpPath}`);
        }
      }
      console.log('[YtDlpService] No yt-dlp found in predefined paths, falling back to PATH');
    }
    
    return 'yt-dlp';
  }
  /**
   * Get video information without downloading
   */
  static async getVideoInfo(url: string, cookieFile?: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-playlist',
        url
      ];
      
      if (cookieFile) {
        args.push('--cookies', cookieFile);
      }
      
      const ytdlpCommand = this.getYtDlpCommand();
      const ytdlp = spawn(ytdlpCommand, args);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Failed to get video info'));
          return;
        }
        
        try {
          const info = JSON.parse(stdout);
          resolve({
            title: info.title || 'Unknown',
            duration: info.duration || 0,
            filename: '',
            format: info.ext || 'mp4',
            hasVideo: info.vcodec !== 'none'
          });
        } catch (error) {
          reject(new Error('Failed to parse video info'));
        }
      });
      
      ytdlp.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Get available formats for a URL
   */
  static async getAvailableFormats(url: string, cookieFile?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        '--list-formats',
        '--no-playlist',
        url
      ];
      
      if (cookieFile) {
        args.push('--cookies', cookieFile);
      }
      
      const ytdlpCommand = this.getYtDlpCommand();
      const ytdlp = spawn(ytdlpCommand, args);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Failed to get formats'));
          return;
        }
        
        // Parse format list and extract relevant info
        const formats = {
          best: { resolution: 'Best Available', filesize: '200-500 MB' },
          medium: { resolution: '720p', filesize: '100-250 MB' },
          low: { resolution: '480p', filesize: '50-150 MB' }
        };
        
        resolve(formats);
      });
      
      ytdlp.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Check if a URL is a playlist
   */
  static isPlaylistUrl(url: string): boolean {
    return url.includes('playlist?list=') || 
           url.includes('&list=') || 
           url.includes('?list=') ||
           /\/playlist\//.test(url);
  }
  
  /**
   * Get playlist information without downloading
   */
  static async getPlaylistInfo(url: string, cookieFile?: string): Promise<PlaylistInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--flat-playlist',
        url
      ];
      
      if (cookieFile) {
        args.push('--cookies', cookieFile);
      }
      
      const ytdlpCommand = this.getYtDlpCommand();
      const ytdlp = spawn(ytdlpCommand, args);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || 'Failed to get playlist info'));
          return;
        }
        
        try {
          // Parse each line as JSON (yt-dlp returns one JSON object per line for playlist)
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const videos: PlaylistVideoInfo[] = [];
          let playlistTitle = 'Unknown Playlist';
          let playlistId = '';
          
          for (const line of lines) {
            try {
              const info = JSON.parse(line);
              
              // Extract playlist info from the first video entry
              if (!playlistId && info.playlist_id) {
                playlistTitle = info.playlist_title || info.playlist || 'Unknown Playlist';
                playlistId = info.playlist_id || '';
              }
              
              // Add video entry
              if (info.id && info.title) {
                videos.push({
                  id: info.id,
                  title: info.title || 'Unknown Video',
                  url: info.url || info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
                  duration: info.duration || 0,
                  thumbnail: info.thumbnail,
                  uploader: info.uploader || info.channel,
                  uploadDate: info.upload_date || info.timestamp
                });
              }
            } catch (parseError) {
              console.log('[YtDlpService] Failed to parse line:', line);
            }
          }
          
          resolve({
            title: playlistTitle,
            id: playlistId,
            videoCount: videos.length,
            videos: videos
          });
          
        } catch (error) {
          reject(new Error('Failed to parse playlist info'));
        }
      });
      
      ytdlp.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Download video from URL using yt-dlp
   */
  static async downloadVideo(options: YtDlpOptions): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const { url, outputPath, cookieFile, quality = 'high', downloadType = 'video', onProgress } = options;
      
      // Generate unique filename
      const mediaId = `media-${uuidv4()}`;
      const outputTemplate = path.join(outputPath, `${mediaId}.%(ext)s`);
      
      // Determine format based on quality and download type
      let formatString = 'best[ext=mp4]/best'; // default high quality video
      
      if (downloadType === 'audio') {
        // Extract audio only
        formatString = 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio';
      } else {
        // Video download
        if (quality === 'medium') {
          // 720p or best available under 720p
          formatString = 'best[height<=720][ext=mp4]/best[height<=720]/best';
        } else if (quality === 'low') {
          // 480p or best available under 480p
          formatString = 'best[height<=480][ext=mp4]/best[height<=480]/best';
        }
      }
      
      // Build yt-dlp command arguments
      const args = [
        '-f', formatString,
        '-o', outputTemplate,
        '--no-playlist', // Download single video only
        '--progress',
        '--newline', // Progress on new lines
        '--restrict-filenames', // Use safe filenames
      ];
      
      // Add audio extraction flag if downloading audio only
      if (downloadType === 'audio') {
        args.push('--extract-audio');
        args.push('--audio-format', 'mp3');
        args.push('--audio-quality', '0'); // Best audio quality
      }
      
      // Add cookie file if provided
      if (cookieFile && fs.existsSync(cookieFile)) {
        args.push('--cookies', cookieFile);
      }
      
      // Add URL
      args.push(url);
      
      console.log('[YtDlpService] Executing yt-dlp with args:', args);
      
      const ytdlp = spawn(YtDlpService.getYtDlpCommand(), args);
      
      let lastProgress = 0;
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[YtDlpService] stdout raw:', output);
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Parse progress
          const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            console.log('[YtDlpService] Progress detected:', progress);
            if (progress > lastProgress) {
              lastProgress = progress;
              if (onProgress) {
                console.log('[YtDlpService] Calling onProgress callback with:', progress);
                onProgress(progress);
              }
            }
          }
        }
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[YtDlpService] stderr:', data.toString());
      });
      
      ytdlp.on('close', async (code) => {
        if (code !== 0) {
          console.error('[YtDlpService] yt-dlp exited with code:', code);
          console.error('[YtDlpService] stderr:', stderr);
          
          // Parse common errors
          let errorMessage = 'Failed to download video';
          
          // Check for various authentication/membership errors
          if (stderr.includes('ERROR: Video unavailable')) {
            errorMessage = 'הסרטון לא זמין או פרטי';
          } else if (stderr.includes('ERROR: Private video') || 
                     stderr.includes('ERROR: Sign in to confirm') ||
                     stderr.includes('ERROR: This video is private')) {
            errorMessage = 'סרטון פרטי - נדרש קובץ Cookies לאימות';
          } else if (stderr.includes('ERROR: This video is available to members only') ||
                     stderr.includes('ERROR: Join this channel to get access') ||
                     stderr.includes('members-only') ||
                     stderr.includes('membership')) {
            errorMessage = 'סרטון למנויים בלבד - נדרש קובץ Cookies';
          } else if (stderr.includes('ERROR: Unable to extract')) {
            errorMessage = 'לא ניתן לחלץ מידע מהסרטון';
          } else if (stderr.includes('ERROR: Unsupported URL')) {
            errorMessage = 'כתובת URL לא נתמכת';
          } else if (stderr.includes('ERROR:') && stderr.includes('age')) {
            errorMessage = 'תוכן מוגבל גיל - נדרש קובץ Cookies';
          } else if (stderr.includes('ERROR:')) {
            // Try to extract the actual error message
            const errorMatch = stderr.match(/ERROR:\s*(.+?)(?:\n|$)/);
            if (errorMatch) {
              errorMessage = errorMatch[1];
            }
          }
          
          reject(new Error(errorMessage));
          return;
        }
        
        // Find the actual downloaded file
        const files = fs.readdirSync(outputPath);
        const downloadedFile = files.find(file => file.startsWith(mediaId));
        
        if (!downloadedFile) {
          reject(new Error('Downloaded file not found'));
          return;
        }
        
        try {
          // Get video info separately after download
          const videoInfo = await YtDlpService.getVideoInfo(url, cookieFile);
          
          // Check if the content has video streams
          // If we explicitly downloaded audio only, hasVideo is always false
          // Otherwise, check if the original source has video streams
          let hasVideo = false;
          if (downloadType === 'audio') {
            hasVideo = false; // Audio-only download never has video
          } else {
            // For video downloads, check if the source has video streams
            hasVideo = videoInfo.vcodec !== 'none' && videoInfo.vcodec !== null;
          }
          
          const result: VideoInfo = {
            title: videoInfo.title || 'Unknown Title',
            duration: videoInfo.duration || 0,
            filename: downloadedFile,
            format: path.extname(downloadedFile).substring(1),
            hasVideo: hasVideo
          };
          
          console.log('[YtDlpService] Download complete:', result);
          console.log('[YtDlpService] Download type:', downloadType);
          console.log('[YtDlpService] Content type:', hasVideo ? 'video' : 'audio-only');
          resolve(result);
        } catch (error) {
          console.error('[YtDlpService] Failed to get video info:', error);
          // Still resolve with basic info if video info fails
          // For audio downloads, always set hasVideo to false
          // For video downloads, default to true when we can't determine
          const hasVideo = downloadType !== 'audio';
          
          const result: VideoInfo = {
            title: 'Downloaded Video',
            duration: 0,
            filename: downloadedFile,
            format: path.extname(downloadedFile).substring(1),
            hasVideo: hasVideo
          };
          
          console.log('[YtDlpService] Download complete (no video info):', result);
          console.log('[YtDlpService] Download type:', downloadType);
          console.log('[YtDlpService] Content type:', hasVideo ? 'video' : 'audio-only');
          resolve(result);
        }
      });
      
      ytdlp.on('error', (error) => {
        console.error('[YtDlpService] Failed to spawn yt-dlp:', error);
        reject(new Error('yt-dlp not found. Please ensure yt-dlp is installed and in PATH'));
      });
    });
  }
  
  /**
   * Get available quality options with size estimation
   */
  static async getQualityOptions(url: string, cookieFile?: string): Promise<FormatInfo[]> {
    // Try to get actual video info for better estimates
    let duration = 0;
    let actualHeight = 0;
    
    try {
      const info = await YtDlpService.getVideoInfo(url, cookieFile);
      duration = info.duration || 0;
      actualHeight = info.height || 0;
    } catch (error) {
      // If we can't get video info, that's ok - we'll use default estimates
      console.log('[YtDlpService] Could not fetch video info for size estimation, using defaults');
    }
    
    const formats: FormatInfo[] = [];
    
    // High quality - 1080p or best available
    let highSize = '200-500 MB';
    if (duration > 0) {
      const estimatedMB = Math.round((duration * 5000) / 8 / 1024); // ~5 Mbps
      highSize = `~${estimatedMB} MB`;
    }
    formats.push({
      quality: 'high',
      resolution: actualHeight >= 1080 ? '1080p' : 'מיטבית',
      estimatedSize: highSize,
      format: 'mp4'
    });
    
    // Medium quality - 720p
    let mediumSize = '100-250 MB';
    if (duration > 0) {
      const estimatedMB = Math.round((duration * 2500) / 8 / 1024); // ~2.5 Mbps
      mediumSize = `~${estimatedMB} MB`;
    }
    formats.push({
      quality: 'medium',
      resolution: '720p',
      estimatedSize: mediumSize,
      format: 'mp4'
    });
    
    // Low quality - 480p
    let lowSize = '50-150 MB';
    if (duration > 0) {
      const estimatedMB = Math.round((duration * 1000) / 8 / 1024); // ~1 Mbps
      lowSize = `~${estimatedMB} MB`;
    }
    formats.push({
      quality: 'low',
      resolution: '480p',
      estimatedSize: lowSize,
      format: 'mp4'
    });
    
    // Audio only option
    let audioSize = '10-30 MB';
    if (duration > 0) {
      const estimatedMB = Math.round((duration * 128) / 8 / 1024); // ~128 kbps
      audioSize = `~${estimatedMB} MB`;
    }
    formats.push({
      quality: 'low', // Using 'low' as a placeholder since we need one of the three quality levels
      resolution: 'אודיו בלבד',
      estimatedSize: audioSize,
      format: 'mp3'
    });
    
    return formats;
  }
  
  /**
   * Check if yt-dlp is installed
   */
  static async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const command = YtDlpService.getYtDlpCommand();
      console.log(`[YtDlpService] Checking installation with command: ${command}`);
      
      const ytdlp = spawn(command, ['--version']);
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        console.log(`[YtDlpService] Installation check result - code: ${code}`);
        if (stdout) console.log(`[YtDlpService] stdout: ${stdout.trim()}`);
        if (stderr) console.log(`[YtDlpService] stderr: ${stderr.trim()}`);
        resolve(code === 0);
      });
      
      ytdlp.on('error', (error) => {
        console.error(`[YtDlpService] Installation check error: ${error.message}`);
        resolve(false);
      });
    });
  }
}

export default YtDlpService;