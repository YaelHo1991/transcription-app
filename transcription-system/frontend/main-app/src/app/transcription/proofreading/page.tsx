'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
import HoveringHeader from '../components/HoveringHeader';
import ProofreadingSidebar from './components/ProofreadingSidebar';
import UnauthorizedOverlay from '../../../components/UnauthorizedOverlay/UnauthorizedOverlay';
import './proofreading-theme.css';
import './proofreading-page.css';

export default function ProofreadingPage() {
  const router = useRouter();
  
  // User information
  const [userFullName, setUserFullName] = useState('משתמש');
  const [userPermissions, setUserPermissions] = useState('DEF');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Get user's full name from localStorage
  useEffect(() => {
    const fullName = localStorage.getItem('userFullName') || '';
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
    
    // Get user permissions
    const token = localStorage.getItem('token');
    const permissions = localStorage.getItem('permissions') || '';
    
    // If no token, redirect to login
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }
    
    setUserPermissions(permissions || 'DEF'); // Only set DEF for display if empty
    
    // Check if user has proofreading permission
    if (!permissions || !permissions.includes('E')) {
      setHasPermission(false);
    } else {
      setHasPermission(true);
    }
  }, []);
  
  const [headerLocked, setHeaderLocked] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  
  // States for proofreading functionality
  const [originalText, setOriginalText] = useState('');
  const [proofreadText, setProofreadText] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [followText, setFollowText] = useState(true);
  
  // Memoize callbacks
  const handleHeaderLockChange = useCallback((locked: boolean) => {
    setHeaderLocked(locked);
  }, []);

  const handleSidebarLockChange = useCallback((locked: boolean) => {
    setSidebarLocked(locked);
  }, []);

  return (
    <>
      {hasPermission === false && (
        <UnauthorizedOverlay 
          requiredPermission="E"
          permissionName="הגהה"
          theme="proofreading"
        />
      )}
      <HoveringBarsLayout
      headerContent={
        <HoveringHeader 
          userFullName={userFullName}
          permissions={userPermissions}
          onLogout={() => {
            router.push('/login');
          }}
          themeColor="blue"
        />
      }
      sidebarContent={<ProofreadingSidebar />}
      theme="proofreading"
      onHeaderLockChange={handleHeaderLockChange}
      onSidebarLockChange={handleSidebarLockChange}
    >
      {/* Workspace Header */}
      <div className={`pr-workspace-header ${headerLocked ? 'pr-header-locked' : ''}`}>
        <div className="pr-header-content">
          <div className="pr-workspace-title">הגהת תמלול</div>
          <div className="pr-header-divider"></div>
          <div className="pr-progress-container">
            <span className="pr-progress-label">התקדמות:</span>
            <span className="pr-progress-percentage">65%</span>
            <div className="pr-progress-bar-wrapper">
              <div className="pr-progress-bar-fill" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`pr-main-content ${headerLocked ? 'header-locked' : ''} ${sidebarLocked ? 'sidebar-locked' : ''}`}>
        <div className="pr-content-container">
          <div className="pr-workspace-grid">
            
            {/* Main Workspace */}
            <div className="pr-main-workspace">
              
              {/* Media Player */}
              <div className="pr-media-player-container">
                <div className="pr-component-header">
                  <h3>נגן מדיה</h3>
                  <div className="pr-media-controls">
                    <button className="pr-control-btn">⏮️</button>
                    <button className="pr-control-btn">▶️</button>
                    <button className="pr-control-btn">⏭️</button>
                    <span className="pr-time-display">00:00:00 / 01:23:45</span>
                  </div>
                </div>
                <div className="pr-media-waveform">
                  <div className="pr-waveform-placeholder">
                    גל קול של המדיה
                  </div>
                </div>
              </div>
              
              {/* Text Comparison Editor */}
              <div className="pr-text-editor-wrapper">
                <div className="pr-component-header">
                  <h3>השוואת טקסט</h3>
                  <div className="pr-editor-controls">
                    <button className={`pr-toggle-btn ${followText ? 'active' : ''}`} 
                            onClick={() => setFollowText(!followText)}>
                      עקוב אחרי טקסט
                    </button>
                  </div>
                </div>
                <div className="pr-text-comparison">
                  <div className="pr-original-text">
                    <div className="pr-text-header">טקסט מקורי</div>
                    <div className="pr-text-content">
                      {originalText || 'כאן יופיע הטקסט המקורי מהתמלול'}
                    </div>
                  </div>
                  <div className="pr-proofread-text">
                    <div className="pr-text-header">טקסט מוגה</div>
                    <div 
                      className="pr-text-content pr-editable"
                      contentEditable
                      suppressContentEditableWarning={true}
                      onInput={(e) => setProofreadText(e.currentTarget.textContent || '')}
                    >
                      {proofreadText || 'ערוך כאן את הטקסט המוגה'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Workspace */}
            <div className="pr-side-workspace">
              
              {/* Speakers Map */}
              <div className="pr-speakers-container">
                <div className="pr-component-header">
                  <h3>מפת דוברים</h3>
                </div>
                <div className="pr-speakers-list">
                  <div className="pr-speaker-item">
                    <span className="pr-speaker-color" style={{ backgroundColor: '#4CAF50' }}></span>
                    <span className="pr-speaker-name">דובר 1</span>
                  </div>
                  <div className="pr-speaker-item">
                    <span className="pr-speaker-color" style={{ backgroundColor: '#2196F3' }}></span>
                    <span className="pr-speaker-name">דובר 2</span>
                  </div>
                </div>
              </div>
              
              {/* Remarks */}
              <div className="pr-remarks-container">
                <div className="pr-component-header">
                  <h3>הערות</h3>
                  <button className="pr-add-btn">+ הוסף</button>
                </div>
                <div className="pr-remarks-list">
                  <div className="pr-remark-item">
                    <div className="pr-remark-time">00:15:30</div>
                    <div className="pr-remark-text">בדוק איות של שם המקום</div>
                  </div>
                  <div className="pr-remark-item">
                    <div className="pr-remark-time">00:32:15</div>
                    <div className="pr-remark-text">קטע לא ברור - נדרשת בדיקה נוספת</div>
                  </div>
                </div>
              </div>
              
              {/* Helper Pages */}
              <div className="pr-helper-files">
                <div className="pr-component-header">
                  <h3>דפי עזר</h3>
                  <button className="pr-toggle-btn">▼</button>
                </div>
                <div className="pr-helper-content">
                  <div className="pr-helper-item">מונחים מקצועיים.pdf</div>
                  <div className="pr-helper-item">הנחיות עיצוב.docx</div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </HoveringBarsLayout>
    </>
  );
}