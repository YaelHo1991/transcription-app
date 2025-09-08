const fs = require('fs').promises;
const path = require('path');

/**
 * Script to fix duplicate block IDs in existing transcription files
 * This fixes the React duplicate key warnings by ensuring all blocks have unique IDs
 */

async function fixDuplicateBlockIds() {
  const userDataPath = path.join(__dirname, '..', 'user_data', 'users');
  
  try {
    // Get all user directories
    const userDirs = await fs.readdir(userDataPath);
    
    let totalFixed = 0;
    let totalFiles = 0;
    
    for (const userId of userDirs) {
      const userPath = path.join(userDataPath, userId);
      const stats = await fs.stat(userPath);
      
      if (!stats.isDirectory()) continue;
      
      const projectsPath = path.join(userPath, 'projects');
      
      try {
        const projects = await fs.readdir(projectsPath);
        
        for (const projectId of projects) {
          const projectPath = path.join(projectsPath, projectId);
          const projectStats = await fs.stat(projectPath);
          
          if (!projectStats.isDirectory()) continue;
          
          // Check media folders
          const mediaPath = path.join(projectPath, 'media');
          
          try {
            const mediaFolders = await fs.readdir(mediaPath);
            
            for (const mediaFolder of mediaFolders) {
              const transcriptionPath = path.join(mediaPath, mediaFolder, 'transcription', 'data.json');
              
              try {
                // Read the transcription file
                const content = await fs.readFile(transcriptionPath, 'utf8');
                const data = JSON.parse(content);
                
                if (!data.blocks || !Array.isArray(data.blocks)) continue;
                
                totalFiles++;
                
                // Track seen IDs and fix duplicates
                const seenIds = new Set();
                let hasDuplicates = false;
                
                data.blocks = data.blocks.map((block, index) => {
                  if (!block.id || seenIds.has(block.id)) {
                    // Generate a new unique ID
                    const timestamp = Date.now();
                    const newId = block.id ? 
                      `${block.id}-fixed-${timestamp}-${index}` : 
                      `block-fixed-${timestamp}-${index}`;
                    
                    console.log(`  Fixing duplicate/missing ID in ${projectId}/${mediaFolder}: ${block.id || 'undefined'} -> ${newId}`);
                    hasDuplicates = true;
                    
                    return {
                      ...block,
                      id: newId,
                      _idFixed: true,
                      _originalId: block.id || null,
                      _fixedAt: new Date().toISOString()
                    };
                  }
                  
                  seenIds.add(block.id);
                  return block;
                });
                
                if (hasDuplicates) {
                  // Write the fixed data back
                  await fs.writeFile(transcriptionPath, JSON.stringify(data, null, 2));
                  totalFixed++;
                  console.log(`✓ Fixed ${projectId}/${mediaFolder}/transcription/data.json`);
                }
                
              } catch (error) {
                // Transcription file doesn't exist or can't be read - skip
                if (error.code !== 'ENOENT') {
                  console.error(`Error processing ${transcriptionPath}:`, error.message);
                }
              }
            }
          } catch (error) {
            // Media folder doesn't exist - skip
            if (error.code !== 'ENOENT') {
              console.error(`Error reading media folder ${mediaPath}:`, error.message);
            }
          }
        }
      } catch (error) {
        // Projects folder doesn't exist - skip
        if (error.code !== 'ENOENT') {
          console.error(`Error reading projects folder ${projectsPath}:`, error.message);
        }
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total transcription files checked: ${totalFiles}`);
    console.log(`Files with duplicates fixed: ${totalFixed}`);
    
    if (totalFixed > 0) {
      console.log('\n✅ All duplicate block IDs have been fixed!');
      console.log('The React duplicate key warnings should now be resolved.');
    } else {
      console.log('\n✅ No duplicate block IDs found - all transcriptions are clean!');
    }
    
  } catch (error) {
    console.error('Error running fix:', error);
    process.exit(1);
  }
}

// Run the fix
console.log('Starting duplicate block ID fix...\n');
fixDuplicateBlockIds().catch(console.error);