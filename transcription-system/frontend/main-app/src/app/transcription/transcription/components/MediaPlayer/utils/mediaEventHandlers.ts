/**
 * Media event handler utilities for the MediaPlayer component
 */

/**
 * Setup media element event handlers
 */
export function setupMediaEventHandlers(
  mediaElement: HTMLAudioElement | HTMLVideoElement | null,
  setDuration: (duration: number) => void,
  setIsReady: (ready: boolean) => void,
  setCurrentTime: (time: number) => void,
  setIsPlaying: (playing: boolean) => void,
  onTimeUpdate?: (time: number) => void,
  volume?: number,
  playbackRate?: number
): (() => void) | undefined {
  if (!mediaElement) return;

  // Initialize volume and playback rate if provided
  if (volume !== undefined) {
    mediaElement.volume = volume / 100;
  }
  if (playbackRate !== undefined) {
    mediaElement.playbackRate = playbackRate;
  }

  const handleLoadedMetadata = () => {
    setDuration(mediaElement.duration);
    setIsReady(true);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(mediaElement.currentTime);
    onTimeUpdate?.(mediaElement.currentTime);
  };
  
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
  mediaElement.addEventListener('timeupdate', handleTimeUpdate);
  mediaElement.addEventListener('play', handlePlay);
  mediaElement.addEventListener('pause', handlePause);
  mediaElement.addEventListener('ended', handleEnded);

  // Return cleanup function
  return () => {
    mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
    mediaElement.removeEventListener('play', handlePlay);
    mediaElement.removeEventListener('pause', handlePause);
    mediaElement.removeEventListener('ended', handleEnded);
  };
}