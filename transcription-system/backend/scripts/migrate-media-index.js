const fs = require('fs-extra');
const path = require('path');

/**
 * Migration script to add media-index.json to all existing projects
 * This analyzes existing media folders and creates proper index files
 */

async function migrateMediaIndex() {
  const userDataPath = path.join(__dirname, '..', 'user_data', 'users');
  
  try {
    // Get all user directories
    const users = await fs.readdir(userDataPath);
    
    for (const userId of users) {
      const userPath = path.join(userDataPath, userId);
      const stats = await fs.stat(userPath);
      
      if (!stats.isDirectory()) continue;
      
      const projectsPath = path.join(userPath, 'projects');
      
      if (!(await fs.pathExists(projectsPath))) continue;
      
      // Get all projects for this user
      const projects = await fs.readdir(projectsPath);
      
      for (const projectId of projects) {
        const projectPath = path.join(projectsPath, projectId);
        const projectStats = await fs.stat(projectPath);
        
        if (!projectStats.isDirectory()) continue;
        
        console.log(`Processing project: ${userId}/${projectId}`);
        
        // Check if media-index.json already exists
        const indexPath = path.join(projectPath, 'media-index.json');
        
        if (await fs.pathExists(indexPath)) {
          console.log(`  Media index already exists, skipping...`);
          continue;
        }
        
        // Load project.json to get media files and fix duplicates
        const projectJsonPath = path.join(projectPath, 'project.json');
        
        if (!(await fs.pathExists(projectJsonPath))) {
          console.log(`  No project.json found, skipping...`);
          continue;
        }
        
        const projectData = await fs.readJson(projectJsonPath);
        
        // Remove duplicates from mediaFiles array
        const uniqueMediaFiles = [...new Set(projectData.mediaFiles || [])];
        const hadDuplicates = uniqueMediaFiles.length !== (projectData.mediaFiles || []).length;
        
        if (hadDuplicates) {
          console.log(`  Fixed duplicate media entries in project.json`);
          projectData.mediaFiles = uniqueMediaFiles;
          projectData.totalMedia = uniqueMediaFiles.length;
          await fs.writeJson(projectJsonPath, projectData, { spaces: 2 });
        }
        
        // Analyze media folder to build index
        const mediaPath = path.join(projectPath, 'media');
        let activeMediaIds = [];
        let highestNumber = 0;
        let existingNumbers = new Set();
        
        if (await fs.pathExists(mediaPath)) {
          const mediaFolders = await fs.readdir(mediaPath);
          
          for (const mediaFolder of mediaFolders) {
            if (mediaFolder.startsWith('media-')) {
              const mediaFolderPath = path.join(mediaPath, mediaFolder);
              const mediaStat = await fs.stat(mediaFolderPath);
              
              if (mediaStat.isDirectory()) {
                activeMediaIds.push(mediaFolder);
                
                // Extract number from media-N
                const number = parseInt(mediaFolder.replace('media-', ''));
                if (!isNaN(number)) {
                  existingNumbers.add(number);
                  if (number > highestNumber) {
                    highestNumber = number;
                  }
                }
              }
            }
          }
        }
        
        // Find gaps in the sequence
        const availableNumbers = [];
        for (let i = 1; i < highestNumber; i++) {
          if (!existingNumbers.has(i)) {
            availableNumbers.push(i);
          }
        }
        
        // Create media index
        const mediaIndex = {
          nextMediaNumber: highestNumber + 1,
          availableNumbers: availableNumbers,
          activeMediaIds: activeMediaIds.sort(),
          lastUpdated: new Date().toISOString()
        };
        
        // Save media index
        await fs.writeJson(indexPath, mediaIndex, { spaces: 2 });
        console.log(`  Created media index: ${activeMediaIds.length} media files, next: ${mediaIndex.nextMediaNumber}, gaps: ${availableNumbers.join(', ') || 'none'}`);
      }
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('Starting media index migration...\n');
migrateMediaIndex();