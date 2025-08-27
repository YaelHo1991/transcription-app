'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
import HoveringHeader from '../components/HoveringHeader';
import ExportSidebar from './components/ExportSidebar';
import UnauthorizedOverlay from '../../../components/UnauthorizedOverlay/UnauthorizedOverlay';
import './export-theme.css';
import './export-page.css';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  settings: {
    includeTimestamps: boolean;
    includeSpeakers: boolean;
    includeProjectInfo: boolean;
    includePageNumbers: boolean;
    speakerFormat: 'inline' | 'newline' | 'bullet';
    headerText?: string;
    footerText?: string;
  };
}

export default function ExportPage() {
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
    
    // Check if user has export permission
    if (!permissions || !permissions.includes('F')) {
      setHasPermission(false);
    } else {
      setHasPermission(true);
    }
  }, []);
  
  const [headerLocked, setHeaderLocked] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  
  // Export page states
  const [activeTab, setActiveTab] = useState<'export' | 'templates'>('export');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [exportSettings, setExportSettings] = useState({
    includeTimestamps: false,
    includeSpeakers: true,
    includeProjectInfo: true,
    includePageNumbers: true,
    speakerFormat: 'inline' as 'inline' | 'newline' | 'bullet',
    headerText: '',
    footerText: ''
  });

  // Sample templates
  const templates: ExportTemplate[] = [
    {
      id: '1',
      name: 'תבנית רשמית',
      description: 'מסמך רשמי עם כותרות ומספרי עמודים',
      settings: {
        includeTimestamps: false,
        includeSpeakers: true,
        includeProjectInfo: true,
        includePageNumbers: true,
        speakerFormat: 'newline',
        headerText: 'תמלול רשמי',
        footerText: 'סודי'
      }
    },
    {
      id: '2',
      name: 'תבנית כתוביות',
      description: 'פורמט מותאם לכתוביות וידאו',
      settings: {
        includeTimestamps: true,
        includeSpeakers: false,
        includeProjectInfo: false,
        includePageNumbers: false,
        speakerFormat: 'inline',
        headerText: '',
        footerText: ''
      }
    }
  ];
  
  // Memoize callbacks
  const handleHeaderLockChange = useCallback((locked: boolean) => {
    setHeaderLocked(locked);
  }, []);

  const handleSidebarLockChange = useCallback((locked: boolean) => {
    setSidebarLocked(locked);
  }, []);

  const handleTemplateSelect = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setExportSettings(template.settings);
  };

  return (
    <>
      {hasPermission === false && (
        <UnauthorizedOverlay 
          requiredPermission="F"
          permissionName="ייצוא"
          theme="export"
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
          themeColor="purple"
        />
      }
      sidebarContent={<ExportSidebar />}
      theme="export"
      onHeaderLockChange={handleHeaderLockChange}
      onSidebarLockChange={handleSidebarLockChange}
    >
      {/* Workspace Header */}
      <div className={`ex-workspace-header ${headerLocked ? 'ex-header-locked' : ''}`}>
        <div className="ex-header-content">
          <div className="ex-workspace-title">ייצוא תמלול</div>
          <div className="ex-header-divider"></div>
          <div className="ex-tabs-container">
            <button 
              className={`ex-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              ייצוא
            </button>
            <button 
              className={`ex-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              תבניות
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`ex-main-content ${headerLocked ? 'header-locked' : ''} ${sidebarLocked ? 'sidebar-locked' : ''}`}>
        <div className="ex-content-container">
          
          {activeTab === 'export' ? (
            <div className="ex-workspace-grid">
              
              {/* Main Export Panel */}
              <div className="ex-main-workspace">
                
                {/* Preview Section */}
                <div className="ex-preview-container">
                  <div className="ex-component-header">
                    <h3>תצוגה מקדימה</h3>
                    <div className="ex-preview-controls">
                      <button className="ex-zoom-btn">🔍 הגדל</button>
                      <button className="ex-zoom-btn">🔍 הקטן</button>
                    </div>
                  </div>
                  <div className="ex-preview-content">
                    <div className="ex-document-preview">
                      {exportSettings.includeProjectInfo && (
                        <div className="ex-preview-header">
                          <h1>פרויקט: ישיבת דירקטוריון</h1>
                          <p>תאריך: 17/08/2025 | מתמלל: יוסי כהן</p>
                        </div>
                      )}
                      {exportSettings.headerText && (
                        <div className="ex-preview-custom-header">{exportSettings.headerText}</div>
                      )}
                      <div className="ex-preview-body">
                        {exportSettings.includeSpeakers && exportSettings.speakerFormat === 'bullet' && (
                          <ul className="ex-speakers-list">
                            <li>דובר 1: יו"ר הדירקטוריון</li>
                            <li>דובר 2: מנכ"ל</li>
                            <li>דובר 3: סמנכ"ל כספים</li>
                          </ul>
                        )}
                        <div className="ex-preview-text">
                          {exportSettings.includeTimestamps && <span className="ex-timestamp">[00:00:15]</span>}
                          {exportSettings.includeSpeakers && exportSettings.speakerFormat === 'inline' && (
                            <strong>דובר 1: </strong>
                          )}
                          {exportSettings.includeSpeakers && exportSettings.speakerFormat === 'newline' && (
                            <>
                              <strong>דובר 1:</strong><br/>
                            </>
                          )}
                          טקסט לדוגמה של התמלול המיוצא...
                        </div>
                      </div>
                      {exportSettings.footerText && (
                        <div className="ex-preview-footer">{exportSettings.footerText}</div>
                      )}
                      {exportSettings.includePageNumbers && (
                        <div className="ex-page-number">עמוד 1</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Template Selector */}
                <div className="ex-template-selector">
                  <div className="ex-component-header">
                    <h3>בחר תבנית</h3>
                  </div>
                  <div className="ex-templates-grid">
                    {templates.map(template => (
                      <div 
                        key={template.id}
                        className={`ex-template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <h4>{template.name}</h4>
                        <p>{template.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Export Settings Panel */}
              <div className="ex-side-workspace">
                
                {/* Export Settings */}
                <div className="ex-settings-container">
                  <div className="ex-component-header">
                    <h3>הגדרות ייצוא</h3>
                  </div>
                  <div className="ex-settings-content">
                    
                    <div className="ex-setting-group">
                      <h4>אלמנטים לכלול</h4>
                      <label className="ex-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={exportSettings.includeTimestamps}
                          onChange={(e) => setExportSettings({...exportSettings, includeTimestamps: e.target.checked})}
                        />
                        חותמות זמן
                      </label>
                      <label className="ex-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={exportSettings.includeSpeakers}
                          onChange={(e) => setExportSettings({...exportSettings, includeSpeakers: e.target.checked})}
                        />
                        שמות דוברים
                      </label>
                      <label className="ex-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={exportSettings.includeProjectInfo}
                          onChange={(e) => setExportSettings({...exportSettings, includeProjectInfo: e.target.checked})}
                        />
                        פרטי פרויקט
                      </label>
                      <label className="ex-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={exportSettings.includePageNumbers}
                          onChange={(e) => setExportSettings({...exportSettings, includePageNumbers: e.target.checked})}
                        />
                        מספרי עמודים
                      </label>
                    </div>
                    
                    <div className="ex-setting-group">
                      <h4>פורמט דוברים</h4>
                      <select 
                        className="ex-select"
                        value={exportSettings.speakerFormat}
                        onChange={(e) => setExportSettings({...exportSettings, speakerFormat: e.target.value as any})}
                      >
                        <option value="inline">באותה שורה</option>
                        <option value="newline">שורה חדשה</option>
                        <option value="bullet">רשימה</option>
                      </select>
                    </div>
                    
                    <div className="ex-setting-group">
                      <h4>כותרת עליונה</h4>
                      <input 
                        type="text" 
                        className="ex-input"
                        placeholder="טקסט לכותרת עליונה..."
                        value={exportSettings.headerText}
                        onChange={(e) => setExportSettings({...exportSettings, headerText: e.target.value})}
                      />
                    </div>
                    
                    <div className="ex-setting-group">
                      <h4>כותרת תחתונה</h4>
                      <input 
                        type="text" 
                        className="ex-input"
                        placeholder="טקסט לכותרת תחתונה..."
                        value={exportSettings.footerText}
                        onChange={(e) => setExportSettings({...exportSettings, footerText: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Export Actions */}
                <div className="ex-actions-container">
                  <div className="ex-component-header">
                    <h3>פעולות</h3>
                  </div>
                  <div className="ex-actions-content">
                    <button className="ex-action-btn ex-primary">
                      📥 ייצא כ-Word
                    </button>
                    <button className="ex-action-btn ex-secondary">
                      📄 ייצא כ-PDF
                    </button>
                    <button className="ex-action-btn ex-tertiary">
                      📝 ייצא כטקסט
                    </button>
                    <button className="ex-action-btn ex-outline">
                      📧 שלח במייל
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
          ) : (
            /* Templates Tab */
            <div className="ex-templates-workspace">
              <div className="ex-template-editor">
                <div className="ex-component-header">
                  <h3>עורך תבניות</h3>
                  <button className="ex-new-template-btn">+ תבנית חדשה</button>
                </div>
                <div className="ex-template-editor-content">
                  <p>כאן יופיע עורך התבניות המתקדם</p>
                  <p>ניתן ליצור ולערוך תבניות מותאמות אישית</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </HoveringBarsLayout>
    </>
  );
}