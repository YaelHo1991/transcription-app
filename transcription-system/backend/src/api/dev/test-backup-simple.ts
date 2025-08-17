import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

/**
 * Simple test to create a TXT backup file without database dependencies
 */
export async function testCreateBackupSimple(req: Request, res: Response) {
  try {
    console.log('Simple backup test - creating TXT file directly');
    
    // Test content
    const backupContent = `=== TRANSCRIPTION BACKUP ===
Project: Test Project
Transcription: Test Transcription  
Date: ${new Date().toISOString()}
Version: 1
Media Files:
  - interview.mp3 (local)
  - https://example.com/video.mp4 (external)

=== SPEAKERS ===
J: John (Interviewer)
M: Mary (Interviewee)
S: Sarah (Guest Speaker)

=== TRANSCRIPT ===
00:00:00 [J]: שלום וברוכים הבאים לראיון של היום. אני שמח להיות כאן עם מרי.
00:00:15 [M]: תודה רבה על ההזמנה. אני נרגשת להיות כאן ולשתף את הסיפור שלי.
00:00:30 [J]: נתחיל מההתחלה. ספרי לנו איך התחלת את המסע שלך בתחום הטכנולוגיה?
00:00:45 [M]: זה התחיל לפני כעשר שנים. הייתי סטודנטית למדעי המחשב ונתקלתי בפרויקט קוד פתוח שממש קסם לי.
00:01:10 [J]: מעניין מאוד! איזה פרויקט זה היה?
00:01:20 [M]: זה היה פרויקט של עיבוד שפה טבעית בעברית. היה חסר הרבה תמיכה לעברית באותה תקופה.
00:01:35 [S]: אם מותר לי להתערב, אני זוכרת את הפרויקט הזה. הוא היה פורץ דרך באמת.
00:01:50 [M]: כן, שרה הייתה אחת המנטוריות שלי! היא עזרה לי המון בהתחלה.
00:02:05 [J]: איזה צירוף מקרים נפלא! שרה, תוכלי לספר לנו על התרומה של מרי לפרויקט?
00:02:20 [S]: מרי הביאה פרספקטיבה חדשה לגמרי. היא פיתחה אלגוריתם שיפר את הדיוק ב-40 אחוז.

=== METADATA ===
Total Words: 150
Total Blocks: 10
Total Speakers: 3`;

    // Create directory structure
    const baseDir = path.join(__dirname, '..', '..', '..', 'user_data');
    const userDir = path.join(baseDir, 'user_999');
    const projectDir = path.join(userDir, 'projects', 'Test_Project');
    const transcriptionDir = path.join(projectDir, 'transcriptions', 'test-transcription-001');
    const backupsDir = path.join(transcriptionDir, 'backups');
    
    // Ensure all directories exist
    await fs.mkdir(backupsDir, { recursive: true });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `v1_${timestamp}.txt`;
    const filePath = path.join(backupsDir, filename);
    
    // Write the backup file
    await fs.writeFile(filePath, backupContent, 'utf8');
    
    // Also create a metadata file
    const metadata = {
      lastBackup: new Date().toISOString(),
      totalBackups: 1,
      backups: [{
        filename,
        version: 1,
        size: Buffer.byteLength(backupContent),
        created: new Date().toISOString()
      }]
    };
    
    const metadataPath = path.join(backupsDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    
    console.log('Backup file created at:', filePath);
    
    res.json({
      success: true,
      message: 'Test backup TXT file created successfully!',
      filePath,
      fileSize: Buffer.byteLength(backupContent),
      preview: backupContent.substring(0, 500) + '...'
    });

  } catch (error: any) {
    console.error('Simple backup test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test backup'
    });
  }
}

/**
 * Read the test backup file
 */
export async function testReadBackupSimple(req: Request, res: Response) {
  try {
    const backupsDir = path.join(__dirname, '..', '..', '..', 'user_data', 'user_999', 
      'projects', 'Test_Project', 'transcriptions', 'test-transcription-001', 'backups');
    
    // Read directory
    const files = await fs.readdir(backupsDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No backup files found'
      });
    }
    
    // Read the most recent backup
    const latestFile = txtFiles.sort().pop();
    const filePath = path.join(backupsDir, latestFile!);
    const content = await fs.readFile(filePath, 'utf8');
    
    res.json({
      success: true,
      filename: latestFile,
      filePath,
      content,
      lines: content.split('\n').length,
      size: Buffer.byteLength(content)
    });
    
  } catch (error: any) {
    console.error('Read backup test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read test backup'
    });
  }
}