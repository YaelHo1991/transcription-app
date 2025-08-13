'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VideoCubeProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onRestore: () => void;
  waveformEnabled?: boolean; // Add prop to know if waveform is active
  isInLayout?: boolean; // Whether cube should be part of layout or floating
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export default function VideoCube({ videoRef, isVisible, onMinimize, onClose, onRestore, waveformEnabled = true, isInLayout = true }: VideoCubeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cubeVideoRef = useRef<HTMLVideoElement>(null); // Add ref for cube video
  const hasInitializedRef = useRef(false); // Track if we've initialized
  const [isDetached, setIsDetached] = useState(false); // Whether cube is detached from layout
  const [isDragMode, setIsDragMode] = useState(false); // Toggle drag mode with double-click
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 320, height: 240 });
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 });

  // Calculate default position in the vacant spot - STATIC position
  const getDefaultPosition = (): Position => {
    // Check if we're on the client side
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      // Server-side fallback position
      return { x: 20, y: 20 };
    }

    // Find the workspace grid to understand the layout
    const workspaceGrid = document.querySelector('.workspace-grid');
    const mainWorkspace = document.querySelector('.main-workspace');
    const sideWorkspace = document.querySelector('.side-workspace');
    
    if (workspaceGrid && mainWorkspace && sideWorkspace) {
      const gridRect = workspaceGrid.getBoundingClientRect();
      const mainRect = mainWorkspace.getBoundingClientRect();
      const sideRect = sideWorkspace.getBoundingClientRect();
      
      // The grid has a 15px gap between columns (from CSS)
      const gapSize = 15;
      const cubeWidth = 320;  // Moderate width
      const cubeHeight = 240; // Shorter height
      
      // Calculate position based on grid layout
      // The vacant spot is after main workspace and before side workspace
      let x, y;
      
      // Position based on user's perfect dragged position
      // These values were captured when user dragged to ideal spot
      x = mainRect.right - 50; // Far to the right (was -200)
      y = gridRect.top + 20; // Much higher up (was +50)
      
      // Position is now perfect based on user feedback
      // No need for visual indicators anymore
      
      return { x, y };
    }
    
    // Fallback - position in top-right corner
    return {
      x: window.innerWidth - 340,
      y: 100
    };
  };

  const getDefaultSize = (): Size => {
    // Better proportioned size for layout
    return { width: 240, height: 160 };
  };

  const [position, setPosition] = useState<Position>({ x: 20, y: 20 }); // Safe initial position
  const [size, setSize] = useState<Size>(getDefaultSize());

  // Initialize when first becoming visible
  useEffect(() => {
    // Skip if already initialized or not visible
    if (hasInitializedRef.current || !isVisible) {
      return;
    }
    
    const timer = setTimeout(() => {
      // Check if there's saved state from a previous minimize
      const wasDetached = localStorage.getItem('videoCubeWasDetached') === 'true';
      
      if (wasDetached) {
        // Restore saved state
        setIsDetached(true);
        const savedPos = localStorage.getItem('videoCubePosition');
        if (savedPos) {
          try {
            const pos = JSON.parse(savedPos);
            setPosition(pos);
          } catch (e) {
            const defaultPos = getDefaultPosition();
            setPosition(defaultPos);
          }
        }
        const savedSize = localStorage.getItem('videoCubeSize');
        if (savedSize) {
          try {
            const size = JSON.parse(savedSize);
            setSize(size);
          } catch (e) {
            setSize(getDefaultSize());
          }
        }
      } else {
        // Fresh start - keep in layout mode, don't set position
        setSize(getDefaultSize());
        // Don't set position for layout mode
      }
      
      hasInitializedRef.current = true;
    }, 100); // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timer);
  }, [isVisible]); // Run when becomes visible
  
  // Handle visibility changes for minimize/restore (not initial mount)
  const [previousVisible, setPreviousVisible] = useState(isVisible);
  useEffect(() => {
    // Only handle transitions from hidden to visible (restore from minimize)
    if (isVisible && !previousVisible && hasInitializedRef.current) {
      // Check if we're restoring from minimize
      const wasDetached = localStorage.getItem('videoCubeWasDetached') === 'true';
      if (wasDetached) {
        setIsDetached(true);
        // Load saved position
        const savedPos = localStorage.getItem('videoCubePosition');
        if (savedPos) {
          try {
            const pos = JSON.parse(savedPos);
            setPosition(pos);
          } catch (e) {
            // Keep current position
          }
        }
        // Load saved size
        const savedSize = localStorage.getItem('videoCubeSize');
        if (savedSize) {
          try {
            const size = JSON.parse(savedSize);
            setSize(size);
          } catch (e) {
            // Keep current size
          }
        }
      }
      // If not detached, keep in layout mode with current settings
    }
    
    setPreviousVisible(isVisible);
  }, [isVisible, previousVisible]);
  
  // Update size when detached state changes
  useEffect(() => {
    // Skip on initial mount
    if (isDetached) {
      // When detaching, keep current size or load saved
      const savedSize = localStorage.getItem('videoCubeSize');
      if (savedSize) {
        try {
          const size = JSON.parse(savedSize);
          setSize(size);
        } catch (e) {
          // Keep current size
        }
      }
    }
    // Don't reset size when returning to layout - it's already handled
  }, [isDetached]);
  
  // Don't reset position when cube becomes visible - keep saved position
  
  // Removed automatic position update on resize/scroll to keep cube stable

  // Size is now fixed, no need to update based on waveform

  // Save position and size to localStorage
  const savePosition = (pos: Position) => {
    localStorage.setItem('videoCubePosition', JSON.stringify(pos));
    
    // Calculate position relative to workspace grid for better default positioning
    const workspaceGrid = document.querySelector('.workspace-grid');
    const mainWorkspace = document.querySelector('.main-workspace');
    if (workspaceGrid && mainWorkspace) {
      const gridRect = workspaceGrid.getBoundingClientRect();
      const mainRect = mainWorkspace.getBoundingClientRect();
      
      const offsetFromGridTop = pos.y - gridRect.top;
      const offsetFromMainRight = pos.x - mainRect.right;
      
      console.warn('========================================');
      console.warn('VIDEO CUBE DRAGGED TO PERFECT POSITION:');
      console.warn(`Absolute: X=${pos.x}px, Y=${pos.y}px`);
      console.warn(`From grid top: ${offsetFromGridTop}px`);
      console.warn(`From main workspace right edge: ${offsetFromMainRight}px`);
      console.warn('');
      console.warn('TO SET AS DEFAULT, UPDATE getDefaultPosition():');
      console.warn(`x = mainRect.right + ${offsetFromMainRight}`);
      console.warn(`y = gridRect.top + ${offsetFromGridTop}`);
      console.warn('========================================');
    }
  };

  const saveSize = (size: Size) => {
    localStorage.setItem('videoCubeSize', JSON.stringify(size));
  };

  // Restore to layout position
  const handleRestore = () => {
    // Return to layout mode
    setIsDetached(false);
    setIsDragMode(false);
    
    // Reset size to default
    const defaultSize = getDefaultSize();
    setSize(defaultSize);
    saveSize(defaultSize);
    
    // Clear any saved positions
    localStorage.removeItem('videoCubePosition');
    localStorage.removeItem('videoCubePositionPercent');
    
    onRestore();
  };

  // Close cube and reset everything
  const handleClose = () => {
    // Reset everything to defaults
    setIsDetached(false);
    setIsDragMode(false);
    
    // Reset size to default
    const defaultSize = getDefaultSize();
    setSize(defaultSize);
    
    // Clear saved positions and sizes
    localStorage.removeItem('videoCubePosition');
    localStorage.removeItem('videoCubeSize');
    localStorage.removeItem('videoCubePositionPercent');
    localStorage.removeItem('videoCubeWasDetached');
    
    onClose();
  };

  // Toggle between attached/detached mode with double-click
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('video-cube-header')) {
      if (!isDetached) {
        // Detaching from layout - enable dragging
        // Set initial position when detaching - use current screen position
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          // Set the exact current position on screen
          const newPos = { x: rect.left, y: rect.top };
          setPosition(newPos);
          // Set both states together immediately
          setIsDetached(true);
          setIsDragMode(true);
        }
      } else {
        // Toggle drag mode when already detached
        setIsDragMode(!isDragMode);
      }
      e.preventDefault();
    }
  };
  
  // Start dragging when in drag mode
  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if clicking on header or container (not buttons)
    const target = e.target as HTMLElement;
    const isHeaderOrContainer = target === e.currentTarget || 
                                target.classList.contains('video-cube-header') ||
                                target.classList.contains('video-cube-title');
    
    // Only allow dragging if we're in drag mode and clicking the right areas
    if (isDragMode && isHeaderOrContainer && !target.classList.contains('video-control-btn')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    setInitialSize(size);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep within viewport bounds
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        const boundedPos = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        };
        
        setPosition(boundedPos);
      }
      
      if (isResizing) {
        const deltaX = e.clientX - initialMousePos.x;
        const deltaY = e.clientY - initialMousePos.y;
        
        const newWidth = Math.max(280, initialSize.width + deltaX);
        const newHeight = Math.max(220, initialSize.height + deltaY);
        
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        savePosition(position);
      }
      if (isResizing) {
        setIsResizing(false);
        saveSize(size);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, position, size, initialSize, initialMousePos]);

  // Sync video element with cube video
  useEffect(() => {
    if (isVisible && videoRef.current && cubeVideoRef.current) {
      // Small delay to ensure video is ready
      const timer = setTimeout(() => {
        // Always sync the video source
        if (videoRef.current?.src && cubeVideoRef.current) {
          if (cubeVideoRef.current.src !== videoRef.current.src) {
            cubeVideoRef.current.src = videoRef.current.src;
          }
          
          // Sync current time
          cubeVideoRef.current.currentTime = videoRef.current.currentTime;
          
          // Force load the video
          cubeVideoRef.current.load();
          
          // Sync play/pause state
          if (!videoRef.current.paused) {
            cubeVideoRef.current.play().catch(console.warn);
          } else {
            cubeVideoRef.current.pause();
          }
        }
      }, 100);

      // Set up event listeners to keep videos in sync
      const syncVideos = () => {
        if (videoRef.current && cubeVideoRef.current) {
          cubeVideoRef.current.currentTime = videoRef.current.currentTime;
        }
      };

      const syncPlayState = () => {
        if (videoRef.current && cubeVideoRef.current) {
          if (!videoRef.current.paused && cubeVideoRef.current.paused) {
            cubeVideoRef.current.play().catch(console.warn);
          } else if (videoRef.current.paused && !cubeVideoRef.current.paused) {
            cubeVideoRef.current.pause();
          }
        }
      };

        // Listen to main video events
      videoRef.current.addEventListener('timeupdate', syncVideos);
      videoRef.current.addEventListener('play', syncPlayState);
      videoRef.current.addEventListener('pause', syncPlayState);
      videoRef.current.addEventListener('seeked', syncVideos);

      return () => {
        clearTimeout(timer);
        if (videoRef.current) {
          videoRef.current.removeEventListener('timeupdate', syncVideos);
          videoRef.current.removeEventListener('play', syncPlayState);
          videoRef.current.removeEventListener('pause', syncPlayState);
          videoRef.current.removeEventListener('seeked', syncVideos);
        }
      };
    }
  }, [isVisible, videoRef]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`video-cube active ${isDetached ? 'detached' : 'in-layout'} ${isDragMode ? 'drag-mode' : ''}`}
      style={isDetached ? {
        // Detached mode - absolute positioning
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : (isDragMode ? 'grab' : 'default'),
        border: isDragMode ? '3px solid #40e0d0' : '2px solid #20c997',
        boxShadow: isDragMode ? '0 0 20px rgba(64, 224, 208, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 500
      } : {
        // Layout mode - relative positioning
        position: 'relative',
        width: size.width,
        height: size.height,
        cursor: 'default',
        border: '2px solid #20c997',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      title={isDetached ? (isDragMode ? "מצב גרירה פעיל - גרור או לחץ פעמיים לביטול" : "לחץ פעמיים להפעלת גרירה") : "לחץ פעמיים לניתוק מהפריסה"}
    >
      <div className="video-cube-header" 
           style={{ cursor: isDragMode ? 'grab' : 'default' }}
           onMouseDown={handleMouseDown}>
        <div className="video-cube-title" 
             style={{ cursor: isDragMode ? 'grab' : 'default', pointerEvents: isDragMode ? 'none' : 'auto' }}>
          וידאו {isDragMode && '(מצב גרירה)'}
        </div>
        <div className="video-cube-controls">
          <button 
            className="video-control-btn"
            onClick={handleRestore}
            title={isDetached ? "חזור לפריסה" : "אפס גודל"}
          >
            ⌂
          </button>
          <button 
            className="video-control-btn"
            onClick={() => {
              // Save current state before minimizing
              if (isDetached) {
                savePosition(position);
                saveSize(size);
                localStorage.setItem('videoCubeWasDetached', 'true');
              } else {
                localStorage.setItem('videoCubeWasDetached', 'false');
              }
              onMinimize();
            }}
            title="מזער (שמור מיקום וגודל)"
          >
            −
          </button>
          <button 
            className="video-control-btn"
            onClick={handleClose}
            title="סגור ואפס מיקום"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="video-cube-content">
        <video
          ref={cubeVideoRef}
          src={videoRef.current?.src || undefined}
          autoPlay
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
        
        <div 
          className="video-cube-resize-handle"
          onMouseDown={handleResizeStart}
          style={{ cursor: isResizing ? 'nwse-resize' : 'nwse-resize' }}
        />
      </div>
    </div>
  );
}