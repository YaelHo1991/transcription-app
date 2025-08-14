/**
 * Media control utility functions for the MediaPlayer component
 */

/**
 * Format time in HH:MM:SS format
 */
export function formatTime(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Toggle play/pause for a media element
 */
export function togglePlayPause(
  mediaElement: HTMLAudioElement | HTMLVideoElement | null
): void {
  if (!mediaElement) {
    return;
  }
  
  // Check actual media state, not React state
  if (!mediaElement.paused) {
    mediaElement.pause();
  } else {
    mediaElement.play()
      .catch(err => {
        // Ignore AbortError as it's just a play/pause conflict
        if (err.name !== 'AbortError') {
          console.error('Play failed:', err);
        }
      });
  }
}

/**
 * Rewind media by specified seconds
 */
export function handleRewind(
  mediaElement: HTMLAudioElement | HTMLVideoElement | null,
  seconds: number
): void {
  if (!mediaElement) return;
  mediaElement.currentTime = Math.max(0, mediaElement.currentTime - seconds);
}

/**
 * Fast forward media by specified seconds
 */
export function handleForward(
  mediaElement: HTMLAudioElement | HTMLVideoElement | null,
  seconds: number,
  duration: number
): void {
  if (!mediaElement) return;
  mediaElement.currentTime = Math.min(duration, mediaElement.currentTime + seconds);
}

/**
 * Handle progress bar click for seeking (RTL aware)
 */
export function handleProgressClick(
  e: React.MouseEvent<HTMLDivElement>,
  progressBarRef: React.RefObject<HTMLDivElement | null>,
  mediaElement: HTMLAudioElement | HTMLVideoElement | null,
  duration: number
): void {
  if (!progressBarRef.current || !mediaElement) return;
  
  const rect = progressBarRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  // RTL: Right is 0%, left is 100%
  const progress = 1 - (x / rect.width);
  mediaElement.currentTime = progress * duration;
}

/**
 * Get the active media element based on video/audio mode
 */
export function getActiveMediaElement(
  showVideo: boolean,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  audioRef: React.RefObject<HTMLAudioElement | null>
): HTMLAudioElement | HTMLVideoElement | null {
  return showVideo && videoRef.current ? videoRef.current : audioRef.current;
}

/**
 * Apply volume to both audio and video elements
 */
export function applyVolumeToElements(
  volume: number,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
): void {
  const normalizedVolume = volume / 100;
  if (audioRef.current) {
    audioRef.current.volume = normalizedVolume;
  }
  if (videoRef.current) {
    videoRef.current.volume = normalizedVolume;
  }
}

/**
 * Apply playback rate to both audio and video elements
 */
export function applyPlaybackRateToElements(
  rate: number,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
): void {
  if (audioRef.current) {
    audioRef.current.playbackRate = rate;
  }
  if (videoRef.current) {
    videoRef.current.playbackRate = rate;
  }
}

/**
 * Jump to start of media
 */
export function jumpToStart(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setCurrentTime: (time: number) => void
): void {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }
}

/**
 * Jump to end of media
 */
export function jumpToEnd(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  duration: number,
  setCurrentTime: (time: number) => void
): void {
  if (audioRef.current && duration > 0) {
    audioRef.current.currentTime = duration;
    setCurrentTime(duration);
  }
}