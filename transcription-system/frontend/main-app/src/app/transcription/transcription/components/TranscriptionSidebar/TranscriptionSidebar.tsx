'use client';

import React, { useEffect, useRef, useState } from 'react';
import useProjectStore from '@/lib/stores/projectStore';
import './TranscriptionSidebar.css';
import { buildApiUrl } from '@/utils/api';

export interface TranscriptionSidebarProps {
  onOpenManagementModal?: (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => void;
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
}

export default function TranscriptionSidebar(props: TranscriptionSidebarProps) {
  console.log('[TranscriptionSidebar] Component function called');
  
  const [isMounted, setIsMounted] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{
    quotaLimitMB: number;
    quotaUsedMB: number;
    usedPercent: number;
  } | null>(null);
  
  // Inline notification state
  const [sidebarNotification, setSidebarNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'loading';
    progress?: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // Helper function to show sidebar notifications
  const showSidebarNotification = (message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info', autoHide: boolean = true) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    
    setSidebarNotification({ message, type });
    
    // Auto-hide after 4 seconds for non-loading notifications
    if (autoHide && type !== 'loading') {
      notificationTimeoutRef.current = setTimeout(() => {
        setSidebarNotification(null);
      }, 4000);
    }
  };
  
  const hideSidebarNotification = () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setSidebarNotification(null);
  };
  
  // Load orphaned transcriptions count
  useEffect(() => {
    const loadOrphanedCount = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        const response = await fetch(buildApiUrl('/api/projects/orphaned/transcriptions'), {
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

  // Load user storage info
  useEffect(() => {
    let retryCount = 0;
    let intervalId: NodeJS.Timeout | null = null;
    
    const loadStorageInfo = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token || token === 'dev-anonymous') {
          // Don't try to load storage for anonymous users
          return;
        }
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(buildApiUrl('/api/auth/storage'), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            if (data.storage) {
              setStorageInfo(data.storage);
            }
            retryCount = 0; // Reset retry count on success
          } else if (response.status === 401) {
            // Token is invalid, don't keep trying
            console.log('Storage info not available - user not authenticated');
            // Stop the interval for auth errors
            if (intervalId) {
              clearInterval(intervalId);
            }
          } else if (response.status === 404) {
            // Endpoint not found - backend might not support this yet
            console.log('Storage endpoint not available');
            // Stop the interval if endpoint doesn't exist
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          retryCount++;
          
          // Only log on first failure to avoid spamming console
          if (retryCount === 1) {
            if (fetchError.name === 'AbortError') {
              console.log('Storage info request timed out');
            } else {
              // Network error - backend might be down
              console.log('Backend not reachable - storage info unavailable');
            }
          }
          
          // Stop trying after 3 failed attempts
          if (retryCount >= 3 && intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        // Silent fail - don't log to console
      }
    };
    
    loadStorageInfo();
    // Refresh storage info every 30 seconds
    intervalId = setInterval(loadStorageInfo, 30000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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
  
  // Log when projects change and auto-select first project if none selected
  useEffect(() => {
    console.log('[TranscriptionSidebar] Projects changed:', projects.length, 'projects');
    console.log('[TranscriptionSidebar] Current isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Current error:', error);
    if (projects.length > 0) {
      console.log('[TranscriptionSidebar] First project:', projects[0].projectId);
      
      // Auto-select first project if no project is currently selected
      if (!currentProject && projects[0]) {
        console.log('[TranscriptionSidebar] Auto-selecting first project:', projects[0].projectId);
        setCurrentProject(projects[0]);
        
        // Auto-load first media if available
        if (projects[0].mediaFiles && projects[0].mediaFiles.length > 0) {
          const firstMediaId = projects[0].mediaFiles[0];
          console.log('[TranscriptionSidebar] Auto-loading first media:', firstMediaId);
          setCurrentMediaById(projects[0].projectId, firstMediaId);
        }
      }
    }
  }, [projects, isLoading, error, currentProject, setCurrentProject, setCurrentMediaById]);
  
  const handleFolderUpload = async () => {
    // Directly open the folder selection dialog
    folderInputRef.current?.click();
  };
  
  // Helper functions for statistics
  const getTotalTranscriptions = () => {
    return orphanedCount; // Show orphaned transcriptions count instead
  };

  const getStorageColor = (percent: number) => {
    if (percent < 50) return '#4CAF50';
    if (percent < 70) return '#66BB6A';
    if (percent < 85) return '#388E3C';
    return '#1B5E20';
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
      const response = await fetch(buildApiUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showSidebarNotification('הפרויקט נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה במחיקת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showSidebarNotification('שגיאה במחיקת הפרויקט', 'error');
    }
  };
  
  const handleMediaDelete = async (projectId: string, mediaId: string, deleteTranscriptions: boolean) => {
    if (props.onMediaDelete) {
      return props.onMediaDelete(projectId, mediaId, deleteTranscriptions);
    }
    // Default implementation if no handler provided
    try {
      const response = await fetch(buildApiUrl(`/api/projects/${projectId}/media/${mediaId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showSidebarNotification('קובץ המדיה נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה במחיקת קובץ המדיה', 'error');
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      showSidebarNotification('שגיאה במחיקת קובץ המדיה', 'error');
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
        showSidebarNotification('לא נמצאו קבצי מדיה בתיקייה שנבחרה', 'error');
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
      
      // Show loading notification
      setIsUploading(true);
      showSidebarNotification('טוען פרויקט...', 'loading', false);
      
      // Use the store method to create project
      console.log('[TranscriptionSidebar] About to call createProjectFromFolder with formData:', formData);
      const newProject = await createProjectFromFolder(formData);
      console.log('[TranscriptionSidebar] createProjectFromFolder returned:', newProject);
      
      // Check if it's an error response
      if (newProject && newProject.error === 'storage_limit' && newProject.storageDetails) {
        const { currentUsedMB, limitMB, requestedMB } = newProject.storageDetails;
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'info');
        console.log('[TranscriptionSidebar] Storage limit reached:', newProject.storageDetails);
      } else if (newProject && !newProject.error) {
        showSidebarNotification(`הפרויקט "${folderName}" נוצר בהצלחה`, 'success');
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
        // Generic error - check store error for more details
        const storeError = error || 'שגיאה ביצירת הפרויקט';
        showSidebarNotification(storeError, 'info');
        console.log('[TranscriptionSidebar] Project creation failed');
      }
      
    } catch (error: any) {
      // This should rarely happen now since we're not throwing in the store
      console.log('[TranscriptionSidebar] Unexpected error:', error.message);
      showSidebarNotification('שגיאה לא צפויה', 'info');
    } finally {
      setIsUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
      
      // Hide loading notification after a delay if still showing
      if (sidebarNotification?.type === 'loading') {
        setTimeout(() => hideSidebarNotification(), 500);
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

      {/* Storage Display */}
      {storageInfo && (
        <div className="sidebar-storage" title="אחסון">
          <div className="storage-info-display">
            <div className="storage-text-compact">
              <div className="storage-size-display">
                <span className="storage-used">{storageInfo.quotaUsedMB}MB</span>
                <span className="storage-separator"> / </span>
                <span className="storage-total">{storageInfo.quotaLimitMB}MB</span>
              </div>
            </div>
            <div className="storage-progress-bar-compact">
              <div 
                className="storage-progress-fill"
                style={{
                  width: `${Math.min(storageInfo.usedPercent, 100)}%`,
                  backgroundColor: getStorageColor(storageInfo.usedPercent)
                }}
              />
              <div className="storage-progress-text">
                {Math.round(storageInfo.usedPercent)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inline Notification Area */}
      {sidebarNotification && (
        <div className={`sidebar-notification sidebar-notification-${sidebarNotification.type}`}>
          {sidebarNotification.type === 'loading' && (
            <div className="notification-progress-bar">
              <div className="notification-progress-fill" />
            </div>
          )}
          <div className="notification-message">
            {sidebarNotification.message}
          </div>
        </div>
      )}
      
      <div className="project-list">
        {projects.length === 0 && !isLoading ? (
          <div className="empty-projects">
            <p>אין פרויקטים</p>
            <p className="hint">העלה תיקייה עם קבצי מדיה כדי ליצור פרויקט חדש</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.length > 0 && (
              <h3 className="projects-title">פרויקטים ({projects.length})</h3>
            )}
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
    </>
  );
}