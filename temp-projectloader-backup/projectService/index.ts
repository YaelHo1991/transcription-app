/**
 * Project Service - Frontend service for project management
 * Handles communication with backend for project upload and management
 */

import { Project, MediaFile, UploadParams, UserQuota } from '@/app/transcription/shared/components/ProjectLoader/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ProjectService {
  private getAuthHeaders(): HeadersInit {
    // Check both possible token keys
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('[ProjectService] No authentication token found');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Create a project from folder upload
   */
  async createProjectFromFolder(params: UploadParams): Promise<Project> {
    try {
      // Log the request details for debugging
      console.log('[ProjectService] Creating project with params:', {
        userId: params.userId,
        folderName: params.folderName,
        filesCount: params.files.length,
        computerId: params.computerId,
        computerName: params.computerName
      });

      const headers = this.getAuthHeaders();
      console.log('[ProjectService] Auth headers:', {
        hasToken: !!headers.Authorization,
        tokenPreview: headers.Authorization ? (headers.Authorization as string).substring(0, 20) + '...' : 'none'
      });
      
      // Process files to extract metadata
      const mediaFiles = await Promise.all(params.files.map(async (file) => {
        // Check if it's a URL file
        if (file.type === 'text/url') {
          const url = await file.text();
          return {
            name: this.extractNameFromUrl(url),
            url,
            type: 'url',
            size: 0
          };
        }
        
        // Regular media file
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          path: (file as any).webkitRelativePath || file.name
        };
      }));

      const requestBody = {
        userId: params.userId,
        folderName: params.folderName || this.generateProjectName(),
        mediaFiles,
        computerId: params.computerId,
        computerName: params.computerName
      };

      console.log('[ProjectService] Request URL:', `${API_URL}/api/projects/create-from-folder`);
      console.log('[ProjectService] Request body:', requestBody);

      // Send project creation request
      const response = await fetch(`${API_URL}/api/projects/create-from-folder`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ProjectService] Create project failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to create project');
      }

      const data = await response.json();
      return data.project;
      
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Get all projects for current user
   */
  async getUserProjects(): Promise<Project[]> {
    try {
      const response = await fetch(`${API_URL}/api/projects/list`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      return data.projects || [];
      
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    }
  }

  /**
   * Get specific project details
   */
  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const data = await response.json();
      return data.project;
      
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, deleteTranscriptions = false): Promise<void> {
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}?deleteTranscriptions=${deleteTranscriptions}`, 
        {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Update media path for multi-computer support
   */
  async updateMediaPath(
    mediaId: string, 
    computerId: string, 
    computerName: string, 
    newPath: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/projects/media/${mediaId}/path`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          computerId,
          computerName,
          path: newPath
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update media path');
      }
      
    } catch (error) {
      console.error('Error updating media path:', error);
      throw error;
    }
  }

  /**
   * Upload media file to server (within quota)
   */
  async uploadMediaToServer(
    projectId: string,
    mediaId: string,
    file: File
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('projectId', projectId);
      formData.append('mediaId', mediaId);

      const response = await fetch(`${API_URL}/api/projects/${projectId}/media/${mediaId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': localStorage.getItem('token') || ''
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload media');
      }
      
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Check user storage quota
   */
  async getUserQuota(): Promise<UserQuota> {
    try {
      const response = await fetch(`${API_URL}/api/users/quota`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to get quota');
      }

      const data = await response.json();
      return data.quota;
      
    } catch (error) {
      console.error('Error getting quota:', error);
      throw error;
    }
  }

  /**
   * Load transcription data for a project
   */
  async loadTranscriptionData(projectId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/api/transcription/${projectId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        // If no data exists yet, return empty structure
        if (response.status === 404) {
          return {
            content: [],
            speakers: [],
            remarks: []
          };
        }
        throw new Error('Failed to load transcription data');
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error loading transcription data:', error);
      throw error;
    }
  }

  /**
   * Load proofreading data (skeleton for now)
   */
  async loadProofreadingData(projectId: string): Promise<null> {
    console.log('Proofreading data loading not implemented yet for:', projectId);
    return null;
  }

  /**
   * Load export data (skeleton for now)
   */
  async loadExportData(projectId: string): Promise<null> {
    console.log('Export data loading not implemented yet for:', projectId);
    return null;
  }

  // Helper methods
  private generateProjectName(): string {
    const date = new Date();
    const dateStr = date.toLocaleDateString('he-IL').replace(/\//g, '-');
    const timeStr = date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).replace(':', '.');
    return `פרויקט ${dateStr} ${timeStr}`;
  }

  private extractNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // YouTube
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
        return `YouTube: ${videoId}`;
      }
      
      // Google Drive
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileId = urlObj.pathname.split('/')[3];
        return `Google Drive: ${fileId}`;
      }
      
      // Default: use last part of path or hostname
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      return pathParts.pop() || urlObj.hostname;
      
    } catch {
      // If not a valid URL, return as is
      return url.substring(0, 50);
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();