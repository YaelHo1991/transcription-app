'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface Project {
  projectId: string;
  name: string;
  displayName: string;
  mediaFiles: MediaFile[];
  createdAt: string;
  updatedAt: string;
  transcriptionData?: any;
  currentMediaIndex?: number;
}

interface ProjectState {
  // State
  projects: Project[];
  currentProject: Project | null;
  currentMedia: MediaFile | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  selectMedia: (media: MediaFile) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  navigateMedia: (direction: 'next' | 'previous') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAllProjects: () => void;
}

const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      currentMedia: null,
      loading: false,
      error: null,

      // Load projects from server
      loadProjects: async () => {
        set({ loading: true, error: null });
        
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('http://localhost:5000/api/projects/list', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to load projects');
          }

          const projects = await response.json();
          set({ projects, loading: false });
        } catch (error) {
          console.error('Failed to load projects:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load projects',
            loading: false 
          });
        }
      },

      // Select a project
      selectProject: (project) => {
        const currentMediaIndex = project.currentMediaIndex || 0;
        const currentMedia = project.mediaFiles[currentMediaIndex] || null;
        
        set({ 
          currentProject: project,
          currentMedia,
          error: null
        });
      },

      // Select a specific media file
      selectMedia: (media) => {
        const { currentProject } = get();
        if (currentProject) {
          const mediaIndex = currentProject.mediaFiles.findIndex(m => m.id === media.id);
          set({
            currentMedia: media,
            currentProject: {
              ...currentProject,
              currentMediaIndex: mediaIndex >= 0 ? mediaIndex : 0
            }
          });
        }
      },

      // Add a new project
      addProject: (project) => {
        set(state => {
          const currentProjects = Array.isArray(state.projects) ? state.projects : [];
          // Check if project with same name already exists
          const existingIndex = currentProjects.findIndex(p => p.name === project.name);
          
          let updatedProjects;
          if (existingIndex >= 0) {
            // Replace existing project with same name
            updatedProjects = [...currentProjects];
            updatedProjects[existingIndex] = project;
            console.log(`[ProjectStore] Replacing existing project: ${project.name}`);
          } else {
            // Add new project
            updatedProjects = [...currentProjects, project];
            console.log(`[ProjectStore] Adding new project: ${project.name}`);
          }
          
          return {
            projects: updatedProjects,
            currentProject: project,
            currentMedia: project.mediaFiles[0] || null
          };
        });
      },

      // Update an existing project
      updateProject: (projectId, updates) => {
        set(state => ({
          projects: (state.projects || []).map(p => 
            p.projectId === projectId ? { ...p, ...updates } : p
          ),
          currentProject: state.currentProject?.projectId === projectId 
            ? { ...state.currentProject, ...updates }
            : state.currentProject
        }));
      },

      // Delete a project
      deleteProject: (projectId) => {
        set(state => ({
          projects: (state.projects || []).filter(p => p.projectId !== projectId),
          currentProject: state.currentProject?.projectId === projectId 
            ? null 
            : state.currentProject,
          currentMedia: state.currentProject?.projectId === projectId
            ? null
            : state.currentMedia
        }));
      },

      // Navigate between media files
      navigateMedia: (direction) => {
        const { currentProject, currentMedia } = get();
        if (!currentProject || !currentProject.mediaFiles || currentProject.mediaFiles.length === 0) {
          console.warn('[ProjectStore] Cannot navigate - no project or media files');
          return;
        }

        // Find current index based on current media
        let currentIndex = currentProject.currentMediaIndex || 0;
        if (currentMedia) {
          const foundIndex = currentProject.mediaFiles.findIndex(m => m.id === currentMedia.id);
          if (foundIndex >= 0) {
            currentIndex = foundIndex;
          }
        }

        let newIndex: number;
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % currentProject.mediaFiles.length;
        } else {
          newIndex = currentIndex > 0 
            ? currentIndex - 1 
            : currentProject.mediaFiles.length - 1;
        }

        const newMedia = currentProject.mediaFiles[newIndex];
        console.log(`[ProjectStore] Navigating ${direction}: index ${currentIndex} -> ${newIndex}`);
        
        set({
          currentMedia: newMedia,
          currentProject: {
            ...currentProject,
            currentMediaIndex: newIndex
          }
        });
      },

      // Set loading state
      setLoading: (loading) => set({ loading }),

      // Set error state
      setError: (error) => set({ error }),
      
      // Clear all projects (for testing/debugging)
      clearAllProjects: () => {
        console.log('[ProjectStore] Clearing all projects');
        set({
          projects: [],
          currentProject: null,
          currentMedia: null
        });
      }
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        currentProject: state.currentProject,
        currentMedia: state.currentMedia
      })
    }
  )
);

// Make store accessible from console for debugging
if (typeof window !== 'undefined') {
  (window as any).projectStore = useProjectStore;
}

export default useProjectStore;