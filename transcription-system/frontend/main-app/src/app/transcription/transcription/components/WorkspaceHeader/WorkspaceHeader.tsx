'use client';

import React from 'react';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  projectTitle?: string;
  progress?: number;
  headerLocked?: boolean;
  sidebarLocked?: boolean;
}

export default function WorkspaceHeader({ 
  projectTitle = 'פרויקט תמלול דוגמה',
  progress = 45,
  headerLocked = false,
  sidebarLocked = false 
}: WorkspaceHeaderProps) {
  return (
    <div className={`workspace-header ${headerLocked ? 'header-locked' : ''} ${sidebarLocked ? 'sidebar-locked' : ''}`}>
      <div className="header-content">
        <div className="workspace-title">{projectTitle}</div>
        <div className="header-divider"></div>
        <div className="progress-container">
          <span className="progress-label">התקדמות תמלול:</span>
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{width: `${progress}%`}}></div>
          </div>
          <span className="progress-percentage">{progress}%</span>
        </div>
      </div>
    </div>
  );
}