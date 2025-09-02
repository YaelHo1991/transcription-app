const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/projects/test', (req, res) => {
  res.json({ success: true, message: 'Test server works!' });
});

// List projects
app.get('/api/projects/list', async (req, res) => {
  try {
    const projectsDir = path.join(__dirname, 'user_data/users/dev-anonymous/projects');
    
    // Check if directory exists
    try {
      await fs.access(projectsDir);
    } catch {
      return res.json({ success: true, projects: [], count: 0 });
    }
    
    const projectDirs = await fs.readdir(projectsDir);
    const projects = [];
    
    for (const projectId of projectDirs) {
      const projectPath = path.join(projectsDir, projectId, 'project.json');
      try {
        const data = await fs.readFile(projectPath, 'utf-8');
        projects.push(JSON.parse(data));
      } catch (err) {
        console.log('Error reading project:', projectId, err.message);
      }
    }
    
    res.json({ success: true, projects, count: projects.length });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create project from folder
app.post('/api/projects/create-from-folder', upload.array('files'), async (req, res) => {
  try {
    const { folderName, computerId, computerName } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Generate project ID
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Create project directory
    const projectDir = path.join(__dirname, 'user_data/users/dev-anonymous/projects', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Filter media files
    const mediaFiles = files.filter(file => 
      file.mimetype.startsWith('audio/') || 
      file.mimetype.startsWith('video/')
    );
    
    if (mediaFiles.length === 0) {
      return res.status(400).json({ error: 'No media files found' });
    }
    
    // Create media directory and save files
    const mediaDir = path.join(projectDir, 'media');
    await fs.mkdir(mediaDir, { recursive: true });
    
    const mediaIds = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const mediaId = `media_${i + 1}`;
      const filePath = path.join(mediaDir, `${mediaId}_${file.originalname}`);
      await fs.writeFile(filePath, file.buffer);
      mediaIds.push(mediaId);
    }
    
    // Create project metadata
    const projectData = {
      projectId,
      name: folderName || 'New Project',
      displayName: folderName || 'New Project',
      mediaFiles: mediaIds,
      totalMedia: mediaIds.length,
      currentMediaIndex: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      computerId,
      computerName
    };
    
    // Save project.json
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(projectData, null, 2)
    );
    
    res.json({
      success: true,
      projectId,
      project: projectData
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server on port 5001
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test it at: http://localhost:${PORT}/api/projects/test`);
});