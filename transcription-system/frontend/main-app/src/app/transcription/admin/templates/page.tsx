'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
  name: string;
  size: number;
  uploadedAt: string;
  isDefault: boolean;
}

export default function TemplatesManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionTemplate, setSessionTemplate] = useState<string>('');

  // Use relative URL for production, explicit URL for localhost
  const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '' // Use relative URL on production
    : 'http://localhost:5000'; // Use explicit URL on localhost

  // Hardcoded admin user IDs (both local and production)
  const ADMIN_USER_IDS = [
    // Production IDs
    '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
    '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
    // Local development IDs
    'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
    '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
  ];

  useEffect(() => {
    // Check authentication and admin access
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      if (!ADMIN_USER_IDS.includes(userId)) {
        router.push('/transcription');
        return;
      }
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/transcription');
      return;
    }

    // Load session template from localStorage
    const savedSessionTemplate = localStorage.getItem('sessionTemplate');
    if (savedSessionTemplate) {
      setSessionTemplate(savedSessionTemplate);
    }

    loadTemplates();
  }, [router]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/template/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setSelectedFile(file);
    } else {
      alert('אנא בחר קובץ Word (.docx)');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('template', selectedFile);

    try {
      const response = await fetch(`${baseUrl}/api/template/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert('התבנית הועלתה בהצלחה');
        setSelectedFile(null);
        loadTemplates();
      } else {
        alert('שגיאה בהעלאת התבנית');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('שגיאה בהעלאת התבנית');
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (templateName: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/template/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ templateName })
      });

      if (response.ok) {
        alert(`${templateName} הוגדרה כתבנית ברירת מחדל`);
        loadTemplates();
      } else {
        alert('שגיאה בהגדרת תבנית ברירת מחדל');
      }
    } catch (error) {
      console.error('Error setting default:', error);
      alert('שגיאה בהגדרת תבנית ברירת מחדל');
    }
  };

  const handleDelete = async (templateName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${templateName}?`)) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/template/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ templateName })
      });

      if (response.ok) {
        alert('התבנית נמחקה בהצלחה');
        // If deleted template was session template, clear it
        if (sessionTemplate === templateName) {
          setSessionTemplate('');
          localStorage.removeItem('sessionTemplate');
        }
        loadTemplates();
      } else {
        const error = await response.json();
        alert(error.error || 'שגיאה במחיקת התבנית');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('שגיאה במחיקת התבנית');
    }
  };

  const handleUseForSession = (templateName: string) => {
    setSessionTemplate(templateName);
    localStorage.setItem('sessionTemplate', templateName);
    alert(`${templateName} תשמש כתבנית עבור הסשן הנוכחי בלבד`);
  };

  const clearSessionTemplate = () => {
    setSessionTemplate('');
    localStorage.removeItem('sessionTemplate');
    alert('התבנית הזמנית נוקתה - משתמש בתבנית ברירת המחדל');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="page-templates">
        <div className="templates-container">
          <div className="loading">טוען...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-templates">
      {/* Fixed Header */}
      <div className="page-header-fixed">
        <div>
          <h1>ניהול תבניות Word</h1>
          <p>העלה, נהל והגדר תבניות Word לייצוא תמלולים</p>
        </div>
        <Link href="/transcription/admin" className="back-link">
          חזרה ללוח בקרה
        </Link>
      </div>

      <div className="templates-container">
        <div className="scrollable-content">
          {/* Session Template Notice */}
          {sessionTemplate && (
          <div className="session-notice">
            <span>תבנית זמנית לסשן הנוכחי: <strong>{sessionTemplate}</strong></span>
            <button className="btn-clear" onClick={clearSessionTemplate}>ניקוי</button>
          </div>
        )}

        {/* Upload Section */}
        <div className="upload-section">
          <h2>העלאת תבנית חדשה</h2>
          <div className="upload-controls">
            <input
              type="file"
              accept=".docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="template-upload"
            />
            <label htmlFor="template-upload" className="btn-secondary">
              בחר קובץ
            </label>
            {selectedFile && (
              <>
                <span className="file-name">{selectedFile.name}</span>
                <button 
                  className="btn-primary"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'מעלה...' : 'העלה תבנית'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Templates Table */}
        <div className="templates-table-container">
          <h2>תבניות קיימות</h2>
          <table className="templates-table">
            <thead>
              <tr>
                <th>שם תבנית</th>
                <th>גודל</th>
                <th>תאריך העלאה</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.name} className={sessionTemplate === template.name ? 'session-active' : ''}>
                  <td className="template-name">
                    {template.name}
                    {sessionTemplate === template.name && (
                      <span className="session-badge">סשן נוכחי</span>
                    )}
                  </td>
                  <td>{formatFileSize(template.size)}</td>
                  <td>{new Date(template.uploadedAt).toLocaleDateString('he-IL')}</td>
                  <td>
                    {template.isDefault ? (
                      <span className="status-badge default">ברירת מחדל</span>
                    ) : (
                      <span className="status-badge">רגיל</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!template.isDefault && (
                        <button 
                          className="btn-action set-default"
                          onClick={() => handleSetDefault(template.name)}
                          title="הגדר כברירת מחדל"
                        >
                          ⭐
                        </button>
                      )}
                      <button 
                        className="btn-action use-session"
                        onClick={() => handleUseForSession(template.name)}
                        title="השתמש לסשן הנוכחי"
                      >
                        🔄
                      </button>
                      {!template.isDefault && (
                        <button 
                          className="btn-action delete"
                          onClick={() => handleDelete(template.name)}
                          title="מחק"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {templates.length === 0 && (
            <div className="no-templates">אין תבניות זמינות. העלה תבנית ראשונה כדי להתחיל.</div>
          )}
        </div>

        {/* Instructions */}
        <div className="instructions-section">
          <h3>הוראות:</h3>
          <ul>
            <li>ניתן להעלות רק קבצי Word בפורמט .docx</li>
            <li>התבנית שמוגדרת כברירת מחדל תשמש את כל המשתמשים</li>
            <li>כוכב (⭐) - הגדר כתבנית ברירת מחדל לכל המשתמשים</li>
            <li>חצים (🔄) - השתמש בתבנית רק לסשן הנוכחי שלך (לא משפיע על אחרים)</li>
            <li>פח (🗑️) - מחק תבנית (לא ניתן למחוק את תבנית ברירת המחדל)</li>
            <li>תבנית זמנית לסשן נשמרת רק עבורך ולא משפיעה על משתמשים אחרים</li>
          </ul>
        </div>
        </div>
      </div>

      <style jsx>{`
        .page-templates {
          background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
          height: 100vh;
          direction: rtl;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .page-header-fixed {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 25px 40px;
          background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
          border-bottom: 2px solid rgba(224, 169, 109, 0.3);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .page-header-fixed h1 {
          font-size: 32px;
          color: #201e20;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .page-header-fixed p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .back-link {
          background: white;
          color: #5a4a3a;
          padding: 10px 25px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid #e0a96d;
          white-space: nowrap;
        }

        .back-link:hover {
          background: #fef8f2;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(224, 169, 109, 0.3);
        }

        .templates-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 0 30px;
        }

        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          padding: 30px 10px 40px 10px;
        }

        /* Admin templates brown scrollbar */
        .page-templates .scrollable-content::-webkit-scrollbar {
          width: 10px;
        }

        .page-templates .scrollable-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 5px;
        }

        .page-templates .scrollable-content::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 5px;
        }

        .page-templates .scrollable-content::-webkit-scrollbar-thumb:hover {
          background: #c7915b;
        }

        .session-notice {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border: 2px solid #ffc107;
          border-radius: 15px;
          padding: 15px 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 3px 10px rgba(255, 193, 7, 0.2);
        }

        .session-notice strong {
          color: #856404;
        }

        .btn-clear {
          background: #dc3545;
          color: white;
          border: none;
          padding: 5px 15px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .btn-clear:hover {
          background: #c82333;
          transform: translateY(-2px);
        }

        .upload-section {
          background: white;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 30px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .upload-section h2 {
          font-size: 20px;
          color: #5a4a3a;
          margin-bottom: 20px;
          font-weight: 600;
        }

        .upload-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 30px;
          border: none;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #e0a96d 0%, #c7915b 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(224, 169, 109, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(224, 169, 109, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #c7915b;
          border: 2px solid #e0a96d;
        }

        .btn-secondary:hover {
          background: #fef8f2;
          transform: translateY(-2px);
        }

        .file-name {
          color: #666;
          font-size: 14px;
        }

        .templates-table-container {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          margin-bottom: 30px;
          overflow-x: auto;
          max-width: 100%;
        }

        /* Custom scrollbar styles */
        .templates-table-container::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .templates-table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .templates-table-container::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 10px;
        }

        .templates-table-container::-webkit-scrollbar-thumb:hover {
          background: #c7915b;
        }

        .templates-table-container h2 {
          font-size: 20px;
          color: #5a4a3a;
          margin-bottom: 20px;
          font-weight: 600;
        }

        .templates-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .templates-table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%);
          padding: 12px;
          text-align: right;
          font-weight: 600;
          color: #5a4a3a;
          border-bottom: 2px solid #e0a96d;
        }

        .templates-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .templates-table tr:hover {
          background: rgba(224, 169, 109, 0.05);
        }

        .templates-table tr.session-active {
          background: rgba(255, 193, 7, 0.1);
        }

        .template-name {
          font-weight: 500;
          color: #201e20;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .session-badge {
          background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
          color: white;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.default {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
        }

        .status-badge:not(.default) {
          background: #f0f0f0;
          color: #666;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 5px;
          transition: all 0.3s ease;
        }

        .btn-action:hover {
          transform: scale(1.2);
        }

        .btn-action.set-default:hover {
          filter: drop-shadow(0 0 5px gold);
        }

        .btn-action.use-session:hover {
          filter: drop-shadow(0 0 5px #ffc107);
        }

        .btn-action.delete:hover {
          filter: drop-shadow(0 0 5px #dc3545);
        }

        .no-templates {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .instructions-section {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
        }

        .instructions-section h3 {
          color: #5a4a3a;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: 600;
        }

        .instructions-section ul {
          list-style: none;
          padding: 0;
        }

        .instructions-section li {
          padding: 8px 0;
          color: #666;
          position: relative;
          padding-right: 20px;
        }

        .instructions-section li:before {
          content: "•";
          color: #e0a96d;
          font-weight: bold;
          position: absolute;
          right: 0;
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #666;
        }
      `}</style>
    </div>
  );
}