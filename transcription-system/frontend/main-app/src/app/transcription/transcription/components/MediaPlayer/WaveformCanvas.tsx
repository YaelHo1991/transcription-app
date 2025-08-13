'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { WaveformData } from './types';

interface WaveformCanvasProps {
  waveformData: WaveformData;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
}

export default function WaveformCanvas({
  waveformData,
  currentTime,
  duration,
  isPlaying,
  onSeek
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDrawnProgress = useRef<number>(-1);

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

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !waveformData || !container) return;

    const { peaks } = waveformData;
    const progress = duration > 0 ? currentTime / duration : 0;
    
    // Only skip redraw if progress hasn't changed AND we've already drawn at least once
    if (lastDrawnProgress.current !== -1 && Math.abs(progress - lastDrawnProgress.current) < 0.001 && !isPlaying) {
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

    // RTL: Progress goes from right to left
    const progressX = width * (1 - progress);
    
    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const maxHeight = height * 0.8; // Leave some padding

    // Draw waveform bars
    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const height = peak * maxHeight;
      const halfHeight = height / 2;

      // RTL: Determine if this bar is played (right side is played)
      const isPlayed = x >= progressX;

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
      
      // Draw mirrored waveform (top and bottom)
      ctx.fillRect(x, centerY - halfHeight, barWidth - 1, halfHeight);
      ctx.fillRect(x, centerY, barWidth - 1, halfHeight);
    });

    // Draw playhead with glow effect
    if (progress > 0 && progress < 1) {
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
  }, [waveformData, currentTime, duration, isPlaying, colors]);

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

  // Handle click to seek (RTL aware)
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // RTL: Right side is start (0), left side is end (duration)
    const progress = 1 - (x / rect.width);
    const seekTime = progress * duration;
    
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  }, [duration, onSeek]);

  // Handle hover to show time tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // RTL: Calculate time based on RTL progress
    const progress = 1 - (x / rect.width);
    const hoverTime = progress * duration;
    
    // Format time for tooltip
    const minutes = Math.floor(hoverTime / 60);
    const seconds = Math.floor(hoverTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update cursor
    canvas.style.cursor = 'pointer';
    canvas.title = timeStr;
  }, [duration]);

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
    
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resizeCanvas]);

  // Redraw when waveform data changes
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
  }, [waveformData, drawWaveform]);

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
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}