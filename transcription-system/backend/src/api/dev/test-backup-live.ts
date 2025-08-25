import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

/**
 * Create a backup from live editor data
 */
export async function testCreateBackupLive(req: Request, res: Response) {
  try {
    // console.log removed for production
    
    const { blocks, speakers, projectName, transcriptionTitle, mediaFile } = req.body;
    
    // Generate backup content
    const lines: string[] = [];
    
    // Header
    lines.push('=== TRANSCRIPTION BACKUP ===');
    lines.push(`Project: ${projectName || 'No Project'}`);
    lines.push(`Transcription: ${transcriptionTitle || 'Untitled'}`);
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push(`Version: AUTO`);
    lines.push(`Media Files:`);
    lines.push(`  - ${mediaFile || 'No Media'} (current)`);
    lines.push('');
    
    // Speakers
    if (speakers && speakers.length > 0) {
      lines.push('=== SPEAKERS ===');
      speakers.forEach((speaker: any) => {
        lines.push(`${speaker.code}: ${speaker.name || speaker.code} (Color: ${speaker.color || 'default'})`);
      });
      lines.push('');
    }
    
    // Transcript
    lines.push('=== TRANSCRIPT ===');
    if (blocks && blocks.length > 0) {
      blocks.forEach((block: any) => {
        const timestamp = block.timestamp || '';
        const speaker = block.speaker ? `[${block.speaker}]` : '';
        const text = block.text || '';
        
        if (timestamp || speaker) {
          lines.push(`${timestamp} ${speaker}: ${text}`);
        } else {
          lines.push(text);
        }
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
    
    const backupContent = lines.join('\n');
    
    // Create directory structure
    const baseDir = path.join(__dirname, '..', '..', '..', 'user_data');
    const userDir = path.join(baseDir, 'user_live');
    const sessionId = Date.now().toString();
    const backupsDir = path.join(userDir, 'sessions', sessionId, 'backups');
    
    await fs.mkdir(backupsDir, { recursive: true });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `live_${timestamp}.txt`;
    const filePath = path.join(backupsDir, filename);
    
    // Write the backup file with UTF-8 BOM for proper Hebrew support
    const BOM = '\uFEFF';
    await fs.writeFile(filePath, BOM + backupContent, 'utf8');
    
    // console.log removed for production
    // console.log removed for production);
    
    res.json({
      success: true,
      message: 'Live backup created successfully!',
      filename,
      filePath,
      fileSize: Buffer.byteLength(backupContent),
      stats: {
        totalWords,
        totalBlocks: blocks?.length || 0,
        totalSpeakers: speakerCount
      },
      preview: backupContent.substring(0, 500)
    });
    
  } catch (error: any) {
    console.error('Live backup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create live backup'
    });
  }
}

/**
 * List all live backup sessions
 */
export async function listLiveBackups(req: Request, res: Response) {
  try {
    const baseDir = path.join(__dirname, '..', '..', '..', 'user_data', 'user_live', 'sessions');
    
    // Check if directory exists
    try {
      await fs.access(baseDir);
    } catch {
      return res.json({
        success: true,
        sessions: [],
        message: 'No backup sessions found'
      });
    }
    
    const sessions = await fs.readdir(baseDir);
    const sessionDetails = [];
    
    for (const session of sessions) {
      const backupsDir = path.join(baseDir, session, 'backups');
      try {
        const files = await fs.readdir(backupsDir);
        const txtFiles = files.filter(f => f.endsWith('.txt'));
        
        if (txtFiles.length > 0) {
          const stats = await fs.stat(path.join(backupsDir, txtFiles[0]));
          sessionDetails.push({
            sessionId: session,
            backupCount: txtFiles.length,
            files: txtFiles,
            created: stats.birthtime
          });
        }
      } catch (err) {
        // console.log removed for production
      }
    }
    
    res.json({
      success: true,
      sessions: sessionDetails.sort((a, b) => b.created.getTime() - a.created.getTime())
    });
    
  } catch (error: any) {
    console.error('List backups failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list backups'
    });
  }
}