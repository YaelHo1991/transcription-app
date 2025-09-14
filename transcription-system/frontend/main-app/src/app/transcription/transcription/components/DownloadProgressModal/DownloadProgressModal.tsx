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

  // Fetch progress data
  const fetchProgress = async () => {
    if (!batchId) return;
    
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
    if (!isOpen || !batchId) return;

    let interval: NodeJS.Timeout;
    
    const startPolling = () => {
      fetchProgress();
      
      interval = setInterval(() => {
        fetchProgress();
      }, 2000);
    };

    startPolling();

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
      }, 300);
    }
  }, [isOpen]);

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
    
    if (batchData.status === 'completed') {
      return 'ההורדה הושלמה בהצלחה!';
    } else if (batchData.status === 'failed') {
      return 'ההורדה נכשלה';
    } else {
      return `מוריד... (${batchData.completedFiles}/${batchData.totalFiles})`;
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
      <div className="download-progress-modal" onClick={(e) => e.stopPropagation()}>
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
                      <div key={mediaIndex} className="media-item">
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
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>

              {batchData.status === 'completed' && (
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