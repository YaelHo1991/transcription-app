'use client';

import React, { useEffect, useRef } from 'react';
import useProjectStore from '@/lib/stores/projectStore';
import { NotificationModal, useNotification } from '@/components/NotificationModal/NotificationModal';
import './TranscriptionSidebar.css';

interface TranscriptionSidebarProps {
  // Add props as needed
}

export default function TranscriptionSidebar(props: TranscriptionSidebarProps) {
  const { 
    projects = [], // Default to empty array if undefined
    currentProject, 
    currentMedia,
    loading,
    loadProjects, 
    selectProject,
    addProject,
    clearAllProjects 
  } = useProjectStore();
  
  const { notification, showNotification, hideNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Load projects on mount if not already loaded
    if (projects.length === 0 && !loading) {
      loadProjects();
    }
    // Log to verify component is updated
    console.log('[TranscriptionSidebar] Component mounted - v2 with clear button', { projects });
  }, []);
  
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
      
      // Create media file objects with File reference for blob URL creation
      const mediaFileObjects = mediaFiles.map((file, index) => ({
        id: `media-${Date.now()}-${index}`,
        name: file.name,
        type: 'local' as const,
        file: file,
        mimeType: file.type,
        size: file.size,
        duration: '00:00' // Will be extracted when loaded
      }));
      
      // Create project from folder
      const newProject = {
        projectId: `proj-${Date.now()}`,
        name: folderName,
        displayName: folderName,
        mediaFiles: mediaFileObjects,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentMediaIndex: 0
      };
      
      // Add to store and select it
      addProject(newProject);
      showNotification(`הפרויקט "${folderName}" נוסף בהצלחה`, 'success');
      
      // Try to save to backend but don't fail if it doesn't work
      try {
        await saveProjectToBackend(newProject, mediaFiles);
      } catch (backendError) {
        console.warn('Failed to save to backend, but project is available locally:', backendError);
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
  
  const saveProjectToBackend = async (project: any, files: File[]) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      const formData = new FormData();
      formData.append('userId', getUserIdFromToken());
      formData.append('folderName', project.name);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch('http://localhost:5000/api/projects/create-from-folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to save project');
      }
    } catch (error) {
      console.error('Failed to save project to backend:', error);
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
  
  const getUserIdFromToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId || 'anonymous';
      } catch (error) {
        return 'anonymous';
      }
    }
    return 'anonymous';
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
        {/* Debug button - remove in production */}
        {projects.length > 0 && (
          <button 
            className="sidebar-clear-button"
            onClick={() => {
              if (confirm('למחוק את כל הפרויקטים?')) {
                clearAllProjects();
                showNotification('כל הפרויקטים נמחקו', 'info');
              }
            }}
            style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(220, 53, 69, 0.2)',
              border: '1px solid rgba(220, 53, 69, 0.5)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            🗑️ נקה את כל הפרויקטים
          </button>
        )}
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
        {projects.length === 0 && !loading && (
          <div className="empty-projects">
            <p>אין פרויקטים</p>
            <p className="hint">לחץ על + להוספת פרויקט</p>
          </div>
        )}
        {loading && (
          <div className="loading-projects">
            <p>טוען פרויקטים...</p>
          </div>
        )}
        {Array.isArray(projects) && projects.map((project) => (
          <div
            key={project.projectId}
            className={`project-item ${currentProject?.projectId === project.projectId ? 'active' : ''}`}
            onClick={() => selectProject(project)}
            data-project-id={project.projectId}
          >
            <h4 className="project-item-title">{project.displayName || project.name}</h4>
            <div className="project-item-meta">
              <span>{project.mediaFiles.length} קבצים</span>
              <span>{project.mediaFiles[0]?.duration || '00:00'}</span>
            </div>
            <span className="project-type-badge crm">
              {project.mediaFiles[0]?.type === 'url' ? 'URL' : 'מקומי'}
            </span>
          </div>
        ))}
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