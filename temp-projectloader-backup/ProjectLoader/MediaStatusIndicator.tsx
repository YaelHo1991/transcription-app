'use client';

import React, { useRef } from 'react';
import { MediaStatus } from './types';
import styles from './styles.module.css';

interface MediaStatusIndicatorProps {
  status: MediaStatus;
  onRelocate: (newPath: string) => void;
}

export function MediaStatusIndicator({ 
  status, 
  onRelocate 
}: MediaStatusIndicatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRelocate = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Get the full path (may not work in all browsers due to security)
      const path = (file as any).path || file.name;
      onRelocate(path);
    }
  };

  if (status.available) {
    return null;
  }

  return (
    <div className={`${styles.mediaStatus} ${styles.error}`}>
      <span className={styles.statusIcon}>⚠️</span>
      <div className={styles.statusText}>
        <div className={styles.statusTitle}>הקובץ לא נמצא</div>
        <div className={styles.statusMessage}>
          הקובץ אינו זמין במחשב זה. 
          {status.missingPath && (
            <span> נתיב קודם: {status.missingPath}</span>
          )}
        </div>
      </div>
      
      {status.needsRelocate && (
        <>
          <button 
            className={styles.relocateButton}
            onClick={handleRelocate}
          >
            אתר קובץ
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="audio/*,video/*"
          />
        </>
      )}
    </div>
  );
}