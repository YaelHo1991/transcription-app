'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HoveringHeaderProps {
  userFullName: string;
  permissions: string;
  onLogout: () => void;
  themeColor?: 'golden' | 'blue' | 'purple' | 'pink';
}

export default function HoveringHeader({ 
  userFullName, 
  permissions, 
  onLogout,
  themeColor = 'golden' 
}: HoveringHeaderProps) {
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
    <>
      {/* Hovering Header Reveal Zone */}
      <div 
        className="header-reveal-zone"
        onMouseEnter={() => setShowHeader(true)}
        onMouseLeave={() => setShowHeader(false)}
      />
      
      {/* Collapsible Header */}
      <div className={`collapsible-header ${showHeader ? 'show' : ''}`}>
        <div className="header-content">
          <div className="logo-section">
            <h1 style={{
              background: getGradient(),
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              אפליקציית תמלול
            </h1>
            <p className="page-subtitle">מערכת תמלול מקצועית</p>
          </div>
          
          <nav className="nav">
            <div className="nav-links">
              {navItems.map((item) => {
                if (!item.permission) return null;
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={pathname === item.path ? 'active' : ''}
                    style={pathname === item.path ? {
                      background: getGradient()
                    } : {}}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="user-info">
            <div className="user-profile" style={{
              background: themeColor === 'blue' ? 'rgba(0, 123, 255, 0.1)' :
                         themeColor === 'purple' ? 'rgba(111, 66, 193, 0.1)' :
                         'rgba(224, 169, 109, 0.1)',
              borderColor: themeColor === 'blue' ? 'rgba(0, 123, 255, 0.3)' :
                          themeColor === 'purple' ? 'rgba(111, 66, 193, 0.3)' :
                          'rgba(224, 169, 109, 0.3)'
            }}>
              שלום, {userFullName}
            </div>
            <button 
              className="logout-btn" 
              onClick={onLogout}
              style={{ background: getGradient() }}
            >
              יציאה
            </button>
          </div>
        </div>
      </div>
    </>
  );
}