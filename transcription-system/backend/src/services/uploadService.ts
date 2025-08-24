import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream, createReadStream } from 'fs';

const streamPipeline = promisify(pipeline);

interface ChunkMetadata {
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  fileId: string;
}

interface UrlImportOptions {
  url: string;
  projectId: string;
  userId: string;
}

class UploadService {
  private tempDir: string;
  private uploadsDir: string;
  private chunkStorage: Map<string, Buffer[]> = new Map();

  constructor() {
    this.tempDir = process.env.TEMP_DIR || path.join(process.cwd(), 'temp');
    this.uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.tempDir);
    this.ensureDirectoryExists(this.uploadsDir);
  }

  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Detect if input is a cloud storage URL
   */
  isCloudUrl(input: string): boolean {
    const patterns = [
      /drive\.google\.com/,
      /docs\.google\.com/,
      /dropbox\.com/,
      /box\.com/,
      /onedrive\.live\.com/,
      /sharepoint\.com/
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Extract direct download URL from cloud storage links
   */
  private getDirectDownloadUrl(url: string): string {
    // Google Drive
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }
    
    // Dropbox
    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }
    
    // OneDrive
    if (url.includes('onedrive.live.com')) {
      return url.replace('embed', 'download');
    }
    
    // Default: return as is
    return url;
  }

  /**
   * Import file from URL (Google Drive, Dropbox, etc.)
   */
  async importFromUrl(options: UrlImportOptions): Promise<string> {
    const { url, projectId, userId } = options;
    
    console.log('📥 Starting URL import from:', url);
    
    try {
      // Get direct download URL
      const downloadUrl = this.getDirectDownloadUrl(url);
      
      // Generate unique filename
      const timestamp = Date.now();
      const tempFileName = 'import_${userId}_' + projectId + '_${timestamp}';
      const tempFilePath = path.join(this.tempDir, tempFileName);
      
      // Download file with streaming to handle large files
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0, // No timeout for large files
        headers: {
          'User-Agent': 'Transcription-System/1.0'
        }
      });
      
      // Get file info from headers
      const contentType = response.headers['content-type'];
      const contentLength = response.headers['content-length'];
      const contentDisposition = response.headers['content-disposition'];
      
      // Extract filename from content-disposition or URL
      let fileName = tempFileName;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      } else {
        // Try to get from URL
        const urlPath = new URL(downloadUrl).pathname;
        const urlFileName = path.basename(urlPath);
        if (urlFileName && urlFileName !== 'download') {
          fileName = urlFileName;
        }
      }
      
      // Ensure valid extension
      if (!fileName.match(/\.(mp3|mp4|wav|m4a|webm|ogg|aac|flac)$/i)) {
        // Add extension based on content type
        const extensionMap: Record<string, string> = {
          'audio/mpeg': '.mp3',
          'audio/mp4': '.m4a',
          'audio/wav': '.wav',
          'audio/webm': '.webm',
          'audio/ogg': '.ogg',
          'video/mp4': '.mp4',
          'video/webm': '.webm'
        };
        
        const extension = extensionMap[contentType] || '.mp3';
        fileName = `${fileName}${extension}`;
      }
      
      // Final file path
      const finalFileName = '${userId}_' + projectId + '_${timestamp}_${fileName}';
      const finalFilePath = path.join(this.uploadsDir, finalFileName);
      
      // Download and save file
      const writer = createWriteStream(tempFilePath);
      
      // Track progress
      let downloadedBytes = 0;
      const totalBytes = parseInt(contentLength || '0');
      
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          // Could emit progress event here if needed
          if (progress % 10 === 0) {
            console.log('📊 Download progress: ' + progress + '%');
          }
        }
      });
      
      await streamPipeline(response.data, writer);
      
      // Move from temp to final location
      fs.renameSync(tempFilePath, finalFilePath);
      
      console.log('✅ File imported successfully:', finalFileName);
      console.log('📁 File size:', (downloadedBytes / (1024 * 1024)).toFixed(2), 'MB');
      
      return finalFileName;
      
    } catch (error) {
      console.error('❌ URL import failed:', error);
      throw new Error(`Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle chunked upload - receive a chunk
   */
  async receiveChunk(
    chunk: Buffer,
    metadata: ChunkMetadata
  ): Promise<{ complete: boolean; fileName?: string }> {
    const { fileName, chunkIndex, totalChunks, fileId } = metadata;
    
    console.log('📦 Receiving chunk ${chunkIndex + 1}/' + totalChunks + ' for file: ${fileName}');
    
    // Initialize storage for this file if needed
    if (!this.chunkStorage.has(fileId)) {
      this.chunkStorage.set(fileId, new Array(totalChunks));
    }
    
    // Store chunk
    const chunks = this.chunkStorage.get(fileId)!;
    chunks[chunkIndex] = chunk;
    
    // Check if all chunks received
    const receivedChunks = chunks.filter(c => c !== undefined).length;
    
    if (receivedChunks === totalChunks) {
      // All chunks received, combine them
      console.log('🔧 All chunks received, combining file...');
      
      const completeBuffer = Buffer.concat(chunks);
      const finalFilePath = path.join(this.uploadsDir, fileName);
      
      // Write complete file
      fs.writeFileSync(finalFilePath, completeBuffer);
      
      // Clean up chunk storage
      this.chunkStorage.delete(fileId);
      
      console.log('✅ File assembled successfully:', fileName);
      console.log('📁 Final size:', (completeBuffer.length / (1024 * 1024)).toFixed(2), 'MB');
      
      return { complete: true, fileName };
    }
    
    return { complete: false };
  }

  /**
   * Clean up incomplete uploads (run periodically)
   */
  cleanupIncompleteUploads(maxAgeHours: number = 24) {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    // Clean temp directory
    const tempFiles = fs.readdirSync(this.tempDir);
    tempFiles.forEach(file => {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up old temp file:', file);
      }
    });
    
    // Clean chunk storage (in memory)
    // In production, you might want to persist this to Redis or a database
    if (this.chunkStorage.size > 100) {
      console.log('⚠️ Warning: Many incomplete uploads in memory. Consider cleanup.');
    }
  }

  /**
   * Validate file before processing
   */
  validateFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
    // Check file extension
    const validExtensions = ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg', '.aac', '.flac'];
    const ext = path.extname(fileName).toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      return { valid: false, error: `Invalid file type: ${ext}` };
    }
    
    // Check file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    if (fileSize > maxSize) {
      return { valid: false, error: `File too large: ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB (max 5GB)` };
    }
    
    return { valid: true };
  }

  /**
   * Get file info
   */
  getFileInfo(fileName: string): { size: number; exists: boolean; path: string } {
    const filePath = path.join(this.uploadsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return { size: 0, exists: false, path: filePath };
    }
    
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      exists: true,
      path: filePath
    };
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export default uploadService;