'use client';

import React from 'react';
import './TranscriptionHeader.css';
import { 
  previousProject, 
  nextProject, 
  previousMedia, 
  nextMedia,
  updateNavigationButtons 
} from '../../utils/navigation-functions';

interface TranscriptionHeaderProps {
  onLogout?: () => void;
}

export default function TranscriptionHeader({ onLogout }: TranscriptionHeaderProps) {
  React.useEffect(() => {
    // Initialize navigation buttons state
    updateNavigationButtons();
    
    // Listen for project item clicks to update navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.project-item')) {
        setTimeout(updateNavigationButtons, 100);
      }
    };
    
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="transcription-header-content">
      <nav className="nav-links">
        <a href="/transcription" className="">ראשי</a>
        <a href="/transcription/transcription" className="active">תמלול</a>
        <a href="/transcription/proofreading">הגהה</a>
        <a href="/transcription/export">ייצוא</a>
        <a href="/transcription/records">רישומים</a>
      </nav>
      
      <div className="user-info">
        <div className="user-profile">
          <span>שלום, ליאת בן שי</span>
        </div>
        
        {onLogout && (
          <button 
            className="logout-btn"
            onClick={onLogout}
          >
            התנתק
          </button>
        )}
      </div>
    </div>
  );
}