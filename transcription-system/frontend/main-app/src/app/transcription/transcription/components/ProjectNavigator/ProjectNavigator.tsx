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
  onAddProject?: () => void;
  onAddMedia?: () => void;
  onProjectDrop?: (files: FileList) => void;
  onMediaDrop?: (files: FileList) => void;
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
  onNextMedia,
  onAddProject,
  onAddMedia,
  onProjectDrop,
  onMediaDrop
}: ProjectNavigatorProps) {
  const [projectDragActive, setProjectDragActive] = useState(false);
  const [mediaDragActive, setMediaDragActive] = useState(false);
  
  // Detect if text contains Hebrew characters
  const isHebrew = (text: string) => {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  };
  
  const scrollDirection = isHebrew(mediaName) ? 'rtl' : 'ltr';

  const handleProjectDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setProjectDragActive(true);
    } else if (e.type === "dragleave") {
      setProjectDragActive(false);
    }
  };

  const handleProjectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onProjectDrop?.(e.dataTransfer.files);
    }
  };

  const handleMediaDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setMediaDragActive(true);
    } else if (e.type === "dragleave") {
      setMediaDragActive(false);
    }
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMediaDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onMediaDrop?.(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className="project-navigator"
      onDragEnter={handleMediaDrag}
      onDragLeave={handleMediaDrag}
      onDragOver={handleMediaDrag}
      onDrop={handleMediaDrop}
    >
      {/* Project Section */}
      <div className="nav-section project-section">
        <button className="nav-btn" onClick={onPreviousProject} disabled={currentProject <= 1}>
          →
        </button>
        <div className="nav-info">
          <span className="nav-label">פרויקט</span>
          <span className="nav-value">{totalProjects} / {currentProject}</span>
        </div>
        <button className="nav-btn" onClick={onNextProject} disabled={currentProject >= totalProjects}>
          ←
        </button>
        <button className="add-btn-small" onClick={onAddProject} title="פרויקט חדש">
          +
        </button>
      </div>

      <div className="nav-divider"></div>

      {/* Media Section */}
      <div className="nav-section media-section">
        <button className="nav-btn" onClick={onPreviousMedia} disabled={currentMedia <= 1}>
          →
        </button>
        <div className="nav-info">
          <span className="nav-label">מדיה</span>
          <span className="nav-value">{totalMedia} / {currentMedia}</span>
        </div>
        <button className="nav-btn" onClick={onNextMedia} disabled={currentMedia >= totalMedia}>
          ←
        </button>
        <button className="add-btn-small" onClick={onAddMedia} title="מדיה חדשה">
          +
        </button>
      </div>

      <div className="nav-divider"></div>

      {/* Media Info */}
      <div className="media-info">
        <div className="media-name-wrapper">
          <div className={`media-name scroll-${scrollDirection}`}>
            {mediaName}
          </div>
        </div>
        <div className="media-details">
          <span className="media-duration">{mediaDuration}</span>
          <span className="media-separator">•</span>
          <span className="media-size">{mediaSize}</span>
        </div>
      </div>
    </div>
  );
}