'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HoveringHeaderProps {
  userFullName: string;
  permissions: string;
  onLogout: () => void;
  themeColor?: 'golden' | 'blue' | 'purple' | 'pink';
  onLockToggle?: () => void;
  isLocked?: boolean;
}

// Admin user IDs (both local and production)
const ADMIN_USER_IDS = [
  // Production IDs
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  // Local development IDs
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

export default function HoveringHeader({ 
  userFullName, 
  permissions, 
  onLogout,
  themeColor = 'golden',
  onLockToggle,
  isLocked = false
}: HoveringHeaderProps) {
  // Debug logging
  console.log('[HoveringHeader] Props:', { 
    hasOnLockToggle: !!onLockToggle, 
    isLocked,
    themeColor 
  });
  const [showHeader, setShowHeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  // Check if current user is admin
  useEffect(() => {
    try {
      // Check if we're in test mode and have an admin token
      const isTestSession = localStorage.getItem('is_test_session') === 'true';
      const adminToken = localStorage.getItem('admin_token');
      
      let userId = null;
      
      if (isTestSession && adminToken) {
        // In test mode, check the admin token
        console.log('[HoveringHeader] Test mode detected, checking admin token');
        const adminPayload = JSON.parse(atob(adminToken.split('.')[1]));
        userId = adminPayload.userId || adminPayload.id || adminPayload.user_id;
        console.log('[HoveringHeader] Admin user ID from saved token:', userId);
      } else {
        // Normal mode - check current token or localStorage
        userId = localStorage.getItem('userId');
        console.log('[HoveringHeader] userId from localStorage:', userId);
        
        // If not found, try to extract from token
        if (!userId) {
          const token = localStorage.getItem('token');
          console.log('[HoveringHeader] Checking token for userId...');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('[HoveringHeader] Token payload:', payload);
            userId = payload.userId || payload.id || payload.user_id;
          }
        }
      }
      
      console.log('[HoveringHeader] Final User ID:', userId);
      console.log('[HoveringHeader] Admin IDs:', ADMIN_USER_IDS);
      
      if (userId) {
        const adminStatus = ADMIN_USER_IDS.includes(userId);
        console.log('[HoveringHeader] Is Admin:', adminStatus);
        setIsAdmin(adminStatus);
      } else {
        console.log('[HoveringHeader] No user ID found');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('[HoveringHeader] Error checking admin status:', error);
      setIsAdmin(false);
    }
  }, []);

  // Check permissions for each route
  const canAccessTranscription = permissions.includes('D');
  const canAccessProofreading = permissions.includes('E');
  const canAccessExport = permissions.includes('F');

  // Navigation items
  const navItems = [
    { 
      path: '/transcription', 
      label: 'ראשי',
      permission: true
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
      permission: true
    },
    { 
      path: '/transcription/admin', 
      label: '🔧 ניהול',
      permission: isAdmin
    }
  ];

  // Get gradient based on theme
  const getGradient = () => {
    switch(themeColor) {
      case 'blue':
        return 'linear-gradient(135deg, #007bff 0%, #17a2b8 100%)';
      case 'purple':
        return 'linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)';
      case 'pink':
        return 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)';
      default:
        return 'linear-gradient(135deg, #e0a96d 0%, #f4c2a1 100%)';
    }
  };

  return (
    <div className="header-content t-header-content">
      <div className="t-left-section">
        <div className="user-info t-user-info">
          <div className="user-profile t-user-profile">
            שלום, {userFullName}
          </div>
        </div>
      </div>
      
      <div className="t-right-section">
        <nav className="nav t-nav">
          <div className="nav-links t-nav-links">
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
        </nav>
        {onLockToggle && (
          <div className="header-controls">
            <button 
              onClick={onLockToggle}
              className="lock-btn"
              aria-label={isLocked ? 'Unlock header' : 'Lock header'}
            >
              {isLocked ? '🔓' : '🔒'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}