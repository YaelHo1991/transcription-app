'use client';

import React, { useState, useEffect } from 'react';
import type { Project, MediaInfo } from '@/lib/stores/projectStore';
import { ConfirmationModal } from '../TextEditor/components/ConfirmationModal';
import './ProjectManagementModal.css';

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
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'media' | 'orphaned', id: string, mediaId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      const response = await fetch('http://localhost:5000/api/projects/orphaned/transcriptions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded orphaned transcriptions:', data.transcriptions);
        setArchivedTranscriptions(data.transcriptions || []);
      } else {
        console.error('Failed to load orphaned transcriptions:', response.status);
        setArchivedTranscriptions([]);
      }
    } catch (error) {
      // Silently fail - might be due to Chrome extension or CORS
      console.log('Could not load archived transcriptions (may be due to browser extension):', error);
      setArchivedTranscriptions([]);
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
    
    setShowConfirmDialog(false);
    setLoading(true);
    
    try {
      if (deleteTarget.type === 'project' && onProjectDelete) {
        await onProjectDelete(deleteTarget.id, deleteTranscriptions);
        setSuccessMessage('הפרויקט נמחק בהצלחה');
        setShowSuccessModal(true);
      } else if (deleteTarget.type === 'media' && deleteTarget.mediaId && onMediaDelete) {
        await onMediaDelete(deleteTarget.id, deleteTarget.mediaId, deleteTranscriptions);
        setSuccessMessage('המדיה נמחקה בהצלחה');
        setShowSuccessModal(true);
      } else if (deleteTarget.type === 'orphaned') {
        await executeOrphanedDelete(deleteTarget.id);
      }
      
      setDeleteTarget(null);
      setDeleteTranscriptions(false);
    } catch (error) {
      console.error('Delete failed:', error);
      setErrorMessage('שגיאה במחיקה. אנא נסה שנית.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const exportTranscription = async (transcriptionId: string, format: 'word' | 'json') => {
    console.log(`Exporting transcription ${transcriptionId} as ${format}`);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      const response = await fetch(`http://localhost:5000/api/projects/orphaned/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcriptionId, format })
      });
      
      console.log('Export response:', response.status);
      
      if (response.ok) {
        if (format === 'json') {
          // JSON format returns JSON data
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || `transcription_${transcriptionId}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else if (format === 'word') {
          // Word format returns binary data
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transcription_${transcriptionId}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        const errorText = await response.text();
        console.error('Export failed:', response.status, errorText);
        alert(`Export failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export error: ${error}`);
    }
  };
  
  const deleteTranscription = async (transcriptionId: string) => {
    // Set the delete target to trigger the confirmation modal
    setDeleteTarget({ type: 'orphaned', id: transcriptionId });
    setShowConfirmDialog(true);
  };
  
  const executeOrphanedDelete = async (transcriptionId: string) => {
    console.log(`[Frontend] Deleting orphaned transcription: ${transcriptionId}`);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      
      // URL encode the transcriptionId to handle special characters
      const encodedId = encodeURIComponent(transcriptionId);
      console.log(`[Frontend] Encoded ID: ${encodedId}`);
      
      const response = await fetch(`http://localhost:5000/api/projects/orphaned/${encodedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[Frontend] Delete response:', response.status, response.statusText);
      
      if (response.ok) {
        // Immediately remove the item from the list for better UX
        setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcriptionId));
        
        // Then reload the list from server to ensure consistency
        setTimeout(async () => {
          await loadArchivedTranscriptions();
        }, 500);
        
        setSuccessMessage('התמלול נמחק בהצלחה');
        setShowSuccessModal(true);
      } else if (response.status === 404) {
        // File not found - it's already deleted, just refresh the list
        console.log('Transcription already deleted (404), refreshing list');
        
        // Immediately remove the item from the list
        setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcriptionId));
        
        // Then reload from server
        setTimeout(async () => {
          await loadArchivedTranscriptions();
        }, 500);
        
        setSuccessMessage('התמלול כבר נמחק מהמערכת');
        setShowSuccessModal(true);
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        setErrorMessage(`שגיאה במחיקת התמלול: ${response.status === 500 ? 'שגיאת שרת פנימית' : errorText}`);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('שגיאת רשת במחיקת התמלול. אנא ודא שהשרת פועל.');
      setShowErrorModal(true);
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
    <div className="project-management-modal-overlay" onClick={(e) => {
      // Only close if clicking the overlay itself, not nested modals
      if ((e.target as HTMLElement).classList.contains('project-management-modal-overlay')) {
        onClose();
      }
    }}>
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
                              project.mediaFiles.map((mediaId, index) => {
                                // Try to get media name from mediaInfo if we somehow missed it
                                const mediaName = typeof mediaId === 'string' ? mediaId : `Media ${index + 1}`;
                                return (
                                  <div key={mediaId} className="media-detail-item">
                                    <div className="media-icon">🎵</div>
                                    <div className="media-info">
                                      <div className="media-name">{mediaName}</div>
                                      <div className="media-meta">
                                        <span className="media-id">0 B</span>
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
                              );
                            })
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
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTranscription(transcription.id, 'word');
                          }}
                        >
                          📄 Word
                        </button>
                        <button 
                          className="export-json-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTranscription(transcription.id, 'json');
                          }}
                        >
                          💾 JSON
                        </button>
                        <button 
                          className="delete-transcription-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTranscription(transcription.id);
                          }}
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
                          project.mediaFiles.map((mediaId, index) => {
                            const mediaName = typeof mediaId === 'string' ? mediaId : `Media ${index + 1}`;
                            // Try to get duration from project.mediaDurations if available
                            const duration = project.mediaDurations?.[mediaId] || 0;
                            return (
                              <div key={mediaId} className="media-duration-item">
                                <div className="media-icon-small">🎵</div>
                                <span className="media-name">{mediaName}</span>
                                <span className="duration">{formatDuration(duration)}</span>
                              </div>
                            );
                          })
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
        
        {/* Custom Delete Confirmation Modal */}
        {showConfirmDialog && (
          <div className="modal-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay') && !loading) {
              setShowConfirmDialog(false);
              setDeleteTarget(null);
              setDeleteTranscriptions(false);
            }
          }}>
            <div className="modal-container small error-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">אישור מחיקה</h3>
                {!loading && (
                  <button className="modal-close" onClick={() => {
                    setShowConfirmDialog(false);
                    setDeleteTarget(null);
                    setDeleteTranscriptions(false);
                  }}>×</button>
                )}
              </div>
              
              <div className="modal-body">
                <div className="confirmation-icon">⚠️</div>
                <div className="confirmation-message">
                  {deleteTarget?.type === 'project' 
                    ? 'האם אתה בטוח שברצונך למחוק את הפרויקט?' 
                    : deleteTarget?.type === 'orphaned'
                    ? 'האם אתה בטוח שברצונך למחוק את התמלול לצמיתות?'
                    : 'האם אתה בטוח שברצונך למחוק את קובץ המדיה?'}
                </div>
                
                {/* Checkbox for delete transcriptions option */}
                {deleteTarget?.type !== 'orphaned' && (
                  <div className="delete-options" style={{ marginTop: '15px', textAlign: 'right' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}>
                      <span style={{ marginLeft: '8px' }}>מחק גם את התמלולים המשויכים</span>
                      <input 
                        type="checkbox" 
                        checked={deleteTranscriptions}
                        onChange={(e) => setDeleteTranscriptions(e.target.checked)}
                        disabled={loading}
                        style={{ cursor: 'pointer' }}
                      />
                    </label>
                    {!deleteTranscriptions && (
                      <p className="confirmation-submessage" style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                        התמלולים יועברו לארכיון ויהיו זמינים בלשונית "תמלולים"
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  className={'modal-btn modal-btn-danger' + (loading ? ' loading' : '')}
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? '' : 'מחק'}
                </button>
                <button
                  className="modal-btn modal-btn-secondary"
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
        
        {/* Success Modal */}
        <ConfirmationModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
          }}
          onConfirm={() => {
            setShowSuccessModal(false);
          }}
          title="הפעולה הושלמה"
          message={successMessage}
          confirmText="אישור"
          type="success"
          showIcon={true}
        />
        
        {/* Error Modal */}
        <ConfirmationModal
          isOpen={showErrorModal}
          onClose={() => {
            setShowErrorModal(false);
          }}
          onConfirm={() => {
            setShowErrorModal(false);
          }}
          title="שגיאה"
          message={errorMessage}
          confirmText="סגור"
          type="danger"
          showIcon={true}
        />
      </div>
    </div>
  );
}