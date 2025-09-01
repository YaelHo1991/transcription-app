'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, MediaFile, UploadParams, ProjectState } from './types';
import useProjectStore from '../../../../../lib/stores/projectStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useProjectManager() {
  const [state, setState] = useState<ProjectState>({
    projects: [],
    currentProject: null,
    currentMedia: null,
    loading: false,
    error: null
  });

  const store = useProjectStore();

  // Sync with store changes - when navigation changes store, update local state
  useEffect(() => {
    if (store.currentProject || store.currentMedia) {
      console.log('[useProjectManager] Syncing with store:', {
        project: store.currentProject?.name,
        media: store.currentMedia?.name
      });
      setState(prev => ({
        ...prev,
        currentProject: store.currentProject,
        currentMedia: store.currentMedia
      }));
    }
  }, [store.currentProject, store.currentMedia]);

  // Load user's projects
  const loadProjects = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('[useProjectManager] No token found, skipping project load');
        setState(prev => ({ ...prev, loading: false, projects: [] }));
        return;
      }

      console.log('[useProjectManager] Token found, fetching projects from:', `${API_BASE}/api/projects/user`);
      console.log('[useProjectManager] Using token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE}/api/projects/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('[useProjectManager] Failed response:', response.status, response.statusText);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('[useProjectManager] Error details:', errorData);
        } catch (e) {
          console.error('[useProjectManager] Could not parse error response');
        }
        
        // If unauthorized, don't redirect immediately - just log
        if (response.status === 401) {
          console.error('[useProjectManager] 401 Unauthorized - token may be invalid');
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Authentication failed - please log in again',
            projects: [] 
          }));
          return;
        }
        
        throw new Error('Failed to load projects');
      }

      const projects = await response.json();
      console.log('[useProjectManager] Received projects from API:', projects);
      
      // Try to restore last selected project and media
      let restoredProject = null;
      let restoredMedia = null;
      
      try {
        const lastProjectId = localStorage.getItem('lastSelectedProjectId');
        const lastMediaId = localStorage.getItem('lastSelectedMediaId');
        
        if (lastProjectId && projects.length > 0) {
          restoredProject = projects.find((p: Project) => p.projectId === lastProjectId);
          
          if (restoredProject && lastMediaId) {
            restoredMedia = restoredProject.mediaFiles.find((m: MediaFile) => m.mediaId === lastMediaId);
          }
        }
        
        console.log('[useProjectManager] Restored selection:', {
          projectId: restoredProject?.projectId,
          mediaId: restoredMedia?.mediaId
        });
      } catch (e) {
        console.warn('[useProjectManager] Failed to restore selection:', e);
      }
      
      // Use restored project/media or default to first
      const currentProject = restoredProject || projects[0] || null;
      const currentMedia = restoredMedia || currentProject?.mediaFiles?.[0] || null;
      
      setState(prev => ({
        ...prev,
        projects,
        currentProject,
        currentMedia,
        loading: false
      }));
      
      // Sync with global store - clear existing and add all new
      console.log('[useProjectManager] Syncing projects to store:', projects.length);
      store.clearAllProjects();
      projects.forEach((project: any, index: number) => {
        store.addProject(project);
      });
      
      // Also sync the current selection to store
      if (currentProject) {
        store.selectProject({
          projectId: currentProject.projectId,
          name: currentProject.projectName,
          displayName: currentProject.projectName,
          mediaFiles: currentProject.mediaFiles.map((m: MediaFile) => ({
            id: m.mediaId,
            name: m.fileName,
            type: 'server' as const,
            serverPath: m.filePath,
            duration: m.duration?.toString(),
            size: m.size,
            mimeType: m.mimeType
          })),
          createdAt: currentProject.createdAt,
          updatedAt: currentProject.updatedAt
        });
        
        if (currentMedia) {
          store.selectMedia({
            id: currentMedia.mediaId,
            name: currentMedia.fileName,
            type: 'server' as const,
            serverPath: currentMedia.filePath,
            duration: currentMedia.duration?.toString(),
            size: currentMedia.size,
            mimeType: currentMedia.mimeType
          });
        }
      }
      
      console.log('[useProjectManager] Projects synced to store with selection restored');
    } catch (error) {
      console.error('Failed to load projects:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load projects'
      }));
    }
  }, []);

  // Upload new project
  const uploadProject = useCallback(async (params: UploadParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('userId', params.userId);
      formData.append('folderName', params.folderName);
      
      params.files.forEach((file, index) => {
        formData.append('media', file);
      });

      const response = await fetch(`${API_BASE}/api/projects/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload project');
      }

      const newProject = await response.json();
      
      // Add to state
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, newProject],
        currentProject: newProject,
        currentMedia: newProject.mediaFiles[0] || null,
        loading: false
      }));

      // Also update zustand store for persistence
      store.addProject({
        projectId: newProject.projectId,
        name: newProject.projectName,
        displayName: newProject.projectName,
        mediaFiles: newProject.mediaFiles.map((m: MediaFile) => ({
          id: m.mediaId,
          name: m.fileName,
          type: 'server' as const,
          serverPath: m.filePath,
          duration: m.duration?.toString(),
          size: m.size,
          mimeType: m.mimeType
        })),
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt
      });

      return newProject;
    } catch (error) {
      console.error('Failed to upload project:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to upload project'
      }));
      throw error;
    }
  }, [store]);

  // Select project
  const selectProject = useCallback((project: Project) => {
    const currentMedia = project.mediaFiles[0] || null;
    setState(prev => ({
      ...prev,
      currentProject: project,
      currentMedia
    }));

    // Save to localStorage for persistence
    try {
      localStorage.setItem('lastSelectedProjectId', project.projectId);
      if (currentMedia) {
        localStorage.setItem('lastSelectedMediaId', currentMedia.mediaId);
      }
    } catch (e) {
      console.warn('[useProjectManager] Failed to save selection to localStorage:', e);
    }

    // Update zustand store
    store.selectProject({
      projectId: project.projectId,
      name: project.projectName,
      displayName: project.projectName,
      mediaFiles: project.mediaFiles.map(m => ({
        id: m.mediaId,
        name: m.fileName,
        type: 'server' as const,
        serverPath: m.filePath,
        duration: m.duration?.toString(),
        size: m.size,
        mimeType: m.mimeType
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  }, [store]);

  // Select media
  const selectMedia = useCallback((media: MediaFile) => {
    setState(prev => ({
      ...prev,
      currentMedia: media
    }));
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('lastSelectedMediaId', media.mediaId);
    } catch (e) {
      console.warn('[useProjectManager] Failed to save media selection to localStorage:', e);
    }

    // Update zustand store
    store.selectMedia({
      id: media.mediaId,
      name: media.fileName,
      type: 'server' as const,
      serverPath: media.filePath,
      duration: media.duration?.toString(),
      size: media.size,
      mimeType: media.mimeType
    });
  }, [store]);

  // Navigate media
  const navigateMedia = useCallback((direction: 'next' | 'previous') => {
    const { currentProject, currentMedia } = state;
    if (!currentProject || !currentMedia) return;

    const currentIndex = currentProject.mediaFiles.findIndex(
      m => m.mediaId === currentMedia.mediaId
    );

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % currentProject.mediaFiles.length;
    } else {
      newIndex = currentIndex > 0 
        ? currentIndex - 1 
        : currentProject.mediaFiles.length - 1;
    }

    const newMedia = currentProject.mediaFiles[newIndex];
    selectMedia(newMedia);
  }, [state, selectMedia]);

  // Load transcription for current media
  const loadTranscription = useCallback(async (
    mediaId: string, 
    projectId?: string,
    type: 'transcription' | 'proofreading' | 'export' = 'transcription'
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use provided projectId - it's required now
      if (!projectId) {
        throw new Error('Project ID is required for loading transcription');
      }
      
      console.log(`[useProjectManager] Loading transcription for media: ${mediaId}, project: ${projectId}, type: ${type}`);
      
      // Include project ID in the URL
      const url = `${API_BASE}/api/projects/${projectId}/media/${mediaId}/${type}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[useProjectManager] No transcription found for media: ${mediaId} in project: ${projectId}`);
          // No transcription exists yet - return empty
          return null;
        }
        throw new Error('Failed to load transcription');
      }

      const data = await response.json();
      console.log(`[useProjectManager] Loaded transcription with ${data?.blocks?.length || 0} blocks, first block: ${data?.blocks?.[0]?.text?.substring(0, 50)}`);
      return data;
    } catch (error) {
      console.error('[useProjectManager] Failed to load transcription:', error);
      return null;
    }
  }, []); // No dependencies - projectId is passed as parameter
  
  // Save transcription for current media
  const saveTranscription = useCallback(async (
    mediaId: string, 
    data: { blocks?: any[], speakers?: any[], remarks?: any[] },
    type: 'transcription' | 'proofreading' | 'export' = 'transcription'
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Make sure we have a current project
      if (!state.currentProject) {
        throw new Error('No project selected');
      }

      console.log(`[useProjectManager] Saving transcription for media: ${mediaId}, type: ${type}`);
      console.log(`[useProjectManager] Save data:`, {
        blocks: data.blocks?.length || 0,
        speakers: data.speakers?.length || 0,
        remarks: data.remarks?.length || 0
      });

      const response = await fetch(`${API_BASE}/api/projects/media/${mediaId}/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useProjectManager] Save failed:', response.status, errorText);
        throw new Error(`Failed to save transcription: ${response.status}`);
      }

      const result = await response.json();
      console.log('[useProjectManager] Transcription saved successfully for media:', mediaId, result);
      return result;
    } catch (error) {
      console.error('Failed to save transcription:', error);
      throw error;
    }
  }, [state.currentProject]);

  // Initialize on mount
  // Temporarily disable auto-load to fix infinite loading
  // useEffect(() => {
  //   loadProjects();
  // }, [loadProjects]);

  return {
    ...state,
    uploadProject,
    selectProject,
    selectMedia,
    navigateMedia,
    loadTranscription,
    saveTranscription,
    reload: loadProjects
  };
}