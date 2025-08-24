'use client';

import React, { useState } from 'react';
import './TranscriptionSidebar.css';

interface Project {
  id: string;
  name: string;
  mediaCount: number;
  duration: string;
  type: 'crm' | 'independent';
  active?: boolean;
}

interface TranscriptionSidebarProps {
  // Add props as needed
}

export default function TranscriptionSidebar(props: TranscriptionSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'פרויקט דוגמה 1',
      mediaCount: 5,
      duration: '02:30:00',
      type: 'crm',
      active: true
    },
    {
      id: '2',
      name: 'פרויקט דוגמה 2',
      mediaCount: 3,
      duration: '01:45:00',
      type: 'independent'
    }
  ]);
  
  return (
    <div className="transcription-sidebar-content">
      <div className="sidebar-stats">
        <h3 className="sidebar-stats-title">סטטיסטיקות</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">12</div>
            <div className="sidebar-stat-label">פרויקטים</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">48</div>
            <div className="sidebar-stat-label">קבצים</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">15:30</div>
            <div className="sidebar-stat-label">שעות</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-number">85%</div>
            <div className="sidebar-stat-label">הושלם</div>
          </div>
        </div>
      </div>
      
      <div className="project-list">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`project-item ${project.active ? 'active' : ''}`}
            data-project-id={project.id}
          >
            <h4 className="project-item-title">{project.name}</h4>
            <div className="project-item-meta">
              <span>{project.mediaCount} קבצים</span>
              <span>{project.duration}</span>
            </div>
            <span className={`project-type-badge ${project.type}`}>
              {project.type === 'crm' ? 'CRM' : 'עצמאי'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}