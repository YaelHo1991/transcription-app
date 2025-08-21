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

// Serve the Hebrew export template
router.get('/export-template', (req, res) => {
  const templatePath = path.join(__dirname, '../../templates/hebrew-export-template.docx');
  
  if (fs.existsSync(templatePath)) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'inline; filename="hebrew-export-template.docx"');
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
          console.log(`Cleaned up temp file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to clean up temp file ${filePath}:`, err);
        }
      }
    };
    
    await cleanupFile(tempInputPath);
    await cleanupFile(tempOutputPath);
  }
});

export default router;