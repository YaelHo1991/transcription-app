'use client';

import React, { useState } from 'react';
import './ProjectNavigator.css';

interface ProjectNavigatorProps {
  currentProject?: number;
  totalProjects?: number;
  currentMedia?: number;
  totalMedia?: number;
  mediaName?: string;
  mediaDuration?: string;
  mediaSize?: string;
  onPreviousProject?: () => void;
  onNextProject?: () => void;
  onPreviousMedia?: () => void;
  onNextMedia?: () => void;
}

export default function ProjectNavigator({
  currentProject = 1,
  totalProjects = 5,
  currentMedia = 3,
  totalMedia = 10,
  mediaName = 'Interview_Recording_2024_01_15_Meeting_Room_A_Final_Version.mp3',
  mediaDuration = '00:00:00',
  mediaSize = '0 MB',
  onPreviousProject,
  onNextProject,
  onPreviousMedia,
  onNextMedia
}: ProjectNavigatorProps) {
  
  // Detect if text contains Hebrew characters
  const isHebrew = (text: string) => {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  };
  
  const scrollDirection = isHebrew(mediaName) ? 'rtl' : 'ltr';


  return (
    <div className="t-project-navigator">
      {/* Project Section */}
      <div className="t-nav-section t-project-section">
        <button className="t-nav-btn" onClick={onPreviousProject} disabled={currentProject <= 1}>
          →
        </button>
        <div className="t-nav-info">
          <span className="t-nav-label">פרויקט</span>
          <span className="t-nav-value">{totalProjects} / {currentProject}</span>
        </div>
        <button className="t-nav-btn" onClick={onNextProject} disabled={currentProject >= totalProjects}>
          ←
        </button>
      </div>

      <div className="t-nav-divider"></div>

      {/* Media Section */}
      <div className="t-nav-section t-media-section">
        <button className="t-nav-btn" onClick={onPreviousMedia} disabled={currentMedia <= 1}>
          →
        </button>
        <div className="t-nav-info">
          <span className="t-nav-label">מדיה</span>
          <span className="t-nav-value">{totalMedia} / {currentMedia}</span>
        </div>
        <button className="t-nav-btn" onClick={onNextMedia} disabled={currentMedia >= totalMedia}>
          ←
        </button>
      </div>

      <div className="t-nav-divider"></div>

      {/* Media Info */}
      <div className="t-media-info">
        <div className="t-media-name-wrapper">
          <div className={'t-media-name scroll-' + scrollDirection}>
            {mediaName}
          </div>
        </div>
        <div className="t-media-details">
          <span className="t-media-duration">{mediaDuration}</span>
          <span className="t-media-separator">•</span>
          <span className="t-media-size">{mediaSize}</span>
        </div>
      </div>
    </div>
  );
}