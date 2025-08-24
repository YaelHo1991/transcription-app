'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Record {
  id: string;
  title: string;
  client: string;
  transcriber: string;
  completedDate: string;
  duration: string;
  exportFormats: string[];
}

export default function RecordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const permissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has any transcription permissions
    const hasTranscriptionAccess = 
      permissions.includes('D') || 
      permissions.includes('E') || 
      permissions.includes('F');
    
    if (!hasTranscriptionAccess) {
      router.push('/login?system=transcription');
      return;
    }

    loadRecords();
  }, [router]);

  const loadRecords = () => {
    // Mock data for now
    const mockRecords: Record[] = [
      {
        id: '1',
        title: 'ישיבת דירקטוריון Q3 2024',
        client: 'טכנולוגיות מתקדמות בע"מ',
        transcriber: 'יעל הורי',
        completedDate: '2024-01-15',
        duration: '1:45:32',
        exportFormats: ['DOCX', 'PDF', 'SRT']
      },
      {
        id: '2',
        title: 'כנס שנתי - הרצאת מפתח',
        client: 'המרכז הרפואי',
        transcriber: 'דוד כהן',
        completedDate: '2024-01-14',
        duration: '2:30:00',
        exportFormats: ['DOCX', 'PDF']
      },
      {
        id: '3',
        title: 'פודקאסט פרק 45',
        client: 'רדיו דיגיטלי',
        transcriber: 'שרה לוי',
        completedDate: '2024-01-13',
        duration: '58:45',
        exportFormats: ['SRT', 'TXT']
      },
      {
        id: '4',
        title: 'ראיון מחקר - קבוצת מיקוד',
        client: 'מכון המחקר הישראלי',
        transcriber: 'יעל הורי',
        completedDate: '2024-01-12',
        duration: '1:15:20',
        exportFormats: ['DOCX']
      },
      {
        id: '5',
        title: 'הרצאה אקדמית - פיזיקה קוונטית',
        client: 'האוניברסיטה העברית',
        transcriber: 'משה רבינוביץ',
        completedDate: '2024-01-11',
        duration: '2:00:00',
        exportFormats: ['PDF', 'DOCX']
      },
      {
        id: '6',
        title: 'ישיבת צוות שבועית',
        client: 'InnoTech Solutions',
        transcriber: 'דוד כהן',
        completedDate: '2024-01-10',
        duration: '45:30',
        exportFormats: ['TXT']
      }
    ];

    setRecords(mockRecords);
    setLoading(false);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !filterClient || record.client === filterClient;
    return matchesSearch && matchesClient;
  });

  const uniqueClients = [...new Set(records.map(r => r.client))];

  if (loading) {
    return (
      <div className="page-records">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען רישומים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-records">
      <div className="records-container">
        {/* Page Header */}
        <div className="page-header">
          <h1>מאגר הרישומים</h1>
          <p>ארכיון התמלולים שהושלמו</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="filter-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="חיפוש לפי כותרת או לקוח..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="filter-select"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">כל הלקוחות</option>
            {uniqueClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>

          <button className="btn-primary">
            ייצוא דוח
          </button>
        </div>

        {/* Records Table */}
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>לקוח</th>
                <th>מתמלל</th>
                <th>תאריך השלמה</th>
                <th>משך</th>
                <th>פורמטים זמינים</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id}>
                  <td className="record-title">{record.title}</td>
                  <td>{record.client}</td>
                  <td>{record.transcriber}</td>
                  <td>{new Date(record.completedDate).toLocaleDateString('he-IL')}</td>
                  <td>{record.duration}</td>
                  <td>
                    <div className="format-tags">
                      {record.exportFormats.map(format => (
                        <span key={format} className="format-tag">{format}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="צפייה">👁️</button>
                      <button className="btn-icon" title="הורדה">⬇️</button>
                      <button className="btn-icon" title="עריכה מחדש">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">סה"כ רישומים:</span>
            <span className="summary-value">{filteredRecords.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">סה"כ שעות:</span>
            <span className="summary-value">156.5</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">לקוחות:</span>
            <span className="summary-value">{uniqueClients.length}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-records {
          background: linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%);
          min-height: 100vh;
          padding: 40px 0;
        }

        .records-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 30px;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 32px;
          color: #201e20;
          margin-bottom: 8px;
        }

        .page-header p {
          font-size: 16px;
          color: #666;
        }

        .filter-bar {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          align-items: center;
        }

        .search-box {
          flex: 1;
        }

        .search-box input {
          width: 100%;
          padding: 12px 20px;
          border: none;
          border-radius: 25px;
          background: white;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          font-size: 14px;
        }

        .search-box input:focus {
          outline: none;
          box-shadow: 0 3px 15px rgba(224, 169, 109, 0.3);
        }

        .filter-select {
          padding: 12px 20px;
          border: none;
          border-radius: 25px;
          background: white;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
          font-size: 14px;
          cursor: pointer;
        }

        .records-table-container {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          overflow-x: auto;
          margin-bottom: 30px;
        }

        .records-table {
          width: 100%;
          border-collapse: collapse;
        }

        .records-table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%);
          padding: 12px;
          text-align: right;
          font-weight: 600;
          color: #5a4a3a;
          border-bottom: 2px solid #e0a96d;
        }

        .records-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .records-table tr:hover {
          background: rgba(224, 169, 109, 0.05);
        }

        .record-title {
          font-weight: 500;
          color: #201e20;
        }

        .format-tags {
          display: flex;
          gap: 5px;
        }

        .format-tag {
          background: #e0a96d;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
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

        .summary-stats {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
          display: flex;
          justify-content: space-around;
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }

        .summary-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #e0a96d;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-container p {
          margin-top: 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
}