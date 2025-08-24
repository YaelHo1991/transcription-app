/**
 * Smart Upload Service
 * Automatically handles URLs, chunked uploads, and regular files
 * Transparent to the user - they don't see any difference
 */

import axios, { AxiosProgressEvent } from 'axios';

interface UploadOptions {
  file?: File;
  url?: string;
  projectId: string;
  onProgress?: (progress: number) => void;
  onComplete?: (fileName: string) => void;
  onError?: (error: string) => void;
}

class SmartUploadService {
  private readonly API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000') + '/api';
  private readonly CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  private readonly LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

  /**
   * Detect if input is a cloud URL
   */
  private isCloudUrl(input: string): boolean {
    const patterns = [
      /drive\.google\.com/,
      /docs\.google\.com/,
      /dropbox\.com/,
      /box\.com/,
      /onedrive\.live\.com/,
      /sharepoint\.com/,
      /wetransfer\.com/,
      /mediafire\.com/
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Smart upload - automatically detects and uses the best method
   */
  async uploadSmart(options: UploadOptions): Promise<string> {
    const { file, url, projectId, onProgress, onComplete, onError } = options;

    try {
      // Check if it's a URL input
      if (url && this.isCloudUrl(url)) {
        console.log('🌐 Detected cloud URL, using URL import...');
        return await this.uploadFromUrl(url, projectId, onProgress, onComplete);
      }

      // Check if it's a large file that needs chunking
      if (file && file.size > this.LARGE_FILE_THRESHOLD) {
        console.log('📦 Large file detected, using chunked upload...');
        return await this.uploadChunked(file, projectId, onProgress, onComplete);
      }

      // Regular file upload
      if (file) {
        console.log('📤 Regular file upload...');
        return await this.uploadRegular(file, projectId, onProgress, onComplete);
      }

      throw new Error('No file or URL provided');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Upload error:', errorMessage);
      onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Upload from cloud URL
   */
  private async uploadFromUrl(
    url: string,
    projectId: string,
    onProgress?: (progress: number) => void,
    onComplete?: (fileName: string) => void
  ): Promise<string> {
    // Show indeterminate progress while importing
    onProgress?.(0);
    
    const formData = new FormData();
    formData.append('fileUrl', url);
    formData.append('projectId', projectId);

    const response = await axios.post('${this.API_URL}/upload`, formData, {
      headers: {
        'Authorization': 'Bearer ' + this.getAuthToken()
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        // Since URL import doesn't have real progress, show fake progress
        onProgress?.(50); // Show 50% while processing
      }
    });

    if (response.data.success) {
      onProgress?.(100);
      onComplete?.(response.data.fileName);
      return response.data.fileName;
    }

    throw new Error(response.data.error || 'URL import failed');
  }

  /**
   * Chunked upload for large files
   */
  private async uploadChunked(
    file: File,
    projectId: string,
    onProgress?: (progress: number) => void,
    onComplete?: (fileName: string) => void
  ): Promise<string> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    const fileId = (Date.now()) + '_${Math.random().toString(36).substr(2, 9)}';
    const fileName = (Date.now()) + '_${file.name}';
    
    let uploadedChunks = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('projectId', projectId);
      formData.append('chunkMetadata', JSON.stringify({
        fileName,
        chunkIndex,
        totalChunks,
        fileId
      }));

      const response = await axios.post(this.API_URL + '/upload', formData, {
        headers: {
          'Authorization': 'Bearer ' + this.getAuthToken()
        }
      });

      if (!response.data.success) {
        throw new Error('Chunk ' + chunkIndex + 1 + ' upload failed');
      }

      uploadedChunks++;
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      onProgress?.(progress);

      // If this was the last chunk and upload is complete
      if (response.data.complete) {
        onComplete?.(response.data.fileName);
        return response.data.fileName;
      }
    }

    throw new Error('Chunked upload incomplete');
  }

  /**
   * Regular upload for normal files
   */
  private async uploadRegular(
    file: File,
    projectId: string,
    onProgress?: (progress: number) => void,
    onComplete?: (fileName: string) => void
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    const response = await axios.post(this.API_URL + '/upload', formData, {
      headers: {
        'Authorization': 'Bearer ' + this.getAuthToken()
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress?.(progress);
        }
      }
    });

    if (response.data.success) {
      onComplete?.(response.data.fileName);
      return response.data.fileName;
    }

    throw new Error(response.data.error || 'Upload failed');
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  }

  /**
   * Handle paste event to detect URLs
   */
  handlePasteEvent(event: ClipboardEvent): string | null {
    const pastedText = event.clipboardData?.getData('text');
    
    if (pastedText && this.isCloudUrl(pastedText)) {
      console.log('📋 Cloud URL detected from paste:', pastedText);
      return pastedText;
    }
    
    return null;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file extension
    const validExtensions = ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      return { valid: false, error: 'קובץ מסוג ' + ext + ' אינו נתמך' };
    }
    
    // Check file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      const sizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      return { valid: false, error: 'הקובץ גדול מדי: ' + sizeInGB + 'GB (מקסימום 5GB)' };
    }
    
    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

// Export singleton instance
export const uploadService = new SmartUploadService();
export default uploadService;