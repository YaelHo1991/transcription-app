'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ProofreadingSidebar() {
  const [activeTab, setActiveTab] = useState<'projects' | 'stats'>('projects');

  // Mock data
  const projects = [
    { id: 1, name: 'ישיבת דירקטוריון', status: 'בהגהה', pages: 15, progress: 60 },
    { id: 2, name: 'הרצאה אקדמית', status: 'ממתין', pages: 28, progress: 0 },
    { id: 3, name: 'ראיון עיתונאי', status: 'הושלם', pages: 8, progress: 100 },
    { id: 4, name: 'כנס רפואי', status: 'בהגהה', pages: 42, progress: 35 },
  ];

  const stats = {
    todayProofread: 12,
    weeklyProofread: 68,
    avgAccuracy: 94,
    totalProjects: 156
  };

  return (
    <div className="pr-sidebar-content">
      <div className="pr-sidebar-tabs">
        <button 
          className={`pr-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          פרויקטים
        </button>
        <button 
          className={`pr-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          סטטיסטיקות
        </button>
      </div>

      {activeTab === 'projects' ? (
        <div className="pr-projects-list">
          <h3>פרויקטים להגהה</h3>
          {projects.map(project => (
            <div key={project.id} className="pr-project-item">
              <div className="pr-project-header">
                <span className="pr-project-name">{project.name}</span>
                <span className={`pr-project-status status-${project.status === 'הושלם' ? 'completed' : project.status === 'בהגהה' ? 'in-progress' : 'pending'}`}>
                  {project.status}
                </span>
              </div>
              <div className="pr-project-info">
                <span>{project.pages} עמודים</span>
                <div className="pr-progress-bar">
                  <div className="pr-progress-fill" style={{ width: `${project.progress}%` }}></div>
                </div>
                <span>{project.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pr-stats-container">
          <h3>סטטיסטיקות הגהה</h3>
          <div className="pr-stat-card">
            <div className="pr-stat-value">{stats.todayProofread}</div>
            <div className="pr-stat-label">עמודים היום</div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-value">{stats.weeklyProofread}</div>
            <div className="pr-stat-label">עמודים השבוע</div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-value">{stats.avgAccuracy}%</div>
            <div className="pr-stat-label">דיוק ממוצע</div>
          </div>
          <div className="pr-stat-card">
            <div className="pr-stat-value">{stats.totalProjects}</div>
            <div className="pr-stat-label">סה"כ פרויקטים</div>
          </div>
        </div>
      )}

      <div className="pr-sidebar-footer">
        <Link href="/transcription/proofreading/history" className="pr-sidebar-link">
          היסטוריית הגהות
        </Link>
        <Link href="/transcription/proofreading/settings" className="pr-sidebar-link">
          הגדרות הגהה
        </Link>
      </div>

      <style jsx>{`
        .pr-sidebar-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 15px;
          color: white;
        }

        .pr-sidebar-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .pr-tab {
          flex: 1;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .pr-tab:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .pr-tab.active {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }

        .pr-projects-list,
        .pr-stats-container {
          flex: 1;
          overflow-y: auto;
        }

        .pr-projects-list h3,
        .pr-stats-container h3 {
          font-size: 18px;
          margin-bottom: 15px;
          font-weight: 600;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .pr-project-item {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
          transition: all 0.3s ease;
        }

        .pr-project-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(-5px);
        }

        .pr-project-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .pr-project-name {
          font-weight: 500;
          font-size: 14px;
        }

        .pr-project-status {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

        .pr-project-status.status-completed {
          background: rgba(76, 175, 80, 0.3);
          color: #81c784;
        }

        .pr-project-status.status-in-progress {
          background: rgba(33, 150, 243, 0.3);
          color: #64b5f6;
        }

        .pr-project-status.status-pending {
          background: rgba(255, 193, 7, 0.3);
          color: #ffd54f;
        }

        .pr-project-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .pr-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .pr-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2196f3 0%, #03a9f4 100%);
          transition: width 0.3s ease;
        }

        .pr-stat-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 12px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .pr-stat-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .pr-stat-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 5px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .pr-stat-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }

        .pr-sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          margin-top: 20px;
        }

        .pr-sidebar-link {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .pr-sidebar-link:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      `}</style>
    </div>
  );
}