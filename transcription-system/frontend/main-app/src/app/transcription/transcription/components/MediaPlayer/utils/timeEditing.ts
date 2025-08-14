/**
 * Time editing utilities for the MediaPlayer component
 */

import { formatTime } from './mediaControls';

/**
 * Parse time string (HH:MM:SS or MM:SS) to seconds
 */
export function parseTimeString(timeStr: string): number {
  const parts = timeStr.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Start time editing
 */
export function enableTimeEdit(
  type: 'current' | 'total',
  currentTime: number,
  duration: number,
  setEditingTime: (type: 'current' | 'total' | null) => void,
  setEditTimeValue: (value: string) => void,
  editTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
): void {
  setEditingTime(type);
  // Keep the original time value
  setEditTimeValue(type === 'current' ? formatTime(currentTime) : formatTime(duration));
  
  // Clear any existing timeout
  if (editTimeoutRef.current) {
    clearTimeout(editTimeoutRef.current);
    editTimeoutRef.current = null;
  }
  
  // Auto-cancel after 10 seconds of inactivity
  editTimeoutRef.current = setTimeout(() => {
    setEditingTime(null);
    setEditTimeValue('');
  }, 10000);
}

/**
 * Handle time value change during editing
 */
export function handleTimeEditChange(
  value: string,
  setEditTimeValue: (value: string) => void,
  editTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
): void {
  // Reset timeout on every change
  if (editTimeoutRef.current) {
    clearTimeout(editTimeoutRef.current);
  }
  
  editTimeoutRef.current = setTimeout(() => {
    setEditTimeValue('');
  }, 10000);
  
  setEditTimeValue(value);
}

/**
 * Apply the edited time
 */
export function applyTimeEdit(
  editingTime: 'current' | 'total' | null,
  editTimeValue: string,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  showVideo: boolean,
  duration: number,
  setCurrentTime: (time: number) => void,
  setEditingTime: (type: 'current' | 'total' | null) => void,
  setEditTimeValue: (value: string) => void,
  editTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
): void {
  if (!editTimeValue) return;
  
  const seconds = parseTimeString(editTimeValue);
  const mediaElement = showVideo ? videoRef.current : audioRef.current;
  
  if (editingTime === 'current' && mediaElement) {
    // Clamp to valid range
    const validTime = Math.max(0, Math.min(seconds, duration));
    mediaElement.currentTime = validTime;
    setCurrentTime(validTime);
  }
  
  // Clear editing state
  setEditingTime(null);
  setEditTimeValue('');
  
  if (editTimeoutRef.current) {
    clearTimeout(editTimeoutRef.current);
    editTimeoutRef.current = null;
  }
}

/**
 * Cancel time editing
 */
export function cancelTimeEdit(
  setEditingTime: (type: 'current' | 'total' | null) => void,
  setEditTimeValue: (value: string) => void,
  editTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
): void {
  setEditingTime(null);
  setEditTimeValue('');
  
  if (editTimeoutRef.current) {
    clearTimeout(editTimeoutRef.current);
    editTimeoutRef.current = null;
  }
}