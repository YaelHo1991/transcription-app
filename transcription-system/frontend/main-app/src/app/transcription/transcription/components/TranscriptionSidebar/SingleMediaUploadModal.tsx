'use client';

import React, { useState, useRef } from 'react';
import './SingleMediaUploadModal.css';

interface SingleMediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, projectName: string) => Promise<void>;
}

const generateTimestampName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

export const SingleMediaUploadModal: React.FC<SingleMediaUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const timestampName = generateTimestampName();
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill with file name if project name is empty
      if (!projectName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setProjectName(nameWithoutExt);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const finalName = projectName || timestampName;
      await onUpload(selectedFile, finalName);
      // Reset modal state after successful upload
      setSelectedFile(null);
      setProjectName('');
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('העלאה נכשלה. אנא נסה שנית.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setProjectName('');
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="single-media-modal-overlay" onClick={handleClose}>
      <div className="single-media-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="single-media-modal-header">
          <h2>הוסף מדיה בודדת</h2>
          <button className="single-media-close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="single-media-modal-body">
          <div className="single-media-file-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button 
              className="single-media-select-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {selectedFile ? 'בחר קובץ אחר' : 'בחר קובץ מדיה'}
            </button>
            
            {selectedFile && (
              <div className="single-media-file-info">
                <span className="single-media-file-name">{selectedFile.name}</span>
                <span className="single-media-file-size">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
          
          <div className="single-media-name-section">
            <label>שם הפרויקט:</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={timestampName}
              className="single-media-name-input"
              disabled={isUploading}
            />
            <small className="single-media-help-text">
              השאר ריק לשימוש בחותמת זמן אוטומטית
            </small>
          </div>
        </div>
        
        <div className="single-media-modal-footer">
          <button 
            className="single-media-cancel-btn" 
            onClick={handleClose}
            disabled={isUploading}
          >
            ביטול
          </button>
          <button 
            className="single-media-upload-btn" 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'מעלה...' : 'העלה'}
          </button>
        </div>
      </div>
    </div>
  );
};