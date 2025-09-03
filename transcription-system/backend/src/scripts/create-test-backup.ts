/**
 * Script to create a test backup for a media file
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function createTestBackup() {
  const userId = 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
  const projectId = '2025-09-03_00-35-38_002';
  const mediaId = 'media-1';
  
  // Read the current transcription data
  const transcriptionPath = path.join(
    process.cwd(),
    'user_data',
    'users',
    userId,
    'projects',
    projectId,
    'media',
    mediaId,
    'transcription',
    'data.json'
  );
  
  try {
    const transcriptionContent = await fs.readFile(transcriptionPath, 'utf-8');
    const transcriptionData = JSON.parse(transcriptionContent);
    
    // Create backups directory
    const backupDir = path.join(
      process.cwd(),
      'user_data',
      'users',
      userId,
      'projects',
      projectId,
      'media',
      mediaId,
      'backups'
    );
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Create a few test backup versions
    for (let i = 1; i <= 3; i++) {
      const timestamp = new Date(Date.now() - (i * 3600000)).toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_v${i}_${timestamp}.json`;
      const backupPath = path.join(backupDir, backupFileName);
      
      const backupData = {
        ...transcriptionData,
        metadata: {
          ...transcriptionData.metadata,
          version: i,
          backupDate: new Date(Date.now() - (i * 3600000)).toISOString(),
          fileName: backupFileName
        }
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Created backup: ${backupFileName}`);
    }
    
    console.log('✓ Test backups created successfully');
    
  } catch (error) {
    console.error('Error creating test backups:', error);
  }
}

createTestBackup().catch(console.error);