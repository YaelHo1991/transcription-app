import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadService } from '../services/uploadService';
import storageService from '../services/storageService';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for chunked uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB per chunk
  }
});

/**
 * Handle file upload (automatic detection of URL vs file)
 * This endpoint handles both regular files and URLs transparently
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { projectId, fileUrl, chunkMetadata } = req.body;
    const userId = (req as any).user.id;

    // Check if this is a URL import
    if (fileUrl && uploadService.isCloudUrl(fileUrl)) {
      // console.log removed for production
      
      const fileName = await uploadService.importFromUrl({
        url: fileUrl,
        projectId,
        userId
      });
      
      return res.json({
        success: true,
        fileName,
        message: 'File imported successfully from URL'
      });
    }

    // Check if this is a chunked upload
    if (chunkMetadata) {
      const metadata = JSON.parse(chunkMetadata);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No chunk data provided'
        });
      }
      
      const result = await uploadService.receiveChunk(
        req.file.buffer,
        metadata
      );
      
      if (result.complete) {
        return res.json({
          success: true,
          complete: true,
          fileName: result.fileName,
          message: 'File upload complete'
        });
      } else {
        return res.json({
          success: true,
          complete: false,
          message: `Chunk ${metadata.chunkIndex + 1}/${metadata.totalChunks} received`
        });
      }
    }

    // Regular file upload (backwards compatible)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Validate file
    const validation = uploadService.validateFile(req.file.originalname, req.file.size);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check storage limit before saving
    const storageCheck = await storageService.canUserUpload(userId, req.file.size);
    
    if (!storageCheck.canUpload) {
      return res.status(413).json({ 
        success: false,
        error: 'Storage limit exceeded',
        details: storageCheck.message,
        currentUsedMB: storageCheck.currentUsedMB,
        limitMB: storageCheck.limitMB,
        availableMB: storageCheck.availableMB,
        requestedMB: storageCheck.requestedMB
      });
    }

    // Save regular file
    const timestamp = Date.now();
    const fileName = '${userId}_' + projectId + '_${timestamp}_${req.file.originalname}';
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileName);
    
    require('fs').writeFileSync(filePath, req.file.buffer);
    
    // Update user's storage usage after successful upload
    await storageService.incrementUsedStorage(userId, req.file.size);
    
    res.json({
      success: true,
      fileName,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

/**
 * Import from URL endpoint (explicit)
 * Can be called directly if needed
 */
router.post('/import-url', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url, projectId } = req.body;
    const userId = (req as any).user.id;

    if (!url || !uploadService.isCloudUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unsupported URL'
      });
    }

    const fileName = await uploadService.importFromUrl({
      url,
      projectId,
      userId
    });

    res.json({
      success: true,
      fileName,
      message: 'File imported successfully'
    });

  } catch (error) {
    console.error('URL import error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    });
  }
});

/**
 * Get file info
 */
router.get('/file-info/:fileName', authenticateToken, (req: Request, res: Response) => {
  try {
    const { fileName } = req.params;
    const fileInfo = uploadService.getFileInfo(fileName);
    
    if (!fileInfo.exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    res.json({
      success: true,
      ...fileInfo
    });
    
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file info'
    });
  }
});

/**
 * Cleanup endpoint (admin only, for maintenance)
 */
router.post('/cleanup', authenticateToken, (req: Request, res: Response) => {
  try {
    // Check if user is admin (you might want to add proper admin check)
    const userPermissions = (req as any).user.permissions;
    if (!userPermissions || !userPermissions.includes('A')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    uploadService.cleanupIncompleteUploads();
    
    res.json({
      success: true,
      message: 'Cleanup completed'
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

export default router;