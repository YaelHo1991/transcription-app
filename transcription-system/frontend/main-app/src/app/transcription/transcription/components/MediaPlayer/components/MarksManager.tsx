'use client';

import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, Fragment } from 'react';
import {
  Mark,
  MarkType,
  MarkColor,
  MARK_COLORS,
  generateMarkId,
  sortMarksByTime,
  getMarksStorageKey
} from '../types/marks';

interface MarksManagerProps {
  mediaUrl: string;
  currentTime: number;
  duration: number;
  onMarkClick?: (mark: Mark) => void;
  onSeek?: (time: number) => void;
  enabled?: boolean;
  zoomLevel?: number;
  scrollOffset?: number;
  onDragStateChange?: (isDragging: boolean) => void;
}

const MarksManager = forwardRef(function MarksManager({
  mediaUrl,
  currentTime,
  duration,
  onMarkClick,
  onSeek,
  enabled = true,
  zoomLevel = 1,
  scrollOffset = 0,
  onDragStateChange
}: MarksManagerProps, ref) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [pendingMarkTime, setPendingMarkTime] = useState<number | null>(null);
  const [draggingBar, setDraggingBar] = useState<{ markId: string; type: 'start' | 'end' } | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load marks from localStorage when media changes
  useEffect(() => {
    if (!mediaUrl) return;
    
    const storageKey = getMarksStorageKey(mediaUrl);
    const storedMarks = localStorage.getItem(storageKey);
    
    if (storedMarks) {
      try {
        const parsedMarks = JSON.parse(storedMarks);
        setMarks(parsedMarks);
      } catch (error) {
        console.error('Failed to load marks:', error);
      }
    }
  }, [mediaUrl]);

  // Save marks to localStorage when they change
  useEffect(() => {
    if (!mediaUrl || marks.length === 0) return;
    
    const storageKey = getMarksStorageKey(mediaUrl);
    localStorage.setItem(storageKey, JSON.stringify(marks));
  }, [marks, mediaUrl]);

  // Add a new mark
  const addMark = useCallback((time: number, type: MarkType, label?: string) => {
    const newMark: Mark = {
      id: generateMarkId(),
      time,
      endTime: Math.min(time + 5, duration), // Default 5 second range
      type,
      label,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isRange: true
    };
    
    setMarks(prev => sortMarksByTime([...prev, newMark]));
    setEditingMarkId(newMark.id); // Automatically enter editing mode
    setSelectedMarkId(newMark.id); // Also select it
    onDragStateChange?.(true); // Freeze the white bar
    return newMark;
  }, [duration, onDragStateChange]);

  // Remove a mark
  const removeMark = useCallback((markId: string) => {
    setMarks(prev => prev.filter(m => m.id !== markId));
    if (selectedMarkId === markId) {
      setSelectedMarkId(null);
    }
    if (editingMarkId === markId) {
      setEditingMarkId(null);
      onDragStateChange?.(false);
    }
  }, [selectedMarkId, editingMarkId, onDragStateChange]);

  // Update a mark
  const updateMark = useCallback((markId: string, updates: Partial<Mark>) => {
    setMarks(prev => prev.map(m => 
      m.id === markId 
        ? { ...m, ...updates, updatedAt: Date.now() }
        : m
    ));
  }, []);

  // Handle right-click to add mark
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: Reverse the X position  
    const relativeX = 1 - (x / rect.width);
    
    // When not zoomed, use simple calculation
    if (zoomLevel === 1) {
      const time = relativeX * duration;
      setPendingMarkTime(time);
    } else {
      // When zoomed, account for visible area
      const visibleWidth = 1 / zoomLevel;
      const visibleStart = scrollOffset;
      const progress = visibleStart + (relativeX * visibleWidth);
      const time = progress * duration;
      setPendingMarkTime(time);
    }
    
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, [enabled, duration, zoomLevel, scrollOffset]);

  // Handle mark type selection from context menu
  const handleMarkTypeSelect = useCallback((type: MarkType) => {
    if (pendingMarkTime !== null) {
      addMark(pendingMarkTime, type);
      setPendingMarkTime(null);
    }
    setShowContextMenu(false);
  }, [pendingMarkTime, addMark]);
  
  // Handle dragging range bars (only in editing mode)
  const handleBarMouseDown = useCallback((e: React.MouseEvent, markId: string, type: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (editingMarkId !== markId) return; // Only allow dragging if this mark is being edited
    
    setDraggingBar({ markId, type });
    setDragStartX(e.clientX);
  }, [editingMarkId]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingBar || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: Reverse the X position
    const relativeX = 1 - (x / rect.width);
    
    let newTime;
    if (zoomLevel === 1) {
      // When not zoomed, use simple calculation
      newTime = relativeX * duration;
    } else {
      // When zoomed, account for visible area
      const visibleWidth = 1 / zoomLevel;
      const visibleStart = scrollOffset;
      const progress = visibleStart + (relativeX * visibleWidth);
      newTime = progress * duration;
    }
    
    setMarks(prev => prev.map(mark => {
      if (mark.id === draggingBar.markId) {
        if (draggingBar.type === 'start') {
          return {
            ...mark,
            time: Math.max(0, Math.min(newTime, mark.endTime || duration - 1)),
            updatedAt: Date.now()
          };
        } else {
          return {
            ...mark,
            endTime: Math.max(mark.time + 0.5, Math.min(duration, newTime)),
            updatedAt: Date.now()
          };
        }
      }
      return mark;
    }));
  }, [draggingBar, duration, zoomLevel, scrollOffset]);
  
  const handleMouseUp = useCallback(() => {
    setDraggingBar(null);
  }, []);

  // Handle single click to select/bring to front
  const handleMarkRangeClick = useCallback((mark: Mark, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Select this mark (brings it to front visually)
    setSelectedMarkId(mark.id);
  }, []);

  // Handle double-click on mark range to enter editing mode
  const handleMarkRangeDoubleClick = useCallback((mark: Mark, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (editingMarkId === mark.id) {
      // Already editing this mark, do nothing
      return;
    }
    
    // Enter editing mode for this mark
    setEditingMarkId(mark.id);
    onDragStateChange?.(true); // Freeze the white bar
  }, [editingMarkId, onDragStateChange]);
  
  // Handle clicking outside to exit editing mode
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (editingMarkId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const relativeX = 1 - (x / rect.width); // RTL
      const clickTime = (scrollOffset + (relativeX / zoomLevel)) * duration;
      
      // Check if click is outside any mark's range
      const clickedMark = marks.find(mark => 
        clickTime >= mark.time && clickTime <= (mark.endTime || mark.time)
      );
      
      if (!clickedMark || clickedMark.id !== editingMarkId) {
        // Clicked outside the editing mark
        setEditingMarkId(null);
        onDragStateChange?.(false); // Unfreeze the white bar
      }
    }
  }, [editingMarkId, marks, duration, scrollOffset, zoomLevel, onDragStateChange]);

  // Get next/previous mark
  const getNextMark = useCallback((fromTime: number): Mark | null => {
    const sortedMarks = sortMarksByTime(marks);
    return sortedMarks.find(m => m.time > fromTime) || null;
  }, [marks]);

  const getPreviousMark = useCallback((fromTime: number): Mark | null => {
    const sortedMarks = sortMarksByTime(marks);
    const previousMarks = sortedMarks.filter(m => m.time < fromTime);
    return previousMarks[previousMarks.length - 1] || null;
  }, [marks]);

  // Navigate to next/previous mark
  const navigateToNextMark = useCallback(() => {
    const nextMark = getNextMark(currentTime);
    if (nextMark) {
      onSeek?.(nextMark.time);
      onMarkClick?.(nextMark);
    }
  }, [currentTime, getNextMark, onSeek, onMarkClick]);

  const navigateToPreviousMark = useCallback(() => {
    const prevMark = getPreviousMark(currentTime);
    if (prevMark) {
      onSeek?.(prevMark.time);
      onMarkClick?.(prevMark);
    }
  }, [currentTime, getPreviousMark, onSeek, onMarkClick]);

  // Clear all marks
  const clearAllMarks = useCallback(() => {
    if (confirm('האם למחוק את כל הסימונים?')) {
      setMarks([]);
      setSelectedMarkId(null);
      setEditingMarkId(null);
      onDragStateChange?.(false);
    }
  }, [onDragStateChange]);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    navigateToNextMark,
    navigateToPreviousMark,
    clearAllMarks,
    addMark,
    removeMark,
    getMarks: () => marks,
    handleContextMenu
  }), [navigateToNextMark, navigateToPreviousMark, clearAllMarks, addMark, removeMark, marks, handleContextMenu]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (draggingBar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingBar, handleMouseMove, handleMouseUp]);
  
  // Add click outside listener when in editing mode
  useEffect(() => {
    if (editingMarkId) {
      // Small delay to avoid immediate trigger
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [editingMarkId, handleClickOutside]);
  
  if (!enabled) return null;

  return (
    <>
      {/* Editing mode indicator */}
      {editingMarkId && (
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 170, 0, 0.9)',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          🔒 מצב עריכה - לחץ מחוץ לסימון לסיום
        </div>
      )}
      
      {/* Marks container */}
      <div 
        ref={containerRef}
        className="marks-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',  // Always pass through - bars have their own pointerEvents
          zIndex: 5
        }}
      >
        {/* Render marks */}
        {marks.map(mark => {
          // Calculate absolute positions
          const markStart = mark.time / duration;
          const markEnd = (mark.endTime || mark.time) / duration;
          
          // RTL: positions are from right to left
          const startPosition = 100 - (markStart * 100);
          const endPosition = 100 - (markEnd * 100);
          const color = MARK_COLORS[mark.type];
          
          return (
            <React.Fragment key={mark.id}>
              {/* Range highlight */}
              {mark.isRange && mark.endTime && (
                <div
                  onClick={(e) => handleMarkRangeClick(mark, e)}
                  onDoubleClick={(e) => handleMarkRangeDoubleClick(mark, e)}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(startPosition, endPosition)}%`,
                    width: `${Math.abs(startPosition - endPosition)}%`,
                    height: '100%',
                    backgroundColor: color.secondary,
                    opacity: editingMarkId === mark.id ? 0.5 : (selectedMarkId === mark.id ? 0.4 : 0.3),
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    border: editingMarkId === mark.id ? `2px solid ${color.primary}` : (selectedMarkId === mark.id ? `1px solid ${color.primary}` : 'none'),
                    boxSizing: 'border-box',
                    zIndex: editingMarkId === mark.id ? 20 : (selectedMarkId === mark.id ? 10 : 1)
                  }}
                />
              )}
              
              {/* Start bar */}
              <div
                className="mark-bar mark-bar-start"
                style={{
                  position: 'absolute',
                  left: `${startPosition}%`,
                  top: 0,
                  width: editingMarkId === mark.id ? '5px' : '3px',
                  height: '100%',
                  backgroundColor: color.primary,
                  cursor: editingMarkId === mark.id ? 'ew-resize' : 'default',
                  pointerEvents: editingMarkId === mark.id ? 'auto' : 'none',
                  zIndex: editingMarkId === mark.id ? 21 : (selectedMarkId === mark.id ? 11 : 2),
                  boxShadow: editingMarkId === mark.id ? `0 0 8px ${color.primary}` : `0 0 4px ${color.primary}`
                }}
                onMouseDown={(e) => handleBarMouseDown(e, mark.id, 'start')}
                title={`${color.nameHebrew}: ${formatTime(mark.time)} - ${formatTime(mark.endTime || mark.time)}`}
              >
                {/* Timestamp label */}
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    fontSize: '8px',
                    padding: '0px 2px',
                    borderRadius: '2px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    fontWeight: 'normal',
                    zIndex: 20,
                    minWidth: '30px',
                    textAlign: 'center'
                  }}
                >
                  {formatTime(mark.time)}
                </div>
              </div>
              
              {/* End bar */}
              {mark.isRange && mark.endTime && (
                <div
                  className="mark-bar mark-bar-end"
                  style={{
                    position: 'absolute',
                    left: `${endPosition}%`,
                    top: 0,
                    width: editingMarkId === mark.id ? '5px' : '3px',
                    height: '100%',
                    backgroundColor: color.primary,
                    cursor: editingMarkId === mark.id ? 'ew-resize' : 'default',
                    pointerEvents: editingMarkId === mark.id ? 'auto' : 'none',
                    zIndex: editingMarkId === mark.id ? 21 : (selectedMarkId === mark.id ? 11 : 2),
                    boxShadow: editingMarkId === mark.id ? `0 0 8px ${color.primary}` : `0 0 4px ${color.primary}`
                  }}
                  onMouseDown={(e) => handleBarMouseDown(e, mark.id, 'end')}
                  title={`${color.nameHebrew}: ${formatTime(mark.time)} - ${formatTime(mark.endTime)}`}
                >
                  {/* Timestamp label */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      fontSize: '8px',
                      padding: '0px 2px',
                      borderRadius: '2px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      fontWeight: 'normal',
                      zIndex: 20,
                      minWidth: '30px',
                      textAlign: 'center'
                    }}
                  >
                    {formatTime(mark.endTime)}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Context menu for adding marks */}
      {showContextMenu && (
        <div
          className="mark-context-menu"
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            minWidth: '150px'
          }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          {Object.entries(MARK_COLORS).map(([type, color]) => (
            <button
              key={type}
              onClick={() => handleMarkTypeSelect(type as MarkType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '12px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{color.icon}</span>
              <span>{color.nameHebrew}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
});

export default MarksManager;

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}