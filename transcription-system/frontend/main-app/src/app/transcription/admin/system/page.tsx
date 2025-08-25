'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_USER_IDS = [
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345'  // ליאת בן שי
];

interface SystemInfo {
  database: {
    status: string;
    tables: number;
    size: string;
  };
  server: {
    uptime: string;
    memory: string;
    version: string;
  };
  storage: {
    templates: number;
    shortcuts: number;
    transcriptions: number;
  };
}

export default function SystemInfoPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
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
      await fetchSystemInfo();
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : '';
      const response = await fetch(`${baseUrl}/api/admin/system-info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data.info);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="page-system">
        <div className="system-container">
          <div className="loading">טוען מידע מערכת...</div>
        </div>
        <style jsx>{`
          .page-system {
            background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
            min-height: 100vh;
            padding: 40px 0;
            direction: rtl;
          }
          .system-container {
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
    <div className="page-system">
      <div className="page-header-fixed">
        <h1>מידע מערכת</h1>
        <Link href="/transcription/admin" className="back-link">
          חזרה ללוח בקרה
        </Link>
      </div>

      <div className="system-container">
        <div className="scrollable-content">
          {systemInfo ? (
            <div className="info-sections">
              <div className="info-section">
                <h2>בסיס נתונים</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">סטטוס:</span>
                    <span className="info-value">{systemInfo.database.status}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">טבלאות:</span>
                    <span className="info-value">{systemInfo.database.tables}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">גודל:</span>
                    <span className="info-value">{systemInfo.database.size}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h2>שרת</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">זמן פעילות:</span>
                    <span className="info-value">{systemInfo.server.uptime}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">זיכרון:</span>
                    <span className="info-value">{systemInfo.server.memory}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">גרסה:</span>
                    <span className="info-value">{systemInfo.server.version}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h2>אחסון</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">תבניות:</span>
                    <span className="info-value">{systemInfo.storage.templates}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">קיצורים:</span>
                    <span className="info-value">{systemInfo.storage.shortcuts}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">תמלולים:</span>
                    <span className="info-value">{systemInfo.storage.transcriptions}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>לא ניתן לטעון מידע מערכת</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .page-system {
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

        .system-container {
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

        /* Admin system brown scrollbar */
        .page-system .scrollable-content::-webkit-scrollbar {
          width: 10px;
        }

        .page-system .scrollable-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 5px;
        }

        .page-system .scrollable-content::-webkit-scrollbar-thumb {
          background: #e0a96d;
          border-radius: 5px;
        }

        .page-system .scrollable-content::-webkit-scrollbar-thumb:hover {
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

        .info-sections {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .info-section {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .info-section h2 {
          font-size: 20px;
          color: #5a4a3a;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0a96d;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .info-value {
          font-size: 18px;
          color: #201e20;
          font-weight: 600;
        }

        .no-data {
          background: white;
          border-radius: 15px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
        }

        .no-data p {
          color: #666;
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .system-container {
            padding: 0 15px;
          }

          .page-header-fixed {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
            padding: 20px;
          }

          .page-header-fixed h1 {
            font-size: 24px;
            text-align: center;
          }

          .back-link {
            text-align: center;
          }

          .info-section {
            padding: 20px;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}