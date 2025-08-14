'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './export.css';

interface ExportFormat {
  id: string;
  name: string;
  icon: string;
  description: string;
  extension: string;
}

interface ExportProject {
  id: string;
  title: string;
  client: string;
  date: string;
  pages: number;
  formats: string[];
}

export default function ExportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [headerTimeout, setHeaderTimeout] = useState<number | null>(null);
  const [sidebarTimeout, setSidebarTimeout] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [projects, setProjects] = useState<ExportProject[]>([]);
  const [userFullName, setUserFullName] = useState('');
  const [permissions, setPermissions] = useState('');

  const exportFormats: ExportFormat[] = [
    {
      id: 'word',
      name: 'Word',
      icon: '📄',
      description: 'מסמך Word עם עיצוב מלא',
      extension: '.docx'
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: '📑',
      description: 'קובץ PDF להדפסה',
      extension: '.pdf'
    },
    {
      id: 'srt',
      name: 'כתוביות SRT',
      icon: '🎬',
      description: 'קובץ כתוביות לוידאו',
      extension: '.srt'
    },
    {
      id: 'txt',
      name: 'טקסט פשוט',
      icon: '📝',
      description: 'קובץ טקסט ללא עיצוב',
      extension: '.txt'
    }
  ];

  useEffect(() => {
    
    // Get user data from localStorage
    const fullName = localStorage.getItem('userFullName') || '';
    const token = localStorage.getItem('token');
    const userPermissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has export permission (F)
    if (!userPermissions.includes('F')) {
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
    // Mock data for export projects
    const mockProjects: ExportProject[] = [
      {
        id: '1',
        title: 'סמינר עסקי - אסטרטגיה דיגיטלית',
        client: 'חברת הייטק',
        date: '2025-08-10',
        pages: 25,
        formats: ['word', 'pdf']
      },
      {
        id: '2',
        title: 'ראיון אישי - מנכ"ל',
        client: 'ערוץ החדשות',
        date: '2025-08-09',
        pages: 8,
        formats: ['srt', 'txt']
      },
      {
        id: '3',
        title: 'הרצאה אקדמית - כלכלה',
        client: 'אוניברסיטת תל אביב',
        date: '2025-08-08',
        pages: 42,
        formats: ['word', 'pdf', 'txt']
      }
    ];

    setProjects(mockProjects);
    setSelectedFormat(exportFormats[0]);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login?system=transcription');
  };

  const canAccessTranscription = permissions.includes('D');
  const canAccessProofreading = permissions.includes('E');

  if (loading) {
    return (
      <div className="export-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="export-page" dir="rtl">
      {/* Header Reveal Zone */}
      <div 
        className="header-reveal-zone"
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
        className={`collapsible-header ${showHeader ? 'show' : ''}`}
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
        <div className="nav">
          <div className="nav-content">
            <div className="nav-links">
            <Link href="/transcription">דף הבית</Link>
            {canAccessTranscription && (
              <Link href="/transcription/transcription">תמלול</Link>
            )}
            {canAccessProofreading && (
              <Link href="/transcription/proofreading">הגהה</Link>
            )}
            <Link href="/transcription/export" className="active">ייצוא</Link>
            <Link href="/transcription/records">רישומים</Link>
            </div>
            <div className="user-info">
              <div className="user-profile">
                <span>שלום, {userFullName}</span>
              </div>
              <a href="#" onClick={handleLogout} className="logout-btn">התנתק</a>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Reveal Zone */}
      <div 
        className="sidebar-reveal-zone"
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
        className={`sidebar ${showSidebar ? 'show' : ''}`}
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
        <div className="sidebar-header">
          <h3 className="sidebar-title">היסטוריית ייצוא</h3>
          <button className="sidebar-close" onClick={() => setShowSidebar(false)}>×</button>
        </div>
        <div className="sidebar-content">
          {/* Export Statistics */}
          <div className="sidebar-stats">
            <div className="sidebar-stats-title">סטטיסטיקות ייצוא</div>
            <div className="sidebar-stats-grid">
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-number">47</div>
                <div className="sidebar-stat-label">ייצואים השבוע</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-number">12</div>
                <div className="sidebar-stat-label">ממתינים</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-number">PDF</div>
                <div className="sidebar-stat-label">פורמט נפוץ</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-number">1.2GB</div>
                <div className="sidebar-stat-label">נפח כולל</div>
              </div>
            </div>
          </div>

          {/* Recent Exports */}
          <div className="export-history">
            <h3 className="history-title">ייצואים אחרונים</h3>
            {projects.map(project => (
              <div key={project.id} className="history-item">
                <div className="history-item-title">{project.title}</div>
                <div className="history-item-meta">
                  <span>{project.client}</span>
                  <span>{project.date}</span>
                </div>
                <div className="history-formats">
                  {project.formats.map(format => (
                    <span key={format} className="format-tag">
                      {exportFormats.find(f => f.id === format)?.extension}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="overlay" id="overlay" onClick={() => setShowSidebar(false)}></div>

      {/* Main Content */}
      <div className="main-content" id="mainContent">
        <div className="export-workspace">
          <div className="workspace-header">
            <div className="workspace-title-section">
              <div className="project-info">
                <div className="workspace-title">ייצוא תמלול ישיבת בית המשפט</div>
                <div className="document-info">24 עמודים | הוגה על ידי: שרה לוי | מוכן לייצוא</div>
              </div>
            </div>
            <div className="workspace-status">
              <span className="status-badge">מוכן לייצוא</span>
              <span className="export-progress">3 פורמטים זמינים</span>
            </div>
          </div>

          <div className="workspace-grid">
            {/* Media Section */}
            <div className="media-section">
              <div className="section-title">
                <div className="section-icon">🎵</div>
                קבצי מדיה מקושרים
              </div>
              <div className="media-placeholder">
                <p>2 קבצי אודיו • משך כולל: 1:10:50</p>
              </div>
            </div>

            {/* Export Panel */}
            <div className="export-panel">
              <div className="format-selection">
                <div className="section-title">
                  <div className="section-icon">📄</div>
                  בחר פורמט ייצוא
                </div>
                <div className="format-grid">
                  {exportFormats.map(format => (
                    <div 
                      key={format.id}
                      className={`format-card ${selectedFormat?.id === format.id ? 'selected' : ''}`}
                      onClick={() => setSelectedFormat(format)}
                    >
                      <div className="format-icon">{format.icon}</div>
                      <div className="format-name">{format.name}</div>
                      <div className="format-description">{format.description}</div>
                      <div className="format-extension">{format.extension}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tools Panel */}
            <div className="tools-panel">
              {/* Export Options */}
              <div className="export-options">
                <div className="section-title">
                  <div className="section-icon">⚙️</div>
                  אפשרויות ייצוא
                </div>
                <div className="options-grid">
                  <div className="option-item">
                    <input type="checkbox" id="include-timestamps" />
                    <label htmlFor="include-timestamps">חותמות זמן</label>
                  </div>
                  <div className="option-item">
                    <input type="checkbox" id="include-speakers" defaultChecked />
                    <label htmlFor="include-speakers">שמות דוברים</label>
                  </div>
                  <div className="option-item">
                    <input type="checkbox" id="include-notes" />
                    <label htmlFor="include-notes">הערות</label>
                  </div>
                  <div className="option-item">
                    <input type="checkbox" id="batch-export" />
                    <label htmlFor="batch-export">קובץ מאוחד</label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="actions-section">
                <div className="section-title">
                  <div className="section-icon">⚡</div>
                  פעולות
                </div>
                <div className="actions-grid">
                  <button className="btn btn-primary">ייצא כעת</button>
                  <button className="btn btn-secondary">תצוגה מקדימה</button>
                  <button className="btn btn-success">שלח במייל</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .export-page {
          background: white !important;
          min-height: 100vh !important;
        }
      `}</style>
    </div>
  );
}