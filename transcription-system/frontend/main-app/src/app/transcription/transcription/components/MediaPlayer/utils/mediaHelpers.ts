/**
 * Media helper utilities for MediaPlayer component
 */

/**
 * Determines if a file is a video or audio based on its extension
 */
export function getMediaType(filename: string): 'video' | 'audio' {
  const videoExtensions = /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i;
  return filename.match(videoExtensions) ? 'video' : 'audio';
}

/**
 * Creates a playable URL for a media file or returns the existing URL
 */
export function createMediaUrl(media: { type: 'file' | 'url'; file?: File; url?: string }): string {
  if (media.type === 'url' && media.url) {
    return media.url;
  }
  if (media.type === 'file' && media.file) {
    return URL.createObjectURL(media.file);
  }
  throw new Error('Invalid media object: missing file or url');
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Extracts filename from URL or path
 */
export function getFilenameFromUrl(url: string): string {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1] || url.substring(0, 50);
}