'use client';

import { create } from 'zustand';

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
  navigateMedia: (direction: 'next' | 'previous') => void;
  createProjectFromFolder: (formData: FormData) => Promise<Project | null>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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
        console.log('[ProjectStore] Called from:', new Error().stack?.split('\n')[2]);
        
        // Prevent rapid reloads - check if we loaded recently (within 2 seconds)
        const now = Date.now();
        const { lastLoadTime, isLoading } = get();
        
        if (isLoading) {
          console.log('[ProjectStore] Already loading, skipping duplicate request');
          return;
        }
        
        if (lastLoadTime && (now - lastLoadTime) < 2000) {
          console.log('[ProjectStore] Recently loaded, skipping (throttled)');
          return;
        }
        
        set({ isLoading: true, error: null, lastLoadTime: now });
        
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          console.log('[ProjectStore] Using token:', token ? `${token.substring(0, 20)}...` : 'none');
          console.log('[ProjectStore] Full request URL: http://localhost:5000/api/projects/list');
          
          const response = await fetch('http://localhost:5000/api/projects/list', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('[ProjectStore] Response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Failed to load projects: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[ProjectStore] Raw response data:', data);
          
          const projects = data.projects || [];
          
          console.log('[ProjectStore] Loaded projects:', { 
            count: projects.length, 
            currentProject: get().currentProject?.projectId || 'none',
            firstProject: projects[0] || 'none'
          });
          console.log('[ProjectStore] Setting state with projects:', projects.map(p => p.projectId));
          
          // Auto-select first project and first media if available
          if (projects.length > 0 && !get().currentProject) {
            const firstProject = projects[0];
            const firstMediaId = firstProject.mediaFiles?.[0];
            
            console.log('[ProjectStore] Auto-selecting first project and media:', {
              projectId: firstProject.projectId,
              mediaId: firstMediaId,
              hasMediaFiles: !!firstProject.mediaFiles,
              mediaFilesCount: firstProject.mediaFiles?.length || 0
            });
            
            if (firstMediaId) {
              // First set the project and media selection
              set({ 
                projects,
                currentProject: firstProject,
                currentMediaId: firstMediaId,
                isLoading: false 
              });
              
              console.log('[ProjectStore] State updated, now loading media data...');
              
              // Then load media data in a separate async operation
              setTimeout(async () => {
                try {
                  console.log('[ProjectStore] Loading media data for:', firstProject.projectId, firstMediaId);
                  const transcriptionData = await get().loadMediaData(firstProject.projectId, firstMediaId);
                  console.log('[ProjectStore] Media data loaded successfully:', {
                    hasBlocks: !!transcriptionData?.blocks,
                    hasMetadata: !!transcriptionData?.metadata,
                    fileName: transcriptionData?.metadata?.fileName || 'none',
                    originalName: transcriptionData?.metadata?.originalName || 'none'
                  });
                  set({ currentTranscriptionData: transcriptionData });
                } catch (error) {
                  console.error('[ProjectStore] Error loading initial media data:', error);
                  // Still keep the project/media selection even if data loading fails
                }
              }, 100); // Small delay to ensure state is set
            } else {
              console.log('[ProjectStore] No media files in first project');
              set({ projects, isLoading: false });
            }
          } else {
            console.log('[ProjectStore] Not auto-selecting:', {
              hasProjects: projects.length > 0,
              hasCurrentProject: !!get().currentProject
            });
            set({ projects, isLoading: false });
          }
        } catch (error) {
          console.error('Error loading projects:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load projects', isLoading: false });
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
          const response = await fetch(`http://localhost:5000/api/projects/${projectId}/media/${mediaId}/load`, {
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
          console.log('[ProjectStore] Saving media data:', { projectId, mediaId, data });
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const url = `http://localhost:5000/api/projects/${projectId}/media/${mediaId}/transcription`;
          console.log('[ProjectStore] Save URL:', url);
          console.log('[ProjectStore] Save token:', token?.substring(0, 20) + '...');
          
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          });
          
          console.log('[ProjectStore] Save response:', response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[ProjectStore] Save error response:', errorText);
            throw new Error(`Failed to save media data: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log('[ProjectStore] Save success:', result);
          return true;
        } catch (error) {
          console.error('[ProjectStore] Error saving media data:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to save media data' });
          return false;
        }
      },

      // Update media stage
      updateMediaStage: async (projectId, mediaId, stage) => {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
          const response = await fetch(`http://localhost:5000/api/projects/${projectId}/media/${mediaId}/stage`, {
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
          const response = await fetch('http://localhost:5000/api/projects/create-from-folder', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Failed to create project');
          }
          
          const result = await response.json();
          
          // Reload projects to get the new one
          await get().loadProjects();
          
          // Find and return the new project
          const newProject = get().projects.find(p => p.projectId === result.projectId);
          set({ isLoading: false });
          
          return newProject || null;
        } catch (error) {
          console.error('Error creating project:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create project',
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
      }
}));

// Make store accessible from console for debugging
if (typeof window !== 'undefined') {
  (window as any).projectStore = useProjectStore;
}

export default useProjectStore;