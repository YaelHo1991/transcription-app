/**
 * Speed control utility functions for the MediaPlayer component
 */

import { applyPlaybackRateToElements } from './mediaControls';

/**
 * Speed presets for cycling through
 */
export const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Default playback speed
 */
export const DEFAULT_SPEED = 1;

/**
 * Speed control state interface
 */
export interface SpeedState {
  playbackRate: number;
  speedSliderValue: number;
}

/**
 * Cycle through speed presets
 */
export function cycleSpeed(
  currentRate: number,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setPlaybackRate: (rate: number) => void,
  setSpeedSliderValue: (value: number) => void
): void {
  const currentIndex = SPEED_PRESETS.indexOf(currentRate);
  const nextIndex = (currentIndex + 1) % SPEED_PRESETS.length;
  const newSpeed = SPEED_PRESETS[nextIndex];
  
  applyPlaybackRateToElements(newSpeed, audioRef, videoRef);
  setPlaybackRate(newSpeed);
  setSpeedSliderValue(newSpeed * 100);
}

/**
 * Reset speed to default (1x)
 */
export function resetSpeed(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setPlaybackRate: (rate: number) => void,
  setSpeedSliderValue: (value: number) => void
): void {
  applyPlaybackRateToElements(DEFAULT_SPEED, audioRef, videoRef);
  setPlaybackRate(DEFAULT_SPEED);
  setSpeedSliderValue(DEFAULT_SPEED * 100);
}

/**
 * Handle speed change from slider input
 */
export function handleSpeedChange(
  newSpeed: number,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setPlaybackRate: (rate: number) => void,
  setSpeedSliderValue: (value: number) => void
): void {
  const rate = newSpeed / 100;
  applyPlaybackRateToElements(rate, audioRef, videoRef);
  setPlaybackRate(rate);
  setSpeedSliderValue(newSpeed);
}

/**
 * Format speed as percentage or multiplier
 */
export function formatSpeed(speed: number): string {
  return `${speed.toFixed(2)}x`;
}

/**
 * Get speed icon based on current speed
 */
export function getSpeedIcon(speed: number): string {
  if (speed < 0.75) {
    return '🐢'; // Slow
  } else if (speed > 1.25) {
    return '🏃'; // Fast
  } else {
    return '▶️'; // Normal
  }
}