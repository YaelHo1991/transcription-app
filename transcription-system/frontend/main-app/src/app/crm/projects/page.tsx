'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  client: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  progress: number;
  assignedTo: string;
  value: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    checkAuth();
    loadProjects();
  }, []);

  const checkAuth = () => {
    const permissions = localStorage.getItem('permissions') || '';
    if (!permissions.includes('B')) {
      router.push('/crm');
    }
  };

  const loadProjects = async () => {
    setProjects([
      {
        id: '1',
        title: 'תמלול ישיבת דירקטוריון',
        client: 'חברת כהן בע"מ',
        status: 'in_progress',
        priority: 'high',
        deadline: '2024-03-15',
        progress: 65,
        assignedTo: 'רחל גרין',
        value: 2500
      },
      {
        id: '2',
        title: 'הקלטת כנס שנתי',
        client: 'לוי ושות׳',
        status: 'pending',
        priority: 'medium',
        deadline: '2024-03-20',
        progress: 0,
        assignedTo: 'לא הוקצה',
        value: 5000
      },
      {
        id: '3',
        title: 'ראיונות עומק',
        client: 'ישראלי אחזקות',
        status: 'completed',
        priority: 'low',
        deadline: '2024-02-28',
        progress: 100,
        assignedTo: 'דוד לוי',
        value: 3200
      }
    ]);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return '#ffa726';
      case 'in_progress': return '#42a5f5';
      case 'completed': return '#66bb6a';
      case 'on_hold': return '#ef5350';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'ממתין';
      case 'in_progress': return 'בתהליך';
      case 'completed': return 'הושלם';
      case 'on_hold': return 'מושהה';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return '#ef5350';
      case 'medium': return '#ffa726';
      case 'low': return '#66bb6a';
      default: return '#999';
    }
  };

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.status === filter);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען פרויקטים...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>ניהול פרויקטים</h1>
        <p>כל הפרויקטים והעבודות במערכת</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffa726' }}>📋</div>
          <div className="stat-info">
            <div className="stat-value">{projects.filter(p => p.status === 'pending').length}</div>
            <div className="stat-label">ממתינים</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#42a5f5' }}>⚡</div>
          <div className="stat-info">
            <div className="stat-value">{projects.filter(p => p.status === 'in_progress').length}</div>
            <div className="stat-label">בתהליך</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#66bb6a' }}>✅</div>
          <div className="stat-info">
            <div className="stat-value">{projects.filter(p => p.status === 'completed').length}</div>
            <div className="stat-label">הושלמו</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#9c27b0' }}>💰</div>
          <div className="stat-info">
            <div className="stat-value">₪{projects.reduce((sum, p) => sum + p.value, 0).toLocaleString()}</div>
            <div className="stat-label">סה"כ ערך</div>
          </div>
        </div>
      </div>

      <div className="actions-bar">
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            הכל ({projects.length})
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            ממתינים ({projects.filter(p => p.status === 'pending').length})
          </button>
          <button 
            className={filter === 'in_progress' ? 'active' : ''}
            onClick={() => setFilter('in_progress')}
          >
            בתהליך ({projects.filter(p => p.status === 'in_progress').length})
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            הושלמו ({projects.filter(p => p.status === 'completed').length})
          </button>
        </div>
        <button className="btn-primary">+ פרויקט חדש</button>
      </div>

      <div className="projects-grid">
        {filteredProjects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h3>{project.title}</h3>
              <span 
                className="priority-badge"
                style={{ background: getPriorityColor(project.priority) }}
              >
                {project.priority === 'high' ? 'דחוף' : project.priority === 'medium' ? 'בינוני' : 'נמוך'}
              </span>
            </div>
            <div className="project-client">{project.client}</div>
            <div className="project-info">
              <div className="info-row">
                <span className="info-label">סטטוס:</span>
                <span className="status-text" style={{ color: getStatusColor(project.status) }}>
                  {getStatusText(project.status)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">מוקצה ל:</span>
                <span>{project.assignedTo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">תאריך יעד:</span>
                <span>{new Date(project.deadline).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">ערך:</span>
                <span className="project-value">₪{project.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="progress-section">
              <div className="progress-label">התקדמות: {project.progress}%</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: project.progress + '%',
                    background: getStatusColor(project.status)
                  }}
                />
              </div>
            </div>
            <div className="project-actions">
              <button className="btn-secondary">צפייה</button>
              <button className="btn-secondary">עריכה</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .page-container {
          animation: fadeIn 0.3s ease-in;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 28px;
          color: #322514;
          margin-bottom: 8px;
        }

        .page-header p {
          color: #666;
          font-size: 16px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #322514;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }

        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .filter-tabs {
          display: flex;
          gap: 10px;
        }

        .filter-tabs button {
          padding: 8px 16px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-tabs button.active,
        .filter-tabs button:hover {
          background: #8b6f47;
          color: white;
          border-color: #8b6f47;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b6f47 0%, #7a5f3a 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(139, 111, 71, 0.3);
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 25px;
        }

        .project-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .project-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .project-header h3 {
          font-size: 18px;
          color: #322514;
          margin: 0;
        }

        .priority-badge {
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }

        .project-client {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .project-info {
          margin-bottom: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .info-label {
          color: #999;
        }

        .status-text {
          font-weight: 500;
        }

        .project-value {
          font-weight: bold;
          color: #8b6f47;
        }

        .progress-section {
          margin-bottom: 20px;
        }

        .progress-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .project-actions {
          display: flex;
          gap: 10px;
        }

        .btn-secondary {
          flex: 1;
          padding: 8px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: #f0f0f0;
          border-color: #8b6f47;
          color: #8b6f47;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #8b6f47;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
          }

          .projects-grid {
            grid-template-columns: 1fr;
          }

          .actions-bar {
            flex-direction: column;
            gap: 15px;
          }

          .filter-tabs {
            width: 100%;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}