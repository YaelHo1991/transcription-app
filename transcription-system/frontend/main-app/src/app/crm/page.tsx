'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  clients: number;
  activeProjects: number;
  employees: number;
  monthlyReports: number;
}

export default function CRMPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    clients: 15,
    activeProjects: 8,
    employees: 5,
    monthlyReports: 23
  });
  const [userPermissions, setUserPermissions] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?system=crm');
        return;
      }
      
      const permissions = localStorage.getItem('permissions') || '';
      setUserPermissions(permissions);
      
      const hasCRMAccess = permissions.includes('A') || 
                          permissions.includes('B') || 
                          permissions.includes('C');
      
      if (!hasCRMAccess) {
        router.push('/login?system=crm');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?system=crm');
    }
  };

  const loadStats = async () => {
    try {
      setStats({
        clients: 15,
        activeProjects: 8,
        employees: 5,
        monthlyReports: 23
      });
    } finally {
      setLoading(false);
    }
  };

  const cubes = [
    {
      id: 'works',
      title: 'ניהול עבודות',
      icon: '📄',
      link: '/crm/projects',
      permission: 'B',
      className: 'works-cube',
      stats: [
        { value: stats.activeProjects, label: 'עבודות בתהליך' },
        { value: 3, label: 'ממתינות לאישור' }
      ]
    },
    {
      id: 'reports',
      title: 'דוחות וסיכומים',
      icon: '📊',
      link: '/crm/reports',
      permission: null,
      className: 'reports-cube',
      stats: [
        { value: '₪12,500', label: 'הכנסות החודש' },
        { value: 18, label: 'עבודות הושלמו' }
      ]
    },
    {
      id: 'clients',
      title: 'ניהול לקוחות',
      icon: '👥',
      link: '/crm/clients',
      permission: 'A',
      className: 'clients-cube',
      stats: [
        { value: stats.clients, label: 'לקוחות פעילים' },
        { value: stats.clients + 5, label: 'סה"כ לקוחות' }
      ]
    },
    {
      id: 'transcribers',
      title: 'ניהול מתמללים',
      icon: '🎧',
      link: '/crm/employees',
      permission: 'C',
      className: 'transcribers-cube',
      stats: [
        { value: stats.employees, label: 'מתמללים רשומים' },
        { value: 3, label: 'זמינים כעת' }
      ]
    }
  ];

  const visibleCubes = cubes.filter(cube => 
    !cube.permission || userPermissions.includes(cube.permission)
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען מערכת CRM...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>לוח בקרה</h1>
        <p>סקירה כללית של המערכת</p>
      </div>

      <div className="management-cubes">
        {visibleCubes.map(cube => (
          <div key={cube.id} className={'cube-card ' + cube.className}>
            <Link href={cube.link} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="cube-header">
                <div className="cube-icon">{cube.icon}</div>
                <h2>{cube.title}</h2>
              </div>
            </Link>
            <div className="cube-content">
              <div className="cube-stats">
                {cube.stats.map((stat, index) => (
                  <div key={index} className="mini-stat">
                    <span className="mini-number">{stat.value}</span>
                    <span className="mini-label">{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="recent-items">
                <div className="view-all-link">
                  <Link href={cube.link}>צפה בכל ←</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .dashboard-container {
          animation: fadeIn 0.3s ease-in;
          height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
        }

        .page-header {
          margin-bottom: 25px;
          flex-shrink: 0;
        }

        .page-header h1 {
          font-size: 32px;
          color: #322514;
          margin-bottom: 8px;
        }

        .page-header p {
          color: #666;
          font-size: 17px;
        }

        .management-cubes {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(250px, 1fr)) !important;
          gap: 25px !important;
          margin-bottom: 30px;
          flex: 1;
          align-content: stretch;
        }

        @media (min-width: 1600px) {
          .management-cubes {
            gap: 35px !important;
            padding: 0 30px;
            grid-template-columns: repeat(4, minmax(320px, 450px)) !important;
            justify-content: center;
          }
        }

        @media (min-width: 1920px) {
          .management-cubes {
            gap: 45px !important;
            padding: 0 60px;
            grid-template-columns: repeat(4, minmax(350px, 480px)) !important;
          }
        }
        
        @media (min-width: 2560px) {
          .management-cubes {
            gap: 55px !important;
            padding: 0 100px;
            grid-template-columns: repeat(4, minmax(400px, 520px)) !important;
          }
        }

        .cube-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          min-height: 350px;
          display: flex;
          flex-direction: column;
        }

        .cube-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }

        .cube-header {
          padding: 30px 25px;
          color: white;
          display: flex;
          align-items: center;
          gap: 20px;
          min-height: 120px;
        }

        .cube-icon {
          font-size: 40px;
          width: 75px;
          height: 75px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .cube-header h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
          color: white;
        }

        .cube-content {
          padding: 30px 25px;
          background: white;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .cube-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 25px;
          flex: 1;
        }

        .mini-stat {
          padding: 20px 15px;
          border-radius: 12px;
          text-align: center;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mini-stat:hover {
          transform: scale(1.05);
        }

        .mini-number {
          display: block;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .mini-label {
          display: block;
          font-size: 13px;
          color: #666;
          line-height: 1.3;
        }

        /* Cube specific colors - matching PHP design */
        .works-cube .cube-header {
          background: linear-gradient(135deg, #8b6f47 0%, #7a5f3a 100%);
        }

        .works-cube .mini-stat {
          background: rgba(139, 111, 71, 0.1);
          border: 1px solid rgba(139, 111, 71, 0.2);
        }

        .works-cube .mini-number {
          color: #8b6f47;
        }

        .reports-cube .cube-header {
          background: linear-gradient(135deg, #6b7c93 0%, #5a6a7f 100%);
        }

        .reports-cube .mini-stat {
          background: rgba(107, 124, 147, 0.1);
          border: 1px solid rgba(107, 124, 147, 0.2);
        }

        .reports-cube .mini-number {
          color: #6b7c93;
        }

        .clients-cube .cube-header {
          background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
        }

        .clients-cube .mini-stat {
          background: rgba(184, 80, 66, 0.1);
          border: 1px solid rgba(184, 80, 66, 0.2);
        }

        .clients-cube .mini-number {
          color: #b85042;
        }

        .transcribers-cube .cube-header {
          background: linear-gradient(135deg, #a7beae 0%, #90a898 100%);
        }

        .transcribers-cube .mini-stat {
          background: rgba(167, 190, 174, 0.1);
          border: 1px solid rgba(167, 190, 174, 0.2);
        }

        .transcribers-cube .mini-number {
          color: #7a9882;
        }

        .recent-items {
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
          margin-top: auto;
        }

        .view-all-link {
          text-align: center;
        }

        .view-all-link a {
          color: #666;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: color 0.3s ease;
          display: inline-block;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.03);
        }

        .view-all-link a:hover {
          color: #b85042;
          background: rgba(184, 80, 66, 0.08);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #666;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #b85042;
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

        @media (max-width: 1400px) {
          .management-cubes {
            grid-template-columns: repeat(2, minmax(350px, 1fr)) !important;
            gap: 30px !important;
          }
          
          .cube-card {
            min-height: 320px;
          }
        }

        @media (max-width: 900px) {
          .management-cubes {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            padding: 0;
          }
          
          .cube-header {
            padding: 25px 20px;
            min-height: 100px;
          }
          
          .cube-icon {
            width: 65px;
            height: 65px;
            font-size: 36px;
          }
          
          .cube-header h2 {
            font-size: 20px;
          }
        }

        @media (max-width: 640px) {
          .management-cubes {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          
          .dashboard-container {
            height: auto;
            min-height: calc(100vh - 200px);
          }
        }
      `}</style>
    </div>
  );
}