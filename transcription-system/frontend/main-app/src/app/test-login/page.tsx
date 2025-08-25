'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function TestLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get token and user from URL parameters
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    
    if (token && userStr) {
      try {
        // Parse the user data
        const user = JSON.parse(userStr);
        
        // Save current admin session if exists
        const currentToken = localStorage.getItem('token');
        const currentUser = localStorage.getItem('user');
        const currentUserEmail = localStorage.getItem('userEmail');
        const currentUserFullName = localStorage.getItem('userFullName');
        const currentUserId = localStorage.getItem('userId');
        const currentPermissions = localStorage.getItem('userPermissions');
        
        if (currentToken && currentUser) {
          // Save admin session with all details
          localStorage.setItem('admin_token', currentToken);
          localStorage.setItem('admin_user', currentUser);
          if (currentUserEmail) localStorage.setItem('admin_userEmail', currentUserEmail);
          if (currentUserFullName) localStorage.setItem('admin_userFullName', currentUserFullName);
          if (currentUserId) localStorage.setItem('admin_userId', currentUserId);
          if (currentPermissions) localStorage.setItem('admin_userPermissions', currentPermissions);
        }
        
        // Clear current session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userPermissions');
        localStorage.removeItem('currentUser');
        
        // Save test user as the active session
        localStorage.setItem('token', token);
        localStorage.setItem('user', userStr);
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userFullName', user.full_name || user.email || '');
        localStorage.setItem('userId', user.id || '');
        localStorage.setItem('userPermissions', user.permissions || '');
        localStorage.setItem('is_test_session', 'true');
        
        // Redirect based on permissions
        if (user.permissions?.includes('D') || user.permissions?.includes('E') || user.permissions?.includes('F')) {
          // Force reload to ensure new token is used
          window.location.href = '/transcription';
        } else if (user.permissions?.includes('A') || user.permissions?.includes('B') || user.permissions?.includes('C')) {
          window.location.href = '/crm';
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
        router.push('/login');
      }
    } else {
      // No test token, redirect to regular login
      router.push('/login');
    }
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '20px',
      color: '#666',
      direction: 'rtl'
    }}>
      מתחבר כמשתמש בדיקה...
    </div>
  );
}

export default function TestLogin() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '20px',
        color: '#666',
        direction: 'rtl'
      }}>
        טוען...
      </div>
    }>
      <TestLoginContent />
    </Suspense>
  );
}