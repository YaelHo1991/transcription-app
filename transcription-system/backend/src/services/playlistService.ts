import * as fs from 'fs/promises';
import * as path from 'path';

export class PlaylistService {
  /**
   * Update or create playlist.json for a project
   */
  static async updatePlaylistJson(
    projectDir: string,
    mediaId: string,
    playlistIndex: number,
    title: string,
    originalUrl?: string
  ): Promise<void> {
    const playlistJsonPath = path.join(projectDir, 'playlist.json');
    
    let playlistData: any = {
      playlistUrl: '',
      playlistTitle: '',
      totalVideos: 0,
      videos: {}  // Changed from downloadedVideos to videos
    };
    
    // Try to read existing playlist.json
    try {
      const existingData = await fs.readFile(playlistJsonPath, 'utf8');
      playlistData = JSON.parse(existingData);
      // Ensure videos field exists
      if (!playlistData.videos) {
        playlistData.videos = playlistData.downloadedVideos || {};
      }
    } catch (error) {
      // File doesn't exist, will create new one
      console.log('[PlaylistService] Creating new playlist.json');
    }
    
    // Extract playlist title from video title if needed
    if (!playlistData.playlistTitle && title) {
      // Try to extract playlist title from video title (usually after " - ")
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        // Remove lesson number from the end if present
        const potentialTitle = parts[parts.length - 2] || parts[0];
        playlistData.playlistTitle = potentialTitle;
      }
    }
    
    // Add or update the downloaded video entry - using 'videos' field
    if (!playlistData.videos) {
      playlistData.videos = {};
    }
    playlistData.videos[playlistIndex.toString()] = {
      mediaId,
      title,
      index: playlistIndex,
      downloaded: true,  // Add downloaded flag
      originalUrl: originalUrl || ''
    };
    
    // Update total videos count if needed
    const maxIndex = Math.max(
      ...Object.keys(playlistData.videos).map(Number),
      playlistData.totalVideos || 0
    );
    playlistData.totalVideos = Math.max(playlistData.totalVideos || 0, maxIndex);
    
    // Write updated playlist.json
    await fs.writeFile(playlistJsonPath, JSON.stringify(playlistData, null, 2));
    console.log(`[PlaylistService] Updated playlist.json for index ${playlistIndex}`);
  }
  
  /**
   * Remove a media from playlist.json
   */
  static async removeFromPlaylistJson(
    projectDir: string,
    mediaId: string
  ): Promise<void> {
    const playlistJsonPath = path.join(projectDir, 'playlist.json');
    
    try {
      const existingData = await fs.readFile(playlistJsonPath, 'utf8');
      const playlistData = JSON.parse(existingData);
      
      // Find and remove the entry with this mediaId
      for (const [index, video] of Object.entries(playlistData.downloadedVideos || {})) {
        if ((video as any).mediaId === mediaId) {
          delete playlistData.downloadedVideos[index];
          console.log(`[PlaylistService] Removed media ${mediaId} from playlist.json`);
          break;
        }
      }
      
      // Write updated playlist.json
      await fs.writeFile(playlistJsonPath, JSON.stringify(playlistData, null, 2));
    } catch (error) {
      console.log('[PlaylistService] No playlist.json to update');
    }
  }
  
  /**
   * Extract lesson number from Hebrew title
   */
  static extractLessonNumber(title: string): number | null {
    // Match patterns like "שיעור 6", "שיעור 14", etc.
    const match = title.match(/שיעור\s+(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  }
}