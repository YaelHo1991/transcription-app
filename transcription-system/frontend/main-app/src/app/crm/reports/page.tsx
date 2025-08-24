'use client';

import { useState, useEffect } from 'react';

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  const stats = {
    revenue: {
      current: 45250,
      previous: 38900,
      change: 16.3
    },
    projects: {
      completed: 23,
      inProgress: 8,
      pending: 5
    },
    clients: {
      active: 15,
      new: 3,
      total: 28
    },
    performance: {
      avgCompletionTime: 3.2,
      satisfaction: 4.7,
      onTimeDelivery: 92
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>דוחות וסיכומים</h1>
        <p>ניתוח ביצועים ונתונים סטטיסטיים</p>
      </div>

      <div className="period-selector">
        <button 
          className={period === 'week' ? 'active' : ''}
          onClick={() => setPeriod('week')}
        >
          שבוע אחרון
        </button>
        <button 
          className={period === 'month' ? 'active' : ''}
          onClick={() => setPeriod('month')}
        >
          חודש אחרון
        </button>
        <button 
          className={period === 'quarter' ? 'active' : ''}
          onClick={() => setPeriod('quarter')}
        >
          רבעון
        </button>
        <button 
          className={period === 'year' ? 'active' : ''}
          onClick={() => setPeriod('year')}
        >
          שנה
        </button>
        <button className="export-btn">
          📥 ייצוא לאקסל
        </button>
      </div>

      <div className="reports-grid">
        {/* Revenue Card */}
        <div className="report-card revenue-card">
          <div className="card-header">
            <h3>📈 הכנסות</h3>
            <span className="change positive">+{stats.revenue.change}%</span>
          </div>
          <div className="main-value">₪{stats.revenue.current.toLocaleString()}</div>
          <div className="comparison">
            לעומת ₪{stats.revenue.previous.toLocaleString()} בתקופה הקודמת
          </div>
          <div className="mini-chart">
            <div className="chart-bars">
              {[65, 70, 68, 75, 80, 85, 90].map((height, i) => (
                <div key={i} className="bar" style={{ height: height + '%' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Projects Status */}
        <div className="report-card">
          <div className="card-header">
            <h3>📊 סטטוס פרויקטים</h3>
          </div>
          <div className="status-breakdown">
            <div className="status-item">
              <div className="status-color" style={{ background: '#66bb6a' }} />
              <span className="status-label">הושלמו</span>
              <span className="status-value">{stats.projects.completed}</span>
            </div>
            <div className="status-item">
              <div className="status-color" style={{ background: '#42a5f5' }} />
              <span className="status-label">בתהליך</span>
              <span className="status-value">{stats.projects.inProgress}</span>
            </div>
            <div className="status-item">
              <div className="status-color" style={{ background: '#ffa726' }} />
              <span className="status-label">ממתינים</span>
              <span className="status-value">{stats.projects.pending}</span>
            </div>
          </div>
          <div className="progress-visual">
            <div 
              className="progress-segment completed" 
              style={{ width: '63%', background: '#66bb6a' }}
            />
            <div 
              className="progress-segment in-progress" 
              style={{ width: '22%', background: '#42a5f5' }}
            />
            <div 
              className="progress-segment pending" 
              style={{ width: '15%', background: '#ffa726' }}
            />
          </div>
        </div>

        {/* Clients Overview */}
        <div className="report-card">
          <div className="card-header">
            <h3>👥 סקירת לקוחות</h3>
          </div>
          <div className="clients-stats">
            <div className="client-stat">
              <div className="stat-icon">🔥</div>
              <div className="stat-info">
                <div className="stat-value">{stats.clients.active}</div>
                <div className="stat-label">לקוחות פעילים</div>
              </div>
            </div>
            <div className="client-stat">
              <div className="stat-icon">✨</div>
              <div className="stat-info">
                <div className="stat-value">{stats.clients.new}</div>
                <div className="stat-label">לקוחות חדשים</div>
              </div>
            </div>
            <div className="client-stat">
              <div className="stat-icon">📁</div>
              <div className="stat-info">
                <div className="stat-value">{stats.clients.total}</div>
                <div className="stat-label">סה"כ לקוחות</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="report-card">
          <div className="card-header">
            <h3>⚡ מדדי ביצוע</h3>
          </div>
          <div className="metrics-list">
            <div className="metric">
              <span className="metric-label">זמן השלמה ממוצע</span>
              <span className="metric-value">{stats.performance.avgCompletionTime} ימים</span>
            </div>
            <div className="metric">
              <span className="metric-label">שביעות רצון</span>
              <span className="metric-value">⭐ {stats.performance.satisfaction}/5</span>
            </div>
            <div className="metric">
              <span className="metric-label">אספקה בזמן</span>
              <span className="metric-value">{stats.performance.onTimeDelivery}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="summary-section">
        <h2>סיכום חודשי מפורט</h2>
        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th>חודש</th>
                <th>הכנסות</th>
                <th>פרויקטים</th>
                <th>לקוחות חדשים</th>
                <th>שביעות רצון</th>
                <th>מגמה</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ינואר 2024</td>
                <td>₪45,250</td>
                <td>23</td>
                <td>3</td>
                <td>⭐ 4.7</td>
                <td className="trend up">↑ 16.3%</td>
              </tr>
              <tr>
                <td>דצמבר 2023</td>
                <td>₪38,900</td>
                <td>19</td>
                <td>2</td>
                <td>⭐ 4.5</td>
                <td className="trend up">↑ 8.2%</td>
              </tr>
              <tr>
                <td>נובמבר 2023</td>
                <td>₪35,600</td>
                <td>17</td>
                <td>1</td>
                <td>⭐ 4.6</td>
                <td className="trend down">↓ 2.1%</td>
              </tr>
            </tbody>
          </table>
        </div>
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

        .period-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
        }

        .period-selector button {
          padding: 8px 16px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .period-selector button.active,
        .period-selector button:hover {
          background: #6b7c93;
          color: white;
          border-color: #6b7c93;
        }

        .export-btn {
          margin-left: auto;
          background: linear-gradient(135deg, #6b7c93 0%, #5a6a7f 100%) !important;
          color: white !important;
          border: none !important;
        }

        .reports-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 25px;
          margin-bottom: 40px;
        }

        .report-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .revenue-card {
          background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h3 {
          font-size: 18px;
          color: #322514;
          margin: 0;
        }

        .change {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .change.positive {
          background: #d4f4dd;
          color: #2e7d32;
        }

        .main-value {
          font-size: 32px;
          font-weight: bold;
          color: #322514;
          margin-bottom: 10px;
        }

        .comparison {
          color: #999;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .mini-chart {
          padding: 20px 0;
        }

        .chart-bars {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          height: 60px;
        }

        .bar {
          flex: 1;
          background: linear-gradient(to top, #6b7c93, #8a9aaf);
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
        }

        .bar:hover {
          background: linear-gradient(to top, #b85042, #d4a574);
        }

        .status-breakdown {
          margin-bottom: 20px;
        }

        .status-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-left: 10px;
        }

        .status-label {
          flex: 1;
          color: #666;
          font-size: 14px;
        }

        .status-value {
          font-weight: bold;
          color: #322514;
          font-size: 18px;
        }

        .progress-visual {
          display: flex;
          height: 30px;
          border-radius: 15px;
          overflow: hidden;
        }

        .progress-segment {
          transition: all 0.3s ease;
        }

        .clients-stats {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .client-stat {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 24px;
        }

        .stat-info {
          flex: 1;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #322514;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
        }

        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .metric-label {
          color: #666;
          font-size: 14px;
        }

        .metric-value {
          font-weight: bold;
          color: #322514;
        }

        .summary-section {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .summary-section h2 {
          font-size: 20px;
          color: #322514;
          margin-bottom: 20px;
        }

        .summary-table-container {
          overflow-x: auto;
        }

        .summary-table {
          width: 100%;
          border-collapse: collapse;
        }

        .summary-table th {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%);
          padding: 12px;
          text-align: right;
          font-weight: 600;
          color: #5a4a3a;
          border-bottom: 2px solid #6b7c93;
        }

        .summary-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .summary-table tr:hover {
          background: rgba(107, 124, 147, 0.05);
        }

        .trend {
          font-weight: bold;
        }

        .trend.up {
          color: #2e7d32;
        }

        .trend.down {
          color: #c62828;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1200px) {
          .reports-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .period-selector {
            flex-wrap: wrap;
          }

          .export-btn {
            margin-left: 0;
            margin-top: 10px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}