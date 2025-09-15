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
}

const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  onClose,
  batchId,
  projectName
}) => {
  const { projects } = useProjectStore();
  const [batchData, setBatchData] = useState<BatchDownloadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cookieFile, setCookieFile] = useState<File | null>(null);
  const cookieInputRef = React.useRef<HTMLInputElement | null>(null);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [checkingExtension, setCheckingExtension] = useState(true);
  const [previousStatuses, setPreviousStatuses] = useState<{[key: number]: string}>({});

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
            store.loadProjects();
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

  // Check for extension installation
  useEffect(() => {
    if (!isOpen) return;
    
    const checkExtension = () => {
      // Send message to check if extension is installed
      window.postMessage({ type: 'CHECK_EXTENSION_INSTALLED' }, '*');
      
      // Listen for response
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'EXTENSION_INSTALLED' || event.data.type === 'COOKIE_EXTENSION_READY') {
          setExtensionInstalled(true);
          setCheckingExtension(false);
          console.log('Cookie Helper Extension detected:', event.data.version);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Timeout after 1 second - assume not installed
      setTimeout(() => {
        setCheckingExtension(false);
      }, 1000);
      
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    };
    
    checkExtension();
  }, [isOpen]);

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

  // Reload projects when download completes
  useEffect(() => {
    if (batchData && batchData.status === 'completed') {
      // Trigger a reload of projects when download completes
      const store = useProjectStore.getState();
      if (store.loadProjects) {
        store.loadProjects();
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
      }, 300);
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
    
    // Check if any downloads failed
    const hasFailures = Object.values(batchData.progress).some(p => p.status === 'failed');
    
    if (batchData.status === 'completed' && !hasFailures) {
      return 'ההורדה הושלמה בהצלחה!';
    } else if (batchData.status === 'failed' || hasFailures) {
      return 'ההורדה נכשלה';
    } else if (batchData.status === 'downloading') {
      return `מוריד... (${batchData.completedFiles}/${batchData.totalFiles})`;
    } else {
      return 'ההורדה הושלמה עם שגיאות';
    }
  };
  

  const getStatusIcon = (): string => {
    if (!batchData) return '⏳';
    
    if (batchData.status === 'completed') return '✅';
    if (batchData.status === 'failed') return '❌';
    return '⬇️';
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

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="download-progress-modal" data-batch-id={batchId} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>התקדמות ההורדה</h3>
          <button 
            className="modal-close-btn"
            onClick={onClose}
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
                                    <button
                                      onClick={() => {
                                        setCheckingExtension(true);
                                        // Recheck for extension
                                        window.postMessage({ type: 'CHECK_EXTENSION_INSTALLED' }, '*');
                                        setTimeout(() => {
                                          setCheckingExtension(false);
                                        }, 1000);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '8px',
                                        background: 'transparent',
                                        color: '#20c997',
                                        border: '1px solid #20c997',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        marginTop: '8px'
                                      }}
                                    >
                                      🔄 בדוק שוב אם התוסף מותקן
                                    </button>
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

              {batchData.status === 'completed' && !Object.values(batchData.progress).some(p => p.status === 'failed') && (
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
            onClick={onClose}
          >
            {batchData?.status === 'completed' ? 'סגור' : 'הסתר'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DownloadProgressModal;