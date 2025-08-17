'use client';

import React, { useState, useRef, useEffect } from 'react';
import './ToolbarGroup.css';

interface ToolbarButton {
  icon: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}

interface ToolbarGroupProps {
  groupIcon: string;
  groupTitle: string;
  buttons: ToolbarButton[];
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  customElement?: React.ReactNode;
}

export default function ToolbarGroup({ 
  groupIcon, 
  groupTitle, 
  buttons,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandChange,
  customElement
}: ToolbarGroupProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setExpanded = (value: boolean) => {
    if (onExpandChange) {
      onExpandChange(value);
    } else {
      setInternalExpanded(value);
    }
  };
  const [animating, setAnimating] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && buttonsRef.current) {
      // Animate the expansion
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      
      // Ensure the expanded buttons are visible
      if (buttonsRef.current) {
        const rect = buttonsRef.current.getBoundingClientRect();
        const toolbar = buttonsRef.current.closest('.text-editor-toolbar');
        if (toolbar) {
          const toolbarRect = toolbar.getBoundingClientRect();
          if (rect.right > toolbarRect.right) {
            toolbar.scrollLeft += rect.right - toolbarRect.right + 20;
          }
        }
      }
    }
  }, [expanded]);

  // Removed auto-close on outside click to allow multiple groups open

  return (
    <div className={`toolbar-group ${expanded ? 'expanded' : ''}`} ref={groupRef}>
      <button
        className={`toolbar-group-btn ${expanded ? 'active' : ''}`}
        onClick={() => setExpanded(!expanded)}
        title={groupTitle}
      >
        <span className="toolbar-icon">{groupIcon}</span>
        <span className={`expand-indicator ${expanded ? 'rotated' : ''}`}>
          ‹
        </span>
      </button>
      
      <div 
        className={`toolbar-group-buttons ${expanded ? 'visible' : ''} ${animating ? 'animating' : ''}`}
        ref={buttonsRef}
      >
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`toolbar-btn ${button.active ? 'active' : ''} ${button.className || ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (button.onClick) {
                button.onClick();
              }
              // Keep group open after clicking buttons
            }}
            title={button.title}
          >
            <span className="toolbar-icon">{button.icon}</span>
          </button>
        ))}
        {customElement}
      </div>
    </div>
  );
}