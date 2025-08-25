import express from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';

const execPromise = promisify(exec);
const router = express.Router();

// Configure multer for temporary file uploads
const upload = multer({
  dest: path.join(__dirname, '../../temp'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure multer for template uploads
const templateUpload = multer({
  dest: path.join(__dirname, '../../temp'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  }
});

// Default template tracking
let defaultTemplate = 'hebrew-export-template.docx';

// Serve the export template (default or specified)
router.get('/export-template', (req, res) => {
  // Check if a specific template is requested (for session templates)
  const requestedTemplate = req.query.template as string;
  let templateName = defaultTemplate;
  
  if (requestedTemplate) {
    // Validate that the requested template exists
    const requestedPath = path.join(__dirname, '../../templates/', requestedTemplate);
    if (fs.existsSync(requestedPath) && requestedTemplate.endsWith('.docx')) {
      templateName = requestedTemplate;
    }
    // If requested template doesn't exist, fall back to default
  }
  
  const templatePath = path.join(__dirname, '../../templates/', templateName);
  
  if (fs.existsSync(templatePath)) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="${templateName}"`);
    res.sendFile(templatePath);
  } else {
    res.status(404).json({ error: 'Template file not found' });
  }
});

// Convert and export Word document with Hebrew converter
router.post('/convert-and-export', upload.single('document'), async (req, res) => {
  let tempInputPath: string | undefined;
  let tempOutputPath: string | undefined;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }
    
    // Use uploaded file path
    tempInputPath = req.file.path;
    tempOutputPath = path.join(path.dirname(tempInputPath), `converted_${Date.now()}.docx`);
    
    // Path to the Hebrew converter
    const converterPath = path.join(__dirname, '../../templates/convertor/word-hebrew-converter.js');
    
    // Check if converter exists
    if (!fs.existsSync(converterPath)) {
      throw new Error('Hebrew converter not found');
    }
    
    // Run the Hebrew converter
    const command = `node "${converterPath}" "${tempInputPath}" "${tempOutputPath}"`;
    await execPromise(command);
    
    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion failed - output file not created');
    }
    
    // Read the converted file
    const convertedBuffer = await fsPromises.readFile(tempOutputPath);
    
    // Send the converted file
    const fileName = req.body.fileName || 'converted_document';
    const fullFileName = `${fileName}.docx`;
    
    // URL encode the filename for UTF-8 support (RFC 5987)
    const encodedFileName = encodeURIComponent(fullFileName);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // Use filename* for UTF-8 encoded filenames (supports Hebrew)
    res.setHeader('Content-Disposition', `attachment; filename="${fullFileName.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encodedFileName}`);
    res.send(convertedBuffer);
    
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Document conversion failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    // Clean up temp files
    const cleanupFile = async (filePath: string | undefined) => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          await fsPromises.unlink(filePath);
          // console.log removed for production
        } catch (err) {
          console.error(`Failed to clean up temp file ${filePath}:`, err);
        }
      }
    };
    
    await cleanupFile(tempInputPath);
    await cleanupFile(tempOutputPath);
  }
});

// List all templates
router.get('/list', async (req, res) => {
  try {
    const templatesDir = path.join(__dirname, '../../templates');
    const files = await fsPromises.readdir(templatesDir);
    
    const templates = await Promise.all(
      files
        .filter(file => file.endsWith('.docx'))
        .map(async (file) => {
          const filePath = path.join(templatesDir, file);
          const stats = await fsPromises.stat(filePath);
          return {
            name: file,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
            isDefault: file === defaultTemplate
          };
        })
    );
    
    res.json({ templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Upload new template
router.post('/upload', templateUpload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const originalName = req.file.originalname;
    const templatesDir = path.join(__dirname, '../../templates');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      await fsPromises.mkdir(templatesDir, { recursive: true });
    }
    
    // Generate unique filename if it already exists
    let fileName = originalName;
    let counter = 1;
    while (fs.existsSync(path.join(templatesDir, fileName))) {
      const nameParts = originalName.split('.');
      const ext = nameParts.pop();
      const baseName = nameParts.join('.');
      fileName = `${baseName}_${counter}.${ext}`;
      counter++;
    }
    
    // Move file from temp to templates directory
    const targetPath = path.join(templatesDir, fileName);
    await fsPromises.rename(req.file.path, targetPath);
    
    // If this is the first template, set it as default
    const existingTemplates = await fsPromises.readdir(templatesDir);
    const docxTemplates = existingTemplates.filter(f => f.endsWith('.docx'));
    if (docxTemplates.length === 1) {
      defaultTemplate = fileName;
    }
    
    res.json({ 
      success: true, 
      message: 'Template uploaded successfully',
      fileName: fileName,
      isDefault: fileName === defaultTemplate
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ error: 'Failed to upload template' });
  }
});

// Set default template
router.post('/set-default', async (req, res) => {
  try {
    const { templateName } = req.body;
    
    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    const templatePath = path.join(__dirname, '../../templates/', templateName);
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    defaultTemplate = templateName;
    
    res.json({ 
      success: true, 
      message: `${templateName} is now the default template` 
    });
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({ error: 'Failed to set default template' });
  }
});

// Delete template
router.delete('/delete', async (req, res) => {
  try {
    const { templateName } = req.body;
    
    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    // Prevent deleting the default template
    if (templateName === defaultTemplate) {
      return res.status(400).json({ error: 'Cannot delete the default template. Set another template as default first.' });
    }
    
    const templatePath = path.join(__dirname, '../../templates/', templateName);
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    await fsPromises.unlink(templatePath);
    
    res.json({ 
      success: true, 
      message: `Template ${templateName} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;