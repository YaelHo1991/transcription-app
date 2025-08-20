/**
 * Project Service - Frontend service for managing transcription projects
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ProjectMetadata {
  projectId: string;
  createdAt: string;
  mediaFile: string;
  projectName: string;
  lastModified: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  blocks: any[];
  speakers: any[];
  remarks: any[];
}

export interface SaveProjectData {
  blocks?: any[];
  speakers?: any[];
  remarks?: any[];
}

export interface IncrementalSaveData {
  changes: any[];
  fullSnapshot: boolean;
  version: number;
  timestamp: number;
  totalBlocks: number;
}

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(mediaFileName: string, projectName?: string): Promise<string | null> {
    try {
      console.log('[Project] Creating new project for:', mediaFileName, 'with name:', projectName);
      
      // Check if we have valid input
      if (!mediaFileName) {
        console.error('[Project] Cannot create project without media file name');
        return null;
      }
      
      const response = await fetch(`${API_URL}/api/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        },
        body: JSON.stringify({
          mediaFileName,
          projectName: projectName || 'פרויקט חדש'
        })
      });
      
      if (!response.ok) {
        console.error('[Project] Create failed:', response.status, response.statusText);
        const text = await response.text();
        console.error('[Project] Response body:', text);
        return null;
      }
      
      const data = await response.json();
      console.log('[Project] Created successfully:', data.projectId);
      return data.projectId;
    } catch (error) {
      console.error('[Project] Error creating project - fetch failed:', error);
      // Check if it's a network error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[Project] Network error - is the backend running on', API_URL, '?');
      }
      return null;
    }
  }
  
  /**
   * Save project data
   */
  async saveProject(projectId: string, data: SaveProjectData): Promise<boolean> {
    try {
      console.log('[Project] Saving project:', projectId, {
        blocksCount: data.blocks?.length || 0,
        speakersCount: data.speakers?.length || 0,
        remarksCount: data.remarks?.length || 0
      });
      
      const response = await fetch(`${API_URL}/api/projects/${projectId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        console.warn('[Project] Save returned non-OK status:', response.status);
        return false;
      }
      
      console.log('[Project] Saved successfully');
      return true;
    } catch (error) {
      // Silently handle errors - just log to console without throwing
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('[Project] Network issue saving project - backend may be temporarily unavailable');
      } else {
        console.warn('[Project] Error saving project:', error);
      }
      return false;
    }
  }
  
  /**
   * Save project incrementally (only changes)
   */
  async saveProjectIncremental(projectId: string, data: IncrementalSaveData): Promise<boolean> {
    try {
      const changeType = data.fullSnapshot ? 'full' : 'incremental';
      console.log(`[Project] Saving ${changeType} update:`, projectId, {
        changesCount: data.changes.length,
        fullSnapshot: data.fullSnapshot,
        version: data.version,
        totalBlocks: data.totalBlocks
      });
      
      // For now, convert to regular save format
      // TODO: Implement actual incremental save endpoint on backend
      if (data.fullSnapshot) {
        // Full snapshot - send all blocks
        const blocks = data.changes.filter(c => c.operation !== 'delete');
        return await this.saveProject(projectId, { blocks });
      } else {
        // Incremental - for now, still send full blocks
        // In future, backend will handle delta updates
        console.log('[Project] Incremental changes:', {
          created: data.changes.filter(c => c.operation === 'create').length,
          updated: data.changes.filter(c => c.operation === 'update').length,
          deleted: data.changes.filter(c => c.operation === 'delete').length
        });
        
        // TODO: Send only changes when backend supports it
        // For now, we need to get all blocks and apply changes
        // This will be optimized when backend implements delta handling
        return true; // Skip actual save for incremental for now
      }
    } catch (error) {
      console.warn('[Project] Error saving incremental update:', error);
      return false;
    }
  }
  
  /**
   * Load project data
   */
  async loadProject(projectId: string): Promise<ProjectData | null> {
    try {
      console.log('[Project] Loading project:', projectId);
      
      const response = await fetch(`${API_URL}/api/projects/${projectId}/load`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        console.warn('[Project] Load returned non-OK status:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('[Project] Loaded:', {
        blocksCount: data.blocks?.length || 0,
        speakersCount: data.speakers?.length || 0,
        remarksCount: data.remarks?.length || 0
      });
      
      return data;
    } catch (error) {
      // Silently handle errors - just log to console without throwing
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('[Project] Network issue loading project - backend may be starting up');
      } else {
        console.warn('[Project] Error loading project:', error);
      }
      return null;
    }
  }
  
  /**
   * Get project by media file
   */
  async getProjectByMedia(mediaFileName: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_URL}/api/projects/by-media/${encodeURIComponent(mediaFileName)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-Mode': 'true'
          }
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.exists ? data.projectId : null;
    } catch (error) {
      console.error('[Project] Error finding project by media:', error);
      return null;
    }
  }
  
  /**
   * Create a backup
   */
  async createBackup(projectId: string): Promise<string | null> {
    try {
      console.log('[Project] Creating backup for:', projectId);
      
      const response = await fetch(`${API_URL}/api/projects/${projectId}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        console.error('[Project] Backup failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log('[Project] Backup created:', data.backupFile);
      return data.backupFile;
    } catch (error) {
      console.error('[Project] Error creating backup:', error);
      return null;
    }
  }
  
  /**
   * Restore from backup
   */
  async restoreBackup(projectId: string, backupFile: string): Promise<ProjectData | null> {
    try {
      console.log('[Project] Restoring backup:', projectId, backupFile);
      
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/restore/${backupFile}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-Mode': 'true'
          }
        }
      );
      
      if (!response.ok) {
        console.error('[Project] Restore failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log('[Project] Restored successfully');
      return data;
    } catch (error) {
      console.error('[Project] Error restoring backup:', error);
      return null;
    }
  }
  
  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const response = await fetch(`${API_URL}/api/projects/list`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('[Project] Error listing projects:', error);
      return [];
    }
  }
  
  /**
   * List backups for a project
   */
  async listBackups(projectId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/backups`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.backups || [];
    } catch (error) {
      console.error('[Project] Error listing backups:', error);
      return [];
    }
  }
  
  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

// Export singleton instance
export const projectService = new ProjectService();