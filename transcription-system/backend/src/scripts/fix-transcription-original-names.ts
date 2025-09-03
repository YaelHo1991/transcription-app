/**
 * Script to fix originalName in existing transcription data.json files
 * This updates the metadata.originalName field to use the correct value from metadata.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function fixTranscriptionOriginalNames() {
  console.log('Starting fix for transcription original names...');
  
  const usersDir = path.join(process.cwd(), 'user_data', 'users');
  
  try {
    const userDirs = await fs.readdir(usersDir);
    
    for (const userId of userDirs) {
      const projectsDir = path.join(usersDir, userId, 'projects');
      
      try {
        const projects = await fs.readdir(projectsDir);
        
        for (const projectId of projects) {
          const projectPath = path.join(projectsDir, projectId);
          const mediaDir = path.join(projectPath, 'media');
          
          try {
            const mediaFolders = await fs.readdir(mediaDir);
            
            for (const mediaId of mediaFolders) {
              const mediaPath = path.join(mediaDir, mediaId);
              const metadataPath = path.join(mediaPath, 'metadata.json');
              const transcriptionPath = path.join(mediaPath, 'transcription', 'data.json');
              
              try {
                // Read metadata.json to get the correct originalName
                const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                const metadata = JSON.parse(metadataContent);
                
                // Check if transcription data exists
                try {
                  const transcriptionContent = await fs.readFile(transcriptionPath, 'utf-8');
                  const transcriptionData = JSON.parse(transcriptionContent);
                  
                  // Check if the originalName needs updating
                  if (transcriptionData.metadata && 
                      transcriptionData.metadata.originalName !== metadata.originalName) {
                    
                    console.log(`Fixing ${projectId}/${mediaId}:`);
                    console.log(`  Old: ${transcriptionData.metadata.originalName}`);
                    console.log(`  New: ${metadata.originalName}`);
                    
                    // Update the originalName
                    transcriptionData.metadata.originalName = metadata.originalName;
                    transcriptionData.lastModified = new Date().toISOString();
                    
                    // Save the updated transcription data
                    await fs.writeFile(transcriptionPath, JSON.stringify(transcriptionData, null, 2));
                    console.log(`  ✓ Fixed`);
                  }
                } catch (err) {
                  // Transcription doesn't exist yet, skip
                }
              } catch (err) {
                // Metadata doesn't exist, skip
              }
            }
          } catch (err) {
            // Media directory doesn't exist, skip
          }
        }
      } catch (err) {
        // Projects directory doesn't exist for this user, skip
      }
    }
    
    // Also fix orphaned transcriptions
    console.log('\nFixing orphaned transcriptions...');
    
    for (const userId of userDirs) {
      const orphanedDir = path.join(usersDir, userId, 'orphaned');
      
      try {
        const orphanFolders = await fs.readdir(orphanedDir);
        
        for (const orphanFolder of orphanFolders) {
          const orphanPath = path.join(orphanedDir, orphanFolder);
          const stats = await fs.stat(orphanPath);
          
          if (stats.isDirectory()) {
            // Check for nested media folders
            const contents = await fs.readdir(orphanPath);
            
            for (const item of contents) {
              const itemPath = path.join(orphanPath, item);
              const itemStats = await fs.stat(itemPath);
              
              if (itemStats.isDirectory()) {
                // This is a media folder
                const transcriptionPath = path.join(itemPath, 'transcription', 'data.json');
                
                try {
                  const content = await fs.readFile(transcriptionPath, 'utf-8');
                  const data = JSON.parse(content);
                  
                  // Check if we need to update orphanedFrom.mediaName
                  if (data.orphanedFrom && data.metadata?.originalName && 
                      data.orphanedFrom.mediaName !== data.metadata.originalName) {
                    
                    console.log(`Fixing orphaned ${orphanFolder}/${item}:`);
                    console.log(`  Old mediaName: ${data.orphanedFrom.mediaName}`);
                    console.log(`  New mediaName: ${data.metadata.originalName}`);
                    
                    data.orphanedFrom.mediaName = data.metadata.originalName;
                    data.lastModified = new Date().toISOString();
                    
                    await fs.writeFile(transcriptionPath, JSON.stringify(data, null, 2));
                    console.log(`  ✓ Fixed`);
                  }
                } catch (err) {
                  // Transcription doesn't exist, skip
                }
              }
            }
          }
        }
      } catch (err) {
        // Orphaned directory doesn't exist for this user, skip
      }
    }
    
    console.log('\n✓ Fix completed successfully');
  } catch (error) {
    console.error('Error during fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixTranscriptionOriginalNames().catch(console.error);