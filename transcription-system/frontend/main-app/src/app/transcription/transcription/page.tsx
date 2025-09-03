'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
import HoveringHeader from '../components/HoveringHeader';
import TranscriptionSidebar from './components/TranscriptionSidebar/TranscriptionSidebar';
import ProjectManagementModal from './components/ProjectManagementModal/ProjectManagementModal';
import WorkspaceHeader from './components/WorkspaceHeader/WorkspaceHeader';
import HelperFiles from './components/HelperFiles/HelperFiles';
import MediaPlayer from './components/MediaPlayer';
import TextEditor from './components/TextEditor';
import SimpleSpeaker, { SimpleSpeakerHandle } from './components/Speaker/SimpleSpeaker';
import Remarks from './components/Remarks/Remarks';
import { RemarksProvider } from './components/Remarks/RemarksContext';
import RemarksEventListener from './components/Remarks/RemarksEventListener';
import { ConfirmationModal } from './components/TextEditor/components/ConfirmationModal';
import { AuthRequiredModal } from '../../../components/AuthRequiredModal';
import LoginPromptModal from '../../../components/LoginPromptModal';
import useProjectStore from '@/lib/stores/projectStore';
import useHoveringBarsStore from '@/lib/stores/hoveringBarsStore';
import indexedDBService from '@/services/indexedDBService';
import './transcription-theme.css';
import './transcription-page.css';
import './components/TranscriptionSidebar/TranscriptionSidebar.css';
import '../shared/components/HoveringBarsLayout/HoveringBarsLayout.css';

interface MediaItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  name: string;
  size?: string;
}

// MediaCollection represents a collection of media files (audio/video)
// This is different from a transcription project which is stored in the backend
interface MediaCollection {
  name: string;
  mediaItems: MediaItem[];
  transcriptionProjectId?: string; // Reference to the backend transcription project ID
}

// Type for files with webkit directory support
type FileWithPath = File & {
  webkitRelativePath: string;
}

// Extend HTML input element props to include directory selection
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

// Helper function to create default transcription
const createDefaultTranscription = () => ({
  name: 'אין תמלול',
  mediaItems: [], // Always empty - no media
  projectId: null, // Always null - not a real project
  isDefault: true // Always true - marks it as undeletable
});

// Helper function to get current user ID from token or localStorage
const getCurrentUserId = (): string | null => {
  try {
    // Try to get from localStorage
    const userId = localStorage.getItem('userId');
    if (userId) return userId;
    
    // Try to decode from token
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      // Basic JWT decode (without verification)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.userId || payload.id || null;
      }
    }
  } catch (error) {
    console.error('[Auth] Error getting user ID:', error);
  }
  return null;
};

// Helper function to clear all media-related localStorage entries
const clearMediaLocalStorage = (projectId?: string, mediaId?: string) => {
  const keysToRemove: string[] = [];
  
  // Find all media-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Clear media positions
      if (key.startsWith('mediaPosition_')) {
        if (mediaId && key.includes(mediaId)) {
          keysToRemove.push(key);
        } else if (projectId && key.includes(projectId)) {
          keysToRemove.push(key);
        } else if (!mediaId && !projectId) {
          // Clear all if no specific project/media
          keysToRemove.push(key);
        }
      }
      // Clear project/transcription data
      if (projectId && (key.includes(projectId) || key === `project_${projectId}` || key === `transcription_${projectId}`)) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove all found keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('[Page] Removed localStorage key:', key);
  });
};

export default function TranscriptionWorkPage() {
  // Main transcription page component
  const router = useRouter();
  
  // Project store for new project management
  const {
    projects,
    currentProject,
    currentMediaId,
    currentTranscriptionData,
    navigateMedia,
    setCurrentProject,
    setCurrentMediaById
  } = useProjectStore();
  
  // Log when projects change
  useEffect(() => {
    console.log('[TranscriptionPage] Projects updated:', projects.length, 'projects');
    console.log('[TranscriptionPage] Current project:', currentProject?.projectId || 'none');
    console.log('[TranscriptionPage] Current media ID:', currentMediaId || 'none');
    console.log('[TranscriptionPage] Has transcription data:', !!currentTranscriptionData);
  }, [projects, currentProject, currentMediaId, currentTranscriptionData]);
  
  // Check if we should use three-column layout
  const isThreeColumn = useResponsiveLayout();
  
  // User information
  const [userFullName, setUserFullName] = useState('משתמש');
  const [userPermissions, setUserPermissions] = useState('DEF');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get user's full name and ID from localStorage
  useEffect(() => {
    const fullName = localStorage.getItem('userFullName') || '';
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
    
    // Get user permissions
    const permissions = localStorage.getItem('permissions') || 'DEF';
    setUserPermissions(permissions);
    
    // Get and set current user ID
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    console.log('[Auth] Current user ID:', userId);
    
    // Authentication error callback removed - projectService deleted
  }, []);
  
  // Store project remarks to pass to RemarksProvider
  const [projectRemarks, setProjectRemarks] = useState<any[]>([]);
  
  // Create a unique session ID for this transcription session
  const [sessionId] = useState<string>('session-default');
  
  // Use global hovering bars store
  const { headerLocked, sidebarLocked } = useHoveringBarsStore();
  
  const [helperFilesExpanded, setHelperFilesExpanded] = useState(false);
  
  // MediaPlayer and TextEditor synchronization
  const [currentTime, setCurrentTime] = useState(0);
  const mediaPlayerRef = useRef<any>(null);
  
  // Media collection management (for media files) - NOT transcription projects
  const [mediaCollections, setMediaCollections] = useState<MediaCollection[]>([]);
  const [currentCollectionIndex, setCurrentCollectionIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [actualMediaDuration, setActualMediaDuration] = useState<number>(0);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  
  // Transcription management (saved transcriptions from backend)
  const [transcriptions, setTranscriptions] = useState<any[]>(() => [createDefaultTranscription()]);
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(0);
  
  // Modal states for styled alerts
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  
  // Authentication required modal
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  
  // Project Management Modal state
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementModalTab, setManagementModalTab] = useState<'projects' | 'transcriptions' | 'duration' | 'progress'>('projects');
  
  const speakerComponentRef = useRef<SimpleSpeakerHandle>(null);
  
  // Transcription Project management (backend projects with transcription data)
  // currentProjectId refers to the backend transcription project ID (timestamp folder)
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [projectsMap, setProjectsMap] = useState<Map<string, string>>(new Map()); // DEPRECATED - will be removed
  const [mediaProjectsMap, setMediaProjectsMap] = useState<Map<string, string>>(new Map()); // Maps media filename -> transcription projectId
  
  // Get current media collection and media info
  const currentCollection = mediaCollections[currentCollectionIndex];
  const currentMedia = currentCollection?.mediaItems[currentMediaIndex];
  const hasCollections = mediaCollections.length > 0;
  const hasMedia = currentCollection?.mediaItems.length > 0;
  
  // Debug logging (removed to prevent render loops)
  
  // Use project ID for components instead of mediaId
  const mediaId = currentMedia ? '0-0-' + currentMedia.name : '';
  const transcriptionNumber = 2; // Using transcription 2 as default
  
  // Clean media name from URL parameters
  const cleanMediaName = (name: string): string => {
    if (!name) return name;
    
    // If it looks like a YouTube URL or has parameters
    if (name.includes('watch?v=') || name.includes('?') || name.includes('&')) {
      // Try to extract video ID from YouTube URL
      const videoIdMatch = name.match(/v=([^&]+)/);
      if (videoIdMatch) {
        return `YouTube: ${videoIdMatch[1]}`;
      }
      // For other URLs, just take the part before the first parameter
      return name.split('?')[0].split('/').pop() || name;
    }
    
    // For regular file names, remove extension if very long
    if (name.length > 30 && name.includes('.')) {
      const parts = name.split('.');
      const extension = parts.pop();
      const baseName = parts.join('.');
      return baseName.substring(0, 25) + '...' + extension;
    }
    
    return name;
  };

  // Use real data if available, otherwise show empty state
  const collectionName = currentCollection?.name || '';
  const mediaName = cleanMediaName(currentMedia?.name || (hasMedia ? '' : 'אין מדיה נטענת'));
  const mediaSize = currentMedia?.size || (hasMedia ? '' : '0 MB');
  
  // Format duration as HH:MM:SS - with safe handling
  const formatDuration = (seconds: number): string => {
    try {
      if (!seconds || seconds === 0 || isNaN(seconds) || !isFinite(seconds)) {
        return '00:00:00';
      }
      const hours = Math.floor(seconds / 3600) || 0;
      const minutes = Math.floor((seconds % 3600) / 60) || 0;
      const secs = Math.floor(seconds % 60) || 0;
      
      // Ensure values are valid numbers before converting to string
      const h = isNaN(hours) ? 0 : hours;
      const m = isNaN(minutes) ? 0 : minutes;
      const s = isNaN(secs) ? 0 : secs;
      
      // Use template literals without padStart to avoid potential issues
      const hStr = h < 10 ? '0' + h : '' + h;
      const mStr = m < 10 ? '0' + m : '' + m;
      const sStr = s < 10 ? '0' + s : '' + s;
      
      return hStr + ':' + mStr + ':' + sStr;
    } catch (error) {
      console.error('[formatDuration] Error:', error);
      return '00:00:00';
    }
  };
  
  const mediaDuration = formatDuration(actualMediaDuration);

  // Function to load complete project data (blocks, speakers, remarks)
  // Function to load complete transcription project data from backend
  // This loads the actual transcription content (blocks, speakers, remarks)
  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      console.log('[Page] Project loading removed - projectService deleted');
      const projectData = null; // Project loading removed
      
      if (false) { // Project loading removed
        // Set current project ID
        setCurrentProjectId(projectId);
        
        // Load blocks into TextEditor (will be handled via currentProjectId prop)
        // The TextEditor component will load the data when currentProjectId changes
        
        // Load speakers into SimpleSpeaker component
        if (projectData.speakers && speakerComponentRef.current) {
          speakerComponentRef.current.loadSpeakers(projectData.speakers);
        }
        
        // Load remarks - store them to pass to RemarksProvider
        if (projectData.remarks) {
          setProjectRemarks(projectData.remarks);
        }
        
        // Update the media information from metadata
        if (projectData.metadata && projectData.metadata.mediaFile) {
          // Find the transcription and update its media info
          console.log('[Page] Project has media file:', projectData.metadata.mediaFile);
        }
        
        // Log successful load
        console.log('[Page] Successfully loaded project:', {
          projectId,
          blocks: projectData.blocks?.length || 0,
          speakers: projectData.speakers?.length || 0,
          remarks: projectData.remarks?.length || 0,
          mediaFile: projectData.metadata?.mediaFile || 'none'
        });
      }
    } catch (error) {
      console.error('[Page] Error loading project data:', error);
    }
  }, [setCurrentProjectId, setProjectRemarks]);

  // Save session state to localStorage with user-specific key
  const saveSessionState = useCallback(() => {
    // Session saving is disabled - no data will be stored
    console.log('[Session] Session saving disabled - upload functionality will be redesigned');
    return;
  }, []);

  // Save session whenever media collections or indices change
  useEffect(() => {
    // Don't save while actively restoring to avoid overwriting
    if (!isRestoringSession && (mediaCollections.length > 0 || mediaProjectsMap.size > 0)) {
      saveSessionState();
    }
  }, [mediaCollections, currentCollectionIndex, currentMediaIndex, currentTranscriptionIndex, mediaProjectsMap, saveSessionState, isRestoringSession]);

  // Disable session restoration - clear any old session data on mount
  useEffect(() => {
    const clearOldSessionData = () => {
      try {
        const userId = getCurrentUserId();
        if (userId) {
          const sessionKey = 'transcriptionSessionState_' + userId;
          const oldSessionKey = 'transcriptionSessionState';
          
          // Clear all old session data
          localStorage.removeItem(sessionKey);
          localStorage.removeItem(oldSessionKey);
          console.log('[Session] Session restoration disabled - cleared all old session data');
        }
        
        // Mark that we're not restoring any session
        setIsRestoringSession(false);
      } catch (error) {
        console.error('[Session] Error clearing session data:', error);
        setIsRestoringSession(false);
      }
    };
    
    // Clear session data on mount
    if (typeof window !== 'undefined') {
      clearOldSessionData();
    }
  }, []); // Run only once on mount

  // Project loading disabled - start with default transcription immediately
  useEffect(() => {
    // Initialize with default transcription only
    if (typeof window !== 'undefined' && !isRestoringSession) {
      console.log('[Page] Project loading removed - starting with default transcription');
      const defaultTranscription = createDefaultTranscription();
      setTranscriptions([defaultTranscription]);
      setCurrentTranscriptionIndex(0);
      // Mark as not restoring to allow normal operation
      setIsRestoringSession(false);
    }
  }, []); // Run once on mount

  // Disable loading existing projects - upload functionality will be redesigned
  useEffect(() => {
    // Project loading is disabled - will be handled differently in the future
    console.log('[Page] Project loading disabled - upload functionality will be redesigned');
  }, []);
  
  // Removed - upload functionality will be redesigned
  const handleMediaUpload = (files: FileList) => { return; /*
    // Create media collection if none exists (frontend container for media files)
    // Note: This will trigger transcription project creation in the backend later
    if (mediaCollections.length === 0) {
      const newCollection: MediaCollection = {
        name: '',
        mediaItems: []
      };
      setMediaCollections([newCollection]);
      setCurrentCollectionIndex(0);
    }
    
    const newItems: MediaItem[] = Array.from(files)
      .filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/'))
      .map(file => ({
        type: 'file' as const,
        file,
        name: file.name,
        size: ((file.size / (1024 * 1024)).toFixed(1)) + ' MB'
      }));
    
    if (newItems.length > 0) {
      setMediaCollections(prev => {
        const updated = [...prev];
        if (updated[currentCollectionIndex]) {
          updated[currentCollectionIndex] = {
            ...updated[currentCollectionIndex],
            mediaItems: [...updated[currentCollectionIndex].mediaItems, ...newItems]
          };
        }
        return updated;
      });
      
      // If this is the first media in collection, set index to 0
      if (!currentCollection?.mediaItems.length) {
        setCurrentMediaIndex(0);
      }
    }
  */};
  
  // Removed - upload functionality will be redesigned
  const handleProjectUpload = (files: FileList) => { return; /*
    // Handle folder upload - creates a new media collection
    // Store files and show name modal
    setPendingProjectFiles(files);
    // Modal removed - functionality will be redesigned
  */};
  
  // Removed - upload functionality will be redesigned
  const handleProjectNameSubmit = (name: string | null) => { return; /*
    if (pendingProjectFiles) {
      // Get folder name from file path if no name provided
      const firstFile = pendingProjectFiles[0] as FileWithPath;
      const pathParts = firstFile.webkitRelativePath?.split('/') || [];
      const folderName = name || pathParts[0] || 'פרויקט ' + mediaCollections.length + 1;
      
      const mediaFiles = Array.from(pendingProjectFiles).filter(file => 
        file.type.startsWith('audio/') || file.type.startsWith('video/')
      );
      
      const newCollection: MediaCollection = {
        name: folderName,
        mediaItems: mediaFiles.map(file => ({
          type: 'file' as const,
          file,
          name: file.name,
          size: ((file.size / (1024 * 1024)).toFixed(1)) + ' MB'
        }))
      };
      
      setMediaCollections(prev => [...prev, newCollection]);
      setCurrentCollectionIndex(mediaCollections.length);
      setCurrentMediaIndex(0);
      setPendingProjectFiles(null);
    } else if (pendingProjectUrl) {
      // Handle URL project
      const collectionName = name || 'פרויקט ' + mediaCollections.length + 1;
      const urlParts = pendingProjectUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || pendingProjectUrl.substring(0, 50);
      
      const newCollection: MediaCollection = {
        name: collectionName,
        mediaItems: [{
          type: 'url',
          url: pendingProjectUrl,
          name: fileName,
          size: 'קישור חיצוני'
        }]
      };
      
      setMediaCollections(prev => [...prev, newCollection]);
      setCurrentCollectionIndex(mediaCollections.length);
      setCurrentMediaIndex(0);
      setPendingProjectUrl(null);
    }
    
    // Modal removed - functionality will be redesigned
  */};
  
  // Removed - upload functionality will be redesigned
  const handleRemoveMedia = () => { return; /*
    if (!currentCollection || !currentMedia) return;
    
    console.log('[Media] Removing media:', currentMedia.name);
    
    // Remove the media from the current collection
    setMediaCollections(prev => {
      const updated = [...prev];
      const collection = updated[currentCollectionIndex];
      if (collection) {
        // Remove the current media item
        collection.mediaItems = collection.mediaItems.filter((_, index) => index !== currentMediaIndex);
        
        // If this was the last media, remove the collection too
        if (collection.mediaItems.length === 0) {
          updated.splice(currentCollectionIndex, 1);
        }
      }
      return updated;
    });
    
    // Remove the media-project mapping
    const mediaName = currentMedia.name;
    setMediaProjectsMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(mediaName);
      console.log('[Media] Removed mapping for:', mediaName);
      return newMap;
    });
    
    // Clear current transcription project ID if no media left
    if (currentCollection.mediaItems.length <= 1) {
      setCurrentProjectId('');
      // Navigate to previous collection or media if available
      if (currentCollectionIndex > 0) {
        setCurrentCollectionIndex(currentCollectionIndex - 1);
      }
      setCurrentMediaIndex(0);
    } else {
      // Navigate to previous media if we removed the last one
      if (currentMediaIndex >= currentCollection.mediaItems.length - 1) {
        setCurrentMediaIndex(Math.max(0, currentMediaIndex - 1));
      }
    }
    
    console.log('[Media] Media removed successfully');
  */};
  
  // Removed - upload functionality will be redesigned
  const handleUrlSubmit = (url: string) => { return; /*
    const urlParts = url.split('/');
    const name = urlParts[urlParts.length - 1] || url.substring(0, 50);
    
    if (urlModalType === 'project') {
      // Store URL and show name modal
      setPendingProjectUrl(url);
      // Modal removed - functionality will be redesigned
    } else {
      // Add media to current project
      if (mediaCollections.length === 0) {
        const newCollection: MediaCollection = {
          name: '',
          mediaItems: []
        };
        setMediaCollections([newCollection]);
        setCurrentCollectionIndex(0);
      }
      
      const newItem: MediaItem = {
        type: 'url',
        url,
        name,
        size: 'קישור חיצוני'
      };
      
      setMediaCollections(prev => {
        const updated = [...prev];
        if (updated[currentCollectionIndex]) {
          updated[currentCollectionIndex] = {
            ...updated[currentCollectionIndex],
            mediaItems: [...updated[currentCollectionIndex].mediaItems, newItem]
          };
        }
        return updated;
      });
      
      if (!currentCollection?.mediaItems.length) {
        setCurrentMediaIndex(0);
      }
    }
  */};
  
  const handlePreviousProject = () => {
    if (currentCollectionIndex > 0) {
      setCurrentCollectionIndex(currentCollectionIndex - 1);
      setCurrentMediaIndex(0);
    }
  };
  
  const handleNextProject = () => {
    if (currentCollectionIndex < mediaCollections.length - 1) {
      setCurrentCollectionIndex(currentCollectionIndex + 1);
      setCurrentMediaIndex(0);
    }
  };
  
  const handlePreviousMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };
  
  const handleNextMedia = () => {
    if (currentCollection && currentMediaIndex < currentCollection.mediaItems.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };
  
  // Track if we're currently creating a project to prevent duplicates
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const creatingProjectsRef = useRef<Set<string>>(new Set()); // Track which media files are being processed
  
  // Function to get or create a transcription project for a media file
  const getOrCreateProject = useCallback(async (mediaName: string, collectionName: string = '') => {
    // Check if already processing this media
    if (creatingProjectsRef.current.has(mediaName)) {
      console.log('[Project] Already processing project for:', mediaName);
      return null;
    }
    
    // Check if this media already has an associated project
    const existingProjectId = mediaProjectsMap.get(mediaName);
    if (existingProjectId) {
      console.log('[Project] Found existing project for media:', mediaName, 'Project:', existingProjectId);
      return existingProjectId;
    }
    
    // Check backend for existing project with this media
    try {
      const existingProject = null; // Project lookup removed
      if (false) { // Project lookup removed
        console.log('[Project] Project lookup removed');
        // Update the map
        setMediaProjectsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(mediaName, existingProject);
          return newMap;
        });
        return existingProject;
      }
    } catch (error) {
      console.log('[Project] No existing project found in backend for media:', mediaName);
    }
    
    // Mark as processing
    creatingProjectsRef.current.add(mediaName);
    
    try {
      // Create new project
      console.log('[Project] Project creation removed - using local ID');
      const projectId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`; // Use local ID
      
      if (!projectId) {
        console.error('[Project] Failed to create project - no project ID returned');
        return null;
      }
      
      // Save the media-project mapping
      setMediaProjectsMap(prev => {
        const newMap = new Map(prev);
        newMap.set(mediaName, projectId);
        console.log('[Project] Created project and updated map:', mediaName, '->', projectId);
        return newMap;
      });
      
      // Update the collection with the project ID
      setMediaCollections(prev => {
        const updated = [...prev];
        const currentColl = updated[currentCollectionIndex];
        if (currentColl) {
          currentColl.transcriptionProjectId = projectId;
        }
        return updated;
      });
      
      return projectId;
    } catch (error) {
      console.error('[Project] Error creating project:', error);
      return null;
    } finally {
      // Remove from processing set
      creatingProjectsRef.current.delete(mediaName);
    }
  }, [mediaProjectsMap, currentCollectionIndex]);
  
  // Handle project creation/loading when media changes
  useEffect(() => {
    const handleMediaChange = async () => {
      if (!currentMedia || !currentMedia.name) {
        console.log('[Project] No media selected, clearing project ID');
        setCurrentProjectId('');
        return;
      }
      
      // Get or create project for any media type
      const projectId = await getOrCreateProject(currentMedia.name, collectionName);
      
      if (projectId) {
        setCurrentProjectId(projectId);
        // Load the project data
        await loadProjectData(projectId);
      } else {
        console.warn('[Project] Working without server persistence for:', currentMedia.name);
      }
    };
    
    handleMediaChange();
  }, [currentMedia, collectionName, getOrCreateProject, loadProjectData]); // Dependencies updated

  // Remove local lock change handlers - now handled by global store

  // Handler for opening management modal from sidebar
  const handleOpenManagementModal = useCallback((tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => {
    setManagementModalTab(tab);
    setShowManagementModal(true);
  }, []);

  // Handler for project deletion
  const handleProjectDelete = async (projectId: string, deleteTranscriptions: boolean) => {
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (!response.ok) {
        console.error('Delete project failed with status:', response.status);
        const errorText = await response.text().catch(() => 'Unknown error');
        alert(`שגיאה במחיקת הפרויקט: ${errorText}`);
        return;
      }
      
      // Get current state from the store
      const { currentProject, projects, loadProjects, setCurrentProject, setCurrentMediaById, clearCurrentTranscription } = useProjectStore.getState();
      
      // Clear IndexedDB cache for this project
      try {
        await indexedDBService.deleteProjectData(projectId);
        console.log('[Page] Cleared IndexedDB cache for project:', projectId);
      } catch (error) {
        console.error('[Page] Failed to clear IndexedDB cache:', error);
      }
      
      // Clear localStorage entries for this project
      clearMediaLocalStorage(projectId);
      
      // Check if the deleted project is the current one
      if (currentProject?.projectId === projectId) {
        // Clear current selection and transcription data
        setCurrentProject(null);
        clearCurrentTranscription();
        // Also clear the IDs that TextEditor uses
        await setCurrentMediaById('', '');
        
        // Reload projects
        await loadProjects();
        
        // Get updated projects after reload
        const updatedState = useProjectStore.getState();
        
        // Switch to the first available project
        if (updatedState.projects.length > 0) {
          const nextProject = updatedState.projects[0];
          setCurrentProject(nextProject);
          
          // Load first media of the new project
          if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
            await setCurrentMediaById(nextProject.projectId, nextProject.mediaFiles[0]);
          }
        } else {
          // No projects left - ensure everything is cleared
          clearCurrentTranscription();
          await setCurrentMediaById('', ''); // Clear IDs to prevent TextEditor from loading
          setActualMediaDuration(0); // Clear media duration
        }
      } else {
        // Just reload if it wasn't the current project
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project - network error:', error);
      alert('שגיאת רשת במחיקת הפרויקט. אנא ודא שהשרת פועל.');
    }
  };

  // Handler for media deletion
  const handleMediaDelete = async (projectId: string, mediaId: string, deleteTranscriptions: boolean) => {
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (!response.ok) {
        console.error('Delete media failed with status:', response.status);
        const errorText = await response.text().catch(() => 'Unknown error');
        alert(`שגיאה במחיקת המדיה: ${errorText}`);
        return;
      }
      
      const result = await response.json();
      
      // Get current state from the store
      const { currentProject, currentMediaId, projects, loadProjects, setCurrentProject, setCurrentMediaById, clearCurrentTranscription } = useProjectStore.getState();
      
      // Clear IndexedDB cache for this media
      try {
        await indexedDBService.deleteMediaData(projectId, mediaId);
        console.log('[Page] Cleared IndexedDB cache for media:', mediaId);
      } catch (error) {
        console.error('[Page] Failed to clear IndexedDB cache:', error);
      }
      
      // Clear localStorage entries for this media
      clearMediaLocalStorage(projectId, mediaId);
      
      // Check if entire project was deleted (happens when last media is deleted)
      if (result.projectDeleted) {
        // Also clear all project data from IndexedDB
        try {
          await indexedDBService.deleteProjectData(projectId);
          console.log('[Page] Cleared IndexedDB cache for entire project:', projectId);
        } catch (error) {
          console.error('[Page] Failed to clear IndexedDB project cache:', error);
        }
        // Clear current selection and transcription data
        setCurrentProject(null);
        clearCurrentTranscription();
        // Clear IDs to prevent TextEditor from loading cached data
        await setCurrentMediaById('', '');
        
        // Reload projects
        await loadProjects();
        
        // Get updated projects after reload
        const updatedState = useProjectStore.getState();
        
        // Switch to the first available project
        if (updatedState.projects.length > 0) {
          const nextProject = updatedState.projects[0];
          setCurrentProject(nextProject);
          
          // Load first media of the new project
          if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
            await setCurrentMediaById(nextProject.projectId, nextProject.mediaFiles[0]);
          }
        } else {
          // No projects left - ensure everything is cleared
          clearCurrentTranscription();
          await setCurrentMediaById('', ''); // Clear IDs to prevent TextEditor from loading
          setActualMediaDuration(0); // Clear media duration
        }
      } else if (currentProject?.projectId === projectId && currentMediaId === mediaId) {
        // Current media was deleted but project still exists
        clearCurrentTranscription();
        // Temporarily clear IDs to force TextEditor refresh
        await setCurrentMediaById('', '');
        await loadProjects();
        
        // Get updated project data
        const updatedState = useProjectStore.getState();
        const updatedProject = updatedState.projects.find(p => p.projectId === projectId);
        
        if (updatedProject && updatedProject.mediaFiles.length > 0) {
          // Switch to the first available media in the same project
          const nextMediaId = updatedProject.mediaFiles[0];
          await setCurrentMediaById(projectId, nextMediaId);
        } else {
          // No media left in this project (shouldn't happen due to backend changes)
          // Switch to first available project
          if (updatedState.projects.length > 0) {
            const nextProject = updatedState.projects[0];
            setCurrentProject(nextProject);
            
            if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
              await setCurrentMediaById(nextProject.projectId, nextProject.mediaFiles[0]);
            }
          } else {
            // No projects left at all
            setCurrentProject(null);
            clearCurrentTranscription();
            await setCurrentMediaById('', ''); // Clear IDs
            setActualMediaDuration(0); // Clear media duration
          }
        }
      } else {
        // Just reload if it wasn't the current media
        await loadProjects();
      }
      
    } catch (error) {
      console.error('Failed to delete media - network error:', error);
      alert('שגיאת רשת במחיקת המדיה. אנא ודא שהשרת פועל.');
    }
  };

  return (
    <HoveringBarsLayout
      headerContent={
        <HoveringHeader 
          userFullName={userFullName}
          permissions={userPermissions}
          onLogout={() => {
            // Clear only current user's session data
            if (currentUserId) {
              const sessionKey = 'transcriptionSessionState_' + currentUserId;
              localStorage.removeItem(sessionKey);
              console.log('[Session] Cleared session for user:', currentUserId);
            }
            router.push('/login');
          }}
          themeColor="teal"
        />
      }
      sidebarContent={
        <TranscriptionSidebar 
          onOpenManagementModal={handleOpenManagementModal}
          onProjectDelete={handleProjectDelete}
          onMediaDelete={handleMediaDelete}
        />
      }
      theme="transcription"
    >
      {/* Workspace Header */}
      <WorkspaceHeader 
        headerLocked={headerLocked}
        sidebarLocked={sidebarLocked}
        projectTitle={collectionName}
        progress={45}
      />
      

      {/* Main Content with max-width container */}
      <div className={'main-content ' + (
        headerLocked ? 'header-locked' : ''
      ) + ' ' + (
        sidebarLocked ? 'sidebar-locked' : ''
      )}>
        <div className="content-container">
          <RemarksProvider 
            transcriptionId={currentProjectId || sessionId}
            initialRemarks={projectRemarks}
          >
          <RemarksEventListener />
          <div className={`workspace-grid ${isThreeColumn ? 'three-column' : ''}`}>
          
          {/* Remarks Column (only in three-column layout) */}
          {isThreeColumn && (
            <div className="remarks-column">
              <Remarks theme="transcription" />
            </div>
          )}
          {/* Main Workspace */}
          <div className="main-workspace">
            
            {/* MediaPlayer Component - Now includes integrated navigation */}
            <div onClick={() => {
              // Clear block selection when clicking on media player
              const event = new CustomEvent('clearBlockSelection');
              document.dispatchEvent(event);
            }}>
            <MediaPlayer 
              key={`${currentProject?.projectId}-${currentMediaId}`}
              initialMedia={(() => {
                console.log('[MediaPlayer] Integration check:', {
                  hasCurrentProject: !!currentProject,
                  currentProjectId: currentProject?.projectId || 'none',
                  hasCurrentMediaId: !!currentMediaId,
                  currentMediaId: currentMediaId || 'none',
                  hasCurrentTranscriptionData: !!currentTranscriptionData,
                  hasMetadata: !!currentTranscriptionData?.metadata,
                  metadataFileName: currentTranscriptionData?.metadata?.fileName || 'none',
                  metadataOriginalName: currentTranscriptionData?.metadata?.originalName || 'none'
                });
                
                if (currentProject && currentMediaId) {
                // Construct media URL from project store data - use currentMediaId directly
                const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                  ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000')
                  : '';
                const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
                const mediaUrl = `${apiUrl}/api/projects/${currentProject.projectId}/media/${currentMediaId}?token=${encodeURIComponent(token)}`;
                
                console.log('Page: Creating media object from project store', {
                  url: mediaUrl,
                  mediaId: currentMediaId,
                  displayName: currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || currentMediaId
                });
                
                const mediaName = currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || currentMediaId;
                const isVideo = mediaName.match(/\.(mp4|webm|ogg|ogv)$/i);
                
                return {
                  url: mediaUrl,
                  name: mediaName,
                  type: isVideo ? 'video' : 'audio'
                };
              } else {
                console.log('[MediaPlayer] Cannot create media object - missing required data');
                return undefined;
              }
              })()}
              onTimeUpdate={(time) => {
                // TEMPORARILY DISABLED - this causes playback issues
                // TextEditor gets time updates via mediaTimeUpdate events instead
                // setCurrentTime(time);
              }}
              onTimestampCopy={(timestamp) => {
                // Handle timestamp copy for text editor
                console.log('Timestamp copied:', timestamp);
              }}
              onDurationChange={(duration) => {
                setActualMediaDuration(duration);
              }}
              currentProject={currentProject ? projects.indexOf(currentProject) + 1 : (projects.length > 0 ? 1 : 0)}
              totalProjects={projects.length}
              currentMedia={currentProject && currentMediaId ? currentProject.mediaFiles.indexOf(currentMediaId) + 1 : (currentProject?.mediaFiles.length > 0 ? 1 : 0)}
              totalMedia={currentProject?.mediaFiles.length || 0}
              mediaName={currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || 'אין מדיה'}
              mediaDuration={mediaDuration}
              mediaSize={currentTranscriptionData?.metadata.size ? `${(currentTranscriptionData.metadata.size / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
              projectName={currentProject?.displayName || 'אין פרויקט'}
              onPreviousProject={async () => {
                const currentIndex = currentProject ? projects.indexOf(currentProject) : -1;
                if (currentIndex > 0) {
                  // Trigger save before switching projects
                  console.log('[Page] Navigation: Previous project clicked');
                  const saveEvent = new CustomEvent('autoSaveBeforeNavigation', {
                    detail: { 
                      projectId: currentProject?.projectId, 
                      mediaId: currentMediaId,
                      reason: 'project-navigation-prev'
                    }
                  });
                  document.dispatchEvent(saveEvent);
                  // Wait for save to complete
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  const prevProject = projects[currentIndex - 1];
                  // Switch to previous project
                  console.log('Navigate to previous project:', prevProject.displayName);
                  await setCurrentProject(prevProject);
                  // Auto-select first media of the new project
                  if (prevProject.mediaFiles && prevProject.mediaFiles.length > 0) {
                    setCurrentMediaById(prevProject.projectId, prevProject.mediaFiles[0]);
                  }
                }
              }}
              onNextProject={async () => {
                const currentIndex = currentProject ? projects.indexOf(currentProject) : -1;
                if (currentIndex < projects.length - 1) {
                  // Trigger save before switching projects
                  console.log('[Page] Navigation: Next project clicked');
                  const saveEvent = new CustomEvent('autoSaveBeforeNavigation', {
                    detail: { 
                      projectId: currentProject?.projectId, 
                      mediaId: currentMediaId,
                      reason: 'project-navigation-next'
                    }
                  });
                  document.dispatchEvent(saveEvent);
                  // Wait for save to complete
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  const nextProject = projects[currentIndex + 1];
                  // Switch to next project
                  console.log('Navigate to next project:', nextProject.displayName);
                  await setCurrentProject(nextProject);
                  // Auto-select first media of the new project
                  if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
                    setCurrentMediaById(nextProject.projectId, nextProject.mediaFiles[0]);
                  }
                }
              }}
              onPreviousMedia={async () => {
                console.log('[Page] Navigation: Previous media clicked');
                // Directly trigger save before navigation
                const saveEvent = new CustomEvent('autoSaveBeforeNavigation', {
                  detail: { 
                    projectId: currentProject?.projectId, 
                    mediaId: currentMediaId,
                    reason: 'media-navigation-prev'
                  }
                });
                document.dispatchEvent(saveEvent);
                // Wait for save to complete
                await new Promise(resolve => setTimeout(resolve, 200));
                navigateMedia('previous');
              }}
              onNextMedia={async () => {
                console.log('[Page] Navigation: Next media clicked');
                // Directly trigger save before navigation
                const saveEvent = new CustomEvent('autoSaveBeforeNavigation', {
                  detail: { 
                    projectId: currentProject?.projectId, 
                    mediaId: currentMediaId,
                    reason: 'media-navigation-next'
                  }
                });
                document.dispatchEvent(saveEvent);
                // Wait for save to complete
                await new Promise(resolve => setTimeout(resolve, 200));
                navigateMedia('next');
              }}
            />
            </div>
            
            {/* TextEditor Component */}
            <div className="text-editor-wrapper">
              <TextEditor 
                currentProjectId={currentProject?.projectId || ''}
                currentMediaId={currentMediaId || ''}
                mediaPlayerRef={mediaPlayerRef}
                marks={[]}
                mediaName={currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || ''}
                currentTime={currentTime}
                mediaFileName={(() => {
                  // If there are transcriptions loaded, use the transcription's media name
                  if (transcriptions.length > 0 && currentTranscriptionIndex !== undefined && transcriptions[currentTranscriptionIndex]) {
                    const currentTranscription = transcriptions[currentTranscriptionIndex];
                    if (currentTranscription.mediaItems && currentTranscription.mediaItems[0]) {
                      return currentTranscription.mediaItems[0].name || '';
                    }
                  }
                  
                  // If we have a current media file loaded (new media, not from transcription)
                  // Only show if there are actual projects with media
                  if (hasCollections && currentMedia?.name) {
                    return currentMedia.name;
                  }
                  
                  // No media or transcription
                  return '';
                })()}
                mediaDuration={mediaDuration}
                projectName={collectionName}
                speakerComponentRef={speakerComponentRef}
                onSeek={(time) => {
                  console.log('Seek to time:', time);
                }}
                enabled={true}
                transcriptions={[]} // Pass empty array to force using project store save method
                currentTranscriptionIndex={0}
                onTranscriptionChange={async (index) => {
                  console.log('[Page] Transcription changed to index:', index);
                  setCurrentTranscriptionIndex(index);
                  
                  // Load the selected transcription's data
                  const selectedTranscription = transcriptions[index];
                  if (selectedTranscription?.projectId) {
                    console.log('[Page] Loading transcription:', selectedTranscription.name, selectedTranscription.projectId);
                    setCurrentProjectId(selectedTranscription.projectId);  // Ensure project ID is set
                    await loadProjectData(selectedTranscription.projectId);
                  } else {
                    // Clear project ID if no valid transcription
                    setCurrentProjectId('');
                  }
                  
                  // Session will be auto-saved by the useEffect
                }}
                onTranscriptionDelete={async (index) => {
                  console.log('[Page] Deleting transcription at index:', index);
                  const transcriptionToDelete = transcriptions[index];
                  console.log('[Page] Transcription to delete:', { name: transcriptionToDelete?.name, isDefault: transcriptionToDelete?.isDefault, projectId: transcriptionToDelete?.projectId });
                  console.log('[Page] All transcriptions before delete:', transcriptions.map(t => ({ name: t.name, isDefault: t.isDefault })));
                  
                  // Prevent deletion of default transcription
                  if (transcriptionToDelete?.isDefault || transcriptionToDelete?.name === 'אין תמלול') {
                    console.log('[Page] Cannot delete default transcription - blocking deletion');
                    return;
                  }
                  
                  // Call backend to delete the project folder
                  if (transcriptionToDelete?.projectId) {
                    try {
                      const token = localStorage.getItem('token');
                      console.log('[Page] Delete - Token found:', token ? 'Yes' : 'No', token ? token.substring(0, 20) + '...' : 'null');
                      
                      if (!token) {
                        console.error('No authentication token found in localStorage');
                        setAuthErrorMessage('אין אסימון הזדהות. אנא התחבר מחדש.');
                        setShowAuthErrorModal(true);
                        return;
                      }
                      
                      const response = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000') + '/api/transcription/projects/${transcriptionToDelete.projectId}', {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': 'Bearer ' + token
                        },
                        credentials: 'include'
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.text();
                        
                        // Only log as error if it's not a 404 (which is expected for already deleted projects)
                        if (response.status !== 404) {
                          console.error('Failed to delete project from backend:', response.status, errorData);
                        } else {
                          console.log('Project not found on backend (404), will remove from list');
                        }
                        
                        // If token is invalid, prompt user to log in again
                        if (response.status === 401) {
                          setAuthErrorMessage('פג תוקף ההתחברות. אנא התחבר מחדש.');
                          setShowAuthErrorModal(true);
                          return;
                        }
                        
                        // If project not found, it might already be deleted, so remove from list anyway
                        if (response.status === 404) {
                          console.log('Project already deleted, removing from list');
                        } else {
                          // For other errors, don't remove from list
                          setDeleteErrorMessage('שגיאה במחיקת הפרויקט. אנא נסה שוב.');
                          setShowDeleteErrorModal(true);
                          return;
                        }
                      } else {
                        console.log('Project folder deleted successfully');
                      }
                    } catch (error) {
                      console.error('Error deleting project:', error);
                      setDeleteErrorMessage('שגיאה במחיקת הפרויקט. אנא נסה שוב.');
                      setShowDeleteErrorModal(true);
                      return;
                    }
                  }
                  
                  // Only remove from list if deletion succeeded or project was already deleted (404)
                  const updatedTranscriptions = transcriptions.filter((_, i) => i !== index);
                  
                  // Ensure there's always at least one default transcription
                  const finalTranscriptions = updatedTranscriptions.length === 0 
                    ? [createDefaultTranscription()] 
                    : updatedTranscriptions;
                  
                  setTranscriptions(finalTranscriptions);
                  
                  // Handle navigation after deletion
                  if (finalTranscriptions.length > 0) {
                    // Calculate new index after deletion
                    let newIndex;
                    if (currentTranscriptionIndex >= finalTranscriptions.length) {
                      // If current index is now out of bounds, go to the last item
                      newIndex = finalTranscriptions.length - 1;
                    } else if (currentTranscriptionIndex > index) {
                      // If we deleted an item before the current index, adjust index down
                      newIndex = currentTranscriptionIndex - 1;
                    } else {
                      // Keep the same index (or go to 0 if we deleted the first item)
                      newIndex = Math.min(currentTranscriptionIndex, finalTranscriptions.length - 1);
                    }
                    
                    setCurrentTranscriptionIndex(newIndex);
                    const selectedTranscription = finalTranscriptions[newIndex];
                    if (selectedTranscription?.projectId) {
                      await loadProjectData(selectedTranscription.projectId);
                    } else {
                      // Clear if no project ID
                      setCurrentProjectId('');
                    }
                  } else {
                    // No more transcriptions, clear everything
                    setCurrentTranscriptionIndex(0);
                    setCurrentProjectId('');
                    // Clear the media collections too
                    setMediaCollections([]);
                    setCurrentCollectionIndex(0);
                    setCurrentMediaIndex(0);
                    // Clear saved session and mappings for current user
                    if (currentUserId) {
                      const sessionKey = 'transcriptionSessionState_' + currentUserId;
                      localStorage.removeItem(sessionKey);
                    }
                    setMediaProjectsMap(new Map());
                  }
                }}
                onBulkTranscriptionDelete={async (indices) => {
                  console.log('[Page] Bulk deleting transcriptions:', indices);
                  
                  // Delete each project from backend
                  const token = localStorage.getItem('token');
                  console.log('[Page] Bulk Delete - Token found:', token ? 'Yes' : 'No');
                  
                  if (!token) {
                    console.error('No authentication token found in localStorage');
                    setAuthErrorMessage('אין אסימון הזדהות. אנא התחבר מחדש.');
                    setShowAuthErrorModal(true);
                    return;
                  }
                  
                  for (const index of indices) {
                    const transcriptionToDelete = transcriptions[index];
                    if (transcriptionToDelete?.projectId) {
                      try {
                        const response = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000') + '/api/transcription/projects/${transcriptionToDelete.projectId}', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                          },
                          credentials: 'include'
                        });
                        
                        if (!response.ok) {
                          console.error('Failed to delete project ' + transcriptionToDelete.projectId);
                        }
                      } catch (error) {
                        console.error('Error deleting project:', error);
                      }
                    }
                  }
                  
                  const updatedTranscriptions = transcriptions.filter((_, i) => !indices.includes(i));
                  setTranscriptions(updatedTranscriptions);
                  
                  // Reset to first transcription if any remain
                  if (updatedTranscriptions.length > 0) {
                    setCurrentTranscriptionIndex(0);
                    const selectedTranscription = updatedTranscriptions[0];
                    if (selectedTranscription?.projectId) {
                      await loadProjectData(selectedTranscription.projectId);
                    } else {
                      // Clear if no project ID
                      setCurrentProjectId('');
                    }
                  } else {
                    // No more transcriptions, clear everything
                    setCurrentTranscriptionIndex(0);
                    setCurrentProjectId('');
                    // Clear the media collections too
                    setMediaCollections([]);
                    setCurrentCollectionIndex(0);
                    setCurrentMediaIndex(0);
                    // Clear saved session and mappings for current user
                    if (currentUserId) {
                      const sessionKey = 'transcriptionSessionState_' + currentUserId;
                      localStorage.removeItem(sessionKey);
                    }
                    setMediaProjectsMap(new Map());
                  }
                }}
              />
            </div>

          </div>

          {/* Side Workspace */}
          <div className="side-workspace">
            {/* Speaker Component */}
            <div className={'speaker-container ' + (
              helperFilesExpanded ? 'compressed' : 'normal'
            )}>
              <SimpleSpeaker 
                ref={speakerComponentRef}
                theme="transcription" 
                mediaId={currentProject?.projectId || ''}
                transcriptionNumber={1}
                onSpeakersChange={(speakers) => {
                  // Optional: handle speaker changes if needed
                  console.log('Speakers changed:', speakers);
                  // Mark changes for auto-backup
                  const backupService = require('@/services/backupService').default;
                  backupService.markChanges();
                }}
              />
            </div>

            {/* Remarks Component (only in two-column layout) */}
            {!isThreeColumn && (
              <div className={'remarks-container ' + (
                helperFilesExpanded ? 'compressed' : 'normal'
              )}>
                <Remarks theme="transcription" />
              </div>
            )}

            {/* HelperFiles Component */}
            <div className={'helper-files ' + (
              helperFilesExpanded ? 'expanded' : 'collapsed'
            )}>
              <HelperFiles 
                isExpanded={helperFilesExpanded}
                onToggle={() => setHelperFilesExpanded(!helperFilesExpanded)}
                projects={mediaCollections.map((coll, idx) => ({
                  id: 'proj-' + idx,
                  name: coll.name,
                  mediaItems: coll.mediaItems.map((media, mIdx) => ({
                    id: 'media-' + idx + '-' + mIdx,
                    name: media.name
                  }))
                }))}
              />
            </div>
          </div>
        </div>
        </RemarksProvider>
        </div>
      </div>
      
      
      {/* Authentication Error Modal */}
      <ConfirmationModal
        isOpen={showAuthErrorModal}
        onClose={() => setShowAuthErrorModal(false)}
        onConfirm={() => {
          // Clear invalid tokens and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }}
        title="נדרשת התחברות מחדש"
        message={authErrorMessage}
        confirmText="התחבר מחדש"
        cancelText="ביטול"
        type="success"
        showIcon={false}
      />
      
      {/* Delete Error Modal */}
      <ConfirmationModal
        isOpen={showDeleteErrorModal}
        onClose={() => setShowDeleteErrorModal(false)}
        onConfirm={() => setShowDeleteErrorModal(false)}
        title="שגיאה במחיקה"
        message={deleteErrorMessage}
        confirmText="אישור"
        cancelText=""
        type="success"
        showIcon={false}
      />
      
      {/* Authentication Required Modal */}
      <LoginPromptModal
        isOpen={showAuthRequiredModal}
        onClose={() => setShowAuthRequiredModal(false)}
        message="פג תוקף ההתחברות שלך. אנא התחבר מחדש כדי להמשיך."
        system="transcription"
        themeColor="teal"
      />

      {/* Project Management Modal - Rendered at page level for proper overlay */}
      <ProjectManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        activeTab={managementModalTab}
        projects={projects}
        onProjectDelete={handleProjectDelete}
        onMediaDelete={handleMediaDelete}
      />
    </HoveringBarsLayout>
  );
}