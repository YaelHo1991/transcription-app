'use client';

import React, { useState } from 'react';
import './UrlModal.css';

interface UrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  title?: string;
}

export default function UrlModal({ isOpen, onClose, onSubmit, title = 'הכנס קישור למדיה' }: UrlModalProps) {
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      setUrl('');
      onClose();
    }
  };

  return (
    <div className="url-modal-overlay" onClick={onClose}>
      <div className="url-modal" onClick={(e) => e.stopPropagation()}>
        <div className="url-modal-header">
          <h3>{title}</h3>
          <button className="url-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="url-modal-content">
            <input
              type="url"
              className="url-modal-input"
              placeholder="YouTube, Google Drive, Dropbox..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              dir="ltr"
            />
            <div className="url-modal-hint">
              דוגמאות: https://youtube.com/watch?v=... או https://drive.google.com/file/...
            </div>
          </div>
          <div className="url-modal-actions">
            <button type="button" className="url-modal-cancel" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="url-modal-submit" disabled={!url.trim()}>
              הוסף
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}