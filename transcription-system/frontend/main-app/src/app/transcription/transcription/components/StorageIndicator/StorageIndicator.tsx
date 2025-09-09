'use client';

import React, { useState, useEffect } from 'react';
import './StorageIndicator.css';

interface StorageIndicatorProps {
  mediaId: string;
  fileName?: string;
  onMigrate?: (mediaId: string, targetType: 'local' | 'server' | 'server_chunked') => Promise<void>;
}

interface StorageStatus {
  mediaId: string;
  storageType: 'local' | 'server' | 'server_chunked';
  size: number;
  accessible: boolean;
  lastCheck?: string;
  migrationInProgress?: boolean;
  chunkCount?: number;
  computerName?: string;
}

export default function StorageIndicator({ mediaId, fileName, onMigrate }: StorageIndicatorProps) {
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    if (mediaId) {
      fetchStorageStatus();
    }
  }, [mediaId]);

  const fetchStorageStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      
      const response = await fetch(`http://localhost:5000/api/projects/dummy-project/media/${mediaId}/storage-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStorageStatus({
          mediaId,
          storageType: data.storageType || 'server',
          size: data.size || 0,
          accessible: data.accessible !== false,
          lastCheck: data.lastCheck,
          migrationInProgress: data.migrationInProgress,
          chunkCount: data.chunkCount,
          computerName: data.computerName
        });
      } else {
        console.warn('Storage status not found, using defaults');
        setStorageStatus({
          mediaId,
          storageType: 'server',
          size: 0,
          accessible: true
        });
      }
    } catch (error) {
      console.error('Failed to fetch storage status:', error);
      setStorageStatus({
        mediaId,
        storageType: 'server',
        size: 0,
        accessible: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async (targetType: 'local' | 'server' | 'server_chunked') => {
    if (!storageStatus || storageStatus.storageType === targetType) {
      return;
    }

    try {
      setMigrationProgress(0);
      setMigrationError(null);
      setShowMigrationDialog(false);

      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      
      const response = await fetch(`http://localhost:5000/api/projects/dummy-project/media/${mediaId}/migrate-storage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetStorageType: targetType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMigrationProgress(100);
        
        // Update storage status
        setStorageStatus(prev => prev ? {
          ...prev,
          storageType: targetType,
          migrationInProgress: false
        } : null);

        // Call parent callback if provided
        if (onMigrate) {
          await onMigrate(mediaId, targetType);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Migration failed' }));
        setMigrationError(errorData.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationError(error instanceof Error ? error.message : 'Migration failed');
    }
  };

  const getStorageIcon = () => {
    if (!storageStatus) return '❓';
    
    switch (storageStatus.storageType) {
      case 'local':
        return storageStatus.accessible ? '💻' : '❌';
      case 'server':
        return '☁️';
      case 'server_chunked':
        return '📦';
      default:
        return '❓';
    }
  };

  const getStorageLabel = () => {
    if (!storageStatus) return 'לא ידוע';
    
    switch (storageStatus.storageType) {
      case 'local':
        return storageStatus.accessible ? 'מקומי' : 'מקומי (לא נגיש)';
      case 'server':
        return 'שרת';
      case 'server_chunked':
        return `שרת מקטע${storageStatus.chunkCount ? ` (${storageStatus.chunkCount})` : ''}`;
      default:
        return 'לא ידוע';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canMigrateTo = (targetType: 'local' | 'server' | 'server_chunked') => {
    return storageStatus && storageStatus.storageType !== targetType && !storageStatus.migrationInProgress;
  };

  if (loading) {
    return (
      <div className="storage-indicator loading">
        <span className="storage-icon">⏳</span>
        <span className="storage-label">טוען...</span>
      </div>
    );
  }

  if (!storageStatus) {
    return (
      <div className="storage-indicator error">
        <span className="storage-icon">❌</span>
        <span className="storage-label">שגיאה</span>
      </div>
    );
  }

  return (
    <div className={`storage-indicator ${storageStatus.storageType}`}>
      <div className="storage-status" onClick={() => setShowMigrationDialog(true)}>
        <span className="storage-icon">{getStorageIcon()}</span>
        <span className="storage-label">{getStorageLabel()}</span>
        {storageStatus.size > 0 && (
          <span className="storage-size">{formatFileSize(storageStatus.size)}</span>
        )}
        {storageStatus.migrationInProgress && (
          <span className="migration-progress">⏳</span>
        )}
      </div>

      {/* Migration Dialog */}
      {showMigrationDialog && (
        <div className="migration-dialog-overlay" onClick={() => setShowMigrationDialog(false)}>
          <div className="migration-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="migration-dialog-header">
              <h3>העבר אחסון</h3>
              <button 
                className="migration-dialog-close"
                onClick={() => setShowMigrationDialog(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="migration-dialog-content">
              <div className="current-storage">
                <strong>מיקום נוכחי:</strong> {getStorageLabel()}
              </div>
              
              {fileName && (
                <div className="file-info">
                  <strong>קובץ:</strong> {fileName}
                </div>
              )}
              
              <div className="migration-options">
                <h4>העבר ל:</h4>
                
                <button 
                  className={`migration-option ${!canMigrateTo('local') ? 'disabled' : ''}`}
                  disabled={!canMigrateTo('local')}
                  onClick={() => handleMigration('local')}
                >
                  <span className="option-icon">💻</span>
                  <div className="option-details">
                    <span className="option-title">מקומי</span>
                    <span className="option-description">שמור במחשב שלך</span>
                  </div>
                </button>
                
                <button 
                  className={`migration-option ${!canMigrateTo('server') ? 'disabled' : ''}`}
                  disabled={!canMigrateTo('server')}
                  onClick={() => handleMigration('server')}
                >
                  <span className="option-icon">☁️</span>
                  <div className="option-details">
                    <span className="option-title">שרת</span>
                    <span className="option-description">העלה לשרת</span>
                  </div>
                </button>
                
                <button 
                  className={`migration-option ${!canMigrateTo('server_chunked') ? 'disabled' : ''}`}
                  disabled={!canMigrateTo('server_chunked')}
                  onClick={() => handleMigration('server_chunked')}
                >
                  <span className="option-icon">📦</span>
                  <div className="option-details">
                    <span className="option-title">שרת מקטע</span>
                    <span className="option-description">קבצים גדולים במקטעים</span>
                  </div>
                </button>
              </div>
              
              {migrationProgress > 0 && migrationProgress < 100 && (
                <div className="migration-progress-bar">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${migrationProgress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{migrationProgress}%</span>
                </div>
              )}
              
              {migrationError && (
                <div className="migration-error">
                  ❌ {migrationError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}