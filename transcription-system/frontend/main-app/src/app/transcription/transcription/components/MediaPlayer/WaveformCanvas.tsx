'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WaveformData } from './types';
import MarksManager from './components/MarksManager';
import { MarkType, MARK_COLORS } from './types/marks';

interface WaveformCanvasProps {
  waveformData: WaveformData;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  showSettings?: boolean;
  mediaUrl?: string;
  marksEnabled?: boolean;
  onMarkNavigationAction?: (action: string) => void;
}

export default function WaveformCanvas({
  waveformData,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  showSettings = true,
  mediaUrl = '',
  marksEnabled = true,
  onMarkNavigationAction
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDrawnProgress = useRef<number>(-1);
  const marksManagerRef = useRef<any>(null);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [hoverToolbar, setHoverToolbar] = useState(false);
  const [showMarksMenu, setShowMarksMenu] = useState(false);
  const marksMenuTimeoutRef = useRef<number | null>(null);
  const [isMarkDragging, setIsMarkDragging] = useState(false);
  const toolbarHideTimeoutRef = useRef<number | null>(null);
  const [showMarkTypeSelector, setShowMarkTypeSelector] = useState(false);
  const [showCustomMarkDialog, setShowCustomMarkDialog] = useState(false);
  const [customMarkName, setCustomMarkName] = useState('');
  const [showMarkFilter, setShowMarkFilter] = useState(false);
  const [markFilter, setMarkFilter] = useState<MarkType | null>(null);
  const [navigationFilter, setNavigationFilter] = useState<MarkType | 'all'>('all');
  const [showNavigationFilter, setShowNavigationFilter] = useState(false);
  const lastAutoScrollTime = useRef(0);
  
  // Playback mode state
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'marked-only' | 'skip-marked' | 'loop-mark'>('normal');
  const [loopingMark, setLoopingMark] = useState<any>(null);
  const [showPlaybackOptions, setShowPlaybackOptions] = useState(false);
  
  // Zoom constraints
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 10;
  const ZOOM_STEP = 0.5;

  // Theme colors
  const colors = {
    playedWaveform: '#26d0ce',     // Bright turquoise for played portion
    unplayedWaveform: '#0f4c4c',   // Dark teal for unplayed portion
    playedGradientTop: '#40e0d0',  // Lighter turquoise for gradient
    unplayedGradientTop: '#1a5d5d', // Lighter dark teal for gradient
    playhead: '#ffffff',            // White playhead
    playheadGlow: 'rgba(38, 208, 206, 0.5)', // Turquoise glow
    background: 'transparent',
    hoverLine: 'rgba(255, 255, 255, 0.3)'
  };

  // Calculate visible range based on zoom and scroll
  const getVisibleRange = useCallback(() => {
    const visibleWidth = Math.min(1, 1 / zoomLevel);
    const start = Math.max(0, Math.min(1 - visibleWidth, scrollOffset));
    const end = Math.min(1, start + visibleWidth);
    
    // Ensure we have a valid range
    if (end <= start) {
      return { start: 0, end: visibleWidth, visibleWidth };
    }
    
    return { start, end, visibleWidth };
  }, [zoomLevel, scrollOffset]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !waveformData || !container) return;

    const { peaks } = waveformData;
    const progress = duration > 0 ? currentTime / duration : 0;
    
    // Only skip redraw if progress hasn't changed AND we've already drawn at least once
    if (lastDrawnProgress.current !== -1 && Math.abs(progress - lastDrawnProgress.current) < 0.001 && !isPlaying && zoomLevel === 1) {
      return;
    }
    
    lastDrawnProgress.current = progress;

    // Get actual display dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas (using scaled dimensions)
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, width * dpr, height * dpr);

    // Calculate visible range when zoomed
    const { start, end } = getVisibleRange();
    
    // Calculate indices with better precision for high zoom levels
    const totalPeaks = peaks.length;
    const startIndex = Math.max(0, Math.floor(start * totalPeaks));
    const endIndex = Math.min(totalPeaks, Math.ceil(end * totalPeaks));
    
    // Ensure we have at least some peaks to show
    const minPeaksToShow = 20;
    let visiblePeaks = peaks.slice(startIndex, endIndex);
    
    // If we have too few peaks at high zoom, interpolate
    if (visiblePeaks.length < minPeaksToShow && visiblePeaks.length > 0) {
      const interpolated = [];
      for (let i = 0; i < minPeaksToShow; i++) {
        const index = (i / minPeaksToShow) * visiblePeaks.length;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const fraction = index - lower;
        
        if (upper < visiblePeaks.length) {
          interpolated.push(visiblePeaks[lower] * (1 - fraction) + visiblePeaks[upper] * fraction);
        } else {
          interpolated.push(visiblePeaks[lower]);
        }
      }
      visiblePeaks = new Float32Array(interpolated);
    }
    
    // Ensure we have peaks to draw
    if (visiblePeaks.length === 0) {
      return;
    }
    
    // RTL: Progress position within visible range
    const relativeProgress = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    const progressX = width * (1 - relativeProgress);
    
    const barWidth = width / visiblePeaks.length;
    const centerY = height / 2;
    const maxHeight = height * 0.8; // Leave some padding

    // Draw waveform bars - peaks should be in chronological order (not reversed)
    visiblePeaks.forEach((peak, i) => {
      // Draw bars from left to right (chronological order)
      // The peaks themselves are NOT reversed, only the progress direction is RTL
      const x = i * barWidth;
      const peakHeight = Math.max(2, peak * maxHeight); // Ensure minimum height
      const halfHeight = peakHeight / 2;

      // RTL: Determine if this bar is played
      // In RTL, progress bar fills from right to left
      // But the waveform peaks remain in chronological order (left to right)
      const barRelativePosition = i / visiblePeaks.length;
      const isPlayed = barRelativePosition >= (1 - relativeProgress);

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, centerY - halfHeight, 0, centerY + halfHeight);
      if (isPlayed) {
        gradient.addColorStop(0, colors.playedGradientTop);
        gradient.addColorStop(0.5, colors.playedWaveform);
        gradient.addColorStop(1, colors.playedGradientTop);
      } else {
        gradient.addColorStop(0, colors.unplayedGradientTop);
        gradient.addColorStop(0.5, colors.unplayedWaveform);
        gradient.addColorStop(1, colors.unplayedGradientTop);
      }

      ctx.fillStyle = gradient;
      
      // Draw mirrored waveform (top and bottom) with minimum width
      const barRenderWidth = Math.max(1, barWidth - 1);
      ctx.fillRect(x, centerY - halfHeight, barRenderWidth, halfHeight);
      ctx.fillRect(x, centerY, barRenderWidth, halfHeight);
    });

    // Draw playhead with glow effect
    if (relativeProgress > 0 && relativeProgress < 1) {
      // Only draw if playhead is in visible area
      if (progress >= start && progress <= end) {
        // Glow effect
        ctx.shadowColor = colors.playheadGlow;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = colors.playhead;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, height);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
  }, [waveformData, currentTime, duration, isPlaying, colors, zoomLevel, scrollOffset, getVisibleRange]);

  // Handle canvas resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    
    // Skip if dimensions are invalid
    if (rect.width <= 0 || rect.height <= 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Set actual size in memory (scaled for retina displays)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match device pixel ratio
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    // Force redraw after resize
    lastDrawnProgress.current = -1;
    drawWaveform();
  }, [drawWaveform]);

  // Auto-hide toolbar functionality
  const startToolbarHideTimer = useCallback(() => {
    // Clear existing timer
    if (toolbarHideTimeoutRef.current) {
      clearTimeout(toolbarHideTimeoutRef.current);
    }
    
    // Start new timer (5 seconds of inactivity)
    toolbarHideTimeoutRef.current = window.setTimeout(() => {
      setShowToolbar(false);
      setShowMarksMenu(false);
      toolbarHideTimeoutRef.current = null;
    }, 5000);
  }, []);

  const cancelToolbarHideTimer = useCallback(() => {
    if (toolbarHideTimeoutRef.current) {
      clearTimeout(toolbarHideTimeoutRef.current);
      toolbarHideTimeoutRef.current = null;
    }
  }, []);

  // Create mark at current position
  const createMarkAtCurrentTime = useCallback((markType: MarkType) => {
    if (marksManagerRef.current?.addMark) {
      marksManagerRef.current.addMark(currentTime, markType);
    }
    setShowMarkTypeSelector(false);
  }, [currentTime]);

  // Create custom mark
  const createCustomMark = useCallback(() => {
    if (customMarkName.trim() && marksManagerRef.current?.addMark) {
      marksManagerRef.current.addMark(currentTime, MarkType.CUSTOM, undefined, customMarkName.trim());
    }
    setShowCustomMarkDialog(false);
    setCustomMarkName('');
  }, [currentTime, customMarkName]);

  // Export marks to JSON file
  const exportMarks = useCallback(() => {
    if (marksManagerRef.current?.getMarks) {
      const marks = marksManagerRef.current.getMarks();
      const dataStr = JSON.stringify(marks, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'marks_' + new Date().toISOString().slice(0,10) + '.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
    setShowMarksMenu(false);
  }, []);

  // Import marks from JSON file
  const importMarks = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedMarks = JSON.parse(e.target?.result as string);
            if (Array.isArray(importedMarks) && marksManagerRef.current) {
              // Validate marks structure
              const validMarks = importedMarks.filter(mark => 
                mark.id && mark.time !== undefined && mark.type
              );
              if (validMarks.length > 0) {
                // Replace current marks with imported ones
                const storageKey = 'mediaplayer_marks_' + Math.abs(mediaUrl.split('').reduce((a,b)=>(a<<5)-a+b.charCodeAt(0)|0,0));
                localStorage.setItem(storageKey, JSON.stringify(validMarks));
                // Reload the component to show imported marks
                window.location.reload();
              } else {
                alert('קובץ לא תקין - לא נמצאו סימונים חוקיים');
              }
            }
          } catch (error) {
            alert('שגיאה בקריאת הקובץ - וודא שמדובר בקובץ JSON תקין');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setShowMarksMenu(false);
  }, [mediaUrl]);

  // Handle zoom in/out
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(MIN_ZOOM, prev - ZOOM_STEP);
      if (newZoom === MIN_ZOOM) {
        setScrollOffset(0); // Reset scroll when fully zoomed out
      }
      return newZoom;
    });
  }, []);
  
  // Handle mouse wheel zoom (Ctrl + scroll)
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (event.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
    
    return false;
  }, [handleZoomIn, handleZoomOut]);
  
  // Handle drag to pan when zoomed
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only allow panning when zoomed and not in mark editing mode
    if (zoomLevel === 1 || isMarkDragging) return;
    
    // Check if clicking on canvas (not on other elements)
    if (event.target === canvasRef.current) {
      setIsDragging(true);
      setDragStartX(event.clientX);
      setDragStartOffset(scrollOffset);
      event.preventDefault();
    }
  }, [zoomLevel, scrollOffset, isMarkDragging]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const deltaX = event.clientX - dragStartX;
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 1;
    const scrollDelta = (deltaX / containerWidth) / zoomLevel;
    
    // Normal scroll direction (not inverted for RTL since waveform itself handles RTL)
    const newOffset = Math.max(0, Math.min(1 - (1 / zoomLevel), dragStartOffset + scrollDelta));
    setScrollOffset(newOffset);
  }, [isDragging, dragStartX, dragStartOffset, zoomLevel]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle click to seek (RTL aware) or Ctrl+Click to edit marks
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || isMarkDragging) return; // Don't handle if dragging
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Calculate click position based on zoom and scroll
    const { start, end } = getVisibleRange();
    const visibleProgress = 1 - (x / rect.width);
    const globalProgress = start + (visibleProgress * (end - start));
    const clickTime = globalProgress * duration;
    
    // Check if Ctrl key is held
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click: Try to enter edit mode for mark at this position
      if (marksManagerRef.current?.handleCtrlClickFromParent) {
        marksManagerRef.current.handleCtrlClickFromParent(clickTime);
      }
    } else {
      // Normal click: Seek to position
      const seekTime = Math.max(0, Math.min(duration, clickTime));
      onSeek(seekTime);
    }
  }, [duration, onSeek, isDragging, isMarkDragging, getVisibleRange]);


  // Handle hover to show time tooltip
  const handleCanvasHover = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Calculate hover time based on zoom and scroll
    const { start, end } = getVisibleRange();
    const visibleProgress = 1 - (x / rect.width);
    const globalProgress = start + (visibleProgress * (end - start));
    const hoverTime = globalProgress * duration;
    
    // Format time for tooltip
    const minutes = Math.floor(hoverTime / 60);
    const seconds = Math.floor(hoverTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update cursor
    canvas.style.cursor = isDragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'pointer');
    canvas.title = timeStr;
  }, [duration, isDragging, zoomLevel, getVisibleRange]);
  
  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (zoomLevel === 1 || isDragging) return; // No scrolling needed when not zoomed or when dragging
    
    const progress = currentTime / duration;
    const { start, end, visibleWidth } = getVisibleRange();
    
    // Check if playhead is outside visible area
    if (progress < start || progress > end) {
      // Center the playhead in the view
      const targetOffset = progress - (visibleWidth / 2);
      const clampedTarget = Math.max(0, Math.min(1 - visibleWidth, targetOffset));
      setScrollOffset(clampedTarget);
    } else if (isPlaying) {
      // Only auto-scroll during playback if getting close to edge
      const edgeThreshold = visibleWidth * 0.2; // 20% from edge
      
      if (progress > end - edgeThreshold) {
        // Smoothly scroll to keep playhead visible
        const targetOffset = progress - (visibleWidth * 0.7); // Keep playhead at 70% position
        const clampedTarget = Math.max(0, Math.min(1 - visibleWidth, targetOffset));
        setScrollOffset(clampedTarget);
      }
    }
  }, [currentTime, duration, isPlaying, zoomLevel, getVisibleRange, scrollOffset, isDragging]);

  // Animation loop for smooth updates
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Force redraw when paused
      lastDrawnProgress.current = -1;
      drawWaveform();
      return;
    }

    const animate = () => {
      drawWaveform();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  // Initial setup and resize handler
  useEffect(() => {
    resizeCanvas();
    
    // Force resize after a short delay to ensure container is ready
    const initTimer = setTimeout(() => {
      resizeCanvas();
    }, 50);
    
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    
    // Add wheel event listener to canvas
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    // Global mouse events for drag
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (toolbarHideTimeoutRef.current) {
        clearTimeout(toolbarHideTimeoutRef.current);
      }
    };
  }, [resizeCanvas, handleWheel, isDragging, handleMouseMove, handleMouseUp]);

  // Redraw when waveform data or zoom changes
  useEffect(() => {
    // Reset the last drawn progress to force redraw
    lastDrawnProgress.current = -1;
    drawWaveform();
    
    // Force another draw after a short delay to ensure canvas is ready
    const timer = setTimeout(() => {
      lastDrawnProgress.current = -1;
      drawWaveform();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [waveformData, zoomLevel, scrollOffset, drawWaveform]);

  // Click outside handler for type selector
  const handleClickOutsideTypeSelector = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Check if click is outside the type selector and its button
    if (!target.closest('[data-type-selector]') && !target.closest('[data-type-selector-button]')) {
      setShowMarkTypeSelector(false);
    }
  }, []);

  // Add click outside listener for type selector
  useEffect(() => {
    if (showMarkTypeSelector) {
      document.addEventListener('click', handleClickOutsideTypeSelector);
      return () => {
        document.removeEventListener('click', handleClickOutsideTypeSelector);
      };
    }
  }, [showMarkTypeSelector, handleClickOutsideTypeSelector]);

  // Handle playback modes
  useEffect(() => {
    if (!isPlaying || playbackMode === 'normal') return;
    
    // Get marks from the manager
    const marks = marksManagerRef.current?.getMarks ? marksManagerRef.current.getMarks() : [];
    const filteredMarks = markFilter 
      ? marks.filter((m: any) => m.type === markFilter)
      : marks;
    
    // Check if current time is within a mark
    const currentMark = filteredMarks.find((mark: any) => {
      if (mark.isRange && mark.endTime) {
        return currentTime >= mark.time && currentTime <= mark.endTime;
      }
      return false;
    });
    
    switch (playbackMode) {
      case 'marked-only':
        // Play only marked sections
        if (!currentMark) {
          // Find next mark
          const nextMark = filteredMarks.find((m: any) => m.time > currentTime);
          if (nextMark) {
            onSeek(nextMark.time);
          }
        }
        break;
        
      case 'skip-marked':
        // Skip marked sections
        if (currentMark && currentMark.endTime) {
          onSeek(currentMark.endTime + 0.1);
        }
        break;
        
      case 'loop-mark':
        // Loop within current mark
        if (loopingMark && loopingMark.endTime) {
          if (currentTime >= loopingMark.endTime) {
            onSeek(loopingMark.time);
          } else if (currentTime < loopingMark.time) {
            onSeek(loopingMark.time);
          }
        }
        break;
    }
  }, [currentTime, isPlaying, playbackMode, loopingMark, markFilter, onSeek]);

  // Handle mark navigation actions from keyboard shortcuts
  useEffect(() => {
    if (!onMarkNavigationAction) return;
    
    const handleAction = (action: string) => {
      switch (action) {
        case 'previousMark':
          if (marksManagerRef.current) {
            marksManagerRef.current.navigateToPreviousMark();
          }
          break;
          
        case 'nextMark':
          if (marksManagerRef.current) {
            marksManagerRef.current.navigateToNextMark();
          }
          break;
          
        case 'cyclePlaybackMode':
          const modes: Array<'normal' | 'marked-only' | 'skip-marked' | 'loop-mark'> = 
            ['normal', 'marked-only', 'skip-marked', 'loop-mark'];
          const currentIndex = modes.indexOf(playbackMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          setPlaybackMode(modes[nextIndex]);
          
          // Show status message
          const modeNames = {
            'normal': 'רגיל',
            'marked-only': 'סימונים בלבד',
            'skip-marked': 'דלג על סימונים',
            'loop-mark': 'לולאה בסימון'
          };
          console.log('מצב הפעלה: ' + modeNames[modes[nextIndex]]);
          break;
          
        case 'loopCurrentMark':
          if (marksManagerRef.current?.getMarks) {
            const marks = marksManagerRef.current.getMarks();
            const currentMark = marks.find((mark: any) => {
              if (mark.isRange && mark.endTime) {
                return currentTime >= mark.time && currentTime <= mark.endTime;
              }
              return false;
            });
            
            if (currentMark) {
              setLoopingMark(currentMark);
              setPlaybackMode('loop-mark');
              onSeek(currentMark.time);
            }
          }
          break;
          
        case 'cycleMarkFilter':
          const filters: Array<MarkType | null> = [null, MarkType.SKIP, MarkType.UNCLEAR, MarkType.REVIEW, MarkType.BOUNDARY, MarkType.CUSTOM];
          const currentFilterIndex = filters.indexOf(markFilter);
          const nextFilterIndex = (currentFilterIndex + 1) % filters.length;
          setMarkFilter(filters[nextFilterIndex]);
          break;
      }
    };
    
    // Store the handler reference for cleanup
    (window as any).__markNavigationHandler = handleAction;
  }, [currentTime, playbackMode, markFilter, onSeek, onMarkNavigationAction]);

  return (
    <div 
      ref={containerRef}
      className="waveform-container"
      style={{
        width: '100%',
        height: '60px',
        position: 'relative',
        backgroundColor: 'rgba(15, 76, 76, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        // Forward right-click to MarksManager if it exists
        if (marksManagerRef.current?.handleContextMenu) {
          marksManagerRef.current.handleContextMenu(e);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          const wheelEvent = e.nativeEvent as WheelEvent;
          handleWheel(wheelEvent);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleCanvasHover}
          style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'pointer')
        }}
      />
      
      {/* Marks Layer - Overlay on waveform */}
      {marksEnabled && mediaUrl && (
        <MarksManager
          ref={marksManagerRef}
          mediaUrl={mediaUrl}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          enabled={marksEnabled}
          zoomLevel={zoomLevel}
          scrollOffset={scrollOffset}
          onDragStateChange={setIsMarkDragging}
          markFilter={markFilter}
          navigationFilter={navigationFilter}
        />
      )}
      
      {/* Compact Toolbar - Only show if showSettings is true */}
      {showSettings && (
        <div
          style={{
            position: 'absolute',
            top: '5px',
            right: '10px',
            zIndex: 20
          }}
          onMouseEnter={() => setHoverToolbar(true)}
          onMouseLeave={() => setHoverToolbar(false)}
        >
          {/* Toolbar Toggle Button - Very Transparent */}
          <button
            onClick={() => {
              const newShowState = !showToolbar;
              setShowToolbar(newShowState);
              if (newShowState) {
                startToolbarHideTimer();
              } else {
                cancelToolbarHideTimer();
              }
            }}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showToolbar || hoverToolbar ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: hoverToolbar || showToolbar ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
              transition: 'all 0.2s',
              opacity: hoverToolbar || showToolbar ? 1 : 0.3
            }}
            title="כלים"
          >
            ⚙
          </button>
        
        {/* Expandable Toolbar - Inline and Transparent */}
        {showToolbar && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              right: '35px',
              backgroundColor: 'rgba(30, 30, 30, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '6px',
              padding: '4px 6px',
              display: 'flex',
              flexDirection: 'row',
              gap: '6px',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={cancelToolbarHideTimer}
            onMouseLeave={startToolbarHideTimer}
          >
            {/* Zoom Controls - Compact Horizontal Layout */}
            <div style={{ 
              display: 'flex', 
              gap: '3px', 
              alignItems: 'center'
            }}>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: zoomLevel <= MIN_ZOOM ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  color: zoomLevel <= MIN_ZOOM ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                  cursor: zoomLevel <= MIN_ZOOM ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="הקטן"
              >
                −
              </button>
              <div
                style={{
                  padding: '0 4px',
                  height: '18px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '10px',
                  minWidth: '28px',
                  justifyContent: 'center'
                }}
              >
                {zoomLevel.toFixed(1)}x
              </div>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: zoomLevel >= MAX_ZOOM ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  color: zoomLevel >= MAX_ZOOM ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                  cursor: zoomLevel >= MAX_ZOOM ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="הגדל"
              >
                +
              </button>
              {/* Reset Zoom - Always visible */}
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setScrollOffset(0);
                }}
                disabled={zoomLevel === 1}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  border: 'none',
                  backgroundColor: zoomLevel === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  color: zoomLevel === 1 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                  cursor: zoomLevel === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (zoomLevel > 1) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  if (zoomLevel > 1) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
                title="איפוס זום"
              >
                ↺
              </button>
            </div>
            
            {/* Marks Menu Button - Always visible */}
            <div style={{
              width: '1px',
              height: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }} />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Clear any pending timeout
                if (marksMenuTimeoutRef.current) {
                  clearTimeout(marksMenuTimeoutRef.current);
                  marksMenuTimeoutRef.current = null;
                }
                
                setShowMarksMenu(!showMarksMenu);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: showMarksMenu ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                pointerEvents: 'auto'
              }}
              title="תפריט סימונים"
            >
              📍
            </button>

            {/* Add Mark Button */}
            <button
              data-type-selector-button
              onClick={(e) => {
                e.stopPropagation();
                setShowMarkTypeSelector(!showMarkTypeSelector);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: showMarkTypeSelector ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="הוסף סימון בזמן נוכחי"
            >
              📌
            </button>

            {/* Custom Mark Creator Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomMarkDialog(true);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="יצירת סימון מותאם אישית"
            >
              ➕
            </button>

            {/* Filter Marks Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMarkFilter(!showMarkFilter);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: showMarkFilter ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="סנן סימונים לפי סוג"
            >
              🔍
            </button>

            {/* Navigation Filter Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNavigationFilter(!showNavigationFilter);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: showNavigationFilter || navigationFilter !== 'all' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="בחר סוג סימון לניווט"
            >
              🎯
            </button>

            {/* Playback Mode Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaybackOptions(!showPlaybackOptions);
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: playbackMode !== 'normal' || showPlaybackOptions ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="אפשרויות הפעלה"
            >
              {playbackMode === 'loop-mark' ? '🔄' : playbackMode === 'marked-only' ? '▶️' : playbackMode === 'skip-marked' ? '⏭️' : '▶'}
            </button>

            {/* Export Marks Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (marksManagerRef.current?.getMarks) {
                  const marks = marksManagerRef.current.getMarks();
                  const dataStr = JSON.stringify(marks, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  
                  const exportFileDefaultName = 'marks_' + new Date().toISOString().slice(0,10) + '.json';
                  
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'rgba(0, 150, 0, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="יצא סימונים לקובץ JSON"
            >
              📤
            </button>

            {/* Import Marks Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const importedMarks = JSON.parse(e.target?.result as string);
                        if (Array.isArray(importedMarks) && marksManagerRef.current) {
                          // Validate marks structure
                          const validMarks = importedMarks.filter(mark => 
                            mark.id && mark.time !== undefined && mark.type
                          );
                          if (validMarks.length > 0) {
                            // Replace current marks with imported ones
                            const storageKey = 'mediaplayer_marks_' + Math.abs(mediaUrl.split('').reduce((a,b)=>(a<<5)-a+b.charCodeAt(0)|0,0));
                            localStorage.setItem(storageKey, JSON.stringify(validMarks));
                            // Reload the component to show imported marks
                            window.location.reload();
                          } else {
                            alert('קובץ לא תקין - לא נמצאו סימונים חוקיים');
                          }
                        }
                      } catch (error) {
                        alert('שגיאה בקריאת הקובץ - וודא שמדובר בקובץ JSON תקין');
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'rgba(0, 100, 200, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="יבא סימונים מקובץ JSON"
            >
              📥
            </button>

            {/* Clear All Marks Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (marksManagerRef.current?.clearAllMarks) {
                  marksManagerRef.current.clearAllMarks();
                }
              }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'rgba(200, 0, 0, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="מחק את כל הסימונים"
            >
              🗑️
            </button>

            {/* Mark Navigation Controls - Only when marks enabled */}
            {marksEnabled && (
              <>
                {/* Previous Mark Button - RTL: shows ► for previous */}
                <button
                  onClick={() => {
                    if (marksManagerRef.current?.navigateToPreviousMark) {
                      marksManagerRef.current.navigateToPreviousMark();
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title="סימון קודם"
                >
                  ►
                </button>
                
                {/* Next Mark Button - RTL: shows ◄ for next */}
                <button
                  onClick={() => {
                    if (marksManagerRef.current?.navigateToNextMark) {
                      marksManagerRef.current.navigateToNextMark();
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title="סימון הבא"
                >
                  ◄
                </button>
                
              </>
            )}
          </div>
        )}

            {/* Navigation Filter Dropdown */}
            {showNavigationFilter && (
              <div
                style={{
                  position: 'fixed',
                  top: '240px',
                  right: '20px',
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  borderRadius: '6px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  minWidth: '180px',
                  zIndex: 2001,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseLeave={() => {
                  setTimeout(() => setShowNavigationFilter(false), 300);
                }}
              >
                <div style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '4px'
                }}>
                  בחר סוג סימון לניווט
                </div>
                
                {/* Navigate All Marks Option */}
                <button
                  onClick={() => {
                    setNavigationFilter('all');
                    setShowNavigationFilter(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: navigationFilter === 'all' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (navigationFilter !== 'all') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (navigationFilter !== 'all') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>🎯</span>
                  <span>כל הסימונים</span>
                </button>

                {/* Individual Navigation Filter Options */}
                {Object.entries(MARK_COLORS).map(([type, color]) => {
                  // Check if marks of this type exist
                  const hasMarksOfType = marksManagerRef.current?.getMarks ? 
                    marksManagerRef.current.getMarks().some((mark: any) => mark.type === type) : false;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (hasMarksOfType) {
                          setNavigationFilter(type as MarkType);
                          setShowNavigationFilter(false);
                        }
                      }}
                      disabled={!hasMarksOfType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '6px 12px',
                        backgroundColor: navigationFilter === type ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                        border: 'none',
                        color: hasMarksOfType ? 'white' : 'rgba(255, 255, 255, 0.4)',
                        cursor: hasMarksOfType ? 'pointer' : 'not-allowed',
                        borderRadius: '4px',
                        fontSize: '12px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (hasMarksOfType && navigationFilter !== type) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (hasMarksOfType && navigationFilter !== type) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ opacity: hasMarksOfType ? 1 : 0.4 }}>{color.icon}</span>
                      <span>{color.nameHebrew} {!hasMarksOfType && '(לא קיים)'}</span>
                    </button>
                  );
                })}

                {/* Custom Marks Section */}
                {marksManagerRef.current?.getMarks && 
                 marksManagerRef.current.getMarks().some((mark: any) => mark.type === MarkType.CUSTOM) && (
                  <>
                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                      margin: '4px 0',
                      padding: '4px 8px 0 8px',
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      סימונים מותאמים:
                    </div>
                    {Array.from(new Set(
                      marksManagerRef.current.getMarks()
                        .filter((mark: any) => mark.type === MarkType.CUSTOM && mark.customName)
                        .map((mark: any) => mark.customName)
                    ) as Set<string>).map((customName: string) => (
                      <button
                        key={customName}
                        onClick={() => {
                          setNavigationFilter(MarkType.CUSTOM);
                          setShowNavigationFilter(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '6px 12px',
                          backgroundColor: navigationFilter === MarkType.CUSTOM ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.9)',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '11px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (navigationFilter !== MarkType.CUSTOM) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (navigationFilter !== MarkType.CUSTOM) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
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

            {/* Mark Filter Dropdown */}
            {showMarkFilter && (
              <div
                style={{
                  position: 'fixed',
                  top: '200px',
                  right: '20px',
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  borderRadius: '6px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  minWidth: '180px',
                  zIndex: 2001,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseLeave={() => {
                  setTimeout(() => setShowMarkFilter(false), 300);
                }}
              >
                <div style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '4px'
                }}>
                  סנן סימונים לפי סוג
                </div>
                
                {/* Show All Option */}
                <button
                  onClick={() => {
                    setMarkFilter(null);
                    setShowMarkFilter(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: markFilter === null ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (markFilter !== null) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (markFilter !== null) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>👁️</span>
                  <span>הצג הכל</span>
                </button>

                {/* Individual Filter Options */}
                {Object.entries(MARK_COLORS).map(([type, color]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setMarkFilter(type as MarkType);
                      setShowMarkFilter(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '6px 12px',
                      backgroundColor: markFilter === type ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '12px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (markFilter !== type) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (markFilter !== type) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{color.icon}</span>
                    <span>{color.nameHebrew}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Mark Type Selector Dropdown */}
            {showMarkTypeSelector && (
              <div
                data-type-selector
                style={{
                  position: 'fixed',
                  top: '160px',
                  right: '20px',
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  borderRadius: '6px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  minWidth: '180px',
                  zIndex: 2001,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseLeave={() => {
                  // Don't auto-close, only close on selection or outside click
                }}
              >
                <div style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '4px'
                }}>
                  הוסף סימון ב-{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                </div>
                {Object.entries(MARK_COLORS).map(([type, color]) => (
                  <button
                    key={type}
                    onClick={() => createMarkAtCurrentTime(type as MarkType)}
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

            {/* Playback Options Dropdown */}
            {showPlaybackOptions && (
              <div
                style={{
                  position: 'fixed',
                  top: '240px',
                  right: '20px',
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  borderRadius: '6px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  minWidth: '200px',
                  zIndex: 2001,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseLeave={() => {
                  setTimeout(() => setShowPlaybackOptions(false), 300);
                }}
              >
                <div style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '4px'
                }}>
                  אפשרויות הפעלה
                </div>
                
                {/* Playback Mode Options */}
                {[
                  { mode: 'normal' as const, icon: '▶', label: 'הפעלה רגילה', desc: 'הפעל את כל התוכן' },
                  { mode: 'marked-only' as const, icon: '▶️', label: 'סימונים בלבד', desc: 'הפעל רק קטעים מסומנים' },
                  { mode: 'skip-marked' as const, icon: '⏭️', label: 'דלג על סימונים', desc: 'דלג על קטעים מסומנים' },
                  { mode: 'loop-mark' as const, icon: '🔄', label: 'לולאה בסימון', desc: 'חזור על הסימון הנוכחי' }
                ].map(({ mode, icon, label, desc }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setPlaybackMode(mode);
                      if (mode !== 'loop-mark') {
                        setLoopingMark(null);
                      }
                      setShowPlaybackOptions(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: playbackMode === mode ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      textAlign: 'right'
                    }}
                    onMouseEnter={(e) => {
                      if (playbackMode !== mode) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (playbackMode !== mode) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span>{icon}</span>
                      <span>{label}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginRight: '24px' }}>
                      {desc}
                    </div>
                  </button>
                ))}
                
                {/* Keyboard Shortcuts Info */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  marginTop: '8px',
                  paddingTop: '8px',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'right'
                }}>
                  <div style={{ marginBottom: '4px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    💡 קיצורי מקלדת (ניתן לשינוי בהגדרות):
                  </div>
                  <div style={{ marginRight: '12px' }}>
                    <div>Ctrl+P - החלף מצב הפעלה</div>
                    <div>L - לולאה בסימון נוכחי</div>
                    <div>F - החלף סינון סימונים</div>
                    <div>Alt+← / Alt+→ - ניווט בין סימונים</div>
                  </div>
                </div>
              </div>
            )}

            {/* Marks Dropdown Menu - Always available */}
            {showMarksMenu && (
              <div
                style={{
                  position: 'fixed',
                  top: '100px',
                  right: '20px',
                  backgroundColor: 'rgba(30, 30, 30, 0.98)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
                  minWidth: '250px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 3000,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(15px)'
                }}
                onMouseLeave={() => {
                  // Clear any existing timeout
                  if (marksMenuTimeoutRef.current) {
                    clearTimeout(marksMenuTimeoutRef.current);
                  }
                  
                  // Delay closing to prevent accidental closes
                  marksMenuTimeoutRef.current = window.setTimeout(() => {
                    setShowMarksMenu(false);
                    marksMenuTimeoutRef.current = null;
                  }, 500);
                }}
                onMouseEnter={() => {
                  // Clear timeout if mouse re-enters
                  if (marksMenuTimeoutRef.current) {
                    clearTimeout(marksMenuTimeoutRef.current);
                    marksMenuTimeoutRef.current = null;
                  }
                }}
              >
                {/* Instructions */}
                <div style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '6px',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.4'
                }}>
                  <div>📌 קליק ימני - הוספת סימון</div>
                  <div>👆 קליק - ניווט לזמן</div>
                  <div>⌃👆 Ctrl+קליק - עריכת סימון</div>
                  <div>❌ Shift+קליק - מחיקת סימון</div>
                  <div>✋ גרור פסים - התאמת טווח (במצב עריכה)</div>
                </div>
                
              </div>
            )}

            {/* Custom Mark Dialog */}
            {showCustomMarkDialog && (
              <>
                {/* Backdrop */}
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 2999
                  }}
                  onClick={() => {
                    setShowCustomMarkDialog(false);
                    setCustomMarkName('');
                  }}
                />
                
                {/* Dialog */}
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
                    zIndex: 3000,
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
                    סימון מותאם אישית ב-{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                  </h3>
                  
                  <input
                    type="text"
                    value={customMarkName}
                    onChange={(e) => setCustomMarkName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        createCustomMark();
                      } else if (e.key === 'Escape') {
                        setShowCustomMarkDialog(false);
                        setCustomMarkName('');
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
                      onClick={() => {
                        setShowCustomMarkDialog(false);
                        setCustomMarkName('');
                      }}
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
                      onClick={createCustomMark}
                      disabled={!customMarkName.trim()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: customMarkName.trim() ? '#26d0ce' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: customMarkName.trim() ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        cursor: customMarkName.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      יצור
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </div>
  );
}