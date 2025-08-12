'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VideoCubeProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onMinimize: () => void;
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export default function VideoCube({ videoRef, isVisible, onMinimize, onClose }: VideoCubeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [size, setSize] = useState<Size>({ width: 250, height: 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 250, height: 250 });
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 });

  // Load saved position and size from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('videoCubePosition');
    const savedSize = localStorage.getItem('videoCubeSize');
    
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.warn('Failed to load video cube position:', e);
      }
    }
    
    if (savedSize) {
      try {
        const size = JSON.parse(savedSize);
        setSize(size);
      } catch (e) {
        console.warn('Failed to load video cube size:', e);
      }
    }
  }, []);

  // Save position and size to localStorage
  const savePosition = (pos: Position) => {
    localStorage.setItem('videoCubePosition', JSON.stringify(pos));
  };

  const saveSize = (size: Size) => {
    localStorage.setItem('videoCubeSize', JSON.stringify(size));
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
        
        const newWidth = Math.max(200, initialSize.width + deltaX);
        const newHeight = Math.max(150, initialSize.height + deltaY);
        
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
            onClick={onMinimize}
            title="מזער"
          >
            −
          </button>
          <button 
            className="video-control-btn"
            onClick={onClose}
            title="סגור"
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