'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './proofreading.css';

interface Project {
  id: string;
  title: string;
  client: string;
  status: string;
  pages: number;
  progress: number;
  updatedAt: string;
}

export default function ProofreadingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [headerTimeout, setHeaderTimeout] = useState<number | null>(null);
  const [sidebarTimeout, setSidebarTimeout] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userFullName, setUserFullName] = useState('');
  const [permissions, setPermissions] = useState('');

  useEffect(() => {
    
    // Get user data from localStorage
    const fullName = localStorage.getItem('userFullName') || '';
    const token = localStorage.getItem('token');
    const userPermissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has proofreading permission (E)
    if (!userPermissions.includes('E')) {
      router.push('/transcription');
      return;
    }
    
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
    
    setPermissions(userPermissions);
    loadProjects();
    
    // No cleanup needed
    return () => {};
  }, [router]);

  const loadProjects = () => {
    // Mock data for proofreading projects
    const mockProjects: Project[] = [
      {
        id: '1',
        title: 'הרצאה - פיזיקה קוונטית',
        client: 'האוניברסיטה העברית',
        status: 'review',
        pages: 18,
        progress: 75,
        updatedAt: 'לפני 2 שעות'
      },
      {
        id: '2',
        title: 'קבוצת מיקוד - מחקר שוק',
        client: 'מכון המחקר',
        status: 'review',
        pages: 12,
        progress: 50,
        updatedAt: 'לפני 5 שעות'
      },
      {
        id: '3',
        title: 'כנס רפואי בינלאומי',
        client: 'המרכז הרפואי',
        status: 'pending',
        pages: 34,
        progress: 30,
        updatedAt: 'אתמול'
      }
    ];

    setProjects(mockProjects);
    setSelectedProject(mockProjects[0]);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login?system=transcription');
  };

  const canAccessTranscription = permissions.includes('D');
  const canAccessExport = permissions.includes('F');

  if (loading) {
    return (
      <div className="proofreading-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proofreading-page" dir="rtl">
      {/* Header Reveal Zone */}
      <div 
        className="p-header-reveal-zone"
        onMouseEnter={() => {
          if (headerTimeout) clearTimeout(headerTimeout);
          setShowHeader(true);
          setShowSidebar(true);
        }}
        onMouseLeave={() => {
          const timeout = window.setTimeout(() => {
            setShowHeader(false);
            setShowSidebar(false);
          }, 1500);
          setHeaderTimeout(timeout);
        }}
      ></div>

      {/* Collapsible Header */}
      <div 
        className={`p-collapsible-header ${showHeader ? 'show' : ''}`}
        onMouseEnter={() => {
          if (headerTimeout) clearTimeout(headerTimeout);
          setShowHeader(true);
        }}
        onMouseLeave={() => {
          const timeout = window.setTimeout(() => {
            setShowHeader(false);
          }, 1500);
          setHeaderTimeout(timeout);
        }}
      >
        <div className="p-nav">
          <div className="p-nav-content">
            <div className="p-nav-links">
            <Link href="/transcription">דף הבית</Link>
            {canAccessTranscription && (
              <Link href="/transcription/transcription">תמלול</Link>
            )}
            <Link href="/transcription/proofreading" className="active">הגהה</Link>
            {canAccessExport && (
              <Link href="/transcription/export">ייצוא</Link>
            )}
            <Link href="/transcription/records">רישומים</Link>
            </div>
            <div className="p-user-info">
              <div className="p-user-profile">
                <span>שלום, {userFullName}</span>
              </div>
              <a href="#" onClick={handleLogout} className="p-logout-btn">התנתק</a>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Reveal Zone */}
      <div 
        className="p-sidebar-reveal-zone"
        onMouseEnter={() => {
          if (sidebarTimeout) clearTimeout(sidebarTimeout);
          setShowSidebar(true);
        }}
        onMouseLeave={() => {
          const timeout = window.setTimeout(() => {
            setShowSidebar(false);
          }, 1500);
          setSidebarTimeout(timeout);
        }}
      ></div>

      {/* Sidebar */}
      <div 
        className={`p-sidebar ${showSidebar ? 'show' : ''}`}
        onMouseEnter={() => {
          if (sidebarTimeout) clearTimeout(sidebarTimeout);
          setShowSidebar(true);
        }}
        onMouseLeave={() => {
          const timeout = window.setTimeout(() => {
            setShowSidebar(false);
          }, 1500);
          setSidebarTimeout(timeout);
        }}
      >
        <div className="p-sidebar-header">
          <h3 className="p-sidebar-title">פרויקטים להגהה</h3>
          <button className="p-sidebar-close" onClick={() => setShowSidebar(false)}>×</button>
        </div>
        <div className="p-sidebar-content">
          {/* Statistics */}
          <div className="p-sidebar-stats">
            <div className="p-sidebar-stats-title">סטטיסטיקות הגהה</div>
            <div className="p-sidebar-stats-grid">
              <div className="p-sidebar-stat-item">
                <div className="p-sidebar-stat-number">8</div>
                <div className="p-sidebar-stat-label">ממתינים להגהה</div>
              </div>
              <div className="p-sidebar-stat-item">
                <div className="p-sidebar-stat-number">3</div>
                <div className="p-sidebar-stat-label">בעבודה</div>
              </div>
              <div className="p-sidebar-stat-item">
                <div className="p-sidebar-stat-number">15</div>
                <div className="p-sidebar-stat-label">הושלמו השבוע</div>
              </div>
              <div className="p-sidebar-stat-item">
                <div className="p-sidebar-stat-number">92%</div>
                <div className="p-sidebar-stat-label">דירוג איכות</div>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="project-list">
            <h3 className="project-list-title">פרויקטים זמינים</h3>
            {projects.map(project => (
              <div 
                key={project.id} 
                className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-item-title">{project.title}</div>
                <div className="project-item-meta">
                  <span>{project.client}</span>
                  <span>{project.pages} עמודים</span>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="overlay" id="overlay" onClick={() => setShowSidebar(false)}></div>

      {/* Main Content */}
      <div className="p-main-content" id="mainContent">
        <div className="proofreading-workspace">
          <div className="p-workspace-header">
            <div className="workspace-title-section">
              <div className="project-info">
                <div className="workspace-title">הגהת תמלול ישיבת בית המשפט</div>
                <div className="transcription-info">תמלול ראשוני: 24 עמודים | מתמלל: יוסי כהן | תאריך: 17/07/2025</div>
              </div>
            </div>
            <div className="workspace-status">
              <span className="status-badge">בהגהה</span>
              <span className="progress-indicator">עמוד 12 מתוך 24</span>
            </div>
          </div>

          <div className="proofreading-workspace-grid">
            {/* Media Player Section */}
            <div className="media-section">
              <div className="section-title">
                <div className="section-icon">🎵</div>
                נגן מדיה להגהה
              </div>
              <div className="media-placeholder">
                <p>אזור נגן המדיה - לצפייה בלבד במצב הגהה</p>
              </div>
            </div>

            {/* Main Proofreading Panel */}
            <div className="proofreading-panel">
              <div className="comparison-section">
                <div className="section-title">
                  <div className="section-icon">🔍</div>
                  השוואת טקסטים
                </div>
                <div className="text-comparison">
                  <div className="original-text">
                    <div className="text-label">תמלול מקורי</div>
                    <div className="text-content">
                      טקסט מקורי לדוגמה...
                    </div>
                  </div>
                  <div className="proofread-text">
                    <div className="text-label">טקסט מוגה</div>
                    <div 
                      className="text-content editable-text" 
                      contentEditable
                      suppressContentEditableWarning={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tools Panel */}
            <div className="tools-panel">
              {/* Changes Tracker */}
              <div className="changes-section">
                <div className="section-title">
                  <div className="section-icon">📊</div>
                  מעקב שינויים
                </div>
                <div className="changes-placeholder">
                  <p>רשימת שינויים</p>
                </div>
              </div>

              {/* Quality Control */}
              <div className="quality-section">
                <div className="section-title">
                  <div className="section-icon">⭐</div>
                  בקרת איכות
                </div>
                <div className="quality-score">
                  <div className="score-number">88%</div>
                  <div className="score-label">ציון איכות</div>
                </div>
              </div>

              {/* Actions */}
              <div className="actions-section">
                <div className="section-title">
                  <div className="section-icon">⚡</div>
                  פעולות
                </div>
                <div className="actions-grid">
                  <button className="btn btn-primary">שמור הגהה</button>
                  <button className="btn btn-secondary">הערות למתמלל</button>
                  <button className="btn btn-success">סיום הגהה</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .proofreading-page {
          background: white !important;
          min-height: 100vh !important;
        }
      `}</style>
    </div>
  );
}