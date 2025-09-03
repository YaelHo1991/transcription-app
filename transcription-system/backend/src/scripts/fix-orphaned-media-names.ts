import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script to fix orphaned transcriptions that are missing mediaName field
 */
async function fixOrphanedMediaNames() {
  const basePath = path.join(__dirname, '..', '..', 'user_data', 'users');
  
  try {
    // Get all user directories
    const users = await fs.readdir(basePath);
    
    for (const userId of users) {
      const orphanedPath = path.join(basePath, userId, 'orphaned');
      
      try {
        const orphanFolders = await fs.readdir(orphanedPath);
        
        for (const orphanFolder of orphanFolders) {
          const orphanPath = path.join(orphanedPath, orphanFolder);
          const stats = await fs.stat(orphanPath);
          
          if (stats.isDirectory()) {
            // Try to find transcription data in media subdirectories
            const items = await fs.readdir(orphanPath);
            
            for (const item of items) {
              if (item.startsWith('media-')) {
                const transcriptionPath = path.join(orphanPath, item, 'transcription', 'data.json');
                
                try {
                  const data = JSON.parse(await fs.readFile(transcriptionPath, 'utf-8'));
                  
                  // Check if orphanedFrom exists but mediaName is missing
                  if (data.orphanedFrom && !data.orphanedFrom.mediaName) {
                    console.log(`Fixing orphaned transcription: ${orphanFolder}/${item}`);
                    
                    // Try to get media name from metadata
                    let mediaName = data.metadata?.originalName || 
                                  data.metadata?.fileName || 
                                  data.orphanedFrom.mediaId || 
                                  item;
                    
                    // Update the orphanedFrom object
                    data.orphanedFrom.mediaName = mediaName;
                    
                    // Write back the updated data
                    await fs.writeFile(transcriptionPath, JSON.stringify(data, null, 2));
                    console.log(`  Updated mediaName to: ${mediaName}`);
                  }
                } catch (error) {
                  // Not a valid transcription or already has mediaName
                }
              }
            }
            
            // Also check for direct transcription folder (old format)
            const directTranscriptionPath = path.join(orphanPath, 'transcription', 'data.json');
            try {
              const data = JSON.parse(await fs.readFile(directTranscriptionPath, 'utf-8'));
              
              if (data.orphanedFrom && !data.orphanedFrom.mediaName) {
                console.log(`Fixing orphaned transcription: ${orphanFolder}`);
                
                let mediaName = data.metadata?.originalName || 
                              data.metadata?.fileName || 
                              data.orphanedFrom.mediaId || 
                              'Unknown Media';
                
                data.orphanedFrom.mediaName = mediaName;
                await fs.writeFile(directTranscriptionPath, JSON.stringify(data, null, 2));
                console.log(`  Updated mediaName to: ${mediaName}`);
              }
            } catch {
              // Not a transcription or already has mediaName
            }
          }
        }
        
        console.log(`Processed orphaned transcriptions for user: ${userId}`);
      } catch (error) {
        // User doesn't have orphaned folder yet
      }
    }
    
    console.log('Finished fixing orphaned media names');
  } catch (error) {
    console.error('Error fixing orphaned media names:', error);
  }
}

// Run the script
fixOrphanedMediaNames();