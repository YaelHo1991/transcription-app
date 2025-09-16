'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { buildApiUrl } from '@/utils/api';
import useProjectStore from '@/lib/stores/projectStore';
import './DownloadProgressModal.css';

interface MediaDownloadProgress {
  progress: number;
  status: 'downloading' | 'completed' | 'failed';
  error?: string;
}

interface BatchDownloadData {
  status: 'downloading' | 'completed' | 'failed';
  projectId: string;
  totalFiles: number;
  completedFiles: number;
  progress: { [mediaIndex: number]: MediaDownloadProgress };
  mediaNames?: { [mediaIndex: number]: string };
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  projectName: string;
  extensionInstalled: boolean;
  checkingExtension: boolean;
}

const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  onClose,
  batchId,
  projectName,
  extensionInstalled,
  checkingExtension
}) => {
  const { projects } = useProjectStore();
  const [batchData, setBatchData] = useState<BatchDownloadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cookieFile, setCookieFile] = useState<File | null>(null);
  const cookieInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previousStatuses, setPreviousStatuses] = useState<{[key: number]: string}>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 }); // Position from bottom-left
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch progress data
  const fetchProgress = async () => {
    if (!batchId) {
      console.log('[DownloadProgressModal] No batchId, skipping fetch');
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/api/projects/batch-download/${batchId}/progress`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();
      
      // Check for status changes (failed -> completed) to trigger project refresh
      if (batchData && data.progress) {
        let shouldRefreshProjects = false;
        
        Object.entries(data.progress).forEach(([index, mediaProgress]: [string, any]) => {
          const mediaIndex = Number(index);
          const prevStatus = previousStatuses[mediaIndex];
          const currentStatus = mediaProgress.status;
          
          // If a media item went from failed to completed (cookie retry succeeded)
          if (prevStatus === 'failed' && currentStatus === 'completed') {
            console.log(`Media ${mediaIndex} recovered from failed to completed - refreshing projects`);
            shouldRefreshProjects = true;
          }
        });
        
        // Update the previous statuses for next comparison
        const newStatuses: {[key: number]: string} = {};
        Object.entries(data.progress).forEach(([index, mediaProgress]: [string, any]) => {
          newStatuses[Number(index)] = mediaProgress.status;
        });
        setPreviousStatuses(newStatuses);
        
        // Refresh projects if any media recovered
        if (shouldRefreshProjects) {
          const store = useProjectStore.getState();
          if (store.loadProjects) {
            store.loadProjects().then(() => {
              // After refresh, re-select the project if it's not currently selected
              if (data.projectId && !store.currentProject?.projectId) {
                const project = store.projects.find(p => p.projectId === data.projectId);
                if (project) {
                  console.log('[DownloadProgressModal] Re-selecting project after recovery:', project);
                  store.setCurrentProject(project);
                  if (project.media && project.media.length > 0) {
                    store.setCurrentMediaById(data.projectId, project.media[0].id);
                  }
                }
              }
            });
          }
        }
      }
      
      setBatchData(data);
      setError('');
    } catch (err: any) {
      console.error('[DownloadProgressModal] Error fetching progress:', err);
      setError(err.message || 'Failed to fetch download progress');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll progress every 2 seconds while downloading
  useEffect(() => {
    if (!isOpen || !batchId) {
      console.log('[DownloadProgressModal] Not polling - isOpen:', isOpen, 'batchId:', batchId);
      return;
    }

    let interval: NodeJS.Timeout;

    // Start polling immediately
    fetchProgress();

    interval = setInterval(() => {
      fetchProgress();
    }, 2000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOpen, batchId]);

  // Reload projects and auto-select when download completes
  useEffect(() => {
    if (batchData && batchData.status === 'completed') {
      console.log('[DownloadProgressModal] Download completed, loading and selecting project');

      // Trigger a reload of projects when download completes
      const store = useProjectStore.getState();
      if (store.loadProjects) {
        store.loadProjects().then(() => {
          // After projects are loaded, automatically select the newly created project
          if (batchData.projectId) {
            console.log('[DownloadProgressModal] Auto-selecting project:', batchData.projectId);

            // Find the project in the loaded projects
            const loadedProjects = store.projects;
            const newProject = loadedProjects.find(p => p.projectId === batchData.projectId);

            if (newProject) {
              console.log('[DownloadProgressModal] Found project, setting as current:', newProject);
              store.setCurrentProject(newProject);

              // If the project has media, select the first media item
              if (newProject.media && newProject.media.length > 0) {
                const firstMediaId = newProject.media[0].id;
                console.log('[DownloadProgressModal] Auto-selecting first media:', firstMediaId);
                store.setCurrentMediaById(batchData.projectId, firstMediaId).then(() => {
                  console.log('[DownloadProgressModal] ✅ Project and media selected, backup should now initialize');
                });
              }
            } else {
              console.warn('[DownloadProgressModal] Could not find project in loaded projects');
            }
          }
        });
      }

      // Auto-close modal after 2 seconds when completed (only if all files succeeded)
      const allCompleted = Object.values(batchData.progress).every(p => p.status === 'completed');
      if (allCompleted) {
        setTimeout(() => {
          setIsMinimized(false);
          onClose();
        }, 2000);
      }
    }
  }, [batchData?.status]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setBatchData(null);
        setError('');
        setIsLoading(true);
        setCookieFile(null);
        setIsMinimized(false); // Reset minimized state
      }, 300);
    } else {
      // When modal opens, ensure it's not minimized
      setIsMinimized(false);
    }
  }, [isOpen]);

  // Retry failed download with cookie
  const handleRetryWithCookie = async (mediaIndex: number) => {
    if (!cookieFile || !batchData) return;
    
    try {
      const formData = new FormData();
      formData.append('batchId', batchId);
      formData.append('mediaIndex', mediaIndex.toString());
      formData.append('cookieFile', cookieFile);
      
      const response = await fetch(buildApiUrl('/api/projects/batch-download/retry'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
        },
        body: formData
      });
      
      if (response.ok) {
        // Reset the error state for this media - mark as downloading
        const updatedProgress = { ...batchData.progress };
        updatedProgress[mediaIndex] = {
          ...updatedProgress[mediaIndex],
          status: 'downloading',
          progress: 0,
          error: undefined
        };
        
        setBatchData({
          ...batchData,
          status: 'downloading', // Ensure overall status is downloading, not completed
          progress: updatedProgress
        });
        
        // Clear the cookie file after successful retry
        setCookieFile(null);
      }
    } catch (error) {
      console.error('Failed to retry download:', error);
    }
  };

  // Check if an error is cookie-related
  const isCookieRelatedError = (error: string): boolean => {
    const cookieKeywords = ['cookie', 'Cookie', 'protected', 'bot detection', 'private', 'member', 'authentication', 'login'];
    return cookieKeywords.some(keyword => error.toLowerCase().includes(keyword.toLowerCase()));
  };

  const getOverallProgress = (): number => {
    if (!batchData || batchData.totalFiles === 0) return 0;

    let totalProgress = 0;
    const mediaIndices = Object.keys(batchData.progress).map(Number);

    if (mediaIndices.length === 0) return 0;

    for (const mediaIndex of mediaIndices) {
      const mediaProgress = batchData.progress[mediaIndex];
      if (mediaProgress.status === 'completed') {
        totalProgress += 100;
      } else if (mediaProgress.status === 'failed') {
        totalProgress += 0;
      } else {
        totalProgress += mediaProgress.progress;
      }
    }

    return Math.round(totalProgress / batchData.totalFiles);
  };

  const getStatusText = (): string => {
    if (!batchData) return 'מתחבר...';

    // Check if any downloads are in progress
    const hasDownloading = Object.values(batchData.progress).some(p => p.status === 'downloading');
    // Check if any downloads failed
    const hasFailures = Object.values(batchData.progress).some(p => p.status === 'failed');
    // Check if all are completed
    const allCompleted = Object.values(batchData.progress).every(p => p.status === 'completed');

    if (allCompleted && batchData.status === 'completed') {
      return 'ההורדה הושלמה בהצלחה!';
    } else if (hasDownloading) {
      return `מוריד... (${batchData.completedFiles}/${batchData.totalFiles})`;
    } else if (hasFailures) {
      // Check if failures are cookie-related
      const hasCookieErrors = Object.values(batchData.progress).some(
        p => p.status === 'failed' && p.error && isCookieRelatedError(p.error)
      );
      if (hasCookieErrors) {
        return 'ממתין לקובץ Cookies';
      }
      return 'ההורדה נכשלה';
    } else if (batchData.status === 'downloading') {
      return `מוריד... (${batchData.completedFiles}/${batchData.totalFiles})`;
    } else if (batchData.completedFiles > 0 && batchData.completedFiles < batchData.totalFiles) {
      return 'הושלם חלקית';
    } else {
      return 'ההורדה הושלמה בהצלחה!';
    }
  };
  

  const getStatusIcon = (): string => {
    if (!batchData) return '⏳';

    // Check actual download status of individual files
    const hasDownloading = Object.values(batchData.progress).some(p => p.status === 'downloading');
    const hasFailures = Object.values(batchData.progress).some(p => p.status === 'failed');
    const allCompleted = Object.values(batchData.progress).every(p => p.status === 'completed');

    // Show download icon if any file is downloading (even during cookie retry)
    if (hasDownloading) return '⬇️';
    // Show error icon if any file failed
    if (hasFailures) return '❌';
    // Show success icon only when ALL files are truly completed
    if (allCompleted && batchData.status === 'completed') return '✅';

    // Default to loading icon
    return '⏳';
  };

  const getMediaName = (mediaIndex: number): string => {
    // First, try to get the media name from the batch data (which contains the actual video titles)
    if (batchData?.mediaNames && batchData.mediaNames[mediaIndex]) {
      return batchData.mediaNames[mediaIndex];
    }

    // Fallback to project store if available
    if (batchData && projects) {
      const project = projects.find(p => p.projectId === batchData.projectId);
      if (project && project.mediaFiles && mediaIndex < project.mediaFiles.length) {
        const mediaFile = project.mediaFiles[mediaIndex];
        if (mediaFile?.name) {
          return mediaFile.name;
        }
      }
    }

    // Final fallback
    return `קובץ מדיה ${mediaIndex + 1}`;
  };

  // Smart close handler - minimizes if download is active or needs cookies
  const handleSmartClose = () => {
    if (!batchData) {
      onClose();
      return;
    }

    // Check if any downloads are actively in progress
    const hasActiveDownloads = Object.values(batchData.progress).some(
      p => p.status === 'downloading'
    );

    // Check if any downloads failed with cookie errors (extension might auto-fix)
    const hasCookieErrors = Object.values(batchData.progress).some(
      p => p.status === 'failed' && p.error && isCookieRelatedError(p.error)
    );

    // If downloads are active OR there are cookie errors that might be fixed, minimize
    if (hasActiveDownloads || hasCookieErrors) {
      setIsMinimized(true);
    } else {
      // No active downloads and no cookie errors - safe to close
      setIsMinimized(false);
      onClose();
    }
  };

  // Restore from minimized state
  const handleRestore = () => {
    setIsMinimized(false);
  };

  // Drag handlers for minimized widget
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - (window.innerHeight - position.y) // Convert bottom position to mouse coordinates
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = window.innerHeight - (e.clientY - dragStart.y); // Convert mouse Y to bottom position

    // Keep widget within viewport bounds
    const boundedX = Math.max(0, Math.min(window.innerWidth - 250, newX)); // 250 is widget width
    const boundedY = Math.max(20, Math.min(window.innerHeight - 60, newY)); // Keep some margin

    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Don't render anything if not open and not minimized
  if (!isOpen && !isMinimized) return null;

  // Minimized view - small widget showing download progress
  if (isMinimized) {
    // Check if download completed successfully
    const allCompleted = batchData && Object.values(batchData.progress).every(p => p.status === 'completed');

    // Show success message and auto-close
    if (allCompleted && batchData?.status === 'completed') {
      setTimeout(() => {
        setIsMinimized(false);
        onClose();
      }, 2000);
    }

    return ReactDOM.createPortal(
      <div className="download-progress-minimized"
           style={{
             position: 'fixed',
             bottom: `${position.y}px`,
             left: `${position.x}px`,
             width: '250px',
             background: allCompleted ? '#d4edda' : 'white', // Green tint when completed
             color: '#333',
             borderRadius: '8px',
             padding: '10px',
             boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
             border: allCompleted ? '1px solid #28a745' : '1px solid rgba(32, 201, 151, 0.3)',
             zIndex: 1000,
             cursor: isDragging ? 'grabbing' : 'grab',
             transition: isDragging ? 'none' : 'all 0.3s ease',
             animation: !isDragging ? 'slideIn 0.3s ease' : 'none',
             fontSize: '12px',
             userSelect: 'none'
           }}
           onMouseDown={handleMouseDown}
           onClick={(e) => {
             if (!isDragging) handleRestore();
           }}
           data-batch-id={batchId}>
        {/* Hidden elements for extension to detect */}
        <div className="download-progress-modal" style={{ display: 'none' }}>
          {batchData && Object.entries(batchData.progress).map(([mediaIndexStr, mediaProgress]) => {
            const mediaIndex = Number(mediaIndexStr);
            if (mediaProgress.error && isCookieRelatedError(mediaProgress.error)) {
              return (
                <div key={`error-${mediaIndex}`} className="media-item" data-index={mediaIndex}>
                  <div className="media-error">{mediaProgress.error}</div>
                  <div className="status-failed">נכשל</div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>{getStatusIcon()}</span>
          <div style={{ flex: 1 }}>
            {allCompleted ? (
              <div style={{
                fontWeight: '600',
                fontSize: '12px',
                color: '#155724',
                textAlign: 'center'
              }}>
                ✅ ההורדה הושלמה! הפרויקט נוסף
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '11px', color: '#333' }}>
                    {batchData && Object.values(batchData.progress).some(p => p.status === 'downloading')
                      ? 'מוריד'
                      : batchData && Object.values(batchData.progress).some(p => p.status === 'failed')
                      ? 'ממתין לCookies'
                      : 'הושלם'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#666' }}>
                    ({batchData?.completedFiles || 0}/{batchData?.totalFiles || 0})
                  </span>
                </div>
                <div style={{
                  background: '#e0e0e0',
                  borderRadius: '3px',
                  height: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #20c997, #17a085)',
                    height: '100%',
                    width: `${getOverallProgress()}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </>
            )}
          </div>
          {!allCompleted && (
            <div style={{
              fontWeight: '600',
              fontSize: '11px',
              color: '#20c997'
            }}>
              {getOverallProgress()}%
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // Full modal view - only show if not minimized
  if (!isMinimized) {
    const modalContent = (
      <div className="modal-overlay" onClick={handleSmartClose}>
        <div className="download-progress-modal" data-batch-id={batchId} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>התקדמות ההורדה</h3>
          <button
            className="modal-close-btn"
            onClick={handleSmartClose}
            aria-label="סגור"
          >
            ×
          </button>
        </div>
        
        <div className="modal-content">
          <div className="project-info">
            <h4>{projectName}</h4>
            <div className="status-indicator">
              <span className="status-icon">{getStatusIcon()}</span>
              <span className="status-text">{getStatusText()}</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {isLoading && !error && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>טוען מידע על ההורדה...</span>
            </div>
          )}

          {batchData && !isLoading && (
            <div className="download-details">
              <div className="overall-progress">
                <div className="progress-header">
                  <span>התקדמות כוללת</span>
                  <span>{getOverallProgress()}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${getOverallProgress()}%` }}
                  ></div>
                </div>
              </div>

              <div className="media-list">
                {batchData.totalFiles > 1 && (
                  <h5>קבצי מדיה ({batchData.totalFiles})</h5>
                )}
                {Object.entries(batchData.progress)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([mediaIndexStr, mediaProgress]) => {
                    const mediaIndex = Number(mediaIndexStr);
                    
                    return (
                      <div key={mediaIndex} className="media-item" data-index={mediaIndex}>
                        <div className="media-header">
                          <span className="media-name">{getMediaName(mediaIndex)}</span>
                          <div className="media-status">
                            {mediaProgress.status === 'completed' && <span className="status-completed">✅ הושלם</span>}
                            {mediaProgress.status === 'failed' && <span className="status-failed">❌ נכשל</span>}
                            {mediaProgress.status === 'downloading' && <span className="status-downloading">⬇️ מוריד...</span>}
                          </div>
                        </div>
                        
                        <div className="media-progress">
                          <div className="progress-bar small">
                            <div 
                              className={`progress-fill ${mediaProgress.status === 'failed' ? 'failed' : ''}`}
                              style={{ width: `${mediaProgress.progress}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{mediaProgress.progress}%</span>
                        </div>
                        
                        {mediaProgress.error && (
                          <div className="media-error">
                            <span className="error-icon">⚠️</span>
                            {mediaProgress.error}
                            
                            {/* Cookie upload for cookie-related errors */}
                            {isCookieRelatedError(mediaProgress.error) && (
                              <div className="cookie-retry-section" style={{ marginTop: '10px' }}>
                                {extensionInstalled ? (
                                  // Extension is installed - show automatic handling message
                                  <div style={{
                                    padding: '10px',
                                    backgroundColor: 'rgba(32, 201, 151, 0.05)',
                                    border: '1px solid rgba(32, 201, 151, 0.3)',
                                    borderRadius: '4px'
                                  }}>
                                    <p style={{ fontSize: '12px', color: '#20c997', marginBottom: '4px' }}>
                                      ✅ התוסף מותקן ופעיל
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#666' }}>
                                      התוסף יטפל אוטומטית בבעיות Cookies כשתוריד את הקובץ
                                    </p>
                                  </div>
                                ) : !checkingExtension ? (
                                  // Extension not installed - show installation button
                                  <div style={{ 
                                    padding: '10px', 
                                    background: 'rgba(76, 175, 80, 0.1)', 
                                    border: '1px solid rgba(76, 175, 80, 0.2)', 
                                    borderRadius: '4px' 
                                  }}>
                                    <p style={{ fontSize: '13px', color: '#4CAF50', marginBottom: '8px', fontWeight: 'bold' }}>
                                      🍪 נדרש תוסף Cookie Helper
                                    </p>
                                    <button
                                      onClick={() => {
                                        // Open the extension help page in a new tab
                                        window.open('/transcription/extension-help', '_blank');
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'linear-gradient(135deg, #20c997, #17a085)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 8px rgba(32, 201, 151, 0.2)'
                                      }}
                                    >
                                      📥 פתח מדריך התקנת התוסף
                                    </button>
                                    <p style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                                      התקנה חד-פעמית • טיפול אוטומטי בכל הורדה
                                    </p>
                                  </div>
                                ) : (
                                  // Checking for extension
                                  <div style={{
                                    textAlign: 'center',
                                    padding: '10px',
                                    backgroundColor: 'rgba(32, 201, 151, 0.05)',
                                    border: '1px solid rgba(32, 201, 151, 0.3)',
                                    borderRadius: '4px'
                                  }}>
                                    <div className="spinner" style={{ marginBottom: '8px' }}></div>
                                    <p style={{ fontSize: '12px', color: '#20c997' }}>בודק התקנת תוסף אוטומטי...</p>
                                  </div>
                                )}
                                
                                {/* Manual fallback (hidden by default) */}
                                {!extensionInstalled && !checkingExtension && (
                                  <details style={{ marginTop: '8px' }}>
                                    <summary style={{ color: '#888', cursor: 'pointer', fontSize: '11px' }}>
                                      אפשרות ידנית (למתקדמים)
                                    </summary>
                                    <div style={{ marginTop: '8px' }}>
                                      <input
                                        ref={cookieInputRef}
                                        type="file"
                                        accept=".txt"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setCookieFile(file);
                                          }
                                        }}
                                      />
                                      {!cookieFile ? (
                                        <button
                                          onClick={() => cookieInputRef.current?.click()}
                                          style={{
                                            padding: '6px 12px',
                                            background: 'rgba(255, 193, 7, 0.1)',
                                            border: '1px solid rgba(255, 193, 7, 0.3)',
                                            color: '#ffc107',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            width: '100%'
                                          }}
                                        >
                                          📁 העלה קובץ Cookies ידנית
                                        </button>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span style={{ color: '#28a745', fontSize: '12px' }}>
                                            ✓ קובץ Cookies: {cookieFile.name}
                                          </span>
                                    <button
                                      onClick={() => handleRetryWithCookie(mediaIndex)}
                                      style={{
                                        padding: '6px 12px',
                                        background: 'rgba(40, 167, 69, 0.1)',
                                        border: '1px solid rgba(40, 167, 69, 0.3)',
                                        color: '#28a745',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      🔄 נסה שוב עם Cookies
                                    </button>
                                    <button
                                      onClick={() => setCookieFile(null)}
                                      style={{
                                        padding: '4px 8px',
                                        background: 'rgba(220, 53, 69, 0.1)',
                                        border: '1px solid rgba(220, 53, 69, 0.3)',
                                        color: '#dc3545',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                      }}
                                    >
                                      הסר
                                    </button>
                                  </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>

              {batchData.status === 'completed' &&
               Object.values(batchData.progress).every(p => p.status === 'completed') && (
                <div className="completion-message">
                  <div className="completion-icon">🎉</div>
                  <div className="completion-text">
                    <h4>ההורדה הושלמה!</h4>
                    <p>כל הקבצים הורדו בהצלחה. הפרויקט זמין כעת ברשימת הפרויקטים.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleSmartClose}
          >
            {batchData?.status === 'completed' ? 'סגור' : 'הסתר'}
          </button>
        </div>
      </div>
    </div>
  );

    return ReactDOM.createPortal(modalContent, document.body);
  }

  // Should never reach here but return null for safety
  return null;
};

export default DownloadProgressModal;