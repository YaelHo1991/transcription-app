'use client';

import React, { useEffect, useRef, useState } from 'react';
import useProjectStore from '@/lib/stores/projectStore';
import { NotificationModal, useNotification } from '@/components/NotificationModal/NotificationModal';
import './TranscriptionSidebar.css';

interface TranscriptionSidebarProps {
  // Add props as needed
}

export default function TranscriptionSidebar(props: TranscriptionSidebarProps) {
  console.log('[TranscriptionSidebar] Component function called');
  
  const [isMounted, setIsMounted] = useState(false);
  
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
  
  // Load projects immediately on mount
  useEffect(() => {
    console.log('[TranscriptionSidebar] Component mounted - loading projects');
    console.log('[TranscriptionSidebar] loadProjects function:', typeof loadProjects);
    loadProjects();
    setIsMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Log when projects change
  useEffect(() => {
    console.log('[TranscriptionSidebar] Projects changed:', projects.length, 'projects');
    if (projects.length > 0) {
      console.log('[TranscriptionSidebar] First project:', projects[0].projectId);
    }
  }, [projects]);
  
  const handleFolderUpload = async () => {
    // Show custom styled confirmation before browser dialog
    showNotification('בחר תיקייה להעלאה. כל קבצי המדיה בתיקייה ייטענו לפרויקט', 'info', 4000);
    // Small delay to let user see the message
    setTimeout(() => {
      folderInputRef.current?.click();
    }, 500);
  };
  
  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
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
      const newProject = await createProjectFromFolder(formData);
      
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
        <h3 className="sidebar-stats-title">סטטיסטיקות (v2)</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">12</div>
            <div className="sidebar-stat-label">פרויקטים</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">48</div>
            <div className="sidebar-stat-label">קבצים</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">15:30</div>
            <div className="sidebar-stat-label">שעות</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">85%</div>
            <div className="sidebar-stat-label">הושלם</div>
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
                onClick={() => setCurrentProject(project)}
              >
                <div className="project-header">
                  <span className="project-name">{project.displayName}</span>
                  <span className="media-count">{project.totalMedia} קבצים</span>
                </div>
                <div className="project-meta">
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
                        <span className="media-name">מדיה {index + 1}</span>
                        <span className="media-id" style={{ fontSize: '0.75em', opacity: 0.7 }}>{mediaId}</span>
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