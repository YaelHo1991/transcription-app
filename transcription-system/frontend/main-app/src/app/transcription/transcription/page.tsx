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
import { projectService } from '../../../services/projectService';
import './components/TranscriptionSidebar/TranscriptionSidebar.css';
import './transcription-theme.css';
import './transcription-page.css';

interface MediaItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  name: string;
  size?: string;
}

interface Project {
  name: string;
  mediaItems: MediaItem[];
  projectId?: string; // Store the backend project ID
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

export default function TranscriptionWorkPage() {
  const router = useRouter();
  
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
  
  // Project and media management (for media files)
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [actualMediaDuration, setActualMediaDuration] = useState<number>(0);
  
  // Transcription management (saved transcriptions from backend)
  const [transcriptions, setTranscriptions] = useState<any[]>(() => [createDefaultTranscription()]);
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(0);
  
  // Modal states for styled alerts
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFolderRef = useRef<HTMLInputElement>(null);
  const speakerComponentRef = useRef<SimpleSpeakerHandle>(null);
  
  // Project management
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [projectsMap, setProjectsMap] = useState<Map<string, string>>(new Map()); // mediaName -> projectId
  
  // Get current project and media info
  const currentProject = projects[currentProjectIndex];
  const currentMedia = currentProject?.mediaItems[currentMediaIndex];
  const hasProjects = projects.length > 0;
  const hasMedia = currentProject?.mediaItems.length > 0;
  
  // Use project ID for components instead of mediaId
  const mediaId = currentMedia ? `0-0-${currentMedia.name}` : '';
  const transcriptionNumber = 2; // Using transcription 2 as default
  
  // Use real data if available, otherwise show empty state
  const projectName = currentProject?.name || '';
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
      
      return `${hStr}:${mStr}:${sStr}`;
    } catch (error) {
      console.error('[formatDuration] Error:', error);
      return '00:00:00';
    }
  };
  
  const mediaDuration = formatDuration(actualMediaDuration);

  // Load saved transcriptions from backend
  useEffect(() => {
    // Only run on client side after a delay
    if (typeof window !== 'undefined') {
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
          
          console.log(`[Page] Successfully loaded ${transformedTranscriptions.length} transcriptions + 1 default`);
          console.log('[Page] All transcriptions:', allTranscriptions.map(t => ({ name: t.name, isDefault: t.isDefault, projectId: t.projectId })));
          setTranscriptions(allTranscriptions);
          
          if (allTranscriptions.length > 0) {
            // Find the first non-default transcription, or fall back to 0
            const firstNonDefaultIndex = allTranscriptions.findIndex(t => !t.isDefault);
            const targetIndex = firstNonDefaultIndex >= 0 ? firstNonDefaultIndex : 0;
            
            console.log('[Page] Setting current transcription index to:', targetIndex, 'for transcription:', allTranscriptions[targetIndex]?.name);
            setCurrentTranscriptionIndex(targetIndex);
          }
        } catch (error) {
          console.error('[Page] Error loading transcriptions:', error);
        }
      }, 3000); // 3 second delay to ensure page is fully loaded
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Load existing projects on mount
  // TEMPORARILY DISABLED TO DEBUG ERROR
  /*
  useEffect(() => {
    const loadExistingProjects = async () => {
      try {
        console.log('[Page] Loading existing projects...');
        const projectsList = await projectService.listProjects();
        
        if (projectsList && projectsList.length > 0) {
          // Transform backend projects to frontend format
          const transformedProjects: Project[] = projectsList.map(proj => {
            try {
              return {
                name: proj.projectName || 'פרויקט ללא שם',
                mediaItems: [{
                  type: 'file' as const,
                  name: proj.mediaFile || 'מדיה לא ידועה',
                  size: '0 MB' // Size not stored in backend
                }],
                projectId: proj.projectId
              };
            } catch (err) {
              console.error('[Page] Error transforming project:', proj, err);
              return null;
            }
          }).filter(Boolean) as Project[];
          
          console.log('[Page] Loaded projects:', transformedProjects.length);
          setProjects(transformedProjects);
          
          // If we have projects, set the first one as current
          if (transformedProjects.length > 0) {
            setCurrentProjectIndex(0);
            setCurrentMediaIndex(0);
            // Load the first project's data
            if (transformedProjects[0].projectId) {
              await loadProjectData(transformedProjects[0].projectId);
            }
          }
        }
      } catch (error) {
        console.error('[Page] Error loading projects:', error);
      }
    };
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      loadExistingProjects();
    }
  }, []); // Run once on mount
  */
  
  // Function to load complete project data (blocks, speakers, remarks)
  const loadProjectData = async (projectId: string) => {
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
          const transcriptionIndex = transcriptions.findIndex(t => t.projectId === projectId);
          if (transcriptionIndex !== -1) {
            const updatedTranscriptions = [...transcriptions];
            updatedTranscriptions[transcriptionIndex] = {
              ...updatedTranscriptions[transcriptionIndex],
              mediaItems: [{
                type: 'file' as const,
                name: projectData.metadata.mediaFile,
                size: '0 MB'
              }]
            };
            setTranscriptions(updatedTranscriptions);
          }
        }
        
        console.log('[Page] Project data loaded:', {
          blocks: projectData.blocks?.length || 0,
          speakers: projectData.speakers?.length || 0,
          remarks: projectData.remarks?.length || 0,
          mediaFile: projectData.metadata?.mediaFile || 'none'
        });
      }
    } catch (error) {
      console.error('[Page] Error loading project data:', error);
    }
  };
  
  const handleMediaUpload = (files: FileList) => {
    // Create project if none exists
    if (projects.length === 0) {
      const newProject: Project = {
        name: '',
        mediaItems: []
      };
      setProjects([newProject]);
      setCurrentProjectIndex(0);
    }
    
    const newItems: MediaItem[] = Array.from(files)
      .filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/'))
      .map(file => ({
        type: 'file' as const,
        file,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      }));
    
    if (newItems.length > 0) {
      setProjects(prev => {
        const updated = [...prev];
        if (updated[currentProjectIndex]) {
          updated[currentProjectIndex] = {
            ...updated[currentProjectIndex],
            mediaItems: [...updated[currentProjectIndex].mediaItems, ...newItems]
          };
        }
        return updated;
      });
      
      // If this is the first media in project, set index to 0
      if (!currentProject?.mediaItems.length) {
        setCurrentMediaIndex(0);
      }
    }
  };
  
  const handleProjectUpload = (files: FileList) => {
    // Store files and show name modal
    setPendingProjectFiles(files);
    setShowProjectNameModal(true);
  };
  
  const handleProjectNameSubmit = (name: string | null) => {
    if (pendingProjectFiles) {
      // Get folder name from file path if no name provided
      const firstFile = pendingProjectFiles[0] as FileWithPath;
      const pathParts = firstFile.webkitRelativePath?.split('/') || [];
      const folderName = name || pathParts[0] || `פרויקט ${projects.length + 1}`;
      
      const mediaFiles = Array.from(pendingProjectFiles).filter(file => 
        file.type.startsWith('audio/') || file.type.startsWith('video/')
      );
      
      const newProject: Project = {
        name: folderName,
        mediaItems: mediaFiles.map(file => ({
          type: 'file' as const,
          file,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        }))
      };
      
      setProjects(prev => [...prev, newProject]);
      setCurrentProjectIndex(projects.length);
      setCurrentMediaIndex(0);
      setPendingProjectFiles(null);
    } else if (pendingProjectUrl) {
      // Handle URL project
      const projectName = name || `פרויקט ${projects.length + 1}`;
      const urlParts = pendingProjectUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || pendingProjectUrl.substring(0, 50);
      
      const newProject: Project = {
        name: projectName,
        mediaItems: [{
          type: 'url',
          url: pendingProjectUrl,
          name: fileName,
          size: 'קישור חיצוני'
        }]
      };
      
      setProjects(prev => [...prev, newProject]);
      setCurrentProjectIndex(projects.length);
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
  
  const handleUrlSubmit = (url: string) => {
    const urlParts = url.split('/');
    const name = urlParts[urlParts.length - 1] || url.substring(0, 50);
    
    if (urlModalType === 'project') {
      // Store URL and show name modal
      setPendingProjectUrl(url);
      setShowProjectNameModal(true);
    } else {
      // Add media to current project
      if (projects.length === 0) {
        const newProject: Project = {
          name: '',
          mediaItems: []
        };
        setProjects([newProject]);
        setCurrentProjectIndex(0);
      }
      
      const newItem: MediaItem = {
        type: 'url',
        url,
        name,
        size: 'קישור חיצוני'
      };
      
      setProjects(prev => {
        const updated = [...prev];
        if (updated[currentProjectIndex]) {
          updated[currentProjectIndex] = {
            ...updated[currentProjectIndex],
            mediaItems: [...updated[currentProjectIndex].mediaItems, newItem]
          };
        }
        return updated;
      });
      
      if (!currentProject?.mediaItems.length) {
        setCurrentMediaIndex(0);
      }
    }
  };
  
  const handlePreviousProject = () => {
    if (currentProjectIndex > 0) {
      setCurrentProjectIndex(currentProjectIndex - 1);
      setCurrentMediaIndex(0);
    }
  };
  
  const handleNextProject = () => {
    if (currentProjectIndex < projects.length - 1) {
      setCurrentProjectIndex(currentProjectIndex + 1);
      setCurrentMediaIndex(0);
    }
  };
  
  const handlePreviousMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };
  
  const handleNextMedia = () => {
    if (currentProject && currentMediaIndex < currentProject.mediaItems.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };
  
  // Handle project creation/loading when media changes
  useEffect(() => {
    const handleMediaChange = async () => {
      if (!currentMedia || !currentMedia.name) {
        console.log('[Project] No media selected, clearing project ID');
        setCurrentProjectId('');
        return;
      }
      
      // Check if we already have a project ID for this specific media instance in this session
      // Use a key that's unique per media item in the current session
      const mediaKey = `${currentMedia.name}_${currentMediaIndex}`;
      const existingProjectId = projectsMap.get(mediaKey);
      if (existingProjectId) {
        console.log('[Project] Using existing project for this session:', existingProjectId);
        setCurrentProjectId(existingProjectId);
        return;
      }
      
      // ALWAYS create a new project for each media upload
      // This ensures each upload gets its own folder as requested
      console.log('[Project] Creating new project for media:', currentMedia.name);
      
      try {
        const projectId = await projectService.createProject(currentMedia.name, projectName);
        
        if (!projectId) {
          console.error('[Project] Failed to create project - no project ID returned');
          return;
        }
        
        // Update the map and current project ID
        setProjectsMap(prev => new Map(prev).set(mediaKey, projectId));
        setCurrentProjectId(projectId);
        console.log('[Project] Set current project ID:', projectId);
      } catch (error) {
        console.error('[Project] Error creating project:', error);
        // Still allow the app to work without project persistence
        console.warn('[Project] Working in temporary mode without server persistence');
      }
    };
    
    handleMediaChange();
  }, [currentMedia, projectName]);

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
          userFullName="משתמש"
          permissions="DEF"
          onLogout={() => router.push('/login')}
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
        projectTitle={projectName}
        progress={45}
      />
      

      {/* Main Content with max-width container */}
      <div className={`main-content ${
        headerLocked ? 'header-locked' : ''
      } ${
        sidebarLocked ? 'sidebar-locked' : ''
      }`}>
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
              currentProject={hasProjects ? currentProjectIndex + 1 : 0}
              totalProjects={projects.length}
              currentMedia={hasMedia ? currentMediaIndex + 1 : 0}
              totalMedia={currentProject?.mediaItems.length || 0}
              mediaName={mediaName}
              mediaDuration={mediaDuration}
              mediaSize={mediaSize}
              onPreviousProject={handlePreviousProject}
              onNextProject={handleNextProject}
              onPreviousMedia={handlePreviousMedia}
              onNextMedia={handleNextMedia}
              onAddProject={handleAddProject}
              onAddMedia={handleAddMedia}
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
              key={`${currentProjectIndex}-${currentMediaIndex}`}
              initialMedia={currentMedia ? (() => {
                // Check if we have a file or URL
                let mediaUrl = '';
                if (currentMedia.type === 'url' && currentMedia.url) {
                  mediaUrl = currentMedia.url;
                } else if (currentMedia.file) {
                  mediaUrl = URL.createObjectURL(currentMedia.file);
                } else if (currentMedia.name && currentProject?.projectId) {
                  // For backend-loaded projects, construct the media URL
                  // The media file is stored in the project folder on the server
                  const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                    ? 'http://localhost:5000' 
                    : '';
                  mediaUrl = `${apiUrl}/api/projects/${currentProject.projectId}/media/${encodeURIComponent(currentMedia.name)}`;
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
                  if (hasProjects && currentMedia?.name) {
                    return currentMedia.name;
                  }
                  
                  // No media or transcription
                  return '';
                })()}
                mediaDuration={mediaDuration}
                projectName={projectName}
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
                    await loadProjectData(selectedTranscription.projectId);
                  }
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
                      
                      const response = await fetch(`http://localhost:5000/api/transcription/projects/${transcriptionToDelete.projectId}`, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
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
                    // Clear the media projects too
                    setProjects([]);
                    setCurrentProjectIndex(0);
                    setCurrentMediaIndex(0);
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
                        const response = await fetch(`http://localhost:5000/api/transcription/projects/${transcriptionToDelete.projectId}`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          credentials: 'include'
                        });
                        
                        if (!response.ok) {
                          console.error(`Failed to delete project ${transcriptionToDelete.projectId}`);
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
                    // Clear the media projects too
                    setProjects([]);
                    setCurrentProjectIndex(0);
                    setCurrentMediaIndex(0);
                  }
                }}
              />
            </div>

          </div>

          {/* Side Workspace */}
          <div className="side-workspace">
            {/* Speaker Component */}
            <div className={`speaker-container ${
              helperFilesExpanded ? 'compressed' : 'normal'
            }`}>
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
            <div className={`remarks-container ${
              helperFilesExpanded ? 'compressed' : 'normal'
            }`}>
              <Remarks theme="transcription" />
            </div>

            {/* HelperFiles Component */}
            <div className={`helper-files ${
              helperFilesExpanded ? 'expanded' : 'collapsed'
            }`}>
              <HelperFiles 
                isExpanded={helperFilesExpanded}
                onToggle={() => setHelperFilesExpanded(!helperFilesExpanded)}
                projects={projects.map((proj, idx) => ({
                  id: `proj-${idx}`,
                  name: proj.name,
                  mediaItems: proj.mediaItems.map((media, mIdx) => ({
                    id: `media-${idx}-${mIdx}`,
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
    </HoveringBarsLayout>
  );
}