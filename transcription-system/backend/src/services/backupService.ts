import fs from 'fs/promises';
import path from 'path';
import { BackupModel } from '../models/backup.model';
import { TranscriptionModel } from '../models/transcription.model';

export interface BackupContent {
  projectName?: string;
  transcriptionTitle: string;
  date: Date;
  version: number;
  mediaFiles: Array<{ name: string; type: 'local' | 'external'; url?: string }>;
  speakers: Array<{ code: string; name: string; description?: string }>;
  blocks: Array<{
    timestamp?: string;
    speaker?: string;
    text: string;
  }>;
  metadata: {
    totalWords: number;
    totalBlocks: number;
    totalSpeakers: number;
  };
}

export class BackupService {
  private static readonly BASE_PATH = path.join(__dirname, '..', '..', 'user_data');

  /**
   * Creates the user data directory structure
   */
  static async ensureUserDataStructure(userId: string): Promise<void> {
    const userPath = path.join(this.BASE_PATH, `user_${userId}`);
    const dirs = [
      userPath,
      path.join(userPath, 'projects'),
      path.join(userPath, 'standalone_transcriptions'),
      path.join(userPath, 'uploads'),
      path.join(userPath, 'crm'),
      path.join(userPath, 'settings')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Creates project directory structure
   */
  static async ensureProjectStructure(userId: string, projectName: string): Promise<void> {
    const projectPath = path.join(this.BASE_PATH, `user_${userId}`, 'projects', this.sanitizeName(projectName));
    const dirs = [
      projectPath,
      path.join(projectPath, 'transcriptions'),
      path.join(projectPath, 'media'),
      path.join(projectPath, 'crm'),
      path.join(projectPath, 'archives')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Creates transcription backup directory
   */
  static async ensureTranscriptionBackupDir(
    userId: string,
    transcriptionId: string,
    projectName?: string,
    mediaName?: string
  ): Promise<string> {
    let backupDir: string;
    
    if (projectName) {
      backupDir = path.join(
        this.BASE_PATH,
        `user_${userId}`,
        'projects',
        this.sanitizeName(projectName),
        'transcriptions',
        transcriptionId,
        'backups'
      );
    } else if (mediaName) {
      backupDir = path.join(
        this.BASE_PATH,
        `user_${userId}`,
        'standalone_transcriptions',
        this.sanitizeName(mediaName),
        transcriptionId,
        'backups'
      );
    } else {
      backupDir = path.join(
        this.BASE_PATH,
        `user_${userId}`,
        'standalone_transcriptions',
        'no_media',
        transcriptionId,
        'backups'
      );
    }

    await fs.mkdir(backupDir, { recursive: true });
    return backupDir;
  }

  /**
   * Generates the TXT backup content
   */
  static generateBackupContent(content: BackupContent): string {
    const lines: string[] = [];
    
    // Header
    lines.push('=== TRANSCRIPTION BACKUP ===');
    if (content.projectName) {
      lines.push(`Project: ${content.projectName}`);
    }
    lines.push(`Transcription: ${content.transcriptionTitle}`);
    lines.push(`Date: ${content.date.toISOString()}`);
    lines.push(`Version: ${content.version}`);
    
    // Media files
    if (content.mediaFiles.length > 0) {
      lines.push('Media Files:');
      content.mediaFiles.forEach(media => {
        if (media.type === 'local') {
          lines.push(`  - ${media.name} (local)`);
        } else {
          lines.push(`  - ${media.url} (external)`);
        }
      });
    }
    
    lines.push('');
    
    // Speakers
    if (content.speakers.length > 0) {
      lines.push('=== SPEAKERS ===');
      content.speakers.forEach(speaker => {
        const desc = speaker.description ? ` (${speaker.description})` : '';
        lines.push(`${speaker.code}: ${speaker.name}${desc}`);
      });
      lines.push('');
    }
    
    // Transcript
    lines.push('=== TRANSCRIPT ===');
    content.blocks.forEach(block => {
      const timestamp = block.timestamp || '';
      const speaker = block.speaker ? `[${block.speaker}]` : '';
      const prefix = timestamp || speaker ? `${timestamp} ${speaker}: ` : '';
      lines.push(`${prefix}${block.text}`);
    });
    
    lines.push('');
    
    // Metadata
    lines.push('=== METADATA ===');
    lines.push(`Total Words: ${content.metadata.totalWords}`);
    lines.push(`Total Blocks: ${content.metadata.totalBlocks}`);
    lines.push(`Total Speakers: ${content.metadata.totalSpeakers}`);
    
    return lines.join('\n');
  }

  /**
   * Creates a backup file
   */
  static async createBackup(
    userId: string,
    transcriptionId: string,
    content: BackupContent,
    projectName?: string,
    mediaName?: string
  ): Promise<string> {
    // Ensure backup directory exists
    const backupDir = await this.ensureTranscriptionBackupDir(
      userId,
      transcriptionId,
      projectName,
      mediaName
    );

    // Get next version number
    const latestVersion = await BackupModel.getLatestVersion(transcriptionId);
    const newVersion = latestVersion + 1;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `v${newVersion}_${timestamp}.txt`;
    const filePath = path.join(backupDir, filename);

    // Update content version
    content.version = newVersion;
    content.date = new Date();

    // Generate and write backup content
    const backupText = this.generateBackupContent(content);
    await fs.writeFile(filePath, backupText, 'utf8');

    // Save metadata
    const metadataPath = path.join(backupDir, 'metadata.json');
    const metadata = {
      lastBackup: new Date().toISOString(),
      totalBackups: newVersion,
      backups: await this.getBackupMetadata(backupDir)
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Record in database
    await BackupModel.create(transcriptionId, newVersion, filePath, {
      file_size: Buffer.byteLength(backupText),
      blocks_count: content.metadata.totalBlocks,
      speakers_count: content.metadata.totalSpeakers,
      words_count: content.metadata.totalWords,
      change_summary: `Backup v${newVersion} created`
    });

    // Update transcription last_backup_at
    await TranscriptionModel.update(transcriptionId, {
      last_backup_at: new Date(),
      current_version: newVersion
    });

    return filePath;
  }

  /**
   * Reads a backup file
   */
  static async readBackup(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Restores from a backup
   */
  static async restoreBackup(backupId: string): Promise<BackupContent | null> {
    const backup = await BackupModel.findById(backupId);
    if (!backup) return null;

    const content = await this.readBackup(backup.file_path);
    return this.parseBackupContent(content);
  }

  /**
   * Parses backup TXT content back to structured data
   */
  static parseBackupContent(content: string): BackupContent {
    const lines = content.split('\n');
    const result: BackupContent = {
      transcriptionTitle: '',
      date: new Date(),
      version: 0,
      mediaFiles: [],
      speakers: [],
      blocks: [],
      metadata: { totalWords: 0, totalBlocks: 0, totalSpeakers: 0 }
    };

    let section = '';
    
    for (const line of lines) {
      // Section markers
      if (line.startsWith('=== ')) {
        section = line.replace(/=/g, '').trim().toLowerCase();
        continue;
      }

      // Parse header section
      if (section === 'transcription backup') {
        if (line.startsWith('Project: ')) {
          result.projectName = line.substring(9);
        } else if (line.startsWith('Transcription: ')) {
          result.transcriptionTitle = line.substring(15);
        } else if (line.startsWith('Date: ')) {
          result.date = new Date(line.substring(6));
        } else if (line.startsWith('Version: ')) {
          result.version = parseInt(line.substring(9));
        } else if (line.startsWith('  - ')) {
          // Media file
          const mediaMatch = line.match(/  - (.+) \((local|external)\)/);
          if (mediaMatch) {
            result.mediaFiles.push({
              name: mediaMatch[1],
              type: mediaMatch[2] as 'local' | 'external',
              url: mediaMatch[2] === 'external' ? mediaMatch[1] : undefined
            });
          }
        }
      }

      // Parse speakers section
      if (section === 'speakers' && line.trim()) {
        const speakerMatch = line.match(/^([^:]+): ([^(]+)(?:\(([^)]+)\))?/);
        if (speakerMatch) {
          result.speakers.push({
            code: speakerMatch[1].trim(),
            name: speakerMatch[2].trim(),
            description: speakerMatch[3]?.trim()
          });
        }
      }

      // Parse transcript section
      if (section === 'transcript' && line.trim()) {
        const blockMatch = line.match(/^(?:(\d{2}:\d{2}:\d{2})?\s*)?(?:\[([^\]]+)\])?: (.+)/);
        if (blockMatch) {
          result.blocks.push({
            timestamp: blockMatch[1],
            speaker: blockMatch[2],
            text: blockMatch[3]
          });
        } else {
          result.blocks.push({ text: line });
        }
      }

      // Parse metadata section
      if (section === 'metadata') {
        if (line.startsWith('Total Words: ')) {
          result.metadata.totalWords = parseInt(line.substring(13));
        } else if (line.startsWith('Total Blocks: ')) {
          result.metadata.totalBlocks = parseInt(line.substring(14));
        } else if (line.startsWith('Total Speakers: ')) {
          result.metadata.totalSpeakers = parseInt(line.substring(16));
        }
      }
    }

    return result;
  }

  /**
   * Gets backup metadata for a directory
   */
  private static async getBackupMetadata(backupDir: string): Promise<any[]> {
    const files = await fs.readdir(backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const versionMatch = file.match(/v(\d+)_/);
        
        backups.push({
          filename: file,
          version: versionMatch ? parseInt(versionMatch[1]) : 0,
          size: stats.size,
          created: stats.birthtime
        });
      }
    }

    return backups.sort((a, b) => b.version - a.version);
  }

  /**
   * Cleans up old backups
   */
  static async cleanupOldBackups(
    transcriptionId: string,
    keepCount: number = 100
  ): Promise<void> {
    const filePaths = await BackupModel.deleteOldBackups(transcriptionId, keepCount);
    
    // Delete the actual files
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete backup file: ${filePath}`, error);
      }
    }
  }

  /**
   * Sanitizes names for file system
   */
  private static sanitizeName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 255);
  }
}