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
  markFilter?: MarkType | null;
  navigationFilter?: MarkType | 'all';
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
  onDragStateChange,
  markFilter = null,
  navigationFilter = 'all'
}: MarksManagerProps, ref) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [pendingMarkTime, setPendingMarkTime] = useState<number | null>(null);
  const [draggingBar, setDraggingBar] = useState<{ markId: string; type: 'start' | 'end' } | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showCustomNameDialog, setShowCustomNameDialog] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  
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
  const addMark = useCallback((time: number, type: MarkType, label?: string, customName?: string) => {
    const newMark: Mark = {
      id: generateMarkId(),
      time,
      endTime: Math.min(time + 5, duration), // Default 5 second range
      type,
      label,
      customName,
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
    
    // Calculate time based on visible range
    const visibleWidth = 1 / zoomLevel;
    const visibleStart = scrollOffset;
    const progress = visibleStart + (relativeX * visibleWidth);
    const time = Math.max(0, Math.min(duration, progress * duration));
    
    setPendingMarkTime(time);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
    
    // Auto-close menu after 10 seconds if no interaction
    setTimeout(() => {
      setShowContextMenu(false);
    }, 10000);
  }, [enabled, duration, zoomLevel, scrollOffset]);

  // Handle mark type selection from context menu
  const handleMarkTypeSelect = useCallback((type: MarkType) => {
    if (pendingMarkTime !== null) {
      if (type === MarkType.CUSTOM) {
        // Show custom name dialog
        setShowCustomNameDialog(true);
        setCustomNameInput('');
        setShowContextMenu(false);
      } else {
        addMark(pendingMarkTime, type);
        setPendingMarkTime(null);
        setShowContextMenu(false);
      }
    }
  }, [pendingMarkTime, addMark]);

  // Handle custom name confirmation
  const handleCustomNameConfirm = useCallback(() => {
    if (pendingMarkTime !== null && customNameInput.trim()) {
      addMark(pendingMarkTime, MarkType.CUSTOM, undefined, customNameInput.trim());
      setPendingMarkTime(null);
    }
    setShowCustomNameDialog(false);
    setCustomNameInput('');
  }, [pendingMarkTime, customNameInput, addMark]);

  // Handle custom name cancel
  const handleCustomNameCancel = useCallback(() => {
    setShowCustomNameDialog(false);
    setCustomNameInput('');
    setPendingMarkTime(null);
  }, []);
  
  // Handle dragging range bars (only in editing mode)
  const handleBarMouseDown = useCallback((e: React.MouseEvent, markId: string, type: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (editingMarkId !== markId) return; // Only allow dragging if this mark is being edited
    
    // Immediately start dragging to prevent stickiness
    setDraggingBar({ markId, type });
    setDragStartX(e.clientX);
    
    // Prevent any text selection during drag
    document.body.style.userSelect = 'none';
  }, [editingMarkId]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingBar || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: Reverse the X position
    const relativeX = 1 - (x / rect.width);
    
    // Calculate time based on visible range
    const visibleWidth = 1 / zoomLevel;
    const visibleStart = scrollOffset;
    const progress = visibleStart + (relativeX * visibleWidth);
    const newTime = Math.max(0, Math.min(duration, progress * duration));
    
    // Update immediately without requestAnimationFrame for lighter dragging
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
    if (draggingBar) {
      // Re-enable text selection
      document.body.style.userSelect = '';
      setDraggingBar(null);
    }
  }, [draggingBar]);

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

  // Handle smart click - distinguish single vs double click
  const handleMarkRangeClick = useCallback((mark: Mark, e: React.MouseEvent) => {
    // Handle Shift+Click to delete (works in any mode)
    if (e.shiftKey) {
      e.stopPropagation();
      e.preventDefault();
      removeMark(mark.id);
      return;
    }
    
    // If in editing mode, handle normally
    if (editingMarkId === mark.id) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedMarkId(mark.id);
      return;
    }
    
    // If not editing, use click detection to distinguish single vs double
    if (clickTimer) {
      // This is a double-click
      clearTimeout(clickTimer);
      setClickTimer(null);
      setClickCount(0);
      
      // Handle as double-click - enter editing mode
      e.stopPropagation();
      e.preventDefault();
      handleMarkRangeDoubleClick(mark, e);
    } else {
      // This might be a single click - wait to see if double-click follows
      setClickCount(1);
      const timer = setTimeout(() => {
        setClickCount(0);
        setClickTimer(null);
        // This was just a single click - let it pass through for seeking
        // Don't need to do anything special here
      }, 300); // 300ms window for double-click detection
      setClickTimer(timer);
    }
  }, [removeMark, editingMarkId, clickTimer, handleMarkRangeDoubleClick]);
  
  // Handle clicking outside to exit editing mode
  const handleClickOutside = useCallback((e: MouseEvent) => {
    // Don't handle clicks if we're currently dragging a bar
    if (draggingBar || !editingMarkId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = 1 - (x / rect.width); // RTL
    const visibleWidth = 1 / zoomLevel;
    const visibleStart = scrollOffset;
    const progress = visibleStart + (relativeX * visibleWidth);
    const clickTime = progress * duration;
    
    // Check if click is outside any mark's range
    const clickedMark = marks.find(mark => 
      clickTime >= mark.time && clickTime <= (mark.endTime || mark.time)
    );
    
    if (!clickedMark || clickedMark.id !== editingMarkId) {
      // Clicked outside the editing mark
      setEditingMarkId(null);
      setSelectedMarkId(null);
      onDragStateChange?.(false); // Unfreeze the white bar
    }
  }, [draggingBar, editingMarkId, marks, duration, scrollOffset, zoomLevel, onDragStateChange]);

  // Get filtered marks based on navigation filter
  const getFilteredMarks = useCallback(() => {
    if (navigationFilter === 'all') {
      return marks;
    }
    return marks.filter(mark => mark.type === navigationFilter);
  }, [marks, navigationFilter]);

  // Get next/previous mark (filtered) with tolerance
  const getNextMark = useCallback((fromTime: number): Mark | null => {
    const filteredMarks = getFilteredMarks();
    console.log('getNextMark - filteredMarks:', filteredMarks.map(m => ({id: m.id, time: m.time, type: m.type})));
    const sortedMarks = sortMarksByTime(filteredMarks);
    console.log('getNextMark - sortedMarks:', sortedMarks.map(m => ({id: m.id, time: m.time, type: m.type})));
    // Add tolerance of 0.5 seconds to avoid getting stuck at current mark
    const nextMark = sortedMarks.find(m => m.time > fromTime + 0.5);
    console.log('getNextMark - fromTime:', fromTime, 'nextMark:', nextMark ? {id: nextMark.id, time: nextMark.time, type: nextMark.type} : null);
    return nextMark || null;
  }, [getFilteredMarks]);

  const getPreviousMark = useCallback((fromTime: number): Mark | null => {
    const filteredMarks = getFilteredMarks();
    console.log('getPreviousMark - filteredMarks:', filteredMarks.map(m => ({id: m.id, time: m.time, type: m.type})));
    const sortedMarks = sortMarksByTime(filteredMarks);
    console.log('getPreviousMark - sortedMarks:', sortedMarks.map(m => ({id: m.id, time: m.time, type: m.type})));
    // Add tolerance of 0.5 seconds to avoid getting stuck at current mark
    const previousMarks = sortedMarks.filter(m => m.time < fromTime - 0.5);
    const prevMark = previousMarks[previousMarks.length - 1] || null;
    console.log('getPreviousMark - fromTime:', fromTime, 'prevMark:', prevMark ? {id: prevMark.id, time: prevMark.time, type: prevMark.type} : null);
    return prevMark;
  }, [getFilteredMarks]);

  // Navigate to next/previous mark
  const navigateToNextMark = useCallback(() => {
    console.log('Navigating to next mark, currentTime:', currentTime);
    const nextMark = getNextMark(currentTime);
    console.log('Found next mark:', nextMark);
    if (nextMark) {
      console.log('Seeking to:', nextMark.time);
      onSeek?.(nextMark.time);
      onMarkClick?.(nextMark);
    } else {
      console.log('No next mark found');
    }
  }, [currentTime, getNextMark, onSeek, onMarkClick]);

  const navigateToPreviousMark = useCallback(() => {
    console.log('Navigating to previous mark, currentTime:', currentTime);
    const prevMark = getPreviousMark(currentTime);
    console.log('Found previous mark:', prevMark);
    if (prevMark) {
      console.log('Seeking to:', prevMark.time);
      onSeek?.(prevMark.time);
      onMarkClick?.(prevMark);
    } else {
      console.log('No previous mark found');
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
  
  // Handle Ctrl+Click from parent (WaveformCanvas)
  const handleCtrlClickFromParent = useCallback((clickTime: number) => {
    if (editingMarkId) return; // Don't handle if already editing
    
    // Find mark at this time position
    const clickedMark = marks.find(mark => {
      if (!mark.isRange || !mark.endTime) return false;
      return clickTime >= mark.time && clickTime <= mark.endTime;
    });
    
    if (clickedMark) {
      setEditingMarkId(clickedMark.id);
      setSelectedMarkId(clickedMark.id);
      onDragStateChange?.(true); // Freeze the white bar
    }
  }, [marks, editingMarkId, onDragStateChange]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    navigateToNextMark,
    navigateToPreviousMark,
    clearAllMarks,
    addMark,
    removeMark,
    getMarks: () => marks,
    handleContextMenu,
    handleCtrlClickFromParent
  }), [navigateToNextMark, navigateToPreviousMark, clearAllMarks, addMark, removeMark, marks, handleContextMenu, handleCtrlClickFromParent]);

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
          pointerEvents: 'none',  // Pass through by default
          zIndex: 5
        }}
      >
        {/* Render marks */}
        {marks.filter(mark => markFilter === null || mark.type === markFilter).map(mark => {
          // Calculate mark positions as absolute positions on the waveform
          const markStart = mark.time / duration;
          const markEnd = (mark.endTime || mark.time) / duration;
          
          // Calculate visible range for clipping (but don't affect positioning)
          const visibleWidth = 1 / zoomLevel;
          const visibleStart = scrollOffset;
          const visibleEnd = visibleStart + visibleWidth;
          
          // Check if mark is visible (for performance, but still render for consistency)
          const isVisible = !(markEnd < visibleStart || markStart > visibleEnd);
          
          // Always use absolute positions relative to the full waveform
          // This ensures marks stay fixed to their timeline positions
          const absoluteStart = markStart;
          const absoluteEnd = markEnd;
          
          // When zoomed, we need to map the absolute position to the visible canvas
          let startPosition, endPosition;
          
          if (zoomLevel === 1) {
            // No zoom: direct mapping
            startPosition = 100 - (absoluteStart * 100);
            endPosition = 100 - (absoluteEnd * 100);
          } else {
            // Zoomed: map absolute position to visible area
            const relativeStart = (absoluteStart - visibleStart) / visibleWidth;
            const relativeEnd = (absoluteEnd - visibleStart) / visibleWidth;
            startPosition = 100 - (relativeStart * 100);
            endPosition = 100 - (relativeEnd * 100);
          }
          
          const color = MARK_COLORS[mark.type];
          
          // Only render if mark would be visible on screen
          if (!isVisible && zoomLevel > 1) {
            return null;
          }
          
          return (
            <React.Fragment key={mark.id}>
              {/* Range highlight */}
              {mark.isRange && mark.endTime && (
                <div
                  onClick={editingMarkId === mark.id ? (e) => handleMarkRangeClick(mark, e) : undefined}
                  data-mark-id={mark.id}
                  data-mark-start={mark.time}
                  data-mark-end={mark.endTime}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(startPosition, endPosition)}%`,
                    width: `${Math.abs(startPosition - endPosition)}%`,
                    height: '100%',
                    backgroundColor: color.secondary,
                    opacity: editingMarkId === mark.id ? 0.5 : (selectedMarkId === mark.id ? 0.4 : 0.3),
                    pointerEvents: editingMarkId === mark.id ? 'auto' : 'none', // Only interactive when editing this specific mark
                    cursor: editingMarkId === mark.id ? 'pointer' : 'default',
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
                  cursor: editingMarkId === mark.id ? 'ew-resize' : 'pointer',
                  pointerEvents: editingMarkId === mark.id ? 'auto' : 'none',
                  zIndex: editingMarkId === mark.id ? 21 : (selectedMarkId === mark.id ? 11 : 2),
                  boxShadow: editingMarkId === mark.id ? `0 0 8px ${color.primary}` : `0 0 4px ${color.primary}`
                }}
                onMouseDown={(e) => handleBarMouseDown(e, mark.id, 'start')}
                title={`${mark.type === MarkType.CUSTOM && mark.customName ? mark.customName : color.nameHebrew}: ${formatTime(mark.time)} - ${formatTime(mark.endTime || mark.time)}`}
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
                    cursor: editingMarkId === mark.id ? 'ew-resize' : 'pointer',
                    pointerEvents: editingMarkId === mark.id ? 'auto' : 'none',
                    zIndex: editingMarkId === mark.id ? 21 : (selectedMarkId === mark.id ? 11 : 2),
                    boxShadow: editingMarkId === mark.id ? `0 0 8px ${color.primary}` : `0 0 4px ${color.primary}`
                  }}
                  onMouseDown={(e) => handleBarMouseDown(e, mark.id, 'end')}
                  title={`${mark.type === MarkType.CUSTOM && mark.customName ? mark.customName : color.nameHebrew}: ${formatTime(mark.time)} - ${formatTime(mark.endTime)}`}
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
          onMouseLeave={() => {
            // Close menu when mouse leaves (longer delay)
            setTimeout(() => setShowContextMenu(false), 500);
          }}
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
          
          {/* Existing Custom Marks Section */}
          {marks.some(mark => mark.type === MarkType.CUSTOM && mark.customName) && (
            <>
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                margin: '4px 0',
                padding: '4px 12px 0 12px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                סימונים קיימים:
              </div>
              {Array.from(new Set(marks.filter(mark => mark.type === MarkType.CUSTOM && mark.customName).map(mark => mark.customName))).map(customName => (
                <button
                  key={customName}
                  onClick={() => {
                    if (pendingMarkTime !== null) {
                      addMark(pendingMarkTime, MarkType.CUSTOM, undefined, customName);
                      setPendingMarkTime(null);
                      setShowContextMenu(false);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '11px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>⚪</span>
                  <span>{customName}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Custom Name Dialog */}
      {showCustomNameDialog && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            minWidth: '300px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <h3 style={{
            margin: '0 0 15px 0',
            color: 'white',
            fontSize: '16px',
            textAlign: 'right'
          }}>
            שם מותאם אישית
          </h3>
          
          <input
            type="text"
            value={customNameInput}
            onChange={(e) => setCustomNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomNameConfirm();
              } else if (e.key === 'Escape') {
                handleCustomNameCancel();
              }
            }}
            placeholder="הכנס שם לסימון..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: 'white',
              fontSize: '14px',
              marginBottom: '15px',
              textAlign: 'right'
            }}
          />
          
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleCustomNameCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ביטול
            </button>
            <button
              onClick={handleCustomNameConfirm}
              disabled={!customNameInput.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: customNameInput.trim() ? '#26d0ce' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '4px',
                color: customNameInput.trim() ? 'white' : 'rgba(255, 255, 255, 0.5)',
                cursor: customNameInput.trim() ? 'pointer' : 'not-allowed',
                fontSize: '12px'
              }}
            >
              אישור
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for custom name dialog */}
      {showCustomNameDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1999
          }}
          onClick={handleCustomNameCancel}
        />
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