/**
 * Waveform Drawing Utilities
 */

import { WaveformData } from '../types';

export interface WaveformColors {
  playedWaveform: string;
  unplayedWaveform: string;
  playedGradientTop: string;
  unplayedGradientTop: string;
  playhead: string;
  playheadGlow: string;
  background: string;
  hoverLine: string;
}

export const defaultColors: WaveformColors = {
  playedWaveform: '#26d0ce',
  unplayedWaveform: '#0f4c4c',
  playedGradientTop: '#40e0d0',
  unplayedGradientTop: '#1a5d5d',
  playhead: '#ffffff',
  playheadGlow: 'rgba(38, 208, 206, 0.5)',
  background: 'transparent',
  hoverLine: 'rgba(255, 255, 255, 0.3)'
};

export interface DrawWaveformParams {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  waveformData: WaveformData;
  currentTime: number;
  duration: number;
  visibleRange: { start: number; end: number };
  colors?: WaveformColors;
}

/**
 * Draw waveform on canvas
 */
export function drawWaveform({
  canvas,
  container,
  waveformData,
  currentTime,
  duration,
  visibleRange,
  colors = defaultColors
}: DrawWaveformParams): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  const { peaks } = waveformData;
  if (!peaks || peaks.length === 0) {
    console.error('No peaks data available');
    return;
  }
  
  const progress = duration > 0 ? currentTime / duration : 0;
  const { start, end } = visibleRange;
  
  // Get actual display dimensions
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  console.log('Drawing waveform:', {
    peaksLength: peaks.length,
    width,
    height,
    progress,
    visibleRange
  });
  
  // Clear canvas
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, width * dpr, height * dpr);

  // Calculate indices
  const totalPeaks = peaks.length;
  const startIndex = Math.max(0, Math.floor(start * totalPeaks));
  const endIndex = Math.min(totalPeaks, Math.ceil(end * totalPeaks));
  
  // Get visible peaks
  let visiblePeaks: Float32Array = peaks.slice(startIndex, endIndex);
  
  // Interpolate if needed for high zoom
  const minPeaksToShow = 20;
  if (visiblePeaks.length < minPeaksToShow && visiblePeaks.length > 0) {
    visiblePeaks = interpolatePeaks(visiblePeaks, minPeaksToShow);
  }
  
  if (visiblePeaks.length === 0) return;
  
  // RTL: Progress position within visible range
  const relativeProgress = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  const progressX = width * (1 - relativeProgress);
  
  const barWidth = width / visiblePeaks.length;
  const centerY = height / 2;
  const maxHeight = height * 0.8;

  // Draw waveform bars
  visiblePeaks.forEach((peak, i) => {
    const x = i * barWidth;
    const peakHeight = Math.max(2, peak * maxHeight);
    const halfHeight = peakHeight / 2;

    // RTL: Determine if this bar is played
    const barRelativePosition = i / visiblePeaks.length;
    const isPlayed = barRelativePosition >= (1 - relativeProgress);

    // Create gradient
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
    
    // Draw mirrored waveform
    const barRenderWidth = Math.max(1, barWidth - 1);
    ctx.fillRect(x, centerY - halfHeight, barRenderWidth, halfHeight);
    ctx.fillRect(x, centerY, barRenderWidth, halfHeight);
  });

  // Draw playhead
  if (relativeProgress > 0 && relativeProgress < 1) {
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
}

/**
 * Resize canvas to match container
 */
export function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  
  if (rect.width <= 0 || rect.height <= 0) return;
  
  const dpr = window.devicePixelRatio || 1;
  
  // Set display size
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  
  // Set actual size in memory
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Scale context
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
}

/**
 * Interpolate peaks for smooth zoom
 */
function interpolatePeaks(peaks: Float32Array, targetLength: number): Float32Array {
  const interpolated = new Float32Array(targetLength);
  
  for (let i = 0; i < targetLength; i++) {
    const index = (i / targetLength) * peaks.length;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;
    
    if (upper < peaks.length) {
      interpolated[i] = peaks[lower] * (1 - fraction) + peaks[upper] * fraction;
    } else {
      interpolated[i] = peaks[lower];
    }
  }
  
  return interpolated;
}