'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ExportSidebar() {
  const [activeTab, setActiveTab] = useState<'recent' | 'templates'>('recent');

  // Mock data
  const recentExports = [
    { id: 1, name: 'ישיבת דירקטוריון', format: 'PDF', date: 'לפני שעה', size: '2.3MB' },
    { id: 2, name: 'הרצאה אקדמית', format: 'Word', date: 'היום', size: '1.8MB' },
    { id: 3, name: 'ראיון עיתונאי', format: 'TXT', date: 'אתמול', size: '156KB' },
    { id: 4, name: 'כנס רפואי', format: 'PDF', date: 'לפני 3 ימים', size: '4.2MB' },
  ];

  const savedTemplates = [
    { id: 1, name: 'תבנית רשמית', uses: 45, lastUsed: 'היום' },
    { id: 2, name: 'תבנית כתוביות', uses: 23, lastUsed: 'אתמול' },
    { id: 3, name: 'תבנית פשוטה', uses: 67, lastUsed: 'השבוע' },
    { id: 4, name: 'תבנית אקדמית', uses: 12, lastUsed: 'החודש' },
  ];

  return (
    <div className="ex-sidebar-content">
      <div className="ex-sidebar-tabs">
        <button 
          className={`ex-tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          ייצואים אחרונים
        </button>
        <button 
          className={`ex-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          תבניות שמורות
        </button>
      </div>

      {activeTab === 'recent' ? (
        <div className="ex-recent-list">
          <h3>היסטוריית ייצואים</h3>
          {recentExports.map(exp => (
            <div key={exp.id} className="ex-export-item">
              <div className="ex-export-header">
                <span className="ex-export-name">{exp.name}</span>
                <span className={`ex-format-badge format-${exp.format.toLowerCase()}`}>
                  {exp.format}
                </span>
              </div>
              <div className="ex-export-info">
                <span className="ex-export-date">{exp.date}</span>
                <span className="ex-export-size">{exp.size}</span>
                <button className="ex-download-btn" title="הורד מחדש">⬇</button>
              </div>
            </div>
          ))}
          <div className="ex-stats-summary">
            <h4>סיכום שבועי</h4>
            <div className="ex-stat-row">
              <span>סה"כ ייצואים:</span>
              <span className="ex-stat-value">32</span>
            </div>
            <div className="ex-stat-row">
              <span>נפח כולל:</span>
              <span className="ex-stat-value">156MB</span>
            </div>
            <div className="ex-stat-row">
              <span>פורמט נפוץ:</span>
              <span className="ex-stat-value">PDF</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="ex-templates-list">
          <h3>תבניות מותאמות אישית</h3>
          {savedTemplates.map(template => (
            <div key={template.id} className="ex-template-item">
              <div className="ex-template-header">
                <span className="ex-template-name">{template.name}</span>
                <button className="ex-edit-btn" title="ערוך">✏️</button>
              </div>
              <div className="ex-template-info">
                <span className="ex-template-uses">{template.uses} שימושים</span>
                <span className="ex-template-date">עודכן: {template.lastUsed}</span>
              </div>
              <div className="ex-template-actions">
                <button className="ex-use-btn">השתמש</button>
                <button className="ex-duplicate-btn">שכפל</button>
                <button className="ex-delete-btn">מחק</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ex-sidebar-footer">
        <Link href="/transcription/export/history" className="ex-sidebar-link">
          היסטוריה מלאה
        </Link>
        <Link href="/transcription/export/settings" className="ex-sidebar-link">
          הגדרות ייצוא
        </Link>
      </div>

      <style jsx>{`
        .ex-sidebar-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 15px;
          color: white;
        }

        .ex-sidebar-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .ex-tab {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 13px;
        }

        .ex-tab:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .ex-tab.active {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }

        .ex-recent-list,
        .ex-templates-list {
          flex: 1;
          overflow-y: auto;
        }

        .ex-recent-list h3,
        .ex-templates-list h3 {
          font-size: 18px;
          margin-bottom: 15px;
          font-weight: 600;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .ex-export-item,
        .ex-template-item {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
          transition: all 0.3s ease;
        }

        .ex-export-item:hover,
        .ex-template-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(-5px);
        }

        .ex-export-header,
        .ex-template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .ex-export-name,
        .ex-template-name {
          font-weight: 500;
          font-size: 14px;
        }

        .ex-format-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .ex-format-badge.format-pdf {
          background: rgba(244, 67, 54, 0.3);
          color: #ff8a80;
        }

        .ex-format-badge.format-word {
          background: rgba(33, 150, 243, 0.3);
          color: #82b1ff;
        }

        .ex-format-badge.format-txt {
          background: rgba(76, 175, 80, 0.3);
          color: #a5d6a7;
        }

        .ex-export-info,
        .ex-template-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .ex-export-date,
        .ex-export-size,
        .ex-template-uses,
        .ex-template-date {
          flex: 1;
        }

        .ex-download-btn,
        .ex-edit-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .ex-download-btn:hover,
        .ex-edit-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .ex-template-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .ex-use-btn,
        .ex-duplicate-btn,
        .ex-delete-btn {
          flex: 1;
          padding: 6px 10px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .ex-use-btn {
          background: rgba(139, 195, 74, 0.3);
          color: #aed581;
        }

        .ex-duplicate-btn {
          background: rgba(255, 193, 7, 0.3);
          color: #ffd54f;
        }

        .ex-delete-btn {
          background: rgba(244, 67, 54, 0.3);
          color: #ff8a80;
        }

        .ex-use-btn:hover,
        .ex-duplicate-btn:hover,
        .ex-delete-btn:hover {
          transform: translateY(-2px);
          opacity: 0.8;
        }

        .ex-stats-summary {
          margin-top: 20px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .ex-stats-summary h4 {
          font-size: 14px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .ex-stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .ex-stat-value {
          font-weight: 600;
          color: #e91e63;
        }

        .ex-sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          margin-top: 20px;
        }

        .ex-sidebar-link {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .ex-sidebar-link:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      `}</style>
    </div>
  );
}