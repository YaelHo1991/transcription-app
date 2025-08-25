'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
import HoveringHeader from '../components/HoveringHeader';
import TranscriptionSidebar from './components/TranscriptionSidebar/TranscriptionSidebar';
import WorkspaceHeader from './components/WorkspaceHeader/WorkspaceHeader';
import ProjectNavigator from './components/ProjectNavigator/ProjectNavigator';
import UrlModal from './components/UrlModal/UrlModal';
import UploadOptionsModal from './components/UploadOptionsModal/UploadOptionsModal';
import ProjectNameModal from './components/ProjectNameModal/ProjectNameModal';
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
import { projectService } from '../../../services/projectService';
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

export default function TranscriptionWorkPage() {
  // Main transcription page component
  const router = useRouter();
  
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
    
    // Set up authentication error callback
    projectService.setAuthErrorCallback(() => {
      setShowAuthRequiredModal(true);
    });
  }, []);
  
  // Store project remarks to pass to RemarksProvider
  const [projectRemarks, setProjectRemarks] = useState<any[]>([]);
  
  // Create a unique session ID for this transcription session
  const [sessionId] = useState<string>('session-default');
  
  const [helperFilesExpanded, setHelperFilesExpanded] = useState(false);
  const [headerLocked, setHeaderLocked] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState<'project' | 'media' | null>(null);
  const [urlModalType, setUrlModalType] = useState<'project' | 'media'>('media');
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [pendingProjectFiles, setPendingProjectFiles] = useState<FileList | null>(null);
  const [pendingProjectUrl, setPendingProjectUrl] = useState<string | null>(null);
  
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFolderRef = useRef<HTMLInputElement>(null);
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
  
  // Use real data if available, otherwise show empty state
  const collectionName = currentCollection?.name || '';
  const mediaName = currentMedia?.name || (hasMedia ? '' : 'אין מדיה נטענת');
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
      console.log('[Page] Loading project data for:', projectId);
      const projectData = await projectService.loadProject(projectId);
      
      if (projectData) {
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
    // Save even if we have media collections without backend IDs (local files)
    if (mediaCollections.length === 0 && mediaProjectsMap.size === 0) return;
    if (!currentUserId) {
      console.warn('[Session] Cannot save session without user ID');
      return;
    }
    
    try {
      const sessionData = {
        userId: currentUserId, // Add user ID to session data
        mediaCollections: mediaCollections.map(c => ({
          name: c.name,
          transcriptionProjectId: c.transcriptionProjectId,
          mediaItems: c.mediaItems.map(m => ({
            type: m.type,
            name: m.name,
            size: m.size,
            url: m.url, // Save URL for URL-based media
            // Note: We can't save File objects directly, will need to re-select files
          }))
        })),
        mediaProjectsMap: Object.fromEntries(mediaProjectsMap), // Convert Map to object for JSON
        currentCollectionIndex,
        currentMediaIndex,
        currentTranscriptionIndex,  // Save current transcription index
        currentProjectId: currentCollection?.transcriptionProjectId || currentProjectId,  // Save current transcription project ID
        timestamp: Date.now()
      };
      
      // Use user-specific session key
      const sessionKey = 'transcriptionSessionState_' + currentUserId;
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('[Session] Saved session state for user', currentUserId, 'with', mediaCollections.length, 'media collections');
    } catch (error) {
      console.error('[Session] Failed to save session state:', error);
    }
  }, [mediaCollections, currentCollectionIndex, currentMediaIndex, currentTranscriptionIndex, currentCollection, currentProjectId, mediaProjectsMap, currentUserId]);

  // Save session whenever media collections or indices change
  useEffect(() => {
    // Don't save while actively restoring to avoid overwriting
    if (!isRestoringSession && (mediaCollections.length > 0 || mediaProjectsMap.size > 0)) {
      saveSessionState();
    }
  }, [mediaCollections, currentCollectionIndex, currentMediaIndex, currentTranscriptionIndex, mediaProjectsMap, saveSessionState, isRestoringSession]);

  // Restore session state on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          console.log('[Session] No user ID available, skipping session restore');
          return;
        }
        
        // Use user-specific session key
        const sessionKey = 'transcriptionSessionState_' + userId;
        const savedSession = localStorage.getItem(sessionKey);
        
        // Also clean up any old non-user-specific session
        const oldSession = localStorage.getItem('transcriptionSessionState');
        if (oldSession) {
          console.log('[Session] Removing old non-user-specific session');
          localStorage.removeItem('transcriptionSessionState');
        }
        
        if (!savedSession) return;
        
        const sessionData = JSON.parse(savedSession);
        
        // Validate session belongs to current user
        if (sessionData.userId && sessionData.userId !== userId) {
          console.warn('[Session] Session user ID mismatch, ignoring saved state');
          localStorage.removeItem(sessionKey);
          return;
        }
        
        // Check if session is not too old (24 hours)
        if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(sessionKey);
          return;
        }
        
        setIsRestoringSession(true);
        
        // Restore media-project mappings if available
        if (sessionData.mediaProjectsMap) {
          const restoredMap = new Map(Object.entries(sessionData.mediaProjectsMap));
          setMediaProjectsMap(restoredMap);
          console.log('[Session] Restored media-project mappings:', restoredMap.size, 'entries');
        }
        
        // Only restore backend-linked media collections (with transcriptionProjectId)
        // File-based media cannot be restored due to browser security restrictions
        const restoredCollections: MediaCollection[] = [];
        
        // Handle both old format (projects) and new format (mediaCollections)
        const savedCollections = sessionData.mediaCollections || sessionData.projects || [];
        
        for (const savedCollection of savedCollections) {
          const projectId = savedCollection.transcriptionProjectId || savedCollection.projectId;
          if (projectId) {
            // This is a backend-linked collection, we can fully restore it
            restoredCollections.push({
              name: savedCollection.name,
              transcriptionProjectId: projectId,
              mediaItems: savedCollection.mediaItems
            });
          }
          // Skip file-based media as they can't be properly restored
        }
        
        if (restoredCollections.length > 0) {
          console.log('[Session] Restored', restoredCollections.length, 'media collections from saved session');
          setMediaCollections(restoredCollections);
          const collectionIndex = sessionData.currentCollectionIndex ?? sessionData.currentProjectIndex ?? 0;
          setCurrentCollectionIndex(Math.min(collectionIndex, restoredCollections.length - 1));
          setCurrentMediaIndex(sessionData.currentMediaIndex || 0);
          
          // Restore transcription index
          if (sessionData.currentTranscriptionIndex !== undefined) {
            setCurrentTranscriptionIndex(sessionData.currentTranscriptionIndex);
            console.log('[Session] Restored transcription index:', sessionData.currentTranscriptionIndex);
          }
          
          // Load project data if we have a saved project ID
          // This will load transcription blocks, speakers, and remarks from the server
          if (sessionData.currentProjectId) {
            console.log('[Session] Loading project data for:', sessionData.currentProjectId);
            await loadProjectData(sessionData.currentProjectId);
          } else {
            // Fallback: Load transcription project data if it's a backend-linked collection
            const collectionIndex = sessionData.currentCollectionIndex ?? sessionData.currentProjectIndex ?? 0;
            const currentColl = restoredCollections[Math.min(collectionIndex, restoredCollections.length - 1)];
            if (currentColl?.transcriptionProjectId) {
              console.log('[Session] Loading transcription project data for current collection:', currentColl.transcriptionProjectId);
              await loadProjectData(currentColl.transcriptionProjectId);
            }
          }
        } else {
          // Show a message that files need to be re-loaded
          console.log('[Session] No restorable projects found (file-based projects need to be re-loaded)');
        }
        
        setIsRestoringSession(false);
      } catch (error) {
        console.error('[Session] Failed to restore session:', error);
        setIsRestoringSession(false);
      }
    };
    
    // Restore session on mount
    if (typeof window !== 'undefined') {
      restoreSession();
    }
  }, []); // Run only once on mount

  // Load saved transcriptions from backend
  useEffect(() => {
    // Only run on client side after a delay
    if (typeof window !== 'undefined' && !isRestoringSession) {
      const timer = setTimeout(async () => {
        try {
          console.log('[Page] Loading saved transcriptions from backend...');
          const transcriptionsList = await projectService.listProjects();
          
          const transformedTranscriptions = transcriptionsList && transcriptionsList.length > 0
            ? transcriptionsList.map(proj => ({
                name: proj.projectName || 'תמלול ללא שם',
                mediaItems: [{
                  type: 'file' as const,
                  name: proj.mediaFile || 'מדיה לא ידועה',
                  size: '0 MB'
                }],
                projectId: proj.projectId,
                isDefault: false
              }))
            : [];
          
          // Remove any existing corrupted default transcriptions and add a fresh one
          const cleanTranscriptions = transformedTranscriptions.filter(t => !t.isDefault);
          const freshDefault = createDefaultTranscription();
          const allTranscriptions = [...cleanTranscriptions, freshDefault];
          
          console.log('[Page] Successfully loaded ' + transformedTranscriptions.length + ' transcriptions + 1 default');
          console.log('[Page] All transcriptions:', allTranscriptions.map(t => ({ name: t.name, isDefault: t.isDefault, projectId: t.projectId })));
          setTranscriptions(allTranscriptions);
          
          if (allTranscriptions.length > 0) {
            // Only set default index if we don't already have a restored index from session
            const userId = getCurrentUserId();
            let hasRestoredIndex = false;
            
            if (userId) {
              const sessionKey = 'transcriptionSessionState_' + userId;
              const savedSession = localStorage.getItem(sessionKey);
              hasRestoredIndex = savedSession && JSON.parse(savedSession).currentTranscriptionIndex !== undefined;
            }
            
            if (!hasRestoredIndex) {
              // Find the first non-default transcription, or fall back to 0
              const firstNonDefaultIndex = allTranscriptions.findIndex(t => !t.isDefault);
              const targetIndex = firstNonDefaultIndex >= 0 ? firstNonDefaultIndex : 0;
              
              console.log('[Page] Setting current transcription index to:', targetIndex, 'for transcription:', allTranscriptions[targetIndex]?.name);
              setCurrentTranscriptionIndex(targetIndex);
            } else {
              console.log('[Page] Keeping restored transcription index:', currentTranscriptionIndex);
            }
          }
        } catch (error) {
          console.error('[Page] Error loading transcriptions:', error);
        }
      }, 3000); // 3 second delay to ensure page is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, [isRestoringSession]);

  // Load existing projects on mount (if no session was restored)
  useEffect(() => {
    const loadExistingProjects = async () => {
      try {
        // If we already have collections, don't load from backend
        if (mediaCollections.length > 0) {
          console.log('[Page] Already have', mediaCollections.length, 'collections, skipping backend load');
          return;
        }
        
        // Double-check session wasn't just restored
        const userId = getCurrentUserId();
        if (userId) {
          const sessionKey = 'transcriptionSessionState_' + userId;
          const savedSession = localStorage.getItem(sessionKey);
          if (savedSession) {
            const sessionData = JSON.parse(savedSession);
            const collections = sessionData.mediaCollections || sessionData.projects;
            if (collections && collections.length > 0) {
              console.log('[Page] Session has collections, skipping backend load to avoid duplicates');
              return;
            }
          }
        }
        
        console.log('[Page] No existing collections found, loading from backend...');
        const projectsList = await projectService.listProjects();
        
        if (projectsList && projectsList.length > 0) {
          // Transform backend transcription projects to media collections
          const transformedCollections: MediaCollection[] = projectsList.map(proj => {
            try {
              return {
                name: proj.projectName || 'פרויקט ללא שם',
                mediaItems: [{
                  type: 'file' as const,
                  name: proj.mediaFile || 'מדיה לא ידועה',
                  size: '0 MB' // Size not stored in backend
                }],
                transcriptionProjectId: proj.projectId
              };
            } catch (err) {
              console.error('[Page] Error transforming transcription project:', proj, err);
              return null;
            }
          }).filter(Boolean) as MediaCollection[];
          
          console.log('[Page] Loaded', transformedCollections.length, 'transcription projects as media collections');
          setMediaCollections(transformedCollections);
          
          // If we have collections, set the first one as current
          if (transformedCollections.length > 0) {
            setCurrentCollectionIndex(0);
            setCurrentMediaIndex(0);
            // Load the first transcription project's data
            if (transformedCollections[0].transcriptionProjectId) {
              await loadProjectData(transformedCollections[0].transcriptionProjectId);
            }
          }
        }
      } catch (error) {
        console.error('[Page] Error loading projects:', error);
      }
    };
    
    // Only run on client side after session restoration completes
    if (typeof window !== 'undefined' && !isRestoringSession) {
      // Longer delay to ensure session is fully restored
      const timer = setTimeout(() => {
        loadExistingProjects();
      }, 1000); // Increased delay to avoid race conditions
      
      return () => clearTimeout(timer);
    }
  }, [isRestoringSession, mediaCollections.length, loadProjectData]); // Also depend on collections length
  
  const handleMediaUpload = (files: FileList) => {
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
  };
  
  const handleProjectUpload = (files: FileList) => {
    // Handle folder upload - creates a new media collection
    // Store files and show name modal
    setPendingProjectFiles(files);
    setShowProjectNameModal(true);
  };
  
  const handleProjectNameSubmit = (name: string | null) => {
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
    
    setShowProjectNameModal(false);
  };
  
  const handleAddMedia = () => {
    // Show options modal for media
    setShowUploadOptions('media');
  };
  
  const handleAddProject = () => {
    // Show options modal for project
    setShowUploadOptions('project');
  };

  const handleRemoveMedia = () => {
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
  };
  
  const handleUrlSubmit = (url: string) => {
    const urlParts = url.split('/');
    const name = urlParts[urlParts.length - 1] || url.substring(0, 50);
    
    if (urlModalType === 'project') {
      // Store URL and show name modal
      setPendingProjectUrl(url);
      setShowProjectNameModal(true);
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
  };
  
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
      const existingProject = await projectService.getProjectByMedia(mediaName);
      if (existingProject) {
        console.log('[Project] Found existing project in backend for media:', mediaName);
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
      console.log('[Project] Creating new project for media:', mediaName);
      const projectId = await projectService.createProject(mediaName, collectionName || 'פרויקט חדש');
      
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

  // Memoize callbacks to prevent unnecessary re-renders
  const handleHeaderLockChange = useCallback((locked: boolean) => {
    setHeaderLocked(locked);
  }, []);

  const handleSidebarLockChange = useCallback((locked: boolean) => {
    setSidebarLocked(locked);
  }, []);

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
          themeColor="pink"
        />
      }
      sidebarContent={<TranscriptionSidebar />}
      theme="transcription"
      onHeaderLockChange={handleHeaderLockChange}
      onSidebarLockChange={handleSidebarLockChange}
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
          <div className="workspace-grid">
          {/* Main Workspace */}
          <div className="main-workspace">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
            />
            <input
              ref={projectFolderRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              webkitdirectory=""
              directory=""
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleProjectUpload(e.target.files)}
            />
            
            {/* Project Navigator */}
            <ProjectNavigator 
              currentProject={hasCollections ? currentCollectionIndex + 1 : 0}
              totalProjects={mediaCollections.length}
              currentMedia={hasMedia ? currentMediaIndex + 1 : 0}
              totalMedia={currentCollection?.mediaItems.length || 0}
              mediaName={mediaName}
              mediaDuration={mediaDuration}
              mediaSize={mediaSize}
              onPreviousProject={handlePreviousProject}
              onNextProject={handleNextProject}
              onPreviousMedia={handlePreviousMedia}
              onNextMedia={handleNextMedia}
              onAddProject={handleAddProject}
              onAddMedia={handleAddMedia}
              onRemoveMedia={handleRemoveMedia}
              onProjectDrop={handleProjectUpload}
              onMediaDrop={handleMediaUpload}
            />

            {/* MediaPlayer Component */}
            <div onClick={() => {
              // Clear block selection when clicking on media player
              const event = new CustomEvent('clearBlockSelection');
              document.dispatchEvent(event);
            }}>
            <MediaPlayer 
              initialMedia={currentMedia ? (() => {
                // Check if we have a file or URL
                let mediaUrl = '';
                if (currentMedia.type === 'url' && currentMedia.url) {
                  mediaUrl = currentMedia.url;
                } else if (currentMedia.file) {
                  mediaUrl = URL.createObjectURL(currentMedia.file);
                } else if (currentMedia.name && currentCollection?.transcriptionProjectId) {
                  // For backend-loaded transcription projects, construct the media URL
                  // The media file is stored in the transcription project folder on the server
                  const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                    ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000')
                    : '';
                  mediaUrl = apiUrl + '/api/projects/${currentCollection.transcriptionProjectId}/media/${encodeURIComponent(currentMedia.name)}';
                  console.log('Page: Constructed media URL for backend project:', mediaUrl);
                }
                
                // Only return media if we have a valid URL
                if (mediaUrl) {
                  console.log('Page: Creating media object', {
                    url: mediaUrl,
                    name: currentMedia.name,
                    type: currentMedia.name.match(/\.(mp4|webm|ogg|ogv)$/i) ? 'video' : 'audio'
                  });
                  return {
                    url: mediaUrl,
                    name: currentMedia.name,
                    type: currentMedia.name.match(/\.(mp4|webm|ogg|ogv)$/i) ? 'video' : 'audio'
                  };
                }
                
                // No valid media source, return undefined
                console.log('Page: No media file or URL available for:', currentMedia.name);
                return undefined;
              })() : undefined}
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
            />
            </div>
            
            {/* TextEditor Component */}
            <div className="text-editor-wrapper">
              <TextEditor 
                currentProjectId={currentProjectId}
                mediaPlayerRef={mediaPlayerRef}
                marks={[]}
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
                transcriptions={transcriptions}
                currentTranscriptionIndex={currentTranscriptionIndex}
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
                mediaId={currentProjectId}
                transcriptionNumber={1}
                onSpeakersChange={(speakers) => {
                  // Optional: handle speaker changes if needed
                  console.log('Speakers changed:', speakers);
                }}
              />
            </div>

            {/* Remarks Component */}
            <div className={'remarks-container ' + (
              helperFilesExpanded ? 'compressed' : 'normal'
            )}>
              <Remarks theme="transcription" />
            </div>

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
      
      {/* Upload Options Modal */}
      <UploadOptionsModal
        isOpen={!!showUploadOptions}
        onClose={() => setShowUploadOptions(null)}
        type={showUploadOptions || 'media'}
        onFileUpload={() => {
          if (showUploadOptions === 'project') {
            projectFolderRef.current?.click();
          } else {
            fileInputRef.current?.click();
          }
        }}
        onLinkUpload={() => {
          setUrlModalType(showUploadOptions || 'media');
          setShowUrlModal(true);
        }}
      />
      
      {/* URL Modal */}
      <UrlModal
        isOpen={showUrlModal}
        onClose={() => setShowUrlModal(false)}
        onSubmit={handleUrlSubmit}
        title={urlModalType === 'project' ? 'הכנס קישור לפרויקט' : 'הכנס קישור למדיה'}
      />
      
      {/* Project Name Modal */}
      <ProjectNameModal
        isOpen={showProjectNameModal}
        onClose={() => {
          setShowProjectNameModal(false);
          setPendingProjectFiles(null);
          setPendingProjectUrl(null);
        }}
        onSubmit={handleProjectNameSubmit}
        defaultName={(pendingProjectFiles?.[0] as FileWithPath)?.webkitRelativePath?.split('/')[0] || ''}
        showWarning={!!pendingProjectFiles}
      />
      
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
      />
    </HoveringBarsLayout>
  );
}