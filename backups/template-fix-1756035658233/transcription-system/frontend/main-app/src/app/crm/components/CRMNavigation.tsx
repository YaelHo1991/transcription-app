'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CRMNavigation() {
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');

  useEffect(() => {
    // Get user permissions from localStorage/context
    const permissions = localStorage.getItem('permissions') || '';
    setUserPermissions(permissions);
    
    // Get user full name - with better fallback
    const fullName = localStorage.getItem('userFullName') || '';
    if (fullName && fullName !== 'null' && fullName !== 'undefined') {
      setUserFullName(fullName);
    } else {
      // Fallback to email prefix
      const email = localStorage.getItem('userEmail') || '';
      setUserFullName(email.split('@')[0] || 'משתמש');
    }
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      label: 'לוח בקרה',
      href: '/crm',
      permission: null, // Always visible
    },
    {
      id: 'clients',
      label: 'לקוחות',
      href: '/crm/clients',
      permission: 'A',
    },
    {
      id: 'projects',
      label: 'פרויקטים',
      href: '/crm/projects',
      permission: 'B',
    },
    {
      id: 'employees',
      label: 'עובדים',
      href: '/crm/employees',
      permission: 'C',
    },
    {
      id: 'reports',
      label: 'דוחות',
      href: '/crm/reports',
      permission: null, // Always visible
    },
  ];

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => 
    !item.permission || userPermissions.includes(item.permission)
  );

  return (
    <nav className="crm-nav-bar">
      <div className="nav-items">
        {visibleNavItems.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className={`crm-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="nav-user-greeting">
        שלום, {userFullName}
      </div>
    </nav>
  );
}