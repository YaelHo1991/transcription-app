'use client';

import { create } from 'zustand';
import { buildApiUrl } from '@/utils/api';

// Helper functions for persistent state
const STORAGE_KEYS = {
  CURRENT_PROJECT_ID: 'transcription_currentProjectId',
  CURRENT_MEDIA_ID: 'transcription_currentMediaId'
};

const loadPersistedState = () => {
  if (typeof window === 'undefined') return { projectId: null, mediaId: null };

  try {
    const projectId = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    const mediaId = localStorage.getItem(STORAGE_KEYS.CURRENT_MEDIA_ID);

    console.log('[ProjectStore] Loading persisted state:', { projectId, mediaId });
    return { projectId, mediaId };
  } catch (error) {
    console.error('[ProjectStore] Error loading persisted state:', error);
    return { projectId: null, mediaId: null };
  }
};

const savePersistedState = (projectId: string | null, mediaId: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (projectId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, projectId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    }

    if (mediaId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MEDIA_ID, mediaId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_MEDIA_ID);
    }

    console.log('[ProjectStore] Saved persisted state:', { projectId, mediaId });
  } catch (error) {
    console.error('[ProjectStore] Error saving persisted state:', error);
  }
};

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

// Helper function to get authenticated token with validation
const getAuthToken = (): string => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

  if (!token) {
    console.error('[ProjectStore] No authentication token found');
    throw new Error('Authentication required - please log in');
  }

  // Prevent using development fallbacks in production
  if (token === 'dev-user-default' || token === 'dev-anonymous') {
    console.error('[ProjectStore] Invalid development token detected:', token);
    throw new Error('Invalid authentication token - please log in again');
  }

  // Validate JWT format (must have 3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('[ProjectStore] Malformed JWT token - clearing and requiring re-login');
    // Clear invalid tokens
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    throw new Error('Invalid token format - please log in again');
  }

  return token;
};

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
  transcriptionType?: string; // Type of transcription: general, court, medical, etc. (default: general)
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
  restorePersistedState: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentMedia: (media: MediaFile | null) => void;
  setCurrentMediaById: (projectId: string, mediaId: string, onProgress?: (progress: number) => void) => Promise<void>;
  loadMediaData: (projectId: string, mediaId: string, onProgress?: (progress: number) => void) => Promise<TranscriptionData | null>;
  saveMediaData: (projectId: string, mediaId: string, data: Partial<TranscriptionData>) => Promise<boolean>;
  updateMediaStage: (projectId: string, mediaId: string, stage: 'transcription' | 'proofreading' | 'export') => Promise<boolean>;
  renameProject: (projectId: string, newName: string) => Promise<boolean>;
  navigateMedia: (direction: 'next' | 'previous') => void;
  createProjectFromFolder: (formData: FormData, onProgress?: (progress: number) => void) => Promise<Project | null>;
  addMediaToProject: (projectId: string, formData: FormData, force?: boolean, onProgress?: (progress: number) => void) => Promise<{ success: boolean; isDuplicate?: boolean; existingMedia?: any; newMediaIds?: string[] } | null>;
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
          const token = getAuthToken();
          console.log('[ProjectStore] Using authenticated token');

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
        // Save to localStorage
        savePersistedState(project?.projectId || null, get().currentMediaId);
      },

      // Set current media
      setCurrentMedia: (media) => {
        set({ currentMedia: media });
      },

      // Set current media by ID and load its data
      setCurrentMediaById: async (projectId, mediaId, onProgress) => {
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

        // Save to localStorage
        savePersistedState(projectId, mediaId);

        try {
          console.log('[ProjectStore] Loading media data for:', projectId, mediaId);
          const transcriptionData = await loadMediaData(projectId, mediaId, onProgress);
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
      loadMediaData: async (projectId, mediaId, onProgress) => {
        try {
          const token = getAuthToken();
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

          // If onProgress callback is provided and response supports streaming, track progress
          if (onProgress && response.body) {
            const contentLength = response.headers.get('Content-Length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            if (total > 0) {
              const reader = response.body.getReader();
              let receivedLength = 0;
              const chunks = [];

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                // Report progress
                const progress = Math.round((receivedLength / total) * 100);
                onProgress(progress);
              }

              // Concatenate chunks into single Uint8Array
              const chunksAll = new Uint8Array(receivedLength);
              let position = 0;
              for (const chunk of chunks) {
                chunksAll.set(chunk, position);
                position += chunk.length;
              }

              // Decode and parse JSON
              const text = new TextDecoder('utf-8').decode(chunksAll);
              const data = JSON.parse(text);
              onProgress(100); // Complete
              return data;
            }
          }

          // Fallback: no progress tracking
          const data = await response.json();
          if (onProgress) onProgress(100);
          return data;
        } catch (error) {
          console.error('Error loading media data:', error);
          throw error;
        }
      },

      // Save media data to backend
      saveMediaData: async (projectId, mediaId, data) => {
        try {
          const token = getAuthToken();
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
          const token = getAuthToken();
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
          const token = getAuthToken();
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
        
        const newMediaItem = currentProject.mediaFiles[newIndex];
        const newMediaId = typeof newMediaItem === 'string' ? newMediaItem : newMediaItem.id;

        // Update the state
        set({
          currentProject: { ...currentProject, currentMediaIndex: newIndex },
          currentMediaId: newMediaId
        });

        // Load the transcription data for the new media
        await get().setCurrentMediaById(currentProject.projectId, newMediaId);
      },

      // Create project from folder
      createProjectFromFolder: async (formData, onProgress) => {
        set({ isLoading: true, error: null });

        try {
          const token = getAuthToken();
          const url = buildApiUrl('/api/projects/create-from-folder');

          console.log('[🔍🔍🔍 UPLOAD-FLOW] Creating project from folder at', new Date().toISOString());
          console.log('[🔍🔍🔍 UPLOAD-FLOW] URL:', url);
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Token:', token?.substring(0, 20) + '...');
          console.log('[🔍🔍🔍 UPLOAD-FLOW] FormData entries:');
          for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
              console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }

          // Use XMLHttpRequest for upload progress tracking
          const response: any = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
              // Fire progress at 0% when upload starts
              xhr.upload.addEventListener('loadstart', () => {
                console.log('[🔍🔍🔍 UPLOAD-FLOW] Upload started: 0%');
                onProgress(0);
              });

              xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  console.log(`[🔍🔍🔍 UPLOAD-FLOW] Upload progress: ${percentComplete}%`);
                  onProgress(percentComplete);
                } else {
                  console.log('[🔍🔍🔍 UPLOAD-FLOW] Progress event but not lengthComputable');
                }
              });

              // Fire progress at 100% when upload completes
              xhr.upload.addEventListener('load', () => {
                console.log('[🔍🔍🔍 UPLOAD-FLOW] Upload completed: 100%');
                onProgress(100);
              });
            }

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  resolve({
                    ok: true,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    json: async () => data
                  });
                } catch (e) {
                  reject(new Error('Failed to parse response'));
                }
              } else {
                resolve({
                  ok: false,
                  status: xhr.status,
                  statusText: xhr.statusText,
                  text: async () => xhr.responseText,
                  json: async () => {
                    try {
                      return JSON.parse(xhr.responseText);
                    } catch (e) {
                      return { error: xhr.responseText };
                    }
                  }
                });
              }
            });

            xhr.addEventListener('error', () => {
              console.error('[🔍🔍🔍 UPLOAD-FLOW] XMLHttpRequest failed');
              reject(new Error('Network error'));
            });

            xhr.open('POST', url);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
          });

          if (!response) {
            // Backend is down or network error
            console.error('[🔍🔍🔍 UPLOAD-FLOW] No response received - backend unavailable or network error');
            set({
              error: 'Backend unavailable - unable to create project',
              isLoading: false
            });
            return null;
          }

          console.log('[🔍🔍🔍 UPLOAD-FLOW] Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          })
          
          if (!response.ok) {
            // Try to parse error response for storage limit errors
            let errorData: any = {};
            let errorText = '';
            try {
              errorText = await response.text();
              console.error('[🔍🔍🔍 UPLOAD-FLOW] Error response text:', errorText);
              errorData = JSON.parse(errorText);
            } catch (parseError) {
              // If response is not JSON, just use status text
              console.error('[🔍🔍🔍 UPLOAD-FLOW] Failed to parse error response:', parseError);
              console.error('[🔍🔍🔍 UPLOAD-FLOW] Raw response:', errorText);
              throw new Error(response.statusText || 'Failed to create project');
            }

            // Check if it's a storage limit error (413 status)
            if (response.status === 413 && errorData.error === 'Storage limit exceeded') {
              // Don't throw error, return null with error info attached
              console.log('[🔍🔍🔍 UPLOAD-FLOW] Storage limit exceeded:', errorData);
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
            console.error('[🔍🔍🔍 UPLOAD-FLOW] ❌ Project creation failed with status:', response.status);
            console.error('[🔍🔍🔍 UPLOAD-FLOW] ❌ Error data:', errorData);
            set({
              error: errorData.error || errorData.message || 'Failed to create project',
              isLoading: false
            });
            return null;
          }
          
          const result = await response.json();
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Project creation result at', new Date().toISOString(), ':', result);
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Result success:', result.success);
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Result projectId:', result.projectId);
          
          // Check if archived transcriptions were found
          if (result.hasArchivedTranscriptions) {
            console.log('[🔍🔍🔍 UPLOAD-FLOW] Archived transcriptions found:', result);
            set({ isLoading: false });
            return result; // Return the archived info to the component
          }
          
          // Check if it's a duplicate project detection
          if (result.isDuplicateProject) {
            console.log('[🔍🔍🔍 UPLOAD-FLOW] Duplicate project detected:', result);
            set({ isLoading: false });
            return result; // Return the duplicate info to the component
          }
          
          // Check if creation was successful
          if (!result.success || !result.projectId) {
            console.error('[🔍🔍🔍 UPLOAD-FLOW] Project creation failed - success:', result.success, 'projectId:', result.projectId);
            console.error('[🔍🔍🔍 UPLOAD-FLOW] Full result:', JSON.stringify(result));
            throw new Error(result.message || 'Failed to create project');
          }

          // Temporarily set isLoading to false so loadProjects doesn't skip the request
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Setting isLoading to false before loadProjects');
          set({ isLoading: false });

          // Reload projects to get the full project with metadata
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Calling loadProjects to refresh project list');
          await get().loadProjects();
          console.log('[🔍🔍🔍 UPLOAD-FLOW] loadProjects completed');

          // Find the newly created project with full details
          const { projects } = get();
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Total projects after reload:', projects.length);
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Looking for projectId:', result.projectId);
          const newProject = projects.find(p => p.projectId === result.projectId);
          console.log('[🔍🔍🔍 UPLOAD-FLOW] Found new project:', newProject ? 'YES' : 'NO');
          
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
          console.warn('[🔍🔍🔍 UPLOAD-FLOW] Error creating project:', error instanceof Error ? error.message : String(error));

          // Check if it's a network error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('[🔍🔍🔍 UPLOAD-FLOW] Network error - backend might be down');
          }
          
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false 
          });
          return null;
        }
      },

      // Add media to existing project
      addMediaToProject: async (projectId, formData, force = false, onProgress) => {
        console.log('[ProjectStore] Adding media to project:', projectId, 'force:', force);

        try {
          const token = getAuthToken();

          // Add force parameter to formData if needed
          if (force) {
            formData.append('force', 'true');
          }

          // Use XMLHttpRequest for upload progress tracking
          const result: any = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
              xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  console.log(`[ProjectStore] Upload progress: ${percentComplete}%`);
                  onProgress(percentComplete);
                }
              });
            }

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch (e) {
                  reject(new Error('Invalid JSON response'));
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  reject(new Error(errorData.error || 'Failed to add media'));
                } catch {
                  reject(new Error(xhr.responseText || 'Failed to add media'));
                }
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error'));
            });

            xhr.addEventListener('abort', () => {
              reject(new Error('Upload aborted'));
            });

            xhr.open('POST', buildApiUrl(`/api/transcription/projects/${projectId}/add-media`));
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
          });
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
        // Clear persisted state
        savePersistedState(null, null);
      },

      // Restore persisted state after projects are loaded
      restorePersistedState: async () => {
        const { projects } = get();
        if (!projects || projects.length === 0) {
          console.log('[ProjectStore] No projects available, cannot restore state');
          return;
        }

        const persisted = loadPersistedState();
        if (persisted.projectId && persisted.mediaId) {
          console.log('[ProjectStore] Restoring persisted state:', persisted);

          // Find the project
          const project = projects.find(p => p.projectId === persisted.projectId);
          if (project) {
            // Check if media exists in project - handle both string and object formats
            let mediaExists = false;
            if (project.mediaFiles) {
              mediaExists = project.mediaFiles.some(item => {
                const mediaId = typeof item === 'string' ? item : item.id;
                return mediaId === persisted.mediaId;
              });
            }

            if (mediaExists) {
              console.log('[ProjectStore] Restoring project and media:', persisted.projectId, persisted.mediaId);

              // Set current project
              set({ currentProject: project });

              // Load the media
              await get().setCurrentMediaById(persisted.projectId, persisted.mediaId);
            } else {
              console.log('[ProjectStore] Media not found in project, loading first media');
              // Media doesn't exist, load first media
              set({ currentProject: project });
              if (project.mediaFiles && project.mediaFiles.length > 0) {
                const firstMediaItem = project.mediaFiles[0];
                const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
                await get().setCurrentMediaById(project.projectId, firstMediaId);
              }
            }
          } else {
            console.log('[ProjectStore] Persisted project not found');
            // Clear invalid persisted state
            savePersistedState(null, null);
          }
        }
      },
      
      // Restore archived transcriptions
      restoreArchivedTranscriptions: async (transcriptionIds, projectId, mediaIds) => {
        set({ isLoading: true, error: null });
        
        try {
          const token = getAuthToken();
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