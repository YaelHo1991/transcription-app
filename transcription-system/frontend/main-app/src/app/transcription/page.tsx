'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  client?: string;
  company: string;
  workType: 'transcription' | 'proofreading' | 'export';
  status: string;
  createdAt: string;
  pages?: number;
  files?: number;
  duration?: string;
}

interface CompanyGroup {
  name: string;
  projects: Project[];
  totalProjects: number;
  totalPages: number;
  latestDate?: string;
}

export default function TranscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  
  // Mock data organized by work type and company
  const [transcriptionByCompany, setTranscriptionByCompany] = useState<CompanyGroup[]>([]);
  const [proofreadingByCompany, setProofreadingByCompany] = useState<CompanyGroup[]>([]);
  const [exportByCompany, setExportByCompany] = useState<CompanyGroup[]>([]);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const permissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has any transcription permissions
    const hasTranscriptionAccess = 
      permissions.includes('D') || 
      permissions.includes('E') || 
      permissions.includes('F');
    
    if (!hasTranscriptionAccess) {
      router.push('/login?system=transcription');
      return;
    }

    loadProjects();
  }, [router]);

  const loadProjects = () => {
    // Mock data - in real app this would come from API
    const mockTranscriptionGroups: CompanyGroup[] = [
      {
        name: 'טכנולוגיות מתקדמות בע"מ',
        totalProjects: 3,
        totalPages: 45,
        latestDate: '15/01',
        projects: [
          {
            id: '1',
            title: 'ישיבת דירקטוריון Q1',
            company: 'טכנולוגיות מתקדמות בע"מ',
            client: 'יוסי כהן',
            workType: 'transcription',
            status: 'active',
            createdAt: '2024-01-15',
            pages: 12,
            duration: '45:30'
          },
          {
            id: '2',
            title: 'הצגת מוצר חדש',
            company: 'טכנולוגיות מתקדמות בע"מ',
            workType: 'transcription',
            status: 'active',
            createdAt: '2024-01-14',
            pages: 8,
            duration: '28:15'
          }
        ]
      },
      {
        name: 'המרכז הרפואי',
        totalProjects: 2,
        totalPages: 67,
        latestDate: '14/01',
        projects: [
          {
            id: '3',
            title: 'כנס רפואי בינלאומי',
            company: 'המרכז הרפואי',
            workType: 'transcription',
            status: 'active',
            createdAt: '2024-01-14',
            pages: 34,
            duration: '2:15:00'
          }
        ]
      },
      {
        name: 'פרויקטים עצמאיים',
        totalProjects: 5,
        totalPages: 0,
        latestDate: '13/01',
        projects: [
          {
            id: '4',
            title: 'ראיון אישי - מחקר',
            company: 'פרויקטים עצמאיים',
            workType: 'transcription',
            status: 'active',
            createdAt: '2024-01-13',
            files: 3,
            duration: '1:05:20'
          },
          {
            id: '5',
            title: 'פודקאסט פרק 12',
            company: 'פרויקטים עצמאיים',
            workType: 'transcription',
            status: 'active',
            createdAt: '2024-01-12',
            files: 1,
            duration: '58:45'
          }
        ]
      }
    ];

    const mockProofreadingGroups: CompanyGroup[] = [
      {
        name: 'האוניברסיטה העברית',
        totalProjects: 2,
        totalPages: 28,
        latestDate: '15/01',
        projects: [
          {
            id: '6',
            title: 'הרצאה - פיזיקה קוונטית',
            company: 'האוניברסיטה העברית',
            workType: 'proofreading',
            status: 'review',
            createdAt: '2024-01-15',
            pages: 18
          }
        ]
      },
      {
        name: 'מכון המחקר',
        totalProjects: 1,
        totalPages: 12,
        latestDate: '14/01',
        projects: [
          {
            id: '7',
            title: 'קבוצת מיקוד - מחקר שוק',
            company: 'מכון המחקר',
            workType: 'proofreading',
            status: 'review',
            createdAt: '2024-01-14',
            pages: 12
          }
        ]
      }
    ];

    const mockExportGroups: CompanyGroup[] = [
      {
        name: 'רדיו דיגיטלי',
        totalProjects: 3,
        totalPages: 0,
        latestDate: '15/01',
        projects: [
          {
            id: '8',
            title: 'תוכנית בוקר - 15.01',
            company: 'רדיו דיגיטלי',
            workType: 'export',
            status: 'ready',
            createdAt: '2024-01-15'
          }
        ]
      }
    ];

    setTranscriptionByCompany(mockTranscriptionGroups);
    setProofreadingByCompany(mockProofreadingGroups);
    setExportByCompany(mockExportGroups);
    setLoading(false);
  };

  const toggleCompany = (companyKey: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyKey)) {
      newExpanded.delete(companyKey);
    } else {
      newExpanded.add(companyKey);
    }
    setExpandedCompanies(newExpanded);
  };

  const renderCompanyGroup = (group: CompanyGroup, workType: string) => {
    const companyKey = `${workType}-${group.name}`;
    const isExpanded = expandedCompanies.has(companyKey);

    return (
      <div key={companyKey} className="company-group">
        <div className="company-header" onClick={() => toggleCompany(companyKey)}>
          <div className="company-info">
            <div className="company-icon">🏢</div>
            <div className="company-details">
              <div className="company-name">{group.name}</div>
              <div className="company-stats">
                <span className="company-stat">{group.totalProjects} פרויקטים</span>
                {group.totalPages > 0 && (
                  <span className="company-stat">{group.totalPages} עמודים</span>
                )}
                {group.latestDate && (
                  <span className="company-stat">עדכון: {group.latestDate}</span>
                )}
              </div>
            </div>
          </div>
          <button className="company-toggle">
            <span className="toggle-text">{isExpanded ? 'הסתר' : 'הצג'} פרטים</span>
          </button>
        </div>

        {isExpanded && (
          <div className="company-projects expanded">
            {group.projects.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-title">{project.title}</div>
                <div className="project-details">
                  {project.client && (
                    <div><strong>לקוח:</strong> {project.client}</div>
                  )}
                  {project.pages && (
                    <div><strong>עמודים:</strong> {project.pages}</div>
                  )}
                  {project.files && (
                    <div><strong>קבצים:</strong> {project.files}</div>
                  )}
                  {project.duration && (
                    <div><strong>משך:</strong> {project.duration}</div>
                  )}
                </div>
                <div className="project-actions">
                  {workType === 'transcription' && (
                    <button className="btn btn-primary">התחל תמלול</button>
                  )}
                  {workType === 'proofreading' && (
                    <button className="btn btn-primary">התחל הגהה</button>
                  )}
                  {workType === 'export' && (
                    <button className="btn btn-primary">ייצא</button>
                  )}
                  <button className="btn btn-secondary">פרטים</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const totalTranscription = transcriptionByCompany.reduce((sum, g) => sum + g.totalProjects, 0);
  const totalProofreading = proofreadingByCompany.reduce((sum, g) => sum + g.totalProjects, 0);
  const totalExport = exportByCompany.reduce((sum, g) => sum + g.totalProjects, 0);

  return (
    <div className="container">
      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{totalTranscription}</div>
          <div className="stat-label">עבודות תמלול</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✏️</div>
          <div className="stat-value">{totalProofreading}</div>
          <div className="stat-label">עבודות הגהה</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-value">{totalExport}</div>
          <div className="stat-label">עבודות ייצוא</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{totalTranscription + totalProofreading + totalExport}</div>
          <div className="stat-label">סה"כ עבודות</div>
        </div>
      </div>

      {/* Main Work Sections Grid */}
      <div className="main-grid">
        {/* Transcription Section */}
        <div className="work-section transcription-section">
          <Link href="/transcription/transcription" className="section-header">
            <div className="section-icon">📝</div>
            <div>
              <div className="section-title">תמלול</div>
              <div className="section-count">{totalTranscription} עבודות</div>
            </div>
          </Link>

          <div className="work-section-content">
            {transcriptionByCompany.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>אין עבודות תמלול כרגע</h3>
                <p>עבודות תמלול חדשות יופיעו כאן</p>
              </div>
            ) : (
              transcriptionByCompany.map(group => renderCompanyGroup(group, 'transcription'))
            )}
          </div>
          
          <div className="column-action">
            <button className="btn-add-project">
              <span>📝</span>
              <span>תמלול חדש</span>
            </button>
          </div>
        </div>

        {/* Proofreading Section */}
        <div className="work-section proofreading-section">
          <Link href="/transcription/proofreading" className="section-header">
            <div className="section-icon">✏️</div>
            <div>
              <div className="section-title">הגהה</div>
              <div className="section-count">{totalProofreading} עבודות</div>
            </div>
          </Link>

          <div className="work-section-content">
            {proofreadingByCompany.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✏️</div>
                <h3>אין עבודות הגהה כרגע</h3>
                <p>עבודות הגהה חדשות יופיעו כאן</p>
              </div>
            ) : (
              proofreadingByCompany.map(group => renderCompanyGroup(group, 'proofreading'))
            )}
          </div>
          
          <div className="column-action">
            <button className="btn-add-project">
              <span>✏️</span>
              <span>הגהה חדשה</span>
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div className="work-section export-section">
          <Link href="/transcription/export" className="section-header">
            <div className="section-icon">📤</div>
            <div>
              <div className="section-title">ייצוא</div>
              <div className="section-count">{totalExport} עבודות</div>
            </div>
          </Link>

          <div className="work-section-content">
            {exportByCompany.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📤</div>
                <h3>אין עבודות ייצוא כרגע</h3>
                <p>עבודות ייצוא חדשות יופיעו כאן</p>
              </div>
            ) : (
              exportByCompany.map(group => renderCompanyGroup(group, 'export'))
            )}
          </div>
          
          <div className="column-action">
            <button className="btn-add-project">
              <span>📤</span>
              <span>ייצוא חדש</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}