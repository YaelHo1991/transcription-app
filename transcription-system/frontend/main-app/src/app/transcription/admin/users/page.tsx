'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_USER_IDS = [
  // Production IDs
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  // Local development IDs
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

interface User {
  id: string;
  email: string;
  full_name: string;
  permissions: string;
  is_admin: boolean;
  transcriber_code: string;
  created_at: string;
  last_login: string;
  password?: string;
}

export default function UsersManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [updatingAdmin, setUpdatingAdmin] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check for admin token first (in case we're in test mode)
      let token = localStorage.getItem('admin_token');
      const isTestSession = localStorage.getItem('is_test_session') === 'true';
      
      // If no admin token or not in test session, use regular token
      if (!token || !isTestSession) {
        token = localStorage.getItem('token');
      }
      
      if (!token) {
        router.push('/login');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      if (!ADMIN_USER_IDS.includes(userId)) {
        router.push('/transcription');
        return;
      }

      setIsAuthorized(true);
      await fetchUsers();
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Use admin token if in test session, otherwise regular token
      const isTestSession = localStorage.getItem('is_test_session') === 'true';
      let token = localStorage.getItem('admin_token');
      if (!token || !isTestSession) {
        token = localStorage.getItem('token');
      }
      
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : '';
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const getPermissionBadges = (permissions: string) => {
    const badges = [];
    if (permissions.includes('A')) badges.push('A');
    if (permissions.includes('B')) badges.push('B');
    if (permissions.includes('C')) badges.push('C');
    if (permissions.includes('D')) badges.push('D');
    if (permissions.includes('E')) badges.push('E');
    if (permissions.includes('F')) badges.push('F');
    return badges;
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAdminStatus = async (userId: string, currentIsAdmin: boolean) => {
    setUpdatingAdmin(userId);
    try {
      // Use admin token if in test session, otherwise regular token
      const isTestSession = localStorage.getItem('is_test_session') === 'true';
      let token = localStorage.getItem('admin_token');
      if (!token || !isTestSession) {
        token = localStorage.getItem('token');
      }
      
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : '';
      
      const response = await fetch(`${baseUrl}/api/admin/user/${userId}/admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_admin: !currentIsAdmin })
      });

      if (response.ok) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, is_admin: !currentIsAdmin } : user
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle admin status:', error);
    } finally {
      setUpdatingAdmin(null);
    }
  };

  const loginAsUser = async (user: User) => {
    try {
      // Use admin token if in test session, otherwise regular token
      const isTestSession = localStorage.getItem('is_test_session') === 'true';
      let token = localStorage.getItem('admin_token');
      if (!token || !isTestSession) {
        token = localStorage.getItem('token');
      }
      
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : '';
      
      // Generate a token for the target user
      const response = await fetch(`${baseUrl}/api/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId: user.id,
          email: user.email 
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Open test login URL in new tab with token as query param
        const frontendUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? 'http://localhost:3002'
          : 'https://yalitranscription.duckdns.org';
        
        // Create a temporary form to POST the token to the new window
        const form = document.createElement('form');
        form.method = 'GET';
        form.target = '_blank';
        form.action = `${frontendUrl}/test-login`;
        
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token';
        tokenInput.value = data.token;
        form.appendChild(tokenInput);
        
        const userInput = document.createElement('input');
        userInput.type = 'hidden';
        userInput.name = 'user';
        userInput.value = JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          permissions: user.permissions,
          is_admin: user.is_admin
        });
        form.appendChild(userInput);
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      }
    } catch (error) {
      console.error('Failed to login as user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="page-users">
        <div className="users-container">
          <div className="loading">טוען משתמשים...</div>
        </div>
        <style jsx>{`
          .page-users {
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            padding: 40px 0;
            direction: rtl;
          }
          .users-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px;
          }
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            color: #5a4a3a;
            font-size: 1.5rem;
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="page-users">
      <div className="page-header-fixed">
        <h1>ניהול משתמשים</h1>
        <Link href="/transcription/admin" className="back-link">
          חזרה ללוח בקרה
        </Link>
      </div>

      <div className="users-container">
        <div className="scrollable-content">
          <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>שם מלא</th>
                <th>אימייל</th>
                <th>סיסמה</th>
                <th>הרשאות</th>
                <th>קוד מתמלל</th>
                <th>מנהל</th>
                <th>נרשם</th>
                <th>כניסה אחרונה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="user-name">{user.full_name || '-'}</td>
                  <td>{user.email}</td>
                  <td>
                    <div className="password-cell">
                      {visiblePasswords.has(user.id) ? (
                        <span className="password-text">{user.password || 'לא זמין'}</span>
                      ) : (
                        <span className="password-hidden">••••••••</span>
                      )}
                      <button 
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility(user.id)}
                      >
                        {visiblePasswords.has(user.id) ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="permissions">
                      {getPermissionBadges(user.permissions).map(badge => (
                        <span key={badge} className="permission-badge">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {user.transcriber_code && (
                      <code className="transcriber-code">{user.transcriber_code}</code>
                    )}
                  </td>
                  <td>
                    {user.is_admin && (
                      <span className="admin-badge">✓ מנהל</span>
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('he-IL')}</td>
                  <td>
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString('he-IL')
                      : '-'
                    }
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className={`admin-toggle-btn ${user.is_admin ? 'is-admin' : ''}`}
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        disabled={updatingAdmin === user.id || ADMIN_USER_IDS.includes(user.id)}
                        title={ADMIN_USER_IDS.includes(user.id) ? 'לא ניתן לשנות מנהל ראשי' : ''}
                      >
                        {updatingAdmin === user.id ? '...' : (user.is_admin ? 'הסר מנהל' : 'הפוך למנהל')}
                      </button>
                      <button 
                        className="login-as-btn"
                        onClick={() => loginAsUser(user)}
                        title="כניסה כמשתמש זה בחלון חדש"
                      >
                        🔑 כניסה
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">סה"כ משתמשים:</span>
            <span className="summary-value">{users.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">משתמשי CRM:</span>
            <span className="summary-value">
              {users.filter(u => u.permissions.match(/[ABC]/)).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">משתמשי תמלול:</span>
            <span className="summary-value">
              {users.filter(u => u.permissions.match(/[DEF]/)).length}
            </span>
          </div>
        </div>
        </div>
      </div>

      <style jsx>{`
        .page-users {
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
          padding: 30px 40px;
          background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
          border-bottom: 2px solid rgba(224, 169, 109, 0.3);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .page-header-fixed h1 {
          font-size: 32px;
          color: #201e20;
          margin: 0;
          font-weight: 700;
        }

        .users-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 0 30px;
        }

        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          padding: 30px 10px 40px 10px;
        }

        /* Admin users brown scrollbar */
        .page-users .scrollable-content::-webkit-scrollbar {
          width: 10px;
        }

        .page-users .scrollable-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 5px;
        }

        .page-users .scrollable-content::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 5px;
        }

        .page-users .scrollable-content::-webkit-scrollbar-thumb:hover {
          background: #c7915b;
        }

        .back-link {
          background: white;
          color: #5a4a3a;
          padding: 12px 30px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid #e0a96d;
        }

        .back-link:hover {
          background: #fef8f2;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(224, 169, 109, 0.3);
        }

        .table-container {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          overflow-x: auto;
          margin-bottom: 30px;
          max-width: 100%;
        }

        /* Custom scrollbar styles */
        .table-container::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .table-container::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 10px;
        }

        .table-container::-webkit-scrollbar-thumb:hover {
          background: #c7915b;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
        }

        .users-table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%);
          padding: 12px;
          text-align: right;
          font-weight: 600;
          color: #5a4a3a;
          border-bottom: 2px solid #e0a96d;
        }

        .users-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #333;
        }

        .users-table tr:hover {
          background: rgba(224, 169, 109, 0.05);
        }

        .user-name {
          font-weight: 500;
          color: #201e20;
        }

        .permissions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .permission-badge {
          background: #e0a96d;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
        }

        .transcriber-code {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: monospace;
          color: #d97a34;
          font-size: 13px;
          border: 1px solid #e0a96d;
        }

        .admin-badge {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
        }

        .password-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .password-text {
          font-family: monospace;
          font-size: 13px;
          color: #5a4a3a;
        }

        .password-hidden {
          color: #999;
          font-size: 14px;
        }

        .password-toggle {
          background: transparent;
          border: 1px solid #e0a96d;
          border-radius: 6px;
          padding: 2px 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .password-toggle:hover {
          background: #fef8f2;
          transform: scale(1.1);
        }

        .admin-toggle-btn {
          background: white;
          color: #5a4a3a;
          border: 2px solid #e0a96d;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .admin-toggle-btn:hover:not(:disabled) {
          background: #e0a96d;
          color: white;
          transform: translateY(-1px);
        }

        .admin-toggle-btn.is-admin {
          background: #e0a96d;
          color: white;
        }

        .admin-toggle-btn.is-admin:hover:not(:disabled) {
          background: #c7915b;
        }

        .admin-toggle-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .login-as-btn {
          background: linear-gradient(135deg, #c7a788 0%, #b8956f 100%);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .login-as-btn:hover {
          background: linear-gradient(135deg, #b8956f 0%, #a68560 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(199, 167, 136, 0.4);
        }

        .summary-stats {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-around;
          gap: 30px;
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          display: block;
          color: #666;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .summary-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #5a4a3a;
        }

        @media (max-width: 768px) {
          .users-container {
            padding: 0 15px;
          }

          .page-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .page-header h1 {
            font-size: 24px;
            text-align: center;
          }

          .back-link {
            text-align: center;
          }

          .table-container {
            padding: 15px;
          }

          .users-table {
            font-size: 13px;
          }

          .users-table th,
          .users-table td {
            padding: 8px;
          }

          .summary-stats {
            flex-direction: column;
            gap: 15px;
          }

          .summary-value {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}