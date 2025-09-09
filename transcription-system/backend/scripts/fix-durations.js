#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

async function getDurationWithFFprobe(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v quiet -print_format json -show_format "${filePath}"`);
    const data = JSON.parse(stdout);
    return parseFloat(data.format?.duration || 0);
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error.message);
    return 0;
  }
}

async function fixMediaDurations() {
  const baseDir = '/var/www/transcription-system/backend/user_data/users';
  
  try {
    const users = await fs.readdir(baseDir);
    
    for (const userId of users) {
      const userDir = path.join(baseDir, userId);
      const stats = await fs.stat(userDir);
      
      if (!stats.isDirectory()) continue;
      
      const projectsDir = path.join(userDir, 'projects');
      
      try {
        const projects = await fs.readdir(projectsDir);
        
        for (const projectId of projects) {
          const projectDir = path.join(projectsDir, projectId);
          const projectStats = await fs.stat(projectDir);
          
          if (!projectStats.isDirectory()) continue;
          
          const mediaDir = path.join(projectDir, 'media');
          
          try {
            const mediaItems = await fs.readdir(mediaDir);
            
            for (const mediaId of mediaItems) {
              const mediaPath = path.join(mediaDir, mediaId);
              const mediaStats = await fs.stat(mediaPath);
              
              if (!mediaStats.isDirectory()) continue;
              
              const metadataPath = path.join(mediaPath, 'metadata.json');
              
              try {
                const metadataContent = await fs.readFile(metadataPath, 'utf8');
                const metadata = JSON.parse(metadataContent);
                
                // Check if duration is missing or 0
                if (!metadata.duration || metadata.duration === 0) {
                  // Find audio file
                  const files = await fs.readdir(mediaPath);
                  const audioFile = files.find(f => 
                    f.endsWith('.mp3') || f.endsWith('.wav') || 
                    f.endsWith('.m4a') || f.endsWith('.aac') ||
                    f.endsWith('.ogg') || f.endsWith('.flac')
                  );
                  
                  if (audioFile) {
                    const audioPath = path.join(mediaPath, audioFile);
                    const duration = await getDurationWithFFprobe(audioPath);
                    
                    if (duration > 0) {
                      metadata.duration = duration;
                      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                      console.log(`Fixed duration for ${userId}/${projectId}/${mediaId}: ${duration}s`);
                    }
                  }
                }
              } catch (error) {
                // No metadata file or error reading it
              }
            }
          } catch (error) {
            // No media directory
          }
        }
      } catch (error) {
        // No projects directory
      }
    }
    
    console.log('Duration fix completed!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixMediaDurations();