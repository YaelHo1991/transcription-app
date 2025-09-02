'use client';

import React, { useState, useEffect } from 'react';
import './ProjectManagementModal.css';

interface MediaInfo {
  mediaId: string;
  name: string;
  size: number; // Size in bytes
  duration: number; // Duration in seconds
  mimeType?: string;
}

interface Project {
  projectId: string;
  displayName: string;
  totalMedia: number;
  size?: number; // Total size in bytes
  createdAt: string;
  lastModified: string;
  mediaFiles: string[];
  mediaInfo?: MediaInfo[]; // Detailed info for each media file
}

interface ArchivedTranscription {
  id: string;
  originalProjectName: string;
  originalMediaName: string;
  archivedDate: string;
  size: number; // Size in bytes
  blocksCount: number;
  speakersCount: number;
}

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'projects' | 'transcriptions' | 'duration' | 'progress';
  projects: Project[];
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
}

export default function ProjectManagementModal({
  isOpen,
  onClose,
  activeTab = 'projects',
  projects,
  onProjectDelete,
  onMediaDelete
}: ProjectManagementModalProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [archivedTranscriptions, setArchivedTranscriptions] = useState<ArchivedTranscription[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deleteTranscriptions, setDeleteTranscriptions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'media', id: string, mediaId?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isOpen && currentTab === 'transcriptions') {
      loadArchivedTranscriptions();
    }
  }, [isOpen, currentTab]);

  const loadArchivedTranscriptions = async () => {
    try {
      const response = await fetch('/api/archive/transcriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setArchivedTranscriptions(data.transcriptions || []);
      }
    } catch (error) {
      console.error('Failed to load archived transcriptions:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    // Always return HH:MM:SS format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteClick = (type: 'project' | 'media', id: string, mediaId?: string) => {
    setDeleteTarget({ type, id, mediaId });
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setLoading(true);
    try {
      if (deleteTarget.type === 'project' && onProjectDelete) {
        await onProjectDelete(deleteTarget.id, deleteTranscriptions);
      } else if (deleteTarget.type === 'media' && deleteTarget.mediaId && onMediaDelete) {
        await onMediaDelete(deleteTarget.id, deleteTarget.mediaId, deleteTranscriptions);
      }
      
      setShowConfirmDialog(false);
      setDeleteTarget(null);
      setDeleteTranscriptions(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTranscription = async (transcriptionId: string, format: 'word' | 'json') => {
    try {
      const response = await fetch(`/api/archive/transcription/${transcriptionId}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ format })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_${transcriptionId}.${format === 'word' ? 'docx' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const calculateTotalDuration = () => {
    // Calculate total duration from all media files
    let totalSeconds = 0;
    projects.forEach(project => {
      if (project.mediaInfo) {
        project.mediaInfo.forEach(media => {
          totalSeconds += media.duration || 0;
        });
      }
    });
    return totalSeconds;
  };
  
  const calculateProjectSize = (project: Project) => {
    if (project.mediaInfo) {
      return project.mediaInfo.reduce((total, media) => total + (media.size || 0), 0);
    }
    return project.size || 0;
  };
  
  const calculateTotalSize = () => {
    return projects.reduce((total, project) => total + calculateProjectSize(project), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="project-management-modal-overlay" onClick={onClose}>
      <div className="project-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ניהול פרויקטים ותמלולים</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${currentTab === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentTab('projects')}
          >
            פרויקטים
          </button>
          <button 
            className={`tab ${currentTab === 'transcriptions' ? 'active' : ''}`}
            onClick={() => setCurrentTab('transcriptions')}
          >
            תמלולים
          </button>
          <button 
            className={`tab ${currentTab === 'duration' ? 'active' : ''}`}
            onClick={() => setCurrentTab('duration')}
          >
            משך כולל
          </button>
          <button 
            className={`tab ${currentTab === 'progress' ? 'active' : ''}`}
            onClick={() => setCurrentTab('progress')}
          >
            התקדמות
          </button>
        </div>

        <div className="modal-content">
          {/* Projects Tab */}
          {currentTab === 'projects' && (
            <div className="projects-tab">
              <div className="projects-stats-bar">
                <span>סה"כ פרויקטים: {projects.length}</span>
                <span>נפח כולל: {formatSize(calculateTotalSize())}</span>
                <span>משך כולל: {formatDuration(calculateTotalDuration())}</span>
              </div>
              <div className="projects-grid">
                {projects.map(project => {
                  const projectSize = calculateProjectSize(project);
                  return (
                    <div 
                      key={project.projectId} 
                      className={`project-grid-item ${selectedProject === project.projectId ? 'selected' : ''}`}
                      onClick={() => setSelectedProject(selectedProject === project.projectId ? null : project.projectId)}
                    >
                      <div className="project-icon">📁</div>
                      <div className="project-name">{project.displayName}</div>
                      <div className="project-stats">
                        <span>{project.totalMedia} קבצים</span>
                        <span>{formatSize(projectSize)}</span>
                      </div>
                      <div className="project-date">
                        {new Date(project.lastModified).toLocaleDateString('he-IL')}
                      </div>
                      
                      <div className="project-hover-actions">
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick('project', project.projectId);
                          }}
                          title="מחק פרויקט"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Media Details Panel - Outside of grid */}
              {selectedProject && (
                <>
                  <div className="media-details-overlay" onClick={() => setSelectedProject(null)} />
                  <div className="media-details-panel">
                    <button className="close-panel-btn" onClick={() => setSelectedProject(null)}>×</button>
                    {(() => {
                      const project = projects.find(p => p.projectId === selectedProject);
                      if (!project) return null;
                      return (
                        <>
                          <h4>קבצי מדיה - {project.displayName}</h4>
                          <div className="media-list-detailed">
                            {project.mediaInfo && project.mediaInfo.length > 0 ? (
                              project.mediaInfo.map((media) => (
                                <div key={media.mediaId} className="media-detail-item">
                                  <div className="media-icon">🎵</div>
                                  <div className="media-info">
                                    <div className="media-name">{media.name}</div>
                                    <div className="media-meta">
                                      <span>{formatSize(media.size)}</span>
                                      <span>{formatDuration(media.duration)}</span>
                                    </div>
                                  </div>
                                  <button 
                                    className="delete-media-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick('media', project.projectId, media.mediaId);
                                    }}
                                    title="מחק מדיה"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))
                            ) : (
                              project.mediaFiles.map((mediaId, index) => (
                                <div key={mediaId} className="media-detail-item">
                                  <div className="media-icon">🎵</div>
                                  <div className="media-info">
                                    <div className="media-name">קובץ {index + 1}</div>
                                    <div className="media-meta">
                                      <span className="media-id">{mediaId}</span>
                                    </div>
                                  </div>
                                  <button 
                                    className="delete-media-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick('media', project.projectId, mediaId);
                                    }}
                                    title="מחק מדיה"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Transcriptions Tab */}
          {currentTab === 'transcriptions' && (
            <div className="transcriptions-tab">
              <h3>תמלולים בארכיון</h3>
              <div className="archived-transcriptions-list">
                {archivedTranscriptions.length === 0 ? (
                  <p className="no-archived">אין תמלולים בארכיון</p>
                ) : (
                  archivedTranscriptions.map(transcription => (
                    <div key={transcription.id} className="archived-transcription-item">
                      <div className="transcription-info">
                        <h4>{transcription.originalProjectName} / {transcription.originalMediaName}</h4>
                        <div className="transcription-meta">
                          <span>📅 {new Date(transcription.archivedDate).toLocaleDateString('he-IL')}</span>
                          <span>💾 {formatSize(transcription.size)}</span>
                          <span>📝 {transcription.blocksCount} בלוקים</span>
                          <span>👥 {transcription.speakersCount} דוברים</span>
                        </div>
                      </div>
                      
                      <div className="transcription-actions">
                        <button 
                          className="preview-btn"
                          onClick={() => {/* TODO: Implement preview */}}
                        >
                          👁️ תצוגה מקדימה
                        </button>
                        <button 
                          className="export-word-btn"
                          onClick={() => exportTranscription(transcription.id, 'word')}
                        >
                          📄 Word
                        </button>
                        <button 
                          className="export-json-btn"
                          onClick={() => exportTranscription(transcription.id, 'json')}
                        >
                          💾 JSON
                        </button>
                        <button 
                          className="delete-transcription-btn"
                          onClick={() => {/* TODO: Implement delete */}}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Duration Tab */}
          {currentTab === 'duration' && (
            <div className="duration-tab">
              <h3>משך כולל של קבצי מדיה</h3>
              <div className="total-duration">
                <span className="duration-value">{formatDuration(calculateTotalDuration())}</span>
                <div className="duration-breakdown">
                  <span>סה"כ פרויקטים: {projects.length}</span>
                  <span>סה"כ קבצים: {projects.reduce((sum, p) => sum + p.totalMedia, 0)}</span>
                </div>
              </div>
              
              <div className="projects-duration-list">
                {projects.map(project => {
                  const projectDuration = project.mediaInfo 
                    ? project.mediaInfo.reduce((sum, media) => sum + (media.duration || 0), 0)
                    : 0;
                  return (
                    <div key={project.projectId} className="project-duration-item">
                      <div className="project-duration-header">
                        <h4>{project.displayName}</h4>
                        <span className="project-total-duration">{formatDuration(projectDuration)}</span>
                      </div>
                      <div className="media-duration-list">
                        {project.mediaInfo && project.mediaInfo.length > 0 ? (
                          project.mediaInfo.map((media) => (
                            <div key={media.mediaId} className="media-duration-item">
                              <div className="media-icon-small">🎵</div>
                              <span className="media-name">{media.name}</span>
                              <span className="duration">{formatDuration(media.duration)}</span>
                            </div>
                          ))
                        ) : (
                          project.mediaFiles.map((mediaId, index) => (
                            <div key={mediaId} className="media-duration-item">
                              <div className="media-icon-small">🎵</div>
                              <span className="media-name">קובץ {index + 1}</span>
                              <span className="duration">00:00:00</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {currentTab === 'progress' && (
            <div className="progress-tab">
              <h3>התקדמות תמלול</h3>
              <p className="placeholder-message">
                תכונה זו עדיין בפיתוח
              </p>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>אישור מחיקה</h3>
              <p>
                האם אתה בטוח שברצונך למחוק את {deleteTarget?.type === 'project' ? 'הפרויקט' : 'קובץ המדיה'}?
              </p>
              
              <div className="delete-options">
                <label>
                  <input 
                    type="checkbox" 
                    checked={deleteTranscriptions}
                    onChange={(e) => setDeleteTranscriptions(e.target.checked)}
                  />
                  מחק גם את התמלולים המשויכים
                </label>
                {!deleteTranscriptions && (
                  <p className="archive-note">
                    התמלולים יועברו לארכיון ויהיו זמינים בלשונית "תמלולים"
                  </p>
                )}
              </div>
              
              <div className="dialog-actions">
                <button 
                  className="confirm-btn"
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? 'מוחק...' : 'אישור'}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setDeleteTarget(null);
                    setDeleteTranscriptions(false);
                  }}
                  disabled={loading}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}