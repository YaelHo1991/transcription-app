'use client';

import React, { useState } from 'react';
import './ProjectNameModal.css';

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string | null) => void;
  defaultName?: string;
  showWarning?: boolean;
}

export default function ProjectNameModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  defaultName = '',
  showWarning = false
}: ProjectNameModalProps) {
  const [projectName, setProjectName] = useState(defaultName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(projectName.trim() || null);
    setProjectName('');
  };

  const handleSkip = () => {
    onSubmit(null);
    setProjectName('');
  };

  return (
    <div className="project-name-overlay" onClick={onClose}>
      <div className="project-name-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-name-header">
          <h3>שם הפרויקט</h3>
          <button className="project-name-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {showWarning && (
            <div className="project-name-warning">
              <span className="warning-icon">⚠️</span>
              <span>הפעולה הזו תעלה את כל הקבצים בתיקייה</span>
            </div>
          )}
          
          <div className="project-name-content">
            <input
              type="text"
              className="project-name-input"
              placeholder={defaultName || "הכנס שם לפרויקט (אופציונלי)"}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
              dir="rtl"
            />
            {defaultName && (
              <div className="project-name-hint">
                השאר ריק לשימוש בשם התיקייה: {defaultName}
              </div>
            )}
          </div>
          
          <div className="project-name-actions">
            <button type="button" className="project-name-skip" onClick={handleSkip}>
              דלג
            </button>
            <button type="submit" className="project-name-submit">
              אישור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}