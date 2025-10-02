'use client';

import { useState, useRef, useCallback, useEffect, useMemo, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, buildApiUrl } from '@/utils/api';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import dynamic from 'next/dynamic';

import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
import HoveringHeader from '../components/HoveringHeader';
import TranscriptionSidebar from './components/TranscriptionSidebar/TranscriptionSidebar';
import ProjectManagementModal from './components/ProjectManagementModal/ProjectManagementModal';
import WorkspaceHeader from './components/WorkspaceHeader/WorkspaceHeader';
import HelperFiles from './components/HelperFiles/HelperFiles';
import Remarks from './components/Remarks/Remarks';
import { RemarksProvider } from './components/Remarks/RemarksContext';
import RemarksEventListener from './components/Remarks/RemarksEventListener';
import { ConfirmationModal } from './components/TextEditor/components/ConfirmationModal';
import { AuthRequiredModal } from '../../../components/AuthRequiredModal';
import LoginPromptModal from '../../../components/LoginPromptModal';
import { SimpleSpeakerHandle } from './components/Speaker/SimpleSpeaker';
import DraggablePanel from '../../../components/DraggablePanel';
import usePanelManager from '../../../hooks/usePanelManager';
import FullscreenWorkspace from '../../../components/FullscreenWorkspace';
import MinimalMediaControls from '../../../components/MinimalMediaControls';
import VideoCube from './components/MediaPlayer/VideoCube';

// Lazy load heavy components with loading skeletons
const TextEditor = dynamic(
  () => import('./components/TextEditor'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">טוען עורך טקסט...</div>
      </div>
    ),
    ssr: false
  }
);

// Create a forwardRef wrapper for the dynamic MediaPlayer
const MediaPlayerComponent = dynamic(
  () => import('./components/MediaPlayer'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">טוען נגן מדיה...</div>
      </div>
    ),
    ssr: false
  }
);

// Wrap the dynamic component with forwardRef
const MediaPlayer = forwardRef<any, any>((props, ref) => {
  return <MediaPlayerComponent {...props} ref={ref} />;
});

MediaPlayer.displayName = 'MediaPlayerWrapper';

const SimpleSpeaker = dynamic(
  () => import('./components/Speaker/SimpleSpeaker'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">טוען פאנל דוברים...</div>
      </div>
    ),
    ssr: false
  }
) as React.ComponentType<{
  ref?: React.RefObject<SimpleSpeakerHandle>;
  onSpeakersChange?: (speakers: any[]) => void;
  onActiveFieldChange?: (field: 'code' | 'name' | 'description' | null) => void;
  onRequestFocus?: () => void;
  currentProjectId: string | null;
  currentMediaId: string | null;
}>;
import useProjectStore from '@/lib/stores/projectStore';
import useHoveringBarsStore from '@/lib/stores/hoveringBarsStore';
import indexedDBService from '@/services/indexedDBService';
import progressService from '@/services/progressService';
import { tSessionService } from '@/services/tSessionService';
import './transcription-theme.css';
import './transcription-page.css';
import './transcription-fullscreen.css';
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

// Combined upload button component with dropdown menu
const CombinedUploadButton = ({ sidebarRef }: { sidebarRef: React.RefObject<any> }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleOptionClick = (action: 'media' | 'folder' | 'url') => {
    console.log('[CombinedUploadButton] handleOptionClick:', action);
    console.log('[CombinedUploadButton] sidebarRef.current:', sidebarRef.current);
    setIsDropdownOpen(false);

    switch (action) {
      case 'media':
        console.log('[CombinedUploadButton] Calling handleSingleMediaClick');
        if (sidebarRef.current?.handleSingleMediaClick) {
          sidebarRef.current.handleSingleMediaClick();
        } else {
          console.error('[CombinedUploadButton] handleSingleMediaClick not found on sidebarRef');
        }
        break;
      case 'folder':
        console.log('[CombinedUploadButton] Calling handleFolderUpload');
        if (sidebarRef.current?.handleFolderUpload) {
          sidebarRef.current.handleFolderUpload();
        } else {
          console.error('[CombinedUploadButton] handleFolderUpload not found on sidebarRef');
        }
        break;
      case 'url':
        console.log('[CombinedUploadButton] Calling handleUrlDownload');
        if (sidebarRef.current?.handleUrlDownload) {
          sidebarRef.current.handleUrlDownload();
        } else {
          console.error('[CombinedUploadButton] handleUrlDownload not found on sidebarRef');
        }
        break;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="sidebar-header-action-btn"
        title="פעולות העלאה"
        style={{
          width: '32px',
          height: '32px',
          padding: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1"/>
          <circle cx="12" cy="5" r="1"/>
          <circle cx="12" cy="19" r="1"/>
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            background: 'rgba(20, 30, 40, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '150px',
            zIndex: 3000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            onClick={() => handleOptionClick('media')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            העלה מדיה
          </button>

          <button
            onClick={() => handleOptionClick('folder')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            הוסף תיקיית פרויקט
          </button>

          <button
            onClick={() => handleOptionClick('url')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            הורד מ-URL
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to get current user ID from token or localStorage
const getCurrentUserId = (): string | null => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return null;
  }
  
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
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return;
  }
  
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
  const sidebarRef = useRef<any>(null);

  // Project store for new project management
  const {
    projects = [],
    currentProject,
    currentMediaId,
    currentTranscriptionData,
    navigateMedia,
    setCurrentProject,
    setCurrentMediaById,
    loadProjects,
    restorePersistedState
  } = useProjectStore();
  
  // Log when projects change
  useEffect(() => {
    console.log('[TranscriptionPage] Projects updated:', projects ? projects.length : 0, 'projects');
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
  
  // Track if we've attempted to restore persisted state
  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Load projects on mount
  useEffect(() => {
    console.log('[TranscriptionPage] Loading projects on mount');
    const timer = setTimeout(() => {
      loadProjects();
    }, 100);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore persisted state or auto-select first project
  useEffect(() => {
    if (projects && projects.length > 0 && !hasRestoredState) {
      console.log('[TranscriptionPage] Projects loaded, attempting to restore persisted state');

      // Mark that we've attempted restoration to prevent repeated attempts
      setHasRestoredState(true);

      // First try to restore persisted state
      restorePersistedState().then(() => {
        // After restoration attempt, check if we have a current project
        const store = useProjectStore.getState();

        // If no project was restored, auto-select the first one
        if (!store.currentProject) {
          console.log('[TranscriptionPage] No persisted state found, auto-selecting first project:', projects[0].projectId);
          setCurrentProject(projects[0]);
          if (projects[0].mediaFiles && projects[0].mediaFiles.length > 0) {
            const firstMediaItem = projects[0].mediaFiles[0];
            const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
            setCurrentMediaById(projects[0].projectId, firstMediaId);
          }
        } else {
          console.log('[TranscriptionPage] Restored persisted state - project:', store.currentProject.projectId, 'media:', store.currentMediaId);
        }
      });
    }
  }, [projects, hasRestoredState, setCurrentProject, setCurrentMediaById, restorePersistedState]);

  // Store project remarks to pass to RemarksProvider
  const [projectRemarks, setProjectRemarks] = useState<any[]>([]);

  // Update remarks when transcription data changes (navigation between files)
  useEffect(() => {
    if (currentTranscriptionData?.remarks) {
      console.log('[Page] Loading remarks from currentTranscriptionData:', currentTranscriptionData.remarks.length);
      setProjectRemarks(currentTranscriptionData.remarks);
    } else {
      // Clear remarks if no transcription data or no remarks
      setProjectRemarks([]);
    }
  }, [currentTranscriptionData]);

  // Test URL modal state (localhost only)
  const [showTestUrlModal, setShowTestUrlModal] = useState(false);
  const [testUrlInput, setTestUrlInput] = useState('');
  const [testUrlResult, setTestUrlResult] = useState<{title?: string, error?: string} | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  // Set localhost state after mounting to avoid hydration mismatch
  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);
  
  // Create a unique session ID for this transcription session
  const [sessionId] = useState<string>('session-default');

  // Use global hovering bars store
  const { headerLocked, sidebarLocked } = useHoveringBarsStore();

  const [helperFilesExpanded, setHelperFilesExpanded] = useState(false);

  // Fullscreen video controls state
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [splitRatio, setSplitRatio] = useState(50); // Video size percentage (30-70)

  // MediaPlayer refs - one for each mode
  const mediaPlayerRef = useRef<any>(null);  // Regular mode player
  const fullscreenMediaPlayerRef = useRef<any>(null);  // Fullscreen mode player

  // Fullscreen state and panel management
  const [fullscreenMode, setFullscreenMode] = useState<'none' | 'page' | 'browser'>('none');
  const [fullscreenVideoRef, setFullscreenVideoRef] = useState<HTMLVideoElement | null>(null);
  const panelManager = usePanelManager();

  // Computed fullscreen states for backward compatibility
  const isFullscreen = fullscreenMode === 'browser';
  const isPageFullscreen = fullscreenMode === 'page';
  const isAnyFullscreen = fullscreenMode !== 'none';

  // Synchronize media time between players when switching modes
  const syncMediaTime = useCallback((fromPlayer: any, toPlayer: any) => {
    if (fromPlayer?.current && toPlayer?.current) {
      const currentTimeValue = fromPlayer.current.currentTime;
      const isPlayingValue = fromPlayer.current.isPlaying;

      // Seek to the same time
      if (typeof toPlayer.current.seekTo === 'function' && currentTimeValue !== undefined) {
        setTimeout(() => {
          toPlayer.current.seekTo(currentTimeValue);
          console.log(`[Sync] Synchronized time to ${currentTimeValue}s`);

          // Also sync play state
          if (isPlayingValue && typeof toPlayer.current.togglePlayPause === 'function') {
            const toPlayerElement = toPlayer.current.audioRef?.current || toPlayer.current.videoRef?.current;
            if (toPlayerElement && toPlayerElement.paused) {
              toPlayer.current.togglePlayPause();
            }
          }
        }, 100); // Small delay to ensure player is ready
      }
    }
  }, []);

  // Cycle through fullscreen modes: none → page → browser → none
  const cycleFullscreenMode = useCallback(async () => {
    switch (fullscreenMode) {
      case 'none':
        // Enter page fullscreen - no sync needed, same player
        setFullscreenMode('page');
        break;
      case 'page':
        // Enter browser fullscreen
        try {
          await document.documentElement.requestFullscreen();
          setFullscreenMode('browser');
        } catch (err) {
          console.error('Failed to enter browser fullscreen:', err);
        }
        break;
      case 'browser':
        // Exit all fullscreen - no sync needed, same player
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
          setFullscreenMode('none');
        } catch (err) {
          console.error('Failed to exit browser fullscreen:', err);
          setFullscreenMode('none');
        }
        break;
    }
  }, [fullscreenMode, syncMediaTime]);

  // Legacy functions for backward compatibility
  const toggleFullscreen = cycleFullscreenMode;
  const togglePageFullscreen = cycleFullscreenMode;
  const toggleBrowserFullscreen = cycleFullscreenMode;

  // Exit any fullscreen mode
  const exitAnyFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setFullscreenMode('none');
  }, []);

  // Direct exit to normal mode (for MinimalMediaControls)
  const directExitFullscreen = useCallback(async () => {
    // No sync needed - using same player

    // Always exit to 'none' regardless of current mode
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
    setFullscreenMode('none');
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Only update if browser fullscreen changed externally (e.g., ESC key)
      if (!document.fullscreenElement && fullscreenMode === 'browser') {
        setFullscreenMode('none');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [fullscreenMode]);

  // Keyboard shortcuts for fullscreen modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 to cycle through fullscreen modes
      if (e.key === 'F11') {
        e.preventDefault();
        cycleFullscreenMode();
      }
      // ESC to exit any fullscreen
      else if (e.key === 'Escape' && isPageFullscreen) {
        e.preventDefault();
        exitAnyFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleFullscreenMode, exitAnyFullscreen, isPageFullscreen]);

  // Sync fullscreen video with hidden MediaPlayer video
  useEffect(() => {
    if (fullscreenMode === 'none' || !fullscreenVideoRef) return;

    // If we're showing a video in fullscreen, we need to get the video URL
    const fileNameForCheck = currentTranscriptionData?.metadata?.fileName || currentTranscriptionData?.metadata?.originalName || currentMediaId;
    const hasVideoExtension = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(fileNameForCheck || '');
    const hasVideoMimeType = currentTranscriptionData?.metadata?.mimeType?.startsWith('video/');
    const mediaIdHasVideo = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(currentMediaId || '');
    const isVideo = hasVideoExtension || hasVideoMimeType || mediaIdHasVideo;

    if (!isVideo) return;

    // Build the video URL directly
    if (currentProject && currentMediaId) {
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      const mediaUrl = `${apiUrl}/api/projects/${currentProject.projectId}/media/${currentMediaId}?token=${encodeURIComponent(token)}`;

      console.log('Setting fullscreen video source:', mediaUrl);
      fullscreenVideoRef.src = mediaUrl;

      // Replace the MediaPlayer's video ref with our fullscreen video
      // This allows the controls to work directly with the visible video
      if (mediaPlayerRef.current) {
        const originalVideoRef = mediaPlayerRef.current.videoRef;

        // Temporarily replace the ref with our fullscreen video
        mediaPlayerRef.current.videoRef = { current: fullscreenVideoRef };

        // Restore the original ref when exiting fullscreen
        return () => {
          if (mediaPlayerRef.current && originalVideoRef) {
            mediaPlayerRef.current.videoRef = originalVideoRef;
          }
        };
      }
    }
  }, [fullscreenMode, fullscreenVideoRef, currentProject, currentMediaId, currentTranscriptionData]);

  // MediaPlayer and TextEditor synchronization
  const [currentTime, setCurrentTime] = useState(0);
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Media collection management (for media files) - NOT transcription projects
  const [mediaCollections, setMediaCollections] = useState<MediaCollection[]>([]);
  const [currentCollectionIndex, setCurrentCollectionIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [actualMediaDuration, setActualMediaDuration] = useState<number>(0);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  
  // Transcription management (saved transcriptions from backend)
  const [transcriptions, setTranscriptions] = useState<any[]>(() => [createDefaultTranscription()]);
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(0);

  // Progress tracking state
  const [projectProgress, setProjectProgress] = useState<number>(0);
  const [currentFileProgress, setCurrentFileProgress] = useState<number>(0);
  const [progressScenario, setProgressScenario] = useState<string>('MIXED');
  const [currentPlayedRanges, setCurrentPlayedRanges] = useState<Array<{start: number, end: number}>>([]);

  // Get current media collection and media info (moved up to prevent reference errors)
  const currentCollection = mediaCollections ? mediaCollections[currentCollectionIndex] : undefined;
  const currentMedia = currentCollection?.mediaItems ? currentCollection.mediaItems[currentMediaIndex] : undefined;
  const hasCollections = mediaCollections && mediaCollections.length > 0;
  const hasMedia = currentCollection?.mediaItems && currentCollection.mediaItems.length > 0;

  // Fetch progress when project or media changes
  useEffect(() => {
    const fetchProgress = async () => {
      // TODO: Re-enable when backend progress API is implemented
      // For now, coverage-based progress is handled in the media time update listener
      console.log('[Page] Progress tracking using coverage-based system');

      // Don't reset progress here - let the coverage tracker handle it
      // The coverage tracker will maintain progress based on played segments
    };

    fetchProgress();
  }, [currentProject?.projectId, currentMediaId]);

  // Track maximum playback position for progress (never goes backward)
  const maxPlaybackPositionRef = useRef<number>(0);
  const coverageTrackerInitialized = useRef(false);

  // Initialize coverage tracker when media changes
  useEffect(() => {
    maxPlaybackPositionRef.current = 0;
    coverageTrackerInitialized.current = false;

    // Reset progress to 0 immediately when switching projects/media
    setCurrentFileProgress(0);
    console.log('[Page] Reset progress to 0 for new media');

    // Initialize coverage tracker for the new media
    if (currentProject?.projectId && currentMediaId) {
      // Use actualMediaDuration if available, otherwise use a default large value
      // The tracker will update its duration when the actual duration is known
      const duration = actualMediaDuration > 0 ? actualMediaDuration : 3600; // Default to 1 hour

      console.log(`[Page] Initializing tracker for project: ${currentProject.projectId}, media: ${currentMediaId}, duration: ${duration}`);

      const tracker = progressService.getCoverageTracker(
        currentProject.projectId,
        currentMediaId,
        duration
      );
      coverageTrackerInitialized.current = true;

      // DON'T reset the tracker here - progressService already handles isolation
      // and loads the correct data for each project
      console.log(`[Page] Got tracker for ${currentProject.projectId}/${currentMediaId}, current coverage: ${tracker.getCoveragePercentage().toFixed(1)}%`);

      // If duration changes later, update the tracker
      if (actualMediaDuration > 0 && Math.abs(tracker.getDuration() - actualMediaDuration) > 0.1) {
        tracker.setMediaDuration(actualMediaDuration);
        console.log('[Page] Updated tracker duration to:', actualMediaDuration);
      }

      // DON'T initialize here - let progressService.loadCoverageData handle it
      // This was causing double-loading and confusion
      console.log(`[Page] Tracker created for ${currentProject.projectId}/${currentMediaId} - coverage will be loaded by progressService`);

      // The progressService.getCoverageTracker already calls loadCoverageData internally,
      // so we don't need to manually import data here

      // Listen for coverage loaded event from progressService
      const handleCoverageLoaded = (event: CustomEvent) => {
        if (event.detail.projectId === currentProject.projectId &&
            event.detail.mediaId === currentMediaId) {
          console.log(`[Page] Coverage loaded event for ${currentProject.projectId}/${currentMediaId}:`, event.detail.coverage.toFixed(1) + '%');
          setCurrentFileProgress(event.detail.coverage);
        }
      };

      window.addEventListener('coverageLoaded', handleCoverageLoaded as any);

      // Also check immediately in case data is already available
      const immediateCheck = () => {
        const coverage = tracker.getCoveragePercentage();
        if (coverage !== currentFileProgress) {
          setCurrentFileProgress(coverage);
          console.log(`[Page] Immediate coverage check for ${currentProject.projectId}/${currentMediaId}:`, coverage.toFixed(1) + '%');
        }
      };
      immediateCheck();

      // Cleanup listener
      return () => {
        window.removeEventListener('coverageLoaded', handleCoverageLoaded as any);
      };
    }
  }, [currentMediaId, actualMediaDuration, currentProject?.projectId, currentTranscriptionData]);

  // Listen for media time updates from MediaPlayer and update coverage
  useEffect(() => {
    const handleTimeUpdate = (event: CustomEvent) => {
      if (actualMediaDuration > 0) {
        const currentTime = event.detail.time; // Changed from currentTime to time

        // Update coverage-based progress
        if (currentTime !== undefined && currentProject?.projectId && currentMediaId) {
          // CRITICAL FIX: Get the tracker for the current project/media
          const tracker = progressService.getCoverageTracker(
            currentProject.projectId,
            currentMediaId,
            actualMediaDuration
          );

          // Update the tracker with current playback position
          if (tracker) {
            tracker.updatePosition(currentTime, true);

            // Now get the updated coverage progress
            const coverage = progressService.getCoverageProgress(
              currentProject.projectId,
              currentMediaId
            );

            // Always update progress to ensure UI reflects coverage
            if (coverage !== currentFileProgress) {
              console.log('[Page] Coverage progress updated:', coverage.toFixed(1) + '%');
              setCurrentFileProgress(coverage);
            }

            // Show single progress bar when complete (>95%)
            if (coverage >= 95) {
              setProgressScenario('SINGLE_BLOCK_PODCAST');
            } else {
              setProgressScenario('MIXED');
            }

            // Save coverage periodically (every 5% of coverage change)
            if (Math.floor(coverage / 5) > Math.floor(currentFileProgress / 5)) {
              progressService.saveCoverageData(currentProject.projectId, currentMediaId).catch(error => {
                console.error('Failed to save coverage data:', error);
              });
            }
          }
        }
      }
    };

    // Listen for time update events from media player
    document.addEventListener('mediaTimeUpdate', handleTimeUpdate as any);

    return () => {
      document.removeEventListener('mediaTimeUpdate', handleTimeUpdate as any);
    };
  }, [actualMediaDuration, currentProject?.projectId, currentMediaId, currentFileProgress]);

  // Update progress when blocks change (for real-time updates)
  const updateProgressLocally = useCallback((blocks: any[]) => {
    if (currentProject?.projectId && currentMediaId && actualMediaDuration > 0) {
      // Progress is now tracked by media playback position, not text changes
      // This function just handles the debounced save to backend

      // Debounced save to backend (every 5 seconds)
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      progressSaveTimeoutRef.current = setTimeout(async () => {
        try {
          // TODO: Enable when backend progress API is implemented
          // await progressService.saveProgress(
          //   currentProject.projectId,
          //   currentMediaId,
          //   blocks,
          //   actualMediaDuration
          // );
          // // Refresh project progress after save
          // const projectProg = await progressService.getProjectProgress(
          //   currentProject.projectId
          // );
          // setProjectProgress(projectProg);

          // For now, just log that we would save progress
          console.log('[Progress] Would save progress (backend API not yet implemented)');
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      }, 5000);
    }
  }, [currentProject?.projectId, currentMediaId, actualMediaDuration]);

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
  
  // Get duration - prefer actualMediaDuration from player if available, then check mediaInfo
  let durationToUse = 0;

  // First priority: actualMediaDuration from the media player (most reliable)
  if (actualMediaDuration && actualMediaDuration > 0) {
    durationToUse = actualMediaDuration;
    console.log('[Duration] Using actualMediaDuration from player:', actualMediaDuration);
  }
  // Second priority: mediaInfo from project data
  else if (currentProject?.mediaInfo && currentMediaId) {
    const mediaInfo = currentProject.mediaInfo.find((m: any) => m.mediaId === currentMediaId);
    if (mediaInfo?.duration) {
      durationToUse = mediaInfo.duration;
      console.log('[Duration] Using duration from mediaInfo:', mediaInfo.duration);
    } else {
      console.log('[Duration] No duration in mediaInfo for media:', currentMediaId);
    }
  } else {
    console.log('[Duration] No duration available yet, mediaInfo:', currentProject?.mediaInfo);
  }

  const mediaDuration = formatDuration(durationToUse);

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
    if (!isRestoringSession && mediaCollections && (mediaCollections.length > 0 || mediaProjectsMap.size > 0)) {
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

  // Initialize session handler for save events
  useEffect(() => {
    console.log('[Page] Initializing session handler');
    tSessionService.tInitSessionHandler(2); // Using transcription number 2
  }, []);

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
      const apiUrl = getApiUrl(); // Use the proper API URL function
      console.log('[DELETE] Sending DELETE request for project:', projectId, 'deleteTranscriptions:', deleteTranscriptions);
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      console.log('[DELETE] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Delete project failed with status:', response.status);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[DELETE] Error response:', errorText);
        alert(`שגיאה במחיקת הפרויקט: ${errorText}`);
        throw new Error(`Failed to delete project: ${response.status} ${errorText}`);
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
      
      // Reload projects first to get updated list
      await loadProjects();
      
      // Refresh storage info in sidebar after deletion
      // Add multiple refresh attempts to ensure storage updates
      setTimeout(() => {
        if ((window as any).refreshSidebarStorage) {
          (window as any).refreshSidebarStorage();
        }
      }, 1500);
      
      // Second refresh attempt after a longer delay
      setTimeout(() => {
        if ((window as any).refreshSidebarStorage) {
          (window as any).refreshSidebarStorage();
        }
      }, 3000);
      
      // Third refresh attempt
      setTimeout(() => {
        if ((window as any).refreshSidebarStorage) {
          (window as any).refreshSidebarStorage();
        }
      }, 5000);
      
      // Get updated projects after reload
      const updatedState = useProjectStore.getState();
      
      // Check if the deleted project was the current one
      if (currentProject?.projectId === projectId) {
        // Clear current selection and transcription data
        setCurrentProject(null);
        clearCurrentTranscription();
        setActualMediaDuration(0);
        
        // Switch to the first available project if any exist
        if (updatedState.projects && updatedState.projects.length > 0) {
          const nextProject = updatedState.projects[0];
          setCurrentProject(nextProject);
          
          // Load first media of the new project if available
          if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
            const firstMediaItem = nextProject.mediaFiles[0];
            const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
            await setCurrentMediaById(nextProject.projectId, firstMediaId);
          }
        }
        // If no projects left, everything is already cleared
      }
      // No need to reload again if it wasn't the current project
    } catch (error) {
      console.error('Failed to delete project - network error:', error);
      alert('שגיאת רשת במחיקת הפרויקט. אנא ודא שהשרת פועל.');
    }
  };

  // Handler for media deletion
  const handleMediaDelete = async (projectId: string, mediaId: string, deleteTranscriptions: boolean) => {
    try {
      const apiUrl = getApiUrl(); // Use the proper API URL function
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/media/${mediaId}`, {
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
        if (updatedState.projects && updatedState.projects.length > 0) {
          const nextProject = updatedState.projects[0];
          setCurrentProject(nextProject);
          
          // Load first media of the new project
          if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
            const firstMediaItem = nextProject.mediaFiles[0];
            const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
            await setCurrentMediaById(nextProject.projectId, firstMediaId);
          }
        } else {
          // No projects left - ensure everything is cleared
          clearCurrentTranscription();
          setCurrentProject(null); // Clear current project
          await setCurrentMediaById('', ''); // Clear current media
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
        const updatedProject = updatedState.projects ? updatedState.projects.find(p => p.projectId === projectId) : undefined;
        
        if (updatedProject && updatedProject.mediaFiles && updatedProject.mediaFiles.length > 0) {
          // Switch to the first available media in the same project
          const firstMediaItem = updatedProject.mediaFiles[0];
          const nextMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
          await setCurrentMediaById(projectId, nextMediaId);
        } else {
          // No media left in this project (shouldn't happen due to backend changes)
          // Switch to first available project
          if (updatedState.projects && updatedState.projects.length > 0) {
            const nextProject = updatedState.projects[0];
            setCurrentProject(nextProject);
            
            if (nextProject.mediaFiles && nextProject.mediaFiles.length > 0) {
              const firstMediaItem = nextProject.mediaFiles[0];
              const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
              await setCurrentMediaById(nextProject.projectId, firstMediaId);
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
  
  // Handler for transcription restoration
  const handleTranscriptionRestored = async (projectId: string, mediaId: string) => {
    console.log('[TranscriptionRestored] Loading restored transcription:', projectId, mediaId);
    
    // Don't close the modal immediately - wait for transcription to load
    try {
      // First, reload projects to get the updated data
      await loadProjects();
      
      // Find the project in the updated projects list
      const updatedProjects = useProjectStore.getState().projects;
      const targetProject = updatedProjects.find(p => p.projectId === projectId);
      
      if (targetProject) {
        // Set the current project first
        setCurrentProject(targetProject);
        
        // Wait for project to be set in state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Then set the current media which will trigger the TextEditor to load the transcription
        await setCurrentMediaById(projectId, mediaId);
        
        // Force a state update to ensure TextEditor re-renders
        const currentState = useProjectStore.getState();
        if (currentState.currentMediaId === mediaId) {
          // Trigger a re-render by quickly toggling the media
          await setCurrentMediaById(projectId, '');
          await new Promise(resolve => setTimeout(resolve, 50));
          await setCurrentMediaById(projectId, mediaId);
        }
        
        // Wait longer to ensure transcription loads
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Only close modal after everything is loaded
        setShowManagementModal(false);
      } else {
        console.error('[TranscriptionRestored] Project not found after reload:', projectId);
        alert('שגיאה: הפרויקט לא נמצא');
        setShowManagementModal(false);
      }
    } catch (error) {
      console.error('[TranscriptionRestored] Error loading transcription:', error);
      alert('שגיאה בטעינת התמלול');
      setShowManagementModal(false);
    }
  };

  // Test URL handler (localhost only)
  const handleTestUrl = async () => {
    if (!testUrlInput.trim()) {
      setTestUrlResult({ error: 'נא להזין URL' });
      return;
    }

    setIsTestingUrl(true);
    setTestUrlResult(null);

    try {
      const response = await fetch(buildApiUrl('/api/projects/check-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`
        },
        body: JSON.stringify({ url: testUrlInput })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response:', response.status, response.statusText);
        setTestUrlResult({ error: `שגיאת שרת: ${response.status} ${response.statusText}` });
        setIsTestingUrl(false);
        return;
      }

      const result = await response.json();

      if (result.title) {
        setTestUrlResult({ title: result.title });
      } else if (result.status === 'protected') {
        // Try to get minimal info for protected content
        const minimalResponse = await fetch(buildApiUrl('/api/projects/test-title'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`
          },
          body: JSON.stringify({ url: testUrlInput })
        });

        // Check if response is JSON before parsing
        const minimalContentType = minimalResponse.headers.get('content-type');
        if (!minimalContentType || !minimalContentType.includes('application/json')) {
          console.error('Non-JSON response from test-title:', minimalResponse.status, minimalResponse.statusText);
          setTestUrlResult({ error: `שגיאת שרת בבדיקת כותרת: ${minimalResponse.status}` });
          setIsTestingUrl(false);
          return;
        }

        const minimalResult = await minimalResponse.json();
        if (minimalResult.title) {
          setTestUrlResult({ title: minimalResult.title });
        } else {
          setTestUrlResult({ error: 'לא ניתן לחלץ כותרת - תוכן מוגן ללא Cookies' });
        }
      } else {
        setTestUrlResult({ error: result.message || 'לא ניתן לקבל כותרת' });
      }
    } catch (error) {
      console.error('Test URL error:', error);
      setTestUrlResult({ error: 'שגיאה בבדיקת URL' });
    } finally {
      setIsTestingUrl(false);
    }
  };

  return (
    <div className={`transcription-page-wrapper ${isPageFullscreen ? 'page-fullscreen' : ''}`}>
      {/* Fullscreen Mode (both page and browser) - always rendered but conditionally shown */}
      <div style={{ display: (isFullscreen || isPageFullscreen) ? 'block' : 'none' }}>
        <div className="fullscreen-mode">
          <div className="fullscreen-wrapper">
            {/* Detect if current media is video */}
            {(() => {
              const fileNameForCheck = currentTranscriptionData?.metadata?.fileName || currentTranscriptionData?.metadata?.originalName || currentMediaId;
              const hasVideoExtension = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(fileNameForCheck || '');
              const hasVideoMimeType = currentTranscriptionData?.metadata?.mimeType?.startsWith('video/');
              const mediaIdHasVideo = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(currentMediaId || '');
              const isVideo = hasVideoExtension || hasVideoMimeType || mediaIdHasVideo;

              if (isVideo) {
                // Split-screen layout for video
                return (
                  <div className={`fullscreen-video-split ${splitOrientation === 'vertical' ? 'vertical' : 'horizontal'} ${isVideoMinimized ? 'video-minimized' : ''}`}>
                    {/* Video section with controls */}
                    {!isVideoMinimized && (
                      <div
                        className="fullscreen-video-section"
                        style={{
                          [splitOrientation === 'horizontal' ? 'width' : 'height']: `${splitRatio}%`
                        }}
                      >
                        {/* Video control icons - top right */}
                        <div className="fullscreen-video-controls">
                          <button
                            className="video-control-btn video-control-text-btn"
                            onClick={() => setSplitOrientation(splitOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                            title={splitOrientation === 'horizontal' ? 'החלף לפיצול אנכי' : 'החלף לפיצול אופקי'}
                          >
                            {splitOrientation === 'horizontal' ? 'אנכי' : 'אופקי'}
                          </button>
                          <button
                            className="video-control-btn video-control-text-btn"
                            onClick={() => setIsVideoMinimized(true)}
                            title="מזער וידאו"
                          >
                            מזער
                          </button>
                          <button
                            className="video-control-btn"
                            onClick={() => setSplitRatio(Math.max(30, splitRatio - 10))}
                            disabled={splitRatio <= 30}
                            title="הקטן וידאו"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <button
                            className="video-control-btn"
                            onClick={() => setSplitRatio(Math.min(70, splitRatio + 10))}
                            disabled={splitRatio >= 70}
                            title="הגדל וידאו"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        </div>
                        <video
                          ref={setFullscreenVideoRef}
                          className="fullscreen-video"
                          controls={false}
                          autoPlay={false}
                          playsInline
                          preload="auto"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    )}
                    {/* Text Editor */}
                    <div
                      className="fullscreen-editor-section"
                      style={{
                        [splitOrientation === 'horizontal' ? 'width' : 'height']: `${100 - splitRatio}%`
                      }}
                    >
                      <RemarksProvider
                        transcriptionId={currentMediaId ? `${currentProjectId || sessionId}-${currentMediaId}` : (currentProjectId || sessionId)}
                        initialRemarks={projectRemarks}
                      >
                        <RemarksEventListener />
                        <TextEditor
                          key={`fullscreen-video-${currentMediaId || 'none'}-${isFullscreen}`}
                          currentProjectId={currentProject?.projectId || ''}
                          currentMediaId={currentMediaId || ''}
                          mediaPlayerRef={mediaPlayerRef}
                          marks={[]}
                          mediaName={currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || ''}
                          currentTime={currentTime}
                          onBlocksChange={updateProgressLocally}
                          mediaFileName={(() => {
                            if (transcriptions && transcriptions.length > 0 && currentTranscriptionIndex !== undefined && transcriptions[currentTranscriptionIndex]) {
                              const currentTranscription = transcriptions[currentTranscriptionIndex];
                              if (currentTranscription.mediaItems && currentTranscription.mediaItems[0]) {
                                return currentTranscription.mediaItems[0].name || '';
                              }
                            }
                            return currentMedia?.name || '';
                          })()}
                        />
                      </RemarksProvider>
                    </div>
                  </div>
                );
              } else {
                // Full-width text editor for audio
                return (
                  <RemarksProvider
                    transcriptionId={currentMediaId ? `${currentProjectId || sessionId}-${currentMediaId}` : (currentProjectId || sessionId)}
                    initialRemarks={projectRemarks}
                  >
                    <RemarksEventListener />
                    <div className="fullscreen-text-editor">
                      <TextEditor
                        key={`fullscreen-audio-${currentMediaId || 'none'}-${isPageFullscreen}`}
                        currentProjectId={currentProject?.projectId || ''}
                        currentMediaId={currentMediaId || ''}
                        mediaPlayerRef={mediaPlayerRef}
                        marks={[]}
                        mediaName={currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || ''}
                        currentTime={currentTime}
                        onBlocksChange={updateProgressLocally}
                        mediaFileName={(() => {
                          if (transcriptions && transcriptions.length > 0 && currentTranscriptionIndex !== undefined && transcriptions[currentTranscriptionIndex]) {
                            const currentTranscription = transcriptions[currentTranscriptionIndex];
                            if (currentTranscription.mediaItems && currentTranscription.mediaItems[0]) {
                              return currentTranscription.mediaItems[0].name || '';
                            }
                          }
                          return currentMedia?.name || '';
                        })()}
                      />
                    </div>
                  </RemarksProvider>
                );
              }
            })()}
            <MinimalMediaControls
              mediaPlayerRef={mediaPlayerRef}
              duration={actualMediaDuration}
              currentTime={currentTime}
              onExitFullscreen={directExitFullscreen}
              onToggleBrowserFullscreen={() => {
                // Toggle between page and browser fullscreen modes
                if (fullscreenMode === 'page') {
                  // Switch from page to browser fullscreen
                  setFullscreenMode('browser');
                  document.documentElement.requestFullscreen().catch(err => {
                    console.error('Failed to enter browser fullscreen:', err);
                  });
                } else if (fullscreenMode === 'browser') {
                  // Switch from browser to page fullscreen
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => {
                      console.error('Failed to exit browser fullscreen:', err);
                    });
                  }
                  setFullscreenMode('page');
                }
              }}
              fullscreenMode={fullscreenMode}
              isVideoMinimized={isVideoMinimized}
              onRestoreVideo={() => setIsVideoMinimized(false)}
            />
            {/* Hidden audio element for fullscreen playback */}
            <audio
              ref={(el) => {
                if (el && mediaPlayerRef.current) {
                  // Sync time when audio element is mounted
                  if (currentTime > 0 && el.currentTime !== currentTime) {
                    el.currentTime = currentTime;
                  }
                  // Make audio element available through mediaPlayerRef
                  mediaPlayerRef.current.audioRef = { current: el };
                }
              }}
              style={{ display: 'none' }}
              src={currentProject && currentMediaId ? (() => {
                const apiUrl = getApiUrl();
                const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
                return `${apiUrl}/api/projects/${currentProject.projectId}/media/${currentMediaId}?token=${encodeURIComponent(token)}`;
              })() : undefined}
              onTimeUpdate={(e) => {
                const audio = e.currentTarget;
                setCurrentTime(audio.currentTime);
              }}
              onDurationChange={(e) => {
                const audio = e.currentTarget;
                setActualMediaDuration(audio.duration);
              }}
              onLoadedMetadata={(e) => {
                const audio = e.currentTarget;
                // Sync time when metadata is loaded
                if (currentTime > 0 && audio.currentTime !== currentTime) {
                  audio.currentTime = currentTime;
                }
              }}
              preload="auto"
            />
          </div>
        </div>
      </div>

      {/* Regular Mode - always rendered but conditionally shown */}
      <div style={{ display: (isFullscreen || isPageFullscreen) ? 'none' : 'block' }}>
      {/* Test URL Modal (localhost only) */}
      {isLocalhost && showTestUrlModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>בדיקת כותרת URL מוגן</h2>

            <input
              type="text"
              value={testUrlInput}
              onChange={(e) => setTestUrlInput(e.target.value)}
              placeholder="הכנס URL של YouTube..."
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                marginBottom: '15px'
              }}
              dir="ltr"
            />

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={handleTestUrl}
                disabled={isTestingUrl}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isTestingUrl ? 'wait' : 'pointer',
                  opacity: isTestingUrl ? 0.7 : 1
                }}
              >
                {isTestingUrl ? 'בודק...' : 'בדוק כותרת'}
              </button>

              <button
                onClick={() => {
                  setShowTestUrlModal(false);
                  setTestUrlInput('');
                  setTestUrlResult(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                סגור
              </button>
            </div>

            {testUrlResult && (
              <div style={{
                padding: '15px',
                background: testUrlResult.error ? '#ffebee' : '#e8f5e9',
                border: `1px solid ${testUrlResult.error ? '#ffcdd2' : '#c8e6c9'}`,
                borderRadius: '5px',
                marginTop: '15px'
              }}>
                {testUrlResult.title ? (
                  <>
                    <strong style={{ color: '#2e7d32' }}>כותרת שחולצה:</strong>
                    <div style={{ marginTop: '10px', fontSize: '18px', color: '#1b5e20' }}>
                      {testUrlResult.title}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#c62828' }}>
                    {testUrlResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
          ref={sidebarRef}
          onOpenManagementModal={handleOpenManagementModal}
          onProjectDelete={handleProjectDelete}
          onMediaDelete={handleMediaDelete}
        />
      }
      sidebarActions={
        sidebarLocked ? (
          <CombinedUploadButton sidebarRef={sidebarRef} />
        ) : (
          <>
            <button
              onClick={() => sidebarRef.current?.handleSingleMediaClick?.()}
              className="sidebar-header-action-btn"
              title="העלה מדיה"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <button
              onClick={() => {
                console.log('[Page] Folder button clicked, ref:', sidebarRef.current);
                if (sidebarRef.current?.handleFolderUpload) {
                  sidebarRef.current.handleFolderUpload();
                } else {
                  console.error('[Page] handleFolderUpload not available');
                }
              }}
              className="sidebar-header-action-btn"
              title="הוסף תיקיית פרויקט"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </button>
            <button
              onClick={() => sidebarRef.current?.handleUrlDownload?.()}
              className="sidebar-header-action-btn"
              title="הורד מ-URL"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
            <button
              onClick={() => window.open('http://localhost:3003', '_blank', 'noopener,noreferrer')}
              className="sidebar-header-action-btn"
              title="מנהל הורדות"
              style={{
                width: '32px',
                height: '32px',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </>
        )
      }
      theme="transcription"
    >
      {/* Workspace Header */}
      <WorkspaceHeader
        headerLocked={headerLocked}
        sidebarLocked={sidebarLocked}
        projectTitle={collectionName}
        progress={45}
        projectId={currentProject?.projectId}
        mediaId={currentMediaId}
        projectProgress={projectProgress}
        currentFileProgress={currentFileProgress}
        scenarioType={progressScenario}
        mediaDuration={actualMediaDuration}
        playedRanges={currentPlayedRanges}
        fullscreenMode={fullscreenMode}
        onToggleFullscreen={cycleFullscreenMode}
      />
      

      {/* Main Content with max-width container */}
      <div className={'main-content ' + (
        headerLocked ? 'header-locked' : ''
      ) + ' ' + (
        sidebarLocked ? 'sidebar-locked' : ''
      )}>
        <div className="content-container">
          <RemarksProvider
            transcriptionId={currentMediaId ? `${currentProjectId || sessionId}-${currentMediaId}` : (currentProjectId || sessionId)}
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
              ref={mediaPlayerRef}
              initialMedia={useMemo(() => {
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
                const apiUrl = getApiUrl(); // Use the proper API URL function
                const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
                // Use same path for both localhost and production
                const mediaUrl = `${apiUrl}/api/projects/${currentProject.projectId}/media/${currentMediaId}?token=${encodeURIComponent(token)}`;
                
                console.log('Page: Creating media object from project store', {
                  url: mediaUrl,
                  mediaId: currentMediaId,
                  displayName: currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || currentMediaId
                });
                
                // Use fileName for extension check, but originalName for display
                const displayName = currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || currentMediaId;
                const fileNameForCheck = currentTranscriptionData?.metadata?.fileName || currentTranscriptionData?.metadata?.originalName || currentMediaId;

                // Check multiple sources for video determination
                // 1. Check file extension from fileName (more reliable than originalName)
                const hasVideoExtension = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(fileNameForCheck);
                // 2. Check MIME type if available (most reliable)
                const hasVideoMimeType = currentTranscriptionData?.metadata?.mimeType?.startsWith('video/');
                // 3. Check if mediaId contains video extension (fallback)
                const mediaIdHasVideo = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(currentMediaId);
                // 4. Check the media URL itself
                const mediaUrlHasVideo = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)/i.test(mediaUrl);

                const isVideo = hasVideoExtension || hasVideoMimeType || mediaIdHasVideo || mediaUrlHasVideo;

                console.log('[Page] Media type detection:', {
                  displayName,
                  fileNameForCheck,
                  originalName: currentTranscriptionData?.metadata?.originalName,
                  fileName: currentTranscriptionData?.metadata?.fileName,
                  hasVideoExtension,
                  hasVideoMimeType,
                  mediaIdHasVideo,
                  mediaUrlHasVideo,
                  mimeType: currentTranscriptionData?.metadata?.mimeType,
                  finalType: isVideo ? 'video' : 'audio',
                  mediaUrl: mediaUrl
                });

                return {
                  url: mediaUrl,
                  name: displayName,
                  type: isVideo ? 'video' : 'audio'
                };
              } else {
                console.log('[MediaPlayer] Cannot create media object - missing required data');
                return undefined;
              }
              }, [currentProject?.projectId, currentMediaId, currentTranscriptionData?.metadata?.originalName, currentTranscriptionData?.metadata?.fileName, currentTranscriptionData?.metadata?.mimeType])}
              onTimeUpdate={(time) => {
                // Update current time for synchronization
                setCurrentTime(time);
              }}
              onTimestampCopy={(timestamp) => {
                // Handle timestamp copy for text editor
                console.log('Timestamp copied:', timestamp);
              }}
              onDurationChange={(duration) => {
                setActualMediaDuration(duration);
              }}
              onCoverageChange={(percentage) => {
                // Only update with non-zero values or if we're truly at 0%
                setCurrentFileProgress(prev => {
                  // Keep the previous value if we get 0 and already have progress
                  if (percentage === 0 && prev > 0) {
                    return prev;
                  }
                  return percentage;
                });
              }}
              onPlayedRangesChange={(ranges) => {
                setCurrentPlayedRanges(ranges);
                // Set global state for save operations
                (window as any).__currentPlayedRanges = ranges;
              }}
              initialPlayedRanges={currentTranscriptionData?.playedRanges}
              projectId={currentProject?.projectId}
              mediaId={currentMediaId}
              currentProject={(() => {
                if (!currentProject) return projects && projects.length > 0 ? 1 : 0;
                const index = projects ? projects.findIndex(p => p.projectId === currentProject.projectId) : -1;
                return index >= 0 ? index + 1 : 1;
              })()}
              totalProjects={projects ? projects.length : 0}
              currentMedia={(() => {
                if (!currentProject || !currentMediaId || !currentProject.mediaFiles) {
                  return currentProject?.mediaFiles?.length > 0 ? 1 : 0;
                }
                // Find index handling both string and object formats
                const index = currentProject.mediaFiles.findIndex((item: any) => {
                  const mediaId = typeof item === 'string' ? item : item.id;
                  return mediaId === currentMediaId;
                });
                console.log('[MediaPlayer] Media navigation:', {
                  currentMediaId,
                  mediaFiles: currentProject.mediaFiles,
                  indexOf: index,
                  calculatedCurrent: index + 1
                });
                return index >= 0 ? index + 1 : 1;
              })()}
              totalMedia={currentProject?.mediaFiles?.length || 0}
              mediaName={(() => {
                // Try to get media name from project's mediaInfo first
                if (currentProject?.mediaInfo && currentMediaId) {
                  console.log('[MediaName] currentProject.mediaInfo:', currentProject.mediaInfo);
                  console.log('[MediaName] Looking for mediaId:', currentMediaId);
                  const mediaInfo = currentProject.mediaInfo.find(m => m.mediaId === currentMediaId);
                  console.log('[MediaName] Found mediaInfo:', mediaInfo);
                  if (mediaInfo?.name) {
                    // Try to decode the name if it appears to be encoded
                    try {
                      // Check if the name contains encoded characters
                      if (mediaInfo.name.includes('%') || mediaInfo.name.includes('\\x')) {
                        return decodeURIComponent(mediaInfo.name);
                      }
                      // Check if it's UTF-8 encoded as Latin-1
                      if (/[\u0080-\u00FF]/.test(mediaInfo.name)) {
                        // Try to fix UTF-8 encoding issues
                        const bytes = new Uint8Array(mediaInfo.name.split('').map(c => c.charCodeAt(0)));
                        return new TextDecoder('utf-8').decode(bytes);
                      }
                      return mediaInfo.name;
                    } catch (e) {
                      // If decoding fails, return the original
                      return mediaInfo.name;
                    }
                  }
                }
                // Fall back to transcription metadata
                const fallbackName = currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || 'אין מדיה';
                // Apply same decoding logic to fallback
                try {
                  if (fallbackName.includes('%') || fallbackName.includes('\\x')) {
                    return decodeURIComponent(fallbackName);
                  }
                  if (/[\u0080-\u00FF]/.test(fallbackName)) {
                    const bytes = new Uint8Array(fallbackName.split('').map(c => c.charCodeAt(0)));
                    return new TextDecoder('utf-8').decode(bytes);
                  }
                  return fallbackName;
                } catch (e) {
                  return fallbackName;
                }
              })()}
              mediaDuration={mediaDuration}
              mediaSize={(() => {
                // Try to get media size from project's mediaInfo first
                if (currentProject?.mediaInfo && currentMediaId) {
                  const mediaInfo = currentProject.mediaInfo.find(m => m.mediaId === currentMediaId);
                  if (mediaInfo?.size) {
                    return `${(mediaInfo.size / (1024 * 1024)).toFixed(1)} MB`;
                  }
                }
                // Fall back to transcription metadata
                return currentTranscriptionData?.metadata?.size ? `${(currentTranscriptionData.metadata.size / (1024 * 1024)).toFixed(1)} MB` : '0 MB';
              })()}
              projectName={currentProject?.displayName || 'אין פרויקט'}
              onPreviousProject={async () => {
                const currentIndex = currentProject && projects ? projects.indexOf(currentProject) : -1;
                if (currentIndex > 0 && projects) {
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
                    const firstMediaItem = prevProject.mediaFiles[0];
                    const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
                    setCurrentMediaById(prevProject.projectId, firstMediaId);
                  }
                }
              }}
              onNextProject={async () => {
                const currentIndex = currentProject && projects ? projects.indexOf(currentProject) : -1;
                if (projects && currentIndex < projects.length - 1) {
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
                    const firstMediaItem = nextProject.mediaFiles[0];
                    const firstMediaId = typeof firstMediaItem === 'string' ? firstMediaItem : firstMediaItem.id;
                    setCurrentMediaById(nextProject.projectId, firstMediaId);
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
              {(() => {
                console.log('[Page] === RENDERING TextEditor ===');
                console.log('[Page] Props being passed:', {
                  currentProjectId: currentProject?.projectId || '',
                  currentMediaId: currentMediaId || '',
                  hasProject: !!currentProject,
                  hasProjectId: !!currentProject?.projectId,
                  hasMediaId: !!currentMediaId,
                  projectType: currentProject?.type,
                  projectName: currentProject?.name,
                  mediaIdFormat: {
                    isUUID: currentMediaId?.includes('-') && currentMediaId?.length > 20,
                    isNumbered: currentMediaId?.match(/^media-\d+$/),
                    actual: currentMediaId
                  },
                  timestamp: new Date().toISOString()
                });
                return null;
              })()}
              <TextEditor
                key={`regular-${currentMediaId || 'none'}-${!isFullscreen && !isPageFullscreen}`}
                currentProjectId={currentProject?.projectId || ''}
                currentMediaId={currentMediaId || ''}
                mediaPlayerRef={mediaPlayerRef}
                marks={[]}
                mediaName={currentTranscriptionData?.metadata?.originalName || currentTranscriptionData?.metadata?.fileName || ''}
                currentTime={currentTime}
                onBlocksChange={updateProgressLocally}
                mediaFileName={(() => {
                  // If there are transcriptions loaded, use the transcription's media name
                  if (transcriptions && transcriptions.length > 0 && currentTranscriptionIndex !== undefined && transcriptions[currentTranscriptionIndex]) {
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
                projectId={currentProject?.projectId}
                mediaId={currentMediaId || undefined}
                projects={mediaCollections ? mediaCollections.map((coll, idx) => ({
                  id: 'proj-' + idx,
                  name: coll.name,
                  mediaItems: coll.mediaItems ? coll.mediaItems.map((media, mIdx) => ({
                    id: 'media-' + idx + '-' + mIdx,
                    name: media.name
                  })) : []
                })) : []}
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
        onTranscriptionRestored={handleTranscriptionRestored}
      />
    </HoveringBarsLayout>
      </div>
    </div>
  );
}