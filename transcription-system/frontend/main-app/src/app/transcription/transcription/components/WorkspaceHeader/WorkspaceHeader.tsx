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
    <div className={`t-workspace-header ${headerLocked ? 't-header-locked' : ''} ${sidebarLocked ? 't-sidebar-locked' : ''}`}>
      <div className="t-header-content">
        <div className="t-workspace-title">{projectTitle}</div>
        <div className="t-header-divider"></div>
        <div className="t-progress-container">
          <span className="t-progress-label">התקדמות תמלול:</span>
          <div className="t-progress-bar-wrapper">
            <div className="t-progress-bar-fill" style={{width: `${progress}%`}}></div>
          </div>
          <span className="t-progress-percentage">{progress}%</span>
        </div>
      </div>
    </div>
  );
}