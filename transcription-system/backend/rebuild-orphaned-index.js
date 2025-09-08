const fs = require('fs-extra');
const path = require('path');

async function rebuildOrphanedIndex() {
  const userId = 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
  const orphanedDir = path.join(__dirname, 'user_data', 'users', userId, 'orphaned');
  const indexPath = path.join(orphanedDir, 'orphaned-index.json');
  
  // Create new index
  const index = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    transcriptions: {}
  };
  
  // Scan for orphaned transcription folders
  const items = await fs.readdir(orphanedDir);
  
  for (const item of items) {
    // Skip the index file itself
    if (item === 'orphaned-index.json') continue;
    
    // Handle orphan_ prefixes for folders
    if (item.startsWith('orphan_')) {
      try {
        const itemPath = path.join(orphanedDir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          // Read from transcription/data.json
          const dataPath = path.join(itemPath, 'transcription', 'data.json');
          
          try {
            const data = await fs.readFile(dataPath, 'utf-8');
            const transcriptionData = JSON.parse(data);
            
            // Extract info from folder name: orphan_timestamp_identifier
            const nameWithoutPrefix = item.replace('orphan_', '');
            const parts = nameWithoutPrefix.split('_');
            
            const timestamp = parts[0];
            const identifier = parts.slice(1).join('_');
            
            // Try to extract from orphanedFrom metadata
            let projectId, mediaId, mediaName, projectName;
            
            if (transcriptionData.orphanedFrom) {
              projectId = transcriptionData.orphanedFrom.projectId;
              mediaId = transcriptionData.orphanedFrom.mediaId;
              mediaName = transcriptionData.orphanedFrom.mediaName;
              projectName = transcriptionData.orphanedFrom.projectName;
            } else {
              // Fallback to metadata
              projectId = identifier;
              mediaId = identifier;
              mediaName = transcriptionData.metadata?.originalName || 
                         transcriptionData.metadata?.fileName || 
                         'Unknown Media';
              projectName = transcriptionData.projectName || 'Unknown Project';
            }
            
            const orphanedEntry = {
              transcriptionId: `${projectId}_${mediaId}_${timestamp}`,
              originalProjectId: projectId,
              originalProjectName: projectName,
              originalProjectFolder: item, // Store the actual folder name
              originalMediaId: mediaId,
              originalMediaName: mediaName,
              mediaDuration: transcriptionData.orphanedFrom?.mediaDuration || 
                            transcriptionData.metadata?.duration,
              mediaSize: transcriptionData.orphanedFrom?.mediaSize || 
                        transcriptionData.metadata?.size,
              archivedAt: transcriptionData.orphanedFrom?.orphanedAt || 
                         new Date().toISOString(),
              archivedPath: path.join('orphaned', item, 'transcription'),
              fileSize: 0
            };
            
            const mediaNameKey = mediaName.toLowerCase();
            
            if (!index.transcriptions[mediaNameKey]) {
              index.transcriptions[mediaNameKey] = [];
            }
            
            index.transcriptions[mediaNameKey].push(orphanedEntry);
            
            console.log(`Added ${item} as ${mediaNameKey}`);
          } catch (error) {
            console.error(`Could not read data.json from ${item}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`Error processing item ${item}:`, error.message);
      }
    }
  }
  
  // Save the rebuilt index
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log('\nIndex rebuilt successfully!');
  console.log(`Total media files with archived transcriptions: ${Object.keys(index.transcriptions).length}`);
  
  // Show summary
  for (const [mediaName, transcriptions] of Object.entries(index.transcriptions)) {
    console.log(`  - ${mediaName}: ${transcriptions.length} version(s)`);
  }
}

rebuildOrphanedIndex().catch(console.error);