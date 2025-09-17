'use client';

import { create } from 'zustand';
import { buildApiUrl } from '@/utils/api';

export interface MediaFile {
  id: string;
  name: string;
  type: 'local' | 'url' | 'server';
  sources?: Record<string, {
    path: string;
    lastSeen: string;
    computerName: string;
  }>;
  url?: string;
  serverPath?: string;
  duration?: string;
  size?: number;
  mimeType?: string;
  file?: File; // For blob URL creation
}

export interface MediaInfo {
  mediaId: string;
  name: string;
  size: number; // Size in bytes
  duration: number; // Duration in seconds
  mimeType?: string;
}

export interface Project {
  projectId: string;
  name: string;
  displayName: string;
  mediaFiles: string[]; // Array of media IDs
  totalMedia: number;
  currentMediaIndex: number;
  createdAt: string;
  lastModified: string;
  mediaInfo?: MediaInfo[]; // Detailed info for each media file
  size?: number; // Total project size in bytes
  mediaDurations?: Record<string, number>; // Map of mediaId to duration in seconds
}

export interface MediaMetadata {
  mediaId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  stage: 'transcription' | 'proofreading' | 'export';
  createdAt: string;
  lastModified: string;
}

export interface TranscriptionData {
  blocks: any[];
  speakers: any[];
  remarks: any[];
  metadata: MediaMetadata;
}

interface ProjectState {
  // State
  projects: Project[];
  currentProject: Project | null;
  currentMedia: MediaFile | null;
  currentMediaId: string | null;
  currentTranscriptionData: TranscriptionData | null;
  isLoading: boolean;
  error: string | null;
  lastLoadTime: number;
  
  // Actions
  loadProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentMedia: (media: MediaFile | null) => void;
  setCurrentMediaById: (projectId: string, mediaId: string) => Promise<void>;
  loadMediaData: (projectId: string, mediaId: string) => Promise<TranscriptionData | null>;
  saveMediaData: (projectId: string, mediaId: string, data: Partial<TranscriptionData>) => Promise<boolean>;
  updateMediaStage: (projectId: string, mediaId: string, stage: 'transcription' | 'proofreading' | 'export') => Promise<boolean>;
  renameProject: (projectId: string, newName: string) => Promise<boolean>;
  navigateMedia: (direction: 'next' | 'previous') => void;
  createProjectFromFolder: (formData: FormData) => Promise<Project | null>;
  addMediaToProject: (projectId: string, formData: FormData, force?: boolean) => Promise<{ success: boolean; isDuplicate?: boolean; existingMedia?: any; newMediaIds?: string[] } | null>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentTranscription: () => void;
  restoreArchivedTranscriptions: (transcriptionIds: string[], projectId: string, mediaIds: string[]) => Promise<boolean>;
}

const useProjectStore = create<ProjectState>()((set, get) => ({
  // Initial state
  projects: [],
  currentProject: null,
  currentMedia: null,
  currentMediaId: null,
  currentTranscriptionData: null,
  isLoading: false,
  error: null,
  lastLoadTime: 0,

  // Load all projects
  loadProjects: async () => {
        console.log('[ProjectStore] Starting loadProjects...');

        const { isLoading } = get();

        if (isLoading) {
          console.log('[ProjectStore] Already loading, skipping duplicate request');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          console.log('[ProjectStore] Using token:', token);

          const response = await fetch(buildApiUrl('/api/projects/list'), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).catch(error => {
            console.warn('[ProjectStore] Failed to fetch projects:', error.message);
            return null;
          });

          if (!response) {
            console.log('[ProjectStore] Backend unavailable, using empty projects list');
            set({
              projects: [],
              isLoading: false
            });
            return;
          }

          console.log('[ProjectStore] Response status:', response.status);

          if (!response.ok) {
            throw new Error(`Failed to load projects: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[ProjectStore] Loaded', data.projects?.length || 0, 'projects');
          
          const projects = data.projects || [];
          
          // Update currentProject if it exists
          const { currentProject } = get();
          let updatedCurrentProject = currentProject;
          
          if (currentProject && currentProject.projectId) {
            // Find the updated version of the current project
            const updatedProject = projects.find(p => p.projectId === currentProject.projectId);
            if (updatedProject) {
              updatedCurrentProject = updatedProject;
              console.log('[ProjectStore] Updated currentProject with fresh data');
            }
          }
          
          // Set the projects and updated currentProject
          set({ 
            projects,
            currentProject: updatedCurrentProject,
            isLoading: false 
          });
          
        } catch (error) {
          console.error('[ProjectStore] Error loading projects:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load projects', 
            isLoading: false 
          });
        }
      },

      // Set current project
      setCurrentProject: (project) => {
        set({ currentProject: project });
      },

      // Set current media
      setCurrentMedia: (media) => {
        set({ currentMedia: media });
      },

      // Set current media by ID and load its data
      setCurrentMediaById: async (projectId, mediaId) => {
        console.log('[ProjectStore] setCurrentMediaById called:', { projectId, mediaId });
        
        // If IDs are empty, just clear the current media
        if (!projectId || !mediaId) {
          console.log('[ProjectStore] Empty IDs provided, clearing current media');
          set({ 
            currentMediaId: null,
            currentTranscriptionData: null,
            isLoading: false 
          });
          return;
        }
        
        const { loadMediaData } = get();
        set({ currentMediaId: mediaId, isLoading: true });
        
        try {
          console.log('[ProjectStore] Loading media data for:', projectId, mediaId);
          const transcriptionData = await loadMediaData(projectId, mediaId);
          console.log('[ProjectStore] Media data loaded:', {
            hasData: !!transcriptionData,
            hasMetadata: !!transcriptionData?.metadata,
            fileName: transcriptionData?.metadata?.fileName || 'none'
          });
          set({ 
            currentTranscriptionData: transcriptionData,
            isLoading: false 
          });
        } catch (error) {
          console.error('[ProjectStore] Error loading media data:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load media data',
            isLoading: false 
          });
        }
      },

      // Load media data from backend
      loadMediaData: async (projectId, mediaId) => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const response = await fetch(buildApiUrl(`/api/projects/${projectId}/media/${mediaId}/load`), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            if (response.status === 404) {
              // Return empty data for new media
              return {
                blocks: [],
                speakers: [],
                remarks: [],
                metadata: {} as MediaMetadata
              };
            }
            throw new Error('Failed to load media data');
          }
          
          const data = await response.json();
          return data;
        } catch (error) {
          console.error('Error loading media data:', error);
          throw error;
        }
      },

      // Save media data to backend
      saveMediaData: async (projectId, mediaId, data) => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const url = buildApiUrl(`/api/projects/${projectId}/media/${mediaId}/transcription`);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            // Only log non-network errors
            if (response.status !== 0) {
              console.error('[ProjectStore] Save error response:', errorText);
            }
            throw new Error(`Failed to save media data: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          return true;
        } catch (error: any) {
          // Handle network errors silently
          if (error.name === 'AbortError') {
            console.log('[ProjectStore] Save request timed out - data saved locally');
          } else if (error.message && error.message.includes('Failed to fetch')) {
            // Backend is down - data is still saved locally
            console.log('[ProjectStore] Backend unavailable - data saved locally');
          } else {
            // Only log non-network errors
            console.error('[ProjectStore] Error saving media data:', error);
          }
          // Don't set error state for network issues
          if (!error.message?.includes('Failed to fetch') && !error.name?.includes('Abort')) {
            set({ error: error instanceof Error ? error.message : 'Failed to save media data' });
          }
          return false;
        }
      },

      // Update media stage
      updateMediaStage: async (projectId, mediaId, stage) => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const response = await fetch(buildApiUrl(`/api/projects/${projectId}/media/${mediaId}/stage`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stage })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update media stage');
          }
          
          return true;
        } catch (error) {
          console.error('Error updating media stage:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update media stage' });
          return false;
        }
      },

      // Rename project
      renameProject: async (projectId, newName) => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const response = await fetch(buildApiUrl(`/api/projects/${projectId}/rename`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newName })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to rename project' }));
            throw new Error(errorData.error || 'Failed to rename project');
          }
          
          // Update the project in local state
          const { projects } = get();
          const updatedProjects = projects.map(project => 
            project.projectId === projectId 
              ? { ...project, displayName: newName, name: newName }
              : project
          );
          
          set({ projects: updatedProjects });
          return true;
        } catch (error) {
          console.error('Error renaming project:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to rename project' });
          return false;
        }
      },

      // Navigate between media files
      navigateMedia: async (direction) => {
        const { currentProject } = get();
        if (!currentProject || !currentProject.mediaFiles.length) {
          console.warn('[ProjectStore] No project or media files available for navigation');
          return;
        }
        
        const currentIndex = currentProject.currentMediaIndex;
        let newIndex: number;
        
        if (direction === 'next') {
          newIndex = currentIndex + 1 >= currentProject.mediaFiles.length ? 0 : currentIndex + 1;
        } else {
          newIndex = currentIndex - 1 < 0 ? currentProject.mediaFiles.length - 1 : currentIndex - 1;
        }
        
        const newMediaId = currentProject.mediaFiles[newIndex];
        
        // Update the state
        set({ 
          currentProject: { ...currentProject, currentMediaIndex: newIndex },
          currentMediaId: newMediaId
        });
        
        // Load the transcription data for the new media
        await get().setCurrentMediaById(currentProject.projectId, newMediaId);
      },

      // Create project from folder
      createProjectFromFolder: async (formData) => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const url = buildApiUrl('/api/projects/create-from-folder');
          
          console.log('[ProjectStore] Creating project from folder...');
          console.log('[ProjectStore] URL:', url);
          console.log('[ProjectStore] Token:', token);
          console.log('[ProjectStore] FormData entries:');
          for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
              console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }).catch(error => {
            console.warn('[ProjectStore] Failed to create project - backend unavailable:', error.message);
            return null;
          });

          if (!response) {
            // Backend is down, can't create project
            set({
              error: 'Backend unavailable - unable to create project',
              isLoading: false
            });
            return null;
          }
          
          if (!response.ok) {
            // Try to parse error response for storage limit errors
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch (parseError) {
              // If response is not JSON, just use status text
              console.error('Failed to parse error response:', parseError);
              throw new Error(response.statusText || 'Failed to create project');
            }
            
            // Check if it's a storage limit error (413 status)
            if (response.status === 413 && errorData.error === 'Storage limit exceeded') {
              // Don't throw error, return null with error info attached
              console.log('[ProjectStore] Storage limit exceeded:', errorData);
              set({ 
                error: 'storage_limit',
                isLoading: false 
              });
              
              // Return null with storage details attached
              const result = null as any;
              if (result !== null) {
                result.isStorageLimit = true;
                result.storageDetails = {
                  currentUsedMB: errorData.currentUsedMB,
                  limitMB: errorData.limitMB,
                  availableMB: errorData.availableMB,
                  requestedMB: errorData.requestedMB
                };
              }
              return { 
                error: 'storage_limit', 
                storageDetails: errorData 
              } as any;
            }
            
            // For other errors, log but don't throw
            console.log('[ProjectStore] Project creation failed:', errorData.error || errorData.message);
            set({ 
              error: errorData.error || errorData.message || 'Failed to create project',
              isLoading: false 
            });
            return null;
          }
          
          const result = await response.json();
          console.log('[ProjectStore] Project creation result:', result);
          console.log('[ProjectStore] Result success:', result.success);
          console.log('[ProjectStore] Result projectId:', result.projectId);
          
          // Check if archived transcriptions were found
          if (result.hasArchivedTranscriptions) {
            console.log('[ProjectStore] Archived transcriptions found:', result);
            set({ isLoading: false });
            return result; // Return the archived info to the component
          }
          
          // Check if it's a duplicate project detection
          if (result.isDuplicateProject) {
            console.log('[ProjectStore] Duplicate project detected:', result);
            set({ isLoading: false });
            return result; // Return the duplicate info to the component
          }
          
          // Check if creation was successful
          if (!result.success || !result.projectId) {
            console.error('[ProjectStore] Project creation failed - success:', result.success, 'projectId:', result.projectId);
            console.error('[ProjectStore] Full result:', JSON.stringify(result));
            throw new Error(result.message || 'Failed to create project');
          }
          
          // Reload projects to get the full project with metadata
          await get().loadProjects();
          
          // Find the newly created project with full details
          const { projects } = get();
          const newProject = projects.find(p => p.projectId === result.projectId);
          
          if (newProject) {
            set({ isLoading: false });
            return newProject;
          }
          
          // Fallback: construct basic project if not found
          const folderName = formData.get('folderName') as string;
          const constructedProject: Project = {
            projectId: result.projectId,
            name: folderName,
            displayName: folderName,
            mediaFiles: result.mediaIds || [],
            totalMedia: result.totalMedia || result.mediaIds?.length || 0,
            currentMediaIndex: 0,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
          };
          
          // Add it to the projects list
          set({ 
            projects: [...projects, constructedProject],
            isLoading: false 
          });
          
          return constructedProject;
        } catch (error) {
          console.warn('[ProjectStore] Error creating project:', error instanceof Error ? error.message : String(error));

          // Check if it's a network error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('[ProjectStore] Network error - backend might be down');
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false 
          });
          return null;
        }
      },

      // Add media to existing project
      addMediaToProject: async (projectId, formData, force = false) => {
        console.log('[ProjectStore] Adding media to project:', projectId, 'force:', force);
        
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          
          // Add force parameter to formData if needed
          if (force) {
            formData.append('force', 'true');
          }
          
          const response = await fetch(buildApiUrl(`/api/transcription/projects/${projectId}/add-media`), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }).catch(error => {
            console.warn('[ProjectStore] Failed to add media - backend unavailable:', error.message);
            return null;
          });

          if (!response) {
            // Backend is down, can't add media
            set({
              error: 'Backend unavailable - unable to add media',
              isLoading: false
            });
            return null;
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            console.warn('[ProjectStore] Add media error:', errorText);
            
            // Try to parse error response
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }
            
            set({ 
              error: errorData.error || 'Failed to add media',
              isLoading: false 
            });
            return null;
          }
          
          const result = await response.json();
          console.log('[ProjectStore] Add media result:', result);
          
          // Check if it's a duplicate detection response
          if (result.isDuplicate) {
            return {
              success: false,
              isDuplicate: true,
              existingMedia: result.existingMedia
            };
          }
          
          // Check if media was added successfully
          if (result.success) {
            // Reload projects to get updated metadata
            await get().loadProjects();
            
            return {
              success: true,
              newMediaIds: result.newMediaIds
            };
          }
          
          return null;
          
        } catch (error) {
          console.warn('[ProjectStore] Error adding media:', error instanceof Error ? error.message : String(error));
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add media',
            isLoading: false 
          });
          return null;
        }
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Set error
      setError: (error) => {
        set({ error });
      },
      
      // Clear current transcription data
      clearCurrentTranscription: () => {
        set({ 
          currentTranscriptionData: null,
          currentMediaId: null,
          currentMedia: null
        });
      },
      
      // Restore archived transcriptions
      restoreArchivedTranscriptions: async (transcriptionIds, projectId, mediaIds) => {
        set({ isLoading: true, error: null });
        
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const response = await fetch(buildApiUrl('/api/projects/restore-archived'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transcriptionIds, projectId, mediaIds })
          });
          
          if (!response.ok) {
            throw new Error('Failed to restore archived transcriptions');
          }
          
          const result = await response.json();
          console.log('[ProjectStore] Restore result:', result);
          
          set({ isLoading: false });
          return true;
        } catch (error) {
          console.error('[ProjectStore] Error restoring archived transcriptions:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to restore archived transcriptions',
            isLoading: false 
          });
          return false;
        }
      }
}));

// Make store accessible from console for debugging
if (typeof window !== 'undefined') {
  (window as any).projectStore = useProjectStore;
}

export default useProjectStore;