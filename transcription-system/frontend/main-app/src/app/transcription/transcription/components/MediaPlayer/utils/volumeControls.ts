/**
 * Volume control utility functions for the MediaPlayer component
 */

import { applyVolumeToElements, getActiveMediaElement } from './mediaControls';

/**
 * Volume control state interface
 */
export interface VolumeState {
  volume: number;
  isMuted: boolean;
  previousVolume: number;
}

/**
 * Handle volume change from slider input
 */
export function handleVolumeChange(
  newVolume: number,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setVolume: (volume: number) => void,
  setIsMuted: (muted: boolean) => void,
  previousVolumeRef: React.MutableRefObject<number>
): void {
  setVolume(newVolume);
  
  // Apply volume to both audio and video elements
  applyVolumeToElements(newVolume, audioRef, videoRef);
  
  setIsMuted(newVolume === 0);
  
  // Track non-zero volume for unmute
  if (newVolume > 0) {
    previousVolumeRef.current = newVolume;
  }
}

/**
 * Toggle mute/unmute
 */
export function toggleMute(
  showVideo: boolean,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setVolume: (volume: number) => void,
  setIsMuted: (muted: boolean) => void,
  previousVolumeRef: React.MutableRefObject<number>
): void {
  const mediaElement = getActiveMediaElement(showVideo, videoRef, audioRef);
  if (!mediaElement) return;
  
  // Check actual media volume instead of React state to avoid closure issues
  if (mediaElement.volume === 0) {
    // Currently muted, unmute it
    const newVolume = previousVolumeRef.current;
    applyVolumeToElements(newVolume, audioRef, videoRef);
    setVolume(newVolume);
    setIsMuted(false);
  } else {
    // Currently has volume, mute it
    // Save current volume before muting
    previousVolumeRef.current = mediaElement.volume * 100;
    applyVolumeToElements(0, audioRef, videoRef);
    setVolume(0);
    setIsMuted(true);
  }
}

/**
 * Get volume icon based on current volume and mute state
 */
export function getVolumeIcon(volume: number, isMuted: boolean): string {
  if (isMuted || volume === 0) {
    return '🔇';
  } else if (volume < 33) {
    return '🔈';
  } else if (volume < 66) {
    return '🔉';
  } else {
    return '🔊';
  }
}

/**
 * Format volume as percentage
 */
export function formatVolumePercentage(volume: number): string {
  return `${Math.round(volume)}%`;
}