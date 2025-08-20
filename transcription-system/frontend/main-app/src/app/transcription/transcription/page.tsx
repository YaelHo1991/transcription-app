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

export default function TranscriptionWorkPage() {
  const router = useRouter();
  
  // Create a unique session ID for this transcription session
  const [sessionId, setSessionId] = useState(() => {
    // Try to get from URL params first (for saved sessions)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSessionId = params.get('session');
      return urlSessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return `session-${Date.now()}`;
  });
  
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
  
  // Project and media management
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [actualMediaDuration, setActualMediaDuration] = useState<number>(0);
  
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
  const projectName = currentProject?.name || 'אין פרויקט';
  const mediaName = currentMedia?.name || (hasMedia ? '' : 'אין מדיה נטענת');
  const mediaSize = currentMedia?.size || (hasMedia ? '' : '0 MB');
  
  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const mediaDuration = formatDuration(actualMediaDuration);
  
  const handleMediaUpload = (files: FileList) => {
    // Create project if none exists
    if (projects.length === 0) {
      const newProject: Project = {
        name: 'פרויקט חדש',
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
          name: 'פרויקט חדש',
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
          <RemarksProvider transcriptionId={currentProjectId || sessionId || `temp-${Date.now()}`}>
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
              onAddMedia={handleAddMedia}
              onAddProject={handleAddProject}
              onMediaDrop={handleMediaUpload}
              onProjectDrop={handleProjectUpload}
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
                const mediaUrl = currentMedia.type === 'url' ? currentMedia.url! : URL.createObjectURL(currentMedia.file!);
                console.log('Page: Creating media object', {
                  url: mediaUrl,
                  name: currentMedia.name,
                  type: currentMedia.name.match(/\.(mp4|webm|ogg|ogv)$/i) ? 'video' : 'audio',
                  file: currentMedia.file
                });
                return {
                  url: mediaUrl,
                  name: currentMedia.name,
                  type: currentMedia.name.match(/\.(mp4|webm|ogg|ogv)$/i) ? 'video' : 'audio'
                };
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
                mediaFileName={currentMedia?.name || ''}
                mediaDuration={mediaDuration}
                projectName={projectName}
                speakerComponentRef={speakerComponentRef}
                onSeek={(time) => {
                  console.log('Seek to time:', time);
                }}
                enabled={true}
                projects={projects}
                currentProjectIndex={currentProjectIndex}
                onProjectChange={(index) => {
                  setCurrentProjectIndex(index);
                  setCurrentMediaIndex(0);
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
    </HoveringBarsLayout>
  );
}