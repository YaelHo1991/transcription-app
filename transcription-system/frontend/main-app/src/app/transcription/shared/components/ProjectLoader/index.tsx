'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectUploadButton } from './ProjectUploadButton';
import { MediaBrowser } from './MediaBrowser';
import { MediaStatusIndicator } from './MediaStatusIndicator';
import { 
  Project, 
  MediaFile, 
  ProjectLoaderProps, 
  UploadParams,
  MediaStatus 
} from './types';
import { projectService } from '@/lib/services/projectService';
import styles from './styles.module.css';

export function ProjectLoader({
  context,
  showMediaPlayer = true,
  onProjectLoad,
  onMediaSelect,
  onError
}: ProjectLoaderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean;
    progress: number;
    currentFile?: string;
  }>({ isUploading: false, progress: 0 });
  const [mediaStatus, setMediaStatus] = useState<MediaStatus | null>(null);

  // Load user's projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const userProjects = await projectService.getUserProjects();
      setProjects(userProjects);
      
      // Auto-select first project if exists
      if (userProjects.length > 0 && !currentProject) {
        handleProjectSelect(userProjects[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpload = async (params: UploadParams) => {
    setUploadStatus({ isUploading: true, progress: 0 });
    
    try {
      // Create project from folder
      const newProject = await projectService.createProjectFromFolder(params);
      
      // Update progress
      setUploadStatus({ isUploading: true, progress: 50 });
      
      // Load page-specific data if needed
      if (context === 'transcription') {
        await projectService.loadTranscriptionData(newProject.projectId);
      }
      
      setUploadStatus({ isUploading: true, progress: 100 });
      
      // Add to projects list
      setProjects(prev => [...prev, newProject]);
      
      // Select the new project
      handleProjectSelect(newProject);
      
      // Notify parent
      onProjectLoad(newProject);
      
    } catch (error) {
      console.error('Upload failed:', error);
      onError?.(error as Error);
    } finally {
      setTimeout(() => {
        setUploadStatus({ isUploading: false, progress: 0 });
      }, 500);
    }
  };

  const handleProjectSelect = useCallback((project: Project) => {
    setCurrentProject(project);
    
    // Select first media if available
    if (project.mediaFiles.length > 0) {
      handleMediaSelect(project.mediaFiles[0]);
    }
    
    // Check media availability
    checkMediaAvailability(project);
    
    // Notify parent
    onProjectLoad(project);
  }, [onProjectLoad]);

  const handleMediaSelect = useCallback((media: MediaFile) => {
    setCurrentMedia(media);
    
    // Check if media is available on current computer
    const computerId = localStorage.getItem('computerId') || '';
    const isAvailable = media.type === 'url' || 
                       media.type === 'server' ||
                       (media.sources && media.sources[computerId]);
    
    setMediaStatus({
      mediaId: media.mediaId,
      available: isAvailable,
      missingPath: media.sources[computerId]?.path,
      needsRelocate: !isAvailable && media.type === 'local'
    });
    
    onMediaSelect?.(media);
  }, [onMediaSelect]);

  const checkMediaAvailability = (project: Project) => {
    const computerId = localStorage.getItem('computerId') || '';
    
    // Check each media file
    project.mediaFiles.forEach(media => {
      if (media.type === 'local' && !media.sources[computerId]) {
        console.warn(`Media not available on this computer: ${media.name}`);
      }
    });
  };

  const handleRelocateMedia = async (mediaId: string, newPath: string) => {
    try {
      const computerId = localStorage.getItem('computerId') || '';
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      await projectService.updateMediaPath(mediaId, computerId, computerName, newPath);
      
      // Reload projects
      await loadProjects();
      
    } catch (error) {
      console.error('Failed to update media path:', error);
      onError?.(error as Error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפרויקט?')) {
      return;
    }
    
    try {
      await projectService.deleteProject(projectId);
      
      // Remove from list
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
      
      // Clear selection if deleted current
      if (currentProject?.projectId === projectId) {
        setCurrentProject(null);
        setCurrentMedia(null);
      }
      
    } catch (error) {
      console.error('Failed to delete project:', error);
      onError?.(error as Error);
    }
  };

  return (
    <div className={styles.projectLoader}>
      {/* Upload Button */}
      <div className={styles.header}>
        <ProjectUploadButton 
          onUpload={handleProjectUpload}
          disabled={uploadStatus.isUploading}
          position={context === 'export' ? 'main-page' : 'media-player'}
        />
        
        {currentProject && (
          <div className={styles.projectTitle}>
            {currentProject.displayName}
          </div>
        )}
      </div>

      {/* Projects List */}
      {projects.length === 0 && !loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📁</div>
          <div className={styles.emptyTitle}>אין פרויקטים</div>
          <div className={styles.emptyText}>
            לחץ על כפתור ה-+ להעלאת תיקייה או קבצי מדיה
          </div>
        </div>
      ) : (
        <div className={styles.projectList}>
          {projects.map(project => (
            <div 
              key={project.projectId}
              className={`${styles.projectItem} ${
                currentProject?.projectId === project.projectId ? styles.active : ''
              }`}
              onClick={() => handleProjectSelect(project)}
            >
              <div className={styles.projectName}>{project.displayName}</div>
              <div className={styles.projectMeta}>
                <div className={styles.mediaCount}>
                  🎵 {project.mediaFiles.length}
                </div>
                <div className={styles.projectDate}>
                  📅 {new Date(project.createdAt).toLocaleDateString('he-IL')}
                </div>
              </div>
              <button 
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.projectId);
                }}
                title="מחק פרויקט"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Media Browser */}
      {currentProject && showMediaPlayer && (
        <MediaBrowser
          project={currentProject}
          currentMedia={currentMedia}
          onMediaSelect={handleMediaSelect}
        />
      )}

      {/* Media Status Indicator */}
      {mediaStatus && !mediaStatus.available && (
        <MediaStatusIndicator
          status={mediaStatus}
          onRelocate={(newPath) => handleRelocateMedia(mediaStatus.mediaId, newPath)}
        />
      )}

      {/* Upload Progress */}
      {uploadStatus.isUploading && (
        <div className={styles.uploadProgress}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitle}>מעלה פרויקט...</div>
            <div className={styles.progressPercent}>{uploadStatus.progress}%</div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${uploadStatus.progress}%` }}
            />
          </div>
          {uploadStatus.currentFile && (
            <div className={styles.progressText}>
              מעבד: {uploadStatus.currentFile}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { Project, MediaFile, ProjectLoaderProps } from './types';