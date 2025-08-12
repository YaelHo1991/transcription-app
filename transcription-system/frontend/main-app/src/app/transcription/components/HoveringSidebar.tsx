'use client';

import { useState } from 'react';

interface HoveringSidebarProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function HoveringSidebar({ 
  title, 
  subtitle, 
  children 
}: HoveringSidebarProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      {/* Sidebar Reveal Zone */}
      <div 
        className="sidebar-reveal-zone"
        onMouseEnter={() => setShowSidebar(true)}
        onMouseLeave={() => setShowSidebar(false)}
      />
      
      {/* Hovering Sidebar */}
      <div className={`hovering-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        
        <div className="sidebar-content">
          {children}
        </div>
      </div>
    </>
  );
}