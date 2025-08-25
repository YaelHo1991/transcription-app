'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionSwitcher() {
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [isTestSession, setIsTestSession] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkSessions();
  }, []);

  const checkSessions = () => {
    const adminToken = localStorage.getItem('admin_token');
    const testSession = localStorage.getItem('is_test_session');
    const userStr = localStorage.getItem('user');
    
    setHasAdminSession(!!adminToken);
    setIsTestSession(testSession === 'true');
    
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  };

  const switchToAdmin = () => {
    const adminToken = localStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user');
    
    if (adminToken && adminUser) {
      // Clear test session
      localStorage.removeItem('is_test_session');
      
      // Clear current test user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userFullName');
      localStorage.removeItem('userId');
      localStorage.removeItem('userPermissions');
      
      // Restore admin session with all details
      localStorage.setItem('token', adminToken);
      localStorage.setItem('user', adminUser);
      
      const adminEmail = localStorage.getItem('admin_userEmail');
      const adminFullName = localStorage.getItem('admin_userFullName');
      const adminUserId = localStorage.getItem('admin_userId');
      const adminPermissions = localStorage.getItem('admin_userPermissions');
      
      if (adminEmail) localStorage.setItem('userEmail', adminEmail);
      if (adminFullName) localStorage.setItem('userFullName', adminFullName);
      if (adminUserId) localStorage.setItem('userId', adminUserId);
      if (adminPermissions) localStorage.setItem('userPermissions', adminPermissions);
      
      // Clear admin backup
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_userEmail');
      localStorage.removeItem('admin_userFullName');
      localStorage.removeItem('admin_userId');
      localStorage.removeItem('admin_userPermissions');
      
      // Navigate to admin
      window.location.href = '/transcription/admin';
    }
  };

  const endTestSession = () => {
    // Clear test session data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('is_test_session');
    
    // Restore admin session if exists
    const adminToken = localStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('admin_user');
    
    if (adminToken && adminUser) {
      localStorage.setItem('token', adminToken);
      localStorage.setItem('user', adminUser);
      
      const adminEmail = localStorage.getItem('admin_userEmail');
      const adminFullName = localStorage.getItem('admin_userFullName');
      const adminUserId = localStorage.getItem('admin_userId');
      const adminPermissions = localStorage.getItem('admin_userPermissions');
      
      if (adminEmail) localStorage.setItem('userEmail', adminEmail);
      if (adminFullName) localStorage.setItem('userFullName', adminFullName);
      if (adminUserId) localStorage.setItem('userId', adminUserId);
      if (adminPermissions) localStorage.setItem('userPermissions', adminPermissions);
      
      // Clear admin backup
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_userEmail');
      localStorage.removeItem('admin_userFullName');
      localStorage.removeItem('admin_userId');
      localStorage.removeItem('admin_userPermissions');
      
      window.location.href = '/transcription/admin';
    } else {
      window.location.href = '/login';
    }
  };

  // Only show if we have an admin session saved and we're in a test session
  if (!hasAdminSession || !isTestSession) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'linear-gradient(135deg, #c7a788 0%, #b8956f 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9999,
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        מצב בדיקה: {currentUser?.email || 'משתמש'}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={switchToAdmin}
          style={{
            background: 'white',
            color: '#b8956f',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          חזור למנהל
        </button>
        <button
          onClick={endTestSession}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          סיים בדיקה
        </button>
      </div>
    </div>
  );
}