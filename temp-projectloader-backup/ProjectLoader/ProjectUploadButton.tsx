'use client';

import React, { useRef, useState } from 'react';
import { UploadParams } from './types';
import styles from './styles.module.css';

interface ProjectUploadButtonProps {
  onUpload: (params: UploadParams) => Promise<void>;
  disabled?: boolean;
  position?: 'media-player' | 'sidebar' | 'main-page';
}

export function ProjectUploadButton({ 
  onUpload, 
  disabled = false,
  position = 'media-player' 
}: ProjectUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Get computer identification
  const getComputerInfo = () => {
    // Generate a unique computer ID based on browser fingerprint
    const computerId = localStorage.getItem('computerId') || generateComputerId();
    if (!localStorage.getItem('computerId')) {
      localStorage.setItem('computerId', computerId);
    }
    
    const computerName = localStorage.getItem('computerName') || promptForComputerName();
    
    return { computerId, computerName };
  };

  const generateComputerId = () => {
    // Simple fingerprint based on browser info
    const fingerprint = [
      navigator.platform,
      navigator.language,
      navigator.hardwareConcurrency,
      screen.width,
      screen.height
    ].join('-');
    
    return btoa(fingerprint).substring(0, 16);
  };

  const promptForComputerName = () => {
    const name = prompt('נא להזין שם למחשב זה (לדוגמה: "מחשב בית", "משרד"):') || 'מחשב לא מזוהה';
    localStorage.setItem('computerName', name);
    return name;
  };

  const handleFolderSelect = async () => {
    setShowMenu(false);
    folderInputRef.current?.click();
  };

  const handleMediaSelect = async () => {
    setShowMenu(false);
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const { computerId, computerName } = getComputerInfo();

    try {
      // Extract folder name from path if available
      let folderName = '';
      if (files[0] && 'webkitRelativePath' in files[0]) {
        const path = (files[0] as any).webkitRelativePath;
        folderName = path.split('/')[0];
      }

      // Filter for media files only
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        file.type.startsWith('video/')
      );

      if (mediaFiles.length === 0) {
        alert('לא נמצאו קבצי מדיה בתיקייה שנבחרה');
        return;
      }

      await onUpload({
        userId: getCurrentUserId(),
        folderName,
        files: mediaFiles,
        computerId,
        computerName
      });

    } catch (error) {
      console.error('Upload failed:', error);
      alert('שגיאה בהעלאת הפרויקט');
    } finally {
      setIsUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleUrlUpload = async () => {
    setShowMenu(false);
    const url = prompt('הכנס כתובת URL של המדיה (YouTube, Google Drive, וכו\'):');
    
    if (!url) return;
    
    setIsUploading(true);
    const { computerId, computerName } = getComputerInfo();

    try {
      // Create a pseudo-file for URL
      const urlFile = new File([url], url, { type: 'text/url' });
      
      await onUpload({
        userId: getCurrentUserId(),
        files: [urlFile],
        computerId,
        computerName
      });

    } catch (error) {
      console.error('URL upload failed:', error);
      alert('שגיאה בהוספת כתובת URL');
    } finally {
      setIsUploading(false);
    }
  };

  const getCurrentUserId = (): string => {
    // Get from auth context or token (check both possible keys)
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Backend uses 'id' not 'userId' in the JWT
        return payload.id || payload.userId || 'anonymous';
      } catch (error) {
        console.error('[ProjectUploadButton] Failed to parse token:', error);
        return 'anonymous';
      }
    }
    console.warn('[ProjectUploadButton] No token found');
    return 'anonymous';
  };

  return (
    <div className={`${styles.uploadButton} ${styles[position]}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isUploading}
        className={styles.mainButton}
        title="הוסף פרויקט חדש"
      >
        {isUploading ? (
          <span className={styles.loading}>⏳</span>
        ) : (
          <span className={styles.plus}>+</span>
        )}
      </button>

      {showMenu && !isUploading && (
        <div className={styles.uploadMenu}>
          <button onClick={handleFolderSelect} className={styles.menuItem}>
            <span className={styles.icon}>📁</span>
            <span>העלה תיקייה</span>
          </button>
          <button onClick={handleMediaSelect} className={styles.menuItem}>
            <span className={styles.icon}>🎵</span>
            <span>העלה קבצי מדיה</span>
          </button>
          <button onClick={handleUrlUpload} className={styles.menuItem}>
            <span className={styles.icon}>🔗</span>
            <span>הוסף מ-URL</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in React types
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
    </div>
  );
}