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
  playlistIndex?: number;
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
   * Get minimal info (just title) even for protected content
   */
  static async getMinimalInfo(url: string, cookieFile?: string): Promise<{ title?: string }> {
    // First try with yt-dlp
    const ytdlpResult = await this.tryGetTitleWithYtDlp(url, cookieFile);

    // If yt-dlp got a valid title (not the generic members-only message), return it
    if (ytdlpResult.title &&
        !ytdlpResult.title.includes('Join this channel') &&
        !ytdlpResult.title.includes('members-only content')) {
      return ytdlpResult;
    }

    // If yt-dlp failed or returned generic message, try fetching from HTML
    console.log('[YtDlpService.getMinimalInfo] yt-dlp failed or returned generic title, trying HTML fetch...');
    try {
      const https = require('https');
      const http = require('http');
      const { URL } = require('url');

      console.log('[YtDlpService.getMinimalInfo] Fetching HTML from:', url);

      const response = await new Promise<string>((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'DNT': '1',
            'Connection': 'close',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 5000
        };

        const req = client.request(options, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        });

        req.on('error', (err) => {
          console.log('[YtDlpService.getMinimalInfo] Request failed:', err.message);
          reject(err);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      }).catch(err => {
        console.log('[YtDlpService.getMinimalInfo] Fetch failed:', err.message);
        return null;
      });

      if (!response) {
        console.log('[YtDlpService.getMinimalInfo] Failed to fetch HTML');
        return ytdlpResult;
      }

      // HTML is now in the response string
      const html = response;
      console.log('[YtDlpService.getMinimalInfo] Got HTML response, length:', html.length);

      // Try to extract title from HTML
      let title = '';

      // Method 1: Extract from <title> tag
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        let extractedTitle = titleMatch[1]
          .replace(' - YouTube', '')
          .replace(/\s*-\s*YouTube\s*$/, '')
          .trim();
        // Skip generic error titles but keep actual content
        if (extractedTitle &&
            extractedTitle.length > 0 &&
            !extractedTitle.includes('Sign in to confirm') &&
            !extractedTitle.includes('members-only') &&
            !extractedTitle.includes('Join this channel') &&
            extractedTitle !== 'YouTube') {
          title = extractedTitle;
          console.log('[YtDlpService.getMinimalInfo] Got title from HTML <title> tag:', title);
        } else {
          console.log('[YtDlpService.getMinimalInfo] Skipped title (empty or generic):', extractedTitle || '(empty string)');
        }
      } else {
        console.log('[YtDlpService.getMinimalInfo] No <title> tag found or empty content');
      }

      // Method 2: Try from og:title meta tag (often more accurate)
      if (!title) {
        const metaMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i);
        if (metaMatch && metaMatch[1]) {
          let extractedTitle = metaMatch[1].trim();
          if (!extractedTitle.includes('Sign in to confirm') &&
              !extractedTitle.includes('members-only') &&
              !extractedTitle.includes('Join this channel')) {
            title = extractedTitle;
            console.log('[YtDlpService.getMinimalInfo] Got title from og:title:', title);
          }
        }
      }

      // Method 3: Try from JSON-LD structured data
      if (!title) {
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/is);
        if (jsonLdMatch && jsonLdMatch[1]) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.name) {
              title = jsonData.name;
              console.log('[YtDlpService.getMinimalInfo] Got title from JSON-LD:', title);
            }
          } catch (e) {
            // JSON parsing failed, continue
          }
        }
      }

      // Method 4: Try from embedded video data
      if (!title) {
        const videoDataMatch = html.match(/"videoDetails":\s*{[^}]*"title":\s*"([^"]*)"[^}]*}/);
        if (videoDataMatch && videoDataMatch[1]) {
          title = videoDataMatch[1];
          console.log('[YtDlpService.getMinimalInfo] Got title from video data:', title);
        }
      }

      // Method 5: Try from Twitter/X card data
      if (!title) {
        const twitterMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"[^>]*>/i);
        if (twitterMatch && twitterMatch[1]) {
          title = twitterMatch[1];
          console.log('[YtDlpService.getMinimalInfo] Got title from twitter:title:', title);
        }
      }

      // Method 6: Try from ytInitialPlayerResponse (YouTube's main data)
      if (!title) {
        const ytDataMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (ytDataMatch && ytDataMatch[1]) {
          try {
            const ytData = JSON.parse(ytDataMatch[1]);
            if (ytData.videoDetails && ytData.videoDetails.title) {
              title = ytData.videoDetails.title;
              console.log('[YtDlpService.getMinimalInfo] Got title from ytInitialPlayerResponse:', title);
            }
          } catch (e) {
            console.log('[YtDlpService.getMinimalInfo] Failed to parse ytInitialPlayerResponse');
          }
        }
      }

      // Method 6b: Try from ytInitialData (alternative YouTube data structure)
      if (!title) {
        const ytInitialDataMatch = html.match(/var\s+ytInitialData\s*=\s*({.+?});/);
        if (ytInitialDataMatch && ytInitialDataMatch[1]) {
          try {
            const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
            // Try to find title in various possible locations
            if (ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents) {
              const contents = ytInitialData.contents.twoColumnWatchNextResults.results.results.contents;
              for (const item of contents) {
                if (item.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text) {
                  title = item.videoPrimaryInfoRenderer.title.runs[0].text;
                  console.log('[YtDlpService.getMinimalInfo] Got title from ytInitialData.videoPrimaryInfoRenderer:', title);
                  break;
                } else if (item.videoPrimaryInfoRenderer?.title?.simpleText) {
                  title = item.videoPrimaryInfoRenderer.title.simpleText;
                  console.log('[YtDlpService.getMinimalInfo] Got title from ytInitialData.videoPrimaryInfoRenderer (simpleText):', title);
                  break;
                }
              }
            }
            // Alternative path in ytInitialData
            if (!title && ytInitialData.playerOverlays?.playerOverlayRenderer?.videoDetails?.playerOverlayVideoDetailsRenderer?.title?.simpleText) {
              title = ytInitialData.playerOverlays.playerOverlayRenderer.videoDetails.playerOverlayVideoDetailsRenderer.title.simpleText;
              console.log('[YtDlpService.getMinimalInfo] Got title from ytInitialData.playerOverlays:', title);
            }
          } catch (e) {
            console.log('[YtDlpService.getMinimalInfo] Failed to parse ytInitialData');
          }
        }
      }

      // Method 7: Try from page data scripts
      if (!title) {
        const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gi);
        if (scriptMatches) {
          for (const script of scriptMatches) {
            const titleInScript = script.match(/"title"\s*:\s*"([^"]+)"/);
            if (titleInScript && titleInScript[1] &&
                !titleInScript[1].includes('Sign in') &&
                !titleInScript[1].includes('members-only') &&
                titleInScript[1].length > 5) {
              title = titleInScript[1];
              console.log('[YtDlpService.getMinimalInfo] Got title from script data:', title);
              break;
            }
          }
        }
      }

      // Method 8: Look for title in window.ytplayer.config
      if (!title) {
        const ytPlayerConfigMatch = html.match(/ytplayer\.config\s*=\s*({.+?});/);
        if (ytPlayerConfigMatch && ytPlayerConfigMatch[1]) {
          try {
            const ytPlayerConfig = JSON.parse(ytPlayerConfigMatch[1]);
            if (ytPlayerConfig.args?.title) {
              title = ytPlayerConfig.args.title;
              console.log('[YtDlpService.getMinimalInfo] Got title from ytplayer.config:', title);
            }
          } catch (e) {
            // Failed to parse, continue
          }
        }
      }

      // Method 9: Extract from embedded player args
      if (!title) {
        const embedMatch = html.match(/"player_response":"([^"]+)"/);
        if (embedMatch && embedMatch[1]) {
          try {
            const playerResponse = JSON.parse(embedMatch[1].replace(/\\"/g, '"'));
            if (playerResponse.videoDetails?.title) {
              title = playerResponse.videoDetails.title;
              console.log('[YtDlpService.getMinimalInfo] Got title from embedded player_response:', title);
            }
          } catch (e) {
            // Failed to parse, continue
          }
        }
      }

      // Method 10: Try alternative meta tags
      if (!title) {
        // Try name="title" meta tag
        const nameTitleMatch = html.match(/<meta\s+name="title"\s+content="([^"]*)"[^>]*>/i);
        if (nameTitleMatch && nameTitleMatch[1]) {
          title = nameTitleMatch[1];
          console.log('[YtDlpService.getMinimalInfo] Got title from meta name="title":', title);
        }
      }

      // Log final result
      if (!title) {
        console.log('[YtDlpService.getMinimalInfo] WARNING: Could not extract title from HTML despite trying all methods');
        // Log first 500 chars of HTML for debugging
        console.log('[YtDlpService.getMinimalInfo] HTML preview:', html.substring(0, 500));
      }

      return { title: title || ytdlpResult.title || undefined };
    } catch (error) {
      console.error('[YtDlpService.getMinimalInfo] Failed to fetch HTML:', error);
      return ytdlpResult;
    }
  }

  /**
   * Helper method to try getting title with yt-dlp
   */
  private static tryGetTitleWithYtDlp(url: string, cookieFile?: string): Promise<{ title?: string }> {
    return new Promise((resolve) => {
      // Use --dump-json with skip-download to get metadata (like playlists do - this works for protected content!)
      const args = [
        '--dump-json',      // Get full metadata as JSON (works even for protected content!)
        '--skip-download',  // Don't actually download the video
        '--no-playlist',    // Treat as single video even if it's in a playlist
        '--no-warnings',
        '--ignore-errors',  // Continue even if there are errors - helps with protected content
        '--quiet',
        url
      ];

      // Check if cookies are available for protected content
      if (cookieFile && fs.existsSync(cookieFile)) {
        args.push('--cookies', cookieFile);
        console.log('[YtDlpService.tryGetTitleWithYtDlp] Using cookies for protected content');
      }

      const ytdlpCommand = this.getYtDlpCommand();
      console.log('[YtDlpService.tryGetTitleWithYtDlp] Getting metadata using --dump-json for:', url);
      const ytdlp = spawn(ytdlpCommand, args);
      let stdout = '';
      let stderr = '';
      let title = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ytdlp.on('close', (code) => {
        console.log('[YtDlpService.tryGetTitleWithYtDlp] Process exited with code:', code);

        // Try to parse JSON output (similar to getPlaylistInfo)
        if (stdout) {
          try {
            // Parse JSON output - yt-dlp should return a single JSON object for a single video
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const info = JSON.parse(line);
                  // Extract title from JSON metadata
                  if (info.title) {
                    title = info.title;
                    console.log('[YtDlpService.tryGetTitleWithYtDlp] Got title from JSON:', title);
                    break;
                  } else if (info.fulltitle) {
                    title = info.fulltitle;
                    console.log('[YtDlpService.tryGetTitleWithYtDlp] Got fulltitle from JSON:', title);
                    break;
                  }
                } catch (parseError) {
                  // This line wasn't valid JSON, continue to next
                }
              }
            }
          } catch (error) {
            console.log('[YtDlpService.tryGetTitleWithYtDlp] Error parsing JSON output:', error);
          }
        }

        // If we still didn't get a title and there's an error, try to extract from error messages
        if (!title && stderr) {
          console.log('[YtDlpService.tryGetTitleWithYtDlp] No title from JSON, checking stderr for patterns');

          // Don't extract error messages as titles - this was the bug
          // Instead, let the getMinimalInfo function try HTML parsing
          // Only log the error for debugging
          if (stderr.includes('Join this channel') || stderr.includes('members-only') || stderr.includes('Sign in to confirm')) {
            console.log('[YtDlpService.tryGetTitleWithYtDlp] Detected instruction message in stderr, not extracting title');
          }
        }

        console.log('[YtDlpService.tryGetTitleWithYtDlp] Final title:', title || '(no title found)');
        resolve({ title: title || undefined });
      });

      ytdlp.on('error', () => {
        resolve({ title: undefined });
      });

      // Timeout - give enough time for JSON extraction
      setTimeout(() => {
        ytdlp.kill();
        resolve({ title: title || undefined });
      }, 3000);
    });
  }

  /**
   * Check if a URL is a playlist
   */
  static isPlaylistUrl(url: string): boolean {
    // Watch Later (list=WL) should be treated as single video
    if (url.includes('list=WL')) {
      return false;
    }

    // Any URL with list= parameter is a playlist
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
                  uploadDate: info.upload_date || info.timestamp,
                  playlistIndex: info.playlist_index
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