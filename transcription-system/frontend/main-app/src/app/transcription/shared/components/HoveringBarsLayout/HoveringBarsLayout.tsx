'use client';

import { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import './HoveringBarsLayout.css';

interface HoveringBarsLayoutProps {
  headerContent: ReactNode;
  sidebarContent: ReactNode;
  children: ReactNode;
  theme: 'transcription' | 'proofreading' | 'export';
  onHeaderLockChange?: (locked: boolean) => void;
  onSidebarLockChange?: (locked: boolean) => void;
}

export default function HoveringBarsLayout({
  headerContent,
  sidebarContent,
  children,
  theme,
  onHeaderLockChange,
  onSidebarLockChange
}: HoveringBarsLayoutProps) {
  const [headerLocked, setHeaderLocked] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  
  // Use refs to track hover timeouts for debouncing
  const headerHoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const sidebarHoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Notify parent components of lock state changes
  useEffect(() => {
    if (onHeaderLockChange) {
      onHeaderLockChange(headerLocked);
    }
  }, [headerLocked, onHeaderLockChange]);

  useEffect(() => {
    if (onSidebarLockChange) {
      onSidebarLockChange(sidebarLocked);
    }
  }, [sidebarLocked, onSidebarLockChange]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (headerHoverTimeout.current) clearTimeout(headerHoverTimeout.current);
      if (sidebarHoverTimeout.current) clearTimeout(sidebarHoverTimeout.current);
    };
  }, []);

  const handleHeaderLockToggle = () => {
    setHeaderLocked(!headerLocked);
  };

  const handleSidebarLockToggle = () => {
    setSidebarLocked(!sidebarLocked);
  };
  
  // Debounced hover handlers to prevent rapid state updates
  const handleHeaderMouseEnter = useCallback(() => {
    if (headerHoverTimeout.current) clearTimeout(headerHoverTimeout.current);
    setHeaderHovered(true);
  }, []);
  
  const handleHeaderMouseLeave = useCallback(() => {
    if (headerHoverTimeout.current) clearTimeout(headerHoverTimeout.current);
    headerHoverTimeout.current = setTimeout(() => {
      setHeaderHovered(false);
    }, 100); // Small delay to prevent flicker
  }, []);
  
  const handleSidebarMouseEnter = useCallback(() => {
    if (sidebarHoverTimeout.current) clearTimeout(sidebarHoverTimeout.current);
    setSidebarHovered(true);
  }, []);
  
  const handleSidebarMouseLeave = useCallback(() => {
    if (sidebarHoverTimeout.current) clearTimeout(sidebarHoverTimeout.current);
    sidebarHoverTimeout.current = setTimeout(() => {
      setSidebarHovered(false);
    }, 100); // Small delay to prevent flicker
  }, []);
  
  const handleCornerMouseEnter = useCallback(() => {
    handleSidebarMouseEnter();
    handleHeaderMouseEnter();
  }, [handleSidebarMouseEnter, handleHeaderMouseEnter]);
  
  const handleCornerMouseLeave = useCallback(() => {
    handleSidebarMouseLeave();
    handleHeaderMouseLeave();
  }, [handleSidebarMouseLeave, handleHeaderMouseLeave]);

  return (
    <div className={`hovering-bars-layout theme-${theme}`} dir="rtl">
      {/* Header Trigger Area */}
      <div 
        className="header-trigger-area"
        onMouseEnter={handleHeaderMouseEnter}
        onMouseLeave={handleHeaderMouseLeave}
      />

      {/* Hovering Header */}
      <div 
        className={`hovering-header ${
          headerLocked || headerHovered ? 'visible' : ''
        } ${headerLocked ? 'locked' : ''}`}
        onMouseEnter={handleHeaderMouseEnter}
        onMouseLeave={handleHeaderMouseLeave}
      >
        <div className="header-content">
          {headerContent}
          <div className="header-controls">
            <button 
              onClick={handleHeaderLockToggle}
              className="lock-btn"
              aria-label={headerLocked ? 'Unlock header' : 'Lock header'}
            >
              {headerLocked ? '🔓' : '🔒'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main-content-wrapper ${
        headerLocked ? 'header-locked' : ''
      } ${
        sidebarLocked ? 'sidebar-locked' : ''
      }`}>
        {children}
      </div>

      {/* Sidebar Trigger Corner - Also triggers header */}
      <div 
        className={`sidebar-trigger-corner ${headerLocked ? 'header-locked' : ''}`}
        onMouseEnter={handleCornerMouseEnter}
        onMouseLeave={handleCornerMouseLeave}
      />

      {/* Hovering Sidebar */}
      <div 
        className={`hovering-sidebar ${
          sidebarLocked || sidebarHovered ? 'visible' : ''
        } ${sidebarLocked ? 'locked' : ''} ${headerLocked ? 'header-locked' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <h3 className="sidebar-title">פרויקטים זמינים</h3>
            <button 
              onClick={handleSidebarLockToggle}
              className={`lock-btn ${sidebarLocked ? 'locked' : ''}`}
              aria-label={sidebarLocked ? 'Unlock sidebar' : 'Lock sidebar'}
              title={sidebarLocked ? 'בטל נעילה' : 'נעל'}
            >
              {sidebarLocked ? '🔓' : '🔒'}
            </button>
          </div>
          <div className="sidebar-content-wrapper">
            {sidebarContent}
          </div>
        </div>
      </div>
    </div>
  );
}