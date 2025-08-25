'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Hardcoded admin IDs for maximum security (both environments)
const ADMIN_USER_IDS = [
  // Production IDs
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  // Local development IDs
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  crmUsers: number;
  transcribers: number;
  systemShortcuts: number;
  userShortcuts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Decode token to get user info (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      console.log('[Admin] Checking access for user:', userId);
      console.log('[Admin] Admin IDs:', ADMIN_USER_IDS);
      console.log('[Admin] Is admin?', ADMIN_USER_IDS.includes(userId));
      
      // Check if user is in admin list
      if (!ADMIN_USER_IDS.includes(userId)) {
        console.log('[Admin] User not in admin list, redirecting to /transcription');
        router.push('/transcription');
        return;
      }

      setUser(payload);
      setIsAuthorized(true);
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : '';
      const response = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="page-admin">
        <div className="admin-container">
          <div className="loading">בודק הרשאות...</div>
        </div>
        <style jsx>{`
          .page-admin {
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            padding: 40px 0;
            direction: rtl;
          }
          .admin-container {
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
    <div className="page-admin">
      <div className="page-header-fixed">
        <h1>לוח בקרה למנהלים</h1>
        <Link href="/transcription" className="back-link">
          חזרה לתמלול
        </Link>
      </div>
      
      <div className="admin-container">
        <div className="scrollable-content">
          {stats && (
            <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">סה"כ משתמשים</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.adminUsers}</div>
              <div className="stat-label">מנהלי מערכת</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.crmUsers}</div>
              <div className="stat-label">משתמשי CRM</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.transcribers}</div>
              <div className="stat-label">מתמללים</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.systemShortcuts}</div>
              <div className="stat-label">קיצורי מערכת</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.userShortcuts}</div>
              <div className="stat-label">קיצורים אישיים</div>
            </div>
          </div>
        )}

        <div className="admin-cards">
          <Link href="/transcription/admin/users" className="admin-card">
            <div className="card-icon">👥</div>
            <div className="card-title">ניהול משתמשים</div>
            <div className="card-description">
              צפייה במשתמשים רשומים והרשאות
            </div>
          </Link>

          <Link href="/transcription/admin/system" className="admin-card">
            <div className="card-icon">📊</div>
            <div className="card-title">מידע מערכת</div>
            <div className="card-description">
              סטטוס מערכת ובסיס נתונים
            </div>
          </Link>

          <Link href="/dev-portal/shortcuts-admin" className="admin-card">
            <div className="card-icon">🔧</div>
            <div className="card-title">ממשק קיצורים מתקדם</div>
            <div className="card-description">
              ממשק מתקדם לניהול קיצורים
            </div>
          </Link>

          <Link href="/transcription/admin/templates" className="admin-card">
            <div className="card-icon">📄</div>
            <div className="card-title">ניהול תבניות Word</div>
            <div className="card-description">
              העלאה וניהול של תבניות Word לייצוא
            </div>
          </Link>
        </div>
        </div>
      </div>

      <style jsx>{`
        .page-admin {
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
          font-size: 36px;
          color: #201e20;
          margin: 0;
          font-weight: 700;
        }

        .admin-container {
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

        /* Admin dashboard brown scrollbar */
        .page-admin .scrollable-content::-webkit-scrollbar {
          width: 10px;
        }

        .page-admin .scrollable-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 5px;
        }

        .page-admin .scrollable-content::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 5px;
        }

        .page-admin .scrollable-content::-webkit-scrollbar-thumb:hover {
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          text-align: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.12);
        }

        .stat-number {
          font-size: 36px;
          font-weight: 700;
          color: #e0a96d;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .admin-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 25px;
        }

        .admin-card {
          background: white;
          border-radius: 15px;
          padding: 30px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .admin-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          border-color: #e0a96d;
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #201e20;
          margin-bottom: 10px;
        }

        .card-description {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .admin-container {
            padding: 0 15px;
          }

          .page-header {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
          }

          .page-header h1 {
            font-size: 28px;
            text-align: center;
          }

          .back-link {
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
          }

          .stat-card {
            padding: 20px;
          }

          .stat-number {
            font-size: 28px;
          }

          .admin-cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}