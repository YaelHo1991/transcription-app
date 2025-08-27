'use client';

import React from 'react';
import { Project, MediaFile } from './types';
import styles from './styles.module.css';

interface MediaBrowserProps {
  project: Project;
  currentMedia: MediaFile | null;
  onMediaSelect: (media: MediaFile) => void;
}

export function MediaBrowser({ 
  project, 
  currentMedia, 
  onMediaSelect 
}: MediaBrowserProps) {
  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMediaTypeLabel = (type: 'local' | 'url' | 'server'): string => {
    switch (type) {
      case 'local':
        return 'מקומי';
      case 'url':
        return 'URL';
      case 'server':
        return 'ענן';
      default:
        return type;
    }
  };

  const getMediaIcon = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(ext || '')) {
      return '🎥';
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext || '')) {
      return '🎵';
    }
    return '📄';
  };

  return (
    <div className={styles.mediaBrowser}>
      <div className={styles.mediaBrowserHeader}>
        <span>קבצי מדיה ({project.mediaFiles.length})</span>
      </div>
      
      <div className={styles.mediaList}>
        {project.mediaFiles.map((media) => {
          const isActive = currentMedia?.mediaId === media.mediaId;
          const computerId = localStorage.getItem('computerId') || '';
          const isAvailable = media.type !== 'local' || media.sources[computerId];
          
          return (
            <div
              key={media.mediaId}
              className={`${styles.mediaItem} ${isActive ? styles.active : ''} ${!isAvailable ? styles.unavailable : ''}`}
              onClick={() => onMediaSelect(media)}
            >
              <div className={styles.mediaIcon}>
                {getMediaIcon(media.name)}
              </div>
              
              <div className={styles.mediaInfo}>
                <div className={styles.mediaName} title={media.name}>
                  {media.name}
                </div>
                <div className={styles.mediaMeta}>
                  <span className={`${styles.mediaType} ${styles[media.type]}`}>
                    {getMediaTypeLabel(media.type)}
                  </span>
                  {media.metadata.size && (
                    <span className={styles.mediaSize}>
                      {formatSize(media.metadata.size)}
                    </span>
                  )}
                  {media.metadata.duration && (
                    <span className={styles.mediaDuration}>
                      {media.metadata.duration}
                    </span>
                  )}
                </div>
              </div>

              {!isAvailable && (
                <div className={styles.mediaWarning} title="הקובץ לא זמין במחשב זה">
                  ⚠️
                </div>
              )}

              {media.serverStorage.used && (
                <div className={styles.cloudIcon} title="מאוחסן בענן">
                  ☁️
                </div>
              )}
            </div>
          );
        })}
      </div>

      {project.mediaFiles.length === 0 && (
        <div className={styles.noMedia}>
          אין קבצי מדיה בפרויקט זה
        </div>
      )}
    </div>
  );
}