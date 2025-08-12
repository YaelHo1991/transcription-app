'use client';

import React from 'react';
import './UploadOptionsModal.css';

interface UploadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: () => void;
  onLinkUpload: () => void;
  title?: string;
  type?: 'project' | 'media';
}

export default function UploadOptionsModal({ 
  isOpen, 
  onClose, 
  onFileUpload, 
  onLinkUpload, 
  title,
  type = 'media'
}: UploadOptionsModalProps) {
  if (!isOpen) return null;

  const modalTitle = title || (type === 'project' ? 'הוסף פרויקט חדש' : 'הוסף מדיה');
  const fileLabel = type === 'project' ? 'בחר תיקייה מהמחשב' : 'בחר קבצים מהמחשב';
  const fileIcon = type === 'project' ? '📁' : '📹';

  return (
    <div className="upload-options-overlay" onClick={onClose}>
      <div className="upload-options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-options-header">
          <h3>{modalTitle}</h3>
          <button className="upload-options-close" onClick={onClose}>✕</button>
        </div>
        <div className="upload-options-content">
          <button className="upload-option-btn" onClick={() => {
            onFileUpload();
            onClose();
          }}>
            <span className="upload-option-icon">{fileIcon}</span>
            <span className="upload-option-label">{fileLabel}</span>
          </button>
          <div className="upload-options-divider">או</div>
          <button className="upload-option-btn" onClick={() => {
            onLinkUpload();
            onClose();
          }}>
            <span className="upload-option-icon">🔗</span>
            <span className="upload-option-label">הוסף קישור חיצוני</span>
          </button>
        </div>
      </div>
    </div>
  );
}