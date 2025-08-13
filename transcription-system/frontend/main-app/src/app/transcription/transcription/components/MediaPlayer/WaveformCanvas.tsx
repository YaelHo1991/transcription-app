'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WaveformData } from './types';

interface WaveformCanvasProps {
  waveformData: WaveformData;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  showSettings?: boolean;
}

export default function WaveformCanvas({
  waveformData,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  showSettings = true
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDrawnProgress = useRef<number>(-1);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [hoverToolbar, setHoverToolbar] = useState(false);
  const lastAutoScrollTime = useRef(0);
  
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
      visiblePeaks = interpolated;
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
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
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
    if (!event.ctrlKey) return;
    
    event.preventDefault();
    
    if (event.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);
  
  // Handle drag to pan when zoomed
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel === 1) return;
    
    setIsDragging(true);
    setDragStartX(event.clientX);
    setDragStartOffset(scrollOffset);
    event.preventDefault();
  }, [zoomLevel, scrollOffset]);
  
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
  
  // Handle click to seek (RTL aware)
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Calculate seek position based on zoom and scroll
    const { start, end } = getVisibleRange();
    const visibleProgress = 1 - (x / rect.width);
    const globalProgress = start + (visibleProgress * (end - start));
    const seekTime = globalProgress * duration;
    
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  }, [duration, onSeek, isDragging, getVisibleRange]);

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
  
  // Auto-scroll to keep playhead visible during playback
  useEffect(() => {
    if (!isPlaying || zoomLevel === 1 || isDragging) return;
    
    const progress = currentTime / duration;
    const { start, end, visibleWidth } = getVisibleRange();
    
    // Throttle auto-scroll updates to prevent stuttering
    const now = Date.now();
    if (now - lastAutoScrollTime.current < 100) return; // Update at most every 100ms
    
    // Only scroll if playhead is getting close to edge
    const edgeThreshold = visibleWidth * 0.3; // 30% from edge
    
    if (progress < start + edgeThreshold || progress > end - edgeThreshold) {
      // Smooth scroll towards keeping playhead centered
      const targetOffset = progress - (visibleWidth / 2);
      const clampedTarget = Math.max(0, Math.min(1 - visibleWidth, targetOffset));
      
      // Smooth transition with interpolation
      const smoothingFactor = 0.2;
      const newOffset = scrollOffset + (clampedTarget - scrollOffset) * smoothingFactor;
      
      setScrollOffset(newOffset);
      lastAutoScrollTime.current = now;
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
            onClick={() => setShowToolbar(!showToolbar)}
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
            </div>
            
            {/* Vertical Separator */}
            {zoomLevel > 1 && (
              <>
                <div style={{
                  width: '1px',
                  height: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }} />
                
                {/* Reset Zoom - Compact Icon */}
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setScrollOffset(0);
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
                    padding: 0,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  title="איפוס זום"
                >
                  ↺
                </button>
              </>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}