'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './transcription-page.css';

export default function TranscriptionWorkPage() {
  const router = useRouter();
  const [userFullName, setUserFullName] = useState('');
  const [permissions, setPermissions] = useState('');
  const [headerLocked, setHeaderLocked] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [helperFilesExpanded, setHelperFilesExpanded] = useState(false);

  // Disabled for layout preview
  // useEffect(() => {
  //   Authentication logic disabled for layout testing
  // }, [router]);

  // Disabled for layout preview

  return (
    <div className="transcription-work-page" dir="rtl">
      {/* Header Trigger Area */}
      <div 
        className="header-trigger-area"
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      ></div>

      {/* Hovering Header */}
      <div 
        className={`hovering-header ${
          headerLocked || headerHovered ? 'visible' : ''
        } ${headerLocked ? 'locked' : ''}`}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <div className="header-content">
          <div className="header-placeholder">
            <span className="header-label">Hovering Header Bar</span>
          </div>
          <div className="header-controls">
            <button 
              onClick={() => setHeaderLocked(!headerLocked)}
              className="lock-btn"
            >
              {headerLocked ? '🔓' : '📌'}
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Header */}
      <div className={`workspace-header ${headerLocked ? 'header-locked' : ''} ${sidebarLocked ? 'sidebar-locked' : ''}`}>
        <div className="header-content">
          <div className="workspace-title">פרויקט תמלול דוגמה</div>
          <div className="header-divider"></div>
          <div className="progress-container">
            <div className="progress-info">
              <span className="progress-label">התקדמות תמלול:</span>
              <span className="progress-percentage">45%</span>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-fill" style={{width: '45%'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${
        headerLocked ? 'header-locked' : ''
      } ${
        sidebarLocked ? 'sidebar-locked' : ''
      }`}>
        <div className="workspace-grid">
          {/* Main Workspace */}
          <div className="main-workspace">
            {/* Project Navigator - Same width as MediaPlayer */}
            <div className={`project-navigator ${headerLocked ? 'header-locked' : ''}`}>
              <div className="nav-section project-nav">
                <button className="nav-btn">►</button>
                <div className="nav-info-group">
                  <span className="nav-label">פרויקט</span>
                  <span className="nav-value">1/3</span>
                </div>
                <button className="nav-btn">◄</button>
              </div>
              
              <div className="nav-divider"></div>
              
              <div className="nav-section media-nav">
                <button className="upload-btn">📁 העלה מדיה</button>
                <button className="nav-btn">►</button>
                <div className="file-info-section">
                  <div className="file-main-info">
                    <span className="file-counter">2/5</span>
                    <span className="file-name">recording_session.mp3</span>
                  </div>
                  <div className="file-details">
                    <span>⏱️ 01:23:45</span>
                    <span>📁 45.2 MB</span>
                    <span>🎵 MP3</span>
                  </div>
                </div>
                <button className="nav-btn">◄</button>
              </div>
            </div>
            {/* MediaPlayer Placeholder */}
            <div className="placeholder-container media-player">
              <div className="placeholder-header">
                <span className="placeholder-icon">🎵</span>
                <h3>Media Player</h3>
              </div>
              <div className="placeholder-content">
                Audio/Video controls, waveform, playback speed, keyboard shortcuts
              </div>
            </div>

            {/* TextEditor Placeholder */}
            <div className="placeholder-container text-editor">
              <div className="placeholder-header">
                <span className="placeholder-icon">📝</span>
                <h3>Text Editor</h3>
              </div>
              <div className="placeholder-content">
                Rich text editor, speaker blocks, timestamps, auto-corrections
              </div>
            </div>
          </div>

          {/* Side Workspace */}
          <div className="side-workspace">
            {/* Speakers Placeholder */}
            <div className={`placeholder-container speakers ${
              helperFilesExpanded ? 'compressed' : 'normal'
            }`}>
              <div className="placeholder-header">
                <span className="placeholder-icon">👥</span>
                <h3>Speakers</h3>
              </div>
              <div className="placeholder-content">
                Speaker management, color coding, auto-detection
              </div>
            </div>

            {/* Remarks Placeholder */}
            <div className={`placeholder-container remarks ${
              helperFilesExpanded ? 'compressed' : 'normal'
            }`}>
              <div className="placeholder-header">
                <span className="placeholder-icon">💬</span>
                <h3>Remarks</h3>
              </div>
              <div className="placeholder-content">
                Comments, notes, timestamps, collaborative editing
              </div>
            </div>

            {/* HelperFiles Placeholder */}
            <div className={`placeholder-container helper-files ${
              helperFilesExpanded ? 'expanded' : 'collapsed'
            }`}>
              {!helperFilesExpanded ? (
                <button 
                  className="helper-files-toggle-btn"
                  onClick={() => setHelperFilesExpanded(true)}
                >
                  📄 פתח קבצי עזר
                </button>
              ) : (
                <>
                  <div className="placeholder-header">
                    <span className="placeholder-icon">📄</span>
                    <h3>Helper Files</h3>
                    <button 
                      className="close-btn"
                      onClick={() => setHelperFilesExpanded(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="placeholder-content">
                    Meeting summary images, directorate documents, supporting materials
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Trigger Corner */}
      <div 
        className={`sidebar-trigger-corner ${headerLocked ? 'header-locked' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      ></div>

      {/* Hovering Sidebar */}
      <div 
        className={`hovering-sidebar ${
          sidebarLocked || sidebarHovered ? 'visible' : ''
        } ${sidebarLocked ? 'locked' : ''} ${headerLocked ? 'header-locked' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="sidebar-header">
          <div className="sidebar-placeholder">
            <span className="sidebar-label">Hovering Sidebar</span>
          </div>
          <button 
            onClick={() => setSidebarLocked(!sidebarLocked)}
            className="lock-btn"
          >
            {sidebarLocked ? '🔓' : '📌'}
          </button>
        </div>
        <div className="sidebar-content">
          <div className="sidebar-description">
            When locked, this sidebar would display the side workspace components 
            (Speakers, Remarks, HelperFiles) in a narrower format to save space.
          </div>
        </div>
      </div>
    </div>
  );
}