'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VideoCubeProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onRestore: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export default function VideoCube({ videoRef, isVisible, onMinimize, onClose, onRestore }: VideoCubeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 320, height: 280 });
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 });

  // Calculate default position aligned with media player
  const getDefaultPosition = (): Position => {
    // Check if we're on the client side
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      // Server-side fallback position
      return { x: 20, y: 20 };
    }

    const mediaPlayerContainer = document.getElementById('mediaPlayerContainer');
    if (mediaPlayerContainer) {
      const rect = mediaPlayerContainer.getBoundingClientRect();
      // Position video cube to the right of media player with some padding
      return {
        x: rect.right + 30, // Position to the right of media player + larger gap
        y: rect.top // Align exactly with media player top
      };
    }
    // Fallback position - right side of screen with larger cube size
    return { x: window.innerWidth - 350, y: 20 };
  };

  const getDefaultSize = (): Size => {
    // Larger size to accommodate taller media player with waveform
    return { width: 320, height: 280 };
  };

  const [position, setPosition] = useState<Position>({ x: 20, y: 20 }); // Safe initial position
  const [size, setSize] = useState<Size>(getDefaultSize());

  // Load saved position and size from localStorage (client-side only)
  useEffect(() => {
    // This runs only on the client side after mounting
    const savedPosition = localStorage.getItem('videoCubePosition');
    const savedSize = localStorage.getItem('videoCubeSize');
    
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.warn('Failed to load video cube position:', e);
        // Call getDefaultPosition only on client side
        setPosition(getDefaultPosition());
      }
    } else {
      // Call getDefaultPosition only on client side
      setPosition(getDefaultPosition());
    }
    
    if (savedSize) {
      try {
        const size = JSON.parse(savedSize);
        setSize(size);
      } catch (e) {
        console.warn('Failed to load video cube size:', e);
        setSize(getDefaultSize());
      }
    } else {
      setSize(getDefaultSize());
    }
  }, []);

  // Save position and size to localStorage
  const savePosition = (pos: Position) => {
    localStorage.setItem('videoCubePosition', JSON.stringify(pos));
  };

  const saveSize = (size: Size) => {
    localStorage.setItem('videoCubeSize', JSON.stringify(size));
  };

  // Restore to default position and size
  const handleRestore = () => {
    if (typeof document !== 'undefined') {
      const defaultPos = getDefaultPosition();
      const defaultSize = getDefaultSize();
      setPosition(defaultPos);
      setSize(defaultSize);
      savePosition(defaultPos);
      saveSize(defaultSize);
    }
    onRestore();
  };

  // Close cube and reset to defaults for next time
  const handleClose = () => {
    if (typeof document !== 'undefined') {
      const defaultPos = getDefaultPosition();
      const defaultSize = getDefaultSize();
      savePosition(defaultPos);
      saveSize(defaultSize);
    }
    onClose();
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('video-cube-header')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
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
    if (isVisible && videoRef.current && containerRef.current) {
      const cubeVideo = containerRef.current.querySelector('video') as HTMLVideoElement;
      if (cubeVideo && videoRef.current.src) {
        cubeVideo.src = videoRef.current.src;
        cubeVideo.currentTime = videoRef.current.currentTime;
        
        // Sync play/pause state
        if (!videoRef.current.paused) {
          cubeVideo.play().catch(console.warn);
        } else {
          cubeVideo.pause();
        }

        // Set up event listeners to keep videos in sync
        const syncVideos = () => {
          if (videoRef.current && cubeVideo) {
            cubeVideo.currentTime = videoRef.current.currentTime;
          }
        };

        const syncPlayState = () => {
          if (videoRef.current && cubeVideo) {
            if (!videoRef.current.paused && cubeVideo.paused) {
              cubeVideo.play().catch(console.warn);
            } else if (videoRef.current.paused && !cubeVideo.paused) {
              cubeVideo.pause();
            }
          }
        };

        // Listen to main video events
        videoRef.current.addEventListener('timeupdate', syncVideos);
        videoRef.current.addEventListener('play', syncPlayState);
        videoRef.current.addEventListener('pause', syncPlayState);
        videoRef.current.addEventListener('seeked', syncVideos);

        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('timeupdate', syncVideos);
            videoRef.current.removeEventListener('play', syncPlayState);
            videoRef.current.removeEventListener('pause', syncPlayState);
            videoRef.current.removeEventListener('seeked', syncVideos);
          }
        };
      }
    }
  }, [isVisible, videoRef]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`video-cube active`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="video-cube-header">
        <div className="video-cube-title">וידאו</div>
        <div className="video-cube-controls">
          <button 
            className="video-control-btn"
            onClick={handleRestore}
            title="שחזר למיקום ברירת מחדל"
          >
            ⌂
          </button>
          <button 
            className="video-control-btn"
            onClick={onMinimize}
            title="מזער (שמור מיקום ביקום)"
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