'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UnauthorizedOverlay from '@/components/UnauthorizedOverlay/UnauthorizedOverlay';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  projects: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
    loadClients();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const permissions = localStorage.getItem('permissions') || '';
    
    console.log('[CRM Clients] Auth check:', {
      hasToken: !!token,
      permissions,
      hasPermissionA: permissions.includes('A')
    });
    
    // If no token, redirect to login
    if (!token) {
      router.push('/login?system=crm');
      return;
    }
    
    // Check specific permission
    if (!permissions.includes('A')) {
      console.log('[CRM Clients] User lacks permission A, showing overlay');
      setHasPermission(false);
    } else {
      console.log('[CRM Clients] User has permission A, allowing access');
      setHasPermission(true);
    }
  };

  const loadClients = async () => {
    // Mock data for now
    setClients([
      {
        id: '1',
        name: 'דוד כהן',
        email: 'david@example.com',
        phone: '050-1234567',
        company: 'חברת כהן בע"מ',
        projects: 5,
        status: 'active',
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        name: 'שרה לוי',
        email: 'sara@example.com',
        phone: '052-9876543',
        company: 'לוי ושות׳',
        projects: 3,
        status: 'active',
        createdAt: '2024-02-20'
      },
      {
        id: '3',
        name: 'משה ישראלי',
        email: 'moshe@example.com',
        phone: '054-5555555',
        company: 'ישראלי אחזקות',
        projects: 8,
        status: 'inactive',
        createdAt: '2023-12-10'
      }
    ]);
    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('[CRM Clients] Render state:', {
    loading,
    hasPermission,
    showingOverlay: hasPermission === false
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>טוען לקוחות...</p>
      </div>
    );
  }

  return (
    <>
      {hasPermission === false && (
        <UnauthorizedOverlay 
          requiredPermission="A"
          permissionName="ניהול לקוחות"
          theme="crm-clients"
        />
      )}
      <div className="page-container">
      <div className="page-header">
        <h1>ניהול לקוחות</h1>
        <p>רשימת כל הלקוחות במערכת</p>
      </div>

      <div className="actions-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="חיפוש לקוח..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary">+ הוסף לקוח חדש</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>שם הלקוח</th>
              <th>חברה</th>
              <th>אימייל</th>
              <th>טלפון</th>
              <th>פרויקטים</th>
              <th>סטטוס</th>
              <th>תאריך הצטרפות</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => (
              <tr key={client.id}>
                <td className="client-name">{client.name}</td>
                <td>{client.company}</td>
                <td>{client.email}</td>
                <td>{client.phone}</td>
                <td className="text-center">{client.projects}</td>
                <td>
                  <span className={'status-badge ' + client.status}>
                    {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </td>
                <td>{new Date(client.createdAt).toLocaleDateString('he-IL')}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="עריכה">✏️</button>
                    <button className="btn-icon" title="צפייה">👁️</button>
                    <button className="btn-icon danger" title="מחיקה">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          gap: 20px;
        }

        .search-box input {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          width: 300px;
          font-size: 14px;
        }

        .search-box input:focus {
          outline: none;
          border-color: #b85042;
        }

        .btn-primary {
          background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
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
          box-shadow: 0 5px 15px rgba(184, 80, 66, 0.3);
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
          border-bottom: 2px solid #b85042;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .data-table tr:hover {
          background: rgba(184, 80, 66, 0.05);
        }

        .client-name {
          font-weight: 500;
          color: #322514;
        }

        .text-center {
          text-align: center;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #d4f4dd;
          color: #2e7d32;
        }

        .status-badge.inactive {
          background: #ffe0e0;
          color: #c62828;
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

        .btn-icon.danger:hover {
          color: #c62828;
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

        @media (max-width: 768px) {
          .actions-bar {
            flex-direction: column;
          }

          .search-box input {
            width: 100%;
          }

          .data-table {
            font-size: 14px;
          }

          .data-table th,
          .data-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
    </>
  );
}