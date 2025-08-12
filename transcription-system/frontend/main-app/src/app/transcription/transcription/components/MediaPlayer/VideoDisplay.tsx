'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VideoDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

type VideoState = 'default' | 'minimized' | 'closed';

export default function VideoDisplay({ videoRef }: VideoDisplayProps) {
  const [videoState, setVideoState] = useState<VideoState>('default');
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 320, height: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [savedPosition, setSavedPosition] = useState({ x: 20, y: 20 });
  const [savedSize, setSavedSize] = useState({ width: 320, height: 180 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('video-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      } else if (isResizing) {
        const newWidth = Math.max(200, e.clientX - position.x);
        const newHeight = Math.max(120, e.clientY - position.y);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, isResizing, dragStart, position]);

  // Handle close
  const handleClose = () => {
    setVideoState('closed');
  };

  // Handle minimize
  const handleMinimize = () => {
    if (videoState === 'minimized') {
      // Restore
      setVideoState('default');
      setPosition(savedPosition);
      setSize(savedSize);
    } else {
      // Minimize
      setSavedPosition(position);
      setSavedSize(size);
      setVideoState('minimized');
    }
  };

  // Handle restore to default
  const handleRestore = () => {
    setVideoState('default');
    setPosition({ x: 20, y: 20 });
    setSize({ width: 320, height: 180 });
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  if (videoState === 'closed') {
    return (
      <button
        onClick={() => setVideoState('default')}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          backgroundColor: '#26d0ce',
          color: '#1a2332',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        📹 הצג וידאו
      </button>
    );
  }

  if (videoState === 'minimized') {
    return (
      <button
        onClick={handleMinimize}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          backgroundColor: '#26d0ce',
          color: '#1a2332',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        📹 הצג וידאו
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        backgroundColor: '#1a2332',
        border: '2px solid #26d0ce',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Video Header */}
      <div 
        className="video-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 10px',
          backgroundColor: 'rgba(15, 76, 76, 0.8)',
          borderBottom: '1px solid #26d0ce'
        }}
      >
        <span style={{ color: '#26d0ce', fontSize: '12px' }}>וידאו</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={handleRestore}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#26d0ce',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px'
            }}
            title="שחזר לגודל ומיקום ברירת מחדל"
          >
            ⟲
          </button>
          <button
            onClick={handleMinimize}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#26d0ce',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px'
            }}
            title="מזער"
          >
            －
          </button>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#26d0ce',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px'
            }}
            title="סגור"
          >
            ×
          </button>
        </div>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: 'calc(100% - 30px)',
          objectFit: 'contain',
          backgroundColor: '#000'
        }}
        controls={false}
      />

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '15px',
          height: '15px',
          cursor: 'nwse-resize',
          backgroundColor: 'transparent'
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          style={{ position: 'absolute', right: 0, bottom: 0 }}
        >
          <path
            d="M 15 15 L 5 15 L 15 5 Z"
            fill="#26d0ce"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}