import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticateToken } from '../../../middleware/auth.middleware';

const router = Router();

// Middleware to allow dev mode without auth
const devAuth = (req: Request, res: Response, next: NextFunction) => {
  // In development, ALWAYS allow access for testing
  const isDev = process.env.NODE_ENV?.trim() === 'development' || true; // Force dev mode for now
  if (isDev) {
    // Fake user for dev mode
    (req as any).user = { id: 999, username: 'dev-user' };
    return next();
  }
  // Otherwise use real auth (won't reach here with || true above)
  return authenticateToken(req, res, next);
};

// Helper function to ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Error creating directory:', dirPath, error);
  }
}

// Helper function to parse TXT content to blocks
function parseTxtToBlocks(content: string): any {
  // Extra safety: remove any BOM characters that might be present
  const cleanContent = content.replace(/\uFEFF/g, '');
  const lines = cleanContent.split('\n');
  const blocks: any[] = [];
  const speakers: any[] = [];
  let inTranscript = false;
  let inSpeakers = false;
  let metadata: any = {};

  for (const line of lines) {
    if (line.includes('=== SPEAKERS ===')) {
      inSpeakers = true;
      inTranscript = false;
      continue;
    }
    if (line.includes('=== TRANSCRIPT ===')) {
      inTranscript = true;
      inSpeakers = false;
      continue;
    }
    if (line.includes('=== METADATA ===')) {
      inTranscript = false;
      inSpeakers = false;
      continue;
    }

    if (inSpeakers && line.trim()) {
      // Parse speaker line: "CODE: Name (Description)"
      const match = line.match(/^([^:]+):\s*([^(]+)(?:\(([^)]*)\))?/);
      if (match) {
        speakers.push({
          code: match[1].trim(),
          name: match[2].trim(),
          description: match[3]?.trim() || ''
        });
      }
    }

    if (inTranscript) {
      // Skip the (No content) marker
      if (line.trim() === '(No content)') {
        continue;
      }
      
      // Handle empty lines in transcript - they create empty blocks
      if (!line.trim()) {
        // Create an empty block for empty lines
        blocks.push({
          id: `block-${Date.now()}-${blocks.length}`,
          timestamp: '',
          speaker: '',
          text: ''
        });
        continue;
      }
      
      // Parse transcript line: "[timestamp] [speaker]: text" (text can be empty)
      // Make the colon optional and handle empty text after colon
      const match = line.match(/^(?:(\d{2}:\d{2}:\d{2}))?\s*(?:\[([^\]]+)\])?:?\s*(.*)$/);
      if (match && (match[1] || match[2])) {
        // Has timestamp or speaker
        let text = match[3] || '';
        // If text starts with colon, remove it
        if (text.startsWith(':')) {
          text = text.substring(1).trim();
        }
        // If text starts with the same speaker pattern, remove it (avoid duplication)
        if (match[2] && text.startsWith(`[${match[2]}]:`)) {
          text = text.substring(`[${match[2]}]:`.length).trim();
        }
        blocks.push({
          id: `block-${Date.now()}-${blocks.length}`,
          timestamp: match[1] || '',
          speaker: match[2] || '',
          text: text
        });
      } else {
        // Plain text block (no speaker or timestamp)
        blocks.push({
          id: `block-${Date.now()}-${blocks.length}`,
          text: line.trim(),
          speaker: '',
          timestamp: ''
        });
      }
    }

    // Parse metadata
    if (line.includes('Total Words:')) {
      metadata.totalWords = parseInt(line.split(':')[1].trim()) || 0;
    }
    if (line.includes('Total Blocks:')) {
      metadata.totalBlocks = parseInt(line.split(':')[1].trim()) || 0;
    }
  }

  return { blocks, speakers, metadata };
}

// Helper function to format blocks to TXT
function formatBlocksToTxt(
  blocks: any[],
  speakers: any[],
  projectName?: string,
  transcriptionTitle?: string,
  mediaFile?: string
): string {
  const lines: string[] = [];
  
  // Header
  lines.push('=== TRANSCRIPTION BACKUP ===');
  lines.push(`Project: ${projectName || 'Current Project'}`);
  lines.push(`Transcription: ${transcriptionTitle || 'Current Transcription'}`);
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push(`Version: CURRENT`);
  lines.push(`Media Files:`);
  lines.push(`  - ${mediaFile || 'No Media'} (current)`);
  lines.push('');
  
  // Speakers
  if (speakers && speakers.length > 0) {
    lines.push('=== SPEAKERS ===');
    speakers.forEach((speaker: any) => {
      const desc = speaker.description ? ` (${speaker.description})` : '';
      lines.push(`${speaker.code}: ${speaker.name || speaker.code}${desc}`);
    });
    lines.push('');
  }
  
  // Transcript
  lines.push('=== TRANSCRIPT ===');
  if (blocks && blocks.length > 0) {
    blocks.forEach((block: any) => {
      const timestamp = block.timestamp ? `${block.timestamp} ` : '';
      const speaker = block.speaker ? `[${block.speaker}]` : '';
      const prefix = timestamp || speaker ? `${timestamp}${speaker}: ` : '';
      lines.push(`${prefix}${block.text || ''}`);
    });
  } else {
    lines.push('(No content)');
  }
  lines.push('');
  
  // Metadata
  const totalWords = blocks?.reduce((sum: number, b: any) => 
    sum + (b.text ? b.text.split(/\s+/).filter((w: string) => w.length > 0).length : 0), 0) || 0;
  const speakerCount = new Set(blocks?.map((b: any) => b.speaker).filter(Boolean)).size;
  
  lines.push('=== METADATA ===');
  lines.push(`Total Words: ${totalWords}`);
  lines.push(`Total Blocks: ${blocks?.length || 0}`);
  lines.push(`Total Speakers: ${speakerCount}`);
  lines.push(`Created From: Live Editor Session`);
  
  return lines.join('\n');
}

// CORS is handled at the server level, no need for duplicate headers here

// Save transcription to session
router.post('/save', devAuth, async (req: Request, res: Response) => {
  try {
    const { 
      mediaId, 
      transcriptionNumber, 
      blocks, 
      speakers,
      projectName,
      transcriptionTitle,
      mediaFile 
    } = req.body;

    if (!mediaId || transcriptionNumber === undefined) {
      return res.status(400).json({ error: 'Missing mediaId or transcriptionNumber' });
    }
    
    console.log('💾 [SAVE] Saving session:', {
      mediaId,
      transcriptionNumber,
      blocksCount: blocks?.length || 0,
      speakersCount: speakers?.length || 0,
      firstBlock: blocks?.[0]
    });

    // Create session directory structure
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const sessionDir = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`);
    const backupsDir = path.join(sessionDir, 'backups');
    
    await ensureDir(backupsDir);

    // Format content
    const content = formatBlocksToTxt(blocks, speakers, projectName, transcriptionTitle, mediaFile);
    
    // Write current.txt with UTF-8 BOM for Hebrew support
    const BOM = '\uFEFF';
    const currentFile = path.join(sessionDir, 'current.txt');
    await fs.writeFile(currentFile, BOM + content, 'utf8');
    
    console.log('✅ [SAVE] Session saved successfully:', currentFile);
    
    // Write metadata
    const metadata = {
      mediaId,
      transcriptionNumber,
      lastSaved: new Date().toISOString(),
      wordCount: blocks?.reduce((sum: number, b: any) => 
        sum + (b.text ? b.text.split(/\s+/).filter((w: string) => w.length > 0).length : 0), 0) || 0,
      blockCount: blocks?.length || 0,
      speakerCount: new Set(blocks?.map((b: any) => b.speaker).filter(Boolean)).size
    };
    
    await fs.writeFile(
      path.join(sessionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    res.json({ 
      success: true, 
      path: currentFile,
      metadata 
    });
  } catch (error: any) {
    console.error('Error saving session:', error);
    res.status(500).json({ error: error.message || 'Failed to save session' });
  }
});

// Load transcription from session
router.get('/load/:mediaId/:transcriptionNumber', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId, transcriptionNumber } = req.params;
    
    console.log('📂 [LOAD] Loading session:', {
      mediaId,
      transcriptionNumber
    });
    
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const sessionDir = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`);
    const currentFile = path.join(sessionDir, 'current.txt');
    
    // Check if file exists
    try {
      await fs.access(currentFile);
    } catch {
      // File doesn't exist - return empty transcription
      return res.json({
        success: true,
        blocks: [],
        speakers: [],
        metadata: {
          totalWords: 0,
          totalBlocks: 0
        }
      });
    }
    
    // Read and parse file
    const content = await fs.readFile(currentFile, 'utf8');
    // Remove BOM if present (both at start and any stray BOMs)
    const cleanContent = content.replace(/^\uFEFF/, '').replace(/\uFEFF/g, '');
    const parsed = parseTxtToBlocks(cleanContent);
    
    console.log('✅ [LOAD] Session loaded:', {
      blocksCount: parsed.blocks.length,
      speakersCount: parsed.speakers.length,
      firstBlock: parsed.blocks[0],
      contentPreview: cleanContent.substring(0, 100).replace(/\n/g, '\\n')
    });
    
    res.json({
      success: true,
      ...parsed
    });
  } catch (error: any) {
    console.error('Error loading session:', error);
    res.status(500).json({ error: error.message || 'Failed to load session' });
  }
});

// List all transcriptions for a media
router.get('/list/:mediaId', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const mediaDir = path.join(baseDir, mediaId);
    
    // Check if directory exists
    try {
      await fs.access(mediaDir);
    } catch {
      return res.json({
        success: true,
        transcriptions: []
      });
    }
    
    // List all transcription directories
    const entries = await fs.readdir(mediaDir, { withFileTypes: true });
    const transcriptions = [];
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('transcription_')) {
        const number = parseInt(entry.name.replace('transcription_', ''));
        const metadataFile = path.join(mediaDir, entry.name, 'metadata.json');
        
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
          transcriptions.push({
            number,
            ...metadata
          });
        } catch {
          // If no metadata, just add the number
          transcriptions.push({ number });
        }
      }
    }
    
    transcriptions.sort((a, b) => a.number - b.number);
    
    res.json({
      success: true,
      transcriptions
    });
  } catch (error: any) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to list sessions' });
  }
});

// Create a backup (for version history)
router.post('/backup/:mediaId/:transcriptionNumber', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId, transcriptionNumber } = req.params;
    const { blocks, speakers, projectName, transcriptionTitle, mediaFile } = req.body;
    
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const sessionDir = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`);
    const backupsDir = path.join(sessionDir, 'backups');
    
    await ensureDir(backupsDir);
    
    // Get version number
    const files = await fs.readdir(backupsDir);
    const versions = files
      .filter(f => f.startsWith('v') && f.endsWith('.txt'))
      .map(f => {
        const match = f.match(/v(\d+)_/);
        return match ? parseInt(match[1]) : 0;
      });
    const nextVersion = Math.max(0, ...versions) + 1;
    
    // Create backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupsDir, `v${nextVersion}_${timestamp}.txt`);
    
    // Format content with version number
    const content = formatBlocksToTxt(blocks, speakers, projectName, transcriptionTitle, mediaFile)
      .replace('Version: CURRENT', `Version: ${nextVersion}`);
    
    // Write backup with BOM
    const BOM = '\uFEFF';
    await fs.writeFile(backupFile, BOM + content, 'utf8');
    
    // Clean old backups (keep last 20)
    const allBackups = await fs.readdir(backupsDir);
    const txtBackups = allBackups.filter(f => f.endsWith('.txt')).sort();
    if (txtBackups.length > 20) {
      const toDelete = txtBackups.slice(0, txtBackups.length - 20);
      for (const file of toDelete) {
        await fs.unlink(path.join(backupsDir, file));
      }
    }
    
    res.json({
      success: true,
      version: nextVersion,
      filename: `v${nextVersion}_${timestamp}.txt`
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message || 'Failed to create backup' });
  }
});

// Get version history for a transcription
router.get('/history/:mediaId/:transcriptionNumber', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId, transcriptionNumber } = req.params;
    
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const backupsDir = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`, 'backups');
    
    // Check if directory exists
    try {
      await fs.access(backupsDir);
    } catch {
      return res.json({
        success: true,
        versions: []
      });
    }
    
    // List all backup files
    const files = await fs.readdir(backupsDir);
    const versions = [];
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        
        // Parse version number from filename
        const versionMatch = file.match(/v(\d+)_/);
        const version = versionMatch ? parseInt(versionMatch[1]) : 0;
        
        // Read first part of file for preview
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = parseTxtToBlocks(content.replace(/^\uFEFF/, '').replace(/\uFEFF/g, ''));
        
        versions.push({
          id: file,
          filename: file,
          version,
          created: stats.mtime.toISOString(),
          size: stats.size,
          blocks_count: parsed.blocks.length,
          speakers_count: parsed.speakers.length,
          words_count: parsed.metadata.totalWords || 0
        });
      }
    }
    
    // Sort by version number descending
    versions.sort((a, b) => b.version - a.version);
    
    res.json({
      success: true,
      versions
    });
  } catch (error: any) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: error.message || 'Failed to get history' });
  }
});

// Restore a specific backup version
router.get('/restore/:mediaId/:transcriptionNumber/:filename', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaId, transcriptionNumber, filename } = req.params;
    
    const baseDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', 'user_live', 'sessions');
    const backupFile = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`, 'backups', filename);
    
    // Check if file exists
    try {
      await fs.access(backupFile);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Read and parse file
    const content = await fs.readFile(backupFile, 'utf8');
    const cleanContent = content.replace(/^\uFEFF/, '').replace(/\uFEFF/g, '');
    const parsed = parseTxtToBlocks(cleanContent);
    
    // Also copy to current.txt to make it the active version
    const currentFile = path.join(baseDir, mediaId, `transcription_${transcriptionNumber}`, 'current.txt');
    const BOM = '\uFEFF';
    await fs.writeFile(currentFile, BOM + cleanContent, 'utf8');
    
    res.json({
      success: true,
      ...parsed,
      message: 'Version restored successfully'
    });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message || 'Failed to restore backup' });
  }
});

export default router;