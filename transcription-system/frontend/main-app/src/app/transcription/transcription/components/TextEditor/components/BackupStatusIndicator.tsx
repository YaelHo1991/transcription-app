'use client';

import React, { useState, useEffect } from 'react';
import backupService, { BackupStatus } from '../../../../../../services/backupService';
import './BackupStatusIndicator.css';

interface BackupStatusIndicatorProps {
  onShowHistory?: () => void;
}

export default function BackupStatusIndicator({ onShowHistory }: BackupStatusIndicatorProps) {
  const [status, setStatus] = useState<BackupStatus>(backupService.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = backupService.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const getStatusText = () => {
    if (status.isBackingUp) {
      return 'שומר...';
    }
    if (status.error) {
      return 'שגיאה בשמירה';
    }
    if (status.hasChanges) {
      return 'יש שינויים לא שמורים';
    }
    if (status.lastBackup) {
      const minutesAgo = Math.floor((Date.now() - status.lastBackup.getTime()) / 60000);
      if (minutesAgo === 0) {
        return 'נשמר כעת';
      }
      if (minutesAgo === 1) {
        return 'נשמר לפני דקה';
      }
      if (minutesAgo < 60) {
        return `נשמר לפני ${minutesAgo} דקות`;
      }
      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo === 1) {
        return 'נשמר לפני שעה';
      }
      return `נשמר לפני ${hoursAgo} שעות`;
    }
    return 'לא נשמר';
  };

  const getStatusIcon = () => {
    if (status.isBackingUp) {
      return '⏳';
    }
    if (status.error) {
      return '⚠️';
    }
    if (status.hasChanges) {
      return '📝';
    }
    return '💾';
  };

  const getStatusClass = () => {
    if (status.error) return 'error';
    if (status.isBackingUp) return 'saving';
    if (status.hasChanges) return 'unsaved';
    return 'saved';
  };

  return (
    <div className="backup-status-container">
      <div 
        className={`backup-status-indicator ${getStatusClass()}`}
        onClick={() => setShowDetails(!showDetails)}
        title="לחץ לפרטים"
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        {status.version > 0 && (
          <span className="status-version">v{status.version}</span>
        )}
      </div>

      {showDetails && (
        <div className="backup-details-popup">
          <div className="backup-details-header">
            <h4>מצב גיבוי</h4>
            <button 
              className="close-details"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
            >
              ✕
            </button>
          </div>
          
          <div className="backup-details-content">
            <div className="detail-row">
              <span className="detail-label">מצב:</span>
              <span className={`detail-value ${getStatusClass()}`}>
                {getStatusText()}
              </span>
            </div>
            
            {status.version > 0 && (
              <div className="detail-row">
                <span className="detail-label">גרסה נוכחית:</span>
                <span className="detail-value">v{status.version}</span>
              </div>
            )}
            
            {status.lastBackup && (
              <div className="detail-row">
                <span className="detail-label">גיבוי אחרון:</span>
                <span className="detail-value">
                  {status.lastBackup.toLocaleTimeString('he-IL')}
                </span>
              </div>
            )}
            
            {status.error && (
              <div className="detail-row error">
                <span className="detail-label">שגיאה:</span>
                <span className="detail-value">{status.error}</span>
              </div>
            )}
            
            <div className="detail-actions">
              <button 
                className="backup-action-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  const data = (backupService as any).getBackupDataCallback?.();
                  if (data) {
                    await backupService.forceBackup(data);
                  }
                }}
                disabled={status.isBackingUp || !status.hasChanges}
              >
                💾 גבה עכשיו
              </button>
              
              {onShowHistory && (
                <button 
                  className="backup-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowHistory();
                    setShowDetails(false);
                  }}
                >
                  📜 היסטוריית גרסאות
                </button>
              )}
            </div>
            
            <div className="auto-save-info">
              <span className="info-icon">ℹ️</span>
              <span className="info-text">
                גיבוי אוטומטי מתבצע כל דקה כאשר יש שינויים
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}