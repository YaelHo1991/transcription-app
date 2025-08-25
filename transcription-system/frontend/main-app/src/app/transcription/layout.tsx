'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import './transcription.css';

// Admin user IDs (same as in admin pages)
const ADMIN_USER_IDS = [
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345'  // ליאת בן שי
];

export default function TranscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userFullName, setUserFullName] = useState('');
  const [permissions, setPermissions] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get user data from localStorage
    const fullName = localStorage.getItem('userFullName') || '';
    const token = localStorage.getItem('token');
    const userPermissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has any transcription permissions (D, E, or F)
    const hasTranscriptionAccess = 
      userPermissions.includes('D') || 
      userPermissions.includes('E') || 
      userPermissions.includes('F');
    
    if (!hasTranscriptionAccess) {
      router.push('/login?system=transcription');
      return;
    }
    
    // Check if current user is admin
    try {
      // First try to get userId from localStorage directly
      let userId = localStorage.getItem('userId');
      console.log('[Layout] userId from localStorage:', userId);
      
      // If not found, try to extract from token
      if (!userId && token) {
        console.log('[Layout] Checking token for userId...');
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[Layout] Token payload:', payload);
        userId = payload.userId || payload.id || payload.user_id;
      }
      
      console.log('[Layout] Final User ID:', userId);
      console.log('[Layout] Admin IDs:', ADMIN_USER_IDS);
      
      if (userId) {
        const adminStatus = ADMIN_USER_IDS.includes(userId);
        console.log('[Layout] Is Admin:', adminStatus);
        setIsAdmin(adminStatus);
      } else {
        console.log('[Layout] No user ID found');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('[Layout] Error checking admin status:', error);
      setIsAdmin(false);
    }
    
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
    
    setPermissions(userPermissions);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login?system=transcription');
  };

  // Check permissions for each route
  const canAccessTranscription = permissions.includes('D');
  const canAccessProofreading = permissions.includes('E');
  const canAccessExport = permissions.includes('F');

  // Navigation items
  const navItems = [
    { 
      path: '/transcription', 
      label: 'דף הבית',
      permission: true // All transcription users can access
    },
    { 
      path: '/transcription/transcription', 
      label: 'תמלול',
      permission: canAccessTranscription
    },
    { 
      path: '/transcription/proofreading', 
      label: 'הגהה',
      permission: canAccessProofreading
    },
    { 
      path: '/transcription/export', 
      label: 'ייצוא',
      permission: canAccessExport
    },
    { 
      path: '/transcription/records', 
      label: 'רישומים',
      permission: true // All transcription users can access
    },
    { 
      path: '/transcription/admin', 
      label: '🔧 ניהול',
      permission: isAdmin
    }
  ];

  // Check if current page needs the layout header
  const needsLayoutHeader = !pathname.includes('/proofreading') && !pathname.includes('/export') && !pathname.includes('/transcription/transcription');
  

  // If page has its own hovering header, just render children
  if (!needsLayoutHeader) {
    return <>{children}</>;
  }

  // Otherwise, render with header and nav
  return (
    <div className="transcription-container" dir="rtl">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo-section">
            <h1>אפליקציית תמלול</h1>
          </div>
          <div className="user-info">
            <div className="user-profile">
              <span>שלום, {userFullName}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              התנתק
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="nav">
        <div className="nav-content">
          <div className="nav-links">
            {navItems.map((item) => {
              if (!item.permission) return null;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={pathname === item.path ? 'active' : ''}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}