'use client';

import React, { useEffect, useRef, useState } from 'react';
import useProjectStore from '@/lib/stores/projectStore';
import { NotificationModal, useNotification } from '@/components/NotificationModal/NotificationModal';
import './TranscriptionSidebar.css';

export interface TranscriptionSidebarProps {
  onOpenManagementModal?: (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => void;
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
}

export default function TranscriptionSidebar(props: TranscriptionSidebarProps) {
  console.log('[TranscriptionSidebar] Component function called');
  
  const [isMounted, setIsMounted] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  
  const { 
    projects,
    currentProject,
    currentMedia,
    currentMediaId,
    isLoading,
    error,
    loadProjects,
    setCurrentProject,
    setCurrentMedia,
    setCurrentMediaById,
    createProjectFromFolder,
    setError
  } = useProjectStore();
  
  console.log('[TranscriptionSidebar] Store accessed successfully');
  
  const { notification, showNotification, hideNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // Load orphaned transcriptions count
  useEffect(() => {
    const loadOrphanedCount = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        const response = await fetch('http://localhost:5000/api/projects/orphaned/transcriptions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrphanedCount(data.transcriptions?.length || 0);
        }
      } catch (error) {
        console.error('Failed to load orphaned transcriptions count:', error);
      }
    };
    
    loadOrphanedCount();
  }, [projects]); // Reload when projects change
  
  // Load projects with a small delay to avoid race conditions
  useEffect(() => {
    console.log('[TranscriptionSidebar] Component mounted - will load projects after delay');
    console.log('[TranscriptionSidebar] loadProjects function:', typeof loadProjects);
    console.log('[TranscriptionSidebar] Initial isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Initial projects:', projects.length);
    
    // Small delay to avoid simultaneous requests on page load
    const timer = setTimeout(() => {
      console.log('[TranscriptionSidebar] Calling loadProjects now...');
      loadProjects();
      setIsMounted(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Log when projects change
  useEffect(() => {
    console.log('[TranscriptionSidebar] Projects changed:', projects.length, 'projects');
    console.log('[TranscriptionSidebar] Current isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Current error:', error);
    if (projects.length > 0) {
      console.log('[TranscriptionSidebar] First project:', projects[0].projectId);
    }
  }, [projects, isLoading, error]);
  
  const handleFolderUpload = async () => {
    // Show custom styled confirmation before browser dialog
    showNotification('בחר תיקייה להעלאה. כל קבצי המדיה בתיקייה ייטענו לפרויקט', 'info', 4000);
    // Small delay to let user see the message
    setTimeout(() => {
      folderInputRef.current?.click();
    }, 500);
  };
  
  // Helper functions for statistics
  const getTotalTranscriptions = () => {
    return orphanedCount; // Show orphaned transcriptions count instead
  };
  
  const getTotalDuration = () => {
    // Calculate total duration from all media files
    let totalSeconds = 0;
    projects.forEach(project => {
      if (project.mediaInfo) {
        project.mediaInfo.forEach(media => {
          totalSeconds += media.duration || 0;
        });
      }
    });
    
    // Format duration as HH:MM:SS
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    // Always return in HH:MM:SS format, default to 00:00:00 if no duration
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleStatClick = (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => {
    if (props.onOpenManagementModal) {
      props.onOpenManagementModal(tab);
    }
  };
  
  const handleProjectDelete = async (projectId: string, deleteTranscriptions: boolean) => {
    if (props.onProjectDelete) {
      return props.onProjectDelete(projectId, deleteTranscriptions);
    }
    // Default implementation if no handler provided
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showNotification('הפרויקט נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showNotification('שגיאה במחיקת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showNotification('שגיאה במחיקת הפרויקט', 'error');
    }
  };
  
  const handleMediaDelete = async (projectId: string, mediaId: string, deleteTranscriptions: boolean) => {
    if (props.onMediaDelete) {
      return props.onMediaDelete(projectId, mediaId, deleteTranscriptions);
    }
    // Default implementation if no handler provided
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showNotification('קובץ המדיה נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showNotification('שגיאה במחיקת קובץ המדיה', 'error');
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      showNotification('שגיאה במחיקת קובץ המדיה', 'error');
    }
  };
  
  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[TranscriptionSidebar] handleFilesSelected called');
    const files = event.target.files;
    console.log('[TranscriptionSidebar] Files selected:', files?.length || 0);
    if (!files || files.length === 0) return;
    
    try {
      // Extract folder name from path
      let folderName = 'New Project';
      if (files[0] && 'webkitRelativePath' in files[0]) {
        const path = (files[0] as any).webkitRelativePath;
        folderName = path.split('/')[0];
      }
      
      // Filter for media files only
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        file.type.startsWith('video/')
      );
      
      if (mediaFiles.length === 0) {
        showNotification('לא נמצאו קבצי מדיה בתיקייה שנבחרה', 'warning');
        return;
      }
      
      // Create FormData for upload
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      formData.append('folderName', folderName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Send filenames separately to preserve UTF-8 encoding
      const fileNames = mediaFiles.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      mediaFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Use the store method to create project
      console.log('[TranscriptionSidebar] About to call createProjectFromFolder with formData:', formData);
      const newProject = await createProjectFromFolder(formData);
      console.log('[TranscriptionSidebar] createProjectFromFolder returned:', newProject);
      
      if (newProject) {
        showNotification(`הפרויקט "${folderName}" נוצר בהצלחה עם ${mediaFiles.length} קבצי מדיה`, 'success');
        console.log('[TranscriptionSidebar] Project created successfully:', newProject);
        
        // Auto-select the new project and its first media
        console.log('[TranscriptionSidebar] Auto-selecting new project:', newProject.projectId);
        setCurrentProject(newProject);
        
        if (newProject.mediaFiles && newProject.mediaFiles.length > 0) {
          const firstMediaId = newProject.mediaFiles[0];
          console.log('[TranscriptionSidebar] Auto-selecting first media:', firstMediaId);
          await setCurrentMediaById(newProject.projectId, firstMediaId);
        }
      } else {
        showNotification('שגיאה ביצירת הפרויקט', 'error');
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      showNotification(`שגיאה בהעלאת הפרויקט: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  
  const generateComputerId = () => {
    const fingerprint = [
      navigator.platform,
      navigator.language,
      navigator.hardwareConcurrency,
      screen.width,
      screen.height
    ].join('-');
    return btoa(fingerprint).substring(0, 16);
  };
  
  return (
    <>
      <div className="transcription-sidebar-content">
        {/* Upload button at top of sidebar */}
      <div className="sidebar-upload-section">
        <button 
          className="sidebar-upload-button"
          onClick={handleFolderUpload}
          title="הוסף פרויקט חדש"
        >
          <span className="upload-plus">+</span>
          <span className="upload-text">פרויקט חדש</span>
        </button>
        {/* Debug button removed - project management disabled */}
      </div>
      
      <div className="sidebar-stats">
        <h3 className="sidebar-stats-title">סטטיסטיקות</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('projects')}>
            <div className="sidebar-stat-number">{projects.length}</div>
            <div className="sidebar-stat-label">פרויקטים</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('transcriptions')}>
            <div className="sidebar-stat-number">{getTotalTranscriptions()}</div>
            <div className="sidebar-stat-label">תמלולים</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('duration')}>
            <div className="sidebar-stat-number">{getTotalDuration()}</div>
            <div className="sidebar-stat-label">משך כולל</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('progress')}>
            <div className="sidebar-stat-number">-</div>
            <div className="sidebar-stat-label">התקדמות</div>
          </div>
        </div>
      </div>
      
      <div className="project-list">
        {isLoading ? (
          <div className="loading-projects">
            <p>טוען פרויקטים...</p>
          </div>
        ) : error ? (
          <div className="error-projects">
            <p>שגיאה בטעינת פרויקטים</p>
            <p className="error-message">{error}</p>
            <button onClick={() => { setError(null); loadProjects(); }}>נסה שוב</button>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-projects">
            <p>אין פרויקטים</p>
            <p className="hint">העלה תיקייה עם קבצי מדיה כדי ליצור פרויקט חדש</p>
          </div>
        ) : (
          <div className="projects-list">
            <h3 className="projects-title">פרויקטים ({projects.length})</h3>
            {projects.map(project => (
              <div 
                key={project.projectId} 
                className={`project-item ${currentProject?.projectId === project.projectId ? 'active' : ''}`}
                onClick={async () => {
                  setCurrentProject(project);
                  // Auto-load first media when project is selected
                  if (project.mediaFiles && project.mediaFiles.length > 0) {
                    const firstMediaId = project.mediaFiles[0];
                    await setCurrentMediaById(project.projectId, firstMediaId);
                  }
                }}
              >
                <div className="project-header">
                  <span className="project-name">{project.displayName}</span>
                </div>
                <div className="project-meta">
                  <span className="media-count">{project.totalMedia} קבצים</span>
                  <span className="project-date">
                    {new Date(project.lastModified).toLocaleDateString('he-IL')}
                  </span>
                </div>
                {currentProject?.projectId === project.projectId && (
                  <div className="media-list">
                    {project.mediaFiles.map((mediaId, index) => (
                      <div 
                        key={mediaId} 
                        className={`media-item ${currentMediaId === mediaId ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentMediaById(project.projectId, mediaId);
                        }}
                      >
                        <span className="media-name">קובץ {index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in React types
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      </div>
      
      {/* Notification Modal */}
      <NotificationModal
        message={notification.message}
        type={notification.type}
        duration={notification.duration}
        isOpen={notification.isOpen}
        onClose={hideNotification}
      />
    </>
  );
}