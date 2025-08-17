import { Request, Response } from 'express';
import { BackupService, BackupContent } from '../../services/backupService';
import { db } from '../../db/connection';

/**
 * Test endpoint to create a real backup file
 * This bypasses authentication for testing purposes
 */
export async function testCreateBackup(req: Request, res: Response) {
  console.log('Test backup endpoint called');
  try {
    // Test data that matches what the TextEditor would send
    const testContent: BackupContent = {
      projectName: 'Test Project',
      transcriptionTitle: 'Test Transcription',
      date: new Date(),
      version: 1,
      mediaFiles: [
        { name: 'interview.mp3', type: 'local' },
        { name: 'https://example.com/video.mp4', type: 'external', url: 'https://example.com/video.mp4' }
      ],
      speakers: [
        { code: 'J', name: 'John', description: 'Interviewer' },
        { code: 'M', name: 'Mary', description: 'Interviewee' },
        { code: 'S', name: 'Sarah', description: 'Guest Speaker' }
      ],
      blocks: [
        {
          timestamp: '00:00:00',
          speaker: 'J',
          text: 'שלום וברוכים הבאים לראיון של היום. אני שמח להיות כאן עם מרי.'
        },
        {
          timestamp: '00:00:15',
          speaker: 'M',
          text: 'תודה רבה על ההזמנה. אני נרגשת להיות כאן ולשתף את הסיפור שלי.'
        },
        {
          timestamp: '00:00:30',
          speaker: 'J',
          text: 'נתחיל מההתחלה. ספרי לנו איך התחלת את המסע שלך בתחום הטכנולוגיה?'
        },
        {
          timestamp: '00:00:45',
          speaker: 'M',
          text: 'זה התחיל לפני כעשר שנים. הייתי סטודנטית למדעי המחשב ונתקלתי בפרויקט קוד פתוח שממש קסם לי. מאז לא הפסקתי לתרום ולפתח.'
        },
        {
          timestamp: '00:01:10',
          speaker: 'J',
          text: 'מעניין מאוד! איזה פרויקט זה היה?'
        },
        {
          timestamp: '00:01:20',
          speaker: 'M',
          text: 'זה היה פרויקט של עיבוד שפה טבעית בעברית. היה חסר הרבה תמיכה לעברית באותה תקופה.'
        },
        {
          timestamp: '00:01:35',
          speaker: 'S',
          text: 'אם מותר לי להתערב, אני זוכרת את הפרויקט הזה. הוא היה פורץ דרך באמת.'
        },
        {
          timestamp: '00:01:50',
          speaker: 'M',
          text: 'כן, שרה הייתה אחת המנטוריות שלי! היא עזרה לי המון בהתחלה.'
        },
        {
          timestamp: '00:02:05',
          speaker: 'J',
          text: 'איזה צירוף מקרים נפלא! שרה, תוכלי לספר לנו על התרומה של מרי לפרויקט?'
        },
        {
          timestamp: '00:02:20',
          speaker: 'S',
          text: 'מרי הביאה פרספקטיבה חדשה לגמרי. היא פיתחה אלגוריתם שיפר את הדיוק ב-40 אחוז.'
        }
      ],
      metadata: {
        totalWords: 150,
        totalBlocks: 10,
        totalSpeakers: 3
      }
    };

    // Use test user ID (as integer for database, string for file operations)
    const userIdNumber = 999; // Test user ID as number for database
    const userId = userIdNumber.toString(); // String version for file operations
    
    // First, ensure the test user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userIdNumber]);
    if (userCheck.rows.length === 0) {
      // Create test user
      await db.query(`
        INSERT INTO users (id, username, password, email, full_name)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [userIdNumber, 'testuser', 'hashed', 'test@test.com', 'Test User']);
    }
    
    // Generate a unique UUID for transcription
    const transcriptionId = 'a1b2c3d4-e5f6-7890-abcd-' + Date.now().toString().slice(-12);
    
    // Create the transcription record in the database
    await db.query(`
      INSERT INTO transcriptions (id, user_id, title, current_version)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `, [transcriptionId, userIdNumber, testContent.transcriptionTitle, 0]);

    // Ensure user directory structure exists
    await BackupService.ensureUserDataStructure(userId);
    
    // If project name exists, ensure project structure
    if (testContent.projectName) {
      await BackupService.ensureProjectStructure(userId, testContent.projectName);
    }

    // Create the backup
    const filePath = await BackupService.createBackup(
      userId,
      transcriptionId,
      testContent,
      testContent.projectName,
      testContent.mediaFiles[0]?.name
    );

    res.json({
      success: true,
      message: 'Test backup created successfully',
      filePath,
      transcriptionId,
      version: testContent.version
    });

  } catch (error: any) {
    console.error('Test backup creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test backup'
    });
  }
}

/**
 * Test endpoint to read a backup file
 */
export async function testReadBackup(req: Request, res: Response) {
  try {
    const { filePath } = req.query;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const content = await BackupService.readBackup(filePath);
    
    res.json({
      success: true,
      content,
      parsed: BackupService.parseBackupContent(content)
    });

  } catch (error: any) {
    console.error('Test backup read failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read test backup'
    });
  }
}