/**
 * Video cube handler utilities for the MediaPlayer component
 */

/**
 * Handle video cube minimize
 */
export function handleVideoCubeMinimize(
  setVideoMinimized: (minimized: boolean) => void,
  setShowVideoCube: (show: boolean) => void
): void {
  setVideoMinimized(true);
  setShowVideoCube(false);
}

/**
 * Handle video cube close
 */
export function handleVideoCubeClose(
  setShowVideoCube: (show: boolean) => void,
  setVideoMinimized: (minimized: boolean) => void
): void {
  setShowVideoCube(false);
  setVideoMinimized(true); // Set to true so restore button appears
  // Keep video enabled (don't set setShowVideo(false))
}

/**
 * Handle video restore
 */
export function handleVideoRestore(
  setVideoMinimized: (minimized: boolean) => void,
  setShowVideo: (show: boolean) => void,
  setShowVideoCube: (show: boolean) => void
): void {
  setVideoMinimized(false);
  setShowVideo(true); // Make sure video is enabled again
  setShowVideoCube(true);
}

/**
 * Handle video cube restore to defaults
 * Just a callback for when restore button is clicked
 * The VideoCube component handles the actual restore logic
 */
export function handleVideoCubeRestore(): void {
  // The VideoCube component handles the actual restore logic
}