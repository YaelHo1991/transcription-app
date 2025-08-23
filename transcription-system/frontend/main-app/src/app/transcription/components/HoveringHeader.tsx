'use client';

import { useState } from 'react';
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
  const pathname = usePathname();

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