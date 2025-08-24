/**
 * T-Session Service - Handles transcription session management
 * All functions prefixed with 't' to avoid conflicts
 */

import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();

export interface TSessionMetadata {
  mediaId: string;
  transcriptionNumber: number;
  lastSaved: string;
  wordCount: number;
  blockCount: number;
  speakerCount: number;
}

export interface TSessionInfo {
  transcriptionNumber: number;
  metadata?: TSessionMetadata;
  exists: boolean;
}

export interface TSaveSessionData {
  mediaId: string;
  transcriptionNumber: number;
  blocks: any[];
  speakers: any[];
  remarks?: any[];
  projectName?: string;
  transcriptionTitle?: string;
  mediaFile?: string;
}

class TSessionService {
  /**
   * Check if transcriptions exist for a media file
   */
  async tCheckExistingTranscriptions(mediaId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/transcription/sessions/t-list/${mediaId}`, {
        headers: {
          'Content-Type': 'application/json',
          // Dev mode header - backend accepts this in development
          'X-Dev-Mode': 'true'
        }
      });
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.transcriptions && data.transcriptions.length > 0;
    } catch (error) {
      console.error('[T-Session] Error checking existing transcriptions:', error);
      return false;
    }
  }

  /**
   * Get count of existing transcriptions for a media
   */
  async tGetTranscriptionCount(mediaId: string): Promise<number> {
    try {
      const response = await fetch(`${API_URL}/api/transcription/sessions/t-list/${mediaId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      if (!response.ok) return 0;
      
      const data = await response.json();
      return data.transcriptions ? data.transcriptions.length : 0;
    } catch (error) {
      console.error('[T-Session] Error getting transcription count:', error);
      return 0;
    }
  }

  /**
   * Get list of all sessions for a media
   */
  async tListSessions(mediaId: string): Promise<TSessionInfo[]> {
    try {
      const response = await fetch(`${API_URL}/api/transcription/sessions/t-list/${mediaId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.transcriptions || [];
    } catch (error) {
      console.error('[T-Session] Error listing sessions:', error);
      return [];
    }
  }

  /**
   * Get next available transcription number
   */
  async tGetNextTranscriptionNumber(mediaId: string): Promise<number> {
    const count = await this.tGetTranscriptionCount(mediaId);
    return count + 1;
  }

  /**
   * Save session to backend
   */
  async tSaveSession(data: TSaveSessionData): Promise<boolean> {
    try {
      console.log('[T-Session] Saving with data:', {
        mediaId: data.mediaId,
        transcriptionNumber: data.transcriptionNumber,
        hasBlocks: !!data.blocks,
        blockCount: data.blocks?.length
      });
      
      const response = await fetch(`${API_URL}/api/transcription/sessions/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[T-Session] Save failed:', response.statusText, errorText);
        return false;
      }

      const result = await response.json();
      console.log('[T-Session] Session saved:', result.path);
      return true;
    } catch (error) {
      console.error('[T-Session] Error saving session:', error);
      return false;
    }
  }

  /**
   * Load session from backend
   */
  async tLoadSession(mediaId: string, transcriptionNumber: number): Promise<any> {
    try {
      const response = await fetch(
        `${API_URL}/api/transcription/sessions/load/${mediaId}/${transcriptionNumber}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-Mode': 'true'
          }
        }
      );
      
      if (!response.ok) {
        console.error('[T-Session] Load failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('[T-Session] Session loaded:', {
        blocks: data.blocks?.length || 0,
        speakers: data.speakers?.length || 0
      });
      return data;
    } catch (error) {
      console.error('[T-Session] Error loading session:', error);
      return null;
    }
  }

  /**
   * Format media ID for safe folder name
   */
  tFormatMediaId(mediaName: string): string {
    // Remove extension and sanitize for folder name
    const nameWithoutExt = mediaName.replace(/\.[^/.]+$/, '');
    // Replace special characters with underscore
    return nameWithoutExt.replace(/[^\w\s\u0590-\u05FF-]/g, '_');
  }

  /**
   * Create a formatted save notification message
   */
  tGetSaveMessage(success: boolean, transcriptionNumber: number): string {
    if (success) {
      return `✅ תמלול ${transcriptionNumber} נשמר בהצלחה`;
    } else {
      return `❌ שגיאה בשמירת תמלול ${transcriptionNumber}`;
    }
  }

  /**
   * Create a notification message for existing transcriptions
   */
  tGetExistingMessage(count: number): string {
    if (count === 1) {
      return `נמצא תמלול אחד קיים עבור מדיה זו`;
    } else if (count === 2) {
      return `נמצאו 2 תמלולים קיימים עבור מדיה זו`;
    } else {
      return `נמצאו ${count} תמלולים קיימים עבור מדיה זו`;
    }
  }
}

// Export singleton instance
export const tSessionService = new TSessionService();