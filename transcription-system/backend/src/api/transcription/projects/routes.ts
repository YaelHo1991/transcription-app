import { Router, Request, Response } from 'express';
import { ProjectModel } from '../../../models/project.model';
import { authenticateToken } from '../../../middleware/auth.middleware';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Create a new project
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await ProjectModel.create(userId, name, description);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get all projects for a user
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Users can only access their own projects
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projects = await ProjectModel.findByUserId(userId);
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a specific project
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const project = await ProjectModel.findById(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update a project
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    // Verify ownership
    const existing = await ProjectModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await ProjectModel.update(id, updates);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project (soft delete + remove files)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // For filesystem-based projects (timestamp format like 2025-08-20_21-13-34_087)
    if (id.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{3}$/)) {
      // Delete project folder from filesystem directly
      const userDataPath = path.join(__dirname, '../../../../user_data');
      const projectPath = path.join(userDataPath, 'user_live', 'projects', id);
      
      try {
        // Check if folder exists before trying to delete
        await fs.access(projectPath);
        // Delete the project folder and all its contents
        await fs.rm(projectPath, { recursive: true, force: true });
        // console.log removed for production
        return res.json({ success: true, message: 'Project folder deleted successfully' });
      } catch (fsError) {
        // console.log removed for production
        return res.status(404).json({ error: 'Project folder not found' });
      }
    }
    
    // For database-based projects (numeric IDs)
    // Verify ownership
    const existing = await ProjectModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found in database' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete project folder from filesystem
    const userDataPath = path.join(__dirname, '../../../../user_data');
    const projectPath = path.join(userDataPath, `user_${userId}`, 'projects', id);
    
    try {
      // Check if folder exists before trying to delete
      await fs.access(projectPath);
      // Delete the project folder and all its contents
      await fs.rm(projectPath, { recursive: true, force: true });
      // console.log removed for production
    } catch (fsError) {
      // Folder might not exist, log but don't fail the request
      // console.log removed for production
    }

    // Delete from database
    const success = await ProjectModel.delete(id);
    res.json({ success, message: 'Project and files deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;