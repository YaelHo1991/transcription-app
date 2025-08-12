'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CRMNavigation from './components/CRMNavigation';
import CompanyHeader from './components/CompanyHeader';
import './crm.css';

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userFullName, setUserFullName] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Get fresh data on mount
    const fullName = localStorage.getItem('userFullName') || '';
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login?system=crm');
      return;
    }
    
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      // Try to get from email
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login?system=crm');
  };

  return (
    <div className="crm-container">
      <div className="crm-wrapper">
        {/* Company Header */}
        <CompanyHeader />
        
        {/* Main Header - Remove greeting from here */}
        <div className="crm-header">
          <h1>מערכת CRM</h1>
          <div className="user-actions">
            <button className="logout-btn" onClick={handleLogout}>
              🚪 יציאה
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <CRMNavigation />

        {/* Main Content */}
        <div className="crm-main-content">
          {children}
        </div>
      </div>
    </div>
  );
}