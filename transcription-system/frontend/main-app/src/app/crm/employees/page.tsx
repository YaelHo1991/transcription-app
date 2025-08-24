'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  transcriberCode: string;
  status: 'active' | 'busy' | 'offline';
  projectsCompleted: number;
  rating: number;
  joinDate: string;
  isLinked?: boolean;
  linkedFrom?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [transcriberCodeInput, setTranscriberCodeInput] = useState('');

  useEffect(() => {
    checkAuth();
    loadEmployees();
  }, []);

  const checkAuth = () => {
    const permissions = localStorage.getItem('permissions') || '';
    if (!permissions.includes('C')) {
      router.push('/crm');
    }
  };

  const loadEmployees = async () => {
    // Get real transcriber codes from system
    const actualEmployees = [
      {
        id: '1',
        name: 'יעל הורי',
        role: 'מתמללת בכירה',
        email: 'ayelho@gmail.com',
        phone: '050-1234567',
        transcriberCode: 'TRN-9143',
        status: 'active' as const,
        projectsCompleted: 45,
        rating: 4.8,
        joinDate: '2025-01-11',
        isLinked: true,
        linkedFrom: 'רישום עצמי'
      },
      {
        id: '2',
        name: 'דמו משתמש',
        role: 'מתמלל',
        email: 'demo@example.com',
        phone: '052-2222222',
        transcriberCode: 'TRN-6811',
        status: 'active' as const,
        projectsCompleted: 12,
        rating: 4.5,
        joinDate: '2025-01-10',
        isLinked: true,
        linkedFrom: 'רישום עצמי'
      },
      {
        id: '3',
        name: 'משתמש ראשון',
        role: 'מתמלל',
        email: 'user1@example.com',
        phone: '054-3333333',
        transcriberCode: 'TRN-1217',
        status: 'busy' as const,
        projectsCompleted: 8,
        rating: 4.3,
        joinDate: '2025-01-09',
        isLinked: true,
        linkedFrom: 'רישום עצמי'
      },
      {
        id: '4',
        name: 'מנהל מערכת',
        role: 'מנהל ומתמלל',
        email: 'admin@example.com',
        phone: '053-4444444',
        transcriberCode: 'TRN-3171',
        status: 'active' as const,
        projectsCompleted: 62,
        rating: 4.9,
        joinDate: '2025-01-08',
        isLinked: true,
        linkedFrom: 'רישום עצמי'
      }
    ];
    
    setEmployees(actualEmployees);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#66bb6a';
      case 'busy': return '#ffa726';
      case 'offline': return '#bdbdbd';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'זמין';
      case 'busy': return 'עסוק';
      case 'offline': return 'לא זמין';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען עובדים...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>ניהול מתמללים ועובדים</h1>
        <p>צוות העובדים והמתמללים שלך</p>
      </div>

      <div className="actions-bar">
        <div className="view-toggle">
          <button 
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            תצוגת כרטיסים
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            תצוגת רשימה
          </button>
        </div>
        <div className="action-buttons-group">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            🔗 חבר עובד לפי קוד
          </button>
          <button className="btn-primary">+ הוסף עובד חדש</button>
        </div>
      </div>

      {/* Add Employee by Code Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>הוספת עובד לפי קוד מתמלל</h2>
            <p>הזן קוד מתמלל של עובד קיים במערכת</p>
            <input
              type="text"
              placeholder="TRN-XXXX"
              value={transcriberCodeInput}
              onChange={(e) => setTranscriberCodeInput(e.target.value)}
              className="code-input"
            />
            <div className="modal-actions">
              <button 
                className="btn-confirm"
                onClick={() => {
                  alert('מחבר עובד עם קוד: ' + transcriberCodeInput);
                  setShowAddModal(false);
                  setTranscriberCodeInput('');
                }}
              >
                חבר עובד
              </button>
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setTranscriberCodeInput('');
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="employees-grid">
          {employees.map(employee => (
            <div key={employee.id} className="employee-card">
              <div className="employee-header">
                <div className="employee-avatar">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div 
                  className="status-indicator"
                  style={{ background: getStatusColor(employee.status) }}
                  title={getStatusText(employee.status)}
                />
              </div>
              <h3 className="employee-name">{employee.name}</h3>
              <p className="employee-role">{employee.role}</p>
              <div className="employee-code">קוד: {employee.transcriberCode}</div>
              {employee.isLinked && (
                <div className="linked-badge">
                  🔗 מקושר - {employee.linkedFrom}
                </div>
              )}
              
              <div className="employee-stats">
                <div className="stat">
                  <span className="stat-value">{employee.projectsCompleted}</span>
                  <span className="stat-label">פרויקטים</span>
                </div>
                <div className="stat">
                  <span className="stat-value">⭐ {employee.rating}</span>
                  <span className="stat-label">דירוג</span>
                </div>
              </div>
              
              <div className="employee-contact">
                <div>{employee.email}</div>
                <div>{employee.phone}</div>
              </div>
              
              <div className="employee-actions">
                <button className="btn-secondary">פרופיל</button>
                <button className="btn-secondary">הקצה משימה</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>תפקיד</th>
                <th>קוד מתמלל</th>
                <th>סטטוס</th>
                <th>פרויקטים</th>
                <th>דירוג</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th>תאריך הצטרפות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id}>
                  <td className="employee-name-cell">
                    <div className="name-with-avatar">
                      <div className="small-avatar">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {employee.name}
                    </div>
                  </td>
                  <td>{employee.role}</td>
                  <td><code>{employee.transcriberCode}</code></td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ background: getStatusColor(employee.status) + '20', color: getStatusColor(employee.status) }}
                    >
                      {getStatusText(employee.status)}
                    </span>
                  </td>
                  <td className="text-center">{employee.projectsCompleted}</td>
                  <td className="text-center">⭐ {employee.rating}</td>
                  <td>{employee.email}</td>
                  <td>{employee.phone}</td>
                  <td>{new Date(employee.joinDate).toLocaleDateString('he-IL')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="צפייה">👁️</button>
                      <button className="btn-icon" title="עריכה">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .action-buttons-group {
          display: flex;
          gap: 10px;
        }

        .view-toggle {
          display: flex;
          gap: 10px;
        }

        .view-toggle button {
          padding: 8px 16px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-toggle button.active,
        .view-toggle button:hover {
          background: #a7beae;
          color: white;
          border-color: #a7beae;
        }

        .btn-primary {
          background: linear-gradient(135deg, #a7beae 0%, #90a898 100%);
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
          box-shadow: 0 5px 15px rgba(167, 190, 174, 0.3);
        }

        .employees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 25px;
        }

        .employee-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .employee-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .employee-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .employee-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a7beae 0%, #90a898 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        .employee-name {
          font-size: 18px;
          color: #322514;
          margin: 0 0 5px 0;
        }

        .employee-role {
          color: #666;
          font-size: 14px;
          margin: 0 0 10px 0;
        }

        .employee-code {
          background: #f0f0f0;
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
          color: #7a9882;
          font-weight: 500;
          display: inline-block;
          margin-bottom: 10px;
        }

        .linked-badge {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 500;
          display: inline-block;
          margin-bottom: 15px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 15px;
          padding: 30px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-content h2 {
          margin-bottom: 10px;
          color: #322514;
        }

        .modal-content p {
          color: #666;
          margin-bottom: 20px;
        }

        .code-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          text-align: center;
          font-family: monospace;
          margin-bottom: 20px;
        }

        .code-input:focus {
          outline: none;
          border-color: #a7beae;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
        }

        .btn-confirm {
          flex: 1;
          padding: 12px;
          background: linear-gradient(135deg, #a7beae 0%, #90a898 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-cancel {
          flex: 1;
          padding: 12px;
          background: white;
          color: #666;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(167, 190, 174, 0.3);
        }

        .btn-cancel:hover {
          background: #f0f0f0;
        }

        .employee-stats {
          display: flex;
          justify-content: space-around;
          padding: 15px 0;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 15px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: bold;
          color: #322514;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #999;
          margin-top: 5px;
        }

        .employee-contact {
          font-size: 13px;
          color: #666;
          margin-bottom: 15px;
          line-height: 1.6;
        }

        .employee-actions {
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
          border-color: #a7beae;
          color: #7a9882;
        }

        .data-table-container {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%);
          padding: 12px;
          text-align: right;
          font-weight: 600;
          color: #5a4a3a;
          border-bottom: 2px solid #a7beae;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .data-table tr:hover {
          background: rgba(167, 190, 174, 0.05);
        }

        .name-with-avatar {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .small-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a7beae 0%, #90a898 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .text-center {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          transition: transform 0.2s;
        }

        .btn-icon:hover {
          transform: scale(1.2);
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
          border-top: 4px solid #a7beae;
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

        @media (max-width: 768px) {
          .employees-grid {
            grid-template-columns: 1fr;
          }

          .actions-bar {
            flex-direction: column;
            gap: 15px;
          }

          .view-toggle {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}