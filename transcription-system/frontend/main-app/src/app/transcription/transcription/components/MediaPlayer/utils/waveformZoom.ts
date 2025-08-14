/**
 * Waveform Zoom and Pan Utilities
 */

export const ZOOM_CONFIG = {
  MIN_ZOOM: 1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.5
};

/**
 * Calculate visible range based on zoom and scroll
 */
export function getVisibleRange(zoomLevel: number, scrollOffset: number): {
  start: number;
  end: number;
  visibleWidth: number;
} {
  const visibleWidth = Math.min(1, 1 / zoomLevel);
  const start = Math.max(0, Math.min(1 - visibleWidth, scrollOffset));
  const end = Math.min(1, start + visibleWidth);
  
  // Ensure valid range
  if (end <= start) {
    return { start: 0, end: visibleWidth, visibleWidth };
  }
  
  return { start, end, visibleWidth };
}

/**
 * Handle zoom in
 */
export function zoomIn(currentZoom: number): number {
  return Math.min(ZOOM_CONFIG.MAX_ZOOM, currentZoom + ZOOM_CONFIG.ZOOM_STEP);
}

/**
 * Handle zoom out
 */
export function zoomOut(currentZoom: number): number {
  return Math.max(ZOOM_CONFIG.MIN_ZOOM, currentZoom - ZOOM_CONFIG.ZOOM_STEP);
}

/**
 * Reset zoom to default
 */
export function resetZoom(): { zoom: number; scroll: number } {
  return { zoom: 1, scroll: 0 };
}

/**
 * Calculate scroll position from drag
 */
export function calculateScrollFromDrag(
  dragStartX: number,
  currentX: number,
  dragStartOffset: number,
  containerWidth: number,
  zoomLevel: number
): number {
  const deltaX = currentX - dragStartX;
  const scrollDelta = (deltaX / containerWidth) / zoomLevel;
  return Math.max(0, Math.min(1 - (1 / zoomLevel), dragStartOffset + scrollDelta));
}

/**
 * Calculate time from click position
 */
export function getTimeFromClick(
  clickX: number,
  containerRect: DOMRect,
  visibleRange: { start: number; end: number },
  duration: number
): number {
  const x = clickX - containerRect.left;
  const { start, end } = visibleRange;
  
  // RTL: reverse the progress calculation
  const visibleProgress = 1 - (x / containerRect.width);
  const globalProgress = start + (visibleProgress * (end - start));
  
  return Math.max(0, Math.min(duration, globalProgress * duration));
}

/**
 * Check if playhead needs auto-scroll
 */
export function shouldAutoScroll(
  currentTime: number,
  duration: number,
  visibleRange: { start: number; end: number; visibleWidth: number },
  isPlaying: boolean
): { shouldScroll: boolean; targetOffset?: number } {
  const progress = currentTime / duration;
  const { start, end, visibleWidth } = visibleRange;
  
  // Check if playhead is outside visible area
  if (progress < start || progress > end) {
    // Center the playhead in view
    const targetOffset = progress - (visibleWidth / 2);
    const clampedTarget = Math.max(0, Math.min(1 - visibleWidth, targetOffset));
    return { shouldScroll: true, targetOffset: clampedTarget };
  }
  
  if (isPlaying) {
    // Auto-scroll during playback if close to edge
    const edgeThreshold = visibleWidth * 0.2;
    
    if (progress > end - edgeThreshold) {
      // Keep playhead at 70% position
      const targetOffset = progress - (visibleWidth * 0.7);
      const clampedTarget = Math.max(0, Math.min(1 - visibleWidth, targetOffset));
      return { shouldScroll: true, targetOffset: clampedTarget };
    }
  }
  
  return { shouldScroll: false };
}

/**
 * Get cursor style based on state
 */
export function getCursorStyle(isDragging: boolean, zoomLevel: number): string {
  if (isDragging) return 'grabbing';
  if (zoomLevel > 1) return 'grab';
  return 'pointer';
}

/**
 * Handle mouse wheel zoom
 */
export function handleWheelZoom(
  event: WheelEvent,
  currentZoom: number
): { newZoom: number; preventDefault: boolean } {
  if (!event.ctrlKey && !event.metaKey) {
    return { newZoom: currentZoom, preventDefault: false };
  }
  
  const newZoom = event.deltaY < 0 
    ? zoomIn(currentZoom)
    : zoomOut(currentZoom);
  
  return { newZoom, preventDefault: true };
}